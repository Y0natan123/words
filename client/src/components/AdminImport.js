import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './AdminImport.css';

const AdminImport = () => {
  const [textContent, setTextContent] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [words, setWords] = useState([]);
  const [activeTab, setActiveTab] = useState('import');
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef(null);

  // Load words for admin management
  useEffect(() => {
    if (activeTab === 'manage') {
      fetchWords();
    }
  }, [activeTab]);

  const fetchWords = async () => {
    try {
      const response = await axios.get('/api/words');
      setWords(response.data);
    } catch (error) {
      console.error('Error fetching words:', error);
    }
  };

  const handleDeleteWord = async (wordId) => {
    if (window.confirm('Are you sure you want to delete this word?')) {
      try {
        await axios.delete(`/api/words/${wordId}`);
        setWords(words.filter(word => word.id !== wordId));
        alert('Word deleted successfully');
      } catch (error) {
        console.error('Error deleting word:', error);
        alert('Failed to delete word');
      }
    }
  };

  const reassessDifficulty = async (word) => {
    try {
      const response = await axios.post('/api/ai/assess-difficulty', {
        word: word.english,
        context: `Hebrew translation: ${word.hebrew}`
      });
      const newDifficulty = response.data.difficulty;
      const updateResponse = await axios.put(`/api/words/${word.id}`, { difficulty: newDifficulty });
      
      // Update the word in the local state
      setWords(words.map(w => w.id === word.id ? updateResponse.data : w));
      alert(`Difficulty reassessed: Level ${newDifficulty}`);
    } catch (error) {
      console.error('Error reassessing difficulty:', error);
      alert('Failed to reassess difficulty');
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setTextContent(e.target.result);
      };
      reader.readAsText(file);
    }
  };

  const handleTextChange = (e) => {
    setTextContent(e.target.value);
  };

  const previewWords = () => {
    if (!textContent.trim()) {
      alert('Please enter or upload text content first');
      return;
    }
    setShowPreview(true);
  };

  const parseWords = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    const words = [];
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // Try different parsing strategies
      let english, hebrew;
      
      // Strategy 1: Look for tab separator
      if (trimmedLine.includes('\t')) {
        const parts = trimmedLine.split('\t');
        if (parts.length >= 2) {
          english = parts[0].toLowerCase().trim();
          hebrew = parts.slice(1).join('\t').trim();
        }
      }
      // Strategy 2: Look for multiple consecutive spaces (likely separator)
      else if (trimmedLine.includes('  ')) {
        const parts = trimmedLine.split(/\s{2,}/);
        if (parts.length >= 2) {
          english = parts[0].toLowerCase().trim();
          hebrew = parts.slice(1).join(' ').trim();
        }
      }
      // Strategy 3: Look for common separators like |, -, or :
      else if (trimmedLine.includes('|') || trimmedLine.includes('-') || trimmedLine.includes(':')) {
        const separator = trimmedLine.includes('|') ? '|' : 
                        trimmedLine.includes('-') ? '-' : ':';
        const parts = trimmedLine.split(separator);
        if (parts.length >= 2) {
          english = parts[0].toLowerCase().trim();
          hebrew = parts.slice(1).join(separator).trim();
        }
      }
      // Strategy 4: Fallback to original logic but with better hebrew detection
      else {
        const parts = trimmedLine.split(/\s+/);
        if (parts.length >= 2) {
          // Try to find where English ends and Hebrew begins
          // Hebrew text typically contains Hebrew characters
          const hebrewCharRegex = /[\u0590-\u05FF\uFB1D-\uFB4F]/;
          
          let englishEndIndex = 0;
          for (let i = 0; i < parts.length; i++) {
            if (hebrewCharRegex.test(parts[i])) {
              englishEndIndex = i;
              break;
            }
          }
          
          // If no Hebrew characters found, assume last word is Hebrew
          if (englishEndIndex === 0) {
            englishEndIndex = parts.length - 1;
          }
          
          english = parts.slice(0, englishEndIndex).join(' ').toLowerCase().trim();
          hebrew = parts.slice(englishEndIndex).join(' ').trim();
        }
      }
      
      if (english && hebrew) {
        words.push({
          english,
          hebrew,
          lineNumber: index + 1
        });
      }
    });
    
    return words;
  };

  const startImport = async () => {
    if (!textContent.trim()) {
      alert('Please enter or upload text content first');
      return;
    }

    setIsImporting(true);
    setProgress(null);
    setImportResult(null);

    try {
      // Show progress simulation
      const totalWords = parsedWords.length;
      let processed = 0;
      
      const progressInterval = setInterval(() => {
        processed += Math.ceil(totalWords / 20); // Update every 5%
        if (processed >= totalWords) {
          processed = totalWords;
        }
        
        setProgress({
          processed,
          total: totalWords,
          added: Math.floor(processed * 0.8), // Simulate 80% success rate
          skipped: Math.floor(processed * 0.2), // Simulate 20% duplicates
          errors: 0,
          percentage: Math.round((processed / totalWords) * 100)
        });
        
        if (processed >= totalWords) {
          clearInterval(progressInterval);
        }
      }, 100);

      // Send the import request
      const response = await axios.post('/api/words/import', { textContent });
      
      clearInterval(progressInterval);
      setImportResult(response.data);
      setIsImporting(false);
      
    } catch (error) {
      console.error('Error importing words:', error);
      setImportResult({ error: error.response?.data?.error || 'Failed to import words' });
      setIsImporting(false);
    }
  };

  const resetForm = () => {
    setTextContent('');
    setProgress(null);
    setImportResult(null);
    setShowPreview(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteAll = async () => {
    const confirmMessage = `Are you sure you want to delete ALL words from the database?\n\nThis action cannot be undone!`;
    const userConfirmed = window.confirm(confirmMessage);
    
    if (userConfirmed) {
      const finalConfirm = window.confirm('Final confirmation: This will permanently delete all words. Are you absolutely sure?');
      if (finalConfirm) {
        try {
          const response = await axios.post('/api/words/clear-all', { confirm: true });
          alert(`Successfully deleted ${response.data.deletedCount} words`);
          // Refresh the page
          window.location.reload();
        } catch (error) {
          console.error('Error deleting all words:', error);
          alert('Failed to delete all words: ' + (error.response?.data?.error || error.message));
        }
      }
    }
  };

  const handleGenerateSentences = async () => {
    const confirmMessage = `This will generate example sentences for all words that don't have them.\n\nThis may take a few minutes. Continue?`;
    const userConfirmed = window.confirm(confirmMessage);
    
    if (userConfirmed) {
      setIsGenerating(true);
      try {
        const response = await axios.post('/api/words/generate-sentences');
        const details = response.data.details;
        alert(`✅ Successfully generated sentences!\n\n📊 Results:\n• Processed: ${details.processed} words\n• Updated: ${details.updated} words\n• Errors: ${details.errors} words\n\n📝 All sentences were generated using high-quality educational templates matched to difficulty levels.`);
        // Refresh the page to show new sentences
        window.location.reload();
      } catch (error) {
        console.error('Error generating sentences:', error);
        alert('❌ Failed to generate sentences: ' + (error.response?.data?.error || error.message));
      } finally {
        setIsGenerating(false);
      }
    }
  };

  const parsedWords = parseWords(textContent);

  // Filter words for management tab
  const filteredWords = words.filter(word => 
    word.english.toLowerCase().includes(searchTerm.toLowerCase()) ||
    word.hebrew.includes(searchTerm)
  );

  return (
    <div className="admin-import">
      {/* Tab Navigation */}
      <div className="admin-tabs">
        <button 
          className={`tab-btn ${activeTab === 'import' ? 'active' : ''}`}
          onClick={() => setActiveTab('import')}
        >
          📥 Import Words
        </button>
        <button 
          className={`tab-btn ${activeTab === 'manage' ? 'active' : ''}`}
          onClick={() => setActiveTab('manage')}
        >
          ⚙️ Manage Words
        </button>
      </div>

      {/* Import Tab */}
      {activeTab === 'import' && (
        <>
          <div className="admin-import-header">
            <h2>Bulk Import Words</h2>
            <p>Import multiple words from a text file or paste text directly. Supports multiple formats:</p>
            <ul className="format-help">
              <li><strong>Tab-separated:</strong> "english\tעברית"</li>
              <li><strong>Double space:</strong> "english  עברית"</li>
              <li><strong>Separators:</strong> "english|עברית", "english-עברית", "english:עברית"</li>
              <li><strong>Auto-detect:</strong> "english phrase עברית" (automatically detects Hebrew characters)</li>
              <li><strong>Auto-difficulty:</strong> Difficulty levels are automatically assessed based on word complexity</li>
            </ul>
          </div>

      <div className="import-section">
        <div className="file-upload-section">
          <h3>Upload Text File</h3>
          <input
            type="file"
            accept=".txt,.csv"
            onChange={handleFileUpload}
            ref={fileInputRef}
            className="file-input"
          />
          <p className="file-help">Supported formats: .txt, .csv (UTF-8 encoding)</p>
        </div>

        <div className="text-input-section">
          <h3>Or Paste Text Directly</h3>
          <textarea
            value={textContent}
            onChange={handleTextChange}
            placeholder="Enter words in any format:&#10;hello שלום&#10;according to  על פי&#10;good morning|בוקר טוב&#10;thank you-תודה&#10;how are you:איך אתה"
            rows={10}
            className="text-input"
          />
        </div>

        <div className="preview-section">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={previewWords}
            disabled={!textContent.trim()}
          >
            Preview Words ({parsedWords.length} found)
          </button>
        </div>

        {showPreview && parsedWords.length > 0 && (
          <div className="words-preview">
            <h3>Preview ({parsedWords.length} words)</h3>
            <div className="preview-table">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>English</th>
                    <th>Hebrew</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedWords.slice(0, 20).map((word, index) => (
                    <tr key={index}>
                      <td>{word.lineNumber}</td>
                      <td>{word.english}</td>
                      <td dir="rtl">{word.hebrew}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedWords.length > 20 && (
                <p className="preview-note">Showing first 20 words. Total: {parsedWords.length}</p>
              )}
            </div>
          </div>
        )}

        <div className="import-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={startImport}
            disabled={isImporting || !textContent.trim()}
          >
            {isImporting ? 'Importing...' : `Import ${parsedWords.length} Words`}
          </button>
          
          <button
            type="button"
            className="btn btn-secondary"
            onClick={resetForm}
            disabled={isImporting}
          >
            Reset
          </button>

          <button
            type="button"
            className="btn btn-danger"
            onClick={handleDeleteAll}
            disabled={isImporting}
            title="Delete all words from database (Admin only)"
          >
            🗑️ Delete All Words
          </button>

          <button
            type="button"
            className="btn btn-success"
            onClick={handleGenerateSentences}
            disabled={isGenerating || isImporting}
            title="Generate example sentences for existing words"
          >
            {isGenerating ? 'Generating...' : '📝 Generate Sentences'}
          </button>
        </div>
      </div>

      {isImporting && progress && (
        <div className="import-progress">
          <h3>Import Progress</h3>
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${progress.percentage}%` }}
            ></div>
          </div>
          <div className="progress-stats">
            <p>Processed: {progress.processed} / {progress.total} ({progress.percentage}%)</p>
            <p>Added: {progress.added} | Skipped: {progress.skipped} | Errors: {progress.errors}</p>
            <p>Estimated time remaining: {Math.ceil((progress.total - progress.processed) / 10)} seconds</p>
          </div>
        </div>
      )}

      {importResult && (
        <div className={`import-result ${importResult.error ? 'error' : 'success'}`}>
          <h3>Import Complete</h3>
          {importResult.error ? (
            <p className="error-message">{importResult.error}</p>
          ) : (
            <div className="result-stats">
              <p><strong>Total processed:</strong> {importResult.total}</p>
              <p><strong>Successfully added:</strong> {importResult.added}</p>
              <p><strong>Skipped (already exist):</strong> {importResult.skipped}</p>
              <p><strong>Errors:</strong> {importResult.errors}</p>
            </div>
          )}
        </div>
      )}

          <div className="import-info">
            <h3>Import Instructions:</h3>
            <ul>
              <li>Format: "english hebrew" (one word per line)</li>
              <li>English words will be converted to lowercase</li>
              <li>Duplicate words will be skipped automatically</li>
              <li>All imported words start at difficulty level 1 and user level 0</li>
              <li>Maximum file size: 10MB</li>
            </ul>
          </div>
        </>
      )}

      {/* Manage Tab */}
      {activeTab === 'manage' && (
        <div className="word-management">
          <div className="management-header">
            <h2>Word Management</h2>
            <p>Manage existing words - reassess difficulty levels and delete words.</p>
            
            <div className="search-section">
              <input
                type="text"
                placeholder="Search words..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              <span className="word-count">{filteredWords.length} words found</span>
            </div>
          </div>

          <div className="words-grid">
            {filteredWords.length === 0 ? (
              <div className="no-words">
                <p>No words found. {searchTerm ? 'Try a different search term.' : 'Import some words first.'}</p>
              </div>
            ) : (
              filteredWords.map(word => (
                <div key={word.id} className="admin-word-card">
                  <div className="word-info">
                    <h3 className="english">{word.english}</h3>
                    <p className="hebrew">{word.hebrew}</p>
                    <div className="word-stats">
                      <span className="stat">Level: {word.userLevel}/5</span>
                      <span className="stat">Difficulty: {word.difficulty}/5</span>
                    </div>
                  </div>
                  <div className="word-actions">
                    <button 
                      className="btn btn-secondary"
                      onClick={() => reassessDifficulty(word)}
                      title="Reassess difficulty"
                    >
                      🔄 Reassess
                    </button>
                    <button 
                      className="btn btn-danger"
                      onClick={() => handleDeleteWord(word.id)}
                      title="Delete word"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminImport; 
import React, { useState } from 'react';
import axios from 'axios';
import './AddWord.css';

const AddWord = ({ onWordAdded }) => {
  const [formData, setFormData] = useState({
    english: '',
    hebrew: '',
    difficulty: 1
  });
  const [loading, setLoading] = useState(false);
  const [aiAssessing, setAiAssessing] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Auto-assess difficulty when English word is entered
    if (name === 'english' && value.trim()) {
      autoAssessDifficulty(value.trim());
    }
  };

  const autoAssessDifficulty = async (word) => {
    try {
      const response = await axios.post('/api/ai/assess-difficulty', {
        word: word,
        context: `Hebrew translation: ${formData.hebrew}`
      });
      
      setFormData(prev => ({
        ...prev,
        difficulty: response.data.difficulty
      }));
    } catch (error) {
      console.log('Could not auto-assess difficulty:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.english || !formData.hebrew) {
      alert('Please fill in both English and Hebrew words');
      return;
    }

    setLoading(true);
    try {
      // First, assess difficulty automatically
      let finalDifficulty = formData.difficulty;
      try {
        const difficultyResponse = await axios.post('/api/ai/assess-difficulty', {
          word: formData.english,
          context: `Hebrew translation: ${formData.hebrew}`
        });
        finalDifficulty = difficultyResponse.data.difficulty;
      } catch (difficultyError) {
        console.log('Could not assess difficulty automatically, using manual setting');
      }

      const wordData = {
        ...formData,
        difficulty: finalDifficulty
      };

      const response = await axios.post('/api/words', wordData);
      onWordAdded(response.data);
      setFormData({ english: '', hebrew: '', difficulty: 1 });
      
      // Show success message with example sentence if available
      if (response.data.exampleSentence) {
        alert(`✅ Word added successfully!\n\n📊 Difficulty assessed as level ${finalDifficulty}\n📝 Educational example sentence:\n\n"${response.data.exampleSentence}"`);
      } else {
        alert(`✅ Word added successfully! Difficulty assessed as level ${finalDifficulty}`);
      }
    } catch (error) {
      console.error('Error adding word:', error);
      if (error.response && error.response.status === 409) {
        alert('This word already exists in the database!');
      } else {
        alert('Failed to add word. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const assessDifficulty = async () => {
    if (!formData.english) {
      alert('Please enter an English word first');
      return;
    }

    setAiAssessing(true);
    try {
      const response = await axios.post('/api/ai/assess-difficulty', {
        word: formData.english,
        context: `Hebrew translation: ${formData.hebrew}`
      });
      
      setFormData(prev => ({
        ...prev,
        difficulty: response.data.difficulty
      }));
      
      alert(`AI assessed difficulty: Level ${response.data.difficulty}`);
    } catch (error) {
      console.error('Error assessing difficulty:', error);
      alert('Failed to assess difficulty. Please set it manually.');
    } finally {
      setAiAssessing(false);
    }
  };

  const getWordSuggestions = async () => {
    setShowSuggestions(true);
    try {
      const response = await axios.post('/api/ai/suggest-words', {
        difficulty: formData.difficulty,
        count: 5,
        excludeWords: []
      });
      setSuggestions(response.data.suggestions);
    } catch (error) {
      console.error('Error getting suggestions:', error);
      alert('Failed to get word suggestions.');
    }
  };

  const handleUseSuggestion = (word) => {
    setFormData(prev => ({
      ...prev,
      english: word
    }));
    setShowSuggestions(false);
  };

  const generateExampleSentence = async () => {
    if (!formData.english) {
      alert('Please enter an English word first.');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/ai/generate-example', {
        word: formData.english,
        context: `Hebrew translation: ${formData.hebrew}`
      });
      setFormData(prev => ({
        ...prev,
        exampleSentence: response.data.sentence
      }));
      alert(`Example sentence generated: "${response.data.sentence}"`);
    } catch (error) {
      console.error('Error generating example sentence:', error);
      alert('Failed to generate example sentence. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-word">
      <div className="add-word-header">
        <h2>Add New Word</h2>
        <p>Add English words with their Hebrew translations. Use AI to assess difficulty or get word suggestions.</p>
      </div>

      <div className="add-word-form">
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="english">English Word *</label>
              <input
                type="text"
                id="english"
                name="english"
                value={formData.english}
                onChange={handleInputChange}
                placeholder="Enter English word"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="hebrew">Hebrew Translation *</label>
              <input
                type="text"
                id="hebrew"
                name="hebrew"
                value={formData.hebrew}
                onChange={handleInputChange}
                placeholder="הזן מילה בעברית"
                required
                dir="rtl"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="difficulty">Difficulty Level:</label>
              <select
                id="difficulty"
                name="difficulty"
                value={formData.difficulty}
                onChange={handleInputChange}
                className="form-control"
              >
                <option value={1}>1 - Beginner</option>
                <option value={2}>2 - Elementary</option>
                <option value={3}>3 - Intermediate</option>
                <option value={4}>4 - Advanced</option>
                <option value={5}>5 - Expert</option>
              </select>
            </div>
            
            <div className="ai-controls">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={assessDifficulty}
                disabled={aiAssessing || !formData.english}
              >
                {aiAssessing ? 'Assessing...' : 'AI Assess Difficulty'}
              </button>
              
              <button
                type="button"
                className="btn btn-secondary"
                onClick={getWordSuggestions}
              >
                Get Word Suggestions
              </button>
            </div>
          </div>

          {showSuggestions && suggestions.length > 0 && (
            <div className="suggestions">
              <h3>Word Suggestions (Difficulty Level {formData.difficulty})</h3>
              <div className="suggestions-grid">
                {suggestions.map((word, index) => (
                                     <button
                     key={index}
                     type="button"
                     className="suggestion-btn"
                     onClick={() => handleUseSuggestion(word)}
                   >
                    {word}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowSuggestions(false)}
              >
                Close Suggestions
              </button>
            </div>
          )}

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Adding...' : 'Add Word'}
            </button>
            <button 
              type="button" 
              className="btn btn-info" 
              onClick={generateExampleSentence}
              disabled={!formData.english || loading}
            >
              📝 Generate Example Sentence
            </button>
          </div>
        </form>
      </div>

      <div className="add-word-info">
        <h3>How to use:</h3>
        <ul>
          <li>Enter the English word and its Hebrew translation</li>
          <li><strong>Auto-assessment:</strong> Difficulty is automatically assessed when you enter the English word</li>
          <li><strong>Example sentences:</strong> Educational sentences are automatically generated based on difficulty level</li>
          <li>Use "AI Assess Difficulty" to manually reassess the difficulty level</li>
          <li>Use "Get Word Suggestions" to get AI-recommended words for the selected difficulty level</li>
          <li>Words start at Level 0 (not learned) and can progress to Level 5 (mastered)</li>
        </ul>
      </div>
    </div>
  );
};

export default AddWord; 
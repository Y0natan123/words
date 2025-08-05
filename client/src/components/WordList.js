import React, { useState } from 'react';
import axios from 'axios';
import './WordList.css';

const WordList = ({ words, onWordUpdated, onWordDeleted }) => {
  const [filterText, setFilterText] = useState('');
  const [filterLevel, setFilterLevel] = useState('');

  const updateProgress = async (wordId, newLevel) => {
    try {
      const response = await axios.post(`/api/words/${wordId}/progress`, {
        userLevel: newLevel
      });
      onWordUpdated(response.data);
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const getLevelColor = (level) => {
    const colors = ['#dc3545', '#fd7e14', '#ffc107', '#20c997', '#198754', '#0d6efd'];
    return colors[Math.min(level, 5)];
  };

  const getDifficultyColor = (difficulty) => {
    const colors = ['', '#28a745', '#ffc107', '#fd7e14', '#dc3545', '#6f42c1'];
    return colors[difficulty];
  };



  const speakWord = (word) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      utterance.rate = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Filter words based on search text and level
  const filteredWords = words.filter(word => {
    const matchesText = word.english.toLowerCase().includes(filterText.toLowerCase()) ||
                       word.hebrew.includes(filterText);
    const matchesLevel = filterLevel === '' || word.userLevel.toString() === filterLevel;
    return matchesText && matchesLevel;
  });

  return (
    <div className="word-list">
      {/* Header Section */}
      <div className="word-list-header">
        <div className="header-title">
          <h1>📚 My Words</h1>
          <p className="word-count">{filteredWords.length} of {words.length} words</p>
        </div>
        
        {/* Search and Filter */}
        <div className="search-section">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search words..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="level-filter">
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="level-select"
            >
              <option value="">All Levels</option>
              <option value="0">🔴 New (0)</option>
              <option value="1">🟠 Beginner (1)</option>
              <option value="2">🟡 Basic (2)</option>
              <option value="3">🟢 Good (3)</option>
              <option value="4">🔵 Advanced (4)</option>
              <option value="5">🟣 Mastered (5)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content Section */}
      {filteredWords.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <h3>No words found</h3>
          <p>Try adjusting your search or filter criteria</p>
        </div>
      ) : (
        <div className="words-container">
          {filteredWords.map(word => (
            <div key={word.id} className="word-card">
              {/* Progress Indicator */}
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{
                    width: `${(word.userLevel / 5) * 100}%`,
                    backgroundColor: getLevelColor(word.userLevel)
                  }}
                ></div>
              </div>
              
              {/* Word Content */}
              <div className="word-main">
                <div className="word-pair">
                  <div className="word-header">
                    <div className="word-text">
                      <h3 className="english-word">{word.english}</h3>
                      <p className="hebrew-word">{word.hebrew}</p>
                    </div>
                    <button 
                      className="listen-btn"
                      onClick={() => speakWord(word.english)}
                      title="Listen to pronunciation"
                    >
                      🔊
                    </button>
                  </div>
                </div>
                

                

              </div>
              
              {/* Word Stats */}
              <div className="word-stats">
                <div className="stat-item">
                  <span className="stat-label">Level</span>
                  <span className="stat-value level-badge" style={{color: getLevelColor(word.userLevel)}}>
                    {word.userLevel}/5
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Difficulty</span>
                  <span className="stat-value difficulty-badge" style={{color: getDifficultyColor(word.difficulty)}}>
                    {word.difficulty}/5
                  </span>
                </div>
              </div>
              

            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WordList; 
import React from 'react';
import './Statistics.css';

const Statistics = ({ stats, words, languagePair }) => {
  if (!stats) {
    return (
      <div className="statistics">
        <div className="loading">Loading statistics...</div>
      </div>
    );
  }

  const calculateProgress = () => {
    const total = stats.totalWords;
    if (total === 0) return 0;
    
    // Handle both old and new data formats
    const mastered = stats.masteredWords || stats.byUserLevel?.[5] || 0;
    return Math.round((mastered / total) * 100);
  };

  const getLevelDescription = (level) => {
    const descriptions = {
      0: 'Not Started',
      1: 'Beginner',
      2: 'Elementary',
      3: 'Intermediate',
      4: 'Advanced',
      5: 'Mastered'
    };
    return descriptions[level] || 'Unknown';
  };

  const getDifficultyDescription = (difficulty) => {
    const descriptions = {
      1: 'Very Basic',
      2: 'Basic',
      3: 'Intermediate',
      4: 'Advanced',
      5: 'Very Advanced'
    };
    return descriptions[difficulty] || 'Unknown';
  };

  const renderProgressBar = (current, total, label) => {
    const percentage = total === 0 ? 0 : Math.round((current / total) * 100);
    return (
      <div className="progress-item">
        <div className="progress-label">
          <span>{label}</span>
          <span>{current} / {total}</span>
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
        <span className="progress-percentage">{percentage}%</span>
      </div>
    );
  };

  const renderLevelDistribution = () => {
    // Handle new data format
    if (stats.byUserLevel) {
      return Object.entries(stats.byUserLevel).map(([level, count]) => (
        <div key={level} className="distribution-item">
          <div className="distribution-header">
            <span className="level-name">Level {level}</span>
            <span className="level-count">{count}</span>
          </div>
          <div className="distribution-bar">
            <div 
              className="distribution-fill"
              style={{ 
                width: `${stats.totalWords === 0 ? 0 : (count / stats.totalWords) * 100}%`,
                backgroundColor: getLevelColor(parseInt(level))
              }}
            ></div>
          </div>
          <span className="level-description">{getLevelDescription(parseInt(level))}</span>
        </div>
      ));
    }

    // New data format - create distribution from available stats
    const distribution = [
      { level: 0, count: stats.newWords || 0, description: 'Not Started' },
      { level: 1, count: Math.round((stats.learningWords || 0) * 0.25), description: 'Beginner' },
      { level: 2, count: Math.round((stats.learningWords || 0) * 0.25), description: 'Elementary' },
      { level: 3, count: Math.round((stats.learningWords || 0) * 0.25), description: 'Intermediate' },
      { level: 4, count: Math.round((stats.learningWords || 0) * 0.25), description: 'Advanced' },
      { level: 5, count: stats.masteredWords || 0, description: 'Mastered' }
    ];

    return distribution.filter(item => item.count > 0).map(({ level, count, description }) => (
      <div key={level} className="distribution-item">
        <div className="distribution-header">
          <span className="level-name">Level {level}</span>
          <span className="level-count">{count}</span>
        </div>
        <div className="distribution-bar">
          <div 
            className="distribution-fill"
            style={{ 
              width: `${stats.totalWords === 0 ? 0 : (count / stats.totalWords) * 100}%`,
              backgroundColor: getLevelColor(level)
            }}
          ></div>
        </div>
        <span className="level-description">{description}</span>
      </div>
    ));
  };

  const renderDifficultyDistribution = () => {
    // Handle old data format
    if (stats.byDifficulty) {
      return Object.entries(stats.byDifficulty).map(([difficulty, count]) => (
        <div key={difficulty} className="distribution-item">
          <div className="distribution-header">
            <span className="level-name">Difficulty {difficulty}</span>
            <span className="level-count">{count}</span>
          </div>
          <div className="distribution-bar">
            <div 
              className="distribution-fill"
              style={{ 
                width: `${stats.totalWords === 0 ? 0 : (count / stats.totalWords) * 100}%`,
                backgroundColor: getDifficultyColor(parseInt(difficulty))
              }}
            ></div>
          </div>
          <span className="level-description">{getDifficultyDescription(parseInt(difficulty))}</span>
        </div>
      ));
    }

    // New data format - calculate from words array
    if (!words || words.length === 0) {
      return (
        <div className="no-data">
          <p>No difficulty data available</p>
        </div>
      );
    }

    const difficultyCount = words.reduce((acc, word) => {
      const diff = word.difficulty || 1;
      acc[diff] = (acc[diff] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(difficultyCount).map(([difficulty, count]) => (
      <div key={difficulty} className="distribution-item">
        <div className="distribution-header">
          <span className="level-name">Difficulty {difficulty}</span>
          <span className="level-count">{count}</span>
        </div>
        <div className="distribution-bar">
          <div 
            className="distribution-fill"
            style={{ 
              width: `${stats.totalWords === 0 ? 0 : (count / stats.totalWords) * 100}%`,
              backgroundColor: getDifficultyColor(parseInt(difficulty))
            }}
          ></div>
        </div>
        <span className="level-description">{getDifficultyDescription(parseInt(difficulty))}</span>
      </div>
    ));
  };

  const getLevelColor = (level) => {
    const colors = ['#dc3545', '#fd7e14', '#ffc107', '#20c997', '#198754', '#0d6efd'];
    return colors[Math.min(level, 5)];
  };

  const getDifficultyColor = (difficulty) => {
    const colors = ['', '#28a745', '#ffc107', '#fd7e14', '#dc3545', '#6f42c1'];
    return colors[difficulty];
  };

  const getRecentWords = () => {
    if (!words || words.length === 0) return [];
    return words
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);
  };

  const getTopWords = () => {
    if (!words || words.length === 0) return [];
    return words
      .filter(word => (word.userLevel || 0) > 0)
      .sort((a, b) => (b.userLevel || 0) - (a.userLevel || 0))
      .slice(0, 5);
  };

  return (
    <div className="statistics">
      <div className="statistics-header">
        <h2>Learning Statistics</h2>
        <p>Track your progress and see your learning patterns</p>
      </div>

      {languagePair && (
        <div className="language-pair-info">
          <h3>Current Language Pair</h3>
          <div className="pair-display">
            <span className="source-language">{languagePair.sourceLanguage}</span>
            <span className="arrow">→</span>
            <span className="target-language">{languagePair.targetLanguage}</span>
          </div>
        </div>
      )}

      <div className="stats-overview">
        <div className="overview-card">
          <h3>Total Words</h3>
          <div className="overview-number">{stats.totalWords || 0}</div>
        </div>
        <div className="overview-card">
          <h3>Mastered</h3>
          <div className="overview-number">{stats.masteredWords || stats.byUserLevel?.[5] || 0}</div>
        </div>
        <div className="overview-card">
          <h3>Learning</h3>
          <div className="overview-number">
            {stats.learningWords || 
             (stats.byUserLevel ? 
               Object.entries(stats.byUserLevel)
                 .filter(([level]) => level > 0 && level < 5)
                 .reduce((sum, [, count]) => sum + count, 0) 
               : 0)}
          </div>
        </div>
        <div className="overview-card">
          <h3>Progress</h3>
          <div className="overview-number">{calculateProgress()}%</div>
        </div>
      </div>

      <div className="stats-sections">
        <div className="stats-section">
          <h3>Learning Progress</h3>
          <div className="progress-container">
            {renderProgressBar(
              stats.masteredWords || stats.byUserLevel?.[5] || 0, 
              stats.totalWords, 
              'Mastered (Level 5)'
            )}
            {renderProgressBar(
              stats.learningWords || 
              (stats.byUserLevel ? 
                Object.entries(stats.byUserLevel)
                  .filter(([level]) => level > 0 && level < 5)
                  .reduce((sum, [, count]) => sum + count, 0) 
                : 0),
              stats.totalWords,
              'Learning (Level 1-4)'
            )}
            {renderProgressBar(
              stats.newWords || stats.byUserLevel?.[0] || 0, 
              stats.totalWords, 
              'Not Started (Level 0)'
            )}
          </div>
        </div>

        <div className="stats-section">
          <h3>Level Distribution</h3>
          <div className="distribution-container">
            {renderLevelDistribution()}
          </div>
        </div>

        <div className="stats-section">
          <h3>Difficulty Distribution</h3>
          <div className="distribution-container">
            {renderDifficultyDistribution()}
          </div>
        </div>

        <div className="stats-section">
          <h3>Recent Words Added</h3>
          <div className="words-list">
            {getRecentWords().length > 0 ? (
              getRecentWords().map(word => (
                <div key={word.id} className="word-item">
                  <div className="word-text">
                    <span className="source">{word.sourceWord || word.english}</span>
                    <span className="target">{word.targetWord || word.hebrew}</span>
                  </div>
                  <div className="word-meta">
                    <span className="level">Level {word.userLevel || 0}</span>
                    <span className="difficulty">Diff {word.difficulty || 1}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-data">
                <p>No words added yet</p>
              </div>
            )}
          </div>
        </div>

        <div className="stats-section">
          <h3>Top Performing Words</h3>
          <div className="words-list">
            {getTopWords().length > 0 ? (
              getTopWords().map(word => (
                <div key={word.id} className="word-item">
                  <div className="word-text">
                    <span className="source">{word.sourceWord || word.english}</span>
                    <span className="target">{word.targetWord || word.hebrew}</span>
                  </div>
                  <div className="word-meta">
                    <span className="level">Level {word.userLevel || 0}</span>
                    <span className="difficulty">Diff {word.difficulty || 1}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-data">
                <p>No words learned yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Statistics; 
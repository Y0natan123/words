import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Settings.css';

const Settings = () => {
  const [settings, setSettings] = useState({
    maxFocusWords: 5,
    focusPeriodDays: 5,
    reviewIntervalDays: 7,
    masteredReviewDays: 14,
    sessionSize: 15
  });
  
  const [stats, setStats] = useState({
    totalWords: 0,
    newWords: 0,
    learningWords: 0,
    masteredWords: 0,
    currentFocusWords: 0,
    reviewDue: 0
  });
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadStats();
    loadSettings();
  }, []);

  const loadStats = async () => {
    try {
      const response = await axios.get('/api/words/algorithm-stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadSettings = () => {
    const savedSettings = localStorage.getItem('spacedRepetitionSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  };

  const saveSettings = () => {
    setLoading(true);
    try {
      localStorage.setItem('spacedRepetitionSettings', JSON.stringify(settings));
      setMessage('Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Error saving settings');
      console.error('Error saving settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetToDefaults = () => {
    const defaultSettings = {
      maxFocusWords: 5,
      focusPeriodDays: 5,
      reviewIntervalDays: 7,
      masteredReviewDays: 14,
      sessionSize: 15
    };
    setSettings(defaultSettings);
    setMessage('Settings reset to defaults');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleInputChange = (key, value) => {
    const numValue = parseInt(value);
    if (numValue > 0) {
      setSettings(prev => ({ ...prev, [key]: numValue }));
    }
  };

  return (
    <div className="settings-page">
      {/* Hero Section */}
      <div className="settings-hero">
        <div className="hero-content">
          <h1>⚙️ Learning Settings</h1>
          <p>Customize your vocabulary learning experience</p>
        </div>
        <div className="hero-stats">
          <div className="quick-stat">
            <span className="stat-value">{stats.currentFocusWords}/{settings.maxFocusWords}</span>
            <span className="stat-label">Focus Words</span>
          </div>
          <div className="quick-stat">
            <span className="stat-value">{stats.reviewDue}</span>
            <span className="stat-label">Review Due</span>
          </div>
        </div>
      </div>

      <div className="settings-content">
        {/* Quick Stats Overview */}
        <div className="stats-overview">
          <div className="stats-row">
            <div className="mini-stat total">
              <div className="mini-stat-icon">📚</div>
              <div className="mini-stat-info">
                <span className="mini-stat-number">{stats.totalWords}</span>
                <span className="mini-stat-label">Total</span>
              </div>
            </div>
            <div className="mini-stat new">
              <div className="mini-stat-icon">🆕</div>
              <div className="mini-stat-info">
                <span className="mini-stat-number">{stats.newWords}</span>
                <span className="mini-stat-label">New</span>
              </div>
            </div>
            <div className="mini-stat learning">
              <div className="mini-stat-icon">📖</div>
              <div className="mini-stat-info">
                <span className="mini-stat-number">{stats.learningWords}</span>
                <span className="mini-stat-label">Learning</span>
              </div>
            </div>
            <div className="mini-stat mastered">
              <div className="mini-stat-icon">✅</div>
              <div className="mini-stat-info">
                <span className="mini-stat-number">{stats.masteredWords}</span>
                <span className="mini-stat-label">Mastered</span>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Cards */}
        <div className="settings-grid">
          {/* Focus Settings */}
          <div className="setting-card primary">
            <div className="setting-header">
              <h3>🎯 Focus Learning</h3>
              <p>Control how many words you focus on</p>
            </div>
            <div className="setting-controls">
              <div className="slider-control">
                <label>Max Focus Words</label>
                <div className="slider-wrapper">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={settings.maxFocusWords}
                    onChange={(e) => handleInputChange('maxFocusWords', e.target.value)}
                    className="slider"
                  />
                  <span className="slider-value">{settings.maxFocusWords}</span>
                </div>
                <small>Recommended: 3-7 words</small>
              </div>
            </div>
          </div>

          {/* Timing Settings */}
          <div className="setting-card">
            <div className="setting-header">
              <h3>⏰ Learning Pace</h3>
              <p>Set your learning rhythm</p>
            </div>
            <div className="setting-controls">
              <div className="input-group">
                <label>Focus Period</label>
                <div className="input-with-unit">
                  <input
                    type="number"
                    min="1"
                    max="14"
                    value={settings.focusPeriodDays}
                    onChange={(e) => handleInputChange('focusPeriodDays', e.target.value)}
                  />
                  <span className="unit">days</span>
                </div>
                <small>How long to focus on each word</small>
              </div>
              <div className="input-group">
                <label>Review Interval</label>
                <div className="input-with-unit">
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={settings.reviewIntervalDays}
                    onChange={(e) => handleInputChange('reviewIntervalDays', e.target.value)}
                  />
                  <span className="unit">days</span>
                </div>
                <small>How often to review learning words</small>
              </div>
              <div className="input-group">
                <label>Session Size</label>
                <div className="input-with-unit">
                  <input
                    type="number"
                    min="5"
                    max="50"
                    value={settings.sessionSize}
                    onChange={(e) => handleInputChange('sessionSize', e.target.value)}
                  />
                  <span className="unit">words</span>
                </div>
                <small>Number of words per practice session</small>
              </div>
            </div>
          </div>

          {/* Retention Settings */}
          <div className="setting-card">
                      <div className="setting-header">
            <h3>🧠 Memory Retention</h3>
            <p>Keep confident words fresh</p>
          </div>
          <div className="setting-controls">
            <div className="input-group">
              <label>Confident Review</label>
              <div className="input-with-unit">
                <input
                  type="number"
                  min="7"
                  max="60"
                  value={settings.masteredReviewDays}
                  onChange={(e) => handleInputChange('masteredReviewDays', e.target.value)}
                />
                <span className="unit">days</span>
              </div>
              <small>Base interval for confident words (grows with success)</small>
            </div>
          </div>
          </div>
        </div>

        {/* Algorithm Preview */}
        <div className="algorithm-preview">
          <h3>📈 Your Current Setup</h3>
          <div className="preview-flow">
            <div className="flow-step">
              <div className="step-icon">🎯</div>
              <div className="step-content">
                <strong>Focus on {settings.maxFocusWords} words</strong>
                <span>for {settings.focusPeriodDays} days each</span>
              </div>
            </div>
            <div className="flow-arrow">→</div>
            <div className="flow-step">
              <div className="step-icon">📚</div>
              <div className="step-content">
                <strong>Practice {settings.sessionSize} words</strong>
                <span>per session</span>
              </div>
            </div>
            <div className="flow-arrow">→</div>
            <div className="flow-step">
              <div className="step-icon">🔄</div>
              <div className="step-content">
                <strong>Review learning words</strong>
                <span>every {settings.reviewIntervalDays} days</span>
              </div>
            </div>
            <div className="flow-arrow">→</div>
            <div className="flow-step">
              <div className="step-icon">✅</div>
              <div className="step-content">
                <strong>Review confident words</strong>
                <span>starting at {settings.masteredReviewDays} days (grows with success)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="action-bar">
          <button 
            onClick={saveSettings}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? '💾 Saving...' : '💾 Save Settings'}
          </button>
          
          <button 
            onClick={resetToDefaults}
            className="btn-secondary"
          >
            🔄 Reset Defaults
          </button>
          
          <button 
            onClick={loadStats}
            className="btn-ghost"
          >
            📊 Refresh Stats
          </button>
        </div>

        {message && (
          <div className={`notification ${message.includes('Error') ? 'error' : 'success'}`}>
            <span className="notification-icon">
              {message.includes('Error') ? '❌' : '✅'}
            </span>
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './UserPreferences.css';

const UserPreferences = ({ user, onPreferencesUpdate }) => {
  const [languagePairs, setLanguagePairs] = useState([]);
  const [preferences, setPreferences] = useState({
    selectedLanguagePairs: [],
    defaultLanguagePair: '',
    practiceSettings: {
      sessionSize: 15,
      showDifficulty: true,
      autoPlayAudio: false,
      reviewFrequency: 'daily'
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchLanguagePairs();
    loadUserPreferences();
  }, []);

  const fetchLanguagePairs = async () => {
    try {
      const response = await axios.get('/api/language-pairs');
      setLanguagePairs(response.data);
    } catch (error) {
      console.error('Error fetching language pairs:', error);
    }
  };

  const loadUserPreferences = () => {
    try {
      const userPrefs = user.preferences || {};
      setPreferences({
        selectedLanguagePairs: userPrefs.selectedLanguagePairs || [],
        defaultLanguagePair: userPrefs.defaultLanguagePair || '',
        practiceSettings: {
          sessionSize: userPrefs.practiceSettings?.sessionSize || 15,
          showDifficulty: userPrefs.practiceSettings?.showDifficulty !== false,
          autoPlayAudio: userPrefs.practiceSettings?.autoPlayAudio || false,
          reviewFrequency: userPrefs.practiceSettings?.reviewFrequency || 'daily'
        }
      });
      setLoading(false);
    } catch (error) {
      console.error('Error loading preferences:', error);
      setLoading(false);
    }
  };

  const handleLanguagePairToggle = (pairId) => {
    const updatedPairs = preferences.selectedLanguagePairs.includes(pairId)
      ? preferences.selectedLanguagePairs.filter(id => id !== pairId)
      : [...preferences.selectedLanguagePairs, pairId];

    setPreferences(prev => ({
      ...prev,
      selectedLanguagePairs: updatedPairs,
      // Reset default if it's no longer selected
      defaultLanguagePair: updatedPairs.includes(prev.defaultLanguagePair) 
        ? prev.defaultLanguagePair 
        : (updatedPairs.length > 0 ? updatedPairs[0] : '')
    }));
  };

  const handleDefaultLanguagePairChange = (pairId) => {
    setPreferences(prev => ({
      ...prev,
      defaultLanguagePair: pairId
    }));
  };

  const handlePracticeSettingChange = (setting, value) => {
    setPreferences(prev => ({
      ...prev,
      practiceSettings: {
        ...prev.practiceSettings,
        [setting]: value
      }
    }));
  };

  const savePreferences = async () => {
    setSaving(true);
    setMessage('');

    try {
      await axios.put('/api/auth/preferences', { preferences });
      setMessage('Preferences saved successfully!');
      setTimeout(() => setMessage(''), 3000);
      
      if (onPreferencesUpdate) {
        onPreferencesUpdate(preferences);
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      setMessage('Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="preferences-container">
        <div className="loading">Loading preferences...</div>
      </div>
    );
  }

  return (
    <div className="preferences-container">
      <div className="preferences-header">
        <h1>User Preferences</h1>
        <p>Customize your learning experience</p>
      </div>

      {message && (
        <div className={`message ${message.includes('success') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      <div className="preferences-content">
        {/* Language Pairs Section */}
        <div className="preference-section">
          <h3>Language Pairs</h3>
          <p>Select which language pairs you want to study:</p>
          
          <div className="language-pairs-grid">
            {languagePairs.map(pair => (
              <div key={pair.id} className="language-pair-item">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={preferences.selectedLanguagePairs.includes(pair.id)}
                    onChange={() => handleLanguagePairToggle(pair.id)}
                  />
                  <div className="checkbox-custom"></div>
                  <div className="pair-info">
                    <span className="pair-name">{pair.name}</span>
                    <span className="pair-languages">
                      {pair.sourceLanguage} → {pair.targetLanguage}
                    </span>
                    {pair.description && (
                      <span className="pair-description">{pair.description}</span>
                    )}
                  </div>
                </label>
              </div>
            ))}
          </div>

          {preferences.selectedLanguagePairs.length === 0 && (
            <div className="warning-message">
              Please select at least one language pair to begin studying.
            </div>
          )}
        </div>

        {/* Default Language Pair */}
        {preferences.selectedLanguagePairs.length > 1 && (
          <div className="preference-section">
            <h3>Default Language Pair</h3>
            <p>Choose your primary language pair for practice:</p>
            
            <select
              value={preferences.defaultLanguagePair}
              onChange={(e) => handleDefaultLanguagePairChange(e.target.value)}
              className="default-pair-select"
            >
              <option value="">Choose default...</option>
              {languagePairs
                .filter(pair => preferences.selectedLanguagePairs.includes(pair.id))
                .map(pair => (
                  <option key={pair.id} value={pair.id}>
                    {pair.name}
                  </option>
                ))}
            </select>
          </div>
        )}

        {/* Practice Settings */}
        <div className="preference-section">
          <h3>Practice Settings</h3>
          
          <div className="setting-item">
            <label htmlFor="sessionSize">Session Size (words per practice):</label>
            <input
              type="number"
              id="sessionSize"
              min="5"
              max="50"
              value={preferences.practiceSettings.sessionSize}
              onChange={(e) => handlePracticeSettingChange('sessionSize', parseInt(e.target.value))}
            />
          </div>

          <div className="setting-item">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={preferences.practiceSettings.showDifficulty}
                onChange={(e) => handlePracticeSettingChange('showDifficulty', e.target.checked)}
              />
              <div className="checkbox-custom"></div>
              <span>Show word difficulty levels</span>
            </label>
          </div>

          <div className="setting-item">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={preferences.practiceSettings.autoPlayAudio}
                onChange={(e) => handlePracticeSettingChange('autoPlayAudio', e.target.checked)}
              />
              <div className="checkbox-custom"></div>
              <span>Auto-play word pronunciation</span>
            </label>
          </div>

          <div className="setting-item">
            <label htmlFor="reviewFrequency">Review Frequency:</label>
            <select
              id="reviewFrequency"
              value={preferences.practiceSettings.reviewFrequency}
              onChange={(e) => handlePracticeSettingChange('reviewFrequency', e.target.value)}
            >
              <option value="daily">Daily</option>
              <option value="every2days">Every 2 days</option>
              <option value="weekly">Weekly</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>

        {/* Save Button */}
        <div className="preferences-actions">
          <button
            onClick={savePreferences}
            disabled={saving || preferences.selectedLanguagePairs.length === 0}
            className="save-preferences-btn"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserPreferences;
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminLanguagePairs.css';

const AdminLanguagePairs = ({ user }) => {
  const [languagePairs, setLanguagePairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    sourceLanguage: '',
    targetLanguage: '',
    description: ''
  });

  useEffect(() => {
    if (user?.isAdmin) {
      fetchLanguagePairs();
    }
  }, [user]);

  const fetchLanguagePairs = async () => {
    try {
      const response = await axios.get('/api/language-pairs');
      setLanguagePairs(response.data);
    } catch (error) {
      console.error('Error fetching language pairs:', error);
      setMessage('Failed to fetch language pairs');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      await axios.post('/api/language-pairs', formData);
      setMessage('Language pair created successfully!');
      setFormData({
        name: '',
        sourceLanguage: '',
        targetLanguage: '',
        description: ''
      });
      setShowAddForm(false);
      fetchLanguagePairs();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error creating language pair:', error);
      setMessage(error.response?.data?.error || 'Failed to create language pair');
    }
  };

  const generateName = () => {
    if (formData.sourceLanguage && formData.targetLanguage) {
      const name = `${formData.sourceLanguage}-${formData.targetLanguage}`;
      setFormData({ ...formData, name });
    }
  };

  if (!user?.isAdmin) {
    return (
      <div className="admin-container">
        <div className="access-denied">
          <h2>Access Denied</h2>
          <p>Admin privileges required to access this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="admin-container">
        <div className="loading">Loading language pairs...</div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>Language Pairs Management</h1>
        <p>Manage available language pairs for users to study</p>
      </div>

      {message && (
        <div className={`message ${message.includes('success') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      <div className="admin-actions">
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn btn-primary"
        >
          {showAddForm ? 'Cancel' : 'Add New Language Pair'}
        </button>
      </div>

      {showAddForm && (
        <div className="add-form-container">
          <h3>Add New Language Pair</h3>
          <form onSubmit={handleSubmit} className="add-pair-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="sourceLanguage">Source Language</label>
                <input
                  type="text"
                  id="sourceLanguage"
                  name="sourceLanguage"
                  value={formData.sourceLanguage}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., English, Hebrew, Spanish"
                />
              </div>
              <div className="form-group">
                <label htmlFor="targetLanguage">Target Language</label>
                <input
                  type="text"
                  id="targetLanguage"
                  name="targetLanguage"
                  value={formData.targetLanguage}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., Hebrew, English, French"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="name">Pair Name</label>
              <div className="name-input-container">
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., English-Hebrew"
                />
                <button
                  type="button"
                  onClick={generateName}
                  className="generate-name-btn"
                  disabled={!formData.sourceLanguage || !formData.targetLanguage}
                >
                  Generate
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="description">Description (Optional)</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe this language pair or learning focus"
                rows="3"
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                Create Language Pair
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="language-pairs-list">
        <h3>Existing Language Pairs ({languagePairs.length})</h3>
        
        {languagePairs.length === 0 ? (
          <div className="empty-state">
            <p>No language pairs found. Create your first language pair to get started.</p>
          </div>
        ) : (
          <div className="pairs-grid">
            {languagePairs.map(pair => (
              <div key={pair.id} className="pair-card">
                <div className="pair-header">
                  <h4>{pair.name}</h4>
                  <span className={`status-badge ${pair.isActive ? 'active' : 'inactive'}`}>
                    {pair.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                <div className="pair-languages">
                  <div className="language-flow">
                    <span className="source-lang">{pair.sourceLanguage}</span>
                    <span className="arrow">→</span>
                    <span className="target-lang">{pair.targetLanguage}</span>
                  </div>
                </div>
                
                {pair.description && (
                  <div className="pair-description">
                    <p>{pair.description}</p>
                  </div>
                )}
                
                <div className="pair-meta">
                  <div className="meta-item">
                    <span className="meta-label">Created:</span>
                    <span className="meta-value">
                      {new Date(pair.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                <div className="pair-actions">
                  <button 
                    className="btn-icon" 
                    title="View Words"
                    onClick={() => viewWords(pair.id)}
                  >
                    👁️
                  </button>
                  <button 
                    className="btn-icon" 
                    title="Import Words"
                    onClick={() => importWords(pair.id)}
                  >
                    📥
                  </button>
                  <button 
                    className="btn-icon edit" 
                    title="Edit Pair"
                    onClick={() => editPair(pair.id)}
                  >
                    ✏️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Helper functions (to be implemented)
  function viewWords(pairId) {
    // TODO: Navigate to words view for this language pair
    console.log('View words for pair:', pairId);
  }

  function importWords(pairId) {
    // TODO: Show import dialog for this language pair
    console.log('Import words for pair:', pairId);
  }

  function editPair(pairId) {
    // TODO: Show edit form for this language pair
    console.log('Edit pair:', pairId);
  }
};

export default AdminLanguagePairs;
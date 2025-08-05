import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import axios from 'axios';
import { apiUrl } from './config';
import WordList from './components/WordList';
import Practice from './components/Practice';
import Statistics from './components/Statistics';
import AdminDashboard from './components/AdminDashboard';
import Settings from './components/Settings';
import Auth from './components/Auth';
import UserPreferences from './components/UserPreferences';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [words, setWords] = useState([]);
  const [languagePairs, setLanguagePairs] = useState([]);
  const [selectedLanguagePair, setSelectedLanguagePair] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  useEffect(() => {
    if (user) {
      fetchLanguagePairs();
      initializeUserData();
    }
  }, [user, fetchLanguagePairs, initializeUserData]);

  useEffect(() => {
    if (selectedLanguagePair && user) {
      fetchWords();
      fetchStats();
    }
  }, [selectedLanguagePair, user, fetchWords, fetchStats]);

  const checkAuthStatus = useCallback(async () => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        // Set axios default header
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Verify token is still valid
        const response = await axios.get(`${apiUrl}/api/auth/me`);
        setUser(response.data.user);
      } catch (error) {
        console.error('Token verification failed:', error);
        handleLogout();
      }
    }
    setLoading(false);
  }, []);

  const fetchLanguagePairs = useCallback(async () => {
    try {
      const response = await axios.get(`${apiUrl}/api/language-pairs`);
      setLanguagePairs(response.data);
      
      // Set default language pair from user preferences or first available
      const userPrefs = user?.preferences || {};
      const defaultPairId = userPrefs.defaultLanguagePair;
      
      if (defaultPairId && response.data.find(pair => pair.id === defaultPairId)) {
        setSelectedLanguagePair(defaultPairId);
      } else if (response.data.length > 0) {
        setSelectedLanguagePair(response.data[0].id);
      }
    } catch (error) {
      console.error('Error fetching language pairs:', error);
    }
  }, [user]);

  const initializeUserData = useCallback(() => {
    const userPrefs = user?.preferences || {};
    
    // If user has selected language pairs in preferences, use those
    if (userPrefs.selectedLanguagePairs?.length > 0) {
      const defaultPair = userPrefs.defaultLanguagePair || userPrefs.selectedLanguagePairs[0];
      setSelectedLanguagePair(defaultPair);
    }
  }, [user]);

  const fetchWords = useCallback(async () => {
    if (!selectedLanguagePair) return;
    
    try {
      const response = await axios.get(`${apiUrl}/api/language-pairs/${selectedLanguagePair}/words`);
      setWords(response.data);
    } catch (error) {
      console.error('Error fetching words:', error);
    }
  }, [selectedLanguagePair]);

  const fetchStats = useCallback(async () => {
    if (!selectedLanguagePair) return;
    
    try {
      const response = await axios.get(`${apiUrl}/api/language-pairs/${selectedLanguagePair}/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, [selectedLanguagePair]);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setWords([]);
    setLanguagePairs([]);
    setSelectedLanguagePair(null);
    setStats(null);
  };

  const handlePreferencesUpdate = (newPreferences) => {
    const updatedUser = { ...user, preferences: newPreferences };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
    
    // Update selected language pair if it changed
    if (newPreferences.defaultLanguagePair && 
        newPreferences.defaultLanguagePair !== selectedLanguagePair) {
      setSelectedLanguagePair(newPreferences.defaultLanguagePair);
    }
  };

  // const handleWordAdded = (newWord) => {
  //   setWords([...words, newWord]);
  //   fetchStats();
  // };

  const handleWordUpdated = (updatedWord) => {
    setWords(words.map(word => word.id === updatedWord.id ? updatedWord : word));
    fetchStats();
  };

  const handleWordDeleted = (wordId) => {
    setWords(words.filter(word => word.id !== wordId));
    fetchStats();
  };

  const handleLanguagePairChange = (pairId) => {
    setSelectedLanguagePair(pairId);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  // Show auth screen if not logged in
  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <Router>
      <div className="App">
        <nav className="navbar">
          <div className="container">
            <h1 className="nav-title">Word Memory App</h1>
            
            {/* Mobile menu button */}
            <button 
              className="mobile-menu-btn"
              onClick={toggleMobileMenu}
              aria-label="Toggle navigation menu"
            >
              <span className={`hamburger ${isMobileMenuOpen ? 'open' : ''}`}>
                <span></span>
                <span></span>
                <span></span>
              </span>
            </button>
            
            {/* Language Pair Selector */}
            {languagePairs.length > 1 && (
              <div className="language-pair-selector">
                <select 
                  value={selectedLanguagePair || ''} 
                  onChange={(e) => handleLanguagePairChange(e.target.value)}
                  className="pair-select"
                >
                  {languagePairs.map(pair => (
                    <option key={pair.id} value={pair.id}>
                      {pair.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Navigation links */}
            <div className={`nav-links ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
              <Link to="/" className="nav-link" onClick={closeMobileMenu}>Words</Link>
              <Link to="/practice" className="nav-link" onClick={closeMobileMenu}>Practice</Link>
              <Link to="/stats" className="nav-link" onClick={closeMobileMenu}>Statistics</Link>
              <Link to="/preferences" className="nav-link" onClick={closeMobileMenu}>Languages</Link>
              <Link to="/settings" className="nav-link" onClick={closeMobileMenu}>Settings</Link>
              {user.isAdmin && (
                <Link to="/admin" className="nav-link" onClick={closeMobileMenu}>Admin</Link>
              )}
              <button onClick={handleLogout} className="nav-link logout-btn">Logout</button>
            </div>
            
            {/* Mobile menu overlay */}
            {isMobileMenuOpen && (
              <div className="mobile-menu-overlay" onClick={closeMobileMenu}></div>
            )}
          </div>
        </nav>

        <main className="main-content">
          <div className="container">
            <Routes>
              <Route 
                path="/" 
                element={
                  <WordList 
                    words={words} 
                    onWordUpdated={handleWordUpdated}
                    onWordDeleted={handleWordDeleted}
                  />
                } 
              />

              <Route 
                path="/practice" 
                element={
                  selectedLanguagePair ? (
                    <Practice 
                      words={words}
                      languagePair={languagePairs.find(pair => pair.id === selectedLanguagePair)}
                      onWordUpdated={handleWordUpdated}
                    />
                  ) : (
                    <div className="no-language-pair">
                      <p>Please select a language pair in your preferences to start practicing.</p>
                      <Link to="/preferences" className="btn btn-primary">Go to Preferences</Link>
                    </div>
                  )
                } 
              />
              <Route 
                path="/stats" 
                element={
                  <Statistics 
                    stats={stats}
                    words={words}
                    languagePair={languagePairs.find(pair => pair.id === selectedLanguagePair)}
                  />
                } 
              />
              <Route 
                path="/preferences" 
                element={
                  <UserPreferences 
                    user={user}
                    onPreferencesUpdate={handlePreferencesUpdate}
                  />
                } 
              />
              {user.isAdmin && (
                <Route 
                  path="/admin" 
                  element={<AdminDashboard user={user} languagePairs={languagePairs} />} 
                />
              )}
              <Route 
                path="/settings" 
                element={<Settings user={user} />} 
              />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App; 
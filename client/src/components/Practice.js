import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Practice.css';

const Practice = ({ words, onWordUpdated }) => {
  const [currentMode, setCurrentMode] = useState(null); // null = main menu, 'knowledge', 'flashcards'

  const handleModeSelect = (mode) => {
    setCurrentMode(mode);
  };

  const handleExit = () => {
    setCurrentMode(null);
  };

  // Main menu
  if (currentMode === null) {
    return (
      <div className="practice-main-menu">
        <div className="practice-menu-container">
          <h1>Practice Mode</h1>
          <div className="practice-options">
            <button 
              className="practice-option knowledge-check"
              onClick={() => handleModeSelect('knowledge')}
            >
              <div className="option-icon">📊</div>
              <div className="option-content">
                <h3>Knowledge Check</h3>
                <p>Test your knowledge level with interactive quizzes</p>
              </div>
            </button>
            
            <button 
              className="practice-option flashcards"
              onClick={() => handleModeSelect('flashcards')}
            >
              <div className="option-icon">🃏</div>
              <div className="option-content">
                <h3>Flash Cards</h3>
                <p>Traditional flash card practice mode</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Knowledge Check Mode
  if (currentMode === 'knowledge') {
    return <KnowledgeCheck words={words} onWordUpdated={onWordUpdated} onExit={handleExit} />;
  }

  // Flash Cards Mode
  if (currentMode === 'flashcards') {
    return <FlashCards words={words} onWordUpdated={onWordUpdated} onExit={handleExit} />;
  }

  return null;
};

// Knowledge Check Component with Kahoot-style design and learning algorithm
const KnowledgeCheck = ({ words, onWordUpdated, onExit }) => {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [showHebrew, setShowHebrew] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [practiceWords, setPracticeWords] = useState([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [localWords, setLocalWords] = useState([]);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [sessionStats, setSessionStats] = useState({ correct: 0, total: 0 });
  const [showResult, setShowResult] = useState(false);
  const [answeredWord, setAnsweredWord] = useState(null);
 // Default to middle value

  useEffect(() => {
    // Create a local copy of words to prevent issues
    setLocalWords([...words]);
    
    // Check if speech synthesis is supported
    if ('speechSynthesis' in window) {
      setSpeechSupported(true);
    }
  }, [words]);

  // Load words using spaced repetition algorithm
  const loadSpacedRepetitionWords = async () => {
    try {
      // Get settings from localStorage
      const savedSettings = localStorage.getItem('practiceSettings');
      const settings = savedSettings ? JSON.parse(savedSettings) : {
        maxFocusWords: 5,
        focusPeriodDays: 5,
        reviewIntervalDays: 7,
        masteredReviewDays: 14,
        sessionSize: 15  // New setting for session size
      };
      
      const response = await axios.get('/api/words/spaced-repetition', { params: settings });
      const { focusWords, reviewWords } = response.data;
      
      // Combine focus words and review words
      const allWords = [...focusWords, ...reviewWords];
      
      // Mark review words for special handling
      const markedWords = allWords.map(word => ({
        ...word,
        isReviewWord: reviewWords.some(rw => rw.id === word.id)
      }));
      
      // Shuffle for variety
      const shuffled = [...markedWords].sort(() => Math.random() - 0.5);
      
      // Limit session size based on settings
      const sessionSize = settings.sessionSize || 15;
      return shuffled.slice(0, sessionSize);
    } catch (error) {
      console.error('Error loading spaced repetition words:', error);
      // Fallback to old algorithm if spaced repetition fails
      return createFallbackPracticeSet(localWords);
    }
  };

  // Fallback algorithm (original smart practice set)
  const createFallbackPracticeSet = (words) => {
    const availableWords = words.filter(word => word.userLevel < 5);
    if (availableWords.length === 0) return [];
    
    // Get session size from settings
    const savedSettings = localStorage.getItem('practiceSettings');
    const settings = savedSettings ? JSON.parse(savedSettings) : { sessionSize: 15 };
    const sessionSize = settings.sessionSize || 15;
    
    const weightedWords = [];
    availableWords.forEach(word => {
      const weight = Math.max(1, 5 - word.userLevel);
      for (let i = 0; i < weight; i++) {
        weightedWords.push(word);
      }
    });
    
    const shuffled = [...weightedWords].sort(() => Math.random() - 0.5);
    const limitedSessionSize = Math.min(sessionSize, shuffled.length);
    return shuffled.slice(0, limitedSessionSize);
  };

  useEffect(() => {
    // Load words using spaced repetition algorithm
    const loadWords = async () => {
      if (localWords.length === 0) return;
      
      const practiceSet = await loadSpacedRepetitionWords();
      setPracticeWords(practiceSet);
      
      // Reset state when words change
      if (practiceSet.length === 0) {
        setCurrentWordIndex(0);
        setShowHebrew(false);
        setSelectedLevel(null);
      } else if (currentWordIndex >= practiceSet.length) {
        // If current index is out of bounds, reset to 0
        setCurrentWordIndex(0);
        setShowHebrew(false);
        setSelectedLevel(null);
      }
    };
    
    loadWords();
  }, [localWords]);

  const currentWord = practiceWords[currentWordIndex];

  // Keyboard shortcuts for fast rating
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (showResult || isUpdating) return; // Don't handle keys during result screen or while updating
      
      if (event.code === 'Space') {
        event.preventDefault();
        if (speechSupported && currentWord) {
          speakWord(currentWord.english);
        }
      } else if (event.code === 'Escape') {
        onExit();
      } else if (event.code >= 'Digit0' && event.code <= 'Digit5') {
        // Handle number keys 0-5 for fast rating
        event.preventDefault();
        const level = parseInt(event.code.replace('Digit', ''));
        handleFastRating(level);
      } else if (event.code === 'KeyH') {
        // H key to toggle Hebrew
        event.preventDefault();
        setShowHebrew(!showHebrew);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showResult, isUpdating, speechSupported, currentWord, onExit, showHebrew]);

  // Manual speech synthesis function
  const speakWord = (word) => {
    if (!speechSupported || !word) return;
    
    // Stop any current speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    utterance.rate = 0.8;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    window.speechSynthesis.speak(utterance);
  };

  const handleFastRating = async (level) => {
    if (!currentWord || isUpdating) {
      return;
    }
    
    setIsUpdating(true);
    setSelectedLevel(level);
    setAnsweredWord(currentWord); // Store the word that was just answered
    setShowResult(true);
    
    // Update session stats (consider level 3+ as "correct")
    const isCorrect = level >= 3;
    setSessionStats(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1
    }));
    
    try {
      // Get settings for spaced repetition
      const savedSettings = localStorage.getItem('spacedRepetitionSettings');
      const settings = savedSettings ? JSON.parse(savedSettings) : {};
      
      const response = await axios.post(`/api/words/${currentWord.id}/spaced-progress`, {
        userLevel: level,
        settings: settings
      });
      
      // Update the word in the parent component
      onWordUpdated(response.data);
      
      // For level 5, we don't immediately remove the word from local list
      // Instead, we update it and let the useEffect handle the filtering
      setLocalWords(prev => 
        prev.map(word => 
          word.id === currentWord.id 
            ? { ...word, userLevel: level }
            : word
        )
      );
      
      // Show result screen for all levels - wait for user to click to continue
      setTimeout(() => {
        setIsUpdating(false);
      }, 300); // Brief delay to show feedback
      
    } catch (error) {
      console.error('Error updating progress:', error);
      setSelectedLevel(null);
      setIsUpdating(false);
      alert('Failed to update progress. Please try again.');
    }
  };

  const handleNextWord = () => {
    if (currentWordIndex < practiceWords.length - 1) {
      setCurrentWordIndex(prev => prev + 1);
      setShowHebrew(false);
      setSelectedLevel(null);
      setShowResult(false);
      setAnsweredWord(null);
    } else {
      // Session completed
      const accuracy = Math.round((sessionStats.correct / sessionStats.total) * 100);
      alert(`Knowledge check completed!\nAccuracy: ${accuracy}% (${sessionStats.correct}/${sessionStats.total})`);
      onExit();
    }
  };



  const getLevelColor = (level) => {
    const colors = ['#dc3545', '#fd7e14', '#ffc107', '#20c997', '#198754', '#0d6efd'];
    return colors[Math.min(level, 5)];
  };

  if (practiceWords.length === 0) {
    return (
      <div className="practice-fullscreen">
        <button className="exit-button" onClick={onExit}>✕</button>
        <div className="practice-content">
          <div className="no-words">
            <h2>No words available for practice</h2>
            <p>All your words are already mastered (Level 5) or you need to add more words.</p>
            <button onClick={onExit}>Back to Menu</button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentWord) {
    return (
      <div className="practice-fullscreen">
        <button className="exit-button" onClick={onExit}>✕</button>
        <div className="practice-content">
          <div className="no-words">
            <h2>No words available for practice</h2>
            <button onClick={onExit}>Back to Menu</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="kahoot-fullscreen">
      <button className="kahoot-exit-btn" onClick={onExit}>✕</button>
      
      {/* Header with progress and stats */}
      <div className="kahoot-header">
        <div className="kahoot-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${((currentWordIndex + 1) / practiceWords.length) * 100}%` }}
            ></div>
          </div>
          <span className="progress-text">
            {currentWordIndex + 1} / {practiceWords.length}
          </span>
        </div>
        <div className="session-stats">
          <span className="stat">✅ {sessionStats.correct}</span>
          <span className="stat">📊 {sessionStats.total}</span>
        </div>
      </div>

      {/* Main content area */}
      <div className="kahoot-content">
        {!showResult ? (
          <>
            {/* Question area */}
            <div className="kahoot-question">
              <h1 className="english-word">{currentWord.english}</h1>
              
              {showHebrew && (
                <div className="hebrew-reveal">
                  <h2 className="hebrew-word">{currentWord.hebrew}</h2>
                </div>
              )}
            </div>

            {/* Knowledge Rating Slider with Side Actions */}
            <div className="kahoot-slider-section">
              <h3 className="question-text">How well do you know this word?</h3>
              
              <div className="slider-with-actions">
                {/* Left side actions */}
                <div className="left-side-actions">
                  {speechSupported && (
                    <button 
                      className="kahoot-audio-btn"
                      onClick={() => speakWord(currentWord.english)}
                      title="Play pronunciation"
                    >
                      🔊   Play Audio
                    </button>
                  )}
                  <button 
                    className="show-hebrew-btn"
                    onClick={() => setShowHebrew(!showHebrew)}
                    disabled={isUpdating}
                  >
                    {showHebrew ? '🙈 Hide Hebrew' : '👁️ Show Hebrew'}
                  </button>
                </div>

                {/* Fast Rating Buttons */}
                <div className="fast-rating-container">
                  <div className="fast-rating-grid">
                    <button
                      className="fast-rating-btn level-0"
                      onClick={() => handleFastRating(0)}
                      disabled={isUpdating}
                    >
                      <span className="rating-emoji">❌</span>
                      <span className="rating-label">Don't Know</span>
                      <span className="rating-key">0</span>
                    </button>
                    
                    <button
                      className="fast-rating-btn level-1"
                      onClick={() => handleFastRating(1)}
                      disabled={isUpdating}
                    >
                      <span className="rating-emoji">🤔</span>
                      <span className="rating-label">Beginner</span>
                      <span className="rating-key">1</span>
                    </button>
                    
                    <button
                      className="fast-rating-btn level-2"
                      onClick={() => handleFastRating(2)}
                      disabled={isUpdating}
                    >
                      <span className="rating-emoji">📚</span>
                      <span className="rating-label">Learning</span>
                      <span className="rating-key">2</span>
                    </button>
                    
                    <button
                      className="fast-rating-btn level-3"
                      onClick={() => handleFastRating(3)}
                      disabled={isUpdating}
                    >
                      <span className="rating-emoji">👍</span>
                      <span className="rating-label">Good</span>
                      <span className="rating-key">3</span>
                    </button>
                    
                    <button
                      className="fast-rating-btn level-4"
                      onClick={() => handleFastRating(4)}
                      disabled={isUpdating}
                    >
                      <span className="rating-emoji">⭐</span>
                      <span className="rating-label">Great</span>
                      <span className="rating-key">4</span>
                    </button>
                    
                    <button
                      className="fast-rating-btn level-5"
                      onClick={() => handleFastRating(5)}
                      disabled={isUpdating}
                    >
                      <span className="rating-emoji">🏆</span>
                      <span className="rating-label">Mastered</span>
                      <span className="rating-key">5</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Result screen */
          <div className="kahoot-result" onClick={handleNextWord}>
            <div className="result-icon">
              {selectedLevel >= 3 ? '🎉' : '💪'}
            </div>
            <h2>
              {selectedLevel >= 3 ? 'Great job!' : 'Keep practicing!'}
            </h2>
            {answeredWord && (
              <div className="result-details">
                <div className="word-pair">
                  <span className="english">{answeredWord.english}</span>
                  <span className="hebrew">{answeredWord.hebrew}</span>
                </div>
                <div className="level-result">
                  You rated this as Level {selectedLevel}
                </div>
              </div>
            )}
            
            <div className="click-to-continue">
              <span className="continue-text">
                {currentWordIndex < practiceWords.length - 1 ? 'Click anywhere to continue →' : 'Click to finish session'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Enhanced Flash Cards Component
const FlashCards = ({ words, onWordUpdated, onExit }) => {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [practiceWords, setPracticeWords] = useState([]);
  const [sessionStats, setSessionStats] = useState({
    total: 0,
    reviewed: 0,
    improved: 0,
    declined: 0
  });
  const [isUpdating, setIsUpdating] = useState(false);

  // Load words using the enhanced algorithm
  useEffect(() => {
    const loadFlashcardWords = async () => {
      try {
        const settings = JSON.parse(localStorage.getItem('practiceSettings')) || {
          maxFocusWords: 8,
          focusPeriodDays: 5,
          reviewIntervalDays: 7,
          masteredReviewDays: 14
        };
        
        const response = await axios.get('/api/words/spaced-repetition', { params: settings });
        const { focusWords, reviewWords } = response.data;
        
        // Combine and shuffle words for flashcard practice
        const allWords = [...focusWords, ...reviewWords];
        const shuffled = allWords.sort(() => Math.random() - 0.5);
        
        setPracticeWords(shuffled);
        setSessionStats(prev => ({ ...prev, total: shuffled.length }));
      } catch (error) {
        console.error('Error loading flashcard words:', error);
        // Fallback to all words if API fails
        const allWords = words.sort(() => Math.random() - 0.5);
        setPracticeWords(allWords);
        setSessionStats(prev => ({ ...prev, total: allWords.length }));
      }
    };

    loadFlashcardWords();
  }, [words]);

  const currentWord = practiceWords[currentWordIndex];

  const handleNext = () => {
    if (currentWordIndex < practiceWords.length - 1) {
      setCurrentWordIndex(currentWordIndex + 1);
      setShowAnswer(false);
    }
  };

  const handlePrevious = () => {
    if (currentWordIndex > 0) {
      setCurrentWordIndex(currentWordIndex - 1);
      setShowAnswer(false);
    }
  };

  const handleProgressUpdate = async (newLevel) => {
    if (!currentWord || isUpdating) return;
    
    setIsUpdating(true);
    try {
      const settings = JSON.parse(localStorage.getItem('practiceSettings')) || {};
      const response = await axios.post(`/api/words/${currentWord.id}/spaced-progress`, {
        userLevel: newLevel,
        settings
      });
      
      onWordUpdated(response.data);
      
      // Update session stats
      const oldLevel = currentWord.userLevel;
      setSessionStats(prev => ({
        ...prev,
        reviewed: prev.reviewed + 1,
        improved: newLevel > oldLevel ? prev.improved + 1 : prev.improved,
        declined: newLevel < oldLevel ? prev.declined + 1 : prev.declined
      }));
      
      // Auto-advance after a brief delay
      setTimeout(() => {
        handleNext();
        setIsUpdating(false);
      }, 800);
      
    } catch (error) {
      console.error('Error updating progress:', error);
      setIsUpdating(false);
    }
  };

  const getLevelColor = (level) => {
    const colors = ['#dc3545', '#fd7e14', '#ffc107', '#20c997', '#198754', '#0d6efd'];
    return colors[Math.min(level, 5)];
  };

  const getLevelText = (level) => {
    const texts = ['New', 'Beginner', 'Learning', 'Good', 'Great', 'Confident'];
    return texts[Math.min(level, 5)];
  };

  if (practiceWords.length === 0) {
    return (
      <div className="flashcards-fullscreen">
        <button className="flashcards-exit-btn" onClick={onExit}>✕</button>
        <div className="flashcards-content">
          <div className="flashcards-no-words">
            <div className="no-words-icon">📚</div>
            <h2>No words available for practice</h2>
            <p>Add some words to get started with flashcard practice!</p>
            <button className="flashcards-btn" onClick={onExit}>Back to Menu</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flashcards-fullscreen">
      <button className="flashcards-exit-btn" onClick={onExit}>✕</button>
      
      {/* Simple Progress Bar */}
      <div className="flashcards-progress">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{width: `${((currentWordIndex + 1) / practiceWords.length) * 100}%`}}
          ></div>
        </div>
        <span className="progress-text">{currentWordIndex + 1} / {practiceWords.length}</span>
      </div>

      <div className="flashcards-content">
        {/* Flashcard */}
        <div className={`flashcard-card ${showAnswer ? 'show-answer' : ''}`}>
          <div className="flashcard-question">
            <h2 className="flashcard-word">{currentWord?.english}</h2>
            <div className="word-level">
              <span className="level-badge" style={{backgroundColor: getLevelColor(currentWord?.userLevel || 0)}}>
                {getLevelText(currentWord?.userLevel || 0)}
              </span>
            </div>
          </div>
          
          <div className={`flashcard-answer ${showAnswer ? 'visible' : ''}`}>
            <h3 className="hebrew-translation">{currentWord?.hebrew}</h3>
            <div className="word-info">
              <span className="difficulty">Difficulty: {currentWord?.difficulty || 1}</span>
              <span className="reviews">Reviews: {currentWord?.reviewCount || 0}</span>
            </div>
          </div>
        </div>

        {/* Navigation Controls */}
        <div className="flashcards-controls">
          <button 
            className="control-btn prev-btn"
            onClick={handlePrevious} 
            disabled={currentWordIndex === 0}
          >
            ←
          </button>
          
          <button 
            className={`control-btn main-btn ${showAnswer ? 'active' : ''}`}
            onClick={() => setShowAnswer(!showAnswer)}
          >
            {showAnswer ? 'Hide Answer' : 'Show Answer'}
          </button>
          
          <button 
            className="control-btn next-btn"
            onClick={handleNext} 
            disabled={currentWordIndex === practiceWords.length - 1}
          >
            →
          </button>
        </div>

        {/* Progress Controls - Always present but hidden when answer is not shown */}
        <div className={`flashcards-progress-controls ${showAnswer ? 'visible' : ''}`}>
          <div className="progress-header">
            <h3>Update Knowledge Level</h3>
          </div>
          
          <div className="level-controls">
            <button 
              className="level-btn decrease"
              onClick={() => handleProgressUpdate(Math.max(0, (currentWord?.userLevel || 0) - 1))}
              disabled={(currentWord?.userLevel || 0) === 0 || isUpdating}
            >
              📉 Decrease
            </button>
            
            <div className="current-level">
              <span className="level-number">Level {(currentWord?.userLevel || 0)}</span>
              <span className="level-name">{getLevelText(currentWord?.userLevel || 0)}</span>
            </div>
            
            <button 
              className="level-btn increase"
              onClick={() => handleProgressUpdate(Math.min(5, (currentWord?.userLevel || 0) + 1))}
              disabled={(currentWord?.userLevel || 0) === 5 || isUpdating}
            >
              📈 Increase
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Practice; 
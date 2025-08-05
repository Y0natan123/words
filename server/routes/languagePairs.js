const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticateToken, requireAdmin } = require('./auth');

const router = express.Router();

// Get all active language pairs
router.get('/', async (req, res) => {
  try {
    const languagePairs = await db.getAllLanguagePairs();
    res.json(languagePairs);
  } catch (error) {
    console.error('Error getting language pairs:', error);
    res.status(500).json({ error: 'Failed to get language pairs' });
  }
});

// Get specific language pair
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const languagePair = await db.getLanguagePairById(id);
    
    if (!languagePair) {
      return res.status(404).json({ error: 'Language pair not found' });
    }

    res.json(languagePair);
  } catch (error) {
    console.error('Error getting language pair:', error);
    res.status(500).json({ error: 'Failed to get language pair' });
  }
});

// Create new language pair (Admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, sourceLanguage, targetLanguage, description } = req.body;

    // Validate input
    if (!name || !sourceLanguage || !targetLanguage) {
      return res.status(400).json({ 
        error: 'Name, source language, and target language are required' 
      });
    }

    // Create language pair
    const pairId = uuidv4();
    const pairData = {
      id: pairId,
      name,
      sourceLanguage,
      targetLanguage,
      description: description || '',
      createdBy: req.user.userId
    };

    const languagePair = await db.createLanguagePair(pairData);

    res.status(201).json({
      message: 'Language pair created successfully',
      languagePair
    });

  } catch (error) {
    console.error('Error creating language pair:', error);
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      res.status(400).json({ error: 'Language pair with this name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create language pair' });
    }
  }
});

// Get words for a specific language pair (for current user)
router.get('/:id/words', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Verify language pair exists
    const languagePair = await db.getLanguagePairById(id);
    if (!languagePair) {
      return res.status(404).json({ error: 'Language pair not found' });
    }

    const words = await db.getUserWordsByLanguagePair(userId, id);
    res.json(words);

  } catch (error) {
    console.error('Error getting words for language pair:', error);
    res.status(500).json({ error: 'Failed to get words' });
  }
});

// Get user stats for a specific language pair
router.get('/:id/stats', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Verify language pair exists
    const languagePair = await db.getLanguagePairById(id);
    if (!languagePair) {
      return res.status(404).json({ error: 'Language pair not found' });
    }

    const stats = await db.getUserStats(userId, id);
    res.json({
      ...stats,
      languagePair: {
        id: languagePair.id,
        name: languagePair.name,
        sourceLanguage: languagePair.sourceLanguage,
        targetLanguage: languagePair.targetLanguage
      }
    });

  } catch (error) {
    console.error('Error getting language pair stats:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Add word to language pair (authenticated users)
router.post('/:id/words', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { sourceWord, targetWord, difficulty = 1 } = req.body;

    // Validate input
    if (!sourceWord || !targetWord) {
      return res.status(400).json({ 
        error: 'Source word and target word are required' 
      });
    }

    // Verify language pair exists
    const languagePair = await db.getLanguagePairById(id);
    if (!languagePair) {
      return res.status(404).json({ error: 'Language pair not found' });
    }

    // Create word
    const wordId = uuidv4();
    const wordData = {
      id: wordId,
      sourceWord,
      targetWord,
      languagePairId: id,
      difficulty: Math.min(Math.max(difficulty, 1), 5),
      createdBy: req.user.userId
    };

    const word = await db.addWord(wordData);

    res.status(201).json({
      message: 'Word added successfully',
      word
    });

  } catch (error) {
    console.error('Error adding word:', error);
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      res.status(400).json({ error: 'This word already exists in this language pair' });
    } else {
      res.status(500).json({ error: 'Failed to add word' });
    }
  }
});

// Update word progress for current user
router.post('/:languagePairId/words/:wordId/progress', authenticateToken, async (req, res) => {
  try {
    const { languagePairId, wordId } = req.params;
    const { userLevel } = req.body;
    const userId = req.user.userId;

    // Validate userLevel
    if (userLevel < 0 || userLevel > 5) {
      return res.status(400).json({ error: 'User level must be between 0 and 5' });
    }

    // Verify word exists and belongs to the language pair
    const word = await db.getWordById(wordId);
    if (!word || word.languagePairId !== languagePairId) {
      return res.status(404).json({ error: 'Word not found in this language pair' });
    }

    // Update progress
    const progressData = {
      userLevel,
      lastReviewed: new Date().toISOString(),
      nextReview: null, // Will be calculated by spaced repetition algorithm
      reviewCount: 1,
      streakCount: userLevel >= 3 ? 1 : 0,
      isFocusWord: userLevel < 3 ? 1 : 0
    };

    const progress = await db.updateUserProgress(userId, wordId, progressData);

    res.json({
      message: 'Progress updated successfully',
      progress
    });

  } catch (error) {
    console.error('Error updating progress:', error);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// Bulk import words to language pair (Admin or word creators)
router.post('/:id/import', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { wordsText } = req.body;

    if (!wordsText) {
      return res.status(400).json({ error: 'Words text is required for import' });
    }

    // Verify language pair exists
    const languagePair = await db.getLanguagePairById(id);
    if (!languagePair) {
      return res.status(404).json({ error: 'Language pair not found' });
    }

    // Parse words from text
    const lines = wordsText.split('\n').filter(line => line.trim());
    const wordsToAdd = [];

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2) {
        const sourceWord = parts[0];
        const targetWord = parts.slice(1).join(' ');
        
        wordsToAdd.push({
          id: uuidv4(),
          sourceWord,
          targetWord,
          languagePairId: id,
          difficulty: 1,
          createdBy: req.user.userId
        });
      }
    }

    if (wordsToAdd.length === 0) {
      return res.status(400).json({ error: 'No valid words found in the provided text' });
    }

    // Add words using existing addWords function (needs to be updated for new schema)
    const results = await db.addWords(wordsToAdd);

    res.json({
      message: 'Words imported successfully',
      results
    });

  } catch (error) {
    console.error('Error importing words:', error);
    res.status(500).json({ error: 'Failed to import words' });
  }
});

module.exports = router;
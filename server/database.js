const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database file path
const dbPath = path.join(__dirname, 'words.db');

// Initialize database
const initDatabase = () => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
        reject(err);
        return;
      }
      
      console.log('Connected to SQLite database');
      
      // Create users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          isAdmin INTEGER DEFAULT 0,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          lastLoginAt TEXT,
          preferences TEXT DEFAULT '{}'
        )
      `, (err) => {
        if (err) {
          console.error('Error creating users table:', err.message);
          reject(err);
          return;
        }
        console.log('Users table ready');

        // Create language_pairs table
        db.run(`
          CREATE TABLE IF NOT EXISTS language_pairs (
            id TEXT PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            sourceLanguage TEXT NOT NULL,
            targetLanguage TEXT NOT NULL,
            description TEXT,
            isActive INTEGER DEFAULT 1,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            createdBy TEXT,
            FOREIGN KEY (createdBy) REFERENCES users(id)
          )
        `, (err) => {
          if (err) {
            console.error('Error creating language_pairs table:', err.message);
            reject(err);
            return;
          }
          console.log('Language pairs table ready');

          // Create words table (updated schema)
          db.run(`
            CREATE TABLE IF NOT EXISTS words (
              id TEXT PRIMARY KEY,
              sourceWord TEXT NOT NULL,
              targetWord TEXT NOT NULL,
              languagePairId TEXT NOT NULL,
              difficulty INTEGER DEFAULT 1,
              exampleSentence TEXT,
              createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
              createdBy TEXT,
              FOREIGN KEY (languagePairId) REFERENCES language_pairs(id),
              FOREIGN KEY (createdBy) REFERENCES users(id),
              UNIQUE(sourceWord, languagePairId)
            )
          `, (err) => {
            if (err) {
              console.error('Error creating words table:', err.message);
              reject(err);
              return;
            }
            console.log('Words table ready');

            // Create user_progress table
            db.run(`
              CREATE TABLE IF NOT EXISTS user_progress (
                id TEXT PRIMARY KEY,
                userId TEXT NOT NULL,
                wordId TEXT NOT NULL,
                userLevel INTEGER DEFAULT 0,
                lastReviewed TEXT,
                nextReview TEXT,
                focusPeriodStart TEXT,
                reviewCount INTEGER DEFAULT 0,
                streakCount INTEGER DEFAULT 0,
                isFocusWord INTEGER DEFAULT 0,
                createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
                updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (userId) REFERENCES users(id),
                FOREIGN KEY (wordId) REFERENCES words(id),
                UNIQUE(userId, wordId)
              )
            `, (err) => {
              if (err) {
                console.error('Error creating user_progress table:', err.message);
                reject(err);
                return;
              }
              console.log('User progress table ready');

              // Insert default language pair for existing data
              db.run(`
                INSERT OR IGNORE INTO language_pairs (id, name, sourceLanguage, targetLanguage, description) 
                VALUES ('en-he', 'English-Hebrew', 'English', 'Hebrew', 'English to Hebrew translation')
              `, (err) => {
                if (err) {
                  console.log('Note: Default language pair may already exist');
                }

                // Migrate existing words to new schema if old table exists
                db.all(`PRAGMA table_info(words)`, (err, columns) => {
                  if (err) {
                    reject(err);
                    return;
                  }

                  const hasOldSchema = columns.some(col => col.name === 'english');
                  if (hasOldSchema) {
                    console.log('Migrating old words data to new schema...');
                    
                    // Create backup table and migrate data
                    db.run(`CREATE TABLE IF NOT EXISTS words_backup AS SELECT * FROM words WHERE english IS NOT NULL`, (err) => {
                      if (err) {
                        console.log('Note: Backup table creation issue (may already exist)');
                      }

                      // Add new columns to existing words if they don't exist
                      const newColumns = [
                        { name: 'sourceWord', type: 'TEXT' },
                        { name: 'targetWord', type: 'TEXT' },
                        { name: 'languagePairId', type: 'TEXT DEFAULT "en-he"' },
                        { name: 'createdBy', type: 'TEXT' }
                      ];

                      const alterPromises = newColumns.map(column => {
                        return new Promise((resolveAlter) => {
                          db.run(`ALTER TABLE words ADD COLUMN ${column.name} ${column.type}`, (err) => {
                            if (err && err.message.includes('duplicate column name')) {
                              console.log(`${column.name} column already exists`);
                            } else if (err) {
                              console.log(`Note: ${column.name} column may already exist`);
                            } else {
                              console.log(`Added ${column.name} column to existing table`);
                            }
                            resolveAlter();
                          });
                        });
                      });

                      Promise.all(alterPromises).then(() => {
                        // Update existing records to use new schema
                        db.run(`
                          UPDATE words 
                          SET sourceWord = english, 
                              targetWord = hebrew,
                              languagePairId = 'en-he'
                          WHERE sourceWord IS NULL AND english IS NOT NULL
                        `, (err) => {
                          if (err) {
                            console.log('Note: Migration update may have issues');
                          }
                          resolve(db);
                        });
                      });
                    });
                  } else {
                    resolve(db);
                  }
                });
              });
            });
          });
        });
      });
    });
  });
};

// Get database instance
let db = null;
const getDatabase = async () => {
  if (!db) {
    db = await initDatabase();
  }
  return db;
};

// Add a single word
const addWord = async (word) => {
  const database = await getDatabase();
  
  // Generate example sentence if not provided
  if (!word.exampleSentence) {
    word.exampleSentence = await generateExampleSentence(word.english);
  }
  
  return new Promise((resolve, reject) => {
    database.run(
      'INSERT OR IGNORE INTO words (id, english, hebrew, difficulty, exampleSentence) VALUES (?, ?, ?, ?, ?)',
      [word.id, word.english, word.hebrew, word.difficulty, word.exampleSentence || null],
      function(err) {
        if (err) {
          reject(err);
          return;
        }
        
        if (this.changes > 0) {
          // Word was added
          resolve({ success: true, word, message: 'Word added successfully' });
        } else {
          // Word already exists
          resolve({ success: false, message: 'Word already exists' });
        }
      }
    );
  });
};

// Add multiple words with progress feedback
const addWords = async (words, onProgress) => {
  const database = await getDatabase();
  const results = {
    added: 0,
    skipped: 0,
    errors: 0,
    total: words.length
  };

  return new Promise((resolve, reject) => {
    let processed = 0;
    
    const processNext = async () => {
      if (processed >= words.length) {
        resolve(results);
        return;
      }

      const word = words[processed];
      
      // Generate example sentence if not provided
      if (!word.exampleSentence) {
        word.exampleSentence = await generateExampleSentence(word.english);
      }
      
      database.run(
        'INSERT OR IGNORE INTO words (id, english, hebrew, difficulty, exampleSentence) VALUES (?, ?, ?, ?, ?)',
        [word.id, word.english, word.hebrew, word.difficulty, word.exampleSentence || null],
        function(err) {
          processed++;
          
          if (err) {
            results.errors++;
            console.error('Error adding word:', err);
          } else if (this.changes > 0) {
            results.added++;
          } else {
            results.skipped++;
          }
          
          // Call progress callback
          if (onProgress) {
            onProgress({
              processed,
              total: words.length,
              added: results.added,
              skipped: results.skipped,
              errors: results.errors,
              percentage: Math.round((processed / words.length) * 100)
            });
          }
          
          // Process next word
          processNext();
        }
      );
    };
    
    processNext();
  });
};

// Get all words
const getAllWords = async () => {
  const database = await getDatabase();
  return new Promise((resolve, reject) => {
    database.all('SELECT * FROM words ORDER BY english', (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
};

// Get word by ID
const getWordById = async (id) => {
  const database = await getDatabase();
  return new Promise((resolve, reject) => {
    database.get('SELECT * FROM words WHERE id = ?', [id], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });
};

// Update word
const updateWord = async (id, updates) => {
  const database = await getDatabase();
  return new Promise((resolve, reject) => {
    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    values.push(id);
    
    database.run(
      `UPDATE words SET ${setClause} WHERE id = ?`,
      values,
      function(err) {
        if (err) {
          reject(err);
          return;
        }
        
        if (this.changes > 0) {
          resolve({ success: true, changes: this.changes });
        } else {
          resolve({ success: false, message: 'Word not found' });
        }
      }
    );
  });
};

// Delete word
const deleteWord = async (id) => {
  const database = await getDatabase();
  return new Promise((resolve, reject) => {
    database.run('DELETE FROM words WHERE id = ?', [id], function(err) {
      if (err) {
        reject(err);
        return;
      }
      
      if (this.changes > 0) {
        resolve({ success: true, message: 'Word deleted successfully' });
      } else {
        resolve({ success: false, message: 'Word not found' });
      }
    });
  });
};

// Get statistics
const getStats = async () => {
  const database = await getDatabase();
  return new Promise((resolve, reject) => {
    database.get('SELECT COUNT(*) as total FROM words', (err, totalRow) => {
      if (err) {
        reject(err);
        return;
      }
      
      database.all('SELECT userLevel, COUNT(*) as count FROM words GROUP BY userLevel', (err, userLevelRows) => {
        if (err) {
          reject(err);
          return;
        }
        
        database.all('SELECT difficulty, COUNT(*) as count FROM words GROUP BY difficulty', (err, difficultyRows) => {
          if (err) {
            reject(err);
            return;
          }
          
          const stats = {
            totalWords: totalRow.total,
            byUserLevel: {},
            byDifficulty: {}
          };
          
          userLevelRows.forEach(row => {
            stats.byUserLevel[row.userLevel] = row.count;
          });
          
          difficultyRows.forEach(row => {
            stats.byDifficulty[row.difficulty] = row.count;
          });
          
          resolve(stats);
        });
      });
    });
  });
};

// Import words from text file
const importWordsFromText = async (textContent, onProgress) => {
  const lines = textContent.split('\n').filter(line => line.trim());
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
        id: require('uuid').v4(),
        english,
        hebrew,
        difficulty: assessWordDifficulty(english),
        userLevel: 0,
        exampleSentence: null, // Will be generated later
        createdAt: new Date().toISOString()
      });
    }
  });
  
  return await addWords(words, onProgress);
};

// Auto-assess word difficulty
const assessWordDifficulty = (english) => {
  const wordLength = english.length;
  const hasComplexSuffixes = /(tion|sion|ment|ness|able|ible|ous|ful|less)$/.test(english);
  const hasComplexPrefixes = /^(un|re|dis|pre|post|anti|pro|sub|super|trans)/.test(english);
  
  let difficulty = 3; // Default to intermediate
  
  if (wordLength <= 4 && !hasComplexSuffixes && !hasComplexPrefixes) {
    difficulty = 1; // Very basic
  } else if (wordLength <= 6 && !hasComplexSuffixes && !hasComplexPrefixes) {
    difficulty = 2; // Basic
  } else if (wordLength <= 8 || hasComplexSuffixes || hasComplexPrefixes) {
    difficulty = 3; // Intermediate
  } else if (wordLength <= 12 || (hasComplexSuffixes && hasComplexPrefixes)) {
    difficulty = 4; // Advanced
  } else {
    difficulty = 5; // Very advanced
  }
  
  return Math.min(Math.max(difficulty, 1), 5);
};

// Generate example sentence for a word using high-quality templates
const generateExampleSentence = async (word) => {
  try {
    // For now, we'll use our high-quality fallback sentences exclusively
    // since the AI models are not working reliably
    console.log(`Generating template-based sentence for word: "${word}"`);
    return generateFallbackSentence(word);
  } catch (error) {
    console.error('Error generating example sentence for:', word, error);
    // Fallback sentence
    return generateFallbackSentence(word);
  }
};

// Generate a good fallback sentence with variety
const generateFallbackSentence = (word) => {
  const templates = [
    `I learned about "${word}" in my English class today.`,
    `The teacher explained the meaning of "${word}" very clearly.`,
    `My friend used "${word}" in a conversation yesterday.`,
    `I found "${word}" in an interesting article I read.`,
    `The word "${word}" appears in many English books.`,
    `I practiced using "${word}" in my homework assignment.`,
    `My vocabulary improved after learning "${word}".`,
    `The dictionary helped me understand "${word}" better.`,
    `I heard someone use "${word}" in a movie I watched.`,
    `Learning "${word}" made my English sound more natural.`,
    `The context helped me understand what "${word}" means.`,
    `I used "${word}" in a sentence during my presentation.`,
    `My English teacher taught us how to use "${word}" correctly.`,
    `I discovered "${word}" while reading a novel.`,
    `The word "${word}" is commonly used in everyday speech.`,
    `I remember learning "${word}" from my textbook.`,
    `My study partner helped me understand "${word}" better.`,
    `I used "${word}" in my daily conversation today.`,
    `The word "${word}" has an interesting meaning.`,
    `I practiced pronouncing "${word}" with my teacher.`,
    `I saw "${word}" written on a sign in the city.`,
    `My brother taught me how to use "${word}" properly.`,
    `I encountered "${word}" while studying for my exam.`,
    `The word "${word}" is important for English learners.`,
    `I used "${word}" when talking to my English tutor.`,
    `My sister explained the meaning of "${word}" to me.`,
    `I found "${word}" in a vocabulary list for beginners.`,
    `The word "${word}" is useful in many situations.`,
    `I learned to pronounce "${word}" correctly today.`,
    `My classmate helped me understand "${word}" better.`,
    `I used "${word}" in my English writing assignment.`,
    `The word "${word}" appears frequently in English texts.`,
    `I practiced using "${word}" with my language partner.`,
    `My teacher gave me examples of how to use "${word}".`,
    `I discovered "${word}" while browsing an English website.`,
    `The word "${word}" is essential for basic communication.`,
    `I used "${word}" when speaking with native speakers.`,
    `My friend corrected my pronunciation of "${word}".`,
    `I learned the proper context for using "${word}".`,
    `The word "${word}" helped me express myself better.`
  ];
  
  return templates[Math.floor(Math.random() * templates.length)];
};

// Generate difficulty-appropriate sentence
const generateDifficultySentence = (word, difficulty) => {
  const easyTemplates = [
    `I learned the word "${word}" in my first English lesson.`,
    `The word "${word}" is very simple to understand.`,
    `My teacher taught me "${word}" as a basic vocabulary word.`,
    `I can easily remember the meaning of "${word}".`,
    `The word "${word}" is perfect for beginners.`
  ];
  
  const mediumTemplates = [
    `I practiced using "${word}" in different contexts.`,
    `The word "${word}" has multiple meanings depending on context.`,
    `I learned how to use "${word}" correctly in sentences.`,
    `My teacher explained the nuances of "${word}".`,
    `The word "${word}" is commonly used in everyday conversation.`
  ];
  
  const hardTemplates = [
    `I studied the advanced usage of "${word}" in academic texts.`,
    `The word "${word}" has complex grammatical patterns.`,
    `I learned the formal and informal uses of "${word}".`,
    `My teacher showed me the sophisticated applications of "${word}".`,
    `The word "${word}" requires careful attention to context.`
  ];
  
  let templates;
  if (difficulty <= 2) {
    templates = easyTemplates;
  } else if (difficulty <= 3) {
    templates = mediumTemplates;
  } else {
    templates = hardTemplates;
  }
  
  return templates[Math.floor(Math.random() * templates.length)];
};

// Generate example sentences for existing words that don't have them
const generateMissingSentences = async () => {
  const database = await getDatabase();
  return new Promise((resolve, reject) => {
    database.all('SELECT id, english, difficulty FROM words WHERE exampleSentence IS NULL OR exampleSentence = ""', [], async (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      
      const results = {
        processed: 0,
        updated: 0,
        errors: 0,
        total: rows.length
      };
      
      for (const row of rows) {
        try {
          // Use difficulty-appropriate sentences directly
          const sentence = generateDifficultySentence(row.english, row.difficulty);
          
          await new Promise((resolveUpdate, rejectUpdate) => {
            database.run('UPDATE words SET exampleSentence = ? WHERE id = ?', [sentence, row.id], function(err) {
              if (err) {
                results.errors++;
                rejectUpdate(err);
              } else {
                results.updated++;
                resolveUpdate();
              }
            });
          });
          results.processed++;
        } catch (error) {
          console.error('Error generating sentence for word:', row.english, error);
          results.errors++;
        }
      }
      
      resolve(results);
    });
  });
};

// Delete all words
const deleteAllWords = async () => {
  const database = await getDatabase();
  return new Promise((resolve, reject) => {
    database.run('DELETE FROM words', [], function(err) {
      if (err) {
        reject(err);
        return;
      }
      
      resolve({ 
        success: true, 
        message: `Successfully deleted ${this.changes} words`,
        deletedCount: this.changes
      });
    });
  });
};

// Enhanced Spaced Repetition Algorithm
const getSpacedRepetitionWords = (settings = {}) => {
  const {
    maxFocusWords = 5,
    focusPeriodDays = 5,
    reviewIntervalDays = 7,
    masteredReviewDays = 14  // Reduced from 30 to 14 days
  } = settings;

  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    const now = new Date().toISOString();
    
    // Get words that need immediate attention (failed reviews or new words)
    const urgentQuery = `
      SELECT *, 
        CASE 
          WHEN userLevel = 0 THEN 5  -- New words get highest priority
          WHEN userLevel = 1 AND streakCount = 0 THEN 4  -- Struggling words
          WHEN nextReview IS NOT NULL AND nextReview <= datetime('${now}') THEN 3  -- Due for review
          ELSE 1
        END as priority
      FROM words 
      WHERE (
        userLevel < 4 OR  -- Not yet confident
        (nextReview IS NOT NULL AND nextReview <= datetime('${now}'))  -- Due for review
      )
      ORDER BY priority DESC, lastReviewed ASC NULLS FIRST, reviewCount ASC
      LIMIT ${maxFocusWords * 2}
    `;
    
    db.all(urgentQuery, (err, urgentWords) => {
      if (err) {
        reject(err);
        return;
      }
      
      // Get confident words (level 4-5) that might need review
      const confidentQuery = `
        SELECT *,
          CASE
            WHEN userLevel = 4 AND (nextReview IS NULL OR nextReview <= datetime('${now}')) THEN 2
            WHEN userLevel = 5 AND (nextReview IS NULL OR nextReview <= datetime('${now}')) THEN 1
            ELSE 0
          END as reviewPriority
        FROM words 
        WHERE userLevel >= 4 
        AND (nextReview IS NULL OR nextReview <= datetime('${now}'))
        ORDER BY reviewPriority DESC, lastReviewed ASC NULLS FIRST
        LIMIT 5
      `;
      
      db.all(confidentQuery, (err, confidentWords) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Combine and prioritize words
        const allWords = [...urgentWords, ...confidentWords];
        const practiceSet = allWords.slice(0, Math.min(maxFocusWords + 3, allWords.length));
        
        // Mark words as currently in focus
        const updatePromises = practiceSet.map(word => {
          return new Promise((resolveUpdate) => {
            db.run(`
              UPDATE words 
              SET isFocusWord = 1, focusPeriodStart = ? 
              WHERE id = ?
            `, [now, word.id], resolveUpdate);
          });
        });
        
        Promise.all(updatePromises).then(() => {
          // Categorize words for better understanding
          const learningWords = practiceSet.filter(w => w.userLevel < 4);
          const reviewWords = practiceSet.filter(w => w.userLevel >= 4);
          
          resolve({
            focusWords: learningWords,
            reviewWords: reviewWords,
            totalWords: practiceSet.length,
            algorithm: 'enhanced'
          });
          db.close();
        });
      });
    });
  });
};

const updateWordWithSpacedRepetition = (wordId, userLevel, settings = {}) => {
  const { masteredReviewDays = 14, reviewIntervalDays = 7 } = settings;
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    const now = new Date().toISOString();
    
    // Get current word data to make intelligent decisions
    db.get('SELECT * FROM words WHERE id = ?', [wordId], (err, currentWord) => {
      if (err) {
        reject(err);
        return;
      }
      
      // Smart interval calculation based on performance
      let nextReview = null;
      let newStreakCount = 0;
      let shouldRemoveFromFocus = false;
      
      if (userLevel >= 3) {
        // Good performance - increase streak
        newStreakCount = (currentWord.streakCount || 0) + 1;
        
        // Calculate interval based on level and streak
        let intervalDays;
        if (userLevel === 5) {
          // "Mastered" - but still needs regular review
          intervalDays = Math.min(masteredReviewDays * Math.pow(1.5, newStreakCount), 60); // Max 60 days
        } else if (userLevel === 4) {
          // Very confident - longer intervals
          intervalDays = Math.min(reviewIntervalDays * 2, 21); // Max 21 days
        } else {
          // Good (level 3) - standard intervals
          intervalDays = reviewIntervalDays;
        }
        
        const reviewDate = new Date();
        reviewDate.setDate(reviewDate.getDate() + intervalDays);
        nextReview = reviewDate.toISOString();
        
        // Remove from focus if consistently good (streak >= 3) and level >= 4
        if (newStreakCount >= 3 && userLevel >= 4) {
          shouldRemoveFromFocus = true;
        }
      } else {
        // Poor performance - reset streak and schedule soon
        newStreakCount = 0;
        
        if (userLevel <= 1) {
          // Struggling - review in 1-2 days
          const reviewDate = new Date();
          reviewDate.setDate(reviewDate.getDate() + (userLevel === 0 ? 1 : 2));
          nextReview = reviewDate.toISOString();
        } else {
          // Level 2 - review in 3-4 days
          const reviewDate = new Date();
          reviewDate.setDate(reviewDate.getDate() + 4);
          nextReview = reviewDate.toISOString();
        }
      }
      
      // Update word with intelligent scheduling
      db.run(`
        UPDATE words 
        SET userLevel = ?, 
            lastReviewed = ?, 
            nextReview = ?,
            reviewCount = reviewCount + 1,
            streakCount = ?,
            isFocusWord = CASE 
              WHEN ? = 1 THEN 0  -- Remove from focus if flagged
              ELSE isFocusWord 
            END
        WHERE id = ?
      `, [userLevel, now, nextReview, newStreakCount, shouldRemoveFromFocus ? 1 : 0, wordId], function(err) {
        if (err) {
          reject(err);
          return;
        }
        
        // Get updated word
        db.get('SELECT * FROM words WHERE id = ?', [wordId], (err, word) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(word);
          db.close();
        });
      });
    });
  });
};

const getAlgorithmStats = () => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    const now = new Date().toISOString();
    
    const statsQuery = `
      SELECT 
        COUNT(*) as totalWords,
        COUNT(CASE WHEN userLevel = 0 THEN 1 END) as newWords,
        COUNT(CASE WHEN userLevel BETWEEN 1 AND 4 THEN 1 END) as learningWords,
        COUNT(CASE WHEN userLevel = 5 THEN 1 END) as masteredWords,
        COUNT(CASE WHEN isFocusWord = 1 THEN 1 END) as currentFocusWords,
        COUNT(CASE WHEN userLevel = 5 AND (nextReview IS NULL OR nextReview <= datetime('${now}')) THEN 1 END) as reviewDue
      FROM words
    `;
    
    db.get(statsQuery, (err, stats) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(stats);
      db.close();
    });
  });
};

// User Management Functions
const createUser = async (userData) => {
  const database = await getDatabase();
  const { id, username, email, password, isAdmin = 0 } = userData;
  
  return new Promise((resolve, reject) => {
    database.run(
      'INSERT INTO users (id, username, email, password, isAdmin) VALUES (?, ?, ?, ?, ?)',
      [id, username, email, password, isAdmin],
      function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve({ id, username, email, isAdmin });
      }
    );
  });
};

const getUserByEmail = async (email) => {
  const database = await getDatabase();
  
  return new Promise((resolve, reject) => {
    database.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(user);
    });
  });
};

const getUserByUsername = async (username) => {
  const database = await getDatabase();
  
  return new Promise((resolve, reject) => {
    database.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(user);
    });
  });
};

const getUserById = async (userId) => {
  const database = await getDatabase();
  
  return new Promise((resolve, reject) => {
    database.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(user);
    });
  });
};

const updateUserLastLogin = async (userId) => {
  const database = await getDatabase();
  const now = new Date().toISOString();
  
  return new Promise((resolve, reject) => {
    database.run(
      'UPDATE users SET lastLoginAt = ? WHERE id = ?',
      [now, userId],
      function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve(true);
      }
    );
  });
};

const updateUserPreferences = async (userId, preferences) => {
  const database = await getDatabase();
  const preferencesJson = JSON.stringify(preferences);
  
  return new Promise((resolve, reject) => {
    database.run(
      'UPDATE users SET preferences = ? WHERE id = ?',
      [preferencesJson, userId],
      function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve(true);
      }
    );
  });
};

// Language Pairs Functions
const createLanguagePair = async (pairData) => {
  const database = await getDatabase();
  const { id, name, sourceLanguage, targetLanguage, description, createdBy } = pairData;
  
  return new Promise((resolve, reject) => {
    database.run(
      'INSERT INTO language_pairs (id, name, sourceLanguage, targetLanguage, description, createdBy) VALUES (?, ?, ?, ?, ?, ?)',
      [id, name, sourceLanguage, targetLanguage, description, createdBy],
      function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve({ id, name, sourceLanguage, targetLanguage, description });
      }
    );
  });
};

const getAllLanguagePairs = async () => {
  const database = await getDatabase();
  
  return new Promise((resolve, reject) => {
    database.all('SELECT * FROM language_pairs WHERE isActive = 1 ORDER BY name', (err, pairs) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(pairs);
    });
  });
};

const getLanguagePairById = async (pairId) => {
  const database = await getDatabase();
  
  return new Promise((resolve, reject) => {
    database.get('SELECT * FROM language_pairs WHERE id = ?', [pairId], (err, pair) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(pair);
    });
  });
};

// User Progress Functions
const getUserProgress = async (userId, wordId) => {
  const database = await getDatabase();
  
  return new Promise((resolve, reject) => {
    database.get(
      'SELECT * FROM user_progress WHERE userId = ? AND wordId = ?',
      [userId, wordId],
      (err, progress) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(progress);
      }
    );
  });
};

const updateUserProgress = async (userId, wordId, progressData) => {
  const database = await getDatabase();
  const now = new Date().toISOString();
  const { userLevel, lastReviewed, nextReview, reviewCount, streakCount, isFocusWord } = progressData;
  
  return new Promise((resolve, reject) => {
    // First try to update existing progress
    database.run(`
      UPDATE user_progress 
      SET userLevel = ?, lastReviewed = ?, nextReview = ?, reviewCount = ?, 
          streakCount = ?, isFocusWord = ?, updatedAt = ?
      WHERE userId = ? AND wordId = ?
    `, [userLevel, lastReviewed, nextReview, reviewCount, streakCount, isFocusWord, now, userId, wordId], function(err) {
      if (err) {
        reject(err);
        return;
      }
      
      // If no rows were updated, create new progress record
      if (this.changes === 0) {
        const { v4: uuidv4 } = require('uuid');
        const progressId = uuidv4();
        
        database.run(`
          INSERT INTO user_progress (id, userId, wordId, userLevel, lastReviewed, nextReview, 
                                    reviewCount, streakCount, isFocusWord, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [progressId, userId, wordId, userLevel, lastReviewed, nextReview, 
            reviewCount, streakCount, isFocusWord, now], function(err) {
          if (err) {
            reject(err);
            return;
          }
          resolve({ id: progressId, userId, wordId, ...progressData });
        });
      } else {
        resolve({ userId, wordId, ...progressData });
      }
    });
  });
};

const getUserWordsByLanguagePair = async (userId, languagePairId) => {
  const database = await getDatabase();
  
  return new Promise((resolve, reject) => {
    const query = `
      SELECT w.*, 
             COALESCE(up.userLevel, 0) as userLevel,
             up.lastReviewed,
             up.nextReview,
             up.reviewCount,
             up.streakCount,
             up.isFocusWord,
             lp.name as languagePairName,
             lp.sourceLanguage,
             lp.targetLanguage
      FROM words w
      JOIN language_pairs lp ON w.languagePairId = lp.id
      LEFT JOIN user_progress up ON w.id = up.wordId AND up.userId = ?
      WHERE w.languagePairId = ? AND lp.isActive = 1
      ORDER BY w.createdAt DESC
    `;
    
    database.all(query, [userId, languagePairId], (err, words) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(words);
    });
  });
};

const getUserStats = async (userId, languagePairId = null) => {
  const database = await getDatabase();
  
  return new Promise((resolve, reject) => {
    let query = `
      SELECT 
        COUNT(DISTINCT w.id) as totalWords,
        COUNT(CASE WHEN COALESCE(up.userLevel, 0) = 0 THEN 1 END) as newWords,
        COUNT(CASE WHEN COALESCE(up.userLevel, 0) BETWEEN 1 AND 4 THEN 1 END) as learningWords,
        COUNT(CASE WHEN COALESCE(up.userLevel, 0) = 5 THEN 1 END) as masteredWords,
        AVG(CASE WHEN up.userLevel IS NOT NULL THEN up.userLevel ELSE 0 END) as averageLevel
      FROM words w
      JOIN language_pairs lp ON w.languagePairId = lp.id
      LEFT JOIN user_progress up ON w.id = up.wordId AND up.userId = ?
      WHERE lp.isActive = 1
    `;
    
    const params = [userId];
    if (languagePairId) {
      query += ' AND w.languagePairId = ?';
      params.push(languagePairId);
    }
    
    database.get(query, params, (err, stats) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(stats);
    });
  });
};

module.exports = {
  initDatabase,
  addWord,
  addWords,
  getAllWords,
  getWordById,
  updateWord,
  deleteWord,
  deleteAllWords,
  getStats,
  importWordsFromText,
  generateExampleSentence,
  generateFallbackSentence,
  generateMissingSentences,
  generateDifficultySentence,
  getSpacedRepetitionWords,
  updateWordWithSpacedRepetition,
  getAlgorithmStats,
  // User functions
  createUser,
  getUserByEmail,
  getUserByUsername,
  getUserById,
  updateUserLastLogin,
  updateUserPreferences,
  // Language pair functions
  createLanguagePair,
  getAllLanguagePairs,
  getLanguagePairById,
  // User progress functions
  getUserProgress,
  updateUserProgress,
  getUserWordsByLanguagePair,
  getUserStats
}; 
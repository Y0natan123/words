const express = require('express');
const router = express.Router();
const axios = require('axios');
const db = require('../database');

// Initialize Hugging Face API for text classification
const HF_API_URL = "https://api-inference.huggingface.co/models/facebook/bart-large-mnli";
const HF_API_KEY = process.env.HUGGING_FACE_API_KEY;
console.warn('HF_API_KEY:', HF_API_KEY);
// Check if API key is configured
if (!HF_API_KEY || HF_API_KEY === 'your_hugging_face_api_key_here') {
  console.warn('⚠️  HUGGING_FACE_API_KEY not configured. AI features will be disabled.');
}

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
    `I practiced pronouncing "${word}" with my teacher.`
  ];
  
  return templates[Math.floor(Math.random() * templates.length)];
};

// Assess word difficulty level
router.post('/assess-difficulty', async (req, res) => {
  try {
    const { word, context } = req.body;
    
    if (!word) {
      return res.status(400).json({ error: 'Word is required' });
    }

    // Check if API key is configured
    if (!HF_API_KEY || HF_API_KEY === 'your_hugging_face_api_key_here') {
      return res.status(500).json({ 
        error: 'AI service not configured. Please set HUGGING_FACE_API_KEY in your .env file' 
      });
    }

    // Use a simpler approach with predefined difficulty levels
    const difficultyLevels = [
      { label: "very basic", examples: ["cat", "house", "dog", "book", "car"] },
      { label: "basic", examples: ["happy", "book", "friend", "work", "home"] },
      { label: "intermediate", examples: ["accomplish", "determine", "consider", "establish", "maintain"] },
      { label: "advanced", examples: ["sophisticated", "arbitrary", "elaborate", "comprehensive", "theoretical"] },
      { label: "very advanced", examples: ["serendipity", "ephemeral", "ubiquitous", "quintessential", "serendipitous"] }
    ];

    // Simple heuristic-based difficulty assessment
    let difficulty = 3; // Default to intermediate
    
    const wordLength = word.length;
    const hasComplexSuffixes = /(tion|sion|ment|ness|able|ible|ous|ful|less)$/.test(word);
    const hasComplexPrefixes = /^(un|re|dis|pre|post|anti|pro|sub|super|trans)/.test(word);
    
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

    // Adjust based on context if provided
    if (context && context.includes("basic") || context.includes("simple")) {
      difficulty = Math.max(1, difficulty - 1);
    } else if (context && (context.includes("advanced") || context.includes("complex"))) {
      difficulty = Math.min(5, difficulty + 1);
    }
    
    if (isNaN(difficulty) || difficulty < 1 || difficulty > 5) {
      return res.status(500).json({ error: 'Invalid difficulty assessment' });
    }

    res.json({ word, difficulty });
  } catch (error) {
    console.error('AI assessment error:', error);
    
    if (error.response?.status === 401) {
      res.status(500).json({ 
        error: 'Invalid API key. Please check your HUGGING_FACE_API_KEY in .env file' 
      });
    } else {
      res.status(500).json({ error: 'Failed to assess word difficulty' });
    }
  }
});

// Generate sentences for practice
router.post('/generate-sentences', async (req, res) => {
  const { words, count = 5 } = req.body;
  
  if (!words || !Array.isArray(words) || words.length === 0) {
    return res.status(400).json({ error: 'Words array is required' });
  }

  try {
    const sentences = [];
    const HF_API_KEY = process.env.HUGGING_FACE_API_KEY;
    
    if (!HF_API_KEY || HF_API_KEY === 'your_hugging_face_api_key_here') {
      // No API key, use fallback sentences
      for (let i = 0; i < Math.min(count, words.length); i++) {
        const word = words[i];
        sentences.push(generateFallbackSentence(word));
      }
      return res.json({ sentences });
    }

    // Try multiple models
    const models = ['gpt2', 'distilgpt2', 'microsoft/DialoGPT-small'];
    
    for (let i = 0; i < Math.min(count, words.length); i++) {
      const word = words[i];
      let sentence = null;
      
      for (const model of models) {
        try {
          const prompt = `Create a natural English sentence using the word "${word}". The sentence should be educational and suitable for language learning. Make it contextual and meaningful.`;
          
          const response = await axios.post(`https://api-inference.huggingface.co/models/${model}`, {
            inputs: prompt,
            parameters: {
              max_length: 80,
              temperature: 0.9,
              do_sample: true,
              num_return_sequences: 1,
              pad_token_id: 50256
            }
          }, {
            headers: {
              'Authorization': `Bearer ${HF_API_KEY}`,
              'Content-Type': 'application/json',
            },
            timeout: 10000
          });
          
          if (response.data && response.data[0] && response.data[0].generated_text) {
            sentence = response.data[0].generated_text;
            sentence = sentence.replace(prompt, '').trim();
            
            // Validate the sentence
            if (sentence.length >= 10 && 
                sentence.length <= 200 && 
                !sentence.includes('Create a natural') &&
                sentence.includes(word)) {
              break; // Good sentence found
            }
          }
        } catch (modelError) {
          console.log(`Model ${model} failed for word ${word}, trying next...`);
          continue;
        }
      }
      
      // If no good sentence found, use fallback
      if (!sentence) {
        sentence = generateFallbackSentence(word);
      }
      
      sentences.push(sentence);
    }
    
    res.json({ sentences });
  } catch (error) {
    console.error('Error generating sentences:', error);
    res.status(500).json({ error: 'Failed to generate sentences' });
  }
});

// Generate a single example sentence for a word
router.post('/generate-sentence', async (req, res) => {
  const { word } = req.body;
  
  if (!word) {
    return res.status(400).json({ error: 'Word is required' });
  }

  try {
    const sentence = await db.generateExampleSentence(word);
    res.json({ sentence });
  } catch (error) {
    console.error('Error generating sentence:', error);
    res.status(500).json({ error: 'Failed to generate sentence' });
  }
});

// Generate an example sentence for AddWord component
router.post('/generate-example', async (req, res) => {
  const { word, context } = req.body;
  
  if (!word) {
    return res.status(400).json({ error: 'Word is required' });
  }

  try {
    const sentence = await db.generateExampleSentence(word);
    res.json({ sentence });
  } catch (error) {
    console.error('Error generating example sentence:', error);
    res.status(500).json({ error: 'Failed to generate example sentence' });
  }
});

// Get word suggestions based on difficulty
router.post('/suggest-words', async (req, res) => {
  try {
    const { difficulty, count = 5, excludeWords = [] } = req.body;
    
    if (!difficulty || difficulty < 1 || difficulty > 5) {
      return res.status(400).json({ error: 'Valid difficulty level (1-5) is required' });
    }

    // Check if API key is configured
    if (!HF_API_KEY || HF_API_KEY === 'your_hugging_face_api_key_here') {
      return res.status(500).json({ 
        error: 'AI service not configured. Please set HUGGING_FACE_API_KEY in your .env file' 
      });
    }

    // Predefined word lists by difficulty level
    const wordLists = {
      1: ["cat", "dog", "house", "book", "car", "tree", "water", "food", "friend", "family", "work", "home", "day", "night", "good", "bad", "big", "small", "new", "old"],
      2: ["happy", "sad", "angry", "tired", "hungry", "thirsty", "clean", "dirty", "fast", "slow", "easy", "hard", "right", "wrong", "same", "different", "important", "special", "beautiful", "ugly"],
      3: ["accomplish", "determine", "consider", "establish", "maintain", "improve", "develop", "create", "understand", "remember", "explain", "describe", "compare", "decide", "prepare", "organize", "complete", "achieve", "manage", "support"],
      4: ["sophisticated", "arbitrary", "elaborate", "comprehensive", "theoretical", "analytical", "strategic", "innovative", "perspective", "framework", "methodology", "implementation", "optimization", "synchronization", "characterization", "demonstration", "representation", "interpretation", "collaboration", "communication"],
      5: ["serendipity", "ephemeral", "ubiquitous", "quintessential", "serendipitous", "magnanimous", "perspicacious", "surreptitious", "mercurial", "capricious", "voracious", "tenacious", "audacious", "vivacious", "loquacious", "pertinent", "eloquent", "resilient", "diligent", "brilliant"]
    };

    let suggestions = wordLists[difficulty] || wordLists[3];
    
    // Filter out excluded words
    if (excludeWords && excludeWords.length > 0) {
      suggestions = suggestions.filter(word => !excludeWords.includes(word));
    }
    
    // Shuffle and limit to requested count
    suggestions = suggestions.sort(() => Math.random() - 0.5).slice(0, count);

    res.json({ suggestions: suggestions.slice(0, count) });
  } catch (error) {
    console.error('AI word suggestion error:', error);
    
    if (error.response?.status === 401) {
      res.status(500).json({ 
        error: 'Invalid API key. Please check your HUGGING_FACE_API_KEY in .env file' 
      });
    } else {
      res.status(500).json({ error: 'Failed to suggest words' });
    }
  }
});

module.exports = router; 
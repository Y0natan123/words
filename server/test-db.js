const db = require('./database');

async function testDatabase() {
  try {
    console.log('Testing database functionality...');
    
    // Test adding a single word
    console.log('\n1. Testing single word addition...');
    const testWord = {
      id: 'test-1',
      english: 'hello',
      hebrew: 'שלום',
      difficulty: 1,
      userLevel: 0,
      createdAt: new Date().toISOString()
    };
    
    const result1 = await db.addWord(testWord);
    console.log('Single word result:', result1);
    
    // Test adding the same word again (should be skipped)
    console.log('\n2. Testing duplicate word...');
    const result2 = await db.addWord(testWord);
    console.log('Duplicate word result:', result2);
    
    // Test getting all words
    console.log('\n3. Testing get all words...');
    const allWords = await db.getAllWords();
    console.log('Total words in database:', allWords.length);
    
    // Test importing words from text
    console.log('\n4. Testing bulk import...');
    const testText = `world עולם
good טוב
bad רע
happy שמח
sad עצוב`;
    
    const importResult = await db.importWordsFromText(testText);
    console.log('Import result:', importResult);
    
    // Test getting stats
    console.log('\n5. Testing statistics...');
    const stats = await db.getStats();
    console.log('Database stats:', stats);
    
    console.log('\n✅ Database test completed successfully!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
  }
}

testDatabase(); 
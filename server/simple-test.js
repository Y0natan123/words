const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'words.db');

console.log('Testing SQLite connection...');
console.log('Database path:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    return;
  }
  
  console.log('✅ Connected to SQLite database');
  
  // Test creating table
  db.run(`
    CREATE TABLE IF NOT EXISTS test_table (
      id TEXT PRIMARY KEY,
      name TEXT
    )
  `, (err) => {
    if (err) {
      console.error('Error creating table:', err.message);
      return;
    }
    
    console.log('✅ Test table created successfully');
    
    // Test inserting data
    db.run('INSERT OR IGNORE INTO test_table (id, name) VALUES (?, ?)', ['test1', 'Hello'], function(err) {
      if (err) {
        console.error('Error inserting data:', err.message);
        return;
      }
      
      console.log('✅ Data inserted successfully');
      console.log('Changes:', this.changes);
      
      // Close database
      db.close((err) => {
        if (err) {
          console.error('Error closing database:', err.message);
        } else {
          console.log('✅ Database closed successfully');
        }
      });
    });
  });
}); 
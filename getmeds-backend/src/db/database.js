require('dotenv').config();
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let db;

function getDb() {
  if (!db) {
    const dbDir = path.join(__dirname, '../../data');
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
    db = new Database(path.join(dbDir, 'getmeds.db'));
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // Auto-migrate is_test_account column if table exists
    try {
      const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
      if (tableExists) {
        const columns = db.pragma('table_info(users)').map(c => c.name);
        if (!columns.includes('is_test_account')) {
          db.exec('ALTER TABLE users ADD COLUMN is_test_account INTEGER DEFAULT 0');
        }
      }
    } catch (e) {
      console.warn('Note on DB migration:', e.message);
    }
  }
  return db;
}

module.exports = getDb();

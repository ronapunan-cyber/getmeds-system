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

    // WAL mode needs proper mmap/shared-memory + file-locking support from the
    // underlying filesystem. It fails with "SQLITE_IOERR" on some network
    // drives, synced folders (OneDrive/Dropbox), and virtualized mounts.
    // Fall back to the universally-compatible rollback journal if WAL isn't
    // supported here.
    try {
      db.pragma('journal_mode = WAL');
    } catch (e) {
      console.warn('journal_mode=WAL unavailable on this filesystem, falling back to DELETE:', e.message);
      try {
        db.pragma('journal_mode = DELETE');
      } catch (e2) {
        console.warn('Note on journal_mode pragma:', e2.message);
      }
    }

    try {
      db.pragma('foreign_keys = ON');
    } catch (e) {
      console.warn('Note on foreign_keys pragma:', e.message);
    }

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

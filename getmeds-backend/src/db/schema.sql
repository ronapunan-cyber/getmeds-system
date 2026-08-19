CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('medrep','finance','dispatch','management','admin')),
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('credit','direct')),
  credit_limit REAL DEFAULT 0,
  contact_person TEXT,
  contact_number TEXT,
  address TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  unit_price REAL NOT NULL,
  unit TEXT DEFAULT 'pc',
  stock INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  getmeds_order_id TEXT UNIQUE NOT NULL,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  medrep_id INTEGER NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'draft',
  customer_type TEXT NOT NULL CHECK(customer_type IN ('credit','direct')),
  total_amount REAL DEFAULT 0,
  delivery_address TEXT NOT NULL,
  delivery_notes TEXT,
  zoho_so_id TEXT,
  zoho_so_number TEXT,
  zoho_sync_status TEXT DEFAULT 'pending',
  exception_reason TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  submitted_at TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  subtotal REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER UNIQUE NOT NULL REFERENCES orders(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','verified','rejected')),
  payment_reference TEXT,
  payment_date TEXT,
  amount REAL,
  payment_method TEXT,
  notes TEXT,
  verified_by INTEGER REFERENCES users(id),
  verified_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS dispatch_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER UNIQUE NOT NULL REFERENCES orders(id),
  status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','picking','packing','dispatched')),
  courier TEXT,
  tracking_number TEXT,
  dispatch_notes TEXT,
  dispatched_by INTEGER REFERENCES users(id),
  dispatched_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS order_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  event_type TEXT NOT NULL,
  old_status TEXT,
  new_status TEXT,
  actor_id INTEGER REFERENCES users(id),
  actor_name TEXT,
  notes TEXT,
  metadata TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER REFERENCES orders(id),
  recipient_id INTEGER REFERENCES users(id),
  channel TEXT NOT NULL CHECK(channel IN ('in_app','email_log','google_chat_log')),
  message TEXT NOT NULL,
  payload TEXT,
  is_read INTEGER DEFAULT 0,
  sent_at TEXT DEFAULT (datetime('now'))
);

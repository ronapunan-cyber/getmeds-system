const db = require('../db/database');
const bcrypt = require('bcryptjs');

exports.getAll = (req, res, next) => {
  try {
    const users = db.prepare('SELECT id, name, email, role, is_active, created_at FROM users ORDER BY name').all();
    res.json({ success: true, data: { users } });
  } catch (err) { next(err); }
};

exports.create = (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'name, email, password, role required' } });
    }
    const valid_roles = ['medrep', 'finance', 'dispatch', 'management', 'admin'];
    if (!valid_roles.includes(role)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: `role must be one of: ${valid_roles.join(', ')}` } });
    }
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) return res.status(409).json({ success: false, error: { code: 'CONFLICT', message: 'Email already in use' } });

    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)').run(name, email, hash, role);
    const user = db.prepare('SELECT id, name, email, role, is_active, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, data: { user } });
  } catch (err) { next(err); }
};

exports.update = (req, res, next) => {
  try {
    const { role, is_active } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });

    if (role !== undefined) db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, user.id);
    if (is_active !== undefined) db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(is_active ? 1 : 0, user.id);

    const updated = db.prepare('SELECT id, name, email, role, is_active, created_at FROM users WHERE id = ?').get(user.id);
    res.json({ success: true, data: { user: updated } });
  } catch (err) { next(err); }
};

require('dotenv').config();
const db = require('./database');
const bcrypt = require('bcryptjs');

function run() {
  const hash = (pw) => bcrypt.hashSync(pw, 10);

  // Seed Users
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    const ins = db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)');
    ins.run('Admin User', 'admin@getmeds.ph', hash('demo123'), 'admin');
    ins.run('Juan dela Cruz', 'medrep@getmeds.ph', hash('demo123'), 'medrep');
    ins.run('Maria Santos', 'medrep2@getmeds.ph', hash('demo123'), 'medrep');
    ins.run('Rosa Reyes', 'finance@getmeds.ph', hash('demo123'), 'finance');
    ins.run('Ben Ramos', 'dispatch@getmeds.ph', hash('demo123'), 'dispatch');
    ins.run('Carlo Tan', 'manager@getmeds.ph', hash('demo123'), 'management');
    console.log('✅ Seeded users.');
  } else {
    console.log('ℹ️  Users already seeded, skipping.');
  }

  // Seed Customers
  const customerCount = db.prepare('SELECT COUNT(*) as count FROM customers').get().count;
  if (customerCount === 0) {
    const ins = db.prepare('INSERT INTO customers (name, type, credit_limit, contact_person, contact_number, address) VALUES (?, ?, ?, ?, ?, ?)');
    ins.run("St. Luke's Medical Center", 'credit', 500000, 'Dr. Santos', '02-8723-0101', 'E. Rodriguez Ave, Quezon City');
    ins.run('The Medical City', 'credit', 300000, 'Dr. Cruz', '02-9888-8999', 'Ortigas Ave, Pasig City');
    ins.run('Makati Med Pharmacy', 'credit', 200000, 'Ms. Lim', '02-8888-8000', '2 Amorsolo St, Makati City');
    ins.run('Jose dela Cruz', 'direct', 0, 'Jose dela Cruz', '09171234567', '123 Main St, Manila');
    ins.run('Maria Reyes', 'direct', 0, 'Maria Reyes', '09281234567', '456 Rizal Ave, Quezon City');
    console.log('✅ Seeded customers.');
  } else {
    console.log('ℹ️  Customers already seeded, skipping.');
  }

  // Seed Products
  const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
  if (productCount === 0) {
    const ins = db.prepare('INSERT INTO products (name, sku, unit_price, unit, stock) VALUES (?, ?, ?, ?, ?)');
    ins.run('Amoxicillin 500mg Cap', 'AMX500', 12.50, 'cap', 500);
    ins.run('Metformin 500mg Tab', 'MET500', 8.75, 'tab', 500);
    ins.run('Amlodipine 5mg Tab', 'AML005', 15.00, 'tab', 500);
    ins.run('Losartan 50mg Tab', 'LOS050', 18.50, 'tab', 500);
    ins.run('Omeprazole 20mg Cap', 'OMP020', 22.00, 'cap', 500);
    ins.run('Atorvastatin 20mg Tab', 'ATV020', 35.00, 'tab', 500);
    ins.run('Salbutamol Inhaler', 'SAL-INH', 285.00, 'pcs', 100);
    ins.run('Vitamin C 500mg Tab', 'VTC500', 5.50, 'tab', 1000);
    ins.run('Paracetamol 500mg Tab', 'PAR500', 4.25, 'tab', 1000);
    ins.run('Cetirizine 10mg Tab', 'CET010', 11.00, 'tab', 500);
    console.log('✅ Seeded products.');
  } else {
    console.log('ℹ️  Products already seeded, skipping.');
  }
}

run();
console.log('🎉 Seeding complete.');

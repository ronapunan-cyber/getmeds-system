require('dotenv').config();
const db = require('./database');
const bcrypt = require('bcryptjs');

function run() {
  const hash = (pw) => bcrypt.hashSync(pw, 10);

  // Clean wipe in reverse-relational order to prevent foreign key errors and guarantee idempotency
  const seedTransaction = db.transaction(() => {
    // 1. Child tables first (Reverse-relational order)
    db.prepare('DELETE FROM notifications').run();
    db.prepare('DELETE FROM order_events').run();
    db.prepare('DELETE FROM dispatch_records').run();
    db.prepare('DELETE FROM payments').run();
    db.prepare('DELETE FROM order_items').run();
    db.prepare('DELETE FROM orders').run();

    // 2. Parent tables
    db.prepare('DELETE FROM products').run();
    db.prepare('DELETE FROM customers').run();
    db.prepare('DELETE FROM users').run();
    db.prepare('DELETE FROM roles').run();

    // Reset autoincrement sequences
    try {
      db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('roles','users','customers','products','orders','order_items','payments','dispatch_records','order_events','notifications')").run();
    } catch (e) {
      // sqlite_sequence may not exist if no rows were ever inserted
    }

    // Seed Roles
    const insRole = db.prepare('INSERT INTO roles (name, description) VALUES (?, ?)');
    const defaultRoles = [
      { name: 'Admin', description: 'System Administrator with full access' },
      { name: 'MedRep', description: 'Medical Representative' },
      { name: 'Finance', description: 'Finance Officer' },
      { name: 'Dispatch', description: 'Dispatch and Logistics Officer' }
    ];
    for (const r of defaultRoles) {
      insRole.run(r.name, r.description);
    }
    console.log('✅ Seeded roles (Admin, MedRep, Finance, Dispatch).');

    // Seed Users
    const insUser = db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)');
    insUser.run('Admin User', 'admin@getmeds.ph', hash('demo123'), 'admin');
    insUser.run('Juan dela Cruz', 'medrep@getmeds.ph', hash('demo123'), 'medrep');
    insUser.run('Maria Santos', 'medrep2@getmeds.ph', hash('demo123'), 'medrep');
    insUser.run('Rosa Reyes', 'finance@getmeds.ph', hash('demo123'), 'finance');
    insUser.run('Ben Ramos', 'dispatch@getmeds.ph', hash('demo123'), 'dispatch');
    insUser.run('Carlo Tan', 'manager@getmeds.ph', hash('demo123'), 'management');
    console.log('✅ Seeded users.');

    // Seed Customers
    const insCust = db.prepare('INSERT INTO customers (name, type, credit_limit, contact_person, contact_number, address) VALUES (?, ?, ?, ?, ?, ?)');
    insCust.run("St. Luke's Medical Center", 'credit', 500000, 'Dr. Santos', '02-8723-0101', 'E. Rodriguez Ave, Quezon City');
    insCust.run('The Medical City', 'credit', 300000, 'Dr. Cruz', '02-9888-8999', 'Ortigas Ave, Pasig City');
    insCust.run('Makati Med Pharmacy', 'credit', 200000, 'Ms. Lim', '02-8888-8000', '2 Amorsolo St, Makati City');
    insCust.run('Jose dela Cruz', 'direct', 0, 'Jose dela Cruz', '09171234567', '123 Main St, Manila');
    insCust.run('Maria Reyes', 'direct', 0, 'Maria Reyes', '09281234567', '456 Rizal Ave, Quezon City');
    console.log('✅ Seeded customers.');

    // Seed Products
    const insProd = db.prepare('INSERT INTO products (name, sku, unit_price, unit, stock) VALUES (?, ?, ?, ?, ?)');
    insProd.run('Amoxicillin 500mg Cap', 'AMX500', 12.50, 'cap', 500);
    insProd.run('Metformin 500mg Tab', 'MET500', 8.75, 'tab', 500);
    insProd.run('Amlodipine 5mg Tab', 'AML005', 15.00, 'tab', 500);
    insProd.run('Losartan 50mg Tab', 'LOS050', 18.50, 'tab', 500);
    insProd.run('Omeprazole 20mg Cap', 'OMP020', 22.00, 'cap', 500);
    insProd.run('Atorvastatin 20mg Tab', 'ATV020', 35.00, 'tab', 500);
    insProd.run('Salbutamol Inhaler', 'SAL-INH', 285.00, 'pcs', 100);
    insProd.run('Vitamin C 500mg Tab', 'VTC500', 5.50, 'tab', 1000);
    insProd.run('Paracetamol 500mg Tab', 'PAR500', 4.25, 'tab', 1000);
    insProd.run('Cetirizine 10mg Tab', 'CET010', 11.00, 'tab', 500);
    console.log('✅ Seeded products.');
  });

  seedTransaction();
}

run();
console.log('🎉 Seeding complete.');


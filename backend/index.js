import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import pg from 'pg';
import dotenv from 'dotenv';
import crypto from 'crypto';

import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from current dir first, then fall back to parent (project root)
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });


// ── PASSWORD ENCRYPTION HELPERS ──
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function comparePassword(password, storedPassword) {
  if (!storedPassword) return false;
  const [salt, originalHash] = storedPassword.split(':');
  if (!salt || !originalHash) return false;
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(originalHash, 'hex'));
}

const { Pool } = pg;

// Parse PostgreSQL NUMERIC (1700) as float in JavaScript
pg.types.setTypeParser(1700, (val) => parseFloat(val));

// ── CONSTANTS & SEED DATA ──
export const USERS = [
  { id: 1, username: 'admin', password: 'admin123', name: 'Uday Kumar', role: 'Admin' },
  { id: 2, username: 'manager', password: 'manager123', name: 'Priya Sharma', role: 'Manager' },
];

export const PRODUCTS = [
  {
    id: 'SKU-001', name: 'Orange Goli Soda', variant: 'Classic 200ml',
    batch: 'BATCH-1042', stock: 1240, costPerUnit: 8.50, sellingPrice: 15.00,
  },
  {
    id: 'SKU-002', name: 'Lemon Goli Soda', variant: 'Classic 200ml',
    batch: 'BATCH-1043', stock: 980, costPerUnit: 8.00, sellingPrice: 15.00,
  },
  {
    id: 'SKU-003', name: 'Paneer Soda', variant: 'Premium 300ml',
    batch: 'BATCH-1044', stock: 42, costPerUnit: 12.00, sellingPrice: 22.00,
  },
  {
    id: 'SKU-004', name: 'Mango Goli Soda', variant: 'Seasonal 200ml',
    batch: 'BATCH-1045', stock: 35, costPerUnit: 10.00, sellingPrice: 18.00,
  },
  {
    id: 'SKU-005', name: 'Blue Lagoon Soda', variant: 'Special Edition 250ml',
    batch: 'BATCH-1046', stock: 620, costPerUnit: 11.00, sellingPrice: 20.00,
  },
  {
    id: 'SKU-006', name: 'Grape Goli Soda', variant: 'Classic 200ml',
    batch: 'BATCH-1047', stock: 15, costPerUnit: 9.00, sellingPrice: 16.00,
  },
  {
    id: 'SKU-007', name: 'Jeera Soda', variant: 'Masala 200ml',
    batch: 'BATCH-1048', stock: 870, costPerUnit: 7.50, sellingPrice: 14.00,
  },
  {
    id: 'SKU-008', name: 'Cola Goli Soda', variant: 'Classic 200ml',
    batch: 'BATCH-1049', stock: 28, costPerUnit: 9.50, sellingPrice: 16.00,
  },
];

export const TRANSACTIONS = [
  { id: 'TXN-001', productId: 'SKU-001', type: 'IN', quantity: 500, date: '2026-06-01', note: 'Production run #42' },
  { id: 'TXN-002', productId: 'SKU-001', type: 'OUT', quantity: 200, date: '2026-06-03', note: 'Dispatch to Krishna Distributors' },
  { id: 'TXN-003', productId: 'SKU-002', type: 'IN', quantity: 400, date: '2026-06-02', note: 'Production run #43' },
  { id: 'TXN-004', productId: 'SKU-003', type: 'OUT', quantity: 150, date: '2026-06-05', note: 'Sale to Metro Mart' },
  { id: 'TXN-005', productId: 'SKU-005', type: 'IN', quantity: 300, date: '2026-06-08', note: 'Production run #44' },
  { id: 'TXN-006', productId: 'SKU-007', type: 'OUT', quantity: 120, date: '2026-06-10', note: 'Dispatch to Murugan Stores' },
  { id: 'TXN-007', productId: 'SKU-004', type: 'OUT', quantity: 80, date: '2026-06-12', note: 'Sale to Reliance Fresh' },
  { id: 'TXN-008', productId: 'SKU-006', type: 'IN', quantity: 200, date: '2026-06-14', note: 'Production run #45' },
];

export const EXPENSES = [
  { id: 'EXP-001', category: 'Raw Materials', amount: 45000, date: '2026-06-01', description: 'Sugar, citric acid, and flavoring — monthly procurement from Chennai supplier' },
  { id: 'EXP-002', category: 'Packaging', amount: 18500, date: '2026-06-03', description: 'Glass marble bottles (2000 units) from Sivakasi Glass Works' },
  { id: 'EXP-003', category: 'Logistics', amount: 8200, date: '2026-06-05', description: 'Delivery truck rental — 3 trips to Madurai and Trichy distributors' },
  { id: 'EXP-004', category: 'Overheads', amount: 12000, date: '2026-06-07', description: 'Monthly electricity bill for factory unit + cold storage' },
  { id: 'EXP-005', category: 'Raw Materials', amount: 22000, date: '2026-06-10', description: 'CO₂ gas cylinders (10 units) for carbonation' },
  { id: 'EXP-006', category: 'Overheads', amount: 35000, date: '2026-06-12', description: 'Staff salaries — 4 production workers + 1 supervisor' },
  { id: 'EXP-007', category: 'Packaging', amount: 7500, date: '2026-06-14', description: 'Labels and shrink-wrap for seasonal Mango variant' },
  { id: 'EXP-008', category: 'Logistics', amount: 4800, date: '2026-06-15', description: 'Fuel for local delivery van — Coimbatore city routes' },
];

export const SALES = [
  { id: 'SAL-001', productId: 'SKU-001', quantity: 200, buyer: 'Krishna Distributors', buyerType: 'Distributor', date: '2026-06-03', amount: 3000 },
  { id: 'SAL-002', productId: 'SKU-003', quantity: 150, buyer: 'Metro Mart Madurai', buyerType: 'Retailer', date: '2026-06-05', amount: 3300 },
  { id: 'SAL-003', productId: 'SKU-002', quantity: 300, buyer: 'Saravana Stores', buyerType: 'Retailer', date: '2026-06-06', amount: 4500 },
  { id: 'SAL-004', productId: 'SKU-005', quantity: 100, buyer: 'Murugan Beverages', buyerType: 'Distributor', date: '2026-06-08', amount: 2000 },
  { id: 'SAL-005', productId: 'SKU-007', quantity: 120, buyer: 'Murugan Stores', buyerType: 'Retailer', date: '2026-06-10', amount: 1680 },
  { id: 'SAL-006', productId: 'SKU-001', quantity: 500, buyer: 'Reliance Fresh TN', buyerType: 'Retailer', date: '2026-06-11', amount: 7500 },
  { id: 'SAL-007', productId: 'SKU-004', quantity: 80, buyer: 'Reliance Fresh', buyerType: 'Retailer', date: '2026-06-12', amount: 1440 },
  { id: 'SAL-008', productId: 'SKU-002', quantity: 250, buyer: 'Star Bazaar', buyerType: 'Retailer', date: '2026-06-14', amount: 3750 },
];

export const EXPENSE_CATEGORIES = ['Raw Materials', 'Packaging', 'Logistics', 'Overheads'];
export const LOW_STOCK_THRESHOLD = 50;

// ── DATABASE SYSTEM (PostgreSQL) ──

let pool = null;

export async function initDb() {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      'DATABASE_URL environment variable is required.\n' +
      'Set it to your PostgreSQL connection string, e.g.:\n' +
      'DATABASE_URL=postgresql://user:pass@host:5432/dbname?sslmode=require'
    );
  }

  const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

  // If PG_PASSWORD is set, use explicit params to avoid URL-encoding issues with special chars
  if (process.env.PG_PASSWORD) {
    const url = new URL(connectionString);
    pool = new Pool({
      host: url.hostname,
      port: parseInt(url.port || '5432', 10),
      user: url.username,
      password: process.env.PG_PASSWORD,
      database: url.pathname.replace(/^\//, ''),
      ssl: isLocal ? false : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  } else {
    pool = new Pool({
      connectionString,
      ssl: isLocal ? false : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }



  // Test connection
  const testClient = await pool.connect();
  testClient.release();

  // Create tables
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      variant TEXT NOT NULL,
      batch TEXT NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      "costPerUnit" NUMERIC(10,2) NOT NULL,
      "sellingPrice" NUMERIC(10,2) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      "productId" TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK(type IN ('IN', 'OUT')),
      quantity INTEGER NOT NULL,
      date TEXT NOT NULL,
      note TEXT
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      amount NUMERIC(10,2) NOT NULL,
      date TEXT NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      "productId" TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      quantity INTEGER NOT NULL,
      buyer TEXT NOT NULL,
      "buyerType" TEXT NOT NULL,
      date TEXT NOT NULL,
      amount NUMERIC(10,2) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_details (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      value TEXT NOT NULL,
      UNIQUE(user_id, label)
    );

    CREATE TABLE IF NOT EXISTS enquiries (
      id SERIAL PRIMARY KEY,
      company TEXT NOT NULL,
      location TEXT NOT NULL,
      interest TEXT NOT NULL CHECK(interest IN ('retail', 'wholesale')),
      email TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new', 'contacted', 'closed')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Seed Users
  const userCount = await pool.query('SELECT COUNT(*)::int as count FROM users');
  if (userCount.rows[0].count === 0) {
    for (const u of USERS) {
      const hashed = hashPassword(u.password);
      await pool.query(
        'INSERT INTO users (username, password, name, role) VALUES ($1, $2, $3, $4)',
        [u.username, hashed, u.name, u.role]
      );
    }
  }

  // Migrate existing plain text passwords to hashed
  const allUsers = await pool.query('SELECT id, password FROM users');
  for (const u of allUsers.rows) {
    if (!u.password.includes(':')) {
      const hashed = hashPassword(u.password);
      await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, u.id]);
    }
  }

  // Seed Products
  const productCount = await pool.query('SELECT COUNT(*)::int as count FROM products');
  if (productCount.rows[0].count === 0) {
    for (const p of PRODUCTS) {
      await pool.query(
        'INSERT INTO products (id, name, variant, batch, stock, "costPerUnit", "sellingPrice") VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [p.id, p.name, p.variant, p.batch, p.stock, p.costPerUnit, p.sellingPrice]
      );
    }
  }

  // Seed Transactions
  const txnCount = await pool.query('SELECT COUNT(*)::int as count FROM transactions');
  if (txnCount.rows[0].count === 0) {
    for (const t of TRANSACTIONS) {
      await pool.query(
        'INSERT INTO transactions (id, "productId", type, quantity, date, note) VALUES ($1, $2, $3, $4, $5, $6)',
        [t.id, t.productId, t.type, t.quantity, t.date, t.note]
      );
    }
  }

  // Seed Expenses
  const expCount = await pool.query('SELECT COUNT(*)::int as count FROM expenses');
  if (expCount.rows[0].count === 0) {
    for (const e of EXPENSES) {
      await pool.query(
        'INSERT INTO expenses (id, category, amount, date, description) VALUES ($1, $2, $3, $4, $5)',
        [e.id, e.category, e.amount, e.date, e.description]
      );
    }
  }

  // Seed Sales
  const saleCount = await pool.query('SELECT COUNT(*)::int as count FROM sales');
  if (saleCount.rows[0].count === 0) {
    for (const s of SALES) {
      await pool.query(
        'INSERT INTO sales (id, "productId", quantity, buyer, "buyerType", date, amount) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [s.id, s.productId, s.quantity, s.buyer, s.buyerType, s.date, s.amount]
      );
    }
  }

  console.log('PostgreSQL database connected and verified successfully.');
  return pool;
}

export function getDb() {
  if (!pool) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return pool;
}

// Helper: generate next sequential ID like TXN-009, EXP-009, SAL-009
async function getNextId(client, table, prefix) {
  const result = await client.query(
    `SELECT id FROM ${table} ORDER BY id DESC LIMIT 1`
  );
  if (result.rows.length === 0) {
    return `${prefix}-001`;
  }
  const lastId = result.rows[0].id;
  const num = parseInt(lastId.split('-')[1], 10);
  return `${prefix}-${String(num + 1).padStart(3, '0')}`;
}

// Helper: get current month date range
function getCurrentMonthRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const startDate = `${year}-${month}-01`;
  // End of month: start of next month
  const nextMonth = now.getMonth() + 2;
  const nextYear = nextMonth > 12 ? year + 1 : year;
  const nextMonthStr = String(nextMonth > 12 ? 1 : nextMonth).padStart(2, '0');
  const endDate = `${nextYear}-${nextMonthStr}-01`;
  return { startDate, endDate, label: `${now.toLocaleString('en-US', { month: 'long' })} ${year}` };
}

// ── AUTHENTICATION MIDDLEWARE ──
const JWT_SECRET = process.env.JWT_SECRET || 'goliops-secret-key-uday-beverages-2026';

export function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
}

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(403).json({ error: 'Invalid or expired token.' });
  }
}

// ── EXPRESS APPLICATION SETUP ──
const app = express();

app.use(cors());
app.use(express.json());

// Ensure DB is initialized before every request.
// On Vercel (serverless) the local listener block never runs, so initDb()
// would never be called without this middleware.
// initDb() is idempotent — if the pool is already open it returns immediately.
app.use(async (req, res, next) => {
  try {
    await initDb();
    next();
  } catch (err) {
    console.error('DB init failed:', err.message);
    res.status(503).json({ error: 'Database unavailable. Please try again shortly.' });
  }
});

// ── ROUTERS ──

// 1. Auth Router
const authRouter = express.Router();

authRouter.post('/login', async (req, res, next) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }
  try {
    const db = getDb();
    const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];
    if (!user || !comparePassword(password, user.password)) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }
    const token = generateToken(user);
    res.json({
      token,
      user: { id: user.id, username: user.username, name: user.name, role: user.role },
    });
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

authRouter.put('/profile', authenticateToken, async (req, res, next) => {
  const { name, username, currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  if (!name || !username) {
    return res.status(400).json({ error: 'Name and username are required.' });
  }

  try {
    const db = getDb();

    // Check if username is taken
    const existingUser = await db.query('SELECT * FROM users WHERE username = $1 AND id != $2', [username, userId]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Username is already taken.' });
    }

    const currentUser = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (currentUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to change password.' });
      }
      if (!comparePassword(currentPassword, currentUser.rows[0].password)) {
        return res.status(400).json({ error: 'Current password is incorrect.' });
      }
      const hashedNew = hashPassword(newPassword);
      await db.query(
        'UPDATE users SET name = $1, username = $2, password = $3 WHERE id = $4',
        [name, username, hashedNew, userId]
      );
    } else {
      await db.query(
        'UPDATE users SET name = $1, username = $2 WHERE id = $3',
        [name, username, userId]
      );
    }

    const updatedUser = await db.query('SELECT id, username, name, role FROM users WHERE id = $1', [userId]);
    const token = generateToken(updatedUser.rows[0]);

    res.json({
      message: 'Profile updated successfully.',
      token,
      user: updatedUser.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

// Dynamic Profile Details APIs
authRouter.get('/profile/details', authenticateToken, async (req, res, next) => {
  try {
    const db = getDb();
    const result = await db.query('SELECT * FROM user_details WHERE user_id = $1 ORDER BY label ASC', [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

authRouter.post('/profile/details', authenticateToken, async (req, res, next) => {
  const { label, value } = req.body;
  if (!label || !value) {
    return res.status(400).json({ error: 'Label and value are required.' });
  }
  try {
    const db = getDb();
    const result = await db.query(
      `INSERT INTO user_details (user_id, label, value) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (user_id, label) 
       DO UPDATE SET value = EXCLUDED.value 
       RETURNING *`,
      [req.user.id, label, value]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

authRouter.delete('/profile/details/:id', authenticateToken, async (req, res, next) => {
  try {
    const db = getDb();
    const result = await db.query('DELETE FROM user_details WHERE id = $1 AND user_id = $2 RETURNING *', [req.params.id, req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Detail not found or unauthorized.' });
    }
    res.json({ message: 'Detail deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

// Admin/Manager User Accounts CRUD APIs
authRouter.get('/users', authenticateToken, async (req, res, next) => {
  if (req.user.role !== 'Admin' && req.user.role !== 'Manager') {
    return res.status(403).json({ error: 'Forbidden. Admin or Manager access required.' });
  }
  try {
    const db = getDb();
    const result = await db.query('SELECT id, username, name, role FROM users ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

authRouter.post('/users', authenticateToken, async (req, res, next) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Forbidden. Admin access required.' });
  }
  const { username, password, name, role } = req.body;
  if (!username || !password || !name || !role) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  try {
    const db = getDb();
    const existing = await db.query('SELECT id FROM users WHERE username = $1', [username]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Username is already taken.' });
    }
    const hashed = hashPassword(password);
    const result = await db.query(
      'INSERT INTO users (username, password, name, role) VALUES ($1, $2, $3, $4) RETURNING id, username, name, role',
      [username, hashed, name, role]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

authRouter.put('/users/:id', authenticateToken, async (req, res, next) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Forbidden. Admin access required.' });
  }
  const { username, password, name, role } = req.body;
  const userId = req.params.id;
  if (!username || !name || !role) {
    return res.status(400).json({ error: 'Username, name, and role are required.' });
  }
  try {
    const db = getDb();
    const existing = await db.query('SELECT id FROM users WHERE username = $1 AND id != $2', [username, userId]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Username is already taken.' });
    }
    
    if (password) {
      const hashed = hashPassword(password);
      await db.query(
        'UPDATE users SET username = $1, password = $2, name = $3, role = $4 WHERE id = $5',
        [username, hashed, name, role, userId]
      );
    } else {
      await db.query(
        'UPDATE users SET username = $1, name = $2, role = $3 WHERE id = $4',
        [username, name, role, userId]
      );
    }
    
    const updated = await db.query('SELECT id, username, name, role FROM users WHERE id = $1', [userId]);
    res.json(updated.rows[0]);
  } catch (err) {
    next(err);
  }
});

authRouter.delete('/users/:id', authenticateToken, async (req, res, next) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Forbidden. Admin access required.' });
  }
  const userId = parseInt(req.params.id, 10);
  if (userId === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own account.' });
  }
  try {
    const db = getDb();
    const result = await db.query('DELETE FROM users WHERE id = $1 RETURNING id', [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json({ message: 'User deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

// 2. Inventory Router
const inventoryRouter = express.Router();

inventoryRouter.get('/products', async (req, res, next) => {
  try {
    const db = getDb();
    const result = await db.query('SELECT * FROM products ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// NEW: Create a new product (Add SKU)
inventoryRouter.post('/products', async (req, res, next) => {
  const { id, name, variant, batch, stock, costPerUnit, sellingPrice } = req.body;

  if (!id || !name || !variant || !batch || stock === undefined || !costPerUnit || !sellingPrice) {
    return res.status(400).json({
      error: 'All fields are required: id (SKU), name, variant, batch, stock, costPerUnit, sellingPrice.',
    });
  }

  const stockNum = parseInt(stock, 10);
  const costNum = parseFloat(costPerUnit);
  const priceNum = parseFloat(sellingPrice);

  if (isNaN(stockNum) || stockNum < 0) {
    return res.status(400).json({ error: 'Stock must be a non-negative number.' });
  }
  if (isNaN(costNum) || costNum <= 0) {
    return res.status(400).json({ error: 'Cost per unit must be a positive number.' });
  }
  if (isNaN(priceNum) || priceNum <= 0) {
    return res.status(400).json({ error: 'Selling price must be a positive number.' });
  }

  try {
    const db = getDb();

    // Check if SKU already exists
    const existing = await db.query('SELECT id FROM products WHERE id = $1', [id]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: `Product with SKU "${id}" already exists.` });
    }

    await db.query(
      'INSERT INTO products (id, name, variant, batch, stock, "costPerUnit", "sellingPrice") VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [id, name, variant, batch, stockNum, costNum, priceNum]
    );

    const product = {
      id, name, variant, batch,
      stock: stockNum,
      costPerUnit: costNum,
      sellingPrice: priceNum,
    };

    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
});

inventoryRouter.get('/low-stock', async (req, res, next) => {
  try {
    const db = getDb();
    const result = await db.query('SELECT * FROM products WHERE stock < $1 ORDER BY stock ASC', [LOW_STOCK_THRESHOLD]);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

inventoryRouter.get('/transactions', async (req, res, next) => {
  try {
    const db = getDb();
    const result = await db.query('SELECT * FROM transactions ORDER BY date DESC, id DESC');
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

inventoryRouter.post('/transaction', async (req, res, next) => {
  const { productId, type, quantity, note } = req.body;
  if (!productId || !type || !quantity) {
    return res.status(400).json({ error: 'productId, type (IN/OUT), and quantity are required.' });
  }
  if (!['IN', 'OUT'].includes(type)) {
    return res.status(400).json({ error: 'Type must be "IN" or "OUT".' });
  }
  const qty = parseInt(quantity, 10);
  if (isNaN(qty) || qty <= 0) {
    return res.status(400).json({ error: 'Quantity must be a positive number.' });
  }

  const db = getDb();
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    const productResult = await client.query('SELECT * FROM products WHERE id = $1 FOR UPDATE', [productId]);
    const product = productResult.rows[0];
    if (!product) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Product not found.' });
    }
    if (type === 'OUT' && product.stock < qty) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Insufficient stock. Available: ${product.stock}` });
    }

    const newStock = product.stock + (type === 'IN' ? qty : -qty);

    await client.query('UPDATE products SET stock = $1 WHERE id = $2', [newStock, productId]);

    const nextTxnId = await getNextId(client, 'transactions', 'TXN');
    const txnDate = new Date().toISOString().split('T')[0];
    const txn = {
      id: nextTxnId,
      productId,
      type,
      quantity: qty,
      date: txnDate,
      note: note || '',
    };

    await client.query(
      'INSERT INTO transactions (id, "productId", type, quantity, date, note) VALUES ($1, $2, $3, $4, $5, $6)',
      [txn.id, txn.productId, txn.type, txn.quantity, txn.date, txn.note]
    );

    await client.query('COMMIT');

    const updatedProduct = { ...product, stock: newStock };
    res.json({ transaction: txn, updatedProduct });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// 3. Expenses Router
const expenseRouter = express.Router();

expenseRouter.get('/', async (req, res, next) => {
  try {
    const db = getDb();
    const result = await db.query('SELECT * FROM expenses ORDER BY date DESC, id DESC');
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

expenseRouter.get('/categories', (_req, res) => {
  res.json(EXPENSE_CATEGORIES);
});

expenseRouter.get('/total', async (req, res, next) => {
  try {
    const db = getDb();
    const result = await db.query('SELECT COALESCE(SUM(amount), 0)::float as total FROM expenses');
    res.json({ total: result.rows[0].total });
  } catch (err) {
    next(err);
  }
});

expenseRouter.post('/', async (req, res, next) => {
  const { category, amount, date, description } = req.body;
  if (!category || !amount || !date) {
    return res.status(400).json({ error: 'Category, amount, and date are required.' });
  }
  if (!EXPENSE_CATEGORIES.includes(category)) {
    return res.status(400).json({ error: `Invalid category. Must be one of: ${EXPENSE_CATEGORIES.join(', ')}` });
  }

  const db = getDb();
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    const nextExpId = await getNextId(client, 'expenses', 'EXP');
    const expense = {
      id: nextExpId,
      category,
      amount: parseFloat(amount),
      date,
      description: description || '',
    };

    await client.query(
      'INSERT INTO expenses (id, category, amount, date, description) VALUES ($1, $2, $3, $4, $5)',
      [expense.id, expense.category, expense.amount, expense.date, expense.description]
    );

    await client.query('COMMIT');
    res.status(201).json(expense);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// 4. Sales Router
const salesRouter = express.Router();

salesRouter.get('/', async (req, res, next) => {
  try {
    const db = getDb();
    const result = await db.query(`
      SELECT s.*, p.name as "productName" 
      FROM sales s
      LEFT JOIN products p ON s."productId" = p.id
      ORDER BY s.date DESC, s.id DESC
    `);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

salesRouter.get('/total', async (req, res, next) => {
  try {
    const db = getDb();
    const result = await db.query('SELECT COALESCE(SUM(amount), 0)::float as total FROM sales');
    res.json({ total: result.rows[0].total });
  } catch (err) {
    next(err);
  }
});

salesRouter.post('/', async (req, res, next) => {
  const { productId, quantity, buyer, buyerType, date, amount } = req.body;
  if (!productId || !quantity || !buyer || !date || !amount) {
    return res.status(400).json({ error: 'productId, quantity, buyer, date, and amount are required.' });
  }
  const qty = parseInt(quantity, 10);
  if (isNaN(qty) || qty <= 0) {
    return res.status(400).json({ error: 'Quantity must be a positive number.' });
  }

  const db = getDb();
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    const productResult = await client.query('SELECT * FROM products WHERE id = $1 FOR UPDATE', [productId]);
    const product = productResult.rows[0];
    if (!product) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Product not found.' });
    }
    if (product.stock < qty) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Insufficient stock. Available: ${product.stock}` });
    }

    const nextSaleId = await getNextId(client, 'sales', 'SAL');
    const sale = {
      id: nextSaleId,
      productId,
      quantity: qty,
      buyer,
      buyerType: buyerType || 'Retailer',
      date,
      amount: parseFloat(amount),
    };

    await client.query(
      'INSERT INTO sales (id, "productId", quantity, buyer, "buyerType", date, amount) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [sale.id, sale.productId, sale.quantity, sale.buyer, sale.buyerType, sale.date, sale.amount]
    );

    const newStock = product.stock - qty;
    await client.query('UPDATE products SET stock = $1 WHERE id = $2', [newStock, productId]);

    const nextTxnId = await getNextId(client, 'transactions', 'TXN');
    await client.query(
      'INSERT INTO transactions (id, "productId", type, quantity, date, note) VALUES ($1, $2, $3, $4, $5, $6)',
      [nextTxnId, productId, 'OUT', qty, date, `Sale to ${buyer} (${nextSaleId})`]
    );

    await client.query('COMMIT');
    res.status(201).json({ ...sale, productName: product.name });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// 5. Reports Router
const reportRouter = express.Router();

reportRouter.get('/pnl', async (req, res, next) => {
  try {
    const db = getDb();
    const { startDate, endDate, label } = getCurrentMonthRange();

    const [salesResult, expensesResult, productsResult] = await Promise.all([
      db.query('SELECT * FROM sales WHERE date >= $1 AND date < $2', [startDate, endDate]),
      db.query('SELECT * FROM expenses WHERE date >= $1 AND date < $2', [startDate, endDate]),
      db.query('SELECT * FROM products'),
    ]);

    const sales = salesResult.rows;
    const expenses = expensesResult.rows;
    const products = productsResult.rows;

    const totalRevenue = sales.reduce((sum, s) => sum + parseFloat(s.amount), 0);
    const cogs = sales.reduce((sum, s) => {
      const product = products.find(p => p.id === s.productId);
      const costPerUnit = product ? parseFloat(product.costPerUnit) : 0;
      return sum + (s.quantity * costPerUnit);
    }, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const netProfit = totalRevenue - cogs - totalExpenses;
    const grossProfit = totalRevenue - cogs;

    const expenseBreakdown = {};
    expenses.forEach(e => {
      expenseBreakdown[e.category] = (expenseBreakdown[e.category] || 0) + parseFloat(e.amount);
    });

    const revenueByProduct = {};
    sales.forEach(s => {
      const product = products.find(p => p.id === s.productId);
      const name = product ? product.name : 'Unknown';
      revenueByProduct[name] = (revenueByProduct[name] || 0) + parseFloat(s.amount);
    });

    // Revenue by day
    const revenueByDay = {};
    sales.forEach(s => {
      revenueByDay[s.date] = (revenueByDay[s.date] || 0) + parseFloat(s.amount);
    });

    // Revenue by week (ISO week number)
    const revenueByWeek = {};
    sales.forEach(s => {
      const d = new Date(s.date);
      const startOfYear = new Date(d.getFullYear(), 0, 1);
      const weekNum = Math.ceil(((d - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
      const weekLabel = `Week ${weekNum}`;
      revenueByWeek[weekLabel] = (revenueByWeek[weekLabel] || 0) + parseFloat(s.amount);
    });

    res.json({
      period: label,
      revenue: totalRevenue,
      cogs,
      grossProfit,
      operatingExpenses: totalExpenses,
      netProfit,
      margin: totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0,
      expenseBreakdown,
      revenueByProduct,
      revenueByDay,
      revenueByWeek,
    });
  } catch (err) {
    next(err);
  }
});

reportRouter.get('/dashboard', async (req, res, next) => {
  try {
    const db = getDb();
    const { startDate, endDate } = getCurrentMonthRange();

    const [
      stockResult,
      productCountResult,
      lowStockResult,
      revenueResult,
      expensesResult
    ] = await Promise.all([
      db.query('SELECT COALESCE(SUM(stock), 0)::int as "totalStock" FROM products'),
      db.query('SELECT COUNT(*)::int as "totalProducts" FROM products'),
      db.query('SELECT COUNT(*)::int as "lowStockCount" FROM products WHERE stock < $1', [LOW_STOCK_THRESHOLD]),
      db.query('SELECT COALESCE(SUM(amount), 0)::float as "totalRevenue" FROM sales WHERE date >= $1 AND date < $2', [startDate, endDate]),
      db.query('SELECT COALESCE(SUM(amount), 0)::float as "totalExpenses" FROM expenses WHERE date >= $1 AND date < $2', [startDate, endDate]),
    ]);

    res.json({
      totalStock: stockResult.rows[0].totalStock,
      totalProducts: productCountResult.rows[0].totalProducts,
      lowStockCount: lowStockResult.rows[0].lowStockCount,
      revenueThisMonth: revenueResult.rows[0].totalRevenue,
      expensesThisMonth: expensesResult.rows[0].totalExpenses,
    });
  } catch (err) {
    next(err);
  }
});

// ── ENQUIRY ROUTER ──
const enquiryRouter = express.Router();

// Validate helper (mirrors the Zod schema — no zod dep needed in backend)
function validateEnquiry(body) {
  const { company, location, interest, email, message } = body;
  const errors = [];
  if (!company || typeof company !== 'string' || company.trim().length < 2)
    errors.push('Company name must be at least 2 characters.');
  if (company && company.trim().length > 100)
    errors.push('Company name too long (max 100).');
  if (!location || typeof location !== 'string' || location.trim().length < 2)
    errors.push('Location must be at least 2 characters.');
  if (location && location.trim().length > 100)
    errors.push('Location too long (max 100).');
  if (!interest || !['retail', 'wholesale'].includes(interest))
    errors.push('Interest must be either "retail" or "wholesale".');
  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
    errors.push('Enter a valid email address.');
  if (email && email.trim().length > 255)
    errors.push('Email too long (max 255).');
  if (!message || typeof message !== 'string' || message.trim().length < 10)
    errors.push('Message must be at least 10 characters.');
  if (message && message.trim().length > 1000)
    errors.push('Message too long (max 1000).');
  return errors;
}

// POST /api/enquiry — public, no auth required
enquiryRouter.post('/', async (req, res, next) => {
  const errors = validateEnquiry(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ error: errors[0], errors });
  }
  const { company, location, interest, email, message } = req.body;
  try {
    const db = getDb();
    const result = await db.query(
      `INSERT INTO enquiries (company, location, interest, email, message)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [company.trim(), location.trim(), interest, email.trim().toLowerCase(), message.trim()]
    );
    res.status(201).json({ success: true, enquiry: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// GET /api/enquiry — admin only, returns all enquiries newest first
enquiryRouter.get('/', authenticateToken, async (req, res, next) => {
  try {
    const db = getDb();
    const result = await db.query(
      `SELECT * FROM enquiries ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/enquiry/:id/status — update status
enquiryRouter.patch('/:id/status', authenticateToken, async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!['new', 'contacted', 'closed'].includes(status)) {
    return res.status(400).json({ error: 'Status must be one of: new, contacted, closed.' });
  }
  try {
    const db = getDb();
    const result = await db.query(
      `UPDATE enquiries SET status = $1 WHERE id = $2 RETURNING *`,
      [status, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Enquiry not found.' });
    }
    res.json({ success: true, enquiry: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// Bind Routers to App
app.use('/auth', authRouter);
app.use('/enquiry', enquiryRouter);
app.use('/inventory', authenticateToken, inventoryRouter);
app.use('/expenses', authenticateToken, expenseRouter);
app.use('/sales', authenticateToken, salesRouter);
app.use('/reports', authenticateToken, reportRouter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'GoliOps API', version: '1.0.0', database: 'PostgreSQL' });
});

export default app;

// ── CONDITIONAL LISTENER FOR LOCAL DEVELOPMENT ──
const PORT = process.env.PORT || 3001;
if (process.env.VERCEL !== '1') {
  initDb()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`\n  🧊 GoliOps API Server with PostgreSQL`);
        console.log(`  ────────────────────────────────────`);
        console.log(`  ➜  Running on http://localhost:${PORT}`);
        console.log(`  ➜  Health: http://localhost:${PORT}/health\n`);
      });
    })
    .catch((err) => {
      console.error('Failed to initialize database:', err);
      process.exit(1);
    });
}

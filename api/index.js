import app, { initDb } from '../backend/index.js';

export default async function handler(req, res) {
  try {
    // Ensure the PostgreSQL database is initialized
    await initDb();
  } catch (err) {
    console.error('Database initialization failed:', err);
    res.status(500).json({ error: 'Database initialization failed', details: err.message });
    return;
  }

  // Forward the request and response to the Express app
  return app(req, res);
}

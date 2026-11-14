// server/index.js — Express app: serves API + built frontend
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { pool, seedDatabase } from './db.js';
import routes from './routes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: [process.env.CORS_ORIGIN || 'http://localhost:5173', 'http://localhost:3001'], credentials: true }));
app.use(express.json({ limit: '1mb' }));

// Readiness checks the database; no configuration or secrets in the response.
app.get('/healthz', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'UP' });
  } catch {
    res.status(503).json({ status: 'DOWN' });
  }
});

// API routes
app.use('/api', routes);
app.use('/api', (_req, res) => res.status(404).json({ error: 'Route inconnue' }));

// Serve built frontend in production
app.use(express.static(join(__dirname, '..', 'dist')));
app.get('/{*path}', (_req, res) => {
  res.sendFile(join(__dirname, '..', 'dist', 'index.html'));
});

// Start
async function start() {
  try {
    // Test MySQL connection
    const conn = await pool.getConnection();
    console.log('✅ Connected to MySQL');
    conn.release();

    // Seed demo data if needed
    await seedDatabase();

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`   API:   http://localhost:${PORT}/api`);
      console.log(`   Front: http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:');
    console.error('   ', err.message);
    console.error('\n   Make sure MySQL is running and cabinet_medical database exists.');
    console.error('   Run: mysql -u root -p < database/schema.sql\n');
    process.exit(1);
  }
}

start();

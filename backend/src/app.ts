import express from 'express';
import cors from 'cors';
import apiRoutes from './routes/api';
import pool, { ensureDomainSchema } from './database';

const app = express();
const PORT = process.env.PORT || 3001;

function normalizeOrigin(origin: string) {
  try {
    return new URL(origin).origin;
  } catch {
    return origin.replace(/\/$/, '');
  }
}

async function isAllowedOrigin(origin?: string) {
  if (!origin) return true;

  const normalizedOrigin = normalizeOrigin(origin);
  const staticOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    process.env.FRONTEND_PRIMARY_ORIGIN,
    process.env.FRONTEND_PRIMARY_HOST ? `https://${process.env.FRONTEND_PRIMARY_HOST}` : null,
  ].filter(Boolean);

  if (staticOrigins.includes(normalizedOrigin)) return true;

  const host = new URL(normalizedOrigin).host.replace(/^www\./, '');
  const result = await pool.query(
    "SELECT id FROM domains WHERE LOWER(host) = LOWER($1) OR LOWER(host) = LOWER($2) LIMIT 1",
    [host, `www.${host}`]
  );

  return result.rows.length > 0;
}

// Middleware
app.use(cors({
  origin: async (origin, callback) => {
    try {
      callback(null, await isAllowedOrigin(origin));
    } catch (error) {
      callback(error as Error);
    }
  },
}));
app.use(express.json());

// Routes
app.use('/api', apiRoutes);

// Root endpoint for testing
app.get('/', (req, res) => {
  res.send('Multi-Domain Blog API is running');
});

ensureDomainSchema()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to prepare database schema', error);
    process.exit(1);
  });

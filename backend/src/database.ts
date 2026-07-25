import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const isRemoteDb = process.env.DATABASE_URL?.includes('neon.tech') || process.env.DATABASE_URL?.includes('sslmode=require');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ...(isRemoteDb && { ssl: { rejectUnauthorized: false } }),
});

export interface Domain {
  id: number;
  name: string;
  url: string;
  host: string;
  status: 'draft' | 'pending_dns' | 'verifying' | 'active' | 'failed' | 'disabled';
  dns_verified_at: string | null;
  ssl_ready_at: string | null;
  provider_domain_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Region {
  id: number;
  domain_id: number;
  name: string;
  slug: string;
}

export interface Post {
  id: number;
  domain_id: number;
  region_id: number | null;
  title: string;
  content: string;
  created_at: string;
}

export async function ensureDomainSchema() {
  await pool.query(`
    ALTER TABLE domains ADD COLUMN IF NOT EXISTS host VARCHAR(255);
    ALTER TABLE domains ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'pending_dns';
    ALTER TABLE domains ADD COLUMN IF NOT EXISTS dns_verified_at TIMESTAMP NULL;
    ALTER TABLE domains ADD COLUMN IF NOT EXISTS ssl_ready_at TIMESTAMP NULL;
    ALTER TABLE domains ADD COLUMN IF NOT EXISTS provider_domain_id VARCHAR(255) NULL;
    ALTER TABLE domains ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE domains ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

    UPDATE domains
    SET host = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(url, '^https?://', ''), '/.*$', ''))
    WHERE host IS NULL;

    CREATE UNIQUE INDEX IF NOT EXISTS domains_host_unique ON domains (LOWER(host));
  `);
}

export default pool;

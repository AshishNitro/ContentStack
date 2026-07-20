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

export default pool;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureDomainSchema = ensureDomainSchema;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../.env') });
const isRemoteDb = process.env.DATABASE_URL?.includes('neon.tech') || process.env.DATABASE_URL?.includes('sslmode=require');
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    ...(isRemoteDb && { ssl: { rejectUnauthorized: false } }),
});
async function ensureDomainSchema() {
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
exports.default = pool;

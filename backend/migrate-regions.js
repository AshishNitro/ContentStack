// migrate-regions.js
const { Pool } = require("pg");
require("dotenv").config({ path: require("path").resolve(__dirname, ".env") });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("UPDATE regions SET name = 'United States', slug = 'us' WHERE id = 1");
    await client.query("UPDATE regions SET name = 'India', slug = 'in' WHERE id = 2");
    await client.query("UPDATE regions SET name = 'Europe', slug = 'eu' WHERE id = 3");
    const insertSql = "INSERT INTO regions (id, domain_id, name, slug) VALUES (4, 2, 'United States', 'us'), (5, 2, 'India', 'in'), (6, 2, 'Europe', 'eu') ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug";
    await client.query(insertSql);
    await client.query("SELECT setval('regions_id_seq', (SELECT MAX(id) FROM regions))");
    await client.query("COMMIT");
    console.log("Migration committed.");
    const result = await client.query("SELECT * FROM regions ORDER BY id");
    console.log(JSON.stringify(result.rows, null, 2));
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}
migrate();

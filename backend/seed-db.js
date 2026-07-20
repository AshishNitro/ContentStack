const { Pool } = require("pg");
require("dotenv").config({ path: require("path").resolve(__dirname, ".env") });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function seed() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("INSERT INTO domains (id, name, url) VALUES (1, $1, $2), (2, $3, $4) ON CONFLICT (id) DO NOTHING", ["Tech Blog (Domain A)", "https://techblog.example.com", "Lifestyle (Domain B)", "https://lifestyle.example.com"]);
    await client.query("INSERT INTO regions (id, domain_id, name, slug) VALUES (1,1,$1,$2),(2,1,$3,$4),(3,1,$5,$6),(4,2,$1,$2),(5,2,$3,$4),(6,2,$5,$6) ON CONFLICT (id) DO NOTHING", ["United States","us","India","in","Europe","eu"]);
    await client.query("INSERT INTO posts (id, domain_id, region_id, title, content) VALUES (1,1,1,$1,$2) ON CONFLICT (id) DO NOTHING", ["Hello World: Our First Post","# Welcome\n\nThis is our first post written in **Markdown**."]);
    await client.query("SELECT setval('domains_id_seq',(SELECT MAX(id) FROM domains))");
    await client.query("SELECT setval('regions_id_seq',(SELECT MAX(id) FROM regions))");
    await client.query("SELECT setval('posts_id_seq',(SELECT MAX(id) FROM posts))");
    await client.query("COMMIT");
    const d = await client.query("SELECT id, name FROM domains ORDER BY id");
    const r = await client.query("SELECT id, domain_id, name, slug FROM regions ORDER BY id");
    console.log("Domains:", JSON.stringify(d.rows));
    console.log("Regions:", JSON.stringify(r.rows));
    console.log("Seed complete.");
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("Error:", e.message);
  } finally {
    client.release();
    await pool.end();
  }
}
seed();

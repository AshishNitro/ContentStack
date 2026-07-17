import fs from 'fs';
import path from 'path';

const dbPath = path.resolve(__dirname, '../db.json');

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

export interface DatabaseSchema {
  domains: Domain[];
  regions: Region[];
  posts: Post[];
}

const defaultData: DatabaseSchema = {
  domains: [
    { id: 1, name: 'Tech Blog (Domain A)', url: 'https://techblog.example.com' },
    { id: 2, name: 'Lifestyle (Domain B)', url: 'https://lifestyle.example.com' }
  ],
  regions: [
    { id: 1, domain_id: 1, name: 'Software Engineering', slug: 'software-engineering' },
    { id: 2, domain_id: 1, name: 'Hardware', slug: 'hardware' },
    { id: 3, domain_id: 2, name: 'Travel', slug: 'travel' }
  ],
  posts: [
    {
      id: 1,
      domain_id: 1,
      region_id: 1,
      title: 'Hello World: Our First Post',
      content: '# Welcome\\n\\nThis is our first post written in **Markdown**.\\n\\nEnjoy the multi-domain blog manager!',
      created_at: new Date().toISOString()
    }
  ]
};

// Load database from JSON file or use default data
let db: DatabaseSchema = defaultData;

if (fs.existsSync(dbPath)) {
  try {
    const rawData = fs.readFileSync(dbPath, 'utf-8');
    db = JSON.parse(rawData);
  } catch (err) {
    console.error('Error reading db.json, using defaults.');
    db = defaultData;
  }
} else {
  // Save default data to file
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8');
  console.log('Seeded database at db.json');
}

export const saveDb = () => {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8');
};

export default db;

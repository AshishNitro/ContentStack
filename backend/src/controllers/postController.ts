import { Request, Response } from 'express';
import pool, { Post, Domain, Region } from '../database';

export const getPost = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query<Post>('SELECT * FROM posts WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Failed to fetch post', error);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
};

// Types for requests
interface CreatePostRequest {
  domainId: number;
  regionId?: number;
  title: string;
  content: string;
}

export const getDomains = async (req: Request, res: Response) => {
  try {
    const domainsResult = await pool.query<Domain>('SELECT * FROM domains ORDER BY id');
    const regionsResult = await pool.query<Region>('SELECT * FROM regions ORDER BY id');
    
    const domainsWithRegions = domainsResult.rows.map(domain => ({
      ...domain,
      regions: regionsResult.rows.filter(r => r.domain_id === domain.id)
    }));

    res.json(domainsWithRegions);
  } catch (error) {
    console.error('Failed to fetch domains', error);
    res.status(500).json({ error: 'Failed to fetch domains' });
  }
};

export const getPosts = async (req: Request, res: Response) => {
  try {
    const domainId = req.query.domainId ? Number(req.query.domainId) : null;
    
    let query = 'SELECT * FROM posts';
    const values: any[] = [];

    if (domainId) {
      query += ' WHERE domain_id = $1';
      values.push(domainId);
    }
    
    query += ' ORDER BY created_at DESC';

    const result = await pool.query<Post>(query, values);
    res.json(result.rows);
  } catch (error) {
    console.error('Failed to fetch posts', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
};

export const createPost = async (req: Request<{}, {}, CreatePostRequest>, res: Response) => {
  try {
    const { domainId, regionId, title, content } = req.body;

    if (!domainId || !title || !content) {
      return res.status(400).json({ error: 'domainId, title, and content are required fields.' });
    }

    const query = `
      INSERT INTO posts (domain_id, region_id, title, content)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const values = [domainId, regionId || null, title, content];

    const result = await pool.query<Post>(query, values);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Failed to create post', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
};

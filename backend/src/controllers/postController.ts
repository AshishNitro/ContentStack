import { Request, Response } from 'express';
import db, { saveDb, Post } from '../database';

// Types for requests
interface CreatePostRequest {
  domainId: number;
  regionId?: number;
  title: string;
  content: string;
}

export const getDomains = (req: Request, res: Response) => {
  try {
    const domainsWithRegions = db.domains.map(domain => ({
      ...domain,
      regions: db.regions.filter(r => r.domain_id === domain.id)
    }));

    res.json(domainsWithRegions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch domains' });
  }
};

export const getPosts = (req: Request, res: Response) => {
  try {
    const domainId = req.query.domainId ? Number(req.query.domainId) : null;
    
    let posts = db.posts;
    if (domainId) {
      posts = posts.filter(p => p.domain_id === domainId);
    }
    
    // Sort by created_at DESC
    posts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
};

export const createPost = (req: Request<{}, {}, CreatePostRequest>, res: Response) => {
  try {
    const { domainId, regionId, title, content } = req.body;

    if (!domainId || !title || !content) {
      return res.status(400).json({ error: 'domainId, title, and content are required fields.' });
    }

    const newId = db.posts.length > 0 ? Math.max(...db.posts.map(p => p.id)) + 1 : 1;

    const newPost: Post = {
      id: newId,
      domain_id: domainId,
      region_id: regionId || null,
      title,
      content,
      created_at: new Date().toISOString()
    };

    db.posts.push(newPost);
    saveDb();
    
    res.status(201).json(newPost);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create post' });
  }
};

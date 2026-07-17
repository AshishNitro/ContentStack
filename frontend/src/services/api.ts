// api.ts
const API_BASE = 'http://localhost:3001/api';

export interface Domain {
  id: number;
  name: string;
  url: string;
  regions: Region[];
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

export async function fetchDomains(): Promise<Domain[]> {
  const res = await fetch(`${API_BASE}/domains`);
  if (!res.ok) throw new Error('Failed to fetch domains');
  return res.json();
}

export async function fetchPosts(domainId?: number): Promise<Post[]> {
  const url = domainId ? `${API_BASE}/posts?domainId=${domainId}` : `${API_BASE}/posts`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch posts');
  return res.json();
}

export async function createPost(payload: { domainId: number; regionId?: number; title: string; content: string }): Promise<Post> {
  const res = await fetch(`${API_BASE}/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to create post');
  return res.json();
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface DnsRecord {
  type: string;
  name: string;
  value: string;
  purpose: string;
}

export interface Domain {
  id: number;
  name: string;
  url: string;
  host: string;
  status: 'draft' | 'pending_dns' | 'verifying' | 'active' | 'failed' | 'disabled';
  dns_verified_at: string | null;
  ssl_ready_at: string | null;
  provider_domain_id: string | null;
  dnsRecords?: DnsRecord[];
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

export async function fetchPost(postId: number, domainId: number): Promise<Post> {
  const res = await fetch(`${API_BASE}/posts/${postId}?domainId=${domainId}`);
  if (!res.ok) throw new Error('Failed to fetch post');
  return res.json();
}

export async function createDomain(payload: { name: string; host: string }): Promise<Domain> {
  const res = await fetch(`${API_BASE}/domains`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to create domain');
  }

  return res.json();
}

export async function deleteDomain(domainId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/domains/${domainId}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    throw new Error('Failed to delete domain');
  }
}

export async function verifyDomain(domainId: number): Promise<Domain> {
  const res = await fetch(`${API_BASE}/domains/${domainId}/verify`, {
    method: 'POST',
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to verify domain');
  }

  return res.json();
}

export async function createPost(payload: {
  domainId: number;
  regionId?: number;
  title: string;
  content: string;
}): Promise<Post> {
  const res = await fetch(`${API_BASE}/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to create post');
  }

  return res.json();
}

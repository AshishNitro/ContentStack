import { Request, Response } from 'express';
import pool, { Post, Domain, Region } from '../database';
import dns from 'dns/promises';

const DEFAULT_REGIONS = [
  { name: 'United States', slug: 'us' },
  { name: 'India', slug: 'in' },
  { name: 'Europe', slug: 'eu' },
];

interface CreateDomainRequest {
  name: string;
  host: string;
  regions?: Array<{ name: string; slug: string }>;
}

interface UpdateDomainRequest {
  name?: string;
  status?: Domain['status'];
}

function normalizeHost(input: string): string {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return '';

  const withProtocol = /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withProtocol).host.replace(/^www\./, '');
  } catch {
    return trimmed.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
  }
}

function buildPublicUrl(host: string): string {
  return host.includes('localhost') ? `http://${host}` : `https://${host}`;
}

function getDnsRecords(host: string) {
  return [
    { type: 'A', name: '@', value: '76.76.21.21', purpose: 'Point the root domain to Vercel' },
    { type: 'CNAME', name: 'www', value: 'cname.vercel-dns.com', purpose: 'Point www traffic to Vercel' },
  ];
}

async function registerDomainWithVercel(host: string): Promise<string | null> {
  const token = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!token || !projectId) return null;

  const url = new URL(`https://api.vercel.com/v10/projects/${projectId}/domains`);
  if (teamId) url.searchParams.set('teamId', teamId);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: host }),
  });

  if (!response.ok && response.status !== 409) {
    const message = await response.text();
    throw new Error(`Vercel domain registration failed: ${message}`);
  }

  return host;
}

async function checkDns(host: string): Promise<boolean> {
  if (host.includes('localhost')) return true;

  const [rootRecords, wwwRecords] = await Promise.allSettled([
    dns.resolve4(host),
    dns.resolveCname(`www.${host}`),
  ]);

  const rootOk = rootRecords.status === 'fulfilled' && rootRecords.value.includes('76.76.21.21');
  const wwwOk = wwwRecords.status === 'fulfilled' && wwwRecords.value.some(record => record.includes('vercel-dns.com'));

  return rootOk || wwwOk;
}

async function getDomainsWithRegions() {
  const domainsResult = await pool.query<Domain>('SELECT * FROM domains ORDER BY id');
  const regionsResult = await pool.query<Region>('SELECT * FROM regions ORDER BY id');

  return domainsResult.rows.map(domain => ({
    ...domain,
    regions: regionsResult.rows.filter(r => r.domain_id === domain.id),
    dnsRecords: getDnsRecords(domain.host),
  }));
}

export const getPost = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const domainId = req.query.domainId ? Number(req.query.domainId) : null;

    if (!domainId) {
      return res.status(400).json({ error: 'domainId is required.' });
    }

    const result = await pool.query<Post>('SELECT * FROM posts WHERE id = $1 AND domain_id = $2', [id, domainId]);
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
    res.json(await getDomainsWithRegions());
  } catch (error) {
    console.error('Failed to fetch domains', error);
    res.status(500).json({ error: 'Failed to fetch domains' });
  }
};

export const createDomain = async (req: Request<{}, {}, CreateDomainRequest>, res: Response) => {
  const client = await pool.connect();

  try {
    const { name, host, regions } = req.body;
    const normalizedHost = normalizeHost(host);

    if (!name?.trim() || !normalizedHost) {
      return res.status(400).json({ error: 'name and host are required.' });
    }

    await client.query('BEGIN');

    const providerDomainId = await registerDomainWithVercel(normalizedHost);
    const initialStatus = normalizedHost.includes('localhost') ? 'active' : 'pending_dns';

    const domainResult = await client.query<Domain>(
      `INSERT INTO domains (name, url, host, status, provider_domain_id, dns_verified_at, ssl_ready_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        name.trim(),
        buildPublicUrl(normalizedHost),
        normalizedHost,
        initialStatus,
        providerDomainId,
        initialStatus === 'active' ? new Date() : null,
        initialStatus === 'active' ? new Date() : null,
      ]
    );

    const domain = domainResult.rows[0];
    const selectedRegions = (regions?.length ? regions : DEFAULT_REGIONS)
      .map(region => ({ name: region.name.trim(), slug: region.slug.trim().toLowerCase() }))
      .filter(region => region.name && region.slug);

    for (const region of selectedRegions) {
      await client.query(
        'INSERT INTO regions (domain_id, name, slug) VALUES ($1, $2, $3)',
        [domain.id, region.name, region.slug]
      );
    }

    await client.query('COMMIT');

    const domains = await getDomainsWithRegions();
    res.status(201).json(domains.find(item => item.id === domain.id));
  } catch (error: any) {
    await client.query('ROLLBACK');

    if (error?.code === '23505') {
      return res.status(409).json({ error: 'This domain already exists.' });
    }

    console.error('Failed to create domain', error);
    res.status(500).json({ error: error.message || 'Failed to create domain' });
  } finally {
    client.release();
  }
};

export const updateDomain = async (req: Request<{ id: string }, {}, UpdateDomainRequest>, res: Response) => {
  try {
    const { id } = req.params;
    const { name, status } = req.body;

    const result = await pool.query<Domain>(
      `UPDATE domains
       SET name = COALESCE($1, name),
           status = COALESCE($2, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [name?.trim() || null, status || null, id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Domain not found.' });
    }

    const domains = await getDomainsWithRegions();
    res.json(domains.find(item => item.id === Number(id)));
  } catch (error) {
    console.error('Failed to update domain', error);
    res.status(500).json({ error: 'Failed to update domain' });
  }
};

export const deleteDomain = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM domains WHERE id = $1 RETURNING id', [id]);

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Domain not found.' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete domain', error);
    res.status(500).json({ error: 'Failed to delete domain' });
  }
};

export const resolveDomainByHost = async (req: Request, res: Response) => {
  try {
    const host = normalizeHost(String(req.query.host || ''));

    if (!host) {
      return res.status(400).json({ error: 'host is required.' });
    }

    const result = await pool.query<Domain>(
      `SELECT *
       FROM domains
       WHERE LOWER(host) = LOWER($1)
         AND status = 'active'
       LIMIT 1`,
      [host]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Domain not found.' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Failed to resolve domain', error);
    res.status(500).json({ error: 'Failed to resolve domain' });
  }
};

export const verifyDomain = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const domainResult = await pool.query<Domain>('SELECT * FROM domains WHERE id = $1', [id]);

    if (!domainResult.rows.length) {
      return res.status(404).json({ error: 'Domain not found.' });
    }

    const domain = domainResult.rows[0];
    await pool.query('UPDATE domains SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', ['verifying', id]);

    const dnsOk = await checkDns(domain.host);
    const nextStatus = dnsOk ? 'active' : 'pending_dns';
    const now = dnsOk ? new Date() : null;

    await pool.query(
      `UPDATE domains
       SET status = $1,
           dns_verified_at = COALESCE($2, dns_verified_at),
           ssl_ready_at = COALESCE($2, ssl_ready_at),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [nextStatus, now, id]
    );

    const domains = await getDomainsWithRegions();
    res.json(domains.find(item => item.id === Number(id)));
  } catch (error) {
    console.error('Failed to verify domain', error);
    res.status(500).json({ error: 'Failed to verify domain' });
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

    if (regionId) {
      const regionResult = await pool.query(
        'SELECT id FROM regions WHERE id = $1 AND domain_id = $2',
        [regionId, domainId]
      );

      if (!regionResult.rows.length) {
        return res.status(400).json({ error: 'Selected region does not belong to this domain.' });
      }
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

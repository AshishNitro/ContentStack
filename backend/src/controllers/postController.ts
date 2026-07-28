import { Request, Response } from 'express';
import pool, { Post, Domain, Region } from '../database';
import dns from 'dns/promises';

// ── Slug generation ───────────────────────────────────────────────────────────
function generateSlug(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')   // remove non-alphanumeric except spaces and hyphens
    .replace(/\s+/g, '-')             // spaces → hyphens
    .replace(/-+/g, '-')              // collapse consecutive hyphens
    .replace(/^-+|-+$/g, '')          // strip leading/trailing hyphens
    || 'post';                         // fallback
}

// ── Vercel integration types ───────────────────────────────────────────────────
type VercelRegStatus = 'added' | 'already_exists' | 'credentials_missing' | 'failed';

interface VercelRegResult {
  status: VercelRegStatus;
  error?: string;
}

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

async function registerDomainWithVercel(host: string): Promise<VercelRegResult> {
  const token = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!token || !projectId) {
    console.warn('[Vercel] VERCEL_API_TOKEN or VERCEL_PROJECT_ID is not set. Skipping auto-registration.');
    return { status: 'credentials_missing' };
  }

  const domainsToRegister = [host, `www.${host}`];
  let lastStatus: VercelRegStatus = 'added';

  for (const domain of domainsToRegister) {
    const url = new URL(`https://api.vercel.com/v10/projects/${projectId}/domains`);
    if (teamId) url.searchParams.set('teamId', teamId);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: domain }),
      });

      if (response.status === 409) {
        lastStatus = 'already_exists';
        console.log(`[Vercel] Domain already registered: ${domain}`);
        continue;
      }

      if (!response.ok) {
        const message = await response.text();
        console.error(`[Vercel] Failed to register ${domain}: ${message}`);
        return { status: 'failed', error: `Vercel rejected domain ${domain}: ${message}` };
      }

      console.log(`[Vercel] Successfully registered: ${domain}`);
    } catch (err: any) {
      console.error(`[Vercel] Network error registering ${domain}:`, err);
      return { status: 'failed', error: err.message };
    }
  }

  return { status: lastStatus };
}

async function unregisterDomainFromVercel(host: string): Promise<void> {
  const token = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!token || !projectId) {
    console.warn('[Vercel] Credentials missing — skipping Vercel domain removal.');
    return;
  }

  const domainsToRemove = [host, `www.${host}`];

  for (const domain of domainsToRemove) {
    const url = new URL(`https://api.vercel.com/v9/projects/${projectId}/domains/${domain}`);
    if (teamId) url.searchParams.set('teamId', teamId);

    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok || response.status === 404) {
        console.log(`[Vercel] Removed domain: ${domain}`);
      } else {
        const message = await response.text();
        console.error(`[Vercel] Failed to remove ${domain}: ${message}`);
      }
    } catch (err: any) {
      console.error(`[Vercel] Network error removing ${domain}:`, err);
    }
  }
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

export const getPostBySlug = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const domainId = req.query.domainId ? Number(req.query.domainId) : null;

    if (!domainId) {
      return res.status(400).json({ error: 'domainId is required.' });
    }

    const result = await pool.query<Post>(
      'SELECT * FROM posts WHERE slug = $1 AND domain_id = $2',
      [slug, domainId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Failed to fetch post by slug', error);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
};

// Types for requests
interface CreatePostRequest {
  domainId: number;
  regionId?: number;
  title: string;
  content: string;
  slug?: string;
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

    // Register with Vercel — never throws, always returns a status object
    const vercelResult = normalizedHost.includes('localhost')
      ? { status: 'added' as VercelRegStatus }
      : await registerDomainWithVercel(normalizedHost);

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
        vercelResult.status === 'added' || vercelResult.status === 'already_exists' ? normalizedHost : null,
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
    const created = domains.find(item => item.id === domain.id);

    res.status(201).json({
      ...created,
      vercel_status: vercelResult.status,
      vercel_error: vercelResult.error ?? null,
    });
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

    // Fetch host before deleting so we can remove it from Vercel
    const domainResult = await pool.query<Domain>('SELECT * FROM domains WHERE id = $1', [id]);
    if (!domainResult.rows.length) {
      return res.status(404).json({ error: 'Domain not found.' });
    }

    const { host } = domainResult.rows[0];

    await pool.query('DELETE FROM domains WHERE id = $1', [id]);

    // Fire-and-forget Vercel cleanup (don't block response on this)
    unregisterDomainFromVercel(host).catch(err =>
      console.error('[Vercel] Cleanup failed silently:', err)
    );

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

async function verifyDomainWithVercel(host: string): Promise<boolean> {
  const token = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!token || !projectId) return false;

  const url = new URL(`https://api.vercel.com/v9/projects/${projectId}/domains/${host}/verify`);
  if (teamId) url.searchParams.set('teamId', teamId);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json() as any;
    const verified = data?.verified === true;
    console.log(`[Vercel] Verify ${host}: verified=${verified}`);
    return verified;
  } catch (err) {
    console.error('[Vercel] Verification API error:', err);
    return false;
  }
}

export const verifyDomain = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const domainResult = await pool.query<Domain>('SELECT * FROM domains WHERE id = $1', [id]);

    if (!domainResult.rows.length) {
      return res.status(404).json({ error: 'Domain not found.' });
    }

    const domain = domainResult.rows[0];
    await pool.query('UPDATE domains SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', ['verifying', id]);

    // Run DNS check and Vercel API verify in parallel
    const [dnsOk, vercelVerified] = await Promise.all([
      checkDns(domain.host),
      verifyDomainWithVercel(domain.host),
    ]);

    const isVerified = dnsOk || vercelVerified;
    const nextStatus = isVerified ? 'active' : 'pending_dns';
    const now = isVerified ? new Date() : null;

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
    const regionIdParam = req.query.regionId ? Number(req.query.regionId) : null;
    const regionSlug = req.query.region ? String(req.query.region).toLowerCase().trim() : null;
    const scope = req.query.scope ? String(req.query.scope).toLowerCase().trim() : null;

    let query = 'SELECT p.* FROM posts p';
    const conditions: string[] = [];
    const values: any[] = [];

    if (domainId) {
      values.push(domainId);
      conditions.push(`p.domain_id = $${values.length}`);
    }

    let targetRegionId: number | null = regionIdParam;

    if (!targetRegionId && regionSlug && domainId) {
      const regionRes = await pool.query<{ id: number }>(
        'SELECT id FROM regions WHERE domain_id = $1 AND LOWER(slug) = $2 LIMIT 1',
        [domainId, regionSlug]
      );
      if (regionRes.rows.length > 0) {
        targetRegionId = regionRes.rows[0].id;
      }
    }

    if (scope === 'global_only') {
      conditions.push('p.region_id IS NULL');
    } else if (scope === 'region_only') {
      if (targetRegionId) {
        values.push(targetRegionId);
        conditions.push(`p.region_id = $${values.length}`);
      } else if (regionSlug) {
        conditions.push('1 = 0');
      }
    } else if (targetRegionId) {
      values.push(targetRegionId);
      conditions.push(`p.region_id = $${values.length}`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY p.created_at DESC';

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

    // Generate a URL-safe slug from the title
    const baseSlug = generateSlug(title);

    // Ensure slug uniqueness within the domain by appending a suffix if needed
    let slug = baseSlug;
    let attempt = 0;
    while (true) {
      const existing = await pool.query(
        'SELECT id FROM posts WHERE domain_id = $1 AND slug = $2',
        [domainId, slug]
      );
      if (existing.rows.length === 0) break;
      attempt++;
      slug = `${baseSlug}-${attempt}`;
    }

    const query = `
      INSERT INTO posts (domain_id, region_id, title, slug, content)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [domainId, regionId || null, title, slug, content];

    const result = await pool.query<Post>(query, values);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Failed to create post', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
};

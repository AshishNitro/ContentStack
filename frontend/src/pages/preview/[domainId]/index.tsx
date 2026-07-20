import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { Domain, Post, fetchDomains, fetchPosts } from '../../../services/api';
import styles from '../../../styles/Preview.module.css';

// Country metadata: slug → flag + display label
const COUNTRY_META: Record<string, { flag: string; label: string }> = {
  us: { flag: '🇺🇸', label: 'United States' },
  in: { flag: '🇮🇳', label: 'India' },
  eu: { flag: '🇪🇺', label: 'Europe' },
  uk: { flag: '🇬🇧', label: 'United Kingdom' },
  au: { flag: '🇦🇺', label: 'Australia' },
  ca: { flag: '🇨🇦', label: 'Canada' },
  de: { flag: '🇩🇪', label: 'Germany' },
  fr: { flag: '🇫🇷', label: 'France' },
  jp: { flag: '🇯🇵', label: 'Japan' },
  br: { flag: '🇧🇷', label: 'Brazil' },
};

function getCountryMeta(slug: string) {
  return COUNTRY_META[slug] ?? { flag: '🌐', label: slug.toUpperCase() };
}

export default function Preview() {
  const router = useRouter();
  const { domainId } = router.query;

  const [domain, setDomain] = useState<Domain | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  // Current locale (country slug) — null means Global
  const currentLocale =
    router.locale && router.locale !== 'default' ? router.locale : null;

  useEffect(() => {
    if (!domainId) return;

    const loadData = async () => {
      try {
        setLoading(true);
        const domains = await fetchDomains();
        const found = domains.find(d => d.id === Number(domainId));
        if (found) {
          setDomain(found);
          const domainPosts = await fetchPosts(found.id);

          let currentRegionId: number | null = null;
          if (currentLocale) {
            const r = found.regions.find(reg => reg.slug === currentLocale);
            if (r) {
              currentRegionId = r.id;
            }
          }

          const filteredPosts = domainPosts.filter(p =>
            currentRegionId !== null
              ? p.region_id === currentRegionId || p.region_id === null
              : true
          );

          setPosts(filteredPosts);
        }
      } catch (err) {
        console.error('Failed to load preview data', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [domainId, currentLocale]);

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <Head><title>Loading Preview...</title></Head>
        <div className={styles.spinner} />
        <span className={styles.loadingText}>Loading preview…</span>
      </div>
    );
  }

  if (!domain) {
    return (
      <div className={styles.loadingState}>
        <Head><title>Not Found</title></Head>
        <span className={styles.loadingText}>Domain not found.</span>
        <Link href="/" className={styles.backButton}>← Return to Manager</Link>
      </div>
    );
  }

  // Build the URL that represents the current view
  const activeCountryUrl = currentLocale
    ? `${domain.url.replace(/\/$/, '')}/${currentLocale}`
    : domain.url;

  const activeCountryMeta = currentLocale ? getCountryMeta(currentLocale) : null;

  return (
    <div className={styles.container}>
      <Head>
        <title>{domain.name}{currentLocale ? ` · /${currentLocale}` : ''} — Preview</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </Head>

      {/* ── Sticky Navbar ── */}
      <nav className={styles.navbar}>
        <div className={styles.navLeft}>
          <Link href="/" className={styles.backButton}>
            ← Manager
          </Link>
          <div className={styles.navDivider} />
          <span className={styles.navDomainName}>{domain.name}</span>

          <div className={styles.regionSwitcher}>
            <Link
              href={`/preview/${domain.id}`}
              locale="default"
              className={(!currentLocale) ? styles.activeRegion : styles.regionLink}
            >
              🌐 Global
            </Link>
            {domain.regions.map(r => {
              const meta = getCountryMeta(r.slug);
              return (
                <Link
                  key={r.id}
                  href={`/preview/${domain.id}`}
                  locale={r.slug}
                  className={currentLocale === r.slug ? styles.activeRegion : styles.regionLink}
                  title={`View as ${meta.label} · ${domain.url.replace(/\/$/, '')}/${r.slug}`}
                >
                  {meta.flag} {r.slug.toUpperCase()}
                </Link>
              );
            })}
          </div>
        </div>
        <div className={styles.previewBadge}>
          <span className={styles.previewBadgeDot} />
          Preview
        </div>
      </nav>

      {/* ── Page Body ── */}
      <div className={styles.body}>

        {/* Header */}
        <header className={styles.header}>
          <p className={styles.domainLabel}>Domain Preview</p>
          <h1 className={styles.domainName}>
            {domain.name}
            {activeCountryMeta && (
              <span className={styles.countryBadge}>{activeCountryMeta.flag} {activeCountryMeta.label}</span>
            )}
          </h1>
          <div className={styles.domainUrl}>{activeCountryUrl}</div>
          <div className={styles.headerStats}>
            <span className={styles.statChip}>
              📄 {posts.length} {posts.length === 1 ? 'post' : 'posts'}
            </span>
            {domain.regions && domain.regions.length > 0 && (
              <span className={styles.statChip}>
                🌍 {domain.regions.length} {domain.regions.length === 1 ? 'region' : 'regions'}
              </span>
            )}
            {currentLocale && (
              <span className={styles.statChipCountry}>
                {activeCountryMeta?.flag} Viewing as <strong>/{currentLocale}</strong>
              </span>
            )}
          </div>
        </header>

        {/* Posts */}
        <main className={styles.postsContainer}>
          {posts.length === 0 ? (
            <div className={styles.noPosts}>
              <div className={styles.noPostsIcon}>✦</div>
              <p className={styles.noPostsText}>No posts yet</p>
              <p className={styles.noPostsHint}>Publish something from the Blog Manager to see it here.</p>
            </div>
          ) : (
            posts.map((post, i) => {
              // Find if this post belongs to a specific region
              const postRegion = domain.regions.find(r => r.id === post.region_id);
              // Use the post's region slug if it has one, otherwise fallback to the current filter locale or default
              const postLocale = postRegion?.slug || (currentLocale ?? 'default');
              const postHref = `/preview/${domain.id}/${post.id}`;
              
              return (
                <article
                  key={post.id}
                  className={styles.postCard}
                  style={{ animationDelay: `${i * 0.06}s` }}
                >
                  <time className={styles.postDate}>
                    {new Date(post.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </time>
                  <h2 className={styles.postTitle}>
                    <Link
                      href={postHref}
                      locale={postLocale}
                      className={styles.postTitleLink}
                    >
                      {post.title}
                    </Link>
                  </h2>
                  <div className={styles.postExcerpt}>
                    <ReactMarkdown>{post.content.slice(0, 200) + (post.content.length > 200 ? '…' : '')}</ReactMarkdown>
                  </div>
                  <Link
                    href={postHref}
                    locale={postLocale}
                    className={styles.readMore}
                  >
                    Read article →
                  </Link>
                </article>
              );
            })
          )}
        </main>

      </div>
    </div>
  );
}


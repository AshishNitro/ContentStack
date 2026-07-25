import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { Domain, Post, fetchDomains, fetchPosts } from '../../../services/api';
import styles from '../../../styles/Preview.module.css';

const COUNTRY_META: Record<string, { flag: string; label: string }> = {
  us: { flag: 'US', label: 'United States' },
  in: { flag: 'IN', label: 'India' },
  eu: { flag: 'EU', label: 'Europe' },
  uk: { flag: 'UK', label: 'United Kingdom' },
  au: { flag: 'AU', label: 'Australia' },
  ca: { flag: 'CA', label: 'Canada' },
  de: { flag: 'DE', label: 'Germany' },
  fr: { flag: 'FR', label: 'France' },
  jp: { flag: 'JP', label: 'Japan' },
  br: { flag: 'BR', label: 'Brazil' },
};

function getCountryMeta(slug: string) {
  return COUNTRY_META[slug] ?? { flag: slug.toUpperCase(), label: slug.toUpperCase() };
}

function normalizeHost(host: string) {
  return host.replace(/^www\./, '').toLowerCase();
}

export default function Preview() {
  const router = useRouter();
  const { domainId } = router.query;
  const currentLocale = router.locale && router.locale !== 'default' ? router.locale : null;

  const [domain, setDomain] = useState<Domain | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCustomDomainView, setIsCustomDomainView] = useState(false);
  const [filterMode, setFilterMode] = useState<'strict' | 'all'>('strict');

  useEffect(() => {
    if (!domainId) return;

    const loadData = async () => {
      try {
        setLoading(true);
        const domains = await fetchDomains();
        const found = domains.find(item => item.id === Number(domainId));
        if (!found) return;

        setDomain(found);

        if (typeof window !== 'undefined') {
          setIsCustomDomainView(normalizeHost(window.location.host) === normalizeHost(found.host));
        }

        let domainPosts: Post[] = [];
        if (filterMode === 'all') {
          domainPosts = await fetchPosts(found.id);
        } else if (currentLocale) {
          domainPosts = await fetchPosts(found.id, { region: currentLocale, scope: 'region_only' });
        } else {
          domainPosts = await fetchPosts(found.id, { scope: 'global_only' });
        }

        setPosts(domainPosts);
      } catch (error) {
        console.error('Failed to load preview data', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [domainId, currentLocale, filterMode]);

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <Head><title>Loading Preview...</title></Head>
        <div className={styles.spinner} />
        <span className={styles.loadingText}>Loading preview...</span>
      </div>
    );
  }

  if (!domain) {
    return (
      <div className={styles.loadingState}>
        <Head><title>Not Found</title></Head>
        <span className={styles.loadingText}>Domain not found.</span>
        <Link href="/" className={styles.backButton}>Return to Manager</Link>
      </div>
    );
  }

  const activeCountryUrl = currentLocale
    ? `${domain.url.replace(/\/$/, '')}/${currentLocale}`
    : domain.url;
  const activeCountryMeta = currentLocale ? getCountryMeta(currentLocale) : null;

  const getPostRegionMeta = (post: Post) => {
    if (!post.region_id) return { flag: '🌐', label: 'Global' };
    const region = domain.regions.find(r => r.id === post.region_id);
    if (!region) return { flag: '🌐', label: 'Global' };
    const meta = getCountryMeta(region.slug);
    return { flag: meta.flag, label: region.slug.toUpperCase() };
  };

  const buildPostHref = (postId: number) => {
    if (isCustomDomainView) {
      if (currentLocale) {
        return `/${currentLocale}/${postId}`;
      }
      return `/${postId}`;
    }

    return `/preview/${domain.id}/${postId}`;
  };

  const buildDomainHref = () => {
    if (isCustomDomainView) {
      return currentLocale ? `/${currentLocale}` : '/';
    }
    return `/preview/${domain.id}`;
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>{domain.name}{currentLocale ? ` /${currentLocale}` : ''}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </Head>

      <nav className={styles.navbar}>
        <div className={styles.navLeft}>
          {!isCustomDomainView && (
            <>
              <Link href="/" className={styles.backButton}>
                Manager
              </Link>
              <div className={styles.navDivider} />
            </>
          )}

          <span className={styles.navDomainName}>{domain.name}</span>

          <div className={styles.regionSwitcher}>
            <Link
              href={buildDomainHref()}
              locale="default"
              className={!currentLocale ? styles.activeRegion : styles.regionLink}
            >
              Global
            </Link>
            {domain.regions.map(region => {
              const meta = getCountryMeta(region.slug);
              return (
                <Link
                  key={region.id}
                  href={buildDomainHref()}
                  locale={region.slug}
                  className={currentLocale === region.slug ? styles.activeRegion : styles.regionLink}
                  title={`View as ${meta.label}`}
                >
                  {meta.flag} {region.slug.toUpperCase()}
                </Link>
              );
            })}
          </div>
        </div>

        {!isCustomDomainView && (
          <div className={styles.previewBadge}>
            <span className={styles.previewBadgeDot} />
            Preview
          </div>
        )}
      </nav>

      <div className={styles.body}>
        <header className={styles.header}>
          <p className={styles.domainLabel}>{isCustomDomainView ? 'Published Domain' : 'Domain Preview'}</p>
          <h1 className={styles.domainName}>
            {domain.name}
            {activeCountryMeta && (
              <span className={styles.countryBadge}>{activeCountryMeta.flag} {activeCountryMeta.label}</span>
            )}
          </h1>
          <div className={styles.domainUrl}>{activeCountryUrl}</div>
          <div className={styles.headerStats}>
            <span className={styles.statChip}>
              {posts.length} {posts.length === 1 ? 'post' : 'posts'}
            </span>
            {domain.regions.length > 0 && (
              <span className={styles.statChip}>
                {domain.regions.length} {domain.regions.length === 1 ? 'region' : 'regions'}
              </span>
            )}
            {currentLocale ? (
              <span className={styles.statChipCountry}>
                Showing /{currentLocale} content only
              </span>
            ) : (
              <span className={styles.statChipCountry}>
                Showing Global content only
              </span>
            )}

            <button
              type="button"
              onClick={() => setFilterMode(m => m === 'strict' ? 'all' : 'strict')}
              style={{
                marginLeft: 'auto',
                fontSize: '11px',
                fontWeight: 600,
                color: '#5B57D1',
                background: '#F0F0FF',
                border: '1px solid #D8D7FF',
                borderRadius: '6px',
                padding: '3px 10px',
                cursor: 'pointer',
              }}
            >
              {filterMode === 'strict' ? '👁 View All Domain Posts' : '🔒 Show Isolated Region Content'}
            </button>
          </div>
        </header>

        <main className={styles.postsContainer}>
          {posts.length === 0 ? (
            <div className={styles.noPosts}>
              <div className={styles.noPostsIcon}>+</div>
              <p className={styles.noPostsText}>No posts found for this region</p>
              <p className={styles.noPostsHint}>Publish content specifically targeted for {currentLocale ? `/${currentLocale}` : 'Global'} from the Blog Manager.</p>
            </div>
          ) : (
            posts.map((post, index) => {
              const regionMeta = getPostRegionMeta(post);
              return (
                <article
                  key={post.id}
                  className={styles.postCard}
                  style={{ animationDelay: `${index * 0.06}s` }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <time className={styles.postDate}>
                      {new Date(post.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </time>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#5B57D1',
                      background: '#F0F0FF',
                      border: '1px solid #D8D7FF',
                      borderRadius: '12px',
                      padding: '2px 8px',
                    }}>
                      {regionMeta.flag} {regionMeta.label}
                    </span>
                  </div>
                  <h2 className={styles.postTitle}>
                    <Link
                      href={buildPostHref(post.id)}
                      locale={currentLocale ?? 'default'}
                      className={styles.postTitleLink}
                    >
                      {post.title}
                    </Link>
                  </h2>
                  <div className={styles.postExcerpt}>
                    <ReactMarkdown>{post.content.slice(0, 200) + (post.content.length > 200 ? '...' : '')}</ReactMarkdown>
                  </div>
                  <Link
                    href={buildPostHref(post.id)}
                    locale={currentLocale ?? 'default'}
                    className={styles.readMore}
                  >
                    Read article
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

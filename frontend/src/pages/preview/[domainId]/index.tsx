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

        const domainPosts = await fetchPosts(found.id);
        let currentRegionId: number | null = null;

        if (currentLocale) {
          const region = found.regions.find(item => item.slug === currentLocale);
          if (region) currentRegionId = region.id;
        }

        const filteredPosts = domainPosts.filter(post => (
          currentRegionId !== null
            ? post.region_id === currentRegionId || post.region_id === null
            : true
        ));

        setPosts(filteredPosts);
      } catch (error) {
        console.error('Failed to load preview data', error);
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
            {currentLocale && (
              <span className={styles.statChipCountry}>
                Viewing /{currentLocale}
              </span>
            )}
          </div>
        </header>

        <main className={styles.postsContainer}>
          {posts.length === 0 ? (
            <div className={styles.noPosts}>
              <div className={styles.noPostsIcon}>+</div>
              <p className={styles.noPostsText}>No posts yet</p>
              <p className={styles.noPostsHint}>Publish something from the Blog Manager to see it here.</p>
            </div>
          ) : (
            posts.map((post, index) => (
              <article
                key={post.id}
                className={styles.postCard}
                style={{ animationDelay: `${index * 0.06}s` }}
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
            ))
          )}
        </main>
      </div>
    </div>
  );
}

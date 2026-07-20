import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { Domain, Post, fetchDomains, fetchPost } from '../../../services/api';
import styles from '../../../styles/PostDetail.module.css';

// Country metadata
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

export default function PostDetail() {
  const router = useRouter();
  const { domainId, postId } = router.query;

  const currentLocale = router.locale && router.locale !== 'default' ? router.locale : null;

  const [domain, setDomain] = useState<Domain | null>(null);
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!domainId || !postId) return;
    const load = async () => {
      try {
        setLoading(true);
        const [domains, postData] = await Promise.all([
          fetchDomains(),
          fetchPost(Number(postId)),
        ]);
        const found = domains.find(d => d.id === Number(domainId));
        setDomain(found ?? null);
        setPost(postData);
      } catch (err) {
        setError('Post not found.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [domainId, postId]);

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <Head><title>Loading…</title></Head>
        <div className={styles.spinner} />
        <span className={styles.loadingText}>Loading post…</span>
      </div>
    );
  }

  if (error || !post || !domain) {
    return (
      <div className={styles.loadingState}>
        <Head><title>Not Found</title></Head>
        <span className={styles.loadingText}>{error ?? 'Post not found.'}</span>
        <Link href={`/preview/${domainId}`} locale={currentLocale ?? 'default'} className={styles.backBtn}>
          ← Back to {domain?.name ?? 'blog'}
        </Link>
      </div>
    );
  }

  const countryMeta = currentLocale ? getCountryMeta(currentLocale) : null;
  const publishUrl = countryMeta
    ? `${domain.url.replace(/\/$/, '')}/${currentLocale}`
    : domain.url;

  return (
    <div className={styles.container}>
      <Head>
        <title>{post.title} — {domain.name}</title>
        <meta name="description" content={post.content.slice(0, 160)} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </Head>

      {/* ── Navbar ── */}
      <nav className={styles.navbar}>
        <div className={styles.navLeft}>
          <Link href="/" className={styles.navLink}>← Manager</Link>
          <div className={styles.navDivider} />
          <Link
            href={`/preview/${domain.id}`}
            locale={currentLocale ?? 'default'}
            className={styles.navLink}
          >
            {domain.name}
          </Link>
          <div className={styles.navDivider} />
          <span className={styles.navCurrent}>Post</span>
        </div>
        {countryMeta && (
          <span className={styles.localeBadge}>
            {countryMeta.flag} {countryMeta.label}
          </span>
        )}
      </nav>

      {/* ── Article ── */}
      <div className={styles.body}>
        <article className={styles.article}>

          {/* Meta row */}
          <div className={styles.meta}>
            <time className={styles.date}>
              {new Date(post.created_at).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric',
              })}
            </time>
            {countryMeta && (
              <span className={styles.countryChip}>
                {countryMeta.flag} {countryMeta.label}
              </span>
            )}
            <span className={styles.domainChip}>{publishUrl}</span>
          </div>

          {/* Title */}
          <h1 className={styles.title}>{post.title}</h1>

          {/* Divider */}
          <div className={styles.divider} />

          {/* Content */}
          <div className={styles.content}>
            <ReactMarkdown>{post.content}</ReactMarkdown>
          </div>

        </article>

        {/* Back link */}
        <div className={styles.backRow}>
          <Link
            href={`/preview/${domain.id}`}
            locale={currentLocale ?? 'default'}
            className={styles.backBtn}
          >
            ← All posts in {domain.name}
          </Link>
        </div>
      </div>
    </div>
  );
}

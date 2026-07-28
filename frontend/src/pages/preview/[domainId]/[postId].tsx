import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { Domain, Post, fetchDomains, fetchPost, fetchPostBySlug } from '../../../services/api';
import styles from '../../../styles/PostDetail.module.css';

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

export default function PostDetail() {
  const router = useRouter();
  const { domainId, postId } = router.query;
  const currentLocale = router.locale && router.locale !== 'default' ? router.locale : null;

  const [domain, setDomain] = useState<Domain | null>(null);
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCustomDomainView, setIsCustomDomainView] = useState(false);

  useEffect(() => {
    if (!domainId || !postId) return;

    const load = async () => {
      try {
        setLoading(true);
        const domains = await fetchDomains();
        const found = domains.find(item => item.id === Number(domainId));

        if (!found) {
          setError('Domain not found.');
          return;
        }

        setDomain(found);

        if (typeof window !== 'undefined') {
          setIsCustomDomainView(normalizeHost(window.location.host) === normalizeHost(found.host));
        }

        // postId can be a numeric ID (CMS preview) or a slug (custom domain)
        const postIdStr = String(postId);
        const isNumericId = /^\d+$/.test(postIdStr);

        const postData = isNumericId
          ? await fetchPost(Number(postIdStr), Number(domainId))
          : await fetchPostBySlug(postIdStr, Number(domainId));

        setPost(postData);
      } catch (loadError) {
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
        <Head><title>Loading...</title></Head>
        <div className={styles.spinner} />
        <span className={styles.loadingText}>Loading post...</span>
      </div>
    );
  }

  if (error || !post || !domain) {
    return (
      <div className={styles.loadingState}>
        <Head><title>Not Found</title></Head>
        <span className={styles.loadingText}>{error ?? 'Post not found.'}</span>
        <Link href={`/preview/${domainId}`} locale={currentLocale ?? 'default'} className={styles.backBtn}>
          Back to blog
        </Link>
      </div>
    );
  }

  const countryMeta = currentLocale ? getCountryMeta(currentLocale) : null;
  const publishUrl = currentLocale
    ? `${domain.url.replace(/\/$/, '')}/${currentLocale}`
    : domain.url;

  const backHref = isCustomDomainView
    ? (currentLocale ? `/${currentLocale}` : '/')
    : `/preview/${domain.id}`;

  return (
    <div className={styles.container}>
      <Head>
        <title>{post.title} - {domain.name}</title>
        <meta name="description" content={post.content.slice(0, 160)} />
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
              <Link href="/" className={styles.navLink}>Manager</Link>
              <div className={styles.navDivider} />
            </>
          )}
          <Link href={backHref} locale={currentLocale ?? 'default'} className={styles.navLink}>
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

      <div className={styles.body}>
        <article className={styles.article}>
          <div className={styles.meta}>
            <time className={styles.date}>
              {new Date(post.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
            {countryMeta && (
              <span className={styles.countryChip}>
                {countryMeta.flag} {countryMeta.label}
              </span>
            )}
            <span className={styles.domainChip}>{publishUrl}</span>
          </div>

          <h1 className={styles.title}>{post.title}</h1>
          <div className={styles.divider} />

          <div className={styles.content}>
            <ReactMarkdown>{post.content}</ReactMarkdown>
          </div>
        </article>

        <div className={styles.backRow}>
          <Link href={backHref} locale={currentLocale ?? 'default'} className={styles.backBtn}>
            Back to all posts
          </Link>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { Domain, Post, fetchDomains, fetchPosts } from '../../services/api';
import styles from '../../styles/Preview.module.css';

export default function Preview() {
  const router = useRouter();
  const { domainId } = router.query;

  const [domain, setDomain] = useState<Domain | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

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
          setPosts(domainPosts);
        }
      } catch (err) {
        console.error('Failed to load preview data', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [domainId]);

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

  return (
    <div className={styles.container}>
      <Head>
        <title>{domain.name} — Preview</title>
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
          <h1 className={styles.domainName}>{domain.name}</h1>
          <div className={styles.domainUrl}>{domain.url}</div>
          <div className={styles.headerStats}>
            <span className={styles.statChip}>
              📄 {posts.length} {posts.length === 1 ? 'post' : 'posts'}
            </span>
            {domain.regions && domain.regions.length > 0 && (
              <span className={styles.statChip}>
                🌍 {domain.regions.length} {domain.regions.length === 1 ? 'region' : 'regions'}
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
            posts.map((post, i) => (
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
                <h2 className={styles.postTitle}>{post.title}</h2>
                <div className={styles.postContent}>{post.content}</div>
              </article>
            ))
          )}
        </main>

      </div>
    </div>
  );
}

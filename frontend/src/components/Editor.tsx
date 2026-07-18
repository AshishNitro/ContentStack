import React, { useState } from 'react';
import { Domain, createPost } from '../services/api';
import styles from './Editor.module.css';

interface EditorProps {
  activeDomain: Domain;
}

export default function Editor({ activeDomain }: EditorProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [regionId, setRegionId] = useState<number | ''>('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const handleSave = async () => {
    if (!title || !content) return;
    setStatus('saving');
    try {
      await createPost({
        domainId: activeDomain.id,
        regionId: regionId ? Number(regionId) : undefined,
        title,
        content,
      });
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 3000);
      setTitle('');
      setContent('');
    } catch (err) {
      console.error('Failed to save', err);
      setStatus('idle');
    }
  };

  const publishLabel =
    status === 'saving' ? 'Publishing…' :
    status === 'saved'  ? '✓ Published' :
    'Publish';

  return (
    <div className={styles.editorContainer}>

      {/* ── Top Bar ── */}
      <header className={styles.editorHeader}>
        <div className={styles.meta}>
          <span className={styles.publishingTo}>Publishing to</span>
          <span className={styles.metaArrow}>›</span>
          <h2 className={styles.domainDisplay}>{activeDomain.name}</h2>
        </div>
        <div className={styles.actions}>
          <select
            id="region-select"
            className={styles.regionSelect}
            value={regionId}
            onChange={(e) => setRegionId(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">All regions</option>
            {activeDomain.regions.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <button
            id="publish-btn"
            className={styles.publishBtn}
            onClick={handleSave}
            disabled={status === 'saving' || !title || !content}
          >
            {publishLabel}
          </button>
        </div>
      </header>

      {/* ── Writing Surface ── */}
      <div className={styles.writingSurface}>
        <input
          id="post-title"
          type="text"
          className={styles.titleInput}
          placeholder="Post title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoComplete="off"
        />
        <div className={styles.divider} />
        <textarea
          id="post-content"
          className={styles.markdownArea}
          placeholder="Start writing… (markdown supported)"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </div>

    </div>
  );
}

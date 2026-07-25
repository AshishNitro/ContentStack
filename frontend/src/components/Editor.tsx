import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Domain, createPost } from '../services/api';
import styles from './Editor.module.css';

interface EditorProps {
  activeDomain: Domain;
}

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

export default function Editor({ activeDomain }: EditorProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [regionId, setRegionId] = useState<number | ''>('');
  const [isRegionOpen, setIsRegionOpen] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'write' | 'split' | 'preview'>('write');

  const selectedRegion = regionId
    ? activeDomain.regions.find(r => r.id === regionId)
    : null;

  /** Build the URL where the post will be publicly accessible */
  const buildPublishUrl = (slug?: string): string => {
    const base = activeDomain.url.replace(/\/$/, '');
    return slug ? `${base}/${slug}` : base;
  };

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
      const url = buildPublishUrl(selectedRegion?.slug);
      setPublishedUrl(url);
      setStatus('saved');
      setTimeout(() => {
        setStatus('idle');
        setPublishedUrl(null);
      }, 6000);
      setTitle('');
      setContent('');
      setRegionId('');
    } catch (err) {
      console.error('Failed to save', err);
      setStatus('idle');
    }
  };

  const handleDownloadMd = () => {
    if (!title && !content) return;
    const fileName =
      (title
        ? title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        : 'post') + '.md';
    const mdContent = `# ${title || 'Untitled Post'}\n\n${content}`;
    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const publishLabel =
    status === 'saving' ? 'Publishing…' :
    status === 'saved'  ? '✓ Published' :
    'Publish';

  const renderPreviewContent = () => (
    <div className={styles.previewCard}>
      <div className={styles.previewMeta}>
        <span className={styles.previewDate}>
          {new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </span>
        {selectedRegion && (
          <span className={styles.previewCountryChip}>
            {getCountryMeta(selectedRegion.slug).flag} {getCountryMeta(selectedRegion.slug).label}
          </span>
        )}
        <span className={styles.previewDomainChip}>
          {buildPublishUrl(selectedRegion?.slug)}
        </span>
      </div>
      <h1 className={styles.previewTitle}>
        {title.trim() ? title : <span className={styles.placeholderTitle}>Untitled Post</span>}
      </h1>
      <div className={styles.previewDivider} />
      <div className={styles.renderedMarkdown}>
        {content.trim() ? (
          <ReactMarkdown>{content}</ReactMarkdown>
        ) : (
          <p className={styles.placeholderText}>
            No content written yet. Type in the markdown editor to see your live preview here.
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className={styles.editorContainer}>

      {/* ── Published Toast ── */}
      {status === 'saved' && publishedUrl && (
        <div className={styles.publishToast}>
          <span className={styles.toastIcon}>✦</span>
          <span className={styles.toastText}>
            Post published to{' '}
            <a
              href={publishedUrl}
              target="_blank"
              rel="noreferrer"
              className={styles.toastLink}
            >
              {publishedUrl}
            </a>
          </span>
        </div>
      )}

      {/* ── Top Bar ── */}
      <header className={styles.editorHeader}>
        <div className={styles.meta}>
          <span className={styles.publishingTo}>Publishing to</span>
          <span className={styles.metaArrow}>›</span>
          <h2 className={styles.domainDisplay}>{activeDomain.name}</h2>
          {selectedRegion && (
            <>
              <span className={styles.metaArrow}>›</span>
              <span className={styles.metaCountryChip}>
                {getCountryMeta(selectedRegion.slug).flag}{' '}
                <span className={styles.metaCountrySlug}>/{selectedRegion.slug}</span>
              </span>
            </>
          )}
        </div>

        {/* ── View Mode Switcher (Write | Split | Preview) ── */}
        <div className={styles.segmentedControl}>
          <button
            type="button"
            className={`${styles.segmentBtn} ${viewMode === 'write' ? styles.activeSegment : ''}`}
            onClick={() => setViewMode('write')}
          >
            <span className={styles.segmentIcon}>✎</span> Write
          </button>
          <button
            type="button"
            className={`${styles.segmentBtn} ${viewMode === 'split' ? styles.activeSegment : ''}`}
            onClick={() => setViewMode('split')}
          >
            <span className={styles.segmentIcon}>◫</span> Split
          </button>
          <button
            type="button"
            className={`${styles.segmentBtn} ${viewMode === 'preview' ? styles.activeSegment : ''}`}
            onClick={() => setViewMode('preview')}
          >
            <span className={styles.segmentIcon}>👁</span> Preview
          </button>
        </div>

        <div className={styles.actions}>

          {/* ── Export .md button ── */}
          <button
            type="button"
            className={styles.exportBtn}
            onClick={handleDownloadMd}
            disabled={!title && !content}
            title="Download post as .md file"
          >
            ↓ Export .md
          </button>

          {/* ── Country / Audience Dropdown ── */}
          <div className={styles.customSelectWrapper}>
            <div
              className={styles.customSelectTrigger}
              onClick={() => setIsRegionOpen(!isRegionOpen)}
            >
              <span className={styles.triggerLabel}>Target audience:</span>
              <span className={styles.triggerValue}>
                {selectedRegion
                  ? `${getCountryMeta(selectedRegion.slug).flag} ${getCountryMeta(selectedRegion.slug).label}`
                  : '🌐 Global'}
              </span>
              <span className={styles.triggerIcon}>▾</span>
            </div>

            {isRegionOpen && (
              <>
                <div className={styles.backdrop} onClick={() => setIsRegionOpen(false)} />
                <div className={styles.customSelectMenu}>

                  {/* Global option */}
                  <div
                    className={`${styles.customSelectOption} ${regionId === '' ? styles.selectedOption : ''}`}
                    onClick={() => { setRegionId(''); setIsRegionOpen(false); }}
                  >
                    <div className={styles.optionRow}>
                      <span className={styles.optionFlag}>🌐</span>
                      <div className={styles.optionInfo}>
                        <span className={styles.optionName}>Global (All regions)</span>
                        <span className={styles.optionDesc}>Visible everywhere · {activeDomain.url}</span>
                      </div>
                    </div>
                  </div>

                  {activeDomain.regions.length > 0 && (
                    <div className={styles.menuDivider} />
                  )}

                  {activeDomain.regions.map((r) => {
                    const meta = getCountryMeta(r.slug);
                    const url  = buildPublishUrl(r.slug);
                    return (
                      <div
                        key={r.id}
                        className={`${styles.customSelectOption} ${regionId === r.id ? styles.selectedOption : ''}`}
                        onClick={() => { setRegionId(r.id); setIsRegionOpen(false); }}
                      >
                        <div className={styles.optionRow}>
                          <span className={styles.optionFlag}>{meta.flag}</span>
                          <div className={styles.optionInfo}>
                            <span className={styles.optionName}>{meta.label}</span>
                            <span className={styles.optionDesc}>Publishes to → {url}</span>
                          </div>
                          <span className={styles.optionSlug}>/{r.slug}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

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

      {/* ── Surface depending on View Mode ── */}
      {viewMode === 'write' && (
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
      )}

      {viewMode === 'split' && (
        <div className={styles.splitSurface}>
          <div className={styles.splitColumnLeft}>
            <div className={styles.columnHeader}>
              <span>MARKDOWN EDITOR</span>
            </div>
            <input
              id="post-title-split"
              type="text"
              className={styles.titleInput}
              placeholder="Post title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoComplete="off"
            />
            <div className={styles.divider} />
            <textarea
              id="post-content-split"
              className={styles.markdownArea}
              placeholder="Start writing… (markdown supported)"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
          <div className={styles.splitColumnRight}>
            <div className={styles.columnHeader}>
              <span>LIVE PUBLISH PREVIEW</span>
            </div>
            {renderPreviewContent()}
          </div>
        </div>
      )}

      {viewMode === 'preview' && (
        <div className={styles.previewSurface}>
          {renderPreviewContent()}
        </div>
      )}

    </div>
  );
}


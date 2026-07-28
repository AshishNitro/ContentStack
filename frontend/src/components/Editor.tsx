import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Domain, Region, createPost, addRegion, deleteRegion } from '../services/api';
import styles from './Editor.module.css';

interface EditorProps {
  activeDomain: Domain;
  onDomainUpdated: (domain: Domain) => void;
}

// ── Expanded country metadata: slug → flag + display label ─────────────────────
const COUNTRY_META: Record<string, { flag: string; label: string }> = {
  us: { flag: '🇺🇸', label: 'United States' },
  in: { flag: '🇮🇳', label: 'India' },
  eu: { flag: '🇪🇺', label: 'Europe' },
  uk: { flag: '🇬🇧', label: 'United Kingdom' },
  gb: { flag: '🇬🇧', label: 'United Kingdom' },
  au: { flag: '🇦🇺', label: 'Australia' },
  ca: { flag: '🇨🇦', label: 'Canada' },
  de: { flag: '🇩🇪', label: 'Germany' },
  fr: { flag: '🇫🇷', label: 'France' },
  jp: { flag: '🇯🇵', label: 'Japan' },
  br: { flag: '🇧🇷', label: 'Brazil' },
  ae: { flag: '🇦🇪', label: 'United Arab Emirates' },
  sg: { flag: '🇸🇬', label: 'Singapore' },
  mx: { flag: '🇲🇽', label: 'Mexico' },
  za: { flag: '🇿🇦', label: 'South Africa' },
  ng: { flag: '🇳🇬', label: 'Nigeria' },
  nz: { flag: '🇳🇿', label: 'New Zealand' },
  ar: { flag: '🇦🇷', label: 'Argentina' },
  it: { flag: '🇮🇹', label: 'Italy' },
  es: { flag: '🇪🇸', label: 'Spain' },
  nl: { flag: '🇳🇱', label: 'Netherlands' },
  kr: { flag: '🇰🇷', label: 'South Korea' },
  id: { flag: '🇮🇩', label: 'Indonesia' },
  pk: { flag: '🇵🇰', label: 'Pakistan' },
  sa: { flag: '🇸🇦', label: 'Saudi Arabia' },
  tr: { flag: '🇹🇷', label: 'Turkey' },
  ph: { flag: '🇵🇭', label: 'Philippines' },
  th: { flag: '🇹🇭', label: 'Thailand' },
  my: { flag: '🇲🇾', label: 'Malaysia' },
  cn: { flag: '🇨🇳', label: 'China' },
  ru: { flag: '🇷🇺', label: 'Russia' },
  pl: { flag: '🇵🇱', label: 'Poland' },
  se: { flag: '🇸🇪', label: 'Sweden' },
  ch: { flag: '🇨🇭', label: 'Switzerland' },
  no: { flag: '🇳🇴', label: 'Norway' },
  dk: { flag: '🇩🇰', label: 'Denmark' },
  fi: { flag: '🇫🇮', label: 'Finland' },
  be: { flag: '🇧🇪', label: 'Belgium' },
  at: { flag: '🇦🇹', label: 'Austria' },
  pt: { flag: '🇵🇹', label: 'Portugal' },
  gr: { flag: '🇬🇷', label: 'Greece' },
  il: { flag: '🇮🇱', label: 'Israel' },
  eg: { flag: '🇪🇬', label: 'Egypt' },
  ke: { flag: '🇰🇪', label: 'Kenya' },
  gh: { flag: '🇬🇭', label: 'Ghana' },
  cl: { flag: '🇨🇱', label: 'Chile' },
  co: { flag: '🇨🇴', label: 'Colombia' },
  pe: { flag: '🇵🇪', label: 'Peru' },
  ve: { flag: '🇻🇪', label: 'Venezuela' },
  bd: { flag: '🇧🇩', label: 'Bangladesh' },
  lk: { flag: '🇱🇰', label: 'Sri Lanka' },
  np: { flag: '🇳🇵', label: 'Nepal' },
  mm: { flag: '🇲🇲', label: 'Myanmar' },
  vn: { flag: '🇻🇳', label: 'Vietnam' },
  hk: { flag: '🇭🇰', label: 'Hong Kong' },
  tw: { flag: '🇹🇼', label: 'Taiwan' },
};

function getCountryMeta(slug: string) {
  return COUNTRY_META[slug.toLowerCase()] ?? { flag: '🌐', label: slug.toUpperCase() };
}

/** Auto-suggest the flag + label when user types a known slug */
function suggestFromSlug(slug: string): { flag: string; label: string } | null {
  const clean = slug.trim().toLowerCase().replace(/[^a-z]/g, '');
  if (clean.length >= 2 && COUNTRY_META[clean]) return COUNTRY_META[clean];
  return null;
}

/** Convert a region name to a 2-letter slug suggestion */
function slugifyName(name: string): string {
  // Try to match known labels
  const lower = name.trim().toLowerCase();
  const match = Object.entries(COUNTRY_META).find(
    ([, v]) => v.label.toLowerCase() === lower
  );
  if (match) return match[0];
  // Fallback: first 2 alpha chars
  return name.replace(/[^a-z]/gi, '').slice(0, 2).toLowerCase();
}

export default function Editor({ activeDomain, onDomainUpdated }: EditorProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [regionId, setRegionId] = useState<number | ''>('');
  const [isRegionOpen, setIsRegionOpen] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'write' | 'split' | 'preview'>('write');

  // ── Add-region form state ──────────────────────────────────────────────────
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newFlag, setNewFlag] = useState('');
  const [addError, setAddError] = useState('');
  const [isSavingRegion, setIsSavingRegion] = useState(false);
  const [deletingRegionId, setDeletingRegionId] = useState<number | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);

  // Focus name input when form opens
  useEffect(() => {
    if (showAddForm) {
      setTimeout(() => nameInputRef.current?.focus(), 50);
    }
  }, [showAddForm]);

  const selectedRegion = regionId
    ? activeDomain.regions.find(r => r.id === regionId)
    : null;

  /** Client-side slug preview — mirrors the server's generateSlug logic */
  const previewSlug = (rawTitle: string): string =>
    rawTitle
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '') || 'post';

  /** Build the URL where the post will be publicly accessible */
  const buildPublishUrl = (postSlug: string, regionSlug?: string): string => {
    const base = activeDomain.url.replace(/\/$/, '');
    if (regionSlug) {
      return `${base}/${regionSlug}/${postSlug}`;
    }
    return `${base}/${postSlug}`;
  };

  const handleSave = async () => {
    if (!title || !content) return;
    setStatus('saving');
    try {
      const post = await createPost({
        domainId: activeDomain.id,
        regionId: regionId ? Number(regionId) : undefined,
        title,
        content,
      });
      const url = buildPublishUrl(post.slug, selectedRegion?.slug);
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

  // ── Region handlers ────────────────────────────────────────────────────────

  const handleNameChange = (value: string) => {
    setNewName(value);
    setAddError('');
    // Auto-fill slug and flag from name
    const slugSuggestion = slugifyName(value);
    if (slugSuggestion) {
      setNewSlug(slugSuggestion);
      const suggestion = suggestFromSlug(slugSuggestion);
      if (suggestion) setNewFlag(suggestion.flag);
    }
  };

  const handleSlugChange = (value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setNewSlug(cleaned);
    setAddError('');
    // Auto-fill flag from slug
    const suggestion = suggestFromSlug(cleaned);
    if (suggestion) {
      setNewFlag(suggestion.flag);
      if (!newName) setNewName(suggestion.label);
    }
  };

  const handleAddRegion = async () => {
    if (!newName.trim() || !newSlug.trim()) {
      setAddError('Both name and slug are required.');
      return;
    }
    setIsSavingRegion(true);
    setAddError('');
    try {
      const updated = await addRegion(activeDomain.id, {
        name: newName.trim(),
        slug: newSlug.trim(),
      });
      onDomainUpdated(updated);
      // Auto-select the newly added region
      const newRegion = updated.regions.find(r => r.slug === newSlug.trim());
      if (newRegion) setRegionId(newRegion.id);
      // Reset form
      setShowAddForm(false);
      setNewName('');
      setNewSlug('');
      setNewFlag('');
    } catch (err: any) {
      setAddError(err.message || 'Failed to add region');
    } finally {
      setIsSavingRegion(false);
    }
  };

  const handleDeleteRegion = async (region: Region, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingRegionId(region.id);
    try {
      const updated = await deleteRegion(activeDomain.id, region.id);
      onDomainUpdated(updated);
      // If the deleted region was selected, reset to Global
      if (regionId === region.id) setRegionId('');
    } catch (err: any) {
      console.error('Failed to delete region:', err.message);
    } finally {
      setDeletingRegionId(null);
    }
  };

  const closeMenu = () => {
    setIsRegionOpen(false);
    setShowAddForm(false);
    setNewName('');
    setNewSlug('');
    setNewFlag('');
    setAddError('');
  };

  const publishLabel =
    status === 'saving' ? 'Publishing…' :
    status === 'saved'  ? '✓ Published' :
    'Publish';

  const renderPreviewContent = () => {
    const liveSlug = previewSlug(title);
    const liveUrl = buildPublishUrl(liveSlug || 'post-title', selectedRegion?.slug);

    return (
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
          <span className={styles.previewDomainChip} title="Live publish URL">
            {liveUrl}
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
  };

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
                <div className={styles.backdrop} onClick={closeMenu} />
                <div className={styles.customSelectMenu}>

                  {/* ── Global option ── */}
                  <div
                    className={`${styles.customSelectOption} ${regionId === '' ? styles.selectedOption : ''}`}
                    onClick={() => { setRegionId(''); closeMenu(); }}
                  >
                    <div className={styles.optionRow}>
                      <span className={styles.optionFlag}>🌐</span>
                      <div className={styles.optionInfo}>
                        <span className={styles.optionName}>Global (All regions)</span>
                        <span className={styles.optionDesc}>
                          Publishes to → {buildPublishUrl(previewSlug(title) || 'post-title')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {activeDomain.regions.length > 0 && (
                    <div className={styles.menuDivider} />
                  )}

                  {/* ── Region rows ── */}
                  {activeDomain.regions.map((r) => {
                    const meta = getCountryMeta(r.slug);
                    const liveSlug = previewSlug(title) || 'post-title';
                    const url  = buildPublishUrl(liveSlug, r.slug);
                    const isDeleting = deletingRegionId === r.id;
                    return (
                      <div
                        key={r.id}
                        className={`${styles.customSelectOption} ${styles.regionOptionRow} ${regionId === r.id ? styles.selectedOption : ''} ${isDeleting ? styles.deletingOption : ''}`}
                        onClick={() => { if (!isDeleting) { setRegionId(r.id); closeMenu(); } }}
                      >
                        <div className={styles.optionRow}>
                          <span className={styles.optionFlag}>
                            {isDeleting ? <span className={styles.deletingSpinner}>⟳</span> : meta.flag}
                          </span>
                          <div className={styles.optionInfo}>
                            <span className={styles.optionName}>{meta.label}</span>
                            <span className={styles.optionDesc}>Publishes to → {url}</span>
                          </div>
                          <span className={styles.optionSlug}>/{r.slug}</span>
                          <button
                            type="button"
                            className={styles.regionDeleteBtn}
                            title={`Remove ${meta.label} region`}
                            disabled={isDeleting}
                            onClick={(e) => handleDeleteRegion(r, e)}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* ── Add Region section ── */}
                  <div className={styles.menuDivider} />

                  {!showAddForm ? (
                    <button
                      type="button"
                      className={styles.addRegionBtn}
                      onClick={(e) => { e.stopPropagation(); setShowAddForm(true); }}
                    >
                      <span className={styles.addRegionIcon}>+</span>
                      Add Region
                    </button>
                  ) : (
                    <div
                      className={styles.addRegionForm}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className={styles.addRegionFormHeader}>
                        <span className={styles.addRegionFormTitle}>New Region</span>
                        <button
                          type="button"
                          className={styles.addRegionFormClose}
                          onClick={() => { setShowAddForm(false); setAddError(''); }}
                        >
                          ×
                        </button>
                      </div>

                      <div className={styles.addRegionInputRow}>
                        <span className={styles.addRegionFlagPreview}>
                          {newFlag || '🏳️'}
                        </span>
                        <div className={styles.addRegionFields}>
                          <input
                            ref={nameInputRef}
                            type="text"
                            className={styles.addRegionInput}
                            placeholder="Region name (e.g. United Arab Emirates)"
                            value={newName}
                            onChange={(e) => handleNameChange(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddRegion()}
                          />
                          <div className={styles.addRegionSlugRow}>
                            <span className={styles.addRegionSlugPrefix}>/</span>
                            <input
                              type="text"
                              className={`${styles.addRegionInput} ${styles.addRegionSlugInput}`}
                              placeholder="slug (e.g. ae)"
                              value={newSlug}
                              onChange={(e) => handleSlugChange(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleAddRegion()}
                              maxLength={10}
                            />
                          </div>
                        </div>
                      </div>

                      {addError && (
                        <div className={styles.addRegionError}>{addError}</div>
                      )}

                      <div className={styles.addRegionActions}>
                        <button
                          type="button"
                          className={styles.addRegionSaveBtn}
                          onClick={handleAddRegion}
                          disabled={isSavingRegion || !newName.trim() || !newSlug.trim()}
                        >
                          {isSavingRegion ? 'Saving…' : 'Save Region'}
                        </button>
                        <button
                          type="button"
                          className={styles.addRegionCancelBtn}
                          onClick={() => { setShowAddForm(false); setAddError(''); setNewName(''); setNewSlug(''); setNewFlag(''); }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
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

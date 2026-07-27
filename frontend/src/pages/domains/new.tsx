import React, { FormEvent, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { createDomain, Domain } from '../../services/api';
import styles from '../../styles/DomainSetup.module.css';

const DNS_RECORDS = [
  { type: 'A', name: '@', value: '76.76.21.21', purpose: 'Routes your root domain to the hosting server' },
  { type: 'CNAME', name: 'www', value: 'cname.vercel-dns.com', purpose: 'Routes www traffic to the hosting server' },
];

const REGISTRAR_HINTS: { name: string; shortcut: string; icon: string }[] = [
  { name: 'GoDaddy', shortcut: 'My Products → DNS → Manage DNS', icon: 'G' },
  { name: 'Namecheap', shortcut: 'Domain List → Manage → Advanced DNS', icon: 'N' },
  { name: 'Cloudflare', shortcut: 'Select Domain → DNS → Records', icon: 'C' },
  { name: 'Hostinger', shortcut: 'Domains → Manage → DNS / Nameservers', icon: 'H' },
];

const PIPELINE_STEPS = [
  {
    id: 'cms',
    label: 'Add & auto-connect',
    sub: 'Saves domain in CMS and automatically registers it in Vercel.',
    done: false,
  },
  {
    id: 'dns',
    label: 'Point DNS records',
    sub: 'At your domain registrar, add the A and CNAME records shown below.',
    done: false,
  },
  {
    id: 'verify',
    label: 'Verify & go live',
    sub: 'Come back here and click Verify once DNS has propagated.',
    done: false,
  },
];

export default function NewDomainPage() {
  const [domainName, setDomainName] = useState('');
  const [domainHost, setDomainHost] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdDomain, setCreatedDomain] = useState<Domain | null>(null);
  const [activeStep, setActiveStep] = useState<string>('cms');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      const domain = await createDomain({ name: domainName, host: domainHost });
      setCreatedDomain(domain);
      setDomainName('');
      setDomainHost('');
      setActiveStep('dns');
    } catch (createError: any) {
      setError(createError.message || 'Failed to create domain.');
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    });
  };

  const activeIndex = PIPELINE_STEPS.findIndex(s => s.id === activeStep);

  return (
    <div className={styles.page}>
      <Head>
        <title>Add a New Domain — CMS</title>
      </Head>

      {/* Top bar */}
      <nav className={styles.topBar}>
        <Link href="/" className={styles.topBarBack}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Dashboard
        </Link>
        <span className={styles.topBarTitle}>New Domain</span>
        <span />
      </nav>

      <div className={styles.shell}>

        {/* ── LEFT: Pipeline track ── */}
        <aside className={styles.pipeline}>
          <p className={styles.pipelineLabel}>Setup pipeline</p>

          <div className={styles.pipelineTrack}>
            {PIPELINE_STEPS.map((step, idx) => {
              const isActive = step.id === activeStep;
              const isDone = idx < activeIndex || (createdDomain && step.id === 'cms');
              const isFuture = idx > activeIndex && !isDone;

              return (
                <button
                  key={step.id}
                  className={`${styles.pipelineStep} ${isActive ? styles.pipelineStepActive : ''} ${isDone ? styles.pipelineStepDone : ''} ${isFuture ? styles.pipelineStepFuture : ''}`}
                  onClick={() => setActiveStep(step.id)}
                  aria-current={isActive ? 'step' : undefined}
                >
                  <span className={styles.pipelineNode}>
                    {isDone ? (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : (
                      <span className={styles.pipelineDot} />
                    )}
                  </span>
                  {idx < PIPELINE_STEPS.length - 1 && (
                    <span className={`${styles.pipelineConnector} ${idx < activeIndex ? styles.pipelineConnectorDone : ''}`} />
                  )}
                  <div className={styles.pipelineText}>
                    <span className={styles.pipelineStepLabel}>{step.label}</span>
                    <span className={styles.pipelineStepSub}>{step.sub}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Hosting alert */}
          <div className={styles.hostingAlert}>
            <div className={styles.hostingAlertDot} />
            <div>
              <p className={styles.hostingAlertTitle}>Vercel Auto-Connect Active</p>
              <p className={styles.hostingAlertBody}>
                Saving a domain automatically registers both apex and <code>www.</code> hostnames in your Vercel project via the Vercel API. You only need to add DNS records at your registrar!
              </p>
            </div>
          </div>
        </aside>

        {/* ── RIGHT: Step content ── */}
        <main className={styles.content}>

          {/* STEP 1: Add & Auto-connect */}
          {activeStep === 'cms' && (
            <section className={styles.stepSection} key="cms">
              <header className={styles.stepHeader}>
                <span className={styles.stepEyebrow}>Step 1 of 3</span>
                <h1 className={styles.stepTitle}>Register domain &amp; auto-connect Vercel</h1>
                <p className={styles.stepDesc}>
                  Enter your domain below. The system saves the record in your database and automatically provisions the domain in your Vercel project via API.
                </p>
              </header>

              <div className={styles.card}>
                <form className={styles.form} onSubmit={handleCreate}>
                  <div className={styles.fieldRow}>
                    <label className={styles.field} htmlFor="domain-name">
                      <span className={styles.fieldLabel}>Display name</span>
                      <input
                        id="domain-name"
                        className={styles.fieldInput}
                        value={domainName}
                        onChange={e => setDomainName(e.target.value)}
                        placeholder="e.g. Shivit India"
                        autoComplete="off"
                        required
                      />
                      <span className={styles.fieldHint}>How this domain appears in the dashboard sidebar.</span>
                    </label>

                    <label className={styles.field} htmlFor="domain-host">
                      <span className={styles.fieldLabel}>Domain host</span>
                      <input
                        id="domain-host"
                        className={styles.fieldInput}
                        value={domainHost}
                        onChange={e => setDomainHost(e.target.value)}
                        placeholder="e.g. shivit.in"
                        autoComplete="off"
                        required
                      />
                      <span className={styles.fieldHint}>The public hostname only — no <code>https://</code> or trailing paths.</span>
                    </label>
                  </div>

                  {error && (
                    <div className={styles.errorBox} role="alert">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                      {error}
                    </div>
                  )}

                  <button type="submit" className={styles.primaryButton} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <span className={styles.spinner} />
                        Adding domain…
                      </>
                    ) : (
                      <>
                        Add domain &amp; connect Vercel
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {createdDomain && (
                <div className={styles.successCard} role="status">
                  <div className={styles.successHeader}>
                    <div className={styles.successIcon}>
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <path d="M3 9l4.5 4.5 7.5-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div>
                      <p className={styles.successTitle}>{createdDomain.name} added</p>
                      <p className={styles.successSub}>Domain saved &amp; connected to Vercel. Next: point your DNS records.</p>
                    </div>
                    <span className={styles.statusPill}>{createdDomain.status}</span>
                  </div>

                  {/* Vercel registration status badge */}
                  {createdDomain.vercel_status === 'added' && (
                    <div className={styles.vercelBadge} data-variant="success">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2 7l3.5 3.5L12 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Automatically added to Vercel — both <code>{createdDomain.host}</code> and <code>www.{createdDomain.host}</code>
                    </div>
                  )}
                  {createdDomain.vercel_status === 'already_exists' && (
                    <div className={styles.vercelBadge} data-variant="warning">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.4"/>
                        <path d="M7 4v3.5M7 9.5h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                      </svg>
                      Already registered in Vercel project
                    </div>
                  )}
                  {createdDomain.vercel_status === 'credentials_missing' && (
                    <div className={styles.vercelBadge} data-variant="neutral">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.4"/>
                        <path d="M7 4v3.5M7 9.5h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                      </svg>
                      Vercel credentials not configured on backend server — add domain manually in Vercel settings if needed
                    </div>
                  )}
                  {createdDomain.vercel_status === 'failed' && (
                    <div className={styles.vercelBadge} data-variant="error">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.4"/>
                        <path d="M7 4v3.5M7 9.5h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                      </svg>
                      Vercel auto-registration warning: {createdDomain.vercel_error ?? 'Unknown error'}
                    </div>
                  )}

                  <button className={styles.nextButton} onClick={() => setActiveStep('dns')}>
                    Next: Point DNS records
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              )}
            </section>
          )}

          {/* STEP 2: DNS */}
          {activeStep === 'dns' && (
            <section className={styles.stepSection} key="dns">
              <header className={styles.stepHeader}>
                <span className={styles.stepEyebrow}>Step 2 of 3</span>
                <h1 className={styles.stepTitle}>Add DNS records at your domain registrar</h1>
                <p className={styles.stepDesc}>
                  Log in to the site where you registered your domain (GoDaddy, Namecheap, Cloudflare) and add these two records. This routes your domain to Vercel.
                </p>
              </header>

              {/* DNS records table */}
              <div className={styles.dnsTable}>
                <div className={styles.dnsTableHead}>
                  <span>Type</span>
                  <span>Name / Host</span>
                  <span>Value / Target</span>
                  <span>Purpose</span>
                  <span></span>
                </div>
                {DNS_RECORDS.map(rec => (
                  <div className={styles.dnsTableRow} key={rec.type}>
                    <span className={styles.dnsType}>{rec.type}</span>
                    <code className={styles.dnsCode}>{rec.name}</code>
                    <code className={styles.dnsCode}>{rec.value}</code>
                    <span className={styles.dnsPurpose}>{rec.purpose}</span>
                    <button
                      className={styles.copyButton}
                      onClick={() => copyToClipboard(rec.value, rec.type)}
                      aria-label={`Copy ${rec.value}`}
                    >
                      {copiedKey === rec.type ? (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M2 7l3.5 3.5L12 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <rect x="1" y="4" width="8" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
                          <path d="M4 4V2.5A1.5 1.5 0 015.5 1H11.5A1.5 1.5 0 0113 2.5V8.5A1.5 1.5 0 0111.5 10H10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                        </svg>
                      )}
                      {copiedKey === rec.type ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                ))}
              </div>

              <div className={styles.registrarGrid}>
                <div className={styles.card}>
                  <h2 className={styles.cardTitle}>Where to find DNS in your registrar</h2>
                  <div className={styles.registrarList}>
                    {REGISTRAR_HINTS.map(r => (
                      <div key={r.name} className={styles.registrarRow}>
                        <span className={styles.registrarIcon}>{r.icon}</span>
                        <div>
                          <p className={styles.registrarName}>{r.name}</p>
                          <p className={styles.registrarPath}>{r.shortcut}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.card}>
                  <h2 className={styles.cardTitle}>What to avoid</h2>
                  <ul className={styles.avoidList}>
                    <li>Don&apos;t put <code className={styles.inlineCode}>https://</code> in the DNS value field — just the bare IP or target hostname.</li>
                    <li>Don&apos;t add URL paths like <code className={styles.inlineCode}>/blog</code> — DNS records only work with domain names.</li>
                    <li>Remove any pre-existing <strong>A</strong> or <strong>CNAME</strong> records for <code className={styles.inlineCode}>@</code> and <code className={styles.inlineCode}>www</code> that point elsewhere.</li>
                    <li>DNS propagation usually takes 5-15 minutes (up to 48h in rare cases).</li>
                  </ul>
                </div>
              </div>

              <div className={styles.card}>
                <button className={styles.nextButton} onClick={() => setActiveStep('verify')}>
                  Done — I&apos;ve added the DNS records
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </section>
          )}

          {/* STEP 3: Verify */}
          {activeStep === 'verify' && (
            <section className={styles.stepSection} key="verify">
              <header className={styles.stepHeader}>
                <span className={styles.stepEyebrow}>Step 3 of 3</span>
                <h1 className={styles.stepTitle}>Wait for propagation, then verify</h1>
                <p className={styles.stepDesc}>
                  DNS changes travel across global servers. Check DNS propagation below and activate your domain when ready.
                </p>
              </header>

              <div className={styles.verifySteps}>
                <div className={styles.verifyStep}>
                  <div className={styles.verifyBubble}>1</div>
                  <div className={styles.verifyContent}>
                    <h3 className={styles.verifyTitle}>Check propagation</h3>
                    <p className={styles.verifyBody}>
                      Use <a href="https://dnschecker.org" target="_blank" rel="noreferrer" className={styles.inlineLink}>dnschecker.org</a> to confirm your A record points to <code className={styles.inlineCode}>76.76.21.21</code> across the globe.
                    </p>
                  </div>
                </div>
                <div className={styles.verifyStep}>
                  <div className={styles.verifyBubble}>2</div>
                  <div className={styles.verifyContent}>
                    <h3 className={styles.verifyTitle}>Click Verify in Dashboard</h3>
                    <p className={styles.verifyBody}>
                      Open the dashboard, find the new domain in the sidebar, and click the <strong>Verify</strong> button. The status will change to <em>Active</em> once verified.
                    </p>
                  </div>
                </div>
                <div className={styles.verifyStep}>
                  <div className={styles.verifyBubble}>3</div>
                  <div className={styles.verifyContent}>
                    <h3 className={styles.verifyTitle}>Publish &amp; test</h3>
                    <p className={styles.verifyBody}>
                      Once active, publish a post assigned to this domain and visit it in your browser to verify it loads seamlessly.
                    </p>
                  </div>
                </div>
              </div>

              <div className={styles.finalActions}>
                <Link href="/" className={styles.primaryButton}>
                  Go to dashboard
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Link>
                {createdDomain && (
                  <Link href={`/preview/${createdDomain.id}`} className={styles.ghostButton}>
                    Preview domain
                  </Link>
                )}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

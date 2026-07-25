import React, { useState } from 'react';
import Link from 'next/link';
import { Domain, deleteDomain, verifyDomain } from '../services/api';
import styles from './Sidebar.module.css';

interface SidebarProps {
  domains: Domain[];
  activeDomainId: number | null;
  onSelectDomain: (id: number) => void;
  onDomainsChanged: (preferredDomainId?: number) => Promise<void>;
}

function getStatusLabel(status: Domain['status']) {
  switch (status) {
    case 'active':
      return 'Active';
    case 'verifying':
      return 'Verifying';
    case 'failed':
      return 'Failed';
    case 'disabled':
      return 'Disabled';
    case 'draft':
      return 'Draft';
    default:
      return 'Pending DNS';
  }
}

export default function Sidebar({
  domains,
  activeDomainId,
  onSelectDomain,
  onDomainsChanged,
}: SidebarProps) {
  const [busyDomainId, setBusyDomainId] = useState<number | null>(null);

  const activeDomain = domains.find(domain => domain.id === activeDomainId) ?? null;

  const handleVerify = async (domainId: number) => {
    setBusyDomainId(domainId);

    try {
      const domain = await verifyDomain(domainId);
      await onDomainsChanged(domain.id);
    } catch (error) {
      console.error(error);
    } finally {
      setBusyDomainId(null);
    }
  };

  const handleDelete = async (domain: Domain) => {
    const confirmed = window.confirm(`Delete ${domain.name}? This removes its regions and posts too.`);
    if (!confirmed) return;

    setBusyDomainId(domain.id);

    try {
      await deleteDomain(domain.id);
      await onDomainsChanged();
    } catch (error) {
      console.error(error);
    } finally {
      setBusyDomainId(null);
    }
  };

  return (
    <div className={styles.sidebar}>
      <div className={styles.header}>
        <div className={styles.logoMark}>
          <div className={styles.logoIcon}>CMS</div>
          <span className={styles.appName}>Blog Manager</span>
        </div>
      </div>

      <div className={styles.sectionLabel}>Environments</div>

      <nav className={styles.nav}>
        {domains.map(domain => {
          const isActive = domain.id === activeDomainId;

          return (
            <button
              key={domain.id}
              className={`${styles.domainButton} ${isActive ? styles.active : ''}`}
              onClick={() => onSelectDomain(domain.id)}
            >
              <div className={styles.domainIndicator} />
              <div className={styles.domainDetails}>
                <span className={styles.domainName}>{domain.name}</span>
                <span className={styles.domainUrl}>{domain.url}</span>
                <span className={`${styles.statusPill} ${styles[`status_${domain.status}`]}`}>
                  {getStatusLabel(domain.status)}
                </span>
              </div>

              <Link
                href={`/preview/${domain.id}`}
                className={styles.previewLink}
                onClick={(event) => event.stopPropagation()}
              >
                Preview
              </Link>

              <span
                className={styles.deleteButton}
                role="button"
                tabIndex={0}
                aria-label={`Delete ${domain.name}`}
                onClick={(event) => {
                  event.stopPropagation();
                  handleDelete(domain);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    event.stopPropagation();
                    handleDelete(domain);
                  }
                }}
              >
                X
              </span>
            </button>
          );
        })}
      </nav>

      <div className={styles.domainTools}>
        {activeDomain && (
          <section className={styles.setupPanel}>
            <div className={styles.setupRow}>
              <div>
                <div className={styles.setupTitle}>Domain setup</div>
                <div className={styles.setupSubtitle}>{activeDomain.host}</div>
              </div>
              <button
                className={styles.verifyButton}
                disabled={busyDomainId === activeDomain.id}
                onClick={() => handleVerify(activeDomain.id)}
              >
                {busyDomainId === activeDomain.id ? 'Checking' : 'Verify'}
              </button>
            </div>

            <div className={styles.recordList}>
              {(activeDomain.dnsRecords || []).map((record) => (
                <div className={styles.recordRow} key={`${record.type}-${record.name}`}>
                  <span className={styles.recordType}>{record.type}</span>
                  <span className={styles.recordValue}>{record.name} {record.value}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <Link href="/domains/new" className={styles.addButton}>
          + Add Domain
        </Link>
        <Link href="/domains/new" className={styles.helpLink}>
          Open setup guide
        </Link>
      </div>

      <div className={styles.sidebarFooter}>
        <div className={styles.footerStatus}>
          <span className={styles.statusDot} />
          Multi-domain control center
        </div>
      </div>
    </div>
  );
}

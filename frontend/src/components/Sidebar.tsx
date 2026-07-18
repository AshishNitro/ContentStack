import React from 'react';
import Link from 'next/link';
import { Domain } from '../services/api';
import styles from './Sidebar.module.css';

interface SidebarProps {
  domains: Domain[];
  activeDomainId: number | null;
  onSelectDomain: (id: number) => void;
}

export default function Sidebar({ domains, activeDomainId, onSelectDomain }: SidebarProps) {
  return (
    <div className={styles.sidebar}>

      {/* Logo / App name */}
      <div className={styles.header}>
        <div className={styles.logoMark}>
          <div className={styles.logoIcon}>✦</div>
          <span className={styles.appName}>Blog Manager</span>
        </div>
      </div>

      {/* Section label */}
      <div className={styles.sectionLabel}>Environments</div>

      {/* Domain list */}
      <nav className={styles.nav}>
        {domains.map((domain) => {
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
              </div>
              <Link
                href={`/preview/${domain.id}`}
                className={styles.previewLink}
                onClick={(e) => e.stopPropagation()}
              >
                Preview ↗
              </Link>
            </button>
          );
        })}
      </nav>

      {/* Footer status */}
      <div className={styles.sidebarFooter}>
        <div className={styles.footerStatus}>
          <span className={styles.statusDot} />
          All systems online
        </div>
      </div>

    </div>
  );
}

import React from 'react';
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
      <div className={styles.header}>
        <h1>Blog Manager</h1>
        <p className={styles.subtitle}>Select environment</p>
      </div>
      
      <div className="divider"></div>

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
            </button>
          );
        })}
      </nav>
    </div>
  );
}

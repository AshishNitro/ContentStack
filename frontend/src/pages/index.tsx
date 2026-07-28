import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Sidebar from '../components/Sidebar';
import Editor from '../components/Editor';
import { Domain, fetchDomains } from '../services/api';
import styles from '../styles/Home.module.css';

export default function Home() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [activeDomainId, setActiveDomainId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadDomains = async (preferredDomainId?: number) => {
    return fetchDomains()
      .then(data => {
        setDomains(data);
        setActiveDomainId(currentDomainId => {
          if (!data.length) return null;
          if (preferredDomainId && data.some(domain => domain.id === preferredDomainId)) {
            return preferredDomainId;
          }
          if (currentDomainId && data.some(domain => domain.id === currentDomainId)) {
            return currentDomainId;
          }
          return data[0].id;
        });
      })
      .catch(error => console.error(error))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadDomains();
  }, []);

  /** Called by Editor after a region is added or deleted.
   *  Patches the specific domain in-place so regions update instantly. */
  const handleDomainUpdated = (updated: Domain) => {
    setDomains(prev => prev.map(d => (d.id === updated.id ? updated : d)));
  };

  const activeDomain = domains.find(domain => domain.id === activeDomainId);
  const accentColors = ['#7568f0', '#f0a368', '#68f0b7'];
  const activeAccent = activeDomainId
    ? accentColors[activeDomainId % accentColors.length]
    : '#7568f0';

  return (
    <div
      className={styles.layoutContainer}
      style={{ '--dynamic-accent': activeAccent } as React.CSSProperties}
    >
      <Head>
        <title>Blog Manager</title>
      </Head>

      <Sidebar
        domains={domains}
        activeDomainId={activeDomainId}
        onSelectDomain={setActiveDomainId}
        onDomainsChanged={loadDomains}
      />

      <main className={styles.mainContent}>
        {isLoading ? (
          <div className={styles.centerMessage}>Loading environments...</div>
        ) : activeDomain ? (
          <Editor activeDomain={activeDomain} onDomainUpdated={handleDomainUpdated} />
        ) : (
          <div className={styles.centerMessage}>No domains available.</div>
        )}
      </main>
    </div>
  );
}

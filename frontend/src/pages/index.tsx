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

  useEffect(() => {
    fetchDomains()
      .then(data => {
        setDomains(data);
        if (data.length > 0) {
          setActiveDomainId(data[0].id);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setIsLoading(false));
  }, []);

  const activeDomain = domains.find(d => d.id === activeDomainId);

  // Dynamic signature element logic
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
      />
      
      <main className={styles.mainContent}>
        {isLoading ? (
          <div className={styles.centerMessage}>Loading environments...</div>
        ) : activeDomain ? (
          <Editor activeDomain={activeDomain} />
        ) : (
          <div className={styles.centerMessage}>No domains available.</div>
        )}
      </main>
    </div>
  );
}

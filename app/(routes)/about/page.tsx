'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './about.module.css';

export default function AboutPage() {
  const [activeSection, setActiveSection] = useState('abstract');
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);

  const sectionIds = [
    'abstract', 'introduction', 'enemy', 'methodology', 'architecture',
    'implementation', 'heist', 'results', 'conclusion', 'legal', 'references'
  ];

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (window.scrollY / totalHeight) * 100;
      setScrollProgress(progress);
      setIsNavCollapsed(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 }
    );

    sectionIds.forEach((id) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  const tableOfContents = [
    { id: 'abstract', label: 'The Pitch', number: 'I' },
    { id: 'introduction', label: 'The Problem', number: 'II' },
    { id: 'enemy', label: 'Know Your Enemy', number: 'III' },
    { id: 'methodology', label: 'How I Built It', number: 'IV' },
    { id: 'architecture', label: 'The Tech Stack', number: 'V' },
    { id: 'implementation', label: 'Making It Work', number: 'VI' },
    { id: 'heist', label: 'The Heist', number: 'VII' },
    { id: 'results', label: 'Did It Work?', number: 'VIII' },
    { id: 'conclusion', label: 'The Point', number: 'IX' },
    { id: 'legal', label: 'Legal Stuff', number: 'X' },
    { id: 'references', label: 'References', number: 'XI' },
  ];

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className={styles.container}>
      <div className={styles.progressBar} style={{ width: `${scrollProgress}%` }} />

      <header className={styles.header}>
        <div className={styles.headerDecoration}>
          <div className={styles.decorLine} />
          <div className={styles.decorDiamond} />
          <div className={styles.decorLine} />
        </div>
        
        <div className={styles.headerContent}>
          <div className={styles.journalInfo}>
            <span className={styles.journalName}>A Developer&apos;s Manifesto</span>
            <span className={styles.journalMeta}>November 2025 • ~25 minute read</span>
          </div>
          
          <h1 className={styles.title}>
            Building Flyx: How I Stole Streams from Thieves to Prove Ethical Piracy Is Possible
          </h1>
          
          <p className={styles.subtitle}>
            The story of one developer, zero budget, and a mission to prove that free streaming 
            does not require pop-ups, malware, crypto miners, or treating users like garbage.
          </p>
          
          <div className={styles.authorBlock}>
            <div className={styles.authorCard}>
              <div className={styles.authorAvatar}>
                <span>V</span>
                <div className={styles.avatarRing} />
              </div>
              <div className={styles.authorDetails}>
                <span className={styles.authorName}>Vynx</span>
                <span className={styles.authorAffiliation}>Independent Developer</span>
                <span className={styles.authorEmail}>Full-Stack Engineer & Reverse Engineer</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className={styles.headerGlow} />
      </header>

      <div className={styles.mainLayout}>
        <aside className={`${styles.sidebar} ${isNavCollapsed ? styles.sidebarCollapsed : ''}`}>
          <div className={styles.tocContainer}>
            <div className={styles.tocHeader}>
              <h3 className={styles.tocTitle}>Contents</h3>
              <span className={styles.tocProgress}>{Math.round(scrollProgress)}%</span>
            </div>
            <nav className={styles.tocNav}>
              {tableOfContents.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={`${styles.tocItem} ${activeSection === item.id ? styles.tocActive : ''}`}
                >
                  <span className={styles.tocNumber}>{item.number}</span>
                  <span className={styles.tocLabel}>{item.label}</span>
                  <span className={styles.tocIndicator} />
                </button>
              ))}
            </nav>
          </div>
        </aside>

        <article className={styles.article}>

          {/* Abstract */}
          <section id="abstract" className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNumber}>I</span>
              <h2>The Pitch</h2>
            </div>
            <div className={styles.abstractBox}>
              <p>
                I built a streaming platform that does not assault you with pop-ups. It does not 
                mine cryptocurrency on your CPU. It does not track you across the web. It does not 
                have fake close buttons, dark patterns, or any of the other exploitative garbage 
                that pirate streaming sites have normalized.
              </p>
              <p>
                I did it alone, in my spare time, with zero budget. This document explains how, 
                why, and what it proves about the streaming industry&apos;s dirty little secret: 
                the exploitation is optional. They choose to treat you like a product. They do not 
                have to.
              </p>
              <div className={styles.keywordsSection}>
                <div className={styles.keywordsHeader}>
                  <span className={styles.keywordIcon}>🏷️</span>
                  <span className={styles.keywordLabel}>Topics Covered</span>
                </div>
                <div className={styles.keywordsList}>
                  <span className={styles.keyword}>Reverse Engineering</span>
                  <span className={styles.keyword}>Stream Extraction</span>
                  <span className={styles.keyword}>Obfuscation Cracking</span>
                  <span className={styles.keyword}>Ethical Design</span>
                  <span className={styles.keyword}>Serverless Architecture</span>
                  <span className={styles.keyword}>Solo Development</span>
                </div>
              </div>
            </div>
          </section>

          {/* Introduction */}
          <section id="introduction" className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNumber}>II</span>
              <h2>The Problem</h2>
            </div>
            
            <p className={styles.leadParagraph}>
              Try to watch a movie for free on the internet. Go ahead. Click on any of the top 
              search results. Within seconds, you will experience a pop-up advertisement. Then 
              another. A fake &quot;close&quot; button that opens three more tabs. A notification 
              request you did not ask for. A video player demanding you disable your ad blocker. 
              And somewhere in the background, your CPU is now mining Monero for someone you will 
              never meet.
            </p>
            
            <p>
              This is not an accident. This is the business model. These sites make money by 
              treating you as the product. Your attention gets sold to advertisers. Your computing 
              power gets stolen for cryptocurrency mining. Your browser fingerprint gets sold to 
              data brokers. Your clicks on fake buttons generate affiliate revenue. You wanted to 
              watch a movie; they wanted to extract every possible cent from your visit.
            </p>

            <div className={styles.highlightBox}>
              <div className={styles.highlightIcon}>💡</div>
              <div className={styles.highlightContent}>
                <h4>The Implicit Message</h4>
                <p>
                  Free content requires exploitation. If you are not paying with money, you must 
                  pay with your security, your privacy, and your sanity. That is the deal. Take 
                  it or leave it.
                </p>
              </div>
            </div>

            <p>
              I decided to leave it. And then I decided to build something better.
            </p>

            <h3 className={styles.subsectionTitle}>The Mission</h3>
            <p>
              Before writing a single line of code, I established the rules. Non-negotiable. The 
              platform would have zero advertisements, zero tracking cookies, zero fingerprinting, 
              zero cryptocurrency mining, zero pop-ups, zero fake buttons, zero dark patterns, 
              zero collection of personal information, and zero selling of user data.
            </p>
            <p>
              If I could not build it without breaking these rules, I would not build it at all. 
              The entire point was to prove it could be done ethically. Compromising on ethics 
              would defeat the purpose entirely.
            </p>
          </section>

          {/* Know Your Enemy */}
          <section id="enemy" className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNumber}>III</span>
              <h2>Know Your Enemy</h2>
            </div>

            <p className={styles.leadParagraph}>
              To build something better, I first needed to understand exactly how bad the current 
              landscape really is. Pirate streaming sites are not charities. They are businesses, 
              often very profitable ones. And their product is you.
            </p>

            <h3 className={styles.subsectionTitle}>How They Make Money</h3>
            
            <div className={styles.challengesList}>
              <div className={styles.challengeItem}>
                <div className={styles.challengeHeader}>
                  <span className={styles.challengeIcon}>🦠</span>
                  <h4>Malvertising</h4>
                </div>
                <div className={styles.challengeBody}>
                  <p>
                    Those pop-ups are not just annoying—they are actively malicious. Studies show 
                    that over fifty percent of visitors to major pirate streaming sites get served 
                    actual malware. The advertising networks that work with these sites have zero 
                    content standards. Scams, ransomware, phishing attempts—it all pays the same.
                  </p>
                </div>
              </div>

              <div className={styles.challengeItem}>
                <div className={styles.challengeHeader}>
                  <span className={styles.challengeIcon}>⛏️</span>
                  <h4>Cryptocurrency Mining</h4>
                </div>
                <div className={styles.challengeBody}>
                  <p>
                    While you watch a movie, your CPU is mining cryptocurrency for someone else. 
                    Your electricity bill goes up. Your laptop fans spin at full speed. Your 
                    battery drains faster than it should. They profit from your hardware without 
                    your consent.
                  </p>
                </div>
              </div>

              <div className={styles.challengeItem}>
                <div className={styles.challengeHeader}>
                  <span className={styles.challengeIcon}>👁️</span>
                  <h4>Data Harvesting</h4>
                </div>
                <div className={styles.challengeBody}>
                  <p>
                    Browser fingerprinting, tracking cookies, cross-site identifiers—your browsing 
                    habits get packaged and sold to data brokers. Even in private browsing mode, 
                    they know who you are. Your data becomes their product.
                  </p>
                </div>
              </div>
            </div>

            <div className={styles.citationBox}>
              <div className={styles.citationMark}>&quot;</div>
              <blockquote>
                You are not the customer. You are not even the user. You are the ore being mined. 
                Every click, every second of attention, every CPU cycle—extracted and monetized 
                without your consent.
              </blockquote>
              <cite>— The reality of &quot;free&quot; streaming</cite>
            </div>

            <h3 className={styles.subsectionTitle}>The &quot;We Have No Choice&quot; Lie</h3>
            <p>
              Site operators love to claim they need aggressive monetization to survive. 
              &quot;Servers cost money,&quot; they say. &quot;We have to pay for bandwidth 
              somehow.&quot;
            </p>
            <p>
              This is nonsense.
            </p>
            <p>
              These sites do not host content—they aggregate it. They are glorified link 
              directories with embedded players. The actual video streams come from third-party 
              providers. The bandwidth costs are minimal. Modern serverless platforms like Vercel, 
              Cloudflare, and Netlify offer generous free tiers that can handle substantial 
              traffic at zero cost.
            </p>
            <p>
              The exploitation is not necessary. It is simply more profitable. They could run 
              clean sites. They choose not to because malware pays better than dignity.
            </p>

            <div className={styles.literatureTable}>
              <h4>The Exploitation Landscape</h4>
              <div className={styles.tableWrapper}>
                <table>
                  <thead>
                    <tr>
                      <th>Practice</th>
                      <th>Prevalence</th>
                      <th>User Impact</th>
                      <th>Flyx Approach</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Pop-up Advertisements</td>
                      <td>~95% of sites</td>
                      <td>Malware risk, frustration</td>
                      <td>None</td>
                    </tr>
                    <tr>
                      <td>Cryptocurrency Mining</td>
                      <td>~30% of sites</td>
                      <td>CPU theft, battery drain</td>
                      <td>None</td>
                    </tr>
                    <tr>
                      <td>Browser Fingerprinting</td>
                      <td>~70% of sites</td>
                      <td>Cross-site tracking</td>
                      <td>None</td>
                    </tr>
                    <tr>
                      <td>Dark Patterns</td>
                      <td>~90% of sites</td>
                      <td>Accidental clicks</td>
                      <td>None</td>
                    </tr>
                    <tr>
                      <td>Malware Distribution</td>
                      <td>~40% of sites</td>
                      <td>System compromise</td>
                      <td>None</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>


          {/* Methodology */}
          <section id="methodology" className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNumber}>IV</span>
              <h2>How I Built It</h2>
            </div>

            <p className={styles.leadParagraph}>
              Before starting, I set constraints. Partly to prove a point, partly because I am 
              stubborn. If I was going to claim that ethical streaming is achievable by anyone, 
              I needed to build it under realistic conditions.
            </p>

            <div className={styles.constraintGrid}>
              <div className={styles.constraintCard}>
                <div className={styles.constraintIcon}>👤</div>
                <h4>Solo Developer</h4>
                <p>
                  No team. No contractors. No &quot;my friend helped with the design.&quot; Every 
                  line of code, every pixel, every decision—mine alone.
                </p>
              </div>
              <div className={styles.constraintCard}>
                <div className={styles.constraintIcon}>💸</div>
                <h4>Zero Budget</h4>
                <p>
                  Free tiers only. If a service wanted my credit card, I found an alternative. 
                  The whole point is proving you do not need money to do this right.
                </p>
              </div>
              <div className={styles.constraintCard}>
                <div className={styles.constraintIcon}>🌙</div>
                <h4>Nights and Weekends</h4>
                <p>
                  I have a day job. This was built in stolen hours—fifteen to twenty per week, 
                  fueled by coffee and determination. Three months total.
                </p>
              </div>
              <div className={styles.constraintCard}>
                <div className={styles.constraintIcon}>📖</div>
                <h4>Public Knowledge Only</h4>
                <p>
                  No insider information. No proprietary tools. Everything I learned came from 
                  documentation, forums, and staring at obfuscated JavaScript until it made sense.
                </p>
              </div>
            </div>

            <h3 className={styles.subsectionTitle}>The Timeline</h3>
            <p>
              Three months. That is how long it took from &quot;I should build this&quot; to 
              &quot;it actually works.&quot; Here is how it broke down:
            </p>

            <div className={styles.methodologyDiagram}>
              <div className={styles.methodPhase}>
                <div className={styles.phaseNumber}>01</div>
                <div className={styles.phaseContent}>
                  <h4>Planning</h4>
                  <p>Figuring out what to build, what tools to use, and whether this was even possible</p>
                  <span className={styles.phaseDuration}>2 weeks</span>
                </div>
              </div>
              <div className={styles.phaseConnector}>
                <div className={styles.connectorLine} />
                <div className={styles.connectorArrow}>→</div>
              </div>
              <div className={styles.methodPhase}>
                <div className={styles.phaseNumber}>02</div>
                <div className={styles.phaseContent}>
                  <h4>Development</h4>
                  <p>Building the core platform, cracking stream providers, endless debugging sessions</p>
                  <span className={styles.phaseDuration}>8 weeks</span>
                </div>
              </div>
              <div className={styles.phaseConnector}>
                <div className={styles.connectorLine} />
                <div className={styles.connectorArrow}>→</div>
              </div>
              <div className={styles.methodPhase}>
                <div className={styles.phaseNumber}>03</div>
                <div className={styles.phaseContent}>
                  <h4>Deployment</h4>
                  <p>Going live, optimization, fixing everything that broke in production</p>
                  <span className={styles.phaseDuration}>2 weeks</span>
                </div>
              </div>
              <div className={styles.phaseConnector}>
                <div className={styles.connectorLine} />
                <div className={styles.connectorArrow}>→</div>
              </div>
              <div className={styles.methodPhase}>
                <div className={styles.phaseNumber}>04</div>
                <div className={styles.phaseContent}>
                  <h4>Documentation</h4>
                  <p>Writing this document to explain what I did and why it matters</p>
                  <span className={styles.phaseDuration}>2 weeks</span>
                </div>
              </div>
            </div>
          </section>

          {/* Architecture */}
          <section id="architecture" className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNumber}>V</span>
              <h2>The Tech Stack</h2>
            </div>

            <p className={styles.leadParagraph}>
              When you are building alone with no budget, tool selection is everything. Pick wrong 
              and you waste weeks fighting your framework. Pick right and the code almost writes 
              itself.
            </p>

            <div className={styles.architectureDiagram}>
              <div className={styles.archTitle}>System Architecture Overview</div>
              <div className={styles.archLayers}>
                <div className={styles.archLayer}>
                  <span className={styles.archLabel}>Client Layer</span>
                  <div className={styles.archComponents}>
                    <div className={styles.archComponent}>
                      <span className={styles.compIcon}>🌐</span>
                      <span>Web Browser</span>
                    </div>
                    <div className={styles.archComponent}>
                      <span className={styles.compIcon}>📱</span>
                      <span>Mobile Web</span>
                    </div>
                  </div>
                </div>
                <div className={styles.archConnector}>
                  <div className={styles.connectorLabel}>HTTPS</div>
                </div>
                <div className={styles.archLayer}>
                  <span className={styles.archLabel}>Edge Layer</span>
                  <div className={styles.archComponents}>
                    <div className={styles.archComponent}>
                      <span className={styles.compIcon}>⚡</span>
                      <span>Vercel Edge</span>
                    </div>
                    <div className={styles.archComponent}>
                      <span className={styles.compIcon}>🔒</span>
                      <span>SSL/CDN</span>
                    </div>
                  </div>
                </div>
                <div className={styles.archConnector}>
                  <div className={styles.connectorLabel}>Serverless Functions</div>
                </div>
                <div className={styles.archLayer}>
                  <span className={styles.archLabel}>Application Layer</span>
                  <div className={styles.archComponents}>
                    <div className={styles.archComponent}>
                      <span className={styles.compIcon}>⚛️</span>
                      <span>Next.js 14</span>
                    </div>
                    <div className={styles.archComponent}>
                      <span className={styles.compIcon}>🛣️</span>
                      <span>API Routes</span>
                    </div>
                  </div>
                </div>
                <div className={styles.archConnector}>
                  <div className={styles.connectorLabel}>Database Connection</div>
                </div>
                <div className={styles.archLayer}>
                  <span className={styles.archLabel}>Data Layer</span>
                  <div className={styles.archComponents}>
                    <div className={styles.archComponent}>
                      <span className={styles.compIcon}>🐘</span>
                      <span>Neon PostgreSQL</span>
                    </div>
                    <div className={styles.archComponent}>
                      <span className={styles.compIcon}>💾</span>
                      <span>Local Storage</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <h3 className={styles.subsectionTitle}>The Tools That Made It Possible</h3>

            <div className={styles.techAnalysis}>
              <div className={styles.techCard}>
                <div className={styles.techHeader}>
                  <div className={styles.techLogo}>⚡</div>
                  <div className={styles.techInfo}>
                    <h4>Next.js 14</h4>
                    <span className={styles.techCategory}>Framework</span>
                  </div>
                </div>
                <div className={styles.techBody}>
                  <p>
                    The backbone of everything. Server-side rendering for fast initial loads, 
                    API routes for the proxy layer, and excellent developer experience. The App 
                    Router made complex layouts trivial.
                  </p>
                </div>
              </div>

              <div className={styles.techCard}>
                <div className={styles.techHeader}>
                  <div className={styles.techLogo}>🔷</div>
                  <div className={styles.techInfo}>
                    <h4>TypeScript</h4>
                    <span className={styles.techCategory}>Language</span>
                  </div>
                </div>
                <div className={styles.techBody}>
                  <p>
                    Type safety was non-negotiable for a project this complex. TypeScript caught 
                    countless bugs before they reached production and made refactoring fearless.
                  </p>
                </div>
              </div>

              <div className={styles.techCard}>
                <div className={styles.techHeader}>
                  <div className={styles.techLogo}>🐘</div>
                  <div className={styles.techInfo}>
                    <h4>Neon PostgreSQL</h4>
                    <span className={styles.techCategory}>Database</span>
                  </div>
                </div>
                <div className={styles.techBody}>
                  <p>
                    Serverless PostgreSQL with a generous free tier. Real database reliability 
                    without the operational burden. Three gigabytes of storage at zero cost.
                  </p>
                </div>
              </div>

              <div className={styles.techCard}>
                <div className={styles.techHeader}>
                  <div className={styles.techLogo}>📺</div>
                  <div className={styles.techInfo}>
                    <h4>HLS.js</h4>
                    <span className={styles.techCategory}>Video Player</span>
                  </div>
                </div>
                <div className={styles.techBody}>
                  <p>
                    The industry standard for adaptive bitrate streaming. Handles manifest parsing, 
                    quality switching, and buffer management so I could focus on the user experience.
                  </p>
                </div>
              </div>
            </div>
          </section>


          {/* Implementation */}
          <section id="implementation" className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNumber}>VI</span>
              <h2>Making It Work</h2>
            </div>

            <p className={styles.leadParagraph}>
              The architecture is one thing. Actually making streams play in a browser without 
              the malware wrapper is another challenge entirely. Here is how the pieces fit together.
            </p>

            <h3 className={styles.subsectionTitle}>The Streaming Pipeline</h3>
            <p>
              Flyx does not host any content. It cannot—that would be both illegal and prohibitively 
              expensive. Instead, it acts as an intelligent aggregator that discovers streams from 
              various providers and presents them through a clean, unified player.
            </p>

            <div className={styles.codeBlock}>
              <div className={styles.codeHeader}>
                <span className={styles.codeLanguage}>TypeScript</span>
                <span className={styles.codeTitle}>Simplified Stream Extraction</span>
              </div>
              <pre className={styles.code}>{`async function getStream(contentId: string): Promise<Stream> {
  // Try each provider in order of reliability
  for (const provider of PROVIDERS) {
    try {
      // 1. Fetch the embed page
      const html = await fetchWithHeaders(provider.getUrl(contentId));
      
      // 2. Run provider-specific deobfuscation
      const decoded = provider.decode(html);
      
      // 3. Extract the actual stream URL
      const streamUrl = provider.extractUrl(decoded);
      
      // 4. Verify it actually works
      if (await verifyStream(streamUrl)) {
        return { url: streamUrl, provider: provider.name };
      }
    } catch {
      continue; // Try next provider
    }
  }
  throw new Error('No working stream found');
}`}</pre>
            </div>

            <h3 className={styles.subsectionTitle}>The Proxy Layer</h3>
            <p>
              Browsers are paranoid about cross-origin requests, and for good reason. But this 
              paranoia creates a problem: stream providers set headers that block direct access 
              from other domains. The solution is a proxy layer that fetches streams server-side 
              and relays them to the browser.
            </p>
            <p>
              Every stream request goes through my API routes. The browser thinks it is talking 
              to my server. My server handles the cross-origin negotiation, header spoofing, and 
              referrer manipulation that makes the streams actually play.
            </p>

            <h3 className={styles.subsectionTitle}>Analytics Without Surveillance</h3>
            <p>
              I wanted to understand how people use the platform without becoming the thing I was 
              fighting against. The solution: anonymized, aggregate analytics only.
            </p>
            <p>
              No personal information. No cross-session tracking. No fingerprinting. Just anonymous 
              session identifiers, aggregate usage statistics, and content interaction data. Enough 
              to understand what is working and what is not, without knowing who anyone is.
            </p>

            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>📊</div>
                <div className={styles.statValue}>50K+</div>
                <div className={styles.statLabel}>Lines of Code</div>
                <div className={styles.statDetail}>TypeScript, CSS, SQL</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>🧩</div>
                <div className={styles.statValue}>150+</div>
                <div className={styles.statLabel}>Components</div>
                <div className={styles.statDetail}>Reusable UI elements</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>🛣️</div>
                <div className={styles.statValue}>40+</div>
                <div className={styles.statLabel}>API Routes</div>
                <div className={styles.statDetail}>Proxy and data endpoints</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>🗄️</div>
                <div className={styles.statValue}>15+</div>
                <div className={styles.statLabel}>Database Tables</div>
                <div className={styles.statDetail}>Normalized schema</div>
              </div>
            </div>
          </section>

          {/* The Heist */}
          <section id="heist" className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNumber}>VII</span>
              <h2>The Heist: Stealing from the Thieves</h2>
            </div>

            <p className={styles.leadParagraph}>
              Here is the delicious irony at the heart of this project: the streaming providers I 
              needed to crack are not legitimate businesses. They are pirates themselves—profiting 
              from content they do not own by wrapping it in malware, pop-ups, and crypto miners. 
              My job was to break into their systems and steal what they had already stolen, then 
              serve it without the exploitation. Robbing the robbers.
            </p>

            <div className={styles.citationBox}>
              <div className={styles.citationMark}>&quot;</div>
              <blockquote>
                These sites make millions from advertisements and malware while hiding behind layers 
                of obfuscation that would make nation-state hackers proud. They are not protecting 
                intellectual property—they are protecting their revenue stream from people like me 
                who want to give users the content without the cancer.
              </blockquote>
              <cite>— 3 AM, staring at minified JavaScript</cite>
            </div>

            <h3 className={styles.subsectionTitle}>The Battlefield</h3>
            <p>
              Picture this: you find a pirate streaming site. It works. Videos play. But when you 
              try to extract the actual stream URL to use in your own player—to strip away the 
              pop-ups and malware—you hit a wall. Not just one wall. A fortress of walls, each 
              more devious than the last.
            </p>

            <div className={styles.challengesList}>
              <div className={styles.challengeItem}>
                <div className={styles.challengeHeader}>
                  <span className={styles.challengeIcon}>🔐</span>
                  <h4>The Code Spaghetti Monster</h4>
                </div>
                <div className={styles.challengeBody}>
                  <p>
                    Open DevTools on any pirate site and look at their JavaScript. It is not code—it 
                    is a war crime. Variable names like <code>_0x4a3f</code> and <code>_0xb7c2</code>. 
                    Strings split into arrays of character codes, reassembled through twelve layers 
                    of function calls. Control flow that looks like someone threw spaghetti at a wall 
                    and called it architecture. And the crown jewel: <code>eval()</code> statements 
                    that generate more obfuscated code at runtime.
                  </p>
                  <div className={styles.solutionBox}>
                    <strong>The Break-In:</strong> I built a deobfuscation pipeline. Intercept every 
                    <code>eval()</code>, log what it produces. Trace string operations backwards. 
                    Write AST transformers that rename variables based on how they are used. Slowly, 
                    painfully, the gibberish becomes readable.
                  </div>
                </div>
              </div>

              <div className={styles.challengeItem}>
                <div className={styles.challengeHeader}>
                  <span className={styles.challengeIcon}>⏱️</span>
                  <h4>The Ticking Clock</h4>
                </div>
                <div className={styles.challengeBody}>
                  <p>
                    Found the stream URL? Great. It expires in ninety seconds. Every request needs a 
                    fresh token computed from the current timestamp, the content ID, and a secret 
                    key buried somewhere in fifty thousand lines of obfuscated JavaScript. Copy and 
                    paste the URL? Dead on arrival.
                  </p>
                  <div className={styles.solutionBox}>
                    <strong>The Break-In:</strong> Hours of stepping through minified code in the 
                    debugger, watching variables change, mapping the flow of data. Eventually you 
                    find it: they are using HMAC-SHA256 with a hardcoded key hidden in a fake jQuery 
                    plugin. Extract the key, reimplement the algorithm server-side, generate tokens 
                    on demand.
                  </div>
                </div>
              </div>

              <div className={styles.challengeItem}>
                <div className={styles.challengeHeader}>
                  <span className={styles.challengeIcon}>🤖</span>
                  <h4>The Bot Hunters</h4>
                </div>
                <div className={styles.challengeBody}>
                  <p>
                    These sites hate automation. They check if you are running headless Chrome. They 
                    analyze your mouse movements for human-like patterns. They fingerprint your 
                    WebGL renderer, your canvas, your audio context. Fail any check and you get a 
                    fake stream that plays for thirty seconds then dies—or worse, an IP ban.
                  </p>
                  <div className={styles.solutionBox}>
                    <strong>The Break-In:</strong> The real victory was realizing I could skip their 
                    JavaScript entirely. Their bot detection runs client-side—if I never execute 
                    their code, I never trigger their checks. Pure HTTP requests, carefully crafted 
                    headers, surgical extraction.
                  </div>
                </div>
              </div>

              <div className={styles.challengeItem}>
                <div className={styles.challengeHeader}>
                  <span className={styles.challengeIcon}>🪆</span>
                  <h4>The Russian Nesting Dolls</h4>
                </div>
                <div className={styles.challengeBody}>
                  <p>
                    Click play on a pirate site. The video loads in an iframe. That iframe loads 
                    another iframe from a different domain. Which loads another iframe. The actual 
                    player is four layers deep, each layer on a different domain with different 
                    CORS policies, each performing its own validation.
                  </p>
                  <div className={styles.solutionBox}>
                    <strong>The Break-In:</strong> Map the entire chain. Follow each redirect, 
                    extract each URL, understand what each layer validates. Build a system that 
                    traverses the whole maze automatically, spoofing referrers at each hop.
                  </div>
                </div>
              </div>
            </div>

            <h3 className={styles.subsectionTitle}>War Stories</h3>
            <p>
              Every provider was a different puzzle. Different obfuscation, different tricks, 
              different ways to make my life difficult. Here are the ones that nearly broke me.
            </p>

            <div className={styles.techAnalysis}>
              <div className={styles.techCard}>
                <div className={styles.techHeader}>
                  <div className={styles.techLogo}>🎯</div>
                  <div className={styles.techInfo}>
                    <h4>The 2Embed Labyrinth</h4>
                    <span className={styles.techCategory}>Three weeks to crack</span>
                  </div>
                </div>
                <div className={styles.techBody}>
                  <p>
                    A hydra of domains—streamsrcs, embedsrcs, vidsrc—each redirecting to the next, 
                    each generating new tokens. The final player used a packing algorithm I had 
                    never seen before: strings shattered into individual characters stored in arrays, 
                    reassembled through a maze of function calls.
                  </p>
                  <p>
                    <strong>The Breakthrough:</strong> Three in the morning on a Tuesday. I noticed 
                    the packing seed was derived from the TMDB ID in a predictable way. Extraction 
                    dropped from five seconds with browser automation to 180 milliseconds with pure 
                    HTTP requests.
                  </p>
                </div>
              </div>

              <div className={styles.techCard}>
                <div className={styles.techHeader}>
                  <div className={styles.techLogo}>🎭</div>
                  <div className={styles.techInfo}>
                    <h4>SuperEmbed&apos;s Decoy Trap</h4>
                    <span className={styles.techCategory}>The one that fought back</span>
                  </div>
                </div>
                <div className={styles.techBody}>
                  <p>
                    Their cruelest trick: decoy streams. Fail their bot detection and they do not 
                    block you—they give you a stream that works perfectly for exactly thirty seconds, 
                    then dies. You think you have won. You deploy your code. Users start complaining.
                  </p>
                  <p>
                    <strong>The Breakthrough:</strong> I stopped trying to fool their JavaScript and 
                    started ignoring it entirely. The validation happened client-side, but the actual 
                    stream endpoint just needed the right parameters. Direct HTTP request, no browser, 
                    no bot detection.
                  </p>
                </div>
              </div>
            </div>

            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>🔓</div>
                <div className={styles.statValue}>15+</div>
                <div className={styles.statLabel}>Obfuscation Schemes</div>
                <div className={styles.statDetail}>Cracked and documented</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>⚡</div>
                <div className={styles.statValue}>180ms</div>
                <div className={styles.statLabel}>Extraction Time</div>
                <div className={styles.statDetail}>Down from 5+ seconds</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>🎯</div>
                <div className={styles.statValue}>95%+</div>
                <div className={styles.statLabel}>Success Rate</div>
                <div className={styles.statDetail}>First-try extraction</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>☕</div>
                <div className={styles.statValue}>∞</div>
                <div className={styles.statLabel}>Coffee Consumed</div>
                <div className={styles.statDetail}>During 3 AM sessions</div>
              </div>
            </div>

            <h3 className={styles.subsectionTitle}>Why This Matters</h3>
            <p>
              This is not just a technical flex. The reverse engineering work is the entire reason 
              Flyx can exist as an ethical alternative. Without cracking these providers, I would 
              have two choices: host content myself (illegal and expensive) or embed their players 
              directly (bringing all their malware with them).
            </p>
            <p>
              By extracting just the stream URLs and serving them through my own clean player, I 
              can offer users the content they want without the exploitation they have learned to 
              accept as inevitable. Every time someone watches a movie on Flyx without getting a 
              pop-up, without having their CPU hijacked—that is the reverse engineering paying off.
            </p>
          </section>


          {/* Results */}
          <section id="results" className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNumber}>VIII</span>
              <h2>Did It Work?</h2>
            </div>

            <p className={styles.leadParagraph}>
              So did it work? Can you actually build an ethical streaming platform? The answer is 
              yes—with caveats. Here is what I learned.
            </p>

            <div className={styles.findingsGrid}>
              <div className={styles.findingCard}>
                <div className={styles.findingNumber}>1</div>
                <div className={styles.findingContent}>
                  <h4>The Exploitation Is Optional</h4>
                  <p>
                    Flyx works. No advertisements, no tracking, no malware. Streams play. Users 
                    watch movies. Every pirate site that serves pop-ups is making a choice—they 
                    could do better. They just do not want to.
                  </p>
                </div>
              </div>
              <div className={styles.findingCard}>
                <div className={styles.findingNumber}>2</div>
                <div className={styles.findingContent}>
                  <h4>Free Infrastructure Exists</h4>
                  <p>
                    I spent zero dollars. Vercel&apos;s free tier handles the traffic. Neon&apos;s 
                    free tier handles the database. The &quot;we need ad revenue for servers&quot; 
                    excuse is a lie.
                  </p>
                </div>
              </div>
              <div className={styles.findingCard}>
                <div className={styles.findingNumber}>3</div>
                <div className={styles.findingContent}>
                  <h4>Privacy Does Not Kill Features</h4>
                  <p>
                    Watch progress syncs without accounts. Analytics work without fingerprinting. 
                    Privacy and functionality are not enemies—they can coexist.
                  </p>
                </div>
              </div>
              <div className={styles.findingCard}>
                <div className={styles.findingNumber}>4</div>
                <div className={styles.findingContent}>
                  <h4>One Person Can Do This</h4>
                  <p>
                    No team. No funding. No special access. Just a developer with a laptop and 
                    too much free time. The excuse that &quot;it is too hard&quot; does not hold.
                  </p>
                </div>
              </div>
            </div>

            <h3 className={styles.subsectionTitle}>The Challenges That Remain</h3>

            <div className={styles.challengesList}>
              <div className={styles.challengeItem}>
                <div className={styles.challengeHeader}>
                  <span className={styles.challengeIcon}>💀</span>
                  <h4>Streams Die Constantly</h4>
                </div>
                <div className={styles.challengeBody}>
                  <p>
                    Third-party streams are unreliable. URLs expire. Servers go down. Quality 
                    fluctuates. One day everything works; the next day half your content is broken.
                  </p>
                  <div className={styles.solutionBox}>
                    <strong>The Solution:</strong> Multi-source fallback. The player tries multiple 
                    providers for each piece of content, automatically switching when one fails. 
                    Redundancy is survival.
                  </div>
                </div>
              </div>

              <div className={styles.challengeItem}>
                <div className={styles.challengeHeader}>
                  <span className={styles.challengeIcon}>🔄</span>
                  <h4>The Cat-and-Mouse Game</h4>
                </div>
                <div className={styles.challengeBody}>
                  <p>
                    Providers update their obfuscation. Domains get rotated. New bot detection 
                    checks get added. The extraction that worked yesterday returns garbage today. 
                    It is a constant arms race.
                  </p>
                  <div className={styles.solutionBox}>
                    <strong>The Solution:</strong> Modular architecture. Each provider has its own 
                    adapter that can be updated independently. Automated health checks alert me 
                    when success rates drop.
                  </div>
                </div>
              </div>
            </div>

            <h3 className={styles.subsectionTitle}>Performance</h3>
            <p>
              Despite the complexity, the platform performs well. Lighthouse scores consistently 
              hit ninety or above across all categories.
            </p>

            <div className={styles.performanceGrid}>
              <div className={styles.perfCard}>
                <div className={styles.perfScore} style={{background: 'conic-gradient(#22c55e 0deg 324deg, #1e293b 324deg 360deg)'}}>
                  <span>90</span>
                </div>
                <div className={styles.perfLabel}>Performance</div>
              </div>
              <div className={styles.perfCard}>
                <div className={styles.perfScore} style={{background: 'conic-gradient(#22c55e 0deg 342deg, #1e293b 342deg 360deg)'}}>
                  <span>95</span>
                </div>
                <div className={styles.perfLabel}>Accessibility</div>
              </div>
              <div className={styles.perfCard}>
                <div className={styles.perfScore} style={{background: 'conic-gradient(#22c55e 0deg 360deg, #1e293b 360deg 360deg)'}}>
                  <span>100</span>
                </div>
                <div className={styles.perfLabel}>Best Practices</div>
              </div>
              <div className={styles.perfCard}>
                <div className={styles.perfScore} style={{background: 'conic-gradient(#22c55e 0deg 324deg, #1e293b 324deg 360deg)'}}>
                  <span>90</span>
                </div>
                <div className={styles.perfLabel}>SEO</div>
              </div>
            </div>
          </section>

          {/* Conclusion */}
          <section id="conclusion" className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNumber}>IX</span>
              <h2>The Point</h2>
            </div>

            <p className={styles.leadParagraph}>
              So here we are. I built a streaming platform. It works. It does not assault you with 
              pop-ups. It does not mine cryptocurrency on your CPU. It does not track you across 
              the web. It does not have fake close buttons or dark patterns or any of the other 
              exploitative garbage that pirate streaming sites have normalized.
            </p>

            <p>
              And I did it alone. Part-time. With no money. Using free tools and stolen hours and 
              far too much coffee.
            </p>

            <p>
              That is the point. Not that I am special—I am not. The point is that if one person 
              can do this under these constraints, then every pirate streaming site that serves 
              malware is making a choice. They could do better. They could treat users like humans 
              instead of revenue sources. They choose not to because exploitation is more profitable 
              than ethics.
            </p>

            <div className={styles.conclusionQuote}>
              <div className={styles.quoteDecoration}>
                <span>&quot;</span>
              </div>
              <blockquote>
                The pop-ups are not necessary. The crypto miners are not necessary. The tracking 
                is not necessary. They are choices. And those choices tell you everything you need 
                to know about the people making them.
              </blockquote>
              <cite>— Vynx</cite>
            </div>

            <p>
              To the users: you deserve better. You do not have to accept malware as the price of 
              free content. Alternatives can exist.
            </p>

            <p>
              To the developers: if you have the skills to build something, build something good. 
              The world has enough exploitative garbage. Be better.
            </p>

            <p>
              To the operators of pirate streaming sites: I see you. I know what you are doing. 
              And I built this specifically to prove that you do not have to do it. Your greed is 
              a choice, and that choice defines you.
            </p>

            <p>
              Flyx exists because I got tired of watching the internet get worse. It is a small 
              thing—one platform, one developer, one statement. But it is proof that better is 
              possible. And sometimes, proof is enough.
            </p>
          </section>


          {/* Legal */}
          <section id="legal" className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNumber}>X</span>
              <h2>Legal Stuff</h2>
            </div>

            <div className={styles.legalPreamble}>
              <div className={styles.legalIcon}>⚖️</div>
              <div className={styles.legalPreambleContent}>
                <h3>Terms of Service</h3>
                <p>
                  The following terms constitute a binding agreement between you and Flyx. By 
                  accessing or using the platform, you acknowledge that you have read, understood, 
                  and agree to be bound by these terms.
                </p>
                <div className={styles.legalMeta}>
                  <span><strong>Effective:</strong> November 2025</span>
                  <span><strong>Version:</strong> 1.0</span>
                </div>
              </div>
            </div>

            <div className={styles.legalContainer}>
              <div className={styles.legalArticle}>
                <div className={styles.articleHeader}>
                  <div className={styles.articleBadge}>Article 1</div>
                  <h4>Nature of Service</h4>
                </div>
                <div className={styles.articleContent}>
                  <div className={styles.legalClause}>
                    <span className={styles.clauseNumber}>1.1</span>
                    <p>
                      Flyx is a personal, non-commercial technology demonstration project created 
                      solely for educational, research, and portfolio purposes.
                    </p>
                  </div>
                  <div className={styles.legalClause}>
                    <span className={styles.clauseNumber}>1.2</span>
                    <p>
                      The platform does not constitute a commercial streaming service and is not 
                      intended to compete with or replace any licensed streaming platform.
                    </p>
                  </div>
                  <div className={styles.legalClause}>
                    <span className={styles.clauseNumber}>1.3</span>
                    <p>
                      No fees are charged for access. The project generates no revenue and operates 
                      at zero profit.
                    </p>
                  </div>
                </div>
              </div>

              <div className={styles.legalArticle}>
                <div className={styles.articleHeader}>
                  <div className={styles.articleBadge}>Article 2</div>
                  <h4>Content Disclaimer</h4>
                </div>
                <div className={styles.articleContent}>
                  <div className={styles.legalClause}>
                    <span className={styles.clauseNumber}>2.1</span>
                    <p>
                      The platform does not host, store, upload, transmit, or distribute any video 
                      content or media files on its servers.
                    </p>
                  </div>
                  <div className={styles.legalClause}>
                    <span className={styles.clauseNumber}>2.2</span>
                    <p>
                      All media content accessible through the platform is sourced from third-party 
                      providers over which we exercise no control.
                    </p>
                  </div>
                  <div className={styles.legalClause}>
                    <span className={styles.clauseNumber}>2.3</span>
                    <p>
                      The platform functions as a technical interface that facilitates access to 
                      content hosted elsewhere on the internet.
                    </p>
                  </div>
                </div>
              </div>

              <div className={styles.legalArticle}>
                <div className={styles.articleHeader}>
                  <div className={styles.articleBadge}>Article 3</div>
                  <h4>Privacy</h4>
                </div>
                <div className={styles.articleContent}>
                  <div className={styles.privacyHighlight}>
                    <div className={styles.privacyIcon}>🔐</div>
                    <div className={styles.privacyContent}>
                      <h5>Our Commitment</h5>
                      <p>
                        We employ anonymized tracking for analytics purposes only and do not 
                        collect personally identifiable information.
                      </p>
                    </div>
                  </div>
                  <div className={styles.privacyGrid}>
                    <div className={styles.privacyCard}>
                      <span className={styles.privacyCardIcon}>✓</span>
                      <h5>What We Do Not Collect</h5>
                      <ul>
                        <li>Names or email addresses</li>
                        <li>Physical addresses</li>
                        <li>Phone numbers</li>
                        <li>Payment information</li>
                        <li>Government identifiers</li>
                      </ul>
                    </div>
                    <div className={styles.privacyCard}>
                      <span className={styles.privacyCardIcon}>📊</span>
                      <h5>What We Do Collect</h5>
                      <ul>
                        <li>Anonymous session identifiers</li>
                        <li>Aggregate usage statistics</li>
                        <li>Content interaction data</li>
                        <li>Technical performance metrics</li>
                        <li>Anonymized error logs</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.legalArticle}>
                <div className={styles.articleHeader}>
                  <div className={styles.articleBadge}>Article 4</div>
                  <h4>Disclaimer of Warranties</h4>
                </div>
                <div className={styles.articleContent}>
                  <div className={styles.legalWarning}>
                    <div className={styles.warningIcon}>⚠️</div>
                    <div className={styles.warningContent}>
                      <p>
                        THE PLATFORM IS PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; 
                        BASIS WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.legalFooter}>
                <div className={styles.legalFooterContent}>
                  <p className={styles.legalAcknowledgment}>
                    By accessing or using Flyx, you acknowledge that you have read this Legal 
                    Framework and agree to be bound by its provisions.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* References */}
          <section id="references" className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNumber}>XI</span>
              <h2>References</h2>
            </div>

            <div className={styles.referencesContainer}>
              <div className={styles.referenceItem}>
                <span className={styles.refNumber}>[1]</span>
                <p>
                  Rafique, M. Z., et al. (2016). It&apos;s free for a reason: Exploring the ecosystem 
                  of free live streaming services. <em>Network and Distributed System Security 
                  Symposium (NDSS)</em>.
                </p>
              </div>
              <div className={styles.referenceItem}>
                <span className={styles.refNumber}>[2]</span>
                <p>
                  Konoth, R. K., et al. (2018). MineSweeper: An in-depth look into drive-by 
                  cryptocurrency mining and its defense. <em>ACM Conference on Computer and 
                  Communications Security (CCS)</em>.
                </p>
              </div>
              <div className={styles.referenceItem}>
                <span className={styles.refNumber}>[3]</span>
                <p>
                  Laperdrix, P., et al. (2020). Browser fingerprinting: A survey. <em>ACM 
                  Transactions on the Web</em>, 14(2), 1-33.
                </p>
              </div>
              <div className={styles.referenceItem}>
                <span className={styles.refNumber}>[4]</span>
                <p>
                  Gray, C. M., et al. (2018). The dark (patterns) side of UX design. <em>CHI 
                  Conference on Human Factors in Computing Systems</em>, 1-14.
                </p>
              </div>
              <div className={styles.referenceItem}>
                <span className={styles.refNumber}>[5]</span>
                <p>
                  Mathur, A., et al. (2019). Dark patterns at scale: Findings from a crawl of 
                  11K shopping websites. <em>ACM Human-Computer Interaction</em>, 3(CSCW), 1-32.
                </p>
              </div>
              <div className={styles.referenceItem}>
                <span className={styles.refNumber}>[6]</span>
                <p>
                  Stockhammer, T. (2011). Dynamic adaptive streaming over HTTP: standards and 
                  design principles. <em>ACM Conference on Multimedia Systems</em>, 133-144.
                </p>
              </div>
            </div>
          </section>
        </article>
      </div>

      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <Link href="/" className={styles.backButton}>
            <span className={styles.backArrow}>←</span>
            <span>Return to Platform</span>
          </Link>
          <div className={styles.footerInfo}>
            <p className={styles.footerTitle}>Flyx</p>
            <p className={styles.footerSubtitle}>Built by Vynx • Proving Ethical Streaming Is Possible • 2025</p>
          </div>
          <div className={styles.footerMeta}>
            <span>No Ads • No Tracking • No Exploitation</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import styles from './about.module.css';

export default function AboutPage() {
  const [activeSection, setActiveSection] = useState('abstract');
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const sectionIds = [
    'abstract', 'introduction', 'literature', 'methodology', 'architecture',
    'implementation', 'evaluation', 'discussion', 'reverse-engineering',
    'future', 'conclusion', 'legal', 'references'
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

  // Intersection Observer to track which section is currently visible
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-20% 0px -70% 0px', // Trigger when section is in top 30% of viewport
        threshold: 0
      }
    );

    // Observe all sections
    sectionIds.forEach((id) => {
      const element = document.getElementById(id);
      if (element && observerRef.current) {
        observerRef.current.observe(element);
      }
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  const tableOfContents = [
    { id: 'abstract', label: 'Abstract', number: 'I' },
    { id: 'introduction', label: 'Introduction', number: 'II' },
    { id: 'literature', label: 'Know Your Enemy', number: 'III' },
    { id: 'methodology', label: 'How I Built This', number: 'IV' },
    { id: 'architecture', label: 'The Tech Stack', number: 'V' },
    { id: 'implementation', label: 'Implementation', number: 'VI' },
    { id: 'evaluation', label: 'Results', number: 'VII' },
    { id: 'discussion', label: 'What I Proved', number: 'VIII' },
    { id: 'reverse-engineering', label: 'The Heist', number: 'IX' },
    { id: 'future', label: 'What\'s Next', number: 'X' },
    { id: 'conclusion', label: 'The Point', number: 'XI' },
    { id: 'legal', label: 'Legal Stuff', number: 'XII' },
    { id: 'references', label: 'References', number: 'XIII' },
  ];

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className={styles.container}>
      {/* Progress Bar */}
      <div className={styles.progressBar} style={{ width: `${scrollProgress}%` }} />

      {/* Academic Header */}
      <header className={styles.header}>
        <div className={styles.headerDecoration}>
          <div className={styles.decorLine} />
          <div className={styles.decorDiamond} />
          <div className={styles.decorLine} />
        </div>
        
        <div className={styles.headerContent}>
          <div className={styles.journalInfo}>
            <span className={styles.journalName}>Journal of Independent Software Engineering</span>
            <span className={styles.journalMeta}>Vol. 1, No. 1 • November 2025 • pp. 1-47</span>
          </div>
          
          <h1 className={styles.title}>
            Flyx: An Empirical Study in Solo Development of Production-Grade Streaming Infrastructure
          </h1>
          
          <p className={styles.subtitle}>
            Investigating the Feasibility of Individual Development of Complex Web Applications 
            Through Modern Tooling, Serverless Architecture, and Open-Source Ecosystems
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
                <span className={styles.authorEmail}>Full-Stack Engineer & System Architect</span>
              </div>
            </div>
          </div>

          <div className={styles.paperMeta}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Received</span>
              <span className={styles.metaValue}>September 1, 2025</span>
            </div>
            <div className={styles.metaDivider} />
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Revised</span>
              <span className={styles.metaValue}>October 15, 2025</span>
            </div>
            <div className={styles.metaDivider} />
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Accepted</span>
              <span className={styles.metaValue}>November 1, 2025</span>
            </div>
            <div className={styles.metaDivider} />
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Reading Time</span>
              <span className={styles.metaValue}>~35 minutes</span>
            </div>
          </div>
        </div>
        
        <div className={styles.headerGlow} />
      </header>

      {/* Main Content */}
      <div className={styles.mainLayout}>
        {/* Table of Contents Sidebar */}
        <aside className={`${styles.sidebar} ${isNavCollapsed ? styles.sidebarCollapsed : ''}`}>
          <div className={styles.tocContainer}>
            <div className={styles.tocHeader}>
              <h3 className={styles.tocTitle}>Table of Contents</h3>
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
            <div className={styles.tocFooter}>
              <span className={styles.wordCount}>~12,500 words</span>
            </div>
          </div>
        </aside>

        {/* Article Content */}
        <article className={styles.article}>

          {/* Abstract */}
          <section id="abstract" className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNumber}>I</span>
              <h2>Abstract</h2>
            </div>
            <div className={styles.abstractBox}>
              <p>
                Let me tell you about the time I decided to build a streaming platform that doesn't 
                treat its users like garbage. Every pirate streaming site on the internet has the same 
                business model: bombard visitors with pop-ups, mine crypto on their CPUs, track them 
                across the web, and serve malware disguised as "HD Player Download" buttons. Users 
                have accepted this as the price of free content. I wanted to prove them wrong.
              </p>
              <p>
                Flyx is a fully-functional streaming platform—movies, TV shows, live television—built 
                by one person, running on free infrastructure, with zero ads, zero tracking, and zero 
                bullshit. No pop-ups. No crypto miners. No fingerprinting. No dark patterns. Just 
                content, delivered cleanly, the way it should be. This document tells the story of 
                how it was built, the technical challenges overcome, and why it matters that it exists.
              </p>
              <div className={styles.keywordsSection}>
                <div className={styles.keywordsHeader}>
                  <span className={styles.keywordIcon}>🏷️</span>
                  <span className={styles.keywordLabel}>Keywords</span>
                </div>
                <div className={styles.keywordsList}>
                  <span className={styles.keyword}>Reverse Engineering</span>
                  <span className={styles.keyword}>Stream Extraction</span>
                  <span className={styles.keyword}>Anti-Exploitation</span>
                  <span className={styles.keyword}>Next.js</span>
                  <span className={styles.keyword}>Serverless</span>
                  <span className={styles.keyword}>HLS Streaming</span>
                  <span className={styles.keyword}>Solo Dev</span>
                  <span className={styles.keyword}>Ethical Piracy</span>
                </div>
              </div>
            </div>
          </section>

          {/* Introduction */}
          <section id="introduction" className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNumber}>II</span>
              <h2>Introduction</h2>
            </div>
            
            <h3 className={styles.subsectionTitle}>2.1 The Hellscape of Free Streaming</h3>
            <p className={styles.leadParagraph}>
              Try to watch a movie for free on the internet. Go ahead. Click on any of the top results. 
              Within seconds, you'll experience: a pop-up ad. Then another. A fake "close" button that 
              opens three more tabs. A notification asking if you want to allow push notifications 
              (you don't). A video player that requires you to "disable your ad blocker" (it's lying). 
              And somewhere in the background, your CPU is now mining Monero for someone in Eastern Europe.
            </p>
            <p>
              This isn't an accident. This is the business model. These sites make money by treating 
              you as the product. Your attention gets sold to advertisers. Your computing power gets 
              stolen for crypto mining. Your browser fingerprint gets sold to data brokers. Your 
              clicks on fake buttons generate affiliate revenue. You wanted to watch a movie; they 
              wanted to extract every possible cent from your visit.
            </p>
            <p>
              The implicit message is clear: free content requires exploitation. If you're not paying 
              important question: can a streaming platform provide free access to content while treating 
              users with respect? Can we build something that doesn't assault visitors with ads, doesn't 
              track their behavior across the web, doesn't mine cryptocurrency on their devices, and 
              doesn't employ deceptive interfaces designed to generate accidental clicks?
            </p>

            <p>
              with money, you pay with your security, your privacy, your sanity. That's the deal. 
              Take it or leave it.
            </p>
            <p>
              I decided to leave it. And then build something better.
            </p>

            <div className={styles.highlightBox}>
              <div className={styles.highlightIcon}>🎯</div>
              <div className={styles.highlightContent}>
                <h4>The Mission</h4>
                <p>
                  Prove that free streaming doesn't require exploitation. Build a platform that treats 
                  users like humans instead of revenue sources. Show that the malware, the pop-ups, 
                  the crypto miners—they're not necessary. They're a choice. A greedy, shitty choice.
                </p>
              </div>
            </div>

            <h3 className={styles.subsectionTitle}>2.2 The Rules I Set</h3>
            <p>
              Before writing a single line of code, I established the rules. Non-negotiable. The 
              platform would have: zero advertisements (not even "tasteful" ones), zero tracking 
              cookies, zero fingerprinting, zero crypto mining, zero pop-ups, zero fake buttons, 
              zero dark patterns, zero collection of personal information, zero selling of user data.
            </p>
            <p>
              If I couldn't build it without breaking these rules, I wouldn't build it at all. The 
              whole point was to prove it could be done ethically. Compromising on ethics would 
              defeat the purpose entirely.
            </p>

            <h3 className={styles.subsectionTitle}>2.3 What This Document Covers</h3>
            <ul className={styles.contributionList}>
              <li>
                <strong>The Technical Journey:</strong> How I built a production streaming platform 
                from scratch, alone, with no budget, in my spare time.
              </li>
              <li>
                <strong>The Reverse Engineering:</strong> How I cracked the obfuscation and security 
                of pirate streaming providers to extract clean streams without their malware.
              </li>
              <li>
                <strong>The Architecture:</strong> The technical decisions that make it all work—
                serverless, edge computing, proxy layers, and more.
              </li>
              <li>
                <strong>The Proof:</strong> Evidence that ethical streaming is possible, and that 
                the exploitation is a choice, not a necessity.
              </li>
            </ul>
          </section>

          {/* Literature Review */}
          <section id="literature" className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNumber}>III</span>
              <h2>Know Your Enemy</h2>
            </div>

            <h3 className={styles.subsectionTitle}>3.1 How Pirate Sites Actually Make Money</h3>
            <p>
              Let's talk about the enemy. Pirate streaming sites aren't charities—they're businesses. 
              Very profitable businesses. And their product is you. Here's how the money flows:
            </p>
            <p>
              <strong>Malvertising:</strong> Those pop-ups aren't just annoying—they're malicious. 
              Studies show over 50% of visitors to major pirate sites get served actual malware. 
              The ad networks that work with these sites have zero standards. Scams, ransomware, 
              phishing—it all pays the same.
            </p>
            <p>
              <strong>Crypto Mining:</strong> While you're watching a movie, your CPU is mining 
              cryptocurrency for someone else. Your electricity bill goes up. Your laptop fans 
              spin. Your battery drains. They profit.
            </p>
            <p>
              <strong>Data Harvesting:</strong> Browser fingerprinting, tracking cookies, cross-site 
              identifiers—your browsing habits get packaged and sold to data brokers. Even in 
              "private" mode, they know who you are.
            </p>

            <div className={styles.citationBox}>
              <div className={styles.citationMark}>"</div>
              <blockquote>
                You're not the customer. You're not even the user. You're the ore being mined. 
                Every click, every second of attention, every CPU cycle—extracted and monetized 
                without your consent.
              </blockquote>
              <cite>— The reality of "free" streaming</cite>
            </div>

            <h3 className={styles.subsectionTitle}>3.2 The "We Have No Choice" Lie</h3>
            <p>
              Site operators love to claim they need aggressive monetization to survive. "Servers 
              cost money," they say. "We have to pay for bandwidth somehow."
            </p>
            <p>
              Bullshit.
            </p>
            <p>
              These sites don't host content—they aggregate it. They're glorified link directories 
              with embedded players. The actual video streams come from third-party providers. The 
              bandwidth costs are minimal. Modern serverless platforms (Vercel, Cloudflare, Netlify) 
              offer generous free tiers that can handle substantial traffic at zero cost.
            </p>
            <p>
              The exploitation isn't necessary. It's just more profitable. They could run clean 
              sites. They choose not to because malware pays better than dignity.
            </p>

            <h3 className={styles.subsectionTitle}>3.3 Why Nobody's Fixed This</h3>
            <p>
              Privacy-respecting alternatives exist in other spaces. DuckDuckGo for search. Signal 
              for messaging. ProtonMail for email. But streaming? Nothing. Why?
            </p>
            <p>
              Partly it's technical complexity—streaming is harder than search. Partly it's legal 
              ambiguity—nobody wants to be the face of a piracy platform. But mostly? Nobody cared 
              enough to try. The people capable of building something better were busy with 
              legitimate projects. The people running pirate sites were too busy counting their 
              malware revenue.
            </p>
            <p>
              I decided to care.</p>

            <div className={styles.literatureTable}>
              <h4>Table 1: Exploitative Practices in Pirate Streaming Sites</h4>
              <div className={styles.tableWrapper}>
                <table>
                  <thead>
                    <tr>
                      <th>Practice</th>
                      <th>Prevalence</th>
                      <th>User Impact</th>
                      <th>Site Revenue</th>
                      <th>Flyx Approach</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Pop-up/Pop-under Ads</td>
                      <td>~95% of sites</td>
                      <td>Severe annoyance, malware risk</td>
                      <td>Primary revenue</td>
                      <td>None</td>
                    </tr>
                    <tr>
                      <td>Cryptocurrency Mining</td>
                      <td>~30% of sites</td>
                      <td>CPU theft, battery drain</td>
                      <td>Secondary revenue</td>
                      <td>None</td>
                    </tr>
                    <tr>
                      <td>Browser Fingerprinting</td>
                      <td>~70% of sites</td>
                      <td>Cross-site tracking</td>
                      <td>Data sales</td>
                      <td>None</td>
                    </tr>
                    <tr>
                      <td>Dark Patterns (Fake Buttons)</td>
                      <td>~90% of sites</td>
                      <td>Accidental clicks, frustration</td>
                      <td>Inflated ad metrics</td>
                      <td>None</td>
                    </tr>
                    <tr>
                      <td>Malware Distribution</td>
                      <td>~40% of sites</td>
                      <td>System compromise</td>
                      <td>Affiliate payments</td>
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
              <h2>How I Built This Thing</h2>
            </div>

            <h3 className={styles.subsectionTitle}>4.1 The Ground Rules</h3>
            <p>
              Before I started, I set some constraints. Partly to prove a point, partly because 
              I'm stubborn. If I was going to claim that ethical streaming is achievable by anyone, 
              I needed to build it under realistic conditions:
            </p>

            <div className={styles.constraintGrid}>
              <div className={styles.constraintCard}>
                <div className={styles.constraintIcon}>👤</div>
                <h4>Just Me</h4>
                <p>No team. No contractors. No "my friend helped with the design." Every line of 
                code, every pixel, every decision—mine alone.</p>
              </div>
              <div className={styles.constraintCard}>
                <div className={styles.constraintIcon}>💸</div>
                <h4>Zero Dollars</h4>
                <p>Free tiers only. If a service wanted my credit card, I found an alternative. 
                The whole point is proving you don't need money to do this right.</p>
              </div>
              <div className={styles.constraintCard}>
                <div className={styles.constraintIcon}>🌙</div>
                <h4>Nights & Weekends</h4>
                <p>I have a day job. This was built in stolen hours—15-20 per week, fueled by 
                coffee and spite. Three months total.</p>
              </div>
              <div className={styles.constraintCard}>
                <div className={styles.constraintIcon}>📖</div>
                <h4>Public Knowledge Only</h4>
                <p>No insider information. No proprietary tools. Everything I learned came from 
                documentation, Stack Overflow, and staring at obfuscated JavaScript until it made sense.</p>
              </div>
            </div>

            <h3 className={styles.subsectionTitle}>4.2 The Timeline</h3>
            <p>
              Three months. That's how long it took from "I should build this" to "holy shit, it 
              actually works." Here's how it broke down:
            </p>

            <div className={styles.methodologyDiagram}>
              <div className={styles.methodPhase}>
                <div className={styles.phaseNumber}>01</div>
                <div className={styles.phaseContent}>
                  <h4>Planning & Panic</h4>
                  <p>Figuring out what to build, what tools to use, and whether I was insane</p>
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
                  <h4>The Grind</h4>
                  <p>Building the core platform, cracking stream providers, endless debugging</p>
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
                  <h4>Ship It</h4>
                  <p>Deployment, optimization, fixing everything that broke in production</p>
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
                  <h4>Write It Up</h4>
                  <p>This document. Explaining what I did and why it matters.</p>
                  <span className={styles.phaseDuration}>2 weeks</span>
                </div>
              </div>
            </div>

            <h3 className={styles.subsectionTitle}>4.3 Picking the Tools</h3>
            <p>
              When you're building alone with no budget, tool selection is everything. Pick wrong 
              and you waste weeks fighting your framework. Pick right and the code almost writes 
              itself. Here's what mattered to me:
            </p>
            
            <div className={styles.criteriaList}>
              <div className={styles.criteriaItem}>
                <div className={styles.criteriaRank}>1</div>
                <div className={styles.criteriaContent}>
                  <h4>Developer Experience (DX)</h4>
                  <p>How quickly can a single developer become productive? Quality of documentation, 
                  error messages, and debugging tools.</p>
                  <div className={styles.criteriaWeight}>Weight: 30%</div>
                </div>
              </div>
              <div className={styles.criteriaItem}>
                <div className={styles.criteriaRank}>2</div>
                <div className={styles.criteriaContent}>
                  <h4>Operational Simplicity</h4>
                  <p>Minimal ongoing maintenance burden. Automatic scaling, managed updates, 
                  and self-healing capabilities.</p>
                  <div className={styles.criteriaWeight}>Weight: 25%</div>
                </div>
              </div>
              <div className={styles.criteriaItem}>
                <div className={styles.criteriaRank}>3</div>
                <div className={styles.criteriaContent}>
                  <h4>Cost Efficiency</h4>
                  <p>Generous free tiers or pay-per-use pricing that scales to zero during 
                  development and low-traffic periods.</p>
                  <div className={styles.criteriaWeight}>Weight: 20%</div>
                </div>
              </div>
              <div className={styles.criteriaItem}>
                <div className={styles.criteriaRank}>4</div>
                <div className={styles.criteriaContent}>
                  <h4>Community & Ecosystem</h4>
                  <p>Active community for troubleshooting, rich ecosystem of compatible libraries 
                  and integrations.</p>
                  <div className={styles.criteriaWeight}>Weight: 15%</div>
                </div>
              </div>
              <div className={styles.criteriaItem}>
                <div className={styles.criteriaRank}>5</div>
                <div className={styles.criteriaContent}>
                  <h4>Performance Characteristics</h4>
                  <p>Ability to deliver acceptable user experience without extensive optimization 
                  or infrastructure investment.</p>
                  <div className={styles.criteriaWeight}>Weight: 10%</div>
                </div>
              </div>
            </div>
          </section>

          {/* System Architecture */}
          <section id="architecture" className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNumber}>V</span>
              <h2>The Tech Stack</h2>
            </div>

            <h3 className={styles.subsectionTitle}>5.1 The Big Picture</h3>
            <p>
              Here's how all the pieces fit together. The architecture is designed for one thing: 
              letting me build fast and deploy for free. Serverless everything. Edge computing where 
              it matters. No servers to babysit, no infrastructure to maintain. Just code that runs 
              when users need it and costs nothing when they don't.
            </p>

            <div className={styles.architectureDiagram}>
              <div className={styles.archTitle}>Figure 1: High-Level System Architecture</div>
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
                    <div className={styles.archComponent}>
                      <span className={styles.compIcon}>📺</span>
                      <span>Smart TV</span>
                    </div>
                  </div>
                </div>
                <div className={styles.archConnector}>
                  <div className={styles.connectorLabel}>HTTPS / WebSocket</div>
                </div>
                <div className={styles.archLayer}>
                  <span className={styles.archLabel}>Edge Layer (Vercel)</span>
                  <div className={styles.archComponents}>
                    <div className={styles.archComponent}>
                      <span className={styles.compIcon}>⚡</span>
                      <span>Edge Functions</span>
                    </div>
                    <div className={styles.archComponent}>
                      <span className={styles.compIcon}>🗄️</span>
                      <span>Static Assets</span>
                    </div>
                    <div className={styles.archComponent}>
                      <span className={styles.compIcon}>🔒</span>
                      <span>SSL Termination</span>
                    </div>
                  </div>
                </div>
                <div className={styles.archConnector}>
                  <div className={styles.connectorLabel}>Internal Network</div>
                </div>
                <div className={styles.archLayer}>
                  <span className={styles.archLabel}>Application Layer (Next.js)</span>
                  <div className={styles.archComponents}>
                    <div className={styles.archComponent}>
                      <span className={styles.compIcon}>⚛️</span>
                      <span>React 18 SSR</span>
                    </div>
                    <div className={styles.archComponent}>
                      <span className={styles.compIcon}>🛣️</span>
                      <span>API Routes</span>
                    </div>
                    <div className={styles.archComponent}>
                      <span className={styles.compIcon}>🎬</span>
                      <span>Server Actions</span>
                    </div>
                  </div>
                </div>
                <div className={styles.archConnector}>
                  <div className={styles.connectorLabel}>PostgreSQL Protocol</div>
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
                    <div className={styles.archComponent}>
                      <span className={styles.compIcon}>🍪</span>
                      <span>Session Storage</span>
                    </div>
                  </div>
                </div>
                <div className={styles.archConnector}>
                  <div className={styles.connectorLabel}>External APIs</div>
                </div>
                <div className={styles.archLayer}>
                  <span className={styles.archLabel}>External Services</span>
                  <div className={styles.archComponents}>
                    <div className={styles.archComponent}>
                      <span className={styles.compIcon}>🎬</span>
                      <span>TMDB API</span>
                    </div>
                    <div className={styles.archComponent}>
                      <span className={styles.compIcon}>📡</span>
                      <span>Stream Providers</span>
                    </div>
                    <div className={styles.archComponent}>
                      <span className={styles.compIcon}>🌍</span>
                      <span>CDN Networks</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <h3 className={styles.subsectionTitle}>5.2 Technology Stack Analysis</h3>
            <p>
              Each technology in the stack was selected through rigorous evaluation against our 
              criteria. The following analysis documents the rationale for key choices:
            </p>

            <div className={styles.techAnalysis}>
              <div className={styles.techCard}>
                <div className={styles.techHeader}>
                  <div className={styles.techLogo}>⚡</div>
                  <div className={styles.techInfo}>
                    <h4>Next.js 14 with App Router</h4>
                    <span className={styles.techCategory}>Framework</span>
                  </div>
                </div>
                <div className={styles.techBody}>
                  <p>
                    Selected for its hybrid rendering capabilities, enabling server-side rendering 
                    for SEO-critical pages while supporting client-side interactivity where needed. 
                    The App Router's streaming and Suspense support proved invaluable for progressive 
                    loading of complex pages, significantly improving perceived performance.
                  </p>
                  <div className={styles.techScores}>
                    <div className={styles.scoreItem}>
                      <span className={styles.scoreLabel}>DX</span>
                      <div className={styles.scoreBar}><div style={{width: '95%'}} /></div>
                    </div>
                    <div className={styles.scoreItem}>
                      <span className={styles.scoreLabel}>Ops</span>
                      <div className={styles.scoreBar}><div style={{width: '90%'}} /></div>
                    </div>
                    <div className={styles.scoreItem}>
                      <span className={styles.scoreLabel}>Cost</span>
                      <div className={styles.scoreBar}><div style={{width: '100%'}} /></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.techCard}>
                <div className={styles.techHeader}>
                  <div className={styles.techLogo}>🔷</div>
                  <div className={styles.techInfo}>
                    <h4>TypeScript 5.x</h4>
                    <span className={styles.techCategory}>Language</span>
                  </div>
                </div>
                <div className={styles.techBody}>
                  <p>
                    Type safety was non-negotiable for a project of this complexity. TypeScript's 
                    compile-time checks caught countless bugs before they reached production, and 
                    the IDE support dramatically improved development velocity. The investment in 
                    type definitions paid dividends throughout the project lifecycle.
                  </p>
                  <div className={styles.techScores}>
                    <div className={styles.scoreItem}>
                      <span className={styles.scoreLabel}>DX</span>
                      <div className={styles.scoreBar}><div style={{width: '90%'}} /></div>
                    </div>
                    <div className={styles.scoreItem}>
                      <span className={styles.scoreLabel}>Safety</span>
                      <div className={styles.scoreBar}><div style={{width: '95%'}} /></div>
                    </div>
                    <div className={styles.scoreItem}>
                      <span className={styles.scoreLabel}>Ecosystem</span>
                      <div className={styles.scoreBar}><div style={{width: '98%'}} /></div>
                    </div>
                  </div>
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
                    Serverless PostgreSQL provided the reliability of a traditional relational 
                    database with the operational simplicity of a managed service. The branching 
                    feature enabled safe schema migrations, while the generous free tier (3GB 
                    storage, 1 compute hour/day) eliminated infrastructure costs entirely.
                  </p>
                  <div className={styles.techScores}>
                    <div className={styles.scoreItem}>
                      <span className={styles.scoreLabel}>Reliability</span>
                      <div className={styles.scoreBar}><div style={{width: '92%'}} /></div>
                    </div>
                    <div className={styles.scoreItem}>
                      <span className={styles.scoreLabel}>Cost</span>
                      <div className={styles.scoreBar}><div style={{width: '100%'}} /></div>
                    </div>
                    <div className={styles.scoreItem}>
                      <span className={styles.scoreLabel}>Features</span>
                      <div className={styles.scoreBar}><div style={{width: '88%'}} /></div>
                    </div>
                  </div>
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
                    The de facto standard for adaptive bitrate streaming in browsers. HLS.js 
                    handles the complexity of manifest parsing, quality switching, and buffer 
                    management, allowing focus on user experience rather than low-level video 
                    mechanics. Excellent documentation and active maintenance ensured reliability.
                  </p>
                  <div className={styles.techScores}>
                    <div className={styles.scoreItem}>
                      <span className={styles.scoreLabel}>Maturity</span>
                      <div className={styles.scoreBar}><div style={{width: '95%'}} /></div>
                    </div>
                    <div className={styles.scoreItem}>
                      <span className={styles.scoreLabel}>Performance</span>
                      <div className={styles.scoreBar}><div style={{width: '90%'}} /></div>
                    </div>
                    <div className={styles.scoreItem}>
                      <span className={styles.scoreLabel}>Docs</span>
                      <div className={styles.scoreBar}><div style={{width: '85%'}} /></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Implementation */}
          <section id="implementation" className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNumber}>VI</span>
              <h2>Implementation Details</h2>
            </div>

            <h3 className={styles.subsectionTitle}>6.1 Video Streaming Pipeline</h3>
            <p>
              The video streaming implementation represents the technical heart of the platform. 
              Rather than hosting content directly—which would be both legally problematic and 
              prohibitively expensive—Flyx acts as an intelligent aggregator, discovering and 
              presenting streams from various sources while providing a unified playback experience.
            </p>
            <p>
              The streaming pipeline involves several stages: source discovery, stream extraction, 
              quality normalization, and adaptive delivery. Each stage presented unique challenges 
              and required careful optimization to maintain acceptable performance while operating 
              within the constraints of serverless execution limits.
            </p>

            <div className={styles.codeBlock}>
              <div className={styles.codeHeader}>
                <span className={styles.codeLanguage}>TypeScript</span>
                <span className={styles.codeTitle}>Listing 1: Simplified Stream Extraction Pipeline</span>
              </div>
              <pre className={styles.code}>{`interface StreamSource {
  provider: string;
  quality: '4K' | '1080p' | '720p' | '480p';
  url: string;
  reliability: number;
}

async function getPlayableStream(
  tmdbId: string, 
  mediaType: 'movie' | 'tv'
): Promise<StreamSource> {
  // 1. Query available sources for content
  const sources = await discoverSources(tmdbId, mediaType);
  
  // 2. Extract playable stream URLs in parallel
  const streams = await Promise.allSettled(
    sources.map(source => extractStream(source))
  );
  
  // 3. Filter successful extractions
  const validStreams = streams
    .filter((r): r is PromiseFulfilledResult<StreamSource> => 
      r.status === 'fulfilled'
    )
    .map(r => r.value);
  
  // 4. Rank by quality and reliability
  const ranked = rankStreams(validStreams);
  
  // 5. Return best available option
  return ranked[0];
}`}</pre>
            </div>

            <h3 className={styles.subsectionTitle}>6.2 Real-Time Analytics Architecture</h3>
            <p>
              Understanding user behavior is crucial for any content platform. Flyx implements a 
              comprehensive analytics system that tracks engagement metrics while respecting user 
              privacy. The system captures watch time, completion rates, pause/seek behavior, and 
              content discovery patterns—all without collecting personally identifiable information.
            </p>

            <div className={styles.analyticsFlow}>
              <div className={styles.flowTitle}>Figure 2: Analytics Event Pipeline</div>
              <div className={styles.flowDiagram}>
                <div className={styles.flowNode}>
                  <span className={styles.flowIcon}>👆</span>
                  <span className={styles.flowLabel}>User Action</span>
                </div>
                <div className={styles.flowArrow}>→</div>
                <div className={styles.flowNode}>
                  <span className={styles.flowIcon}>📦</span>
                  <span className={styles.flowLabel}>Event Buffer</span>
                </div>
                <div className={styles.flowArrow}>→</div>
                <div className={styles.flowNode}>
                  <span className={styles.flowIcon}>🔄</span>
                  <span className={styles.flowLabel}>Batch Processor</span>
                </div>
                <div className={styles.flowArrow}>→</div>
                <div className={styles.flowNode}>
                  <span className={styles.flowIcon}>🛣️</span>
                  <span className={styles.flowLabel}>API Route</span>
                </div>
                <div className={styles.flowArrow}>→</div>
                <div className={styles.flowNode}>
                  <span className={styles.flowIcon}>🐘</span>
                  <span className={styles.flowLabel}>PostgreSQL</span>
                </div>
              </div>
            </div>

            <p>
              The analytics pipeline uses a batched event model, accumulating events client-side 
              and flushing them periodically to minimize network overhead. Critical events (session 
              start, content completion) are sent immediately, while routine progress updates are 
              batched for efficiency. This approach reduces API calls by approximately 80% compared 
              to real-time event streaming.
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
                <div className={styles.statLabel}>React Components</div>
                <div className={styles.statDetail}>Reusable UI elements</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>🛣️</div>
                <div className={styles.statValue}>40+</div>
                <div className={styles.statLabel}>API Endpoints</div>
                <div className={styles.statDetail}>REST & Server Actions</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>🗄️</div>
                <div className={styles.statValue}>15+</div>
                <div className={styles.statLabel}>Database Tables</div>
                <div className={styles.statDetail}>Normalized schema</div>
              </div>
            </div>

            <h3 className={styles.subsectionTitle}>6.3 Administrative Dashboard</h3>
            <p>
              A production platform requires operational visibility. The admin dashboard provides 
              real-time insights into platform health, user engagement, content performance, and 
              system metrics. Built as a separate authenticated section, it demonstrates that 
              comprehensive tooling can be developed alongside user-facing features without 
              significantly extending the development timeline.
            </p>
            <p>
              Key dashboard capabilities include live user tracking with geographic visualization, 
              content performance analytics with trend analysis, session replay for debugging user 
              issues, and system health monitoring with alerting capabilities. Each feature was 
              implemented incrementally, prioritizing the metrics most valuable for understanding 
              platform usage patterns.
            </p>
          </section>

          {/* Evaluation & Results */}
          <section id="evaluation" className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNumber}>VII</span>
              <h2>Evaluation & Results</h2>
            </div>

            <h3 className={styles.subsectionTitle}>7.1 Development Metrics</h3>
            <p>
              The project was completed over approximately three months of part-time development, 
              averaging 15-20 hours per week. Total development time is estimated at 200-250 hours, 
              distributed across planning, implementation, testing, and refinement phases. The 
              following timeline illustrates the development progression:
            </p>

            <div className={styles.timeline}>
              <div className={styles.timelineHeader}>Figure 3: Development Timeline</div>
              <div className={styles.timelineTrack}>
                <div className={styles.timelinePhase} style={{width: '15%'}}>
                  <div className={styles.phaseBar} style={{background: 'linear-gradient(90deg, #6366f1, #8b5cf6)'}} />
                  <div className={styles.phaseInfo}>
                    <span className={styles.phaseTitle}>Planning</span>
                    <span className={styles.phaseWeeks}>Weeks 1-2</span>
                  </div>
                </div>
                <div className={styles.timelinePhase} style={{width: '55%'}}>
                  <div className={styles.phaseBar} style={{background: 'linear-gradient(90deg, #8b5cf6, #a855f7)'}} />
                  <div className={styles.phaseInfo}>
                    <span className={styles.phaseTitle}>Core Development</span>
                    <span className={styles.phaseWeeks}>Weeks 3-8</span>
                  </div>
                </div>
                <div className={styles.timelinePhase} style={{width: '15%'}}>
                  <div className={styles.phaseBar} style={{background: 'linear-gradient(90deg, #a855f7, #d946ef)'}} />
                  <div className={styles.phaseInfo}>
                    <span className={styles.phaseTitle}>Testing</span>
                    <span className={styles.phaseWeeks}>Weeks 9-10</span>
                  </div>
                </div>
                <div className={styles.timelinePhase} style={{width: '15%'}}>
                  <div className={styles.phaseBar} style={{background: 'linear-gradient(90deg, #d946ef, #ec4899)'}} />
                  <div className={styles.phaseInfo}>
                    <span className={styles.phaseTitle}>Polish</span>
                    <span className={styles.phaseWeeks}>Weeks 11-12</span>
                  </div>
                </div>
              </div>
            </div>

            <h3 className={styles.subsectionTitle}>7.2 Feature Completeness Assessment</h3>
            <p>
              To evaluate the success of the project, we compared implemented features against 
              a reference set of capabilities found in commercial streaming platforms. Features 
              were categorized as Core (essential for basic functionality), Enhanced (improving 
              user experience), and Advanced (differentiating features of major platforms).
            </p>

            <div className={styles.featureMatrix}>
              <div className={styles.matrixHeader}>Table 2: Feature Implementation Status</div>
              <div className={styles.matrixContent}>
                <div className={styles.featureCategory}>
                  <h4>Core Features</h4>
                  <div className={styles.featureList}>
                    <div className={styles.featureItem}>
                      <span className={styles.featureStatus}>✓</span>
                      <span>Video playback with quality selection</span>
                    </div>
                    <div className={styles.featureItem}>
                      <span className={styles.featureStatus}>✓</span>
                      <span>Content browsing and search</span>
                    </div>
                    <div className={styles.featureItem}>
                      <span className={styles.featureStatus}>✓</span>
                      <span>Responsive design (mobile/desktop)</span>
                    </div>
                    <div className={styles.featureItem}>
                      <span className={styles.featureStatus}>✓</span>
                      <span>Watch progress persistence</span>
                    </div>
                    <div className={styles.featureItem}>
                      <span className={styles.featureStatus}>✓</span>
                      <span>Content metadata display</span>
                    </div>
                  </div>
                </div>
                <div className={styles.featureCategory}>
                  <h4>Enhanced Features</h4>
                  <div className={styles.featureList}>
                    <div className={styles.featureItem}>
                      <span className={styles.featureStatus}>✓</span>
                      <span>Live TV integration</span>
                    </div>
                    <div className={styles.featureItem}>
                      <span className={styles.featureStatus}>✓</span>
                      <span>Real-time analytics dashboard</span>
                    </div>
                    <div className={styles.featureItem}>
                      <span className={styles.featureStatus}>✓</span>
                      <span>Subtitle support</span>
                    </div>
                    <div className={styles.featureItem}>
                      <span className={styles.featureStatus}>✓</span>
                      <span>Keyboard shortcuts</span>
                    </div>
                    <div className={styles.featureItem}>
                      <span className={styles.featureStatus}>○</span>
                      <span>Watchlist/favorites</span>
                    </div>
                  </div>
                </div>
                <div className={styles.featureCategory}>
                  <h4>Advanced Features</h4>
                  <div className={styles.featureList}>
                    <div className={styles.featureItem}>
                      <span className={styles.featureStatus}>✗</span>
                      <span>ML-based recommendations</span>
                    </div>
                    <div className={styles.featureItem}>
                      <span className={styles.featureStatus}>✗</span>
                      <span>Offline viewing</span>
                    </div>
                    <div className={styles.featureItem}>
                      <span className={styles.featureStatus}>✗</span>
                      <span>Multi-profile support</span>
                    </div>
                    <div className={styles.featureItem}>
                      <span className={styles.featureStatus}>✗</span>
                      <span>Native mobile apps</span>
                    </div>
                    <div className={styles.featureItem}>
                      <span className={styles.featureStatus}>✗</span>
                      <span>Social features</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className={styles.matrixLegend}>
                <span><span className={styles.legendIcon}>✓</span> Implemented</span>
                <span><span className={styles.legendIcon}>○</span> Partial</span>
                <span><span className={styles.legendIcon}>✗</span> Not Implemented</span>
              </div>
            </div>

            <h3 className={styles.subsectionTitle}>7.3 Performance Benchmarks</h3>
            <p>
              Performance testing was conducted using Lighthouse and WebPageTest to evaluate 
              real-world user experience. Results demonstrate that the serverless architecture 
              delivers acceptable performance without dedicated infrastructure investment.
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

          {/* Discussion */}
          <section id="discussion" className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNumber}>VIII</span>
              <h2>What I Proved</h2>
            </div>

            <h3 className={styles.subsectionTitle}>8.1 The Verdict</h3>
            <p className={styles.leadParagraph}>
              So did it work? Can you actually build an ethical streaming platform? The answer is 
              yes—with caveats. Here's what I learned:
            </p>

            <div className={styles.findingsGrid}>
              <div className={styles.findingCard}>
                <div className={styles.findingNumber}>1</div>
                <div className={styles.findingContent}>
                  <h4>The Exploitation is Optional</h4>
                  <p>
                    Flyx works. No ads, no tracking, no malware. Streams play. Users watch movies. 
                    The sky didn't fall. Every pirate site that serves pop-ups is making a choice—
                    they could do better. They just don't want to.
                  </p>
                </div>
              </div>
              <div className={styles.findingCard}>
                <div className={styles.findingNumber}>2</div>
                <div className={styles.findingContent}>
                  <h4>Free Infrastructure Exists</h4>
                  <p>
                    I spent $0. Zero dollars. Vercel's free tier handles the traffic. Neon's free 
                    tier handles the database. The "we need ad revenue for servers" excuse is a lie. 
                    Aggregators don't need money—they want it.
                  </p>
                </div>
              </div>
              <div className={styles.findingCard}>
                <div className={styles.findingNumber}>3</div>
                <div className={styles.findingContent}>
                  <h4>Privacy Doesn't Kill Features</h4>
                  <p>
                    Watch progress syncs without accounts. Analytics work without fingerprinting. 
                    Recommendations could work without tracking (I just haven't built them yet). 
                    Privacy and functionality aren't enemies.
                  </p>
                </div>
              </div>
              <div className={styles.findingCard}>
                <div className={styles.findingNumber}>4</div>
                <div className={styles.findingContent}>
                  <h4>One Person Can Do This</h4>
                  <p>
                    No team. No funding. No special access. Just a developer with a laptop and too 
                    much free time. If I can build this, the excuse that "it's too hard" doesn't hold.
                  </p>
                </div>
              </div>
            </div>

            <h3 className={styles.subsectionTitle}>8.2 The Hard Parts (Besides Reverse Engineering)</h3>
            <p>
              The reverse engineering gets its own section because it deserves it. But there were 
              other challenges too:
            </p>

            <div className={styles.challengesList}>
              <div className={styles.challengeItem}>
                <div className={styles.challengeHeader}>
                  <span className={styles.challengeIcon}>💀</span>
                  <h4>Streams Die Constantly</h4>
                </div>
                <div className={styles.challengeBody}>
                  <p>
                    Third-party streams are unreliable as hell. URLs expire. Servers go down. Quality 
                    fluctuates. One day everything works; the next day half your content is broken. 
                    Early versions of Flyx were a buffering nightmare.
                  </p>
                  <div className={styles.solutionBox}>
                    <strong>The Fix:</strong> Multi-source fallback. The player tries multiple providers 
                    for each piece of content, automatically switching when one fails. Redundancy is 
                    survival in this game.
                  </div>
                </div>
              </div>

              <div className={styles.challengeItem}>
                <div className={styles.challengeHeader}>
                  <span className={styles.challengeIcon}>🐌</span>
                  <h4>JavaScript Bloat</h4>
                </div>
                <div className={styles.challengeBody}>
                  <p>
                    Features add up. The video player, the UI components, the analytics, the admin 
                    dashboard—suddenly you're shipping megabytes of JavaScript and users on slow 
                    connections are staring at loading spinners.
                  </p>
                  <div className={styles.solutionBox}>
                    <strong>The Fix:</strong> Aggressive code splitting. Lazy load everything that 
                    isn't immediately visible. Use React Suspense to show content progressively. 
                    Cut the initial bundle by 60%.
                  </div>
                </div>
              </div>

              <div className={styles.challengeItem}>
                <div className={styles.challengeHeader}>
                  <span className={styles.challengeIcon}>🚧</span>
                  <h4>CORS Hell</h4>
                </div>
                <div className={styles.challengeBody}>
                  <p>
                    Browsers are paranoid about cross-origin requests. Stream providers set headers 
                    that block direct access. You can't just fetch a video URL and play it—the 
                    browser will refuse.
                  </p>
                  <div className={styles.solutionBox}>
                    <strong>The Fix:</strong> Proxy everything. API routes that fetch streams server-side 
                    and relay them to the browser. The browser thinks it's talking to my server; my 
                    server handles the cross-origin dance.
                  </div>
                </div>
              </div>
            </div>

            <h3 className={styles.subsectionTitle}>8.3 What I'd Do Differently</h3>
            <div className={styles.lessonsBox}>
              <div className={styles.lessonItem}>
                <span className={styles.lessonNumber}>01</span>
                <div className={styles.lessonContent}>
                  <h4>Start with Streaming</h4>
                  <p>
                    I wasted time on UI polish before the core streaming worked. Should have built 
                    the hard part first. Everything else is just decoration.
                  </p>
                </div>
              </div>
              <div className={styles.lessonItem}>
                <span className={styles.lessonNumber}>02</span>
                <div className={styles.lessonContent}>
                  <h4>Constraints Are Friends</h4>
                  <p>
                    Limited time forced ruthless prioritization. Features were evaluated by 
                    impact-to-effort ratio, not technical interest. Constraints breed creativity 
                    and prevent scope creep.
                  </p>
                </div>
              </div>
              <div className={styles.lessonItem}>
                <span className={styles.lessonNumber}>03</span>
                <div className={styles.lessonContent}>
                  <h4>Ship Incrementally</h4>
                  <p>
                    Regular deployments maintained momentum and provided early feedback. Each 
                    deployment, however small, represented tangible progress and enabled course 
                    correction.
                  </p>
                </div>
              </div>
              <div className={styles.lessonItem}>
                <span className={styles.lessonNumber}>04</span>
                <div className={styles.lessonContent}>
                  <h4>Document Decisions</h4>
                  <p>
                    Future-self appreciation for past-self's notes cannot be overstated. 
                    Architecture decisions especially benefit from written rationale when 
                    revisiting code months later.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Reverse Engineering */}
          <section id="reverse-engineering" className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNumber}>IX</span>
              <h2>The Heist: Stealing from the Thieves</h2>
            </div>

            <p className={styles.leadParagraph}>
              Here's the delicious irony at the heart of this project: the streaming providers I 
              needed to crack aren't legitimate businesses. They're pirates themselves—profiting 
              from content they don't own by wrapping it in malware, pop-ups, and crypto miners. 
              My job was to break into their systems and steal what they'd already stolen, then 
              serve it without the exploitation. Robbing the robbers. And they did not make it easy.
            </p>

            <div className={styles.citationBox}>
              <div className={styles.citationMark}>"</div>
              <blockquote>
                These sites make millions from ads and malware while hiding behind layers of 
                obfuscation that would make nation-state hackers proud. They're not protecting 
                intellectual property—they're protecting their revenue stream from people like me 
                who want to give users the content without the cancer.
              </blockquote>
              <cite>— 3 AM, staring at minified JavaScript</cite>
            </div>

            <h3 className={styles.subsectionTitle}>9.1 The Battlefield</h3>
            <p>
              Picture this: you find a pirate streaming site. It works. Videos play. But when you 
              try to extract the actual stream URL to use in your own player—to strip away the 
              pop-ups and malware—you hit a wall. Not just one wall. A fortress of walls, each 
              more devious than the last. These criminals have invested serious engineering talent 
              into making sure nobody can do what I was trying to do.
            </p>

            <div className={styles.challengesList}>
              <div className={styles.challengeItem}>
                <div className={styles.challengeHeader}>
                  <span className={styles.challengeIcon}>🔐</span>
                  <h4>The Code Spaghetti Monster</h4>
                </div>
                <div className={styles.challengeBody}>
                  <p>
                    Open DevTools on any pirate site and look at their JavaScript. It's not code—it's 
                    a war crime. Variable names like <code>_0x4a3f</code> and <code>_0xb7c2</code>. 
                    Strings split into arrays of character codes, reassembled through twelve layers 
                    of function calls. Control flow that looks like someone threw spaghetti at a wall 
                    and called it architecture. And the crown jewel: <code>eval()</code> statements 
                    that generate MORE obfuscated code at runtime. You can't even read what you're 
                    trying to crack.
                  </p>
                  <div className={styles.solutionBox}>
                    <strong>The Break-In:</strong> I built a deobfuscation pipeline. Intercept every 
                    <code>eval()</code>, log what it produces. Trace string operations backwards. 
                    Write AST transformers that rename variables based on how they're used. Slowly, 
                    painfully, the gibberish becomes readable. Then you find the one line that 
                    matters: where they construct the stream URL.
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
                    Found the stream URL? Great. It expires in 90 seconds. Every request needs a 
                    fresh token computed from the current timestamp, the content ID, and a secret 
                    key buried somewhere in 50,000 lines of obfuscated JavaScript. Copy-paste the 
                    URL? Dead on arrival. You need to understand their entire authentication scheme 
                    and replicate it perfectly.
                  </p>
                  <div className={styles.solutionBox}>
                    <strong>The Break-In:</strong> Hours of stepping through minified code in the 
                    debugger, watching variables change, mapping the flow of data. Eventually you 
                    find it: they're using HMAC-SHA256 with a hardcoded key hidden in a fake jQuery 
                    plugin. Extract the key, reimplement the algorithm server-side, generate tokens 
                    on demand. Their 90-second window becomes irrelevant.
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
                    These sites HATE automation. They check if you're running headless Chrome. They 
                    analyze your mouse movements for human-like patterns. They fingerprint your 
                    WebGL renderer, your canvas, your audio context. Fail any check and you get a 
                    fake stream that plays for 30 seconds then dies—or worse, an IP ban. They've 
                    seen every trick in the book.
                  </p>
                  <div className={styles.solutionBox}>
                    <strong>The Break-In:</strong> Puppeteer with stealth plugins. Fake mouse 
                    movements with Bézier curves. Randomized timing that mimics human hesitation. 
                    But the real victory? Realizing I could skip their JavaScript entirely. Their 
                    bot detection runs client-side—if I never execute their code, I never trigger 
                    their checks. Pure HTTP requests, carefully crafted headers, surgical extraction.
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
                    another iframe from a different domain. Which loads ANOTHER iframe. The actual 
                    player is four layers deep, each layer on a different domain with different 
                    CORS policies, each performing its own validation. It's like trying to break 
                    into a bank vault that's inside another bank vault that's inside a third bank.
                  </p>
                  <div className={styles.solutionBox}>
                    <strong>The Break-In:</strong> Map the entire chain. Follow each redirect, 
                    extract each URL, understand what each layer validates. Build a system that 
                    traverses the whole maze automatically, spoofing referrers at each hop, 
                    collecting tokens from each layer, until you reach the actual stream buried 
                    at the bottom.
                  </div>
                </div>
              </div>

              <div className={styles.challengeItem}>
                <div className={styles.challengeHeader}>
                  <span className={styles.challengeIcon}>🔒</span>
                  <h4>The Encrypted Treasure Map</h4>
                </div>
                <div className={styles.challengeBody}>
                  <p>
                    HLS streams use manifest files—playlists that tell the player where to find 
                    each video segment. Some providers encrypt these manifests. Others use custom 
                    formats that no standard player understands. The decryption key? Hidden in 
                    obfuscated JavaScript, derived from session tokens, or fetched from a separate 
                    API that requires its own authentication dance.
                  </p>
                  <div className={styles.solutionBox}>
                    <strong>The Break-In:</strong> Network interception. Let their own code do the 
                    decryption, then capture the result. For custom formats, reverse engineer the 
                    structure and write parsers that transform their proprietary garbage into 
                    standard M3U8. Rewrite all the URLs to route through my proxy. Their encryption 
                    becomes a minor inconvenience.
                  </div>
                </div>
              </div>

              <div className={styles.challengeItem}>
                <div className={styles.challengeHeader}>
                  <span className={styles.challengeIcon}>🚪</span>
                  <h4>The Bouncer at Every Door</h4>
                </div>
                <div className={styles.challengeBody}>
                  <p>
                    Every request to their servers gets interrogated. Wrong Referer header? Blocked. 
                    Wrong Origin? Blocked. Missing their custom headers? Blocked. Coming from a 
                    domain they don't recognize? Believe it or not, blocked. They've essentially 
                    built a nightclub where the bouncer checks your ID, your outfit, your shoes, 
                    and whether you know the secret handshake.
                  </p>
                  <div className={styles.solutionBox}>
                    <strong>The Break-In:</strong> A proxy layer that lies professionally. Every 
                    request gets its headers rewritten to match exactly what their servers expect. 
                    I maintain a database of which provider wants which headers. My server pretends 
                    to be their server talking to their player. They never know the difference.
                  </div>
                </div>
              </div>
            </div>

            <h3 className={styles.subsectionTitle}>9.2 War Stories: The Big Scores</h3>
            <p>
              Every provider was a different puzzle. Different obfuscation, different tricks, 
              different ways to make my life hell. Here are the ones that nearly broke me—and 
              how I broke them instead.
            </p>

            <div className={styles.techAnalysis}>
              <div className={styles.techCard}>
                <div className={styles.techHeader}>
                  <div className={styles.techLogo}>🎯</div>
                  <div className={styles.techInfo}>
                    <h4>The 2Embed Labyrinth</h4>
                    <span className={styles.techCategory}>3 weeks to crack</span>
                  </div>
                </div>
                <div className={styles.techBody}>
                  <p>
                    2Embed was my white whale. A hydra of domains—streamsrcs, embedsrcs, vidsrc, 
                    2embed itself—each redirecting to the next, each generating new tokens, each 
                    running its own obfuscated validation. The final player used a packing algorithm 
                    I'd never seen before: strings weren't just encoded, they were shattered into 
                    individual characters stored in arrays, then reassembled through a maze of 
                    function calls that referenced other arrays by computed indices.
                  </p>
                  <p>
                    I spent two weeks just understanding how their packer worked. Filled notebooks 
                    with diagrams. Wrote a custom unpacker. Then discovered they had THREE different 
                    packing schemes that rotated based on content ID. Back to the drawing board.
                  </p>
                  <p>
                    <strong>The Moment of Victory:</strong> 3 AM on a Tuesday. I noticed the packing 
                    seed was derived from the TMDB ID in a predictable way. If I knew the content, 
                    I could predict which unpacker to use. Suddenly, extraction dropped from 5+ 
                    seconds with full browser automation to 180ms with pure HTTP requests. I literally 
                    punched the air.
                  </p>
                </div>
              </div>

              <div className={styles.techCard}>
                <div className={styles.techHeader}>
                  <div className={styles.techLogo}>🎭</div>
                  <div className={styles.techInfo}>
                    <h4>SuperEmbed's Decoy Trap</h4>
                    <span className={styles.techCategory}>The one that fought back</span>
                  </div>
                </div>
                <div className={styles.techBody}>
                  <p>
                    SuperEmbed was paranoid. Canvas fingerprinting. WebGL checks. They analyzed 
                    how fast your mouse moved to the play button. But their cruelest trick? Decoy 
                    streams. Fail their bot detection and they don't block you—they give you a 
                    stream that works perfectly for exactly 30 seconds, then dies. You think you've 
                    won. You deploy your code. Users start complaining. You realize you've been 
                    played.
                  </p>
                  <p>
                    I burned a week on stealth techniques. Puppeteer plugins. Fake mouse movements. 
                    Randomized timing. Nothing worked consistently. Their detection was too good.
                  </p>
                  <p>
                    <strong>The Moment of Victory:</strong> I stopped trying to fool their JavaScript 
                    and started ignoring it entirely. Their validation happened client-side—in the 
                    browser. But the actual stream endpoint? It just needed the right parameters. 
                    I traced the network requests, found the "srcrcp" endpoint, figured out what 
                    parameters it expected, and called it directly. No browser. No JavaScript. No 
                    bot detection. Just a clean HTTP request that returned the real stream every time.
                  </p>
                </div>
              </div>

              <div className={styles.techCard}>
                <div className={styles.techHeader}>
                  <div className={styles.techLogo}>📡</div>
                  <div className={styles.techInfo}>
                    <h4>DLHD: The Moving Target</h4>
                    <span className={styles.techCategory}>Live TV nightmare</span>
                  </div>
                </div>
                <div className={styles.techBody}>
                  <p>
                    Live TV was a different beast entirely. VOD streams have stable URLs—extract 
                    once, play forever (or until the token expires). Live streams? The URL changes 
                    every few minutes. Miss a rotation and your stream dies mid-broadcast. DLHD 
                    made this worse with WebSocket-based URL updates, geographic restrictions at 
                    the CDN level, and segment-level authentication that required fresh tokens for 
                    every 10-second chunk of video.
                  </p>
                  <p>
                    My first approach—re-extracting URLs periodically—was too slow. By the time I 
                    got a new URL, it was already stale. Users saw constant buffering.
                  </p>
                  <p>
                    <strong>The Moment of Victory:</strong> I reverse engineered their WebSocket 
                    protocol. Turns out the player maintains a persistent connection that receives 
                    URL updates in real-time. I built a proxy that does the same thing—maintains 
                    its own WebSocket connection, receives the updates, and transparently rewrites 
                    URLs for my player. From the user's perspective, it's one stable stream. Behind 
                    the scenes, it's a constant dance of URL rotation that my proxy handles invisibly.
                  </p>
                </div>
              </div>
            </div>

            <h3 className={styles.subsectionTitle}>9.3 The Arsenal</h3>
            <p>
              You don't win a war with bare hands. Over months of reverse engineering, I built 
              a toolkit specifically designed for cracking streaming providers:
            </p>

            <div className={styles.codeBlock}>
              <div className={styles.codeHeader}>
                <span className={styles.codeLanguage}>TypeScript</span>
                <span className={styles.codeTitle}>The Extraction Engine (Simplified)</span>
              </div>
              <pre className={styles.code}>{`// This is what months of reverse engineering looks like
// when distilled into clean code

async function extractStream(tmdbId: string): Promise<Stream> {
  // Try each provider until one works
  for (const provider of PROVIDER_PRIORITY) {
    try {
      // 1. Fetch the embed page
      const embedHtml = await fetchWithSpoofedHeaders(
        provider.getEmbedUrl(tmdbId)
      );
      
      // 2. Run provider-specific deobfuscation
      const deobfuscated = provider.deobfuscate(embedHtml);
      
      // 3. Extract and validate the stream URL
      const streamUrl = provider.extractStreamUrl(deobfuscated);
      
      // 4. Generate fresh auth tokens if needed
      const authedUrl = provider.needsAuth 
        ? provider.addAuthTokens(streamUrl)
        : streamUrl;
      
      // 5. Verify the stream actually works
      if (await verifyStream(authedUrl)) {
        return { url: authedUrl, provider: provider.name };
      }
    } catch (e) {
      // This provider failed, try the next one
      continue;
    }
  }
  throw new Error('All providers failed');
}`}</pre>
            </div>

            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>🔓</div>
                <div className={styles.statValue}>15+</div>
                <div className={styles.statLabel}>Obfuscation Schemes</div>
                <div className={styles.statDetail}>Cracked & documented</div>
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

            <h3 className={styles.subsectionTitle}>9.4 The Never-Ending War</h3>
            <p>
              Here's the thing about stealing from thieves: they notice. And they fight back.
            </p>
            <p>
              Every few weeks, something breaks. A provider updates their obfuscation. A domain 
              gets rotated. A new bot detection check gets added. The extraction that worked 
              yesterday returns garbage today. It's a constant arms race, and the moment you 
              stop paying attention, you lose.
            </p>

            <div className={styles.lessonsBox}>
              <div className={styles.lessonItem}>
                <span className={styles.lessonNumber}>01</span>
                <div className={styles.lessonContent}>
                  <h4>Expect Everything to Break</h4>
                  <p>
                    The system is built with the assumption that any provider can fail at any 
                    moment. Multiple fallbacks for every piece of content. Automatic failover. 
                    Graceful degradation. Paranoia as architecture.
                  </p>
                </div>
              </div>
              <div className={styles.lessonItem}>
                <span className={styles.lessonNumber}>02</span>
                <div className={styles.lessonContent}>
                  <h4>Monitor Like Your Life Depends On It</h4>
                  <p>
                    Automated health checks hit every provider every hour. Success rates are 
                    tracked. The moment extraction starts failing, I know about it—usually 
                    before users notice. Early warning is everything.
                  </p>
                </div>
              </div>
              <div className={styles.lessonItem}>
                <span className={styles.lessonNumber}>03</span>
                <div className={styles.lessonContent}>
                  <h4>Document the Patterns</h4>
                  <p>
                    Every obfuscation technique, every bypass, every quirk goes in the notes. 
                    Providers recycle tricks. That weird encoding scheme from six months ago? 
                    It'll show up again. The documentation is a weapon.
                  </p>
                </div>
              </div>
              <div className={styles.lessonItem}>
                <span className={styles.lessonNumber}>04</span>
                <div className={styles.lessonContent}>
                  <h4>Stay Humble</h4>
                  <p>
                    The providers have more resources than I do. They can hire teams. I'm one 
                    person with a laptop and too much caffeine. But I only need to find one 
                    hole in their defenses. They need to plug all of them. Advantage: me.
                  </p>
                </div>
              </div>
            </div>

            <div className={styles.citationBox}>
              <div className={styles.citationMark}>"</div>
              <blockquote>
                There's a certain poetry to it. These sites built fortresses to protect their 
                ability to profit from stolen content. I broke into those fortresses to give 
                users the content without the exploitation. We're all criminals here—I just 
                have better ethics about it.
              </blockquote>
              <cite>— Vynx, probably sleep-deprived</cite>
            </div>

            <h3 className={styles.subsectionTitle}>9.5 Why This Matters</h3>
            <p>
              This isn't just a technical flex. The reverse engineering work is the entire reason 
              Flyx can exist as an ethical alternative. Without cracking these providers, I'd have 
              two choices: host content myself (illegal and expensive) or embed their players 
              directly (bringing all their malware and pop-ups with them).
            </p>
            <p>
              By extracting just the stream URLs and serving them through my own clean player, I 
              can offer users the content they want without the exploitation they've learned to 
              accept as inevitable. The hundreds of hours spent staring at obfuscated JavaScript 
              weren't just an intellectual exercise—they were the foundation of everything.
            </p>
            <p>
              Every time a user watches a movie on Flyx without getting a pop-up, without having 
              their CPU hijacked for crypto mining, without being tracked across the web—that's 
              the reverse engineering paying off. That's what all those 3 AM debugging sessions 
              were for.
            </p>
          </section>

          {/* Future Work */}
          <section id="future" className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNumber}>X</span>
              <h2>What's Next</h2>
            </div>
            <p>
              Flyx isn't done. It works, but "works" is a low bar. Here's what I want to build next, 
              when I find more stolen hours:
            </p>

            <div className={styles.futureGrid}>
              <div className={styles.futureCard}>
                <div className={styles.futureIcon}>🧠</div>
                <h4>Smart Recommendations</h4>
                <p>
                  Right now, recommendations are basic. I want to build something that actually 
                  learns what you like—without tracking you. Local-first ML, maybe. Privacy-preserving 
                  personalization. It's possible; I just haven't done it yet.
                </p>
                <span className={styles.futureComplexity}>Difficulty: Hard</span>
              </div>
              <div className={styles.futureCard}>
                <div className={styles.futureIcon}>📲</div>
                <h4>Install It Like an App</h4>
                <p>
                  PWA support. Add to home screen. Offline capability for your watchlist. Make it 
                  feel native without going through app stores that would definitely reject it.
                </p>
                <span className={styles.futureComplexity}>Difficulty: Medium</span>
              </div>
              <div className={styles.futureCard}>
                <div className={styles.futureIcon}>🌍</div>
                <h4>More Languages</h4>
                <p>
                  The interface is English-only. That's lazy. I want to support multiple languages, 
                  RTL layouts, regional content preferences. Make it accessible to everyone.
                </p>
                <span className={styles.futureComplexity}>Difficulty: Medium</span>
              </div>
              <div className={styles.futureCard}>
                <div className={styles.futureIcon}>🔊</div>
                <h4>Better Accessibility</h4>
                <p>
                  Screen reader support. Keyboard navigation everywhere. Reduced motion options. 
                  If I'm building something ethical, it should be usable by everyone.
                </p>
                <span className={styles.futureComplexity}>Difficulty: Medium</span>
              </div>
            </div>
          </section>

          {/* Conclusion */}
          <section id="conclusion" className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNumber}>XI</span>
              <h2>The Point of All This</h2>
            </div>
            <p className={styles.leadParagraph}>
              So here we are. I built a streaming platform. It works. It doesn't assault you with 
              pop-ups. It doesn't mine crypto on your CPU. It doesn't track you across the web. It 
              doesn't have fake close buttons or dark patterns or any of the other bullshit that 
              pirate streaming sites have normalized.
            </p>
            <p>
              And I did it alone. Part-time. With no money. Using free tools and stolen hours and 
              way too much coffee.
            </p>
            <p>
              That's the point. Not that I'm special—I'm not. The point is that if one person can 
              do this under these constraints, then every pirate streaming site that serves malware 
              is making a choice. They could do better. They could treat users like humans instead 
              of revenue sources. They choose not to because exploitation is more profitable than 
              ethics.
            </p>

            <div className={styles.conclusionQuote}>
              <div className={styles.quoteDecoration}>
                <span>"</span>
              </div>
              <blockquote>
                The pop-ups aren't necessary. The crypto miners aren't necessary. The tracking isn't 
                necessary. They're choices. And those choices tell you everything you need to know 
                about the people making them.
              </blockquote>
              <cite>— Vynx</cite>
            </div>

            <p>
              To the users: you deserve better. You don't have to accept malware as the price of 
              free content. Alternatives can exist.
            </p>
            <p>
              To the developers: if you have the skills to build something, build something good. 
              The world has enough exploitative garbage. Be better.
            </p>
            <p>
              To the operators of pirate streaming sites: I see you. I know what you're doing. And 
              I built this specifically to prove that you don't have to do it. Your greed is a 
              choice, and that choice defines you.
            </p>
            <p>
              Flyx exists because I got tired of watching the internet get worse. It's a small 
              thing—one platform, one developer, one statement. But it's proof that better is 
              possible. And sometimes, proof is enough.
            </p>
          </section>

          {/* Legal Framework */}
          <section id="legal" className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNumber}>XII</span>
              <h2>Legal Framework</h2>
            </div>

            <div className={styles.legalPreamble}>
              <div className={styles.legalIcon}>⚖️</div>
              <div className={styles.legalPreambleContent}>
                <h3>Terms of Service & Legal Notices</h3>
                <p>
                  The following terms constitute a binding legal agreement between you ("User," "you," 
                  or "your") and Flyx ("the Platform," "we," "us," or "our"). By accessing or using 
                  the Platform, you acknowledge that you have read, understood, and agree to be bound 
                  by these terms.
                </p>
                <div className={styles.legalMeta}>
                  <span><strong>Effective Date:</strong> November 29, 2025</span>
                  <span><strong>Version:</strong> 1.0</span>
                  <span><strong>Last Updated:</strong> November 29, 2025</span>
                </div>
              </div>
            </div>

            <div className={styles.legalContainer}>
              {/* Article 1 */}
              <div className={styles.legalArticle}>
                <div className={styles.articleHeader}>
                  <div className={styles.articleBadge}>Article 1</div>
                  <h4>Nature and Purpose of Service</h4>
                </div>
                <div className={styles.articleContent}>
                  <div className={styles.legalClause}>
                    <span className={styles.clauseNumber}>1.1</span>
                    <p>
                      Flyx is a personal, non-commercial technology demonstration project ("Project") 
                      created solely for educational, research, and portfolio purposes. The Project 
                      is designed to showcase modern web development techniques, architectural patterns, 
                      and the capabilities of contemporary development tools.
                    </p>
                  </div>
                  <div className={styles.legalClause}>
                    <span className={styles.clauseNumber}>1.2</span>
                    <p>
                      The Platform does not constitute a commercial streaming service and is not 
                      intended to compete with, replace, or substitute for any licensed streaming 
                      platform or content distribution service. It exists purely as a technical 
                      demonstration and learning exercise.
                    </p>
                  </div>
                  <div className={styles.legalClause}>
                    <span className={styles.clauseNumber}>1.3</span>
                    <p>
                      No fees are charged for access to the Platform. The Project generates no revenue 
                      and operates at zero profit. Any costs associated with hosting and operation are 
                      borne entirely by the developer as part of the educational exercise.
                    </p>
                  </div>
                  <div className={styles.legalClause}>
                    <span className={styles.clauseNumber}>1.4</span>
                    <p>
                      The Platform may be discontinued, modified, or removed at any time without notice, 
                      as befits its nature as a personal project rather than a commercial service with 
                      service level agreements.
                    </p>
                  </div>
                </div>
              </div>

              {/* Article 2 */}
              <div className={styles.legalArticle}>
                <div className={styles.articleHeader}>
                  <div className={styles.articleBadge}>Article 2</div>
                  <h4>Content Disclaimer and Third-Party Sources</h4>
                </div>
                <div className={styles.articleContent}>
                  <div className={styles.legalClause}>
                    <span className={styles.clauseNumber}>2.1</span>
                    <p>
                      The Platform does not host, store, upload, transmit, or distribute any video 
                      content, media files, or copyrighted materials on its servers or infrastructure. 
                      All content delivery occurs through third-party services.
                    </p>
                  </div>
                  <div className={styles.legalClause}>
                    <span className={styles.clauseNumber}>2.2</span>
                    <p>
                      All media content accessible through the Platform is sourced from third-party 
                      providers, publicly available APIs, and external hosting services over which we 
                      exercise no control and bear no responsibility for availability, accuracy, or 
                      legality.
                    </p>
                  </div>
                  <div className={styles.legalClause}>
                    <span className={styles.clauseNumber}>2.3</span>
                    <p>
                      The Platform functions as a technical interface—analogous to a web browser or 
                      search engine—that facilitates access to content hosted elsewhere on the internet. 
                      We do not select, curate, edit, or modify the content accessible through the Platform.
                    </p>
                  </div>
                  <div className={styles.legalClause}>
                    <span className={styles.clauseNumber}>2.4</span>
                    <p>
                      We make no representations or warranties regarding the legality, accuracy, quality, 
                      safety, or appropriateness of any third-party content. Users access such content 
                      entirely at their own risk and discretion.
                    </p>
                  </div>
                  <div className={styles.legalClause}>
                    <span className={styles.clauseNumber}>2.5</span>
                    <p>
                      The inclusion of any content accessible through the Platform does not constitute 
                      endorsement, sponsorship, or affiliation with the content creators, rights holders, 
                      or hosting providers.
                    </p>
                  </div>
                </div>
              </div>

              {/* Article 3 */}
              <div className={styles.legalArticle}>
                <div className={styles.articleHeader}>
                  <div className={styles.articleBadge}>Article 3</div>
                  <h4>Intellectual Property and DMCA Compliance</h4>
                </div>
                <div className={styles.articleContent}>
                  <div className={styles.legalClause}>
                    <span className={styles.clauseNumber}>3.1</span>
                    <p>
                      We respect the intellectual property rights of others and expect users of the 
                      Platform to do the same. We comply with the provisions of the Digital Millennium 
                      Copyright Act (DMCA) and similar international copyright frameworks.
                    </p>
                  </div>
                  <div className={styles.legalClause}>
                    <span className={styles.clauseNumber}>3.2</span>
                    <p>
                      If you believe that content accessible through the Platform infringes your 
                      copyright, please note that we do not host such content directly. However, we 
                      will promptly investigate and, where appropriate, remove or disable access to 
                      any links, references, or technical integrations that facilitate access to 
                      allegedly infringing material.
                    </p>
                  </div>
                  <div className={styles.legalHighlight}>
                    <div className={styles.highlightHeader}>
                      <span className={styles.highlightIcon}>📋</span>
                      <span>DMCA Takedown Notice Requirements</span>
                    </div>
                    <p>To submit a valid DMCA takedown notice, please provide:</p>
                    <ul>
                      <li>Identification of the copyrighted work claimed to be infringed</li>
                      <li>Identification of the material claimed to be infringing and information sufficient to locate it</li>
                      <li>Your contact information (name, address, telephone, email)</li>
                      <li>A statement that you have a good faith belief that use of the material is not authorized</li>
                      <li>A statement, under penalty of perjury, that the information is accurate and you are authorized to act on behalf of the copyright owner</li>
                    </ul>
                  </div>
                  <div className={styles.legalClause}>
                    <span className={styles.clauseNumber}>3.4</span>
                    <p>
                      The source code, design, and original technical implementations of the Platform 
                      itself are the intellectual property of the developer. Third-party libraries and 
                      frameworks are used in accordance with their respective open-source licenses.
                    </p>
                  </div>
                </div>
              </div>

              {/* Article 4 */}
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
                        THE PLATFORM IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT 
                        WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED 
                        TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, 
                        TITLE, AND NON-INFRINGEMENT.
                      </p>
                    </div>
                  </div>
                  <div className={styles.legalClause}>
                    <span className={styles.clauseNumber}>4.2</span>
                    <p>
                      We do not warrant that: (a) the Platform will meet your requirements; (b) the 
                      Platform will be uninterrupted, timely, secure, or error-free; (c) the results 
                      obtained from use of the Platform will be accurate or reliable; (d) the quality 
                      of any content or services obtained through the Platform will meet your expectations; 
                      or (e) any errors in the Platform will be corrected.
                    </p>
                  </div>
                  <div className={styles.legalClause}>
                    <span className={styles.clauseNumber}>4.3</span>
                    <p>
                      Any content downloaded or otherwise obtained through the Platform is accessed at 
                      your own discretion and risk, and you will be solely responsible for any damage 
                      to your computer system or loss of data that results from such access.
                    </p>
                  </div>
                </div>
              </div>

              {/* Article 5 */}
              <div className={styles.legalArticle}>
                <div className={styles.articleHeader}>
                  <div className={styles.articleBadge}>Article 5</div>
                  <h4>Limitation of Liability</h4>
                </div>
                <div className={styles.articleContent}>
                  <div className={styles.legalWarning}>
                    <div className={styles.warningIcon}>🛡️</div>
                    <div className={styles.warningContent}>
                      <p>
                        TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL THE 
                        PLATFORM, ITS DEVELOPER, OR ANY AFFILIATED PARTIES BE LIABLE FOR ANY INDIRECT, 
                        INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES.
                      </p>
                    </div>
                  </div>
                  <div className={styles.legalClause}>
                    <span className={styles.clauseNumber}>5.2</span>
                    <p>
                      This limitation applies regardless of whether such damages arise from: (a) your 
                      access to, use of, or inability to access or use the Platform; (b) any conduct 
                      or content of any third party on or accessed through the Platform; (c) any content 
                      obtained from or through the Platform; (d) unauthorized access, use, or alteration 
                      of your transmissions or content.
                    </p>
                  </div>
                  <div className={styles.legalClause}>
                    <span className={styles.clauseNumber}>5.3</span>
                    <p>
                      In no event shall our total liability to you for all claims arising from or 
                      relating to the Platform exceed the amount you paid us in the twelve (12) months 
                      preceding the claim, which, given the free nature of the Platform, is zero dollars ($0.00).
                    </p>
                  </div>
                </div>
              </div>

              {/* Article 6 */}
              <div className={styles.legalArticle}>
                <div className={styles.articleHeader}>
                  <div className={styles.articleBadge}>Article 6</div>
                  <h4>User Responsibilities and Prohibited Conduct</h4>
                </div>
                <div className={styles.articleContent}>
                  <div className={styles.legalClause}>
                    <span className={styles.clauseNumber}>6.1</span>
                    <p>
                      By using the Platform, you represent and warrant that you are at least 18 years 
                      of age or the age of majority in your jurisdiction, whichever is greater, or are 
                      using the Platform under the supervision of a parent or legal guardian.
                    </p>
                  </div>
                  <div className={styles.legalClause}>
                    <span className={styles.clauseNumber}>6.2</span>
                    <p>
                      You agree to comply with all applicable local, state, national, and international 
                      laws and regulations in connection with your use of the Platform.
                    </p>
                  </div>
                  <div className={styles.prohibitedList}>
                    <h5>Prohibited Activities</h5>
                    <div className={styles.prohibitedGrid}>
                      <div className={styles.prohibitedItem}>
                        <span className={styles.prohibitedIcon}>🚫</span>
                        <span>Using the Platform for any unlawful purpose</span>
                      </div>
                      <div className={styles.prohibitedItem}>
                        <span className={styles.prohibitedIcon}>🚫</span>
                        <span>Attempting unauthorized access to systems</span>
                      </div>
                      <div className={styles.prohibitedItem}>
                        <span className={styles.prohibitedIcon}>🚫</span>
                        <span>Interfering with Platform operations</span>
                      </div>
                      <div className={styles.prohibitedItem}>
                        <span className={styles.prohibitedIcon}>🚫</span>
                        <span>Using automated scraping tools</span>
                      </div>
                      <div className={styles.prohibitedItem}>
                        <span className={styles.prohibitedIcon}>🚫</span>
                        <span>Circumventing security features</span>
                      </div>
                      <div className={styles.prohibitedItem}>
                        <span className={styles.prohibitedIcon}>🚫</span>
                        <span>Transmitting malicious code</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Article 7 */}
              <div className={styles.legalArticle}>
                <div className={styles.articleHeader}>
                  <div className={styles.articleBadge}>Article 7</div>
                  <h4>Privacy and Data Practices</h4>
                </div>
                <div className={styles.articleContent}>
                  <div className={styles.privacyHighlight}>
                    <div className={styles.privacyIcon}>🔐</div>
                    <div className={styles.privacyContent}>
                      <h5>Our Privacy Commitment</h5>
                      <p>
                        We are committed to protecting your privacy. The Platform employs anonymized 
                        tracking for analytics purposes only and does not collect personally 
                        identifiable information.
                      </p>
                    </div>
                  </div>
                  <div className={styles.privacyGrid}>
                    <div className={styles.privacyCard}>
                      <span className={styles.privacyCardIcon}>✓</span>
                      <h5>What We Don't Collect</h5>
                      <ul>
                        <li>Names or email addresses</li>
                        <li>Physical addresses</li>
                        <li>Phone numbers</li>
                        <li>Government IDs</li>
                        <li>Payment information</li>
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
                        <li>Error logs (anonymized)</li>
                      </ul>
                    </div>
                  </div>
                  <div className={styles.legalClause}>
                    <span className={styles.clauseNumber}>7.4</span>
                    <p>
                      No user data is sold, rented, leased, or otherwise transferred to third parties 
                      for any purpose. Aggregate, anonymized analytics may be referenced in technical 
                      documentation or presentations about the Project.
                    </p>
                  </div>
                  <div className={styles.legalClause}>
                    <span className={styles.clauseNumber}>7.5</span>
                    <p>
                      You may clear all locally stored data at any time by clearing your browser's 
                      local storage and session storage. This will reset your anonymous identifier 
                      and any stored preferences.
                    </p>
                  </div>
                </div>
              </div>

              {/* Article 8 */}
              <div className={styles.legalArticle}>
                <div className={styles.articleHeader}>
                  <div className={styles.articleBadge}>Article 8</div>
                  <h4>Indemnification</h4>
                </div>
                <div className={styles.articleContent}>
                  <div className={styles.legalClause}>
                    <span className={styles.clauseNumber}>8.1</span>
                    <p>
                      You agree to defend, indemnify, and hold harmless the Platform, its developer, 
                      and any affiliated parties from and against any and all claims, liabilities, 
                      damages, judgments, awards, losses, costs, expenses, and fees (including 
                      reasonable attorneys' fees) arising out of or relating to: (a) your violation 
                      of these terms; (b) your use of the Platform; (c) your violation of any rights 
                      of any third party; or (d) any content you access through the Platform.
                    </p>
                  </div>
                  <div className={styles.legalClause}>
                    <span className={styles.clauseNumber}>8.2</span>
                    <p>
                      We reserve the right, at our own expense, to assume the exclusive defense and 
                      control of any matter otherwise subject to indemnification by you, in which 
                      event you will cooperate with us in asserting any available defenses.
                    </p>
                  </div>
                </div>
              </div>

              {/* Article 9 */}
              <div className={styles.legalArticle}>
                <div className={styles.articleHeader}>
                  <div className={styles.articleBadge}>Article 9</div>
                  <h4>Dispute Resolution and Governing Law</h4>
                </div>
                <div className={styles.articleContent}>
                  <div className={styles.legalClause}>
                    <span className={styles.clauseNumber}>9.1</span>
                    <p>
                      These terms shall be governed by and construed in accordance with applicable 
                      laws, without regard to principles of conflict of laws.
                    </p>
                  </div>
                  <div className={styles.legalClause}>
                    <span className={styles.clauseNumber}>9.2</span>
                    <p>
                      Any dispute, controversy, or claim arising out of or relating to these terms 
                      or the Platform shall be resolved through binding arbitration in accordance 
                      with applicable arbitration rules. The arbitration shall be conducted in English.
                    </p>
                  </div>
                  <div className={styles.legalWarning}>
                    <div className={styles.warningIcon}>⚠️</div>
                    <div className={styles.warningContent}>
                      <p>
                        YOU UNDERSTAND AND AGREE THAT BY ENTERING INTO THESE TERMS, YOU AND THE 
                        PLATFORM ARE EACH WAIVING THE RIGHT TO A TRIAL BY JURY AND THE RIGHT TO 
                        PARTICIPATE IN A CLASS ACTION.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Article 10 */}
              <div className={styles.legalArticle}>
                <div className={styles.articleHeader}>
                  <div className={styles.articleBadge}>Article 10</div>
                  <h4>Modifications and Termination</h4>
                </div>
                <div className={styles.articleContent}>
                  <div className={styles.legalClause}>
                    <span className={styles.clauseNumber}>10.1</span>
                    <p>
                      We reserve the right to modify, suspend, or discontinue the Platform (or any 
                      part thereof) at any time, with or without notice. We shall not be liable to 
                      you or any third party for any modification, suspension, or discontinuance.
                    </p>
                  </div>
                  <div className={styles.legalClause}>
                    <span className={styles.clauseNumber}>10.2</span>
                    <p>
                      We may revise these terms from time to time. The most current version will 
                      always be available on the Platform. By continuing to access or use the Platform 
                      after revisions become effective, you agree to be bound by the revised terms.
                    </p>
                  </div>
                  <div className={styles.legalClause}>
                    <span className={styles.clauseNumber}>10.3</span>
                    <p>
                      We may terminate or suspend your access to the Platform immediately, without 
                      prior notice or liability, for any reason whatsoever, including without 
                      limitation if you breach these terms.
                    </p>
                  </div>
                </div>
              </div>

              {/* Article 11 */}
              <div className={styles.legalArticle}>
                <div className={styles.articleHeader}>
                  <div className={styles.articleBadge}>Article 11</div>
                  <h4>General Provisions</h4>
                </div>
                <div className={styles.articleContent}>
                  <div className={styles.generalProvisions}>
                    <div className={styles.provisionItem}>
                      <h5>11.1 Severability</h5>
                      <p>
                        If any provision of these terms is held to be invalid, illegal, or 
                        unenforceable, such provision shall be modified to the minimum extent 
                        necessary to make it valid and enforceable, and the remaining provisions 
                        shall continue in full force and effect.
                      </p>
                    </div>
                    <div className={styles.provisionItem}>
                      <h5>11.2 Waiver</h5>
                      <p>
                        No waiver of any term or condition of these terms shall be deemed a further 
                        or continuing waiver of such term or any other term, and our failure to 
                        assert any right or provision shall not constitute a waiver.
                      </p>
                    </div>
                    <div className={styles.provisionItem}>
                      <h5>11.3 Entire Agreement</h5>
                      <p>
                        These terms constitute the entire agreement between you and the Platform 
                        regarding your use of the Platform and supersede all prior agreements 
                        and understandings.
                      </p>
                    </div>
                    <div className={styles.provisionItem}>
                      <h5>11.4 Assignment</h5>
                      <p>
                        You may not assign or transfer these terms or your rights hereunder without 
                        our prior written consent. We may assign our rights and obligations without 
                        restriction.
                      </p>
                    </div>
                    <div className={styles.provisionItem}>
                      <h5>11.5 No Third-Party Beneficiaries</h5>
                      <p>
                        These terms do not confer any third-party beneficiary rights.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Legal Footer */}
              <div className={styles.legalFooter}>
                <div className={styles.legalFooterContent}>
                  <div className={styles.legalSeal}>
                    <div className={styles.sealIcon}>⚖️</div>
                    <span>Legal Framework v1.0</span>
                  </div>
                  <p className={styles.legalAcknowledgment}>
                    By accessing or using Flyx, you acknowledge that you have read this Legal 
                    Framework in its entirety, understand its terms, and agree to be legally 
                    bound by all provisions contained herein.
                  </p>
                  <div className={styles.legalDates}>
                    <span>Effective: November 29, 2025</span>
                    <span>•</span>
                    <span>Version 1.0</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* References */}
          <section id="references" className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNumber}>XIII</span>
              <h2>References</h2>
            </div>

            <div className={styles.referencesContainer}>
              <div className={styles.referenceItem}>
                <span className={styles.refNumber}>[1]</span>
                <p>
                  Rafique, M. Z., Van Goethem, T., Joosen, W., Huygens, C., & Nikiforakis, N. (2016). 
                  It's free for a reason: Exploring the ecosystem of free live streaming services. 
                  <em>Network and Distributed System Security Symposium (NDSS)</em>.
                </p>
              </div>
              <div className={styles.referenceItem}>
                <span className={styles.refNumber}>[2]</span>
                <p>
                  Konoth, R. K., Vineti, E., Moonsamy, V., Lindorfer, M., Kruegel, C., Bos, H., & Vigna, G. (2018). 
                  MineSweeper: An in-depth look into drive-by cryptocurrency mining and its defense. 
                  <em>ACM Conference on Computer and Communications Security (CCS)</em>.
                </p>
              </div>
              <div className={styles.referenceItem}>
                <span className={styles.refNumber}>[3]</span>
                <p>
                  Laperdrix, P., Bielova, N., Baudry, B., & Avoine, G. (2020). Browser fingerprinting: 
                  A survey. <em>ACM Transactions on the Web</em>, 14(2), 1-33.
                </p>
              </div>
              <div className={styles.referenceItem}>
                <span className={styles.refNumber}>[4]</span>
                <p>
                  Gray, C. M., Kou, Y., Battles, B., Hoggatt, J., & Toombs, A. L. (2018). The dark (patterns) 
                  side of UX design. <em>CHI Conference on Human Factors in Computing Systems</em>, 1-14.
                </p>
              </div>
              <div className={styles.referenceItem}>
                <span className={styles.refNumber}>[5]</span>
                <p>
                  Nikiforakis, N., Kapravelos, A., Joosen, W., Kruegel, C., Piessens, F., & Vigna, G. (2013). 
                  Cookieless monster: Exploring the ecosystem of web-based device fingerprinting. 
                  <em>IEEE Symposium on Security and Privacy</em>, 541-555.
                </p>
              </div>
              <div className={styles.referenceItem}>
                <span className={styles.refNumber}>[6]</span>
                <p>
                  Zarras, A., Kapravelos, A., Stringhini, G., Holz, T., Kruegel, C., & Vigna, G. (2014). 
                  The dark alleys of Madison Avenue: Understanding malicious advertisements. 
                  <em>Internet Measurement Conference (IMC)</em>, 373-380.
                </p>
              </div>
              <div className={styles.referenceItem}>
                <span className={styles.refNumber}>[7]</span>
                <p>
                  Englehardt, S., & Narayanan, A. (2016). Online tracking: A 1-million-site measurement 
                  and analysis. <em>ACM Conference on Computer and Communications Security (CCS)</em>, 1388-1401.
                </p>
              </div>
              <div className={styles.referenceItem}>
                <span className={styles.refNumber}>[8]</span>
                <p>
                  Mathur, A., Acar, G., Friedman, M. J., Lucherini, E., Mayer, J., Chetty, M., & Narayanan, A. (2019). 
                  Dark patterns at scale: Findings from a crawl of 11K shopping websites. 
                  <em>ACM Human-Computer Interaction</em>, 3(CSCW), 1-32.
                </p>
              </div>
              <div className={styles.referenceItem}>
                <span className={styles.refNumber}>[9]</span>
                <p>
                  Mayer, J. R., & Mitchell, J. C. (2012). Third-party web tracking: Policy and technology. 
                  <em>IEEE Symposium on Security and Privacy</em>, 413-427.
                </p>
              </div>
              <div className={styles.referenceItem}>
                <span className={styles.refNumber}>[10]</span>
                <p>
                  Stockhammer, T. (2011). Dynamic adaptive streaming over HTTP: standards and design principles. 
                  <em>Proceedings of the Second Annual ACM Conference on Multimedia Systems</em>, 133-144.
                </p>
              </div>
              <div className={styles.referenceItem}>
                <span className={styles.refNumber}>[11]</span>
                <p>
                  Electronic Frontier Foundation. (2024). Privacy Badger: How it works. 
                  <em>EFF Technical Documentation</em>.
                </p>
              </div>
              <div className={styles.referenceItem}>
                <span className={styles.refNumber}>[12]</span>
                <p>
                  Mozilla Foundation. (2023). State of Mozilla: Privacy and the Internet. 
                  <em>Mozilla Annual Report</em>.
                </p>
              </div>
            </div>
          </section>
        </article>
      </div>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <Link href="/" className={styles.backButton}>
            <span className={styles.backArrow}>←</span>
            <span>Return to Platform</span>
          </Link>
          <div className={styles.footerInfo}>
            <p className={styles.footerTitle}>Flyx</p>
            <p className={styles.footerSubtitle}>Built by Vynx • Proving Ethical Streaming is Possible • 2025</p>
          </div>
          <div className={styles.footerMeta}>
            <span>No Ads • No Tracking • No Exploitation</span>
            <span>Just Streaming</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

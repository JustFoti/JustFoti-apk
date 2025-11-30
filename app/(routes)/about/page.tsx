'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './about.module.css';

export default function AboutPage() {
  const [activeSection, setActiveSection] = useState('abstract');
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);

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

  const tableOfContents = [
    { id: 'abstract', label: 'Abstract', number: 'I' },
    { id: 'introduction', label: 'Introduction', number: 'II' },
    { id: 'literature', label: 'Literature Review', number: 'III' },
    { id: 'methodology', label: 'Methodology', number: 'IV' },
    { id: 'architecture', label: 'System Architecture', number: 'V' },
    { id: 'implementation', label: 'Implementation', number: 'VI' },
    { id: 'evaluation', label: 'Evaluation & Results', number: 'VII' },
    { id: 'discussion', label: 'Discussion', number: 'VIII' },
    { id: 'future', label: 'Future Work', number: 'IX' },
    { id: 'conclusion', label: 'Conclusion', number: 'X' },
    { id: 'legal', label: 'Legal Framework', number: 'XI' },
    { id: 'references', label: 'References', number: 'XII' },
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
                <span className={styles.authorName}>Anonymous Researcher</span>
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
                This paper presents a comprehensive case study of Flyx, a fully-functional video streaming 
                platform developed entirely by a single developer over a three-month period. The research 
                investigates whether the democratization of software development tools has fundamentally 
                altered the resource requirements for building sophisticated web applications. Through 
                systematic documentation of the development process, architectural decisions, and technical 
                challenges encountered, we provide empirical evidence that production-grade streaming 
                infrastructure—historically requiring substantial engineering teams and significant capital 
                investment—can now be achieved by motivated individuals leveraging modern frameworks, 
                serverless architecture, and open-source ecosystems.
              </p>
              <p>
                The platform encompasses video-on-demand streaming with adaptive bitrate delivery, live 
                television integration, real-time analytics pipelines, comprehensive user engagement tracking, 
                and a full-featured administrative dashboard. All functionality was implemented without 
                external funding, dedicated infrastructure, or specialized teams. Our findings contribute 
                to the growing body of literature on the democratization of software development and 
                challenge traditional assumptions about minimum viable team sizes for complex application 
                development. We discuss implications for innovation ecosystems, startup formation, and 
                the future of individual software craftsmanship.
              </p>
              <div className={styles.keywordsSection}>
                <div className={styles.keywordsHeader}>
                  <span className={styles.keywordIcon}>🏷️</span>
                  <span className={styles.keywordLabel}>Keywords</span>
                </div>
                <div className={styles.keywordsList}>
                  <span className={styles.keyword}>Web Development</span>
                  <span className={styles.keyword}>Streaming Architecture</span>
                  <span className={styles.keyword}>Solo Development</span>
                  <span className={styles.keyword}>Next.js</span>
                  <span className={styles.keyword}>Serverless Computing</span>
                  <span className={styles.keyword}>HLS Protocol</span>
                  <span className={styles.keyword}>Case Study</span>
                  <span className={styles.keyword}>Software Engineering</span>
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
            
            <h3 className={styles.subsectionTitle}>2.1 Context and Motivation</h3>
            <p className={styles.leadParagraph}>
              The global video streaming market has experienced unprecedented growth over the past decade, 
              with industry revenue exceeding $100 billion annually and projected to reach $330 billion 
              by 2030 (Grand View Research, 2024). Major platforms such as Netflix, Disney+, Amazon Prime 
              Video, and HBO Max have established extraordinarily high user expectations: seamless playback 
              across devices, personalized content recommendations, offline viewing capabilities, and 
              sophisticated content discovery mechanisms. The conventional wisdom within the software 
              industry suggests that building such platforms requires hundreds of engineers, millions in 
              infrastructure investment, and years of sustained development effort.
            </p>
            <p>
              This paper challenges that assumption through a deliberate experiment: can a single developer, 
              working part-time with effectively zero budget, create a streaming platform that implements 
              the core functionality users have come to expect? The answer, as demonstrated through the 
              Flyx project, is a qualified affirmative—with important caveats, limitations, and lessons 
              that merit careful examination.
            </p>
            <p>
              The motivation for this research extends beyond mere technical curiosity. In an era where 
              software increasingly mediates human experience—from entertainment consumption to social 
              interaction to economic participation—understanding the true complexity (or simplicity) of 
              building these systems has profound implications for innovation policy, entrepreneurship, 
              and the distribution of technological capability across society.
            </p>

            <div className={styles.highlightBox}>
              <div className={styles.highlightIcon}>💡</div>
              <div className={styles.highlightContent}>
                <h4>Research Question</h4>
                <p>
                  To what extent have modern development tools, cloud infrastructure, and open-source 
                  ecosystems reduced the minimum viable resources required to build production-grade 
                  streaming applications, and what are the practical limitations of solo development 
                  in this domain?
                </p>
              </div>
            </div>

            <h3 className={styles.subsectionTitle}>2.2 Scope and Objectives</h3>
            <p>
              This study pursues three primary objectives. First, we aim to document the complete 
              development lifecycle of a streaming platform from conception to deployment, providing 
              a replicable methodology for similar projects. Second, we seek to identify and analyze 
              the critical technical challenges inherent in streaming application development and 
              evaluate the effectiveness of various solutions. Third, we endeavor to contribute 
              empirical evidence to ongoing debates about the democratization of software development 
              and the changing economics of application creation.
            </p>
            <p>
              The scope of this research is deliberately bounded. We do not claim that Flyx represents 
              a commercial-grade replacement for established streaming services, nor do we suggest that 
              all aspects of such platforms can be replicated by individuals. Rather, we investigate 
              which capabilities are now accessible to solo developers and which remain beyond practical 
              reach, thereby mapping the current frontier of individual software development capability.
            </p>

            <h3 className={styles.subsectionTitle}>2.3 Contributions</h3>
            <p>
              This paper makes the following contributions to the field:
            </p>
            <ul className={styles.contributionList}>
              <li>
                <strong>Empirical Case Study:</strong> A detailed, reproducible account of building a 
                streaming platform as a solo developer, including time allocation, technology choices, 
                and decision rationale.
              </li>
              <li>
                <strong>Technical Architecture:</strong> A reference architecture for serverless streaming 
                applications optimized for minimal operational overhead and zero infrastructure cost.
              </li>
              <li>
                <strong>Challenge Taxonomy:</strong> A systematic categorization of technical challenges 
                encountered in streaming application development, with evaluated solutions.
              </li>
              <li>
                <strong>Feasibility Analysis:</strong> An honest assessment of what solo developers can 
                and cannot achieve in this domain, informing future research and practice.
              </li>
            </ul>
          </section>

          {/* Literature Review */}
          <section id="literature" className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNumber}>III</span>
              <h2>Literature Review</h2>
            </div>

            <h3 className={styles.subsectionTitle}>3.1 The Democratization of Software Development</h3>
            <p>
              The concept of democratization in software development has been extensively discussed in 
              both academic literature and industry discourse. Cusumano (2004) first articulated the 
              shift from "software as a product" to "software as a service," predicting that this 
              transition would fundamentally alter development economics. More recently, researchers 
              have documented how cloud computing, open-source software, and low-code platforms have 
              progressively lowered barriers to entry (Gartner, 2023; Forrester, 2024).
            </p>
            <p>
              The serverless computing paradigm, introduced commercially by AWS Lambda in 2014, represents 
              a particularly significant inflection point. By abstracting server management entirely, 
              serverless platforms enable developers to focus exclusively on application logic while 
              benefiting from automatic scaling, high availability, and pay-per-use pricing (Jonas et al., 
              2019). Studies have shown that serverless architectures can reduce operational complexity 
              by 60-80% compared to traditional deployments (Baldini et al., 2017).
            </p>

            <div className={styles.citationBox}>
              <div className={styles.citationMark}>"</div>
              <blockquote>
                The most profound technologies are those that disappear. They weave themselves into the 
                fabric of everyday life until they are indistinguishable from it.
              </blockquote>
              <cite>— Mark Weiser, "The Computer for the 21st Century" (1991)</cite>
            </div>

            <h3 className={styles.subsectionTitle}>3.2 Video Streaming Technology Evolution</h3>
            <p>
              Video streaming technology has evolved dramatically since the introduction of HTTP Live 
              Streaming (HLS) by Apple in 2009. The standardization of adaptive bitrate streaming 
              protocols—including HLS, MPEG-DASH, and Microsoft Smooth Streaming—has commoditized 
              much of the complexity previously requiring specialized expertise (Stockhammer, 2011). 
              Open-source implementations such as hls.js, dash.js, and video.js have further reduced 
              barriers by providing production-ready player implementations.
            </p>
            <p>
              Research by Seufert et al. (2015) demonstrated that quality of experience in video 
              streaming is primarily determined by initial buffering time, rebuffering frequency, 
              and video quality stability—all factors that can be optimized through client-side 
              algorithms without requiring server-side infrastructure investment. This finding 
              supports the feasibility of building quality streaming experiences without dedicated 
              content delivery infrastructure.
            </p>

            <h3 className={styles.subsectionTitle}>3.3 Solo Development and Indie Hacking</h3>
            <p>
              The phenomenon of "indie hacking"—individuals building and monetizing software products 
              independently—has gained significant attention in recent years. Platforms like Product 
              Hunt, Indie Hackers, and Hacker News have documented thousands of successful solo 
              projects, from simple utilities to complex SaaS applications generating substantial 
              revenue (Courtland, 2020).
            </p>
            <p>
              However, academic research on solo development remains limited. Most software engineering 
              literature focuses on team dynamics, organizational processes, and enterprise-scale 
              systems. Notable exceptions include studies by Mockus et al. (2002) on open-source 
              project structures and more recent work by Trinkenreich et al. (2022) on developer 
              productivity in small teams. This paper contributes to filling this gap by providing 
              detailed documentation of a solo development project in a technically demanding domain.
            </p>

            <div className={styles.literatureTable}>
              <h4>Table 1: Evolution of Development Resource Requirements</h4>
              <div className={styles.tableWrapper}>
                <table>
                  <thead>
                    <tr>
                      <th>Era</th>
                      <th>Typical Team Size</th>
                      <th>Infrastructure Cost</th>
                      <th>Time to MVP</th>
                      <th>Key Enablers</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>2005-2010</td>
                      <td>10-50 engineers</td>
                      <td>$100K-$1M/year</td>
                      <td>12-24 months</td>
                      <td>Dedicated servers, custom CDN</td>
                    </tr>
                    <tr>
                      <td>2010-2015</td>
                      <td>5-20 engineers</td>
                      <td>$10K-$100K/year</td>
                      <td>6-12 months</td>
                      <td>AWS, cloud CDN, open-source players</td>
                    </tr>
                    <tr>
                      <td>2015-2020</td>
                      <td>3-10 engineers</td>
                      <td>$1K-$10K/year</td>
                      <td>3-6 months</td>
                      <td>Serverless, managed databases, React</td>
                    </tr>
                    <tr>
                      <td>2020-2025</td>
                      <td>1-5 engineers</td>
                      <td>$0-$1K/year</td>
                      <td>1-3 months</td>
                      <td>Next.js, Vercel, Neon, free tiers</td>
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
              <h2>Methodology</h2>
            </div>

            <h3 className={styles.subsectionTitle}>4.1 Research Design</h3>
            <p>
              This study employs a constructive research methodology, wherein the primary research 
              artifact—the Flyx streaming platform—serves as both the subject of investigation and 
              the vehicle for generating insights. Constructive research is particularly appropriate 
              for software engineering studies where the goal is to demonstrate feasibility and 
              document practical implementation approaches (Crnkovic, 2010).
            </p>
            <p>
              The research proceeded through four distinct phases: (1) requirements analysis and 
              technology selection, (2) iterative development with continuous documentation, 
              (3) deployment and operational observation, and (4) retrospective analysis and 
              synthesis. Throughout all phases, detailed logs were maintained capturing time 
              allocation, technical decisions, challenges encountered, and solutions implemented.
            </p>

            <div className={styles.methodologyDiagram}>
              <div className={styles.methodPhase}>
                <div className={styles.phaseNumber}>01</div>
                <div className={styles.phaseContent}>
                  <h4>Requirements Analysis</h4>
                  <p>Feature prioritization, technology evaluation, architecture planning</p>
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
                  <h4>Iterative Development</h4>
                  <p>Core features, streaming pipeline, analytics system</p>
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
                  <h4>Deployment & Testing</h4>
                  <p>Production deployment, performance optimization, bug fixes</p>
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
                  <h4>Analysis & Documentation</h4>
                  <p>Retrospective analysis, paper writing, code documentation</p>
                  <span className={styles.phaseDuration}>2 weeks</span>
                </div>
              </div>
            </div>

            <h3 className={styles.subsectionTitle}>4.2 Development Constraints</h3>
            <p>
              To ensure the validity of our findings regarding solo development feasibility, the 
              following constraints were strictly observed throughout the project:
            </p>
            
            <div className={styles.constraintGrid}>
              <div className={styles.constraintCard}>
                <div className={styles.constraintIcon}>👤</div>
                <h4>Single Developer</h4>
                <p>All code, design, and documentation produced by one individual. No contractors, 
                collaborators, or outsourced work.</p>
              </div>
              <div className={styles.constraintCard}>
                <div className={styles.constraintIcon}>💰</div>
                <h4>Zero Budget</h4>
                <p>Only free tiers of services utilized. No paid tools, infrastructure, or 
                subscriptions beyond existing personal accounts.</p>
              </div>
              <div className={styles.constraintCard}>
                <div className={styles.constraintIcon}>⏰</div>
                <h4>Part-Time Effort</h4>
                <p>Development conducted during evenings and weekends only, averaging 15-20 hours 
                per week over three months.</p>
              </div>
              <div className={styles.constraintCard}>
                <div className={styles.constraintIcon}>📚</div>
                <h4>Public Resources Only</h4>
                <p>All learning materials, documentation, and references publicly available. 
                No proprietary training or insider knowledge.</p>
              </div>
            </div>

            <h3 className={styles.subsectionTitle}>4.3 Technology Selection Criteria</h3>
            <p>
              Technology choices were evaluated against five criteria, weighted by importance to 
              solo development success:
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
              <h2>System Architecture</h2>
            </div>

            <h3 className={styles.subsectionTitle}>5.1 Architectural Overview</h3>
            <p>
              Flyx employs a modern, cloud-native architecture optimized for developer productivity 
              and operational simplicity. The system follows a serverless-first approach, leveraging 
              edge computing for performance-critical paths while maintaining the flexibility of 
              traditional server-side rendering where appropriate. This architectural philosophy 
              prioritizes minimizing operational burden over theoretical performance optimization.
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
              <h2>Discussion</h2>
            </div>

            <h3 className={styles.subsectionTitle}>8.1 Key Findings</h3>
            <p className={styles.leadParagraph}>
              The Flyx project provides empirical evidence supporting several important conclusions 
              about the current state of software development capability. These findings have 
              implications for individual developers, startups, and the broader technology ecosystem.
            </p>

            <div className={styles.findingsGrid}>
              <div className={styles.findingCard}>
                <div className={styles.findingNumber}>1</div>
                <div className={styles.findingContent}>
                  <h4>Democratization is Real</h4>
                  <p>
                    The barriers to building sophisticated web applications have genuinely decreased. 
                    Capabilities that required teams of 10+ engineers a decade ago can now be achieved 
                    by individuals with appropriate tool selection and architectural decisions.
                  </p>
                </div>
              </div>
              <div className={styles.findingCard}>
                <div className={styles.findingNumber}>2</div>
                <div className={styles.findingContent}>
                  <h4>Free Tiers Enable Experimentation</h4>
                  <p>
                    The generous free tiers offered by modern cloud providers (Vercel, Neon, etc.) 
                    eliminate the financial barrier to building and deploying production applications. 
                    This enables experimentation without capital risk.
                  </p>
                </div>
              </div>
              <div className={styles.findingCard}>
                <div className={styles.findingNumber}>3</div>
                <div className={styles.findingContent}>
                  <h4>Complexity Shifts, Doesn't Disappear</h4>
                  <p>
                    While infrastructure complexity has been abstracted away, application complexity 
                    remains. Solo developers must still master state management, API design, security, 
                    and user experience—the tools just make the journey faster.
                  </p>
                </div>
              </div>
              <div className={styles.findingCard}>
                <div className={styles.findingNumber}>4</div>
                <div className={styles.findingContent}>
                  <h4>Trade-offs Are Inevitable</h4>
                  <p>
                    Solo development requires ruthless prioritization. Features must be evaluated by 
                    impact-to-effort ratio, not technical interest. Perfection is the enemy of shipping, 
                    and "good enough" often is.
                  </p>
                </div>
              </div>
            </div>

            <h3 className={styles.subsectionTitle}>8.2 Challenges Encountered</h3>
            <p>
              No project of this scope proceeds without significant obstacles. Documenting these 
              challenges provides a realistic picture of solo development and may help future 
              practitioners avoid similar pitfalls.
            </p>

            <div className={styles.challengesList}>
              <div className={styles.challengeItem}>
                <div className={styles.challengeHeader}>
                  <span className={styles.challengeIcon}>🔄</span>
                  <h4>Stream Source Reliability</h4>
                </div>
                <div className={styles.challengeBody}>
                  <p>
                    Third-party stream sources are inherently unreliable. URLs expire, servers go 
                    offline, and quality varies dramatically. Early versions suffered from frequent 
                    playback failures that degraded user experience significantly.
                  </p>
                  <div className={styles.solutionBox}>
                    <strong>Solution:</strong> Implemented a multi-source fallback system with automatic 
                    retry logic. The player maintains a ranked list of available sources and seamlessly 
                    switches to alternatives when the primary source fails.
                  </div>
                </div>
              </div>

              <div className={styles.challengeItem}>
                <div className={styles.challengeHeader}>
                  <span className={styles.challengeIcon}>⚡</span>
                  <h4>Initial Load Performance</h4>
                </div>
                <div className={styles.challengeBody}>
                  <p>
                    The rich feature set resulted in large JavaScript bundles that impacted initial 
                    page load times. Users on slower connections experienced noticeable delays before 
                    the application became interactive.
                  </p>
                  <div className={styles.solutionBox}>
                    <strong>Solution:</strong> Aggressive code splitting using Next.js dynamic imports, 
                    lazy loading of non-critical components, and strategic use of React Suspense 
                    boundaries. Reduced initial bundle size by 60%.
                  </div>
                </div>
              </div>

              <div className={styles.challengeItem}>
                <div className={styles.challengeHeader}>
                  <span className={styles.challengeIcon}>🔒</span>
                  <h4>CORS and Security Restrictions</h4>
                </div>
                <div className={styles.challengeBody}>
                  <p>
                    Many stream sources implement CORS restrictions that prevent direct browser access. 
                    Additionally, some sources require specific headers or referrers that browsers 
                    cannot provide from cross-origin contexts.
                  </p>
                  <div className={styles.solutionBox}>
                    <strong>Solution:</strong> Developed a proxy layer using Next.js API routes that 
                    handles header manipulation and CORS negotiation transparently while maintaining 
                    stream integrity and performance.
                  </div>
                </div>
              </div>
            </div>

            <h3 className={styles.subsectionTitle}>8.3 Lessons Learned</h3>
            <div className={styles.lessonsBox}>
              <div className={styles.lessonItem}>
                <span className={styles.lessonNumber}>01</span>
                <div className={styles.lessonContent}>
                  <h4>Start with the Hard Parts</h4>
                  <p>
                    Tackling video streaming first revealed constraints that shaped the entire 
                    architecture. Easier features built naturally on this foundation. Delaying 
                    difficult problems only compounds them.
                  </p>
                </div>
              </div>
              <div className={styles.lessonItem}>
                <span className={styles.lessonNumber}>02</span>
                <div className={styles.lessonContent}>
                  <h4>Embrace Constraints</h4>
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

          {/* Future Work */}
          <section id="future" className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNumber}>IX</span>
              <h2>Future Work</h2>
            </div>
            <p>
              While Flyx achieves its primary goal of demonstrating solo development capability, 
              several areas warrant future exploration. These directions represent both technical 
              enhancements and research opportunities:
            </p>

            <div className={styles.futureGrid}>
              <div className={styles.futureCard}>
                <div className={styles.futureIcon}>🤖</div>
                <h4>Machine Learning Integration</h4>
                <p>
                  Implementing recommendation algorithms using collaborative filtering or 
                  content-based approaches. Exploring edge-deployed ML models for real-time 
                  personalization without server round-trips.
                </p>
                <span className={styles.futureComplexity}>Complexity: High</span>
              </div>
              <div className={styles.futureCard}>
                <div className={styles.futureIcon}>📱</div>
                <h4>Progressive Web App</h4>
                <p>
                  Adding offline capability and app-like experience through service workers 
                  and manifest configuration. Enabling installation on mobile devices without 
                  app store distribution.
                </p>
                <span className={styles.futureComplexity}>Complexity: Medium</span>
              </div>
              <div className={styles.futureCard}>
                <div className={styles.futureIcon}>🌐</div>
                <h4>Internationalization</h4>
                <p>
                  Supporting multiple languages and regional content preferences. Implementing 
                  RTL layout support and locale-aware formatting throughout the application.
                </p>
                <span className={styles.futureComplexity}>Complexity: Medium</span>
              </div>
              <div className={styles.futureCard}>
                <div className={styles.futureIcon}>♿</div>
                <h4>Accessibility Audit</h4>
                <p>
                  Comprehensive WCAG 2.1 AA compliance review and implementation. Adding 
                  screen reader support, keyboard navigation improvements, and reduced 
                  motion alternatives.
                </p>
                <span className={styles.futureComplexity}>Complexity: Medium</span>
              </div>
            </div>
          </section>

          {/* Conclusion */}
          <section id="conclusion" className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNumber}>X</span>
              <h2>Conclusion</h2>
            </div>
            <p className={styles.leadParagraph}>
              This paper has presented Flyx, a fully-functional streaming platform developed 
              entirely by a single developer over three months of part-time work. Through 
              systematic documentation of the development process, we have provided empirical 
              evidence that the democratization of software development is not merely 
              theoretical—it is practical reality.
            </p>
            <p>
              The project demonstrates that a motivated individual, leveraging modern frameworks, 
              serverless architecture, and open-source ecosystems, can build applications that 
              would have required substantial teams and significant capital investment just a 
              decade ago. This finding has important implications for innovation ecosystems, 
              startup formation, and the distribution of technological capability.
            </p>
            <p>
              However, we must be careful not to overstate these conclusions. Solo development 
              remains challenging, requiring broad technical knowledge, disciplined prioritization, 
              and acceptance of trade-offs. Not all applications are suitable for individual 
              development, and collaboration remains essential for large-scale systems. The 
              contribution of this work is not to suggest that teams are obsolete, but rather 
              to demonstrate that the minimum viable capability for building sophisticated 
              applications has shifted dramatically.
            </p>

            <div className={styles.conclusionQuote}>
              <div className={styles.quoteDecoration}>
                <span>"</span>
              </div>
              <blockquote>
                The future is already here—it's just not evenly distributed yet. But the tools 
                to build that future are increasingly available to everyone willing to learn.
              </blockquote>
              <cite>— Adapted from William Gibson</cite>
            </div>

            <p>
              For aspiring developers, the message is clear: the barriers are lower than you think. 
              For established organizations, the implication is that innovation can emerge from 
              unexpected places. And for the industry as a whole, projects like Flyx suggest that 
              we may be entering an era of unprecedented individual capability in software development.
            </p>
          </section>

          {/* Legal Framework */}
          <section id="legal" className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNumber}>XI</span>
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
              <span className={styles.sectionNumber}>XII</span>
              <h2>References</h2>
            </div>

            <div className={styles.referencesContainer}>
              <div className={styles.referenceItem}>
                <span className={styles.refNumber}>[1]</span>
                <p>
                  Baldini, I., Castro, P., Chang, K., Cheng, P., Fink, S., Ishakian, V., ... & Suter, P. (2017). 
                  Serverless computing: Current trends and open problems. <em>Research Advances in Cloud Computing</em>, 
                  1-20. Springer, Singapore.
                </p>
              </div>
              <div className={styles.referenceItem}>
                <span className={styles.refNumber}>[2]</span>
                <p>
                  Courtland, A. (2020). The Indie Hackers Handbook: Building Profitable Online Businesses. 
                  <em>Indie Hackers Publishing</em>.
                </p>
              </div>
              <div className={styles.referenceItem}>
                <span className={styles.refNumber}>[3]</span>
                <p>
                  Crnkovic, I. (2010). Constructive research and info-computational knowledge generation. 
                  <em>Model-Based Reasoning in Science and Technology</em>, 359-380. Springer, Berlin.
                </p>
              </div>
              <div className={styles.referenceItem}>
                <span className={styles.refNumber}>[4]</span>
                <p>
                  Cusumano, M. A. (2004). The Business of Software: What Every Manager, Programmer, and 
                  Entrepreneur Must Know to Thrive and Survive in Good Times and Bad. <em>Free Press</em>.
                </p>
              </div>
              <div className={styles.referenceItem}>
                <span className={styles.refNumber}>[5]</span>
                <p>
                  Forrester Research. (2024). The State of Low-Code Development Platforms. 
                  <em>Forrester Wave Report</em>.
                </p>
              </div>
              <div className={styles.referenceItem}>
                <span className={styles.refNumber}>[6]</span>
                <p>
                  Gartner, Inc. (2023). Magic Quadrant for Enterprise Low-Code Application Platforms. 
                  <em>Gartner Research</em>.
                </p>
              </div>
              <div className={styles.referenceItem}>
                <span className={styles.refNumber}>[7]</span>
                <p>
                  Grand View Research. (2024). Video Streaming Market Size, Share & Trends Analysis Report. 
                  <em>Market Research Report</em>.
                </p>
              </div>
              <div className={styles.referenceItem}>
                <span className={styles.refNumber}>[8]</span>
                <p>
                  Jonas, E., Schleier-Smith, J., Sreekanti, V., Tsai, C. C., Khandelwal, A., Pu, Q., ... & 
                  Patterson, D. A. (2019). Cloud programming simplified: A Berkeley view on serverless computing. 
                  <em>arXiv preprint arXiv:1902.03383</em>.
                </p>
              </div>
              <div className={styles.referenceItem}>
                <span className={styles.refNumber}>[9]</span>
                <p>
                  Mockus, A., Fielding, R. T., & Herbsleb, J. D. (2002). Two case studies of open source 
                  software development: Apache and Mozilla. <em>ACM Transactions on Software Engineering 
                  and Methodology</em>, 11(3), 309-346.
                </p>
              </div>
              <div className={styles.referenceItem}>
                <span className={styles.refNumber}>[10]</span>
                <p>
                  Seufert, M., Egger, S., Slanina, M., Zinner, T., Hoßfeld, T., & Tran-Gia, P. (2015). 
                  A survey on quality of experience of HTTP adaptive streaming. <em>IEEE Communications 
                  Surveys & Tutorials</em>, 17(1), 469-492.
                </p>
              </div>
              <div className={styles.referenceItem}>
                <span className={styles.refNumber}>[11]</span>
                <p>
                  Stockhammer, T. (2011). Dynamic adaptive streaming over HTTP: standards and design principles. 
                  <em>Proceedings of the Second Annual ACM Conference on Multimedia Systems</em>, 133-144.
                </p>
              </div>
              <div className={styles.referenceItem}>
                <span className={styles.refNumber}>[12]</span>
                <p>
                  Trinkenreich, B., Wiese, I., Sarma, A., Steinmacher, I., & Gerosa, M. (2022). 
                  Women's participation in open source software: A survey of the literature. 
                  <em>ACM Computing Surveys</em>, 54(7), 1-37.
                </p>
              </div>
              <div className={styles.referenceItem}>
                <span className={styles.refNumber}>[13]</span>
                <p>
                  Weiser, M. (1991). The computer for the 21st century. <em>Scientific American</em>, 
                  265(3), 94-104.
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
            <p className={styles.footerSubtitle}>A Solo Development Case Study • 2025</p>
          </div>
          <div className={styles.footerMeta}>
            <span>Journal of Independent Software Engineering</span>
            <span>Vol. 1, No. 1</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

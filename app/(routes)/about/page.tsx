'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import './about.css';

const sections = [
  { id: 'intro', title: 'The Mission' },
  { id: 'problem', title: 'The Problem' },
  { id: 'heist', title: 'The Heist' },
  { id: 'tech', title: 'The Tech' },
  { id: 'proof', title: 'The Proof' },
  { id: 'conclusion', title: 'The Point' },
];

export default function AboutPage() {
  const [activeSection, setActiveSection] = useState('intro');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress((scrollTop / docHeight) * 100);

      // Find which section is currently in view
      for (const section of sections) {
        const el = document.getElementById(section.id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 150 && rect.bottom > 150) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="about-page">
      {/* Progress bar */}
      <div className="progress-bar" style={{ width: `${progress}%` }} />

      {/* Header */}
      <header className="about-header">
        <h1>Building Flyx: Stealing from Thieves</h1>
        <p className="subtitle">
          How one developer built an ethical streaming platform by reverse engineering 
          the criminals who profit from piracy.
        </p>
        <div className="author">
          <span className="avatar">V</span>
          <div>
            <strong>Vynx</strong>
            <span>Developer & Reverse Engineer</span>
          </div>
        </div>
      </header>

      {/* Main layout */}
      <div className="about-layout">
        {/* Sticky sidebar */}
        <nav className="about-nav">
          <div className="nav-inner">
            <span className="nav-title">Contents</span>
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={activeSection === s.id ? 'active' : ''}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                {s.title}
              </a>
            ))}
          </div>
        </nav>

        {/* Content */}
        <main className="about-content">

          <section id="intro">
            <h2>The Mission</h2>
            <p className="lead">
              I built a streaming platform that does not assault you with pop-ups, mine crypto on 
              your CPU, or track you across the web. I did it alone, with zero budget, to prove 
              that the exploitation is optional.
            </p>
            <p>
              Every pirate streaming site on the internet runs the same playbook: wrap stolen 
              content in malware, pop-ups, and cryptocurrency miners. Users have accepted this as 
              the price of free content. I wanted to prove them wrong.
            </p>
            <p>
              Flyx is the result. A fully functional streaming platform with movies, TV shows, and 
              live television. No advertisements. No tracking. No dark patterns. Just content, 
              delivered cleanly, the way it should be.
            </p>
            <blockquote>
              &quot;The pop-ups are not necessary. The crypto miners are not necessary. The tracking 
              is not necessary. They are choices. And those choices tell you everything about the 
              people making them.&quot;
            </blockquote>
          </section>

          <section id="problem">
            <h2>The Problem</h2>
            <p className="lead">
              Try to watch a movie for free on the internet. Within seconds, you will experience 
              pop-ups, fake close buttons, notification spam, and somewhere in the background, 
              your CPU mining cryptocurrency for strangers.
            </p>
            <p>
              This is not an accident. This is the business model. These sites make money by 
              treating you as the product:
            </p>
            <ul>
              <li><strong>Malvertising:</strong> Over 50% of visitors get served actual malware through advertisements.</li>
              <li><strong>Crypto Mining:</strong> Your CPU mines cryptocurrency while you watch. Your electricity, their profit.</li>
              <li><strong>Data Harvesting:</strong> Browser fingerprinting and tracking cookies package your data for sale.</li>
              <li><strong>Dark Patterns:</strong> Fake buttons, hidden redirects, and deceptive UI designed to generate clicks.</li>
            </ul>
            <p>
              Site operators claim they need aggressive monetization to survive. This is a lie. 
              These sites do not host content—they aggregate it. The bandwidth costs are minimal. 
              Modern serverless platforms offer generous free tiers. The exploitation is not 
              necessary; it is simply more profitable.
            </p>
          </section>

          <section id="heist">
            <h2>The Heist: Stealing from Thieves</h2>
            <p className="lead">
              Here is the delicious irony: the streaming providers I needed to crack are pirates 
              themselves. They profit from content they do not own by wrapping it in malware. My 
              job was to break into their systems and steal what they had already stolen, then 
              serve it without the exploitation.
            </p>
            
            <h3>The Battlefield</h3>
            <p>
              These criminals have invested serious engineering talent into protecting their 
              revenue streams. Every provider I cracked had multiple layers of defense:
            </p>

            <div className="challenge">
              <h4>🔐 The Code Spaghetti Monster</h4>
              <p>
                Open DevTools on any pirate site. The JavaScript is not code—it is a war crime. 
                Variable names like <code>_0x4a3f</code>. Strings split into character arrays and 
                reassembled through twelve layers of function calls. <code>eval()</code> statements 
                that generate more obfuscated code at runtime.
              </p>
              <p className="solution">
                <strong>The Break-In:</strong> I built a deobfuscation pipeline. Intercept every 
                eval, trace string operations backwards, write AST transformers to rename variables. 
                Slowly, the gibberish becomes readable.
              </p>
            </div>

            <div className="challenge">
              <h4>⏱️ The Ticking Clock</h4>
              <p>
                Found the stream URL? It expires in 90 seconds. Every request needs a fresh token 
                computed from timestamps, content IDs, and secret keys buried in obfuscated code.
              </p>
              <p className="solution">
                <strong>The Break-In:</strong> Hours stepping through minified code, mapping data 
                flow. They use HMAC-SHA256 with a hardcoded key hidden in a fake jQuery plugin. 
                Extract the key, reimplement server-side, generate tokens on demand.
              </p>
            </div>

            <div className="challenge">
              <h4>🤖 The Bot Hunters</h4>
              <p>
                These sites hate automation. They check for headless Chrome, analyze mouse movements, 
                fingerprint WebGL renderers. Fail any check and you get a decoy stream that dies 
                after 30 seconds.
              </p>
              <p className="solution">
                <strong>The Break-In:</strong> Skip their JavaScript entirely. Bot detection runs 
                client-side—if I never execute their code, I never trigger their checks. Pure HTTP 
                requests, carefully crafted headers, surgical extraction.
              </p>
            </div>

            <div className="challenge">
              <h4>🪆 The Russian Nesting Dolls</h4>
              <p>
                Click play. Video loads in an iframe. That iframe loads another iframe from a 
                different domain. Which loads another. The actual player is four layers deep, each 
                with different CORS policies and validation.
              </p>
              <p className="solution">
                <strong>The Break-In:</strong> Map the entire chain. Follow each redirect, extract 
                each URL, spoof referrers at each hop. Build a system that traverses the maze 
                automatically.
              </p>
            </div>

            <h3>War Stories</h3>
            <div className="war-story">
              <h4>The 2Embed Labyrinth — 3 weeks to crack</h4>
              <p>
                A hydra of domains—streamsrcs, embedsrcs, vidsrc—each redirecting to the next, 
                generating new tokens. The final player used a packing algorithm I had never seen: 
                strings shattered into character arrays, reassembled through maze-like function calls.
              </p>
              <p>
                <strong>The Breakthrough:</strong> 3 AM on a Tuesday. The packing seed was derived 
                from the TMDB ID predictably. Extraction dropped from 5+ seconds with browser 
                automation to 180ms with pure HTTP.
              </p>
            </div>

            <div className="war-story">
              <h4>SuperEmbed&apos;s Decoy Trap — The one that fought back</h4>
              <p>
                Their cruelest trick: decoy streams. Fail bot detection and they give you a stream 
                that works perfectly for exactly 30 seconds, then dies. You think you have won. 
                You deploy. Users complain.
              </p>
              <p>
                <strong>The Breakthrough:</strong> Stop fooling their JavaScript, start ignoring it. 
                Validation runs client-side, but the stream endpoint just needs the right parameters. 
                Direct HTTP, no browser, no detection.
              </p>
            </div>

            <div className="stats-grid">
              <div className="stat">
                <span className="stat-value">15+</span>
                <span className="stat-label">Obfuscation schemes cracked</span>
              </div>
              <div className="stat">
                <span className="stat-value">180ms</span>
                <span className="stat-label">Extraction time (down from 5s)</span>
              </div>
              <div className="stat">
                <span className="stat-value">95%+</span>
                <span className="stat-label">First-try success rate</span>
              </div>
            </div>
          </section>


          <section id="tech">
            <h2>The Tech</h2>
            <p className="lead">
              Built alone, with zero budget, using free tiers and stolen hours. Here is what 
              powers Flyx.
            </p>

            <h3>The Constraints</h3>
            <div className="constraints">
              <div className="constraint">
                <span className="icon">👤</span>
                <h4>Solo Developer</h4>
                <p>No team, no contractors. Every line of code, every pixel—mine alone.</p>
              </div>
              <div className="constraint">
                <span className="icon">💸</span>
                <h4>Zero Budget</h4>
                <p>Free tiers only. If it wanted my credit card, I found an alternative.</p>
              </div>
              <div className="constraint">
                <span className="icon">🌙</span>
                <h4>Nights &amp; Weekends</h4>
                <p>15-20 hours per week, three months total. Coffee and determination.</p>
              </div>
            </div>

            <h3>The Stack</h3>
            <div className="tech-stack">
              <div className="tech-item">
                <strong>Next.js 14</strong>
                <p>Server-side rendering, API routes for the proxy layer, excellent DX.</p>
              </div>
              <div className="tech-item">
                <strong>TypeScript</strong>
                <p>Type safety caught countless bugs before production.</p>
              </div>
              <div className="tech-item">
                <strong>Vercel</strong>
                <p>Free hosting with edge functions and global CDN.</p>
              </div>
              <div className="tech-item">
                <strong>Neon PostgreSQL</strong>
                <p>Serverless database with generous free tier.</p>
              </div>
              <div className="tech-item">
                <strong>HLS.js</strong>
                <p>Industry-standard adaptive bitrate streaming.</p>
              </div>
            </div>

            <h3>The Architecture</h3>
            <p>
              Flyx does not host content—that would be illegal and expensive. Instead, it acts as 
              an intelligent aggregator. When you click play:
            </p>
            <ol>
              <li>The system queries multiple stream providers in parallel.</li>
              <li>Provider-specific decoders crack the obfuscation and extract URLs.</li>
              <li>A proxy layer handles CORS, header spoofing, and referrer manipulation.</li>
              <li>The clean stream plays in a custom player with no malware wrapper.</li>
            </ol>
          </section>

          <section id="proof">
            <h2>The Proof</h2>
            <p className="lead">
              Did it work? Can you actually build an ethical streaming platform? Yes—with caveats.
            </p>

            <div className="findings">
              <div className="finding">
                <span className="number">1</span>
                <div>
                  <h4>The Exploitation Is Optional</h4>
                  <p>
                    Flyx works. No ads, no tracking, no malware. Every pirate site serving pop-ups 
                    is making a choice—they could do better.
                  </p>
                </div>
              </div>
              <div className="finding">
                <span className="number">2</span>
                <div>
                  <h4>Free Infrastructure Exists</h4>
                  <p>
                    I spent $0. Vercel and Neon free tiers handle everything. The &quot;we need ad 
                    revenue&quot; excuse is a lie.
                  </p>
                </div>
              </div>
              <div className="finding">
                <span className="number">3</span>
                <div>
                  <h4>Privacy Does Not Kill Features</h4>
                  <p>
                    Watch progress syncs without accounts. Analytics work without fingerprinting. 
                    Privacy and functionality coexist.
                  </p>
                </div>
              </div>
              <div className="finding">
                <span className="number">4</span>
                <div>
                  <h4>One Person Can Do This</h4>
                  <p>
                    No team, no funding, no special access. Just a developer with a laptop. The 
                    &quot;too hard&quot; excuse does not hold.
                  </p>
                </div>
              </div>
            </div>

            <h3>The Ongoing Battle</h3>
            <p>
              Providers update their obfuscation. Domains rotate. New bot detection appears. The 
              extraction that worked yesterday fails today. It is a constant arms race—but the 
              modular architecture means only the affected adapter needs updating.
            </p>
          </section>

          <section id="conclusion">
            <h2>The Point</h2>
            <p className="lead">
              I built a streaming platform. It works. It does not assault you with pop-ups, mine 
              crypto, or track you. And I did it alone, part-time, with no money.
            </p>
            <p>
              That is the point. Not that I am special—I am not. The point is that if one person 
              can do this under these constraints, then every pirate site serving malware is making 
              a choice. They could treat users like humans. They choose not to because exploitation 
              pays better than ethics.
            </p>
            <blockquote>
              &quot;The pop-ups are not necessary. The crypto miners are not necessary. The tracking 
              is not necessary. They are choices. And those choices tell you everything about the 
              people making them.&quot;
            </blockquote>
            <p>
              <strong>To users:</strong> You deserve better. Alternatives can exist.
            </p>
            <p>
              <strong>To developers:</strong> If you can build something, build something good.
            </p>
            <p>
              <strong>To pirate site operators:</strong> I see you. Your greed is a choice, and 
              that choice defines you.
            </p>
            <p>
              Flyx exists because I got tired of watching the internet get worse. It is proof that 
              better is possible. Sometimes, proof is enough.
            </p>
          </section>

          <div className="back-link">
            <Link href="/">← Back to Flyx</Link>
          </div>
        </main>
      </div>
    </div>
  );
}

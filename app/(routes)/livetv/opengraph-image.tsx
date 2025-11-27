 import { ImageResponse } from 'next/og';

export const alt = 'Flyx Live TV - Watch Live Sports, News & Entertainment';
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Animated background glow */}
        <div
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            opacity: 0.15,
            background: `
              radial-gradient(circle at 10% 30%, #ef4444 0%, transparent 40%),
              radial-gradient(circle at 90% 70%, #6366f1 0%, transparent 40%),
              radial-gradient(circle at 50% 50%, #22c55e 0%, transparent 50%)
            `,
          }}
        />

        {/* Grid pattern overlay */}
        <div
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            opacity: 0.05,
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />

        {/* Main content */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            zIndex: 1,
          }}
        >
          {/* Live indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '30px',
              padding: '12px 24px',
              background: 'rgba(239, 68, 68, 0.2)',
              borderRadius: '50px',
              border: '2px solid rgba(239, 68, 68, 0.5)',
            }}
          >
            <div
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                background: '#ef4444',
                boxShadow: '0 0 20px #ef4444',
              }}
            />
            <span style={{ color: '#ef4444', fontSize: '24px', fontWeight: 'bold' }}>
              LIVE
            </span>
          </div>

          {/* TV Icon */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '30px',
            }}
          >
            <svg
              width="140"
              height="140"
              viewBox="0 0 24 24"
              style={{ filter: 'drop-shadow(0 0 30px rgba(99, 102, 241, 0.6))' }}
            >
              <defs>
                <linearGradient id="tvGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="50%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
              {/* TV Screen */}
              <rect x="2" y="4" width="20" height="14" rx="2" fill="rgba(99, 102, 241, 0.2)" stroke="url(#tvGradient)" strokeWidth="1.5" />
              {/* Screen content - play button */}
              <circle cx="12" cy="11" r="4" fill="url(#tvGradient)" />
              <path d="M11 9L14 11L11 13V9Z" fill="white" />
              {/* TV Stand */}
              <path d="M8 18H16" stroke="url(#tvGradient)" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M12 18V21" stroke="url(#tvGradient)" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M8 21H16" stroke="url(#tvGradient)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>

          {/* Title */}
          <h1
            style={{
              fontSize: '80px',
              fontWeight: 'bold',
              margin: '0',
              textAlign: 'center',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #06b6d4)',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            LIVE TV
          </h1>

          {/* Subtitle */}
          <p
            style={{
              fontSize: '28px',
              color: '#a1a1aa',
              margin: '16px 0 0 0',
              textAlign: 'center',
              fontWeight: '400',
            }}
          >
            850+ Channels • Sports • News • Entertainment
          </p>

          {/* Features row */}
          <div
            style={{
              display: 'flex',
              gap: '40px',
              marginTop: '40px',
            }}
          >
            {['⚽ Sports', '📰 News', '🎬 Movies', '🎮 Gaming'].map((item) => (
              <div
                key={item}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px 20px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <span style={{ color: '#e4e4e7', fontSize: '20px' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Flyx branding */}
        <div
          style={{
            position: 'absolute',
            bottom: '30px',
            right: '40px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span style={{ color: '#71717a', fontSize: '20px' }}>Powered by</span>
          <span
            style={{
              fontSize: '24px',
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            FLYX
          </span>
        </div>

        {/* Decorative circles */}
        <div
          style={{
            position: 'absolute',
            top: '40px',
            right: '80px',
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(239, 68, 68, 0.2) 0%, transparent 70%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '80px',
            left: '60px',
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(34, 197, 94, 0.2) 0%, transparent 70%)',
          }}
        />
      </div>
    ),
    { ...size }
  );
}

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
        {/* Background glow */}
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
            }}
          >
            850+ Channels • Sports • News • Entertainment
          </p>

          {/* Features */}
          <div style={{ display: 'flex', gap: '40px', marginTop: '40px' }}>
            {['⚽ Sports', '📰 News', '🎬 Movies', '🎮 Gaming'].map((item) => (
              <div
                key={item}
                style={{
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
      </div>
    ),
    { ...size }
  );
}

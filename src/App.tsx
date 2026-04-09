import './index.css';
import InputWorkbench from './components/layout/InputWorkbench';
import ResultWorkbench from './components/layout/ResultWorkbench';

export default function App() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: 'var(--surface-page)',
      }}
    >
      {/* 헤더 */}
      <header
        style={{
          height: 64,
          flexShrink: 0,
          background: 'var(--palette-ink)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 40px',
          zIndex: 100,
        }}
      >
        {/* 로고 + 브랜드 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: 'var(--palette-yellow)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 2L11.5 7H16.5L12.5 10.5L14 15.5L9 12.5L4 15.5L5.5 10.5L1.5 7H6.5L9 2Z" fill="#24272E" fillOpacity="0.85"/>
            </svg>
          </div>
          <div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: 'var(--text-on-dark)',
                letterSpacing: '-0.3px',
                lineHeight: 1.2,
              }}
            >
              내 은퇴, 괜찮을까?
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'var(--text-on-dark-muted)',
                fontWeight: 400,
                letterSpacing: '0.01em',
                lineHeight: 1.2,
                marginTop: 2,
              }}
            >
              지금 조건으로 은퇴 후 월 생활비를 시뮬레이션해요
            </div>
          </div>
        </div>

        {/* 우측 배지 */}
        <div
          style={{
            fontSize: 11,
            color: 'rgba(255,253,254,0.4)',
            fontWeight: 500,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          Beta
        </div>
      </header>

      {/* 2컬럼 레이아웃 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          flex: 1,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            width: '100%',
            maxWidth: 1440,
            overflow: 'hidden',
            background: 'transparent',
          }}
        >
          <InputWorkbench />
          <ResultWorkbench />
        </div>
      </div>
    </div>
  );
}

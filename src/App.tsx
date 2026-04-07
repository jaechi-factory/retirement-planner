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
        background: 'var(--neutral-100)',
      }}
    >
      {/* Header — Premium editorial style */}
      <header
        style={{
          height: 64,
          flexShrink: 0,
          background: 'var(--white)',
          borderBottom: '1px solid var(--neutral-150)',
          display: 'flex',
          justifyContent: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 1520,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 40px',
          }}
        >
          {/* Left: Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <h1
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 800,
                color: 'var(--neutral-900)',
                letterSpacing: '-0.02em',
              }}
            >
              내 은퇴, 괜찮을까?
            </h1>
            <span
              style={{
                fontSize: 13,
                color: 'var(--neutral-400)',
                fontWeight: 500,
                letterSpacing: '-0.01em',
              }}
            >
              은퇴 자금 시뮬레이터
            </span>
          </div>

          {/* Right: Meta info */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12,
              color: 'var(--neutral-400)',
            }}
          >
            <span
              style={{
                padding: '4px 10px',
                background: 'var(--neutral-50)',
                borderRadius: 'var(--radius-full)',
                fontWeight: 600,
              }}
            >
              Beta
            </span>
          </div>
        </div>
      </header>

      {/* Main content — Two column layout */}
      <main
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
            maxWidth: 1520,
            overflow: 'hidden',
          }}
        >
          <InputWorkbench />
          <ResultWorkbench />
        </div>
      </main>
    </div>
  );
}

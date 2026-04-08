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
        background: 'var(--warm-canvas)',
      }}
    >
      {/* 헤더 — full width 흰 배경, 내부 텍스트는 90% 정렬 */}
      <div
        style={{
          height: 56,
          flexShrink: 0,
          background: 'var(--tds-white)',
          borderBottom: '1px solid var(--ux-border)',
          display: 'flex',
          justifyContent: 'center',
          zIndex: 100,
        }}
      >
        <div
          style={{
            width: '90%',
            maxWidth: 1440,
            display: 'flex',
            alignItems: 'center',
            paddingLeft: 40,
          }}
        >
          <span
            style={{
              fontSize: 17,
              fontWeight: 800,
              color: '#1C1814',
              letterSpacing: '-0.3px',
            }}
          >
            내 은퇴, 괜찮을까?
          </span>
          <span
            style={{
              marginLeft: 10,
              fontSize: 12,
              color: '#B0A99E',
              fontWeight: 400,
            }}
          >
            지금 조건으로 은퇴 후 월 생활비를 확인해요
          </span>
        </div>
      </div>

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
            width: '90%',
            maxWidth: 1440,
            overflow: 'hidden',
            background: 'transparent',
            borderLeft: '1px solid var(--ux-border)',
            borderRight: '1px solid var(--ux-border)',
          }}
        >
          <InputWorkbench />
          <ResultWorkbench />
        </div>
      </div>
    </div>
  );
}

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
        background: 'var(--tds-gray-100)',
      }}
    >
      {/* 헤더 — full width 흰 배경, 내부 텍스트는 70% 정렬 */}
      <div
        style={{
          height: 56,
          flexShrink: 0,
          background: 'var(--tds-white)',
          borderBottom: '1px solid var(--tds-gray-100)',
          display: 'flex',
          justifyContent: 'center',
          zIndex: 100,
        }}
      >
        <div
          style={{
            width: '70%',
            display: 'flex',
            alignItems: 'center',
            paddingLeft: 40,
          }}
        >
          <span
            style={{
              fontSize: 17,
              fontWeight: 800,
              color: 'var(--tds-blue-500)',
              letterSpacing: '-0.3px',
            }}
          >
            내 노후는 괜찮을까?
          </span>
          <span
            style={{
              marginLeft: 10,
              fontSize: 12,
              color: 'var(--tds-gray-300)',
              fontWeight: 400,
            }}
          >
            내 재무 구조로 은퇴 후 얼마를 쓸 수 있을까요?
          </span>
        </div>
      </div>

      {/* 2컬럼 레이아웃 — 70% 카드로 띄우기 */}
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
            width: '70%',
            overflow: 'hidden',
            background: 'var(--tds-white)',
            borderLeft: '1px solid var(--tds-gray-100)',
            borderRight: '1px solid var(--tds-gray-100)',
          }}
        >
          <InputWorkbench />
          <ResultWorkbench />
        </div>
      </div>
    </div>
  );
}

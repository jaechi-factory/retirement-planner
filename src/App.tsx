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
        background: 'var(--tds-gray-50)',
      }}
    >
      {/* 헤더 */}
      <div
        style={{
          height: 56,
          flexShrink: 0,
          background: 'var(--tds-white)',
          borderBottom: '1px solid var(--tds-gray-100)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 28px',
          zIndex: 100,
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
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
            color: 'var(--tds-gray-400, #B0B8C1)',
            fontWeight: 400,
          }}
        >
          내 재무 구조로 은퇴 후 얼마를 쓸 수 있을까요?
        </span>
      </div>

      {/* 2컬럼 레이아웃 */}
      <div
        style={{
          display: 'flex',
          flex: 1,
          overflow: 'hidden',
        }}
      >
        <InputWorkbench />
        <ResultWorkbench />
      </div>
    </div>
  );
}

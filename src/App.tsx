import './index.css';
import LeftPanel from './components/layout/LeftPanel';
import CenterPanel from './components/layout/CenterPanel';
import RightPanel from './components/layout/RightPanel';

export default function App() {
  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: 'var(--tds-gray-50)',
      }}
    >
      {/* 헤더 */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 56,
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
          은퇴 생활비 플래너
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

      {/* 3컬럼 레이아웃 */}
      <div
        style={{
          display: 'flex',
          width: '100%',
          paddingTop: 56,
        }}
      >
        <LeftPanel />
        <CenterPanel />
        <RightPanel />
      </div>
    </div>
  );
}

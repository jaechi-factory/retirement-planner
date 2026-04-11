import './index.css';
import InputWorkbench from './components/layout/InputWorkbench';
import ResultWorkbench from './components/layout/ResultWorkbench';

export default function App() {
  return (
    <div
      style={{
        height: '100vh',
        background: 'var(--fig-page-bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* 헤더 */}
      <div
        style={{
          paddingTop: 51,
          paddingBottom: 38,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          textAlign: 'center',
          width: '100%',
          flexShrink: 0,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 35,
            fontWeight: 700,
            color: 'var(--fig-title-color)',
            fontFamily: 'Pretendard, sans-serif',
            lineHeight: 1.5,
          }}
        >
          나는 은퇴하면 한달에<br />얼마를 쓸 수 있을까?
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 500,
            color: 'var(--fig-subtitle-color)',
            fontFamily: 'Pretendard, sans-serif',
            lineHeight: 1.5,
          }}
        >
          내 정보를 입력하면, 은퇴 후 생활비를 예상해 볼 수 있어요.
        </p>
      </div>

      {/* 2컬럼 레이아웃 */}
      <div
        style={{
          display: 'flex',
          gap: 16,
          width: 1100,
          flex: 1,
          minHeight: 0,
          boxSizing: 'border-box',
        }}
      >
        <InputWorkbench />
        <ResultWorkbench />
      </div>
    </div>
  );
}

import { useState } from 'react';
import './index.css';
import InputWorkbench from './components/layout/InputWorkbench';
import ResultWorkbench from './components/layout/ResultWorkbench';

export default function App() {
  const [allDone, setAllDone] = useState(false);

  if (!allDone) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--fig-page-bg)',
        }}
      >
        <InputWorkbench allDone={false} onAllDone={() => setAllDone(true)} />
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        background: 'var(--fig-page-bg)',
        overflow: 'hidden',
      }}
    >
      <InputWorkbench allDone={true} onAllDone={() => {}} />
      <ResultWorkbench />
    </div>
  );
}

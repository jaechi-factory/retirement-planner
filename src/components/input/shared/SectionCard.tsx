interface Props {
  title: string;
  children: React.ReactNode;
}

import React from 'react';

export default function SectionCard({ title, children }: Props) {
  return (
    <div
      style={{
        background: 'var(--fig-card-bg)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderRadius: 'var(--fig-card-radius)',
        border: '1px solid rgba(255,255,255,0.35)',
        width: '100%',
        paddingTop: 40,
        paddingRight: 32,
        paddingBottom: 40,
        paddingLeft: 32,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        boxSizing: 'border-box',
      }}
    >
      {/* 카드 내 콘텐츠 폭 510px 고정 */}
      <div
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 28,
        }}
      >
        {/* 섹션 타이틀 */}
        <h2
          style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 700,
            color: 'var(--fig-title-color)',
            fontFamily: 'Pretendard, sans-serif',
            lineHeight: 1.5,
          }}
        >
          {title}
        </h2>

        {/* 필드 영역 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
          }}
        >
          {children}
        </div>

      </div>
    </div>
  );
}

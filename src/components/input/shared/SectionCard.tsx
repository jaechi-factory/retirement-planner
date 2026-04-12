interface Props {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  itemGap?: number;
}

import React from 'react';

export default function SectionCard({ title, subtitle, children, itemGap = 24 }: Props) {
  return (
    <div
      style={{
        background: 'var(--fig-card-bg)',
        backdropFilter: 'blur(40px) saturate(200%)',
        WebkitBackdropFilter: 'blur(40px) saturate(200%)',
        borderRadius: 'var(--fig-card-radius)',
        border: '1px solid rgba(255,255,255,0.55)',
        width: '100%',
        paddingTop: 40,
        paddingRight: 24,
        paddingBottom: 40,
        paddingLeft: 24,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        {/* 섹션 헤더 (타이틀 + 서브타이틀) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <h2
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 500,
              color: 'var(--fig-title-color)',
              fontFamily: 'Pretendard, sans-serif',
              lineHeight: 1.5,
            }}
          >
            {title}
          </h2>
          {subtitle && (
            <p
              style={{
                margin: 0,
                fontSize: 14,
                color: '#4e5968',
                fontFamily: 'Pretendard, sans-serif',
                lineHeight: 1.5,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>

        {/* 필드 영역 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: itemGap,
          }}
        >
          {children}
        </div>

      </div>
    </div>
  );
}

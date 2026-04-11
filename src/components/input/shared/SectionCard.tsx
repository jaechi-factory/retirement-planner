interface Props {
  title: string;
  children: React.ReactNode;
  /** "다음" 버튼 활성 여부 */
  canComplete?: boolean;
  /** "다음" 버튼 클릭 시 호출 — 없으면 버튼 미표시 */
  onComplete?: () => void;
  /** 마지막 섹션인 경우 버튼 텍스트 변경 */
  isLast?: boolean;
}

import React from 'react';

export default function SectionCard({
  title,
  children,
  canComplete,
  onComplete,
  isLast = false,
}: Props) {
  return (
    <div
      style={{
        background: 'var(--fig-card-bg)',
        borderRadius: 'var(--fig-card-radius)',
        width: '100%',
        paddingTop: 38,
        paddingBottom: 38,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        boxSizing: 'border-box',
      }}
    >
      {/* 카드 내 콘텐츠 폭 504px 고정 */}
      <div
        style={{
          width: 408,
          display: 'flex',
          flexDirection: 'column',
          gap: 32,
        }}
      >
        {/* 섹션 타이틀 */}
        <h2
          style={{
            margin: 0,
            fontSize: 26,
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
            gap: 32,
          }}
        >
          {children}
        </div>

        {/* 다음 버튼 */}
        {onComplete !== undefined && (
          <button
            disabled={!canComplete}
            onClick={canComplete ? onComplete : undefined}
            style={{
              height: 'var(--fig-btn-height)',
              borderRadius: 'var(--fig-btn-radius)',
              border: 'none',
              background: canComplete ? 'var(--fig-btn-active-bg)' : 'var(--fig-btn-disabled-bg)',
              color: canComplete ? 'var(--fig-btn-active-text)' : 'var(--fig-btn-disabled-text)',
              fontSize: canComplete ? 16 : 13,
              fontWeight: 700,
              fontFamily: 'Pretendard, sans-serif',
              cursor: canComplete ? 'pointer' : 'not-allowed',
              width: '100%',
              transition: 'background 0.15s, color 0.15s, font-size 0.1s',
              letterSpacing: canComplete ? '0.114px' : '0.0912px',
            }}
          >
            {isLast ? '결과 보기' : '다음'}
          </button>
        )}
      </div>
    </div>
  );
}

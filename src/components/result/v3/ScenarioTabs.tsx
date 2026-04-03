import { useState } from 'react';
import type { PropertyOptionResult } from '../../../types/calculationV2';

interface ScenarioTabsProps {
  propertyOptions: PropertyOptionResult[];
  lifeExpectancy: number;
  onStrategyChange?: (strategy: 'secured_loan' | 'sell') => void;
}

export default function ScenarioTabs({ propertyOptions, lifeExpectancy, onStrategyChange }: ScenarioTabsProps) {
  const sellOption = propertyOptions.find((o) => o.strategy === 'sell');
  const loanOption = propertyOptions.find((o) => o.strategy === 'secured_loan');

  // 추천 전략(survivesToLifeExpectancy === true)을 초기 탭으로. 둘 다 true/false이면 'sell' 기본값
  const recommendedStrategy = (() => {
    const sellSurvives = sellOption?.survivesToLifeExpectancy === true;
    const loanSurvives = loanOption?.survivesToLifeExpectancy === true;
    if (sellSurvives && !loanSurvives) return 'sell' as const;
    if (loanSurvives && !sellSurvives) return 'secured_loan' as const;
    return 'sell' as const;
  })();
  const [activeStrategy, setActiveStrategy] = useState<'sell' | 'secured_loan'>(recommendedStrategy);

  if (!sellOption && !loanOption) return null;

  const tabs: Array<{ strategy: 'sell' | 'secured_loan'; label: string; option: PropertyOptionResult }> = [];
  if (sellOption) tabs.push({ strategy: 'sell', label: '집을 팔 경우', option: sellOption });
  if (loanOption) tabs.push({ strategy: 'secured_loan', label: '담보대출 받을 경우', option: loanOption });

  if (tabs.length === 0) return null;

  const handleTabClick = (strategy: 'sell' | 'secured_loan') => {
    setActiveStrategy(strategy);
    onStrategyChange?.(strategy);
  };

  const activeTab = tabs.find((t) => t.strategy === activeStrategy) ?? tabs[0];

  return (
    <div
      style={{
        borderRadius: 14,
        border: '1px solid var(--tds-gray-100)',
        overflow: 'hidden',
        marginBottom: 16,
      }}
    >
      {/* 탭 헤더 */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--tds-gray-100)',
          background: 'var(--tds-gray-50, #FAFAFA)',
        }}
      >
        {tabs.map(({ strategy, label, option }) => {
          const isActive = activeStrategy === strategy;
          const survives = option.survivesToLifeExpectancy;
          const badgeAge = survives ? lifeExpectancy : (option.failureAge ?? lifeExpectancy);

          return (
            <button
              key={strategy}
              onClick={() => handleTabClick(strategy)}
              style={{
                flex: 1,
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--tds-gray-900)' : 'var(--tds-gray-400)',
                background: isActive ? 'var(--tds-white)' : 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--tds-gray-900)' : '2px solid transparent',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
            >
              {label}
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '2px 7px',
                  borderRadius: 20,
                  background: survives ? '#E8F5E9' : '#F5F5F5',
                  color: survives ? '#2E7D32' : '#757575',
                }}
              >
                {survives ? `${badgeAge}세까지 가능` : `${badgeAge}세에 부족`}
              </span>
            </button>
          );
        })}
      </div>

      {/* 탭 내용 */}
      <div style={{ padding: '14px 18px' }}>
        <div
          style={{
            fontSize: 13,
            color: 'var(--tds-gray-600)',
            lineHeight: 1.7,
          }}
        >
          {activeTab.option.headline}
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { usePlannerStore } from '../../../store/usePlannerStore';
import { getPlannerPolicy } from '../../../policy/policyTable';
import NumberInput from '../shared/NumberInput';
import { estimatePublicPensionWithMeta } from '../../../engine/pensionMeta';
import { fmtKRW } from '../../../utils/format';
import { cardStyle } from './shared';
import { Row, Divider, TextBtn, ModeLabel } from './shared-components';

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 14,
        fontWeight: active ? 700 : 500,
        padding: '4px 12px',
        borderRadius: 16,
        border: active ? '1.5px solid #191f28' : '1.5px solid rgba(36,39,46,0.12)',
        background: active ? '#191f28' : '#fff',
        color: active ? '#fff' : 'rgba(36,39,46,0.64)',
        cursor: 'pointer',
        fontFamily: 'Pretendard, sans-serif',
      }}
    >
      {children}
    </button>
  );
}

export default function PublicPensionCard() {
  const { inputs, setPension } = usePlannerStore();
  const [showDetail, setShowDetail] = useState(false);
  const { publicPension } = inputs.pension;
  const { status, goal } = inputs;

  const workStartAge = publicPension.workStartAge ?? 26;
  const valuationYear = publicPension.valuationYear ?? Number.parseInt(getPlannerPolicy().effectiveDate.slice(0, 4), 10);
  const meta = estimatePublicPensionWithMeta(
    status.annualIncome,
    status.currentAge,
    goal.retirementAge,
    workStartAge,
    valuationYear,
  );
  const isAuto = publicPension.mode === 'auto';
  const displayValue = isAuto
    ? meta.base
    : (publicPension.manualMonthlyTodayValue > 0 ? publicPension.manualMonthlyTodayValue : meta.base);

  const switchToManual = () => {
    setPension({ publicPension: { ...publicPension, mode: 'manual' } });
    setShowDetail(true);
  };

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#24272E' }}>국민연금</span>
          <span style={{ fontSize: 14, color: 'rgba(36,39,46,0.64)', marginTop: 2, display: 'block' }}>수령 시작 월액의 오늘 가치예요</span>
        </div>
        <ModeLabel text={isAuto ? '간편 계산' : '직접 입력'} />
      </div>

      <div style={{ margin: '4px 0 2px' }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#24272E', display: 'flex', alignItems: 'center', gap: 6 }}>
          월 {fmtKRW(displayValue)}
          {meta.cappedByIncomeCeiling && isAuto && (
            <span style={{ fontSize: 14, color: 'rgba(36,39,46,0.64)' }}>소득 상한 기준</span>
          )}
        </span>
        <span style={{ fontSize: 14, color: 'rgba(36,39,46,0.64)', marginTop: 2, display: 'block' }}>
          {isAuto
            ? `${publicPension.startAge}세부터 수령 · 공단 예상월액표 기준 추정 (${workStartAge}세 취업, 평가연도 ${publicPension.valuationYear ?? valuationYear})`
            : `${publicPension.startAge}세부터 수령 · 실제 수령액과 다를 수 있어요`}
        </span>
      </div>

      {isAuto && (
        <div style={{ marginTop: 6 }}>
          <TextBtn onClick={switchToManual}>공단 예상 월액 직접 입력하기 ▾</TextBtn>
        </div>
      )}

      <div style={{ marginTop: 6 }}>
        <TextBtn onClick={() => setShowDetail(v => !v)}>
          {showDetail ? '설정 접기 ▴' : '설정 변경 ▾'}
        </TextBtn>
      </div>

      {showDetail && (
        <>
          <Divider />
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            <Chip active={isAuto} onClick={() => setPension({ publicPension: { ...publicPension, mode: 'auto' } })}>간편 계산</Chip>
            <Chip active={!isAuto} onClick={() => setPension({ publicPension: { ...publicPension, mode: 'manual' } })}>내가 직접 입력</Chip>
          </div>
          {isAuto && (
            <NumberInput
              label="취업 시작 나이"
              value={workStartAge}
              onChange={v => setPension({ publicPension: { ...publicPension, workStartAge: v } })}
              unit="세"
              hint="이 나이부터 가입했다고 보고 계산해요"
            />
          )}
          <Row>
            <NumberInput
              label="받기 시작할 나이"
              value={publicPension.startAge}
              onChange={v => setPension({ publicPension: { ...publicPension, startAge: v } })}
              unit="세"
            />
            {!isAuto && (
              <NumberInput
                label="예상 월수령액 (현재 금액)"
                value={publicPension.manualMonthlyTodayValue}
                onChange={v => setPension({ publicPension: { ...publicPension, manualMonthlyTodayValue: v } })}
                unit="만원"
                hint="국민연금공단 조회값을 넣어 주세요"
              />
            )}
          </Row>
        </>
      )}
    </div>
  );
}

import { useState } from 'react';
import { usePlannerStore } from '../../../store/usePlannerStore';
import NumberInput from '../shared/NumberInput';
import { estimatePublicPensionWithMeta } from '../../../engine/pensionMeta';
import { fmtKRW } from '../../../utils/format';
import { cardStyle, toggleBtnStyle } from './shared';
import { Row, Divider, TextBtn, ModeLabel } from './shared-components';

export default function PublicPensionCard() {
  const { inputs, setPension } = usePlannerStore();
  const [showDetail, setShowDetail] = useState(false);
  const { publicPension } = inputs.pension;
  const { status, goal } = inputs;

  const workStartAge = publicPension.workStartAge ?? 26;
  const meta = estimatePublicPensionWithMeta(status.annualIncome, status.currentAge, goal.retirementAge, workStartAge);
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
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tds-gray-900)' }}>국민연금</div>
          <div style={{ fontSize: 12, color: 'var(--tds-gray-400)', marginTop: 2 }}>지금 기준으로 예상한 국민연금이에요</div>
        </div>
        <ModeLabel text={isAuto ? '간편 계산' : '직접 입력'} />
      </div>

      <div style={{ margin: '4px 0 2px' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tds-gray-700)' }}>
          월 {fmtKRW(displayValue)}
          {meta.cappedByIncomeCeiling && isAuto && (
            <span style={{ fontSize: 11, color: 'var(--tds-gray-400)', marginLeft: 6, fontWeight: 400 }}>
              소득 상한 기준
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: 'var(--tds-gray-400)', marginTop: 2 }}>
          {isAuto
            ? `${publicPension.startAge}세부터 수령 · ${workStartAge}세 취업 기준 추정`
            : `${publicPension.startAge}세부터 수령 · 실제값은 차이가 있을 수 있어요`}
        </div>
      </div>

      {isAuto && (
        <div style={{ marginTop: 6 }}>
          <TextBtn onClick={switchToManual}>공단 예상월액 직접 입력하기 ▾</TextBtn>
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
            <button style={toggleBtnStyle(isAuto)} onClick={() => setPension({ publicPension: { ...publicPension, mode: 'auto' } })}>
              간편 계산
            </button>
            <button style={toggleBtnStyle(!isAuto)} onClick={() => setPension({ publicPension: { ...publicPension, mode: 'manual' } })}>
              내가 직접 입력
            </button>
          </div>
          {isAuto && (
            <NumberInput
              label="취업 시작 나이"
              value={workStartAge}
              onChange={v => setPension({ publicPension: { ...publicPension, workStartAge: v } })}
              unit="세"
              hint="국민연금 납부 시작 나이 — 이 나이부터 가입한 것으로 계산해요"
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
                label="예상 월수령액 (지금 기준)"
                value={publicPension.manualMonthlyTodayValue}
                onChange={v => setPension({ publicPension: { ...publicPension, manualMonthlyTodayValue: v } })}
                unit="만원"
                hint="국민연금공단 조회값 — 지금 돈 기준으로 입력"
              />
            )}
          </Row>
        </>
      )}
    </div>
  );
}

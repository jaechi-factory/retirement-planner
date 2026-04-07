import { useState } from 'react';
import { usePlannerStore } from '../../../store/usePlannerStore';
import NumberInput from '../shared/NumberInput';
import RateInput from '../shared/RateInput';
import { estimateRetirementPension } from '../../../engine/pensionEstimation';
import { fmtKRW } from '../../../utils/format';
import { Chip, Typography } from '../../ui/wds-replacements';
import { cardStyle } from './shared';
import { Row, Divider, TextBtn, ModeLabel } from './shared-components';

export default function RetirementPensionCard() {
  const { inputs, setPension } = usePlannerStore();
  const [showDetail, setShowDetail] = useState(false);
  const { retirementPension } = inputs.pension;
  const { status, goal } = inputs;

  const isAuto = retirementPension.mode === 'auto';
  const startAge = retirementPension.startAge;

  const autoValue = estimateRetirementPension(retirementPension, status.annualIncome, status.currentAge, goal.retirementAge);
  const displayValue = isAuto
    ? autoValue
    : (retirementPension.manualMonthlyTodayValue > 0 ? retirementPension.manualMonthlyTodayValue : autoValue);

  const hasBalance = retirementPension.currentBalance > 0;

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <Typography variant="label1" weight="bold" color="semantic.label.normal">퇴직연금</Typography>
          <Typography variant="caption1" color="semantic.label.alternative" style={{ marginTop: 2, display: 'block' }}>회사에서 쌓인 퇴직연금 예상 월액이에요</Typography>
        </div>
        <ModeLabel text={isAuto ? '간편 계산' : '직접 입력'} />
      </div>

      <Typography variant="headline1" weight="bold" color="semantic.label.normal" style={{ display: 'block', margin: '4px 0 2px' }}>
        월 {fmtKRW(displayValue)}
      </Typography>
      <Typography variant="caption1" color="semantic.label.alternative" style={{ display: 'block' }}>
        {startAge}세부터 {retirementPension.payoutYears}년간 받아요
        {!hasBalance && isAuto && ' · 적립금 입력 시 더 정확해져요'}
      </Typography>

      <div style={{ marginTop: 6 }}>
        <TextBtn onClick={() => setShowDetail(v => !v)}>
          {showDetail ? '설정 접기 ▴' : '설정 변경 ▾'}
        </TextBtn>
      </div>

      {showDetail && (
        <>
          <Divider />
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            <Chip size="small" active={isAuto} onClick={() => setPension({ retirementPension: { ...retirementPension, mode: 'auto' } })}>간편 계산</Chip>
            <Chip size="small" active={!isAuto} onClick={() => setPension({ retirementPension: { ...retirementPension, mode: 'manual' } })}>내가 직접 입력</Chip>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Row>
              <NumberInput
                label="지금까지 쌓인 퇴직연금"
                value={retirementPension.currentBalance}
                onChange={v => setPension({ retirementPension: { ...retirementPension, currentBalance: v } })}
                unit="만원"
                hint="모르면 0으로 두세요"
              />
              <NumberInput
                label="받기 시작할 나이"
                value={startAge}
                onChange={v => setPension({ retirementPension: { ...retirementPension, startAge: v } })}
                unit="세"
                hint="최소 55세 이상"
              />
            </Row>
            <Row>
              <NumberInput
                label="몇 년 동안 받을지"
                value={retirementPension.payoutYears}
                onChange={v => setPension({ retirementPension: { ...retirementPension, payoutYears: v } })}
                unit="년"
              />
              <RateInput
                label="적립 중 수익률"
                value={retirementPension.accumulationReturnRate}
                onChange={v => setPension({ retirementPension: { ...retirementPension, accumulationReturnRate: v } })}
              />
            </Row>
            <Row>
              <RateInput
                label="수령 중 수익률"
                value={retirementPension.payoutReturnRate}
                onChange={v => setPension({ retirementPension: { ...retirementPension, payoutReturnRate: v } })}
              />
              {!isAuto && (
                <NumberInput
                  label="예상 월수령액 (현재 금액)"
                  value={retirementPension.manualMonthlyTodayValue}
                  onChange={v => setPension({ retirementPension: { ...retirementPension, manualMonthlyTodayValue: v } })}
                  unit="만원"
                />
              )}
            </Row>
          </div>
        </>
      )}
    </div>
  );
}

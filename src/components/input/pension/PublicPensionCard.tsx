import { useState } from 'react';
import { usePlannerStore } from '../../../store/usePlannerStore';
import NumberInput from '../shared/NumberInput';
import { estimatePublicPensionWithMeta } from '../../../engine/pensionMeta';
import { fmtKRW } from '../../../utils/format';
import { Chip, Typography } from '../../ui/wds-replacements';
import { cardStyle } from './shared';
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
          <Typography variant="label1" weight="bold" color="semantic.label.normal">국민연금</Typography>
          <Typography variant="caption1" color="semantic.label.alternative" style={{ marginTop: 2, display: 'block' }}>지금 기준 예상 월액이에요</Typography>
        </div>
        <ModeLabel text={isAuto ? '간편 계산' : '직접 입력'} />
      </div>

      <div style={{ margin: '4px 0 2px' }}>
        <Typography variant="headline1" weight="bold" color="semantic.label.normal" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          월 {fmtKRW(displayValue)}
          {meta.cappedByIncomeCeiling && isAuto && (
            <Typography as="span" variant="caption2" color="semantic.label.alternative">소득 상한 기준</Typography>
          )}
        </Typography>
        <Typography variant="caption1" color="semantic.label.alternative" style={{ marginTop: 2, display: 'block' }}>
          {isAuto
            ? `${publicPension.startAge}세부터 수령 · ${workStartAge}세 취업 기준 추정`
            : `${publicPension.startAge}세부터 수령 · 실제 수령액과 다를 수 있어요`}
        </Typography>
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
            <Chip size="small" active={isAuto} onClick={() => setPension({ publicPension: { ...publicPension, mode: 'auto' } })}>간편 계산</Chip>
            <Chip size="small" active={!isAuto} onClick={() => setPension({ publicPension: { ...publicPension, mode: 'manual' } })}>내가 직접 입력</Chip>
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

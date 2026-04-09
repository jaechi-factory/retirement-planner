import { Typography } from '@wanteddev/wds';
import type { VehicleComparisonResult } from '../../engine/vehicleSchedule';

interface Props {
  comparison: VehicleComparisonResult;
}

export default function VehicleComparisonCard({ comparison }: Props) {
  const { withVehicle, withoutVehicle, monthlyReduction, isIncluded } = comparison;

  return (
    <div
      style={{
        background: 'var(--surface-card)',
        borderRadius: 20,
        padding: '22px 24px 26px',
        marginBottom: 20,
      }}
    >
      {/* 헤더 */}
      <div style={{ marginBottom: 18 }}>
        <Typography
          as="h3"
          variant="headline1"
          weight="bold"
          color="semantic.label.normal"
          style={{ margin: '0 0 4px 0', letterSpacing: '-0.2px' }}
        >
          자동차가 생활비에 미치는 영향
        </Typography>
        <Typography variant="caption1" color="semantic.label.alternative" style={{ margin: 0, lineHeight: 1.4 }}>
          {isIncluded
            ? '연소비에 이미 포함된 기준 — 차가 없었다면 얼마나 더 쓸 수 있는지 보여줘요'
            : '별도 계산 기준 — 차 비용이 얼마나 생활비를 줄이는지 보여줘요'}
        </Typography>
      </div>

      {/* 3개 비교 수치 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

        {/* 차 포함 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 16px',
          background: 'var(--surface-card-inner)',
          borderRadius: 12,
        }}>
          <div>
            <Typography variant="label2" weight="medium" color="semantic.label.alternative"
              style={{ display: 'block', marginBottom: 2 }}>
              자동차 포함 시 월 가능 생활비
            </Typography>
            <Typography variant="caption1" color="semantic.label.alternative"
              style={{ margin: 0, fontSize: 11 }}>
              차 유지비 반영 후 실제로 쓸 수 있는 금액
            </Typography>
          </div>
          <Typography variant="headline1" weight="bold"
            color={isIncluded ? 'semantic.label.normal' : 'semantic.label.alternative'}
            style={{ fontSize: 20, whiteSpace: 'nowrap', marginLeft: 12 }}>
            {withVehicle.toLocaleString('ko-KR')}만원
          </Typography>
        </div>

        {/* 차 미포함 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 16px',
          background: 'var(--surface-card-inner)',
          borderRadius: 12,
        }}>
          <div>
            <Typography variant="label2" weight="medium" color="semantic.label.alternative"
              style={{ display: 'block', marginBottom: 2 }}>
              자동차 제외 시 월 가능 생활비
            </Typography>
            <Typography variant="caption1" color="semantic.label.alternative"
              style={{ margin: 0, fontSize: 11 }}>
              차가 없다면 쓸 수 있는 금액
            </Typography>
          </div>
          <Typography variant="headline1" weight="bold"
            color={!isIncluded ? 'semantic.label.normal' : 'semantic.label.alternative'}
            style={{ fontSize: 20, whiteSpace: 'nowrap', marginLeft: 12 }}>
            {withoutVehicle.toLocaleString('ko-KR')}만원
          </Typography>
        </div>

        {/* 차이 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 16px',
          background: monthlyReduction > 0 ? 'var(--status-shortage-bg, #FFF5F5)' : 'var(--surface-card-inner)',
          borderRadius: 12,
          border: monthlyReduction > 0 ? '1px solid var(--status-shortage-border, #FFD0D0)' : 'none',
        }}>
          <div>
            <Typography variant="label2" weight="medium" color="semantic.label.alternative"
              style={{ display: 'block', marginBottom: 2 }}>
              자동차 때문에 줄어드는 금액
            </Typography>
            <Typography variant="caption1" color="semantic.label.alternative"
              style={{ margin: 0, fontSize: 11 }}>
              은퇴 기간 월 평균 차량 비용 (현재가치 기준)
            </Typography>
          </div>
          <Typography
            variant="headline1"
            weight="bold"
            style={{
              fontSize: 20,
              whiteSpace: 'nowrap',
              marginLeft: 12,
              color: monthlyReduction > 0 ? 'var(--status-shortage-text, #C0392B)' : 'var(--text-faint)',
            }}
          >
            {monthlyReduction > 0 ? `−${monthlyReduction.toLocaleString('ko-KR')}만원` : '—'}
          </Typography>
        </div>
      </div>

      {/* 안내 문구 */}
      <div style={{
        marginTop: 14,
        padding: '10px 14px',
        background: 'var(--surface-card-soft)',
        borderRadius: 8,
      }}>
        <Typography variant="caption1" color="semantic.label.alternative"
          style={{ margin: 0, lineHeight: 1.6 }}>
          이 계산은 현재 차 1대 기준이에요. 차를 교체하거나 추가하면 실제 비용이 달라질 수 있어요.
        </Typography>
      </div>
    </div>
  );
}

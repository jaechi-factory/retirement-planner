import type { Verdict } from '../../types/calculation';

interface Props {
  verdict: Verdict;
}

export default function VerdictBadge({ verdict }: Props) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '6px 14px',
        borderRadius: 100,
        background: verdict.bgColor,
        color: verdict.color,
        fontSize: 14,
        fontWeight: 700,
      }}
    >
      {verdict.label}
    </div>
  );
}

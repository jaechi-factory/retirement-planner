/** PensionSection 하위 카드들이 공유하는 소형 컴포넌트 */
import { Divider as WdsDivider, TextButton, Typography } from '@wanteddev/wds';

export function Row({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      {children}
    </div>
  );
}

export function Divider() {
  return <WdsDivider style={{ margin: '10px 0' }} />;
}

export function TextBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <TextButton size="small" onClick={onClick} style={{ padding: 0 }}>
      {children}
    </TextButton>
  );
}

export function ModeLabel({ text }: { text: string }) {
  return (
    <Typography variant="caption2" weight="medium" color="semantic.label.alternative">
      {text}
    </Typography>
  );
}

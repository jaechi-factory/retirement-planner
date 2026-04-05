/** PensionSection 하위 카드들이 공유하는 스타일 상수 */

export const cardStyle: React.CSSProperties = {
  border: '1px solid var(--tds-gray-100)',
  borderRadius: 12,
  padding: '14px 16px',
  background: 'var(--tds-white)',
};

export const toggleBtnStyle = (active: boolean): React.CSSProperties => ({
  padding: '4px 12px',
  borderRadius: 20,
  border: 'none',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 600,
  background: active ? 'var(--tds-gray-900)' : 'var(--tds-gray-100)',
  color: active ? 'var(--tds-white)' : 'var(--tds-gray-500)',
  transition: 'all 0.15s',
});

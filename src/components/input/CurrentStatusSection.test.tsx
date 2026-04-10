import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import CurrentStatusSection from './CurrentStatusSection';

describe('CurrentStatusSection', () => {
  it('생활비 입력은 오늘 가치로 표시되고 생활비 증가율 필드는 더 이상 보이지 않아야 한다', () => {
    const html = renderToStaticMarkup(<CurrentStatusSection />);

    expect(html).toContain('한 달 생활비 (오늘 가치)');
    expect(html).toContain('입력한 생활비는 오늘 가치 기준이고');
    expect(html).not.toContain('생활비 증가율');
  });
});

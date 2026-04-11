import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import CurrentStatusSection from './CurrentStatusSection';

describe('CurrentStatusSection', () => {
  it('생활비 입력 필드와 힌트가 올바르게 표시되어야 한다', () => {
    const html = renderToStaticMarkup(<CurrentStatusSection />);

    expect(html).toContain('한 달 생활비');
    expect(html).toContain('주거비를 포함한 생활비 전부를 입력해주세요');
    expect(html).not.toContain('생활비 증가율');
  });
});

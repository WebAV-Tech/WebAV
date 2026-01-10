import { expect, it } from 'vitest';
import { renderTxt2ImgBitmap } from '../dom-utils';

it('renderTxt2ImgBitmap with custon font', async () => {
  const cssText =
    'font-size: 32px; font-family: Sedan SC; opacity: 1; line-height: 1; padding: 0; margin: 0;max-width: 100px; word-break: break-all; white-space: break-spaces;';
  const opts = {
    font: {
      name: 'Sedan SC',
      url: '/fonts/SedanSC-Regular.woff2',
    },
  };
  const img = await renderTxt2ImgBitmap('Hello World', cssText, opts);
  // 固定宽度 + 折行
  expect(img.width).toBe(100);
  expect(img.height).toBe(96);
  img.close();
});

import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { AVCanvas } from '../av-canvas';
import { createEl } from '../utils';
import { crtMSEvt4Offset } from './test-utils';
import { IClip, VisibleSprite } from '@webav/av-cliper';

let container: HTMLDivElement;
let avCvs: AVCanvas;
beforeEach(() => {
  container = createEl('div') as HTMLDivElement;
  container.style.cssText = `
    width: 1280px;
    height: 720px;
  `;
  document.body.appendChild(container);
  avCvs = new AVCanvas(container, {
    width: 1280,
    height: 720,
    bgColor: '#333',
  });
});

afterEach(() => {
  container.remove();
  avCvs.destroy();
});

class MockClip implements IClip {
  tick = async () => {
    return { audio: [], state: 'success' as const };
  };
  meta = { width: 0, height: 0, duration: 0 };
  ready = Promise.resolve(this.meta);
  clone = async () => {
    return new MockClip() as this;
  };
  destroy = () => {};
  split = async (_: number) => [new MockClip(), new MockClip()] as [this, this];
}

test('captureStream', () => {
  const ms = avCvs.captureStream();
  expect(ms).toBeInstanceOf(MediaStream);
});

test('dynamicCusor', async () => {
  const vs = new VisibleSprite(new MockClip());
  vs.rect.x = 100;
  vs.rect.y = 100;
  vs.rect.w = 100;
  vs.rect.h = 100;
  await avCvs.addSprite(vs);
  const cvsEl = container.querySelector('canvas') as HTMLCanvasElement;
  cvsEl.dispatchEvent(crtMSEvt4Offset('mousedown', 110, 110));
  window.dispatchEvent(crtMSEvt4Offset('mouseup', 110, 110));

  expect(cvsEl.style.cursor).toBe('move');

  const {
    center,
    ctrls: { lt, rotate },
  } = vs.rect;
  cvsEl.dispatchEvent(
    crtMSEvt4Offset('mousemove', lt.x + center.x, lt.y + center.y),
  );
  expect(cvsEl.style.cursor).toBe('nwse-resize');

  cvsEl.dispatchEvent(
    crtMSEvt4Offset(
      'mousemove',
      rotate.x + center.x + 1,
      rotate.y + center.y + 1,
    ),
  );
  expect(cvsEl.style.cursor).toBe('crosshair');

  cvsEl.dispatchEvent(crtMSEvt4Offset('mousemove', 0, 0));
  expect(cvsEl.style.cursor).toBe('');

  cvsEl.dispatchEvent(crtMSEvt4Offset('mousemove', 110, 110));
  expect(cvsEl.style.cursor).toBe('move');
});

test('AVCanvas events', async () => {
  const onPaused = vi.fn();
  const onPlaying = vi.fn();
  avCvs.on('paused', onPaused);
  avCvs.on('playing', onPlaying);

  avCvs.play({ start: 0, end: 10e6 });
  expect(onPlaying).toBeCalledTimes(1);
  avCvs.pause();
  expect(onPaused).toBeCalledTimes(1);
  avCvs.play({ start: 0, end: 10e6 });
  expect(onPlaying).toBeCalledTimes(2);
  avCvs.previewFrame(5e6);
  expect(onPaused).toBeCalledTimes(2);
});

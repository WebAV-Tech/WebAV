import { BaseSprite } from './base-sprite';
import { IClip } from '../clips';
import { Log } from '@webav/internal-utils';
import { changePCMPlaybackRate } from '../av-utils';

/**
 * 包装 {@link IClip} 给素材扩展坐标、层级、透明度等信息，用于 {@link [AVCanvas](../../av-canvas/classes/AVCanvas.html)} 响应用户交互
 *
 * 跟 {@link OffscreenSprite} 非常相似，应用场景不同
 *
 * @example
 * const spr = new VisibleSprite(
 *   new MP4Clip((await fetch('<mp4 url>')).body),
 * );
 * spr.opacity = 0.5 // 半透明
 * spr.rect.x = 100 // x 坐标偏移 100 像素
 * spr.time.offset = 10e6 // 视频第 10s 开始绘制素材
 *
 * @see [视频剪辑](https://webav-tech.github.io/WebAV/demo/6_4-video-editor)
 *
 */
export class VisibleSprite extends BaseSprite {
  #clip: IClip;
  getClip() {
    return this.#clip;
  }

  /**
   * 元素是否可见，用于不想删除，期望临时隐藏 Sprite 的场景
   */
  visible = true;

  /**
   * 裁剪区域
   */
  cropRect: { x: number; y: number; w: number; h: number } | null = null;

  /**
   * 素材原始宽度
   */
  #naturalWidth = 0;
  /**
   * 素材原始高度
   */
  #naturalHeight = 0;

  constructor(clip: IClip) {
    super();
    this.#clip = clip;
    this.ready = clip.ready.then(({ width, height, duration }) => {
      this.rect.w = this.rect.w === 0 ? width : this.rect.w;
      this.rect.h = this.rect.h === 0 ? height : this.rect.h;
      this.#naturalWidth = width;
      this.#naturalHeight = height;
      this.time.duration =
        this.time.duration === 0 ? duration : this.time.duration;
    });
  }

  // 保持最近一帧，若 clip 在当前帧无数据，则绘制最近一帧
  #lastVf: VideoFrame | ImageBitmap | null = null;
  #lastAudio: Float32Array[] = [];
  #ticking = false;
  #update(time: number) {
    if (this.#ticking) return;
    this.#ticking = true;
    this.#clip
      .tick(time * this.time.playbackRate)
      .then(({ video, audio }) => {
        if (video != null) {
          this.#lastVf?.close();
          this.#lastVf = video ?? null;
        }
        this.#lastAudio = audio ?? [];
        if (audio != null && this.time.playbackRate !== 1) {
          this.#lastAudio = audio.map((pcm) =>
            changePCMPlaybackRate(pcm, this.time.playbackRate),
          );
        }
      })
      .finally(() => {
        this.#ticking = false;
      });
  }

  /**
   * 提前准备指定 time 的帧
   */
  preFrame(time: number) {
    if (this.#lastTime === time) return;
    this.#update(time);
    this.#lastTime = time;
  }

  #lastTime = -1;
  /**
   * 绘制素材指定时刻的图像到 canvas 上下文，并返回对应的音频数据
   * @param time 指定时刻，微秒
   */
  render(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    time: number,
  ): { audio: Float32Array[] } {
    this.animate(time);
    super._render(ctx);
    const { w, h } = this.rect;
    if (this.#lastTime !== time) this.#update(time);
    this.#lastTime = time;

    const audio = this.#lastAudio;
    this.#lastAudio = [];
    const video = this.#lastVf;
    if (video != null) {
      if (!this.cropRect) {
        ctx.drawImage(video, -w / 2, -h / 2, w, h);
      } else {
        const { x, y, w: cw, h: ch } = this.cropRect;
        ctx.drawImage(video, x, y, cw, ch, -w / 2, -h / 2, w, h);
      }
    }

    return { audio };
  }

  /**
   * 设置裁剪区域
   * @param rect
   */
  setCropRect(rect: { x: number; y: number; w: number; h: number } | null) {
    if (rect) {
      this.cropRect = rect;
      this.rect.w = rect.w === 0 ? this.#naturalWidth : rect.w;
      this.rect.h = rect.h === 0 ? this.#naturalHeight : rect.h;
    } else if (!rect && this.cropRect) {
      this.cropRect = null;
      this.rect.w = this.#naturalWidth;
      this.rect.h = this.#naturalHeight;
    }
  }

  copyStateTo<T extends BaseSprite>(target: T): void {
    super.copyStateTo(target);
    if (target instanceof VisibleSprite) {
      target.visible = this.visible;
    }
  }

  #destroyed = false;
  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;

    Log.info('VisibleSprite destroy');
    super.destroy();
    this.#lastVf?.close();
    this.#lastVf = null;
    this.#clip.destroy();
  }
}

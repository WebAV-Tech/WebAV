import {
  Log,
  Combinator,
  OffscreenSprite,
  VisibleSprite,
  MediaStreamClip,
  ICombinatorOpts,
} from '@webav/av-cliper';
import { renderCtrls } from './sprites/render-ctrl';
import { ESpriteManagerEvt, SpriteManager } from './sprites/sprite-manager';
import {
  activeSprite,
  draggabelSprite,
  dynamicCusor,
} from './sprites/sprite-op';
import { IResolution } from './types';
import { createCtrlsGetter, createEl } from './utils';
import { workerTimer, EventTool } from '@webav/internal-utils';

/**
 * 默认的音频设置，⚠️ 不要变更它的值 ⚠️
 */
const DEFAULT_AUDIO_CONF = {
  sampleRate: 48000,
  channelCount: 2,
  codec: 'mp4a.40.2',
} as const;

function createInitCvsEl(resolution: IResolution): HTMLCanvasElement {
  const cvsEl = createEl('canvas') as HTMLCanvasElement;
  cvsEl.style.cssText = `
    width: 100%;
    height: 100%;
    display: block;
    touch-action: none;
  `;
  cvsEl.width = resolution.width;
  cvsEl.height = resolution.height;

  return cvsEl;
}

/**
 *
 * 一个可交互的画布，让用户添加各种素材，支持基础交互（拖拽、缩放、旋转、时间偏移）
 *
 * 用于在 Web 环境中实现视频剪辑、直播推流工作台功能
 *
 * @description
 *
  - 添加/删除素材（视频、音频、图片、文字）
  - 分割（裁剪）素材
  - 控制素材在视频中的空间属性（坐标、旋转、缩放）
  - 控制素材在视频中的时间属性（偏移、时长）
  - 实时预览播放
  - 纯浏览器环境生成视频

 * @see [直播录制](https://webav-tech.github.io/WebAV/demo/4_2-recorder-avcanvas)
 * @see [视频剪辑](https://webav-tech.github.io/WebAV/demo/6_4-video-editor)
 * @example
 * const avCvs = new AVCanvas(document.querySelector('#app'), {
 *   bgColor: '#333',
 *   width: 1920,
 *   height: 1080,
 * });
 *
 */
export class AVCanvas {
  #cvsEl: HTMLCanvasElement;

  #spriteManager: SpriteManager;

  #cvsCtx: CanvasRenderingContext2D;

  #destroyed = false;

  #clears: Array<() => void> = [];
  #stopRender: () => void;

  #evtTool = new EventTool<{
    timeupdate: (time: number) => void;
    paused: () => void;
    playing: () => void;
    activeSpriteChange: (sprite: VisibleSprite | null) => void;
  }>();
  on = this.#evtTool.on;

  #opts;

  /**
   * 创建 `AVCanvas` 类的实例。
   * @param attchEl - 要添加画布的元素。
   * @param opts - 画布的选项
   * @param opts.bgColor - 画布的背景颜色。
   * @param opts.width - 画布的宽度。
   * @param opts.height - 画布的高度。
   */
  constructor(
    attchEl: HTMLElement,
    opts: {
      bgColor: string;
    } & IResolution,
  ) {
    this.#opts = opts;
    this.#cvsEl = createInitCvsEl(opts);
    const ctx = this.#cvsEl.getContext('2d', { alpha: false });
    if (ctx == null) throw Error('canvas context is null');
    this.#cvsCtx = ctx;
    const container = createEl('div');
    container.style.cssText =
      'width: 100%; height: 100%; position: relative; overflow: hidden;';
    container.appendChild(this.#cvsEl);
    attchEl.appendChild(container);

    createEmptyOscillatorNode(this.#audioCtx).connect(this.#captureAudioDest);

    this.#spriteManager = new SpriteManager();

    const { rectCtrlsGetter, destroy: ctrlGetterDestroy } = createCtrlsGetter(
      this.#cvsEl,
    );
    this.#clears.push(
      ctrlGetterDestroy,
      // 鼠标样式、控制 sprite 依赖 activeSprite，
      // activeSprite 需要在他们之前监听到 mousedown 事件 (代码顺序需要靠前)
      activeSprite(this.#cvsEl, this.#spriteManager, rectCtrlsGetter),
      dynamicCusor(this.#cvsEl, this.#spriteManager, rectCtrlsGetter),
      draggabelSprite(
        this.#cvsEl,
        this.#spriteManager,
        container,
        rectCtrlsGetter,
      ),
      renderCtrls(container, this.#cvsEl, this.#spriteManager, rectCtrlsGetter),
      this.#spriteManager.on(ESpriteManagerEvt.AddSprite, (s) => {
        const { rect } = s;
        // 默认居中
        if (rect.x === 0 && rect.y === 0) {
          rect.x = (this.#cvsEl.width - rect.w) / 2;
          rect.y = (this.#cvsEl.height - rect.h) / 2;
        }
      }),
      EventTool.forwardEvent(this.#spriteManager, this.#evtTool, [
        ESpriteManagerEvt.ActiveSpriteChange,
      ]),
    );

    let lastRenderTime = this.#renderTime;
    let start = performance.now();
    let runCnt = 0;
    const expectFrameTime = 1000 / 30;
    this.#stopRender = workerTimer(() => {
      // workerTimer 会略快于真实时钟，使用真实时间（performance.now）作为基准
      // 跳过部分运行帧修正时间，避免导致音画不同步
      if ((performance.now() - start) / (expectFrameTime * runCnt) < 1) {
        return;
      }
      runCnt += 1;
      this.#cvsCtx.fillStyle = opts.bgColor;
      this.#cvsCtx.fillRect(0, 0, this.#cvsEl.width, this.#cvsEl.height);
      this.#render();

      if (lastRenderTime !== this.#renderTime) {
        lastRenderTime = this.#renderTime;
        this.#evtTool.emit('timeupdate', Math.round(lastRenderTime));
      }
    }, expectFrameTime);

    // ;(window as any).cvsEl = this.#cvsEl
  }

  #renderTime = 0e6;
  #updateRenderTime(time: number) {
    this.#renderTime = time;
    this.#spriteManager.updateRenderTime(time);
  }

  #pause() {
    const emitPaused = this.#playState.step !== 0;
    this.#playState.step = 0;
    if (emitPaused) {
      this.#evtTool.emit('paused');
      this.#audioCtx.suspend();
    }
    for (const asn of this.#playingAudioCache) {
      asn.stop();
      asn.disconnect();
    }
    this.#playingAudioCache.clear();
  }

  #audioCtx = new AudioContext();
  #captureAudioDest = this.#audioCtx.createMediaStreamDestination();

  #playingAudioCache: Set<AudioBufferSourceNode> = new Set();
  #render() {
    const cvsCtx = this.#cvsCtx;
    let ts = this.#renderTime;
    const { start, end, step, audioPlayAt } = this.#playState;
    if (step !== 0 && ts >= start && ts < end) {
      ts += step;
    } else {
      this.#pause();
    }
    this.#updateRenderTime(ts);

    const ctxDestAudioData: Float32Array[][] = [];
    for (const s of this.#spriteManager.getSprites()) {
      cvsCtx.save();
      const { audio } = s.render(cvsCtx, ts - s.time.offset);
      cvsCtx.restore();

      ctxDestAudioData.push(audio);
    }
    cvsCtx.resetTransform();

    if (step !== 0) {
      const curAudioTime = Math.max(this.#audioCtx.currentTime, audioPlayAt);
      const audioSourceArr = convertPCM2AudioSource(
        ctxDestAudioData,
        this.#audioCtx,
      );

      let addTime = 0;
      for (const ads of audioSourceArr) {
        ads.start(curAudioTime);
        ads.connect(this.#audioCtx.destination);
        ads.connect(this.#captureAudioDest);

        this.#playingAudioCache.add(ads);
        ads.onended = () => {
          ads.disconnect();
          this.#playingAudioCache.delete(ads);
        };
        addTime = Math.max(addTime, ads.buffer?.duration ?? 0);
      }
      this.#playState.audioPlayAt = curAudioTime + addTime;
    }
  }

  #playState = {
    start: 0,
    end: 0,
    // paused state when step equal 0
    step: 0,
    // step: (1000 / 30) * 1000,
    audioPlayAt: 0,
  };
  /**
   * 每 33ms 更新一次画布，绘制已添加的 Sprite
   * @param opts - 播放选项
   * @param opts.start - 开始播放的时间（单位：微秒）
   * @param [opts.end] - 结束播放的时间（单位：微秒）。如果未指定，则播放到最后一个 Sprite 的结束时间
   * @param [opts.playbackRate] - 播放速率。1 表示正常速度，2 表示两倍速度，0.5 表示半速等。如果未指定，则默认为 1
   * @throws 如果开始时间大于等于结束时间或小于 0，则抛出错误
   */
  play(opts: { start: number; end?: number; playbackRate?: number }) {
    const spriteTimes = this.#spriteManager
      .getSprites({ time: false })
      .map((s) => s.time.offset + s.time.duration);
    const end =
      opts.end ??
      (spriteTimes.length > 0 ? Math.max(...spriteTimes) : Infinity);

    if (opts.start >= end || opts.start < 0) {
      throw Error(
        `Invalid time parameter, ${JSON.stringify({ start: opts.start, end })}`,
      );
    }

    this.#updateRenderTime(opts.start);
    this.#spriteManager.getSprites({ time: true }).forEach((vs) => {
      const { offset, duration } = vs.time;
      const selfOffset = this.#renderTime - offset;
      vs.preFrame(selfOffset > 0 && selfOffset < duration ? selfOffset : 0);
    });

    this.#playState.start = opts.start;
    this.#playState.end = end;
    // AVCanvas 30FPS，将播放速率转换成步长
    this.#playState.step = (opts.playbackRate ?? 1) * (1000 / 30) * 1000;
    this.#audioCtx.resume();
    this.#playState.audioPlayAt = 0;

    this.#evtTool.emit('playing');
    Log.info('AVCanvs play by:', this.#playState);
  }

  /**
   * 暂停播放，画布内容不再更新
   */
  pause() {
    this.#pause();
  }

  /**
   * 预览 `AVCanvas` 指定时间的图像帧
   */
  previewFrame(time: number) {
    this.#updateRenderTime(time);
    this.#pause();
  }

  /**
   * 获取当前帧的截图图像 返回的是一个base64
   */
  captureImage(): string {
    return this.#cvsEl.toDataURL();
  }

  get activeSprite() {
    return this.#spriteManager.activeSprite;
  }
  set activeSprite(s: VisibleSprite | null) {
    this.#spriteManager.activeSprite = s;
  }

  #sprMapAudioNode = new WeakMap<VisibleSprite, AudioNode>();
  /**
   * 添加 {@link VisibleSprite}
   * @param args {@link VisibleSprite}
   * @example
   * const sprite = new VisibleSprite(
   *   new ImgClip({
   *     type: 'image/gif',
   *     stream: (await fetch('https://xx.gif')).body!,
   *   }),
   * );
   */
  addSprite: SpriteManager['addSprite'] = async (vs) => {
    if (this.#audioCtx.state === 'suspended')
      this.#audioCtx.resume().catch(Log.error);

    const clip = vs.getClip();
    if (clip instanceof MediaStreamClip && clip.audioTrack != null) {
      const audioNode = this.#audioCtx.createMediaStreamSource(
        new MediaStream([clip.audioTrack]),
      );
      audioNode.connect(this.#captureAudioDest);
      this.#sprMapAudioNode.set(vs, audioNode);
    }
    await this.#spriteManager.addSprite(vs);
  };
  /**
   * 删除 {@link VisibleSprite}
   * @param args
   * @returns
   * @example
   * const sprite = new VisibleSprite();
   * avCvs.removeSprite(sprite);
   */
  removeSprite: SpriteManager['removeSprite'] = (vs) => {
    this.#sprMapAudioNode.get(vs)?.disconnect();
    this.#spriteManager.removeSprite(vs);
  };

  /**
   * 销毁实例
   */
  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;

    this.#audioCtx.close();
    this.#captureAudioDest.disconnect();
    this.#evtTool.destroy();
    this.#stopRender();
    this.#cvsEl.parentElement?.remove();
    this.#clears.forEach((fn) => fn());
    this.#playingAudioCache.clear();
    this.#spriteManager.destroy();
  }

  /**
   * 合成所有素材的图像与音频，返回实时媒体流 `MediaStream`
   *
   * 可用于 WebRTC 推流，或由 {@link [AVRecorder](../../av-recorder/classes/AVRecorder.html)} 录制生成视频文件
   *
   * @see [直播录制](https://webav-tech.github.io/WebAV/demo/4_2-recorder-avcanvas)
   *
   */
  captureStream(): MediaStream {
    if (this.#audioCtx.state === 'suspended') {
      this.#audioCtx.resume().catch(Log.error);
    }

    const ms = new MediaStream(
      this.#cvsEl
        .captureStream()
        .getTracks()
        .concat(this.#captureAudioDest.stream.getTracks()),
    );
    Log.info(
      'AVCanvas.captureStream, tracks:',
      ms.getTracks().map((t) => t.kind),
    );
    return ms;
  }

  /**
   * 创建一个视频合成器 {@link [Combinator](../../av-cliper/classes/Combinator.html)} 实例，用于将当前画布添加的 Sprite 导出为视频文件流
   *
   * @param opts - 创建 Combinator 的可选参数
   * @throws 如果没有添加素材，会抛出错误
   *
   * @example
   * avCvs.createCombinator().output() // => ReadableStream
   *
   * @see [视频剪辑](https://webav-tech.github.io/WebAV/demo/6_4-video-editor)
   */
  async createCombinator(opts: ICombinatorOpts = {}) {
    Log.info('AVCanvas.createCombinator, opts:', opts);

    const com = new Combinator({ ...this.#opts, ...opts });
    const sprites = this.#spriteManager.getSprites({ time: false });
    if (sprites.length === 0) throw Error('No sprite added');

    for (const vs of sprites) {
      const os = new OffscreenSprite(vs.getClip());
      os.time = { ...vs.time };
      vs.copyStateTo(os);
      await com.addSprite(os);
    }
    return com;
  }
}

function convertPCM2AudioSource(pcmData: Float32Array[][], ctx: AudioContext) {
  const asArr: AudioBufferSourceNode[] = [];
  if (pcmData.length === 0) return asArr;

  for (const [chan0Buf, chan1Buf] of pcmData) {
    if (chan0Buf == null) continue;
    if (chan0Buf.length <= 0) continue;

    const buf = ctx.createBuffer(
      2,
      chan0Buf.length,
      DEFAULT_AUDIO_CONF.sampleRate,
    );
    buf.copyToChannel(chan0Buf, 0);
    buf.copyToChannel(chan1Buf ?? chan0Buf, 1);
    const audioSource = ctx.createBufferSource();
    audioSource.buffer = buf;
    asArr.push(audioSource);
  }
  return asArr;
}

/**
 * 空背景音，让 dest 能持续收到音频数据，否则时间会异常偏移
 */
function createEmptyOscillatorNode(ctx: AudioContext) {
  const osc = ctx.createOscillator();
  const real = new Float32Array([0, 0]);
  const imag = new Float32Array([0, 0]);
  const wave = ctx.createPeriodicWave(real, imag, {
    disableNormalization: true,
  });
  osc.setPeriodicWave(wave);
  osc.start();
  return osc;
}

import type { IClip } from './iclip';
import type { AudioClip } from './audio-clip';

let SoundTouchClass: any = null;

async function getSoundTouch() {
  if (SoundTouchClass) return SoundTouchClass;
  try {
    const mod = await import('soundtouch-ts');
    SoundTouchClass = mod.SoundTouch;
    return SoundTouchClass;
  } catch {
    throw new Error(
      'soundtouch-ts is required for pitch-preserving speed change. Install it: npm install soundtouch-ts',
    );
  }
}

/**
 * 包装 AudioClip，使用 SoundTouch 实现变速不变调。
 *
 * 原生 `OffscreenSprite` 通过重采样 PCM 实现变速，会同时改变音调。
 * 本类通过 SoundTouch 的时间拉伸算法，在改变播放速度的同时保持原始音调。
 *
 * @see https://github.com/WebAV-Tech/WebAV/issues/487
 * @example
 * const speedClip = createSpeedAudioClip(audioClip, 1.5);
 * const sprite = new OffscreenSprite(speedClip);
 * sprite.time.playbackRate = 1; // 必须设为 1，跳过 OffscreenSprite 自身的变速逻辑
 */
export class SpeedAudioClip implements IClip {
  #realClip: AudioClip;
  #speed: number;
  #st: any;
  #sampleRate: number;
  #lastRealTime = 0;
  #outputBuffer: Float32Array[] = [new Float32Array(0), new Float32Array(0)];
  #bufferedSamples = 0;

  readonly ready: Promise<IClip['ready'] extends Promise<infer T> ? T : never>;
  #meta: IClip['meta'] | null = null;

  constructor(realClip: AudioClip, speed: number, sampleRate = 48000) {
    this.#realClip = realClip;
    this.#speed = speed;
    this.#sampleRate = sampleRate;

    // SoundTouch 实例在 ready 中异步创建（因为需要动态 import）
    this.#st = null;

    this.ready = realClip.ready.then(async (meta) => {
      const ST = await getSoundTouch();
      this.#st = new ST(sampleRate);

      const { sequenceMs, seekWindowMs, overlapMs } = this.#calcOptimalParams(speed);
      this.#st.tdStretch.setParameters(sampleRate, sequenceMs, seekWindowMs, overlapMs);
      this.#st.tdStretch.quickSeek = false;
      this.#st.tempo = speed;
      this.#st.pitch = 1;

      this.#meta = {
        width: meta.width,
        height: meta.height,
        duration: meta.duration / speed,
      };
      return this.#meta;
    });
  }

  get meta(): IClip['meta'] {
    if (!this.#meta) throw new Error('SpeedAudioClip not ready');
    return this.#meta;
  }

  tick: IClip['tick'] = async (time) => {
    const realTime = time * this.#speed;
    const result = await this.#realClip.tick(realTime);

    if (result.state === 'done' || !result.audio || result.audio.length === 0) {
      return result;
    }

    // 速度接近 1 时直接返回，不做处理
    if (Math.abs(this.#speed - 1) < 0.01) return result;

    // 检测 seek 或时间跳跃，重置 SoundTouch 状态
    const timeDiff = realTime - this.#lastRealTime;
    if (
      this.#lastRealTime > 0 &&
      (timeDiff < 0 || timeDiff > 1_000_000)
    ) {
      this.#st.clear();
      this.#outputBuffer = [new Float32Array(0), new Float32Array(0)];
      this.#bufferedSamples = 0;
    }
    this.#lastRealTime = realTime;

    const audio = result.audio;
    const channelCount = audio.length;
    const inputFrameCount = audio[0].length;

    // 转换为立体声交错格式（SoundTouch 只接受立体声交错输入）
    const stereoInterleaved = new Float32Array(inputFrameCount * 2);
    for (let i = 0; i < inputFrameCount; i++) {
      stereoInterleaved[i * 2] = audio[0][i];
      stereoInterleaved[i * 2 + 1] = audio[1]?.[i] ?? audio[0][i];
    }

    // 送入 SoundTouch 处理
    this.#st.inputBuffer.putSamples(stereoInterleaved, 0, inputFrameCount);
    this.#st.process();

    // 取出处理结果，分离为双通道并追加到输出缓冲区
    const stOutputCount = this.#st.outputBuffer.frameCount;
    if (stOutputCount > 0) {
      const stereoOutput = new Float32Array(stOutputCount * 2);
      this.#st.outputBuffer.receiveSamples(stereoOutput, stOutputCount);

      const left = new Float32Array(stOutputCount);
      const right = new Float32Array(stOutputCount);
      for (let i = 0; i < stOutputCount; i++) {
        left[i] = stereoOutput[i * 2];
        right[i] = stereoOutput[i * 2 + 1];
      }
      this.#appendToBuffer(left, right);
    }

    // 期望输出帧数 = 输入帧数 / speed
    const expectedOutputFrames = Math.round(inputFrameCount / this.#speed);

    // 缓冲区不足时返回静音（SoundTouch 预热期）
    if (this.#bufferedSamples < expectedOutputFrames) {
      return {
        audio: Array.from(
          { length: channelCount },
          () => new Float32Array(expectedOutputFrames),
        ),
        state: 'success' as const,
      };
    }

    const [left, right] = this.#consumeFromBuffer(expectedOutputFrames);

    const outputAudio: Float32Array[] = [];
    if (channelCount === 1) {
      outputAudio[0] = new Float32Array(expectedOutputFrames);
      for (let i = 0; i < expectedOutputFrames; i++) {
        outputAudio[0][i] = (left[i] + right[i]) / 2;
      }
    } else {
      outputAudio[0] = left;
      outputAudio[1] = right;
      for (let ch = 2; ch < channelCount; ch++) {
        outputAudio[ch] = new Float32Array(right);
      }
    }

    return { audio: outputAudio, state: 'success' as const };
  };

  clone = async (): Promise<this> => {
    const clonedReal = (await this.#realClip.clone()) as AudioClip;
    return new SpeedAudioClip(clonedReal, this.#speed, this.#sampleRate) as this;
  };

  split: IClip['split'] = async (time) => {
    const realTime = time * this.#speed;
    const [l, r] = (await this.#realClip.split!(realTime)) as unknown as [AudioClip, AudioClip];
    return [
      new SpeedAudioClip(l, this.#speed, this.#sampleRate) as this,
      new SpeedAudioClip(r, this.#speed, this.#sampleRate) as this,
    ];
  };

  destroy(): void {
    this.#realClip.destroy();
    this.#st?.clear();
    this.#outputBuffer = [];
  }

  #appendToBuffer(left: Float32Array, right: Float32Array): void {
    const newLeft = new Float32Array(this.#bufferedSamples + left.length);
    const newRight = new Float32Array(this.#bufferedSamples + right.length);
    newLeft.set(this.#outputBuffer[0]);
    newLeft.set(left, this.#bufferedSamples);
    newRight.set(this.#outputBuffer[1]);
    newRight.set(right, this.#bufferedSamples);
    this.#outputBuffer[0] = newLeft;
    this.#outputBuffer[1] = newRight;
    this.#bufferedSamples += left.length;
  }

  #consumeFromBuffer(frameCount: number): [Float32Array, Float32Array] {
    const left = this.#outputBuffer[0].slice(0, frameCount);
    const right = this.#outputBuffer[1].slice(0, frameCount);
    this.#outputBuffer[0] = this.#outputBuffer[0].slice(frameCount);
    this.#outputBuffer[1] = this.#outputBuffer[1].slice(frameCount);
    this.#bufferedSamples = Math.max(0, this.#bufferedSamples - frameCount);
    return [left, right];
  }

  /**
   * 根据播放速率计算最优 SoundTouch 参数（移植自 SoundTouch C++ 自动参数算法）
   */
  #calcOptimalParams(rate: number) {
    const TEMPO_LOW = 0.5;
    const TEMPO_TOP = 2.0;
    const SEQ_AT_MIN = 125.0;
    const SEQ_AT_MAX = 50.0;
    const SEEK_AT_MIN = 25.0;
    const SEEK_AT_MAX = 15.0;

    const seqK = (SEQ_AT_MAX - SEQ_AT_MIN) / (TEMPO_TOP - TEMPO_LOW);
    const seqC = SEQ_AT_MIN - seqK * TEMPO_LOW;
    const seekK = (SEEK_AT_MAX - SEEK_AT_MIN) / (TEMPO_TOP - TEMPO_LOW);
    const seekC = SEEK_AT_MIN - seekK * TEMPO_LOW;

    const clamped = Math.max(TEMPO_LOW, Math.min(TEMPO_TOP, rate));
    return {
      sequenceMs: Math.max(SEQ_AT_MAX, Math.min(SEQ_AT_MIN, seqC + seqK * clamped)),
      seekWindowMs: Math.max(SEEK_AT_MAX, Math.min(SEEK_AT_MIN, seekC + seekK * clamped)),
      overlapMs: 8,
    };
  }
}

/**
 * 工厂函数：速度接近 1 时直接返回原始 Clip，避免不必要的处理开销。
 *
 * @param audioClip 原始音频素材
 * @param speed 播放速度（如 1.5 表示 1.5 倍速）
 * @param sampleRate 采样率，默认 48000
 */
export function createSpeedAudioClip(
  audioClip: AudioClip,
  speed: number,
  sampleRate = 48000,
): IClip {
  if (Math.abs(speed - 1) < 0.01) return audioClip;
  return new SpeedAudioClip(audioClip, speed, sampleRate);
}

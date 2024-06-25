interface IClipMeta {
  width: number;
  height: number;
  duration: number;
}
export interface IClip {
  /**
   * 当前瞬间，需要的数据
   * @param time 时间，单位 微秒
   */
  tick: (time: number) => Promise<{
    video?: VideoFrame | ImageBitmap | null;
    audio?: Float32Array[];
    state: 'done' | 'success';
  }>;

  ready: Promise<IClipMeta>;

  readonly meta: IClipMeta;

  clone: () => Promise<this>;

  split: (time: number) => Promise<[this, this]>;

  destroy: () => void;
}

export const DEFAULT_AUDIO_CONF = {
  sampleRate: 48000,
  channelCount: 2,
  codec: 'mp4a.40.2',
};

import { file } from 'opfs-tools';
import { MP4Info, MP4Sample } from '@webav/mp4box.js';
import { Log } from '@webav/internal-utils';
import {
  extractFileConfig,
  quickParseMP4File,
} from '../mp4-utils/mp4box-utils';

export type OPFSToolFile = ReturnType<typeof file>;

export type ExtMP4Sample = Omit<MP4Sample, 'data'> & {
  is_idr: boolean;
  deleted?: boolean;
  data: null | Uint8Array;
};

export async function videosamples2Chunks(
  samples: ExtMP4Sample[],
  reader: Awaited<ReturnType<OPFSToolFile['createReader']>>,
): Promise<EncodedVideoChunk[]> {
  const first = samples[0];
  const last = samples.at(-1);
  if (last == null) return [];

  const rangSize = last.offset + last.size - first.offset;
  if (rangSize < 30e6) {
    // 单次读取数据小于 30M，就一次性读取数据，降低 IO 频次
    const data = new Uint8Array(
      await reader.read(rangSize, { at: first.offset }),
    );
    return samples.map((s) => {
      const offset = s.offset - first.offset;
      return new EncodedVideoChunk({
        type: s.is_sync ? 'key' : 'delta',
        timestamp: s.cts,
        duration: s.duration,
        data: data.subarray(offset, offset + s.size),
      });
    });
  }

  return await Promise.all(
    samples.map(async (s) => {
      return new EncodedVideoChunk({
        type: s.is_sync ? 'key' : 'delta',
        timestamp: s.cts,
        duration: s.duration,
        data: await reader.read(s.size, {
          at: s.offset,
        }),
      });
    }),
  );
}

// 兼容解码错误
export function decodeGoP(
  dec: VideoDecoder,
  chunks: EncodedVideoChunk[],
  opts: {
    onDecodingError?: (err: Error) => void;
  },
) {
  let i = 0;
  if (dec.state !== 'configured') return;
  for (; i < chunks.length; i++) dec.decode(chunks[i]);

  // todo：flush 之后下一帧必须是 IDR 帧，是否可以根据情况再决定调用 flush？
  // windows 某些设备 flush 可能不会被 resolved，所以不能 await flush
  dec.flush().catch((err) => {
    if (!(err instanceof Error)) throw err;
    if (
      err.message.includes('Decoding error') &&
      opts.onDecodingError != null
    ) {
      opts.onDecodingError(err);
      return;
    }
    // reset 中断解码器，预期会抛出 AbortedError
    if (!err.message.includes('Aborted due to close')) {
      throw err;
    }
  });
}

export function createVideoDec(
  decConf: VideoDecoderConfig,
  downgrade = false,
  cbs: {
    onOutput: (vf: VideoFrame) => void;
    /**
     * 解码错误时，需要记录日志的错误状态
     * 如果返回 null，则不记录日志
     */
    errLogState: (err: DOMException) => object | null;
  },
) {
  const encoderConf = {
    ...decConf,
    ...(downgrade ? { hardwareAcceleration: 'prefer-software' } : {}),
  } as VideoDecoderConfig;
  const dec = new VideoDecoder({
    output: cbs.onOutput,
    error: (err) => {
      const errState = cbs.errLogState(err);
      if (errState == null) return;

      const errMsg = `decoder error: ${err.message}, config: ${JSON.stringify(encoderConf)}, state: ${JSON.stringify(
        {
          qSize: dec.decodeQueueSize,
          state: dec.state,
          ...errState,
        },
      )}`;
      Log.error(errMsg);
      throw Error(errMsg);
    },
  });
  dec.configure(encoderConf);
  return dec;
}

export interface MP4DecoderConf {
  video: VideoDecoderConfig | null;
  audio: AudioDecoderConfig | null;
}
export interface MP4ClipOpts {
  audio?: boolean | { volume: number };
  /**
   * 不安全，随时可能废弃
   */
  __unsafe_hardwareAcceleration__?: HardwarePreference;
}

export async function mp4FileToSamples(
  otFile: OPFSToolFile,
  opts: MP4ClipOpts = {},
) {
  let mp4Info: MP4Info | null = null;
  const decoderConf: MP4DecoderConf = { video: null, audio: null };
  let videoSamples: ExtMP4Sample[] = [];
  let audioSamples: ExtMP4Sample[] = [];
  let headerBoxPos: Array<{ start: number; size: number }> = [];

  let videoDeltaTS = -1;
  let audioDeltaTS = -1;
  const reader = await otFile.createReader();
  await quickParseMP4File(
    reader,
    (data) => {
      mp4Info = data.info;
      const ftyp = data.mp4boxFile.ftyp!;
      headerBoxPos.push({ start: ftyp.start, size: ftyp.size });
      const moov = data.mp4boxFile.moov!;
      headerBoxPos.push({ start: moov.start, size: moov.size });

      let { videoDecoderConf: vc, audioDecoderConf: ac } = extractFileConfig(
        data.mp4boxFile,
        data.info,
      );
      decoderConf.video = vc ?? null;
      decoderConf.audio = ac ?? null;
      if (vc == null && ac == null) {
        Log.error('MP4Clip no video and audio track');
      }
      Log.info(
        'mp4BoxFile moov ready',
        {
          ...data.info,
          tracks: null,
          videoTracks: null,
          audioTracks: null,
        },
        decoderConf,
      );
    },
    (_, type, samples) => {
      if (type === 'video') {
        if (videoDeltaTS === -1) videoDeltaTS = samples[0].dts;
        for (const s of samples) {
          videoSamples.push(normalizeTimescale(s, videoDeltaTS, 'video'));
        }
      } else if (type === 'audio' && opts.audio) {
        if (audioDeltaTS === -1) audioDeltaTS = samples[0].dts;
        for (const s of samples) {
          audioSamples.push(normalizeTimescale(s, audioDeltaTS, 'audio'));
        }
      }
    },
  );
  await reader.close();

  const lastSampele = videoSamples.at(-1) ?? audioSamples.at(-1);
  if (mp4Info == null) {
    throw Error('MP4Clip stream is done, but not emit ready');
  } else if (lastSampele == null) {
    throw Error('MP4Clip stream not contain any sample');
  }
  // 修复首帧黑帧
  fixFirstBlackFrame(videoSamples);
  Log.info('mp4 stream parsed');
  return {
    videoSamples,
    audioSamples,
    decoderConf,
    headerBoxPos,
  };

  function normalizeTimescale(
    s: MP4Sample,
    delta = 0,
    sampleType: 'video' | 'audio',
  ) {
    // todo: perf 丢弃多余字段，小尺寸对象性能更好
    const idrOffset =
      sampleType === 'video' && s.is_sync
        ? idrNALUOffset(s.data, s.description.type)
        : -1;
    let offset = s.offset;
    let size = s.size;
    if (idrOffset >= 0) {
      // 当 IDR 帧前面携带 SEI 数据可能导致解码失败
      // 所以此处通过控制 offset、size 字段 跳过 SEI 数据
      offset += idrOffset;
      size -= idrOffset;
    }
    return {
      ...s,
      is_idr: idrOffset >= 0,
      offset,
      size,
      cts: ((s.cts - delta) / s.timescale) * 1e6,
      dts: ((s.dts - delta) / s.timescale) * 1e6,
      duration: (s.duration / s.timescale) * 1e6,
      timescale: 1e6,
      // 音频数据量可控，直接保存在内存中
      data: sampleType === 'video' ? null : s.data,
    };
  }
}

// 如果第一帧出现的时间偏移较大，会导致第一帧为黑帧，这里尝试自动消除第一帧前的黑帧
export function fixFirstBlackFrame(samples: ExtMP4Sample[]) {
  let iframeCnt = 0;
  let minCtsSample: ExtMP4Sample | null = null;
  // cts 最小表示视频的第一帧
  for (const s of samples) {
    if (s.deleted) continue;
    // 最多检测两个 I 帧之间的帧
    if (s.is_sync) iframeCnt += 1;
    if (iframeCnt >= 2) break;

    if (minCtsSample == null || s.cts < minCtsSample.cts) {
      minCtsSample = s;
    }
  }
  // 200ms 是经验值，自动消除 200ms 内的黑帧，超过则不处理
  if (minCtsSample != null && minCtsSample.cts < 200e3) {
    minCtsSample.duration += minCtsSample.cts;
    minCtsSample.cts = 0;
  }
}

function idrNALUOffset(
  u8Arr: Uint8Array,
  type: MP4Sample['description']['type'],
) {
  if (type !== 'avc1' && type !== 'hvc1') return 0;

  const dv = new DataView(u8Arr.buffer);
  let i = 0;
  for (; i < u8Arr.byteLength - 4; ) {
    if (type === 'avc1' && (dv.getUint8(i + 4) & 0x1f) === 5) {
      return i;
    } else if (type === 'hvc1') {
      const nalUnitType = (dv.getUint8(i + 4) >> 1) & 0x3f;
      if (nalUnitType === 19 || nalUnitType === 20) return i;
    }
    // 跳至下一个 NALU 继续检查
    i += dv.getUint32(i) + 4;
  }
  return -1;
}

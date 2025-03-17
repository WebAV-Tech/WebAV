import { expect, test, vi } from 'vitest';
import { MP4Clip } from '../mp4-clip';
import { decodeFrameByIndex, mp4FileToSamples } from '../mp4-clip-utils';
import { file, tmpfile, write } from 'opfs-tools';
import { extractFileConfig } from '../../mp4-utils/mp4box-utils';

const mp4_123 = `//${location.host}/video/123.mp4`;

test('decodeFrameByIndex', async () => {
  const tf = tmpfile();
  await write(tf, (await fetch(mp4_123)).body!);
  const { videoSamples, decoderConf } = await mp4FileToSamples(tf, {
    audio: false,
  });
  if (decoderConf.video == null) throw Error('no video track');
  console.log(
    55555,
    videoSamples.map((s) => s.cts),
  );
  const args = [videoSamples, decoderConf.video, tf] as const;
  const frame1 = await decodeFrameByIndex(...args, 0);
  expect(frame1).toBeInstanceOf(VideoFrame);
  expect(frame1!.timestamp).toBe(0);
  frame1?.close();

  const frame2 = await decodeFrameByIndex(...args, 1);
  expect(frame2!.timestamp).toBe(240000);

  const frame3 = await decodeFrameByIndex(...args, -3, { baseTime: 0.5e6 });
  expect(frame3!.timestamp).toBe(360000);
});

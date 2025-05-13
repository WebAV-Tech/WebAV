import { VisibleSprite, MediaStreamClip } from '@webav/av-cliper';
import { AVCanvas } from '../src/index';
import { AVRecorder } from '@webav/av-recorder';
import { createEl } from '../src/utils';

const avCvs = new AVCanvas(document.querySelector('#app') as HTMLElement, {
  bgColor: '#333',
  width: 1920,
  height: 1080,
});
avCvs.play({ start: 0, end: Infinity });
avCvs.on('timeupdate', (t) => {
  console.log('timeupdate', t);
});

document.querySelector('#userMedia')?.addEventListener('click', () => {
  (async () => {
    const spr = new VisibleSprite(
      new MediaStreamClip(
        await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        }),
      ),
    );
    await avCvs.addSprite(spr);
  })().catch(console.error);
});

document.querySelector('#display')?.addEventListener('click', () => {
  // (async () => {
  //   const mediaStream = await navigator.mediaDevices.getDisplayMedia({
  //     video: true,
  //     audio: true,
  //   });
  //   const vs = new VideoSprite('display', mediaStream, {
  //     audioCtx: avCvs.spriteManager.audioCtx,
  //   });
  //   await avCvs.spriteManager.addSprite(vs);
  // })().catch(console.error);
});

document.querySelector('#localImg')?.addEventListener('click', () => {
  // (async () => {
  //   const [imgFH] = await window.showOpenFilePicker({
  //     types: [
  //       {
  //         description: 'Images',
  //         accept: {
  //           'image/*': ['.png', '.gif', '.jpeg', '.jpg'],
  //         },
  //       },
  //     ],
  //   });
  //   const is = new ImgSprite('img', await imgFH.getFile());
  //   await avCvs.spriteManager.addSprite(is);
  // })().catch(console.error);
});

document.querySelector('#localVideo')?.addEventListener('click', () => {
  (async () => {
    const [videoFH] = await window.showOpenFilePicker({
      types: [
        {
          description: 'Video',
          accept: {
            'video/*': ['.webm', '.mp4'],
          },
        },
      ],
    });
    const videoEl = createEl('video') as HTMLVideoElement;
    videoEl.src = URL.createObjectURL(await videoFH.getFile());
    videoEl.loop = true;
    videoEl.autoplay = true;
    await videoEl.play();

    const spr = new VisibleSprite(
      // @ts-ignore
      new MediaStreamClip(videoEl.captureStream()),
    );
    await avCvs.addSprite(spr);
  })().catch(console.error);
});

document.querySelector('#localAudio')?.addEventListener('click', () => {
  // (async () => {
  //   const [imgFH] = await window.showOpenFilePicker({
  //     types: [
  //       {
  //         description: 'Audio',
  //         accept: {
  //           'audio/*': ['.mp3', '.wav', '.ogg'],
  //         },
  //       },
  //     ],
  //   });
  //   const as = new AudioSprite('vs', await imgFH.getFile(), {
  //     audioCtx: avCvs.spriteManager.audioCtx,
  //   });
  //   await avCvs.spriteManager.addSprite(as);
  // })().catch(console.error);
});

document.querySelector('#fontExamp')?.addEventListener('click', () => {
  // (async () => {
  //   const textSpr = new TextSprite('text', '示例文字');
  //   await avCvs.spriteManager.addSprite(textSpr);
  // })().catch(console.error);
});

document.querySelector('#screenshot')?.addEventListener('click', () => {
  (async () => {
    const spr = new VisibleSprite(
      new MediaStreamClip(
        await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        }),
      ),
    );
    spr.setCropRect({ x: 100, y: 100, w: 100, h: 100 });

    // 取消裁剪
    setTimeout(() => {
      spr.setCropRect(null);
    }, 5000);

    await avCvs.addSprite(spr);
  })().catch(console.error);
});

let recorder: AVRecorder | null = null;
document.querySelector('#startRecod')?.addEventListener('click', () => {
  (async () => {
    const writer = await createFileWriter('mp4');
    recorder = new AVRecorder(avCvs.captureStream(), {
      // recorder = new AVRecorder(
      //   await navigator.mediaDevices.getUserMedia({ video: true, audio: true }),
      // {
      bitrate: 5e6,
    });
    recorder.start().pipeTo(writer).catch(console.error);
  })().catch(console.error);
});
document.querySelector('#stopRecod')?.addEventListener('click', () => {
  (async () => {
    await recorder?.stop();
    alert('save done');
  })().catch(console.error);
});

async function createFileWriter(
  extName: string,
): Promise<FileSystemWritableFileStream> {
  const fileHandle = await window.showSaveFilePicker({
    suggestedName: `WebAV-export-${Date.now()}.${extName}`,
  });
  return fileHandle.createWritable();
}

export {};

# @webav/av-cliper

## 1.2.8

### Patch Changes

- 697fc57: fix: maybe throw Error when splitAudioSampleByTime
- fc4f0cd: fix: renderTxt2ImgBitmap width/height maybe incorrect when custom fontFamily
  - @webav/internal-utils@1.2.8

## 1.2.7

### Patch Changes

- 82eb892: feat: add AudioClip.concatAudioClip
  - @webav/internal-utils@1.2.7

## 1.2.6

### Patch Changes

- 5c4c275: feat: Combinator.ouput support maxTime
  - @webav/internal-utils@1.2.6

## 1.2.5

### Patch Changes

- @webav/internal-utils@1.2.5

## 1.2.4

### Patch Changes

- 4746e46: feat: when subtitles are too long, they automatically wrap.
- 4746e46: fix: compatible with incomplete audio codec string mp4a.40
  - @webav/internal-utils@1.2.4

## 1.2.3

### Patch Changes

- 06d34b4: fix: rotation direction is reversed
  - @webav/internal-utils@1.2.3

## 1.2.2

### Patch Changes

- 2d4eec1: fix: MP4Clip has not adapted to the video track’s matrix settings
  - @webav/internal-utils@1.2.2

## 1.2.1

### Patch Changes

- 59eb489: fix: parse audio codec incorrect #396
  - @webav/internal-utils@1.2.1

## 1.2.0

### Minor Changes

- 5bb3a47: feat: support interactable for VisibleSprite #456

### Patch Changes

- Updated dependencies [5bb3a47]
  - @webav/internal-utils@1.2.0

## 1.1.17

### Patch Changes

- 0e2c1ae: fix: generating thumbnails may cause the program to hang
  - @webav/internal-utils@1.1.17

## 1.1.16

### Patch Changes

- fc541bb: fix: preserve SPS/PPS NALUs before IDR frames to ensure proper video decoding
- 0d82c10: fix: display black frame before previewFrame
  - @webav/internal-utils@1.1.16

## 1.1.15

### Patch Changes

- @webav/internal-utils@1.1.15

## 1.1.14

### Patch Changes

- 9bae19e: fix: audio/video sync drift in fixMP4BoxFileDuration #446
  - @webav/internal-utils@1.1.14

## 1.1.13

### Patch Changes

- @webav/internal-utils@1.1.13

## 1.1.12

### Patch Changes

- 11f5be8: fix: black frame for AVCanvas play
  - @webav/internal-utils@1.1.12

## 1.1.11

### Patch Changes

- 32b7d47: fix: OOM when add many clips to AVCanvas
  - @webav/internal-utils@1.1.11

## 1.1.10

### Patch Changes

- 14f3cf9: fix: compatible frame type incorrect
  - @webav/internal-utils@1.1.10

## 1.1.9

### Patch Changes

- ccd0ec8: feat: support mux vp9 #434
- Updated dependencies [ccd0ec8]
  - @webav/internal-utils@1.1.9

## 1.1.8

### Patch Changes

- c99bd8e: fix: the first keyframe is trusted as an IDR frame by default for compatibility with certain video files that have abnormal annotations.
- Updated dependencies [c99bd8e]
  - @webav/internal-utils@1.1.8

## 1.1.7

### Patch Changes

- 013e45c: fix: mp4clip compatible with anomalous data #424
  - @webav/internal-utils@1.1.7

## 1.1.6

### Patch Changes

- 0adc360: fix: preserve tickInterceptor when cloning ImgClip instance
  - @webav/internal-utils@1.1.6

## 1.1.5

### Patch Changes

- cdf8eb1: feat: add custom font support for text-to-image rendering #415
  - @webav/internal-utils@1.1.5

## 1.1.4

### Patch Changes

- @webav/internal-utils@1.1.4

## 1.1.3

### Patch Changes

- @webav/internal-utils@1.1.3

## 1.1.3-snapshot.0

### Patch Changes

- @webav/internal-utils@1.1.3-snapshot.0

## 1.1.2

### Patch Changes

- f4c4fb4: feat(av-cliper): add font style support for subtitles. Add fontWeight and fontStyle options to EmbedSubtitlesClip. Support both string ('bold') and numeric (700) font weights. Support italic and normal font styles. Update demo and test cases.
  - @webav/internal-utils@1.1.2

## 1.1.1

### Patch Changes

- @webav/internal-utils@1.1.1

## 1.1.0

### Minor Changes

- 16be2cf: feat: ImgClip supports the tickInterceptor method

### Patch Changes

- @webav/internal-utils@1.1.0

## 1.0.20

### Patch Changes

- @webav/internal-utils@1.0.20

## 1.0.19

### Patch Changes

- 9203763: chore: upgrade version for opfs-tools
  - @webav/internal-utils@1.0.19

## 1.0.18

### Patch Changes

- @webav/internal-utils@1.0.18

## 1.0.17

### Patch Changes

- ece970a: fix: named export 'resample' not found #368
  - @webav/internal-utils@1.0.17

## 1.0.16

### Patch Changes

- 0f58eae: fix: some files failed to decode. #364
  - @webav/internal-utils@1.0.16

## 1.0.15

### Patch Changes

- bd86a2d: refactor: generate a keyframe every 3 seconds.
  - @webav/internal-utils@1.0.15

## 1.0.14

### Patch Changes

- a55d12e: feat: Provide the binary data for the video header (box: ftyp, moov). #235 #348
  - @webav/internal-utils@1.0.14

## 1.0.13

### Patch Changes

- aa6e3fe: fix: Initialize MediaStreamClip's width, height and cvs in the first call of onChunk with the firstFrame information #343
- 1055cac: resolve size mismatch issue in MediaStreamClip during tab recording #343
  - @webav/internal-utils@1.0.13

## 1.0.12

### Patch Changes

- 146881f: chore: upgrade mp4box.js version
- 0dab489: add tickInterceptor to audio-clip
- Updated dependencies [146881f]
  - @webav/internal-utils@1.0.12

## 1.0.11

### Patch Changes

- 57b08dc: fix: decoder queue size maybe too large
- Updated dependencies [edee0df]
  - @webav/internal-utils@1.0.11

## 1.0.10

### Patch Changes

- c6e4ebb: fix: parse audio timeout
  - @webav/internal-utils@1.0.10

## 1.0.9

### Patch Changes

- ef1cc97: chore: more log info
  - @webav/internal-utils@1.0.9

## 1.0.8

### Patch Changes

- 6a158b1: fix: time incorrect for dump log
- af99e6a: chore: release thumbnails decoder
- 6a92cbf: chore: details log
- 96dadac: feat: many args for Combinator.isSupported
- Updated dependencies [6a158b1]
- Updated dependencies [6a92cbf]
  - @webav/internal-utils@1.0.8

## 1.0.7

### Patch Changes

- 443516f: fix: maybe timeout for decode audio when tick a too large time
  - @webav/internal-utils@1.0.7

## 1.0.6

### Patch Changes

- Updated dependencies [3cc3cc7]
  - @webav/internal-utils@1.0.6

## 1.0.5

### Patch Changes

- ce5ebc8: fix: corrected the link to av-recorder
- 27e74c1: refactor: change the split method of the IClip interface to be optional #324
- Updated dependencies [ce5ebc8]
  - @webav/internal-utils@1.0.5

## 1.0.4

### Patch Changes

- f934fe6: fix: decode HEVC error when start with SEI
- edda979: workflow: add ci workflow to run ci:test
- Updated dependencies [edda979]
  - @webav/internal-utils@1.0.4

## 1.0.3

### Patch Changes

- b178269: chore: replace prepublishOnly with prepare scripts to auto build @webav/av-cliper and @webav/internal-utils
- Updated dependencies [b178269]
  - @webav/internal-utils@1.0.3

## 1.0.2

### Patch Changes

- 35aae3f: feat: createCombinator support more augs
  - @webav/internal-utils@1.0.2

## 1.0.1

### Patch Changes

- 720f20b: fix: black frame #308
  - @webav/internal-utils@1.0.1

## 1.0.0

### Major Changes

- 8212cb5: feat: v1

### Patch Changes

- 5631c29: fix: IDR frame recognition for HEVC #306
- Updated dependencies [8212cb5]
  - @webav/internal-utils@1.0.0

## 1.0.0-beta.1

### Patch Changes

- 5631c29: fix: IDR frame recognition for HEVC #306
  - @webav/internal-utils@1.0.0-beta.1

## 1.0.0-beta.0

### Major Changes

- feat: v1

### Patch Changes

- Updated dependencies
  - @webav/internal-utils@1.0.0-beta.0

## 0.16.5

### Patch Changes

- 3019a88: fix: IDR frame recognition for HEVC #306

## 0.16.4

### Patch Changes

- 759fecd: fix: other types of isIDRFrame judgments
- ed3c8ee: fix: wrong audio data when combination #299

## 0.16.3

### Patch Changes

- a67e569: Feature: add fixedScaleCenter mode in rect

## 0.16.2

## 0.16.1

### Patch Changes

- ef8605b: refactor: optimize the parsing of large MP4 files.

## 0.16.0

### Minor Changes

- e2a1387: feat: support change playbackRate for Sprite

## 0.15.5

### Patch Changes

- e3b9a74: fix: thumbnails error #265

## 0.15.4

## 0.15.3

### Patch Changes

- e9b5351: fix: recoder ouput vdieo cant play

## 0.15.2

### Patch Changes

- 21ffb44: fix: The output video has a corrupted image (artifacting)

## 0.15.1

### Patch Changes

- bd37284: fix: not has video frame when recode usermedia

## 0.15.0

### Minor Changes

- d935bdc: feat: custom fps for Combinator

### Patch Changes

- 8d76376: chore: merge bugfix

## 0.15.0-beta.1

### Patch Changes

- chore: merge bugfix

## 0.15.0-beta.0

### Minor Changes

- feat: custom fps for Combinator

## 0.14.15

### Patch Changes

- 7980ebd: fix: unable to recognize HEVC IDR frames #258
- a9d810a: fix: thumbnailByKeyFrame throw decoder error

## 0.14.14

### Patch Changes

- bd23942: chore: upgrade opfs-tools

## 0.14.13

### Patch Changes

- 95c37f8: fix: first frame incorrect when split MP4Clip #245

## 0.14.12

### Patch Changes

- 9bc7c2a: fix: remove debug code

## 0.14.11

### Patch Changes

- aff0d9f: fix: update the duration when the first sample is reset to 0.
- d81f8e3: fix: decoding error when fist item not IDR frame

## 0.14.10

## 0.14.9

### Patch Changes

- b4635d5: perf: mutli encoder

## 0.14.8

### Patch Changes

- 35f6811: fix: throw error when import sdk on node.js

## 0.14.7

### Patch Changes

- b65cb58: fix: timeout when quick seeking
- 42dc0fa: fix: fix the first render after seeking

## 0.14.6

### Patch Changes

- 8475ab0: perf: pre-decode and update calmdown strategy

## 0.14.5

### Patch Changes

- b77bd86: fix: VideoEncoder bug #203

## 0.14.4

### Patch Changes

- 2e7bfad: chore: upgrade opfs-tools

## 0.14.3

### Patch Changes

- 663f948: fix: MP4Clip.split does not correctly mark samples #207

## 0.14.2

### Patch Changes

- 85512d0: fix: A/V not sync

## 0.14.1

### Patch Changes

- 1443b24: fix: range error: array buffer allocation failed #201

## 0.14.0

### Minor Changes

- b2efb6f: perf: imporve perf for mp4clip

### Patch Changes

- 23ba479: perf: imporve perf for MP4Clip

## 0.13.10

### Patch Changes

- 623d12c: fix: not working in nested inlined worker

## 0.13.9

### Patch Changes

- 60fd9ed: fix: deocde timeout because many thumbnails task

## 0.13.8

### Patch Changes

- c7fcdcf: fix: gen thumbnails throw decode error

## 0.13.7

### Patch Changes

- 0fe21e5: chore: add timeout error log

## 0.13.6

### Patch Changes

- 737cb31: fix: cant stop decode audio when reset

## 0.13.5

### Patch Changes

- ebbb64c: fix: decode error when IDR frame has SEI data

## 0.13.4

### Patch Changes

- 5971c9b: feat: improve storage for mpclip

## 0.13.3

### Patch Changes

- bf41f68: fix: create log file error when init

## 0.13.2

### Patch Changes

- 6eebf28: fix: throw Error when MP4Clip.splitTrack then invoke split

## 0.13.1

### Patch Changes

- 68eab28: feat: custom changeset commit

## 0.13.0

### Minor Changes

- f83b3fa: docs(api): add a lot of api doc

## 0.12.6

### Patch Changes

- fix: mp4clip timeout, because dec.flush not resoloved

## 0.12.5

## 0.12.4

### Patch Changes

- abeae6a: fix: mp4clip timeout error

## 0.12.3

### Patch Changes

- 53b37c7: fix: hardware decode error

## 0.12.2

### Patch Changes

- 01b6724: feat: add progress event for hlsloader
- 834d322: fix: MP4Clip throw error when fisrt sample not key frame

## 0.12.1

### Patch Changes

- refactor: remove yarn, lerna

## 0.12.0

### Minor Changes

- refactor: switch to pnpm

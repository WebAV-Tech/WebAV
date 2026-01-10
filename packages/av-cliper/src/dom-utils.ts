// 在主线程中执行的 工具函数

/**
 * 创建一个新的 HTML 元素
 * @param tagName - 要创建的元素的标签名
 * @returns 新创建的 HTML 元素
 */
export function createEl(tagName: string): HTMLElement {
  return document.createElement(tagName);
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  var binary = '';
  var bytes = new Uint8Array(buffer);
  var len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * 将文本渲染为图片
 * @param txt - 要渲染的文本
 * @param cssText - 应用于文本的 CSS 样式
 * @returns 渲染后的图片元素
 */
export async function renderTxt2Img(
  txt: string,
  cssText: string,
  opts: {
    font?: { name: string; url: string };
    onCreated?: (el: HTMLElement) => void;
  } = {},
): Promise<HTMLImageElement> {
  const preEl = createEl('pre');
  preEl.style.cssText = `margin: 0; ${cssText}; position: fixed;`;
  preEl.textContent = txt;
  document.body.appendChild(preEl);
  opts.onCreated?.(preEl);

  // 避免重复覆盖其他字体他
  const tmpFontName = 'TMP_FONT_NAME_' + crypto.randomUUID();
  let fontFace: FontFace | null = null;
  // 等待字体加载完成后再计算尺寸
  if (opts.font != null) {
    preEl.style.fontFamily = tmpFontName;
    fontFace = new FontFace(tmpFontName, `url(${opts.font.url})`);
    await fontFace.load();
    // @ts-expect-error https://developer.mozilla.org/en-US/docs/Web/API/FontFaceSet/add
    document.fonts.add(fontFace);
    await document.fonts.ready;
  }

  const { width, height } = preEl.getBoundingClientRect();
  // 计算出 rect，立即从dom移除
  preEl.remove();
  if (fontFace != null) {
    // @ts-expect-error https://developer.mozilla.org/en-US/docs/Web/API/FontFaceSet/delete
    document.fonts.delete(fontFace);
  }

  const img = new Image();
  img.width = width;
  img.height = height;
  const fontFaceStr =
    opts.font == null
      ? ''
      : `
    @font-face {
      font-family: '${tmpFontName}';
      src: url('data:font/woff2;base64,${arrayBufferToBase64(await (await fetch(opts.font.url)).arrayBuffer())}') format('woff2');
    }
  `;
  const svgStr = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <style>
        ${fontFaceStr}
      </style>
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml">${preEl.outerHTML}</div>
      </foreignObject>
    </svg>
  `
    .replace(/\t/g, '')
    .replace(/#/g, '%23');

  img.src = `data:image/svg+xml;charset=utf-8,${svgStr}`;

  await new Promise((resolve) => {
    img.onload = resolve;
  });
  return img;
}

/**
 * 将文本渲染为 {@link ImageBitmap}，用来创建 {@link ImgClip}
 * @param txt - 要渲染的文本
 * @param cssText - 应用于文本的 CSS 样式
 * @param opts - 选项
 * @param opts.font -  自定义字体
 * @param opts.onCreated - 创建完成后的回调
 *
 * @example
 * new ImgClip(
 *   await renderTxt2ImgBitmap(
 *     '水印',
 *    `font-size:40px; color: white; text-shadow: 2px 2px 6px red; font-family: CustomFont;`,
 *    {
 *      font: {
 *        name: 'CustomFont',
 *        url: '/CustomFont.ttf',
 *      },
 *    },
 *   )
 * )
 */
export async function renderTxt2ImgBitmap(
  txt: string,
  cssText: string,
  opts: {
    font?: { name: string; url: string };
    onCreated?: (el: HTMLElement) => void;
  } = {},
): Promise<ImageBitmap> {
  const imgEl = await renderTxt2Img(txt, cssText, opts);
  const cvs = new OffscreenCanvas(imgEl.width, imgEl.height);
  const ctx = cvs.getContext('2d');
  ctx?.drawImage(imgEl, 0, 0, imgEl.width, imgEl.height);
  return await createImageBitmap(cvs);
}

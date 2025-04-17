import { VisibleSprite } from '@webav/av-cliper';
import { EventTool } from '@webav/internal-utils';

export enum ESpriteManagerEvt {
  ActiveSpriteChange = 'activeSpriteChange',
  AddSprite = 'addSprite',
}

export class SpriteManager {
  #sprites: VisibleSprite[] = [];

  #activeSprite: VisibleSprite | null = null;

  #evtTool = new EventTool<{
    [ESpriteManagerEvt.AddSprite]: (s: VisibleSprite) => void;
    [ESpriteManagerEvt.ActiveSpriteChange]: (s: VisibleSprite | null) => void;
  }>();

  on = this.#evtTool.on;

  get activeSprite(): VisibleSprite | null {
    return this.#activeSprite;
  }
  set activeSprite(s: VisibleSprite | null) {
    if (s === this.#activeSprite) return;
    this.#activeSprite = s;
    this.#evtTool.emit(ESpriteManagerEvt.ActiveSpriteChange, s);
  }

  async addSprite(vs: VisibleSprite): Promise<void> {
    await vs.ready;
    vs.preFrame(0);
    this.#sprites.push(vs);
    this.#sprites = this.#sprites.sort((a, b) => a.zIndex - b.zIndex);
    vs.on('propsChange', (props) => {
      if (props.zIndex == null) return;
      vs.preFrame(0);
      this.#sprites = this.#sprites.sort((a, b) => a.zIndex - b.zIndex);
    });

    this.#evtTool.emit(ESpriteManagerEvt.AddSprite, vs);
  }

  removeSprite(spr: VisibleSprite): void {
    if (this.#activeSprite === spr) this.activeSprite = null;
    this.#sprites = this.#sprites.filter((s) => s !== spr);
    spr.destroy();
  }

  getSprites(filter: { time: boolean } = { time: true }): VisibleSprite[] {
    return this.#sprites.filter(
      (s) =>
        s.visible &&
        (filter.time
          ? this.#renderTime >= s.time.offset &&
            this.#renderTime <= s.time.offset + s.time.duration
          : true),
    );
  }

  #renderTime = 0;
  updateRenderTime(time: number) {
    this.#renderTime = time;

    // 避免素材不可见，但渲染了素材边框控制点
    const as = this.activeSprite;
    if (
      as != null &&
      (time < as.time.offset || time > as.time.offset + as.time.duration)
    ) {
      this.activeSprite = null;
    }
  }

  destroy(): void {
    this.#evtTool.destroy();
    this.#sprites.forEach((s) => s.destroy());
    this.#sprites = [];
  }
}

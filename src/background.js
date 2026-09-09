/* ============================================================
   배경 — 하늘 / 원경 빌딩 / 재래시장 상점 / 바닥, 4겹 패럴랙스
   ============================================================ */
'use strict';

class Background {
  constructor() {
    this.off = { sky: 0, city: 0, ground: 0 };
    this.shops = [];
    this.seeded = false;
  }

  reset() {
    this.off.sky = this.off.city = this.off.ground = 0;
    this.shops.length = 0;
    this.seeded = false;
  }

  /** 화면을 상점으로 한 번 채워 둔다 */
  seed() {
    let x = -20;
    while (x < VIEW_W + 140) x = this._push(x);
    this.seeded = true;
  }

  _push(x) {
    const name = SHOP_SPRITES[(Math.random() * SHOP_SPRITES.length) | 0];
    const im = Assets.get(name);
    this.shops.push({ name, x, w: im.width, h: im.height });
    return x + im.width + 2 + ((Math.random() * 16) | 0);
  }

  update(speed) {
    if (!this.seeded) this.seed();

    this.off.sky    = (this.off.sky    + speed * PARALLAX.sky)    % VIEW_W;
    this.off.city   = (this.off.city   + speed * PARALLAX.city)   % VIEW_W;
    this.off.ground = (this.off.ground + speed * PARALLAX.ground) % VIEW_W;

    const dx = speed * PARALLAX.shops;
    for (const s of this.shops) s.x -= dx;
    while (this.shops.length && this.shops[0].x + this.shops[0].w < -24) this.shops.shift();
    const last = this.shops[this.shops.length - 1];
    if (!last || last.x + last.w < VIEW_W + 120) this._push(last ? last.x + last.w + 2 + ((Math.random() * 16) | 0) : VIEW_W);
  }

  draw(ctx) {
    /* 하늘 */
    this._tile(ctx, Assets.get('sky'), this.off.sky, 0);

    /* 원경 빌딩 — 아래 검은 띠(23px)는 바닥이 덮는다 */
    const city = Assets.get('buildings');
    this._tile(ctx, city, this.off.city, VIEW_H - city.height);

    /* 재래시장 상점 */
    for (const s of this.shops) {
      const im = Assets.get(s.name);
      ctx.drawImage(im, Math.round(s.x), GROUND_TOP + 1 - s.h);
    }

    /* 바닥 */
    this._tile(ctx, Assets.get('ground'), this.off.ground, GROUND_TOP);
  }

  _tile(ctx, im, off, y) {
    const x = -Math.round(off);
    ctx.drawImage(im, x, y);
    if (x + im.width < VIEW_W) ctx.drawImage(im, x + im.width, y);
  }
}

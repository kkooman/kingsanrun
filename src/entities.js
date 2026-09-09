/* ============================================================
   장애물 / 아이템 / 이펙트 / 패턴 스포너
   ============================================================ */
'use strict';

const rnd  = (a, b) => a + Math.random() * (b - a);
const irnd = (a, b) => (a + Math.random() * (b - a + 1)) | 0;
const pick = arr => arr[(Math.random() * arr.length) | 0];

const aabb = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/* 아이템 높이 프리셋 */
const LANE = {
  slide: FEET_Y - 8,
  low:   FEET_Y - 15,
  mid:   FEET_Y - 42,
  high:  FEET_Y - 72,
  sky:   FEET_Y - 98,
};

/* ── 장애물: 스프라이트형 ─────────────────── */
class Obstacle {
  constructor(kind, x) {
    this.kind = kind;
    this.def = OBSTACLES[kind];
    this.im = Assets.get(this.def.sprite);
    this.x = x;
    this.frame = 0;
    this.t = 0;
    this.dead = false;
  }
  get right() { return this.x + this.def.fw; }

  update(speed) {
    this.x -= speed + this.def.drift;
    this.t += this.def.fps / 60;
    this.frame = (this.t | 0) % this.def.frames;
    if (this.right < -8) this.dead = true;
  }

  hitbox() {
    const d = this.def, top = FEET_Y - d.footY;
    return { x: this.x + d.hb.x, y: top + d.hb.y, w: d.hb.w, h: d.hb.h };
  }

  draw(ctx) {
    const d = this.def;
    ctx.globalAlpha = 0.26; ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.ellipse(this.x + d.fw / 2, FEET_Y + 1, d.fw * 0.34, 2.2, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.globalAlpha = 1;
    ctx.drawImage(this.im, this.frame * d.fw, 0, d.fw, d.fh,
      Math.round(this.x), Math.round(FEET_Y - d.footY), d.fw, d.fh);
  }
}

/* ── 장애물: 시장 천막 (절차적, 슬라이드로 통과) ──
   위쪽은 줄무늬 캐노피, 가운데는 비닐 커튼, 아래는 굵은 레일.
   레일이 "여기까지 막혀 있다"는 경계선을 만들어 준다.            */
class Awning {
  constructor(x, w) {
    this.x = x;
    this.w = w;
    this.t = 0;
    this.dead = false;
  }
  get right() { return this.x + this.w; }

  update(speed) {
    this.x -= speed;
    this.t += 1;
    if (this.right < -10) this.dead = true;
  }

  hitbox() { return { x: this.x + 2, y: 0, w: this.w - 4, h: AWNING_BOTTOM }; }

  draw(ctx) {
    const x0 = Math.round(this.x), w = this.w;
    const CANOPY = 34, RAIL = AWNING_BOTTOM - 8;

    /* 지지 파이프 */
    ctx.fillStyle = '#39344c'; ctx.fillRect(x0 - 3, 0, w + 6, 5);
    ctx.fillStyle = '#5b5478'; ctx.fillRect(x0 - 3, 0, w + 6, 1);

    /* 비닐 커튼 — 살짝 흔들린다 */
    for (let i = 3; i < w - 4; i += 8) {
      const sway = Math.sin(this.t * 0.055 + i * 0.6) * 1.3;
      const x = Math.round(x0 + i + sway);
      ctx.globalAlpha = 0.62;
      ctx.fillStyle = '#cfe6f5'; ctx.fillRect(x, CANOPY - 4, 5, RAIL - CANOPY + 6);
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = '#f2fbff'; ctx.fillRect(x, CANOPY - 4, 1, RAIL - CANOPY + 6);
      ctx.fillStyle = '#8ea9bd'; ctx.fillRect(x + 4, CANOPY - 4, 1, RAIL - CANOPY + 6);
      ctx.globalAlpha = 1;
    }

    /* 캐노피 — 빨강/크림 세로 줄무늬 + 지그재그 밑단 */
    for (let i = 0; i < w; i++) {
      const x = x0 + i;
      const stripe = (((i / 7) | 0) % 2) === 0;
      const bot = CANOPY - Math.abs(3 - (i % 7));
      ctx.fillStyle = stripe ? C.red : C.cream;
      ctx.fillRect(x, 4, 1, bot - 4);
      ctx.fillStyle = stripe ? C.redDark : '#cec3a6';
      ctx.fillRect(x, bot - 2, 1, 2);
    }

    /* 아래 레일 — 통과 가능 높이의 경계 */
    ctx.fillStyle = '#2c4a3f'; ctx.fillRect(x0, RAIL, w, 8);
    ctx.fillStyle = '#4d7d68'; ctx.fillRect(x0, RAIL, w, 2);
    ctx.fillStyle = C.ink;     ctx.fillRect(x0, AWNING_BOTTOM - 2, w, 2);
    for (let i = 2; i < w - 2; i += 6) {
      ctx.fillStyle = '#1d3630'; ctx.fillRect(x0 + i, RAIL + 3, 3, 2);
    }
    /* 옆 기둥 */
    ctx.fillStyle = C.ink;
    ctx.fillRect(x0 - 1, 4, 1, RAIL + 8 - 4);
    ctx.fillRect(x0 + w, 4, 1, RAIL + 8 - 4);
  }
}

/* ── 아이템 ───────────────────────────────── */
class Item {
  constructor(kind, cx, cy) {
    this.kind = kind;
    this.def = ITEMS[kind];
    this.im = Assets.get(this.def.sprite);
    this.cx = cx; this.cy = cy;
    this.bob = Math.random() * Math.PI * 2;
    this.dead = false;
    this.taken = false;
  }
  get right() { return this.cx + this.def.w / 2; }

  update(speed, player, magnet) {
    this.cx -= speed;
    this.bob += 0.12;
    if (magnet) {
      const dx = PLAYER_X - this.cx, dy = (player.y - 16) - this.cy;
      const d = Math.hypot(dx, dy);
      if (d < MAGNET_R) {
        const k = 0.16 + (1 - d / MAGNET_R) * 0.34;
        this.cx += dx * k; this.cy += dy * k;
      }
    }
    if (this.right < -12) this.dead = true;
  }

  hitbox() {
    const p = this.def.pick;
    return { x: this.cx - this.def.w / 2 - p, y: this.cy - this.def.h / 2 - p,
             w: this.def.w + p * 2, h: this.def.h + p * 2 };
  }

  draw(ctx) {
    const dy = Math.sin(this.bob) * 1.6;
    if (this.kind === 'goldbaechu') {
      ctx.globalAlpha = 0.30 + Math.sin(this.bob * 1.7) * 0.14;
      ctx.fillStyle = C.gold;
      ctx.beginPath();
      ctx.arc(this.cx, this.cy + dy, 16 + Math.sin(this.bob * 2) * 2, 0, Math.PI * 2);
      ctx.fill(); ctx.globalAlpha = 1;
    }
    ctx.drawImage(this.im, Math.round(this.cx - this.def.w / 2), Math.round(this.cy - this.def.h / 2 + dy));
  }
}

/* ── 이펙트 (먼지 / 반짝임 / 링 / 점수 팝업) ── */
class Fx {
  constructor() { this.p = []; this.pop = []; this.shake = 0; }
  reset() { this.p.length = 0; this.pop.length = 0; this.shake = 0; }

  dust(x, y, n) {
    for (let i = 0; i < n; i++)
      this.p.push({ t: 'd', x: x + rnd(-5, 5), y: y - rnd(0, 3),
        vx: rnd(-1.5, -0.2), vy: rnd(-1.1, -0.1), life: irnd(12, 22), age: 0, s: irnd(1, 2) });
  }
  sparkle(x, y, n, color) {
    for (let i = 0; i < n; i++)
      this.p.push({ t: 's', x, y, vx: rnd(-1.7, 1.7), vy: rnd(-2.2, -0.2),
        life: irnd(14, 26), age: 0, s: 1, c: color || C.gold });
  }
  ring(x, y) { this.p.push({ t: 'r', x, y, r: 3, life: 16, age: 0 }); }
  popup(x, y, text, color) { this.pop.push({ x, y, text, color: color || C.cream, age: 0, life: 42 }); }
  kick(n) { this.shake = Math.max(this.shake, n); }

  update() {
    for (const q of this.p) {
      q.age++;
      if (q.t === 'r') { q.r += 2.1; continue; }
      q.x += q.vx; q.y += q.vy;
      q.vy += q.t === 'd' ? 0.06 : 0.10;
      q.vx *= 0.96;
    }
    this.p = this.p.filter(q => q.age < q.life);
    for (const q of this.pop) { q.age++; q.y -= 0.42; }
    this.pop = this.pop.filter(q => q.age < q.life);
    if (this.shake > 0) this.shake = Math.max(0, this.shake - 0.55);
  }

  draw(ctx) {
    for (const q of this.p) {
      const k = 1 - q.age / q.life;
      if (q.t === 'r') {
        ctx.globalAlpha = k * 0.8; ctx.strokeStyle = C.cream; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2); ctx.stroke();
      } else if (q.t === 'd') {
        ctx.globalAlpha = k * 0.55; ctx.fillStyle = '#b9b3c8';
        ctx.fillRect(Math.round(q.x), Math.round(q.y), q.s, q.s);
      } else {
        ctx.globalAlpha = k; ctx.fillStyle = q.c;
        ctx.fillRect(Math.round(q.x), Math.round(q.y), q.s, q.s);
      }
    }
    ctx.globalAlpha = 1;
    for (const q of this.pop) {
      const k = 1 - q.age / q.life;
      ctx.globalAlpha = Math.min(1, k * 2.2);
      PixelFont.draw(ctx, q.text, q.x, q.y, { color: q.color, align: 'center', outline: C.ink });
      ctx.globalAlpha = 1;
    }
  }
}

/* ── 패턴 스포너 ──────────────────────────── */
const PATTERNS = [
  /* 아이템만 — 준비운동 */
  { id: 'line_low', from: 0, w: 12, len: 76, build: (x, o, i) => {
      for (let k = 0; k < 4; k++) i.push(new Item('baechu', x + k * 20, LANE.low));
    } },
  { id: 'arc', from: 0, w: 12, len: 96, build: (x, o, i) => {
      const ys = [LANE.low, LANE.mid, LANE.high, LANE.mid, LANE.low];
      ys.forEach((y, k) => i.push(new Item('baechu', x + k * 22, y)));
    } },
  { id: 'garlic_v', from: 350, w: 8, len: 80, build: (x, o, i) => {
      [LANE.mid, LANE.high, LANE.mid].forEach((y, k) => i.push(new Item('garlic', x + k * 26, y)));
    } },

  /* 점프 — 할머니 */
  { id: 'halmoni', from: 240, w: 16, len: 26, build: (x, o, i) => {
      o.push(new Obstacle('halmoni', x));
      i.push(new Item('baechu', x + 13, LANE.high));
    } },
  { id: 'halmoni_2', from: 1400, w: 10, len: 74, build: (x, o, i) => {
      o.push(new Obstacle('halmoni', x));
      o.push(new Obstacle('halmoni', x + 48));
      i.push(new Item('gochu', x + 30, LANE.high));
    } },

  /* 점프 — 배달 스쿠터 */
  { id: 'scooter', from: 700, w: 14, len: 40, build: (x, o, i) => {
      o.push(new Obstacle('delivery', x));
      i.push(new Item('garlic', x + 20, LANE.high));
    } },
  { id: 'scooter_2', from: 2600, w: 8, len: 106, build: (x, o, i) => {
      o.push(new Obstacle('delivery', x));
      o.push(new Obstacle('delivery', x + 66));
      i.push(new Item('gochu', x + 33, LANE.sky));
    } },

  /* 슬라이드 — 시장 천막 */
  { id: 'awning', from: 1000, w: 14, len: 62, build: (x, o, i) => {
      const w = irnd(52, 74);
      o.push(new Awning(x, w));
      for (let k = 0; k * 20 < w; k++) i.push(new Item('baechu', x + 10 + k * 20, LANE.slide));
    } },
  { id: 'awning_wide', from: 3200, w: 8, len: 96, build: (x, o, i) => {
      const w = irnd(92, 112);
      o.push(new Awning(x, w));
      for (let k = 0; k * 22 < w - 8; k++) i.push(new Item('garlic', x + 12 + k * 22, LANE.slide));
    } },

  /* 조합 */
  { id: 'halmoni_awning', from: 2200, w: 10, len: 210, build: (x, o, i) => {
      o.push(new Obstacle('halmoni', x));
      i.push(new Item('baechu', x + 13, LANE.high));
      o.push(new Awning(x + 150, 58));
      i.push(new Item('baechu', x + 170, LANE.slide));
    } },
  { id: 'scooter_awning', from: 4200, w: 8, len: 226, build: (x, o, i) => {
      o.push(new Obstacle('delivery', x));
      i.push(new Item('gochu', x + 20, LANE.high));
      o.push(new Awning(x + 168, 62));
      i.push(new Item('garlic', x + 190, LANE.slide));
    } },
  { id: 'sky_line', from: 1800, w: 9, len: 92, build: (x, o, i) => {
      for (let k = 0; k < 4; k++) i.push(new Item('gochu', x + k * 24, LANE.sky));
      o.push(new Obstacle('halmoni', x + 36));
    } },

  /* 황금 배추 */
  { id: 'gold', from: 1200, w: 3, gold: true, len: 120, build: (x, o, i) => {
      [LANE.low, LANE.mid, LANE.high].forEach((y, k) => i.push(new Item('baechu', x + k * 20, y)));
      i.push(new Item('goldbaechu', x + 82, LANE.sky));
    } },
];

class Spawner {
  reset() {
    this.gap = 120;
    this.lastGold = -9999;
    this.lastId = '';
  }

  update(speed, dist, obstacles, items) {
    this.gap -= speed;
    if (this.gap > 0) return;

    const pool = PATTERNS.filter(p =>
      dist >= p.from &&
      p.id !== this.lastId &&
      (!p.gold || dist - this.lastGold > 2400));

    /* 가중 추첨 */
    let total = 0;
    for (const p of pool) total += p.w;
    let r = Math.random() * total, chosen = pool[pool.length - 1];
    for (const p of pool) { r -= p.w; if (r <= 0) { chosen = p; break; } }

    const x = VIEW_W + 10;
    chosen.build(x, obstacles, items);
    this.lastId = chosen.id;
    if (chosen.gold) this.lastGold = dist;

    /* 다음 간격 — 속도에 비례해 늘려서 반응시간을 지킨다 */
    const scale = speed / SPEED_BASE;
    const tight = dist > 7000 ? 0.88 : 1;
    this.gap = chosen.len + rnd(104, 200) * scale * tight;
  }
}

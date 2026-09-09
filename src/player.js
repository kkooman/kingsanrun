/* ============================================================
   플레이어 — 달리기 / 점프 / 2단 점프(회전) / 슬라이드 / 피격
   ============================================================ */
'use strict';

const SLIDE_SRC_H = 28;      // 슬라이드에 쓸 소스 높이(발바닥 기준 위로)
const SLIDE_DST_W = 38;
const SLIDE_DST_H = 17;

class Player {
  constructor(skin) {
    this.setSkin(skin);
    this.reset();
  }

  setSkin(skin) {
    this.skin = skin;
    this.runIm = Assets.get(skin.run);
    this.jumpIm = Assets.get(skin.jump);
  }

  reset() {
    this.y = FEET_Y;
    this.vy = 0;
    this.onGround = true;
    this.jumps = 0;             // 사용한 점프 횟수
    this.anim = 0;              // 달리기 애니메이션 누적
    this.takeoff = 0;
    this.landT = 0;
    this.spin = 0;
    this.sliding = false;
    this.slideT = 0;
    this.coyote = COYOTE;
    this.buffer = 0;
    this.hurtT = 0;
    this.hp = MAX_HP;
    this.dead = false;
  }

  get invincible() { return this.hurtT > 0; }

  /* ── 한 프레임 ─────────────────────────── */
  update(speed, fx) {
    if (this.hurtT > 0) this.hurtT--;

    /* 입력 */
    const wantJump = Input.takeJump();
    if (wantJump) this.buffer = JUMP_BUFFER;
    if (this.buffer > 0) this.buffer--;

    const canGround = this.onGround || this.coyote > 0;
    if (this.buffer > 0) {
      if (canGround) this._jump(JUMP_V, false, fx);
      else if (this.jumps < 2) this._jump(JUMP2_V, true, fx);
    }

    /* 점프 컷 (버튼을 짧게 누르면 낮게 뛴다) */
    if (!Input.state.jumpHeld && this.vy < -1.2) this.vy *= (1 - (1 - JUMP_CUT) * 0.34);

    /* 슬라이드 */
    const wantSlide = Input.state.slideHeld;
    if (this.onGround && wantSlide && !this.sliding) {
      this.sliding = true; this.slideT = 0; Sfx.slide();
    }
    if (this.sliding) {
      this.slideT++;
      const forced = this.slideT < SLIDE_MIN;
      if ((!wantSlide && !forced) || this.slideT > SLIDE_MAX || !this.onGround) this.sliding = false;
      else if (this.slideT % 5 === 0) fx.dust(PLAYER_X - 12, this.y, 1);
    }

    /* 물리 */
    if (!this.onGround) {
      this.vy += GRAVITY;
      this.y += this.vy;
      this.coyote = 0;
      if (this.y >= FEET_Y) {
        this.y = FEET_Y; this.vy = 0;
        this.onGround = true; this.jumps = 0;
        this.landT = 9; this.spin = 0;
        fx.dust(PLAYER_X, FEET_Y, 5);
        Sfx.land();
      }
    } else {
      this.coyote = COYOTE;
      if (this.landT > 0) this.landT--;
      if (this.takeoff > 0) this.takeoff--;
      this.anim += speed * 0.52 * RUN_ANIM_RATE;
    }

    if (this.spin > 0) this.spin--;
  }

  _jump(v, isDouble, fx) {
    this.vy = v;
    this.onGround = false;
    this.sliding = false;
    this.buffer = 0;
    this.coyote = 0;
    this.jumps = isDouble ? 2 : 1;
    this.takeoff = isDouble ? 0 : 3;
    this.landT = 0;
    if (isDouble) { this.spin = SPIN_FRAMES; Sfx.jump2(); fx.ring(PLAYER_X, this.y - 14); }
    else { Sfx.jump(); fx.dust(PLAYER_X, FEET_Y, 4); }
  }

  hurt() {
    if (this.invincible) return false;
    this.hp--;
    this.hurtT = HURT_FRAMES;
    this.sliding = false;
    if (this.hp <= 0) this.dead = true;
    return true;
  }

  /* ── 판정 박스 ─────────────────────────── */
  hitbox() {
    const hb = this.sliding ? HB_SLIDE : HB_RUN;
    const cellLeft = PLAYER_X - SKIN_SPEC.runFW / 2;
    const cellTop = this.y - this.skin.runFeet;
    return { x: cellLeft + hb.x, y: cellTop + hb.y, w: hb.w, h: hb.h };
  }

  /* ── 그리기 ────────────────────────────── */
  draw(ctx, opts) {
    opts = opts || {};
    /* 무적 깜빡임 */
    if (this.hurtT > 0 && !opts.noBlink && ((this.hurtT >> 2) & 1)) return;

    /* 그림자 */
    const airFrac = Math.max(0, Math.min(1, (FEET_Y - this.y) / 66));
    ctx.globalAlpha = 0.30 * (1 - airFrac * 0.7);
    ctx.fillStyle = C.ink;
    const sw = 20 - airFrac * 9;
    ctx.beginPath();
    ctx.ellipse(PLAYER_X, FEET_Y + 1, sw / 2, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    if (this.sliding) { this._drawSlide(ctx); return; }
    if (this.onGround) this._drawRun(ctx);
    else this._drawJump(ctx);
  }

  _drawRun(ctx) {
    const S = SKIN_SPEC;
    let f;
    if (this.landT > 4) { this._blitJump(ctx, 4); return; }
    if (this.landT > 0) { this._blitJump(ctx, 5); return; }
    f = (this.anim | 0) % S.runFrames;
    const sx = (f % S.runCols) * S.runFW;
    const sy = ((f / S.runCols) | 0) * S.runFH;
    ctx.drawImage(this.runIm, sx, sy, S.runFW, S.runFH,
      Math.round(PLAYER_X - S.runFW / 2), Math.round(this.y - this.skin.runFeet), S.runFW, S.runFH);
  }

  _drawJump(ctx) {
    let f;
    if (this.takeoff > 0) f = 0;
    else if (this.vy < -2.5) f = 1;
    else if (this.vy < 1.5) f = 2;
    else f = 3;

    if (this.spin > 0) {
      const t = 1 - this.spin / SPIN_FRAMES;
      ctx.save();
      ctx.translate(PLAYER_X, this.y - 16);
      ctx.rotate(t * Math.PI * 2);
      ctx.translate(-PLAYER_X, -(this.y - 16));
      this._blitJump(ctx, 2);
      ctx.restore();
      return;
    }
    this._blitJump(ctx, f);
  }

  _blitJump(ctx, f) {
    const S = SKIN_SPEC;
    ctx.drawImage(this.jumpIm, f * S.jumpFW, 0, S.jumpFW, S.jumpFH,
      Math.round(PLAYER_X - S.jumpFW / 2), Math.round(this.y - this.skin.jumpFeet[f]),
      S.jumpFW, S.jumpFH);
  }

  _drawSlide(ctx) {
    const S = SKIN_SPEC;
    const sf = this.skin.slideFrame;
    const srcY = Math.max(0, this.skin.jumpFeet[sf] + 1 - SLIDE_SRC_H);
    ctx.drawImage(this.jumpIm, sf * S.jumpFW, srcY, S.jumpFW, SLIDE_SRC_H,
      Math.round(PLAYER_X - SLIDE_DST_W / 2 + 2), Math.round(this.y - SLIDE_DST_H + 1),
      SLIDE_DST_W, SLIDE_DST_H);
  }

  /** 타이틀 화면용 제자리 달리기 */
  drawIdle(ctx, t, x) {
    const S = SKIN_SPEC;
    const cx = x == null ? PLAYER_X : x;
    const f = ((t * 0.22 * RUN_ANIM_RATE) | 0) % S.runFrames;
    const sx = (f % S.runCols) * S.runFW;
    const sy = ((f / S.runCols) | 0) * S.runFH;
    ctx.globalAlpha = 0.3; ctx.fillStyle = C.ink;
    ctx.beginPath(); ctx.ellipse(cx, FEET_Y + 1, 10, 2.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.drawImage(this.runIm, sx, sy, S.runFW, S.runFH,
      Math.round(cx - S.runFW / 2), Math.round(FEET_Y - this.skin.runFeet), S.runFW, S.runFH);
  }
}

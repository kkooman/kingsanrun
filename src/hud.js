/* ============================================================
   HUD — 하트 / 점수 / 거리 / 콤보 / 골든 게이지
   ============================================================ */
'use strict';

const Hud = (() => {
  const OUT = C.ink;

  function draw(ctx, g) {
    /* ── 하트 ── */
    for (let i = 0; i < MAX_HP; i++) {
      const im = Assets.get(i < g.player.hp ? 'heart_on' : 'heart_off');
      const pop = (i === g.player.hp && g.player.hurtT > HURT_FRAMES - 14) ? 1 : 0;
      ctx.drawImage(im, 6 + i * 17, 6 - pop);
    }

    /* ── 점수 ── */
    PixelFont.draw(ctx, 'SCORE', VIEW_W - 6, 5, { color: '#cfd6ea', align: 'right', outline: OUT });
    PixelFont.draw(ctx, String(Math.floor(g.score)), VIEW_W - 6, 14,
      { color: C.gold, align: 'right', outline: OUT });

    /* ── 거리 ── */
    PixelFont.draw(ctx, Math.floor(g.dist / 10) + 'M', VIEW_W - 6, 25,
      { color: C.cream, align: 'right', outline: OUT });

    /* ── 콤보 ── */
    if (g.combo >= 3) {
      const wob = Math.sin(g.frame * 0.28) * 0.6;
      PixelFont.draw(ctx, 'COMBO ' + g.combo, 6, 24 + wob,
        { color: g.combo >= 20 ? C.gold : C.cream, outline: OUT });
      if (g.mult > 1)
        PixelFont.draw(ctx, 'X' + g.mult.toFixed(1), 6, 33, { color: C.red, outline: OUT });
    }

    /* ── 골든 러시 게이지 ── */
    if (g.goldT > 0) {
      const k = g.goldT / GOLD_FRAMES;
      const x = 6, y = 44, w = 62, h = 5;
      ctx.fillStyle = OUT; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
      ctx.fillStyle = '#4a3a12'; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = C.gold; ctx.fillRect(x, y, Math.round(w * k), h);
      ctx.fillStyle = '#fff3c0'; ctx.fillRect(x, y, Math.round(w * k), 1);
      PixelFont.draw(ctx, 'GOLDEN RUSH', x, y - 9, { color: C.gold, outline: OUT });
    }

    /* ── 시작 직후 안내 ── */
    if (g.frame < 100) {
      const a = g.frame < 70 ? 1 : 1 - (g.frame - 70) / 30;
      ctx.globalAlpha = a;
      PixelFont.draw(ctx, 'GO!', VIEW_W / 2, 62,
        { color: C.gold, align: 'center', outline: OUT });
      ctx.globalAlpha = 1;
    }
  }

  return { draw };
})();

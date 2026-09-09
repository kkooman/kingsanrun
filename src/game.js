/* ============================================================
   메인 루프 / 상태 관리 / DOM 연결
   ============================================================ */
'use strict';

(() => {
  const STEP = 1000 / 60;
  const S = { LOADING: 0, TITLE: 1, PLAYING: 2, PAUSED: 3, OVER: 4 };

  const $ = id => document.getElementById(id);
  const el = {
    stage: $('stage'), canvas: $('game'),
    loading: $('scr-loading'), loadFill: $('load-fill'),
    title: $('scr-title'), logo: $('logo'), start: $('btn-start'),
    skinRow: $('skin-row'), skinName: $('skin-name'),
    skinPrev: $('skin-prev'), skinNext: $('skin-next'),
    pause: $('scr-pause'),
    over: $('scr-over'), overTitle: $('over-title'), retry: $('btn-retry'),
    stScore: $('st-score'), stDist: $('st-dist'), stCombo: $('st-combo'),
    stItems: $('st-items'), stBest: $('st-best'),
    pad: $('pad'), tools: $('tools'),
    btnPause: $('btn-pause'), btnMusic: $('btn-music'), btnFull: $('btn-full'),
  };

  const ctx = el.canvas.getContext('2d', { alpha: false });
  ctx.imageSmoothingEnabled = false;

  /* ── 게임 상태 ─────────────────────────── */
  const g = {
    state: S.LOADING,
    frame: 0, titleT: 0,
    dist: 0, score: 0,
    combo: 0, maxCombo: 0, mult: 1,
    items: 0,
    goldT: 0,
    speed: SPEED_BASE,
    player: null,
    bg: new Background(),
    fx: new Fx(),
    spawner: new Spawner(),
    obstacles: [], pickups: [],
    skinIdx: 0,
    flash: 0,
    overReady: false,
    playing: false,
  };

  const best = {
    get() { try { return +(localStorage.getItem('kingsan.best') || 0); } catch (e) { return 0; } },
    set(v) { try { localStorage.setItem('kingsan.best', String(v)); } catch (e) {} },
  };

  /* ── 화면 배율 / 조작 패드 배치 ──────────
     세로 화면처럼 아래에 여유가 있으면 패드를 무대 밖에 붙이고(docked),
     가로 화면처럼 화면이 꽉 차면 무대 위에 반투명으로 겹친다(overlay). */
  const PAD_DOCK_MIN = 84;      // 도킹에 필요한 최소 여유 높이(px)
  const PAD_DOCK_MAX = 210;

  function resize() {
    const touch = Input.isTouch();
    const margin = (!touch && innerWidth >= 480) ? 16 : 0;
    let s = Math.min((innerWidth - margin) / VIEW_W, (innerHeight - margin) / VIEW_H);
    /* 데스크톱은 정수 배율로 선명하게, 모바일은 화면을 꽉 채우는 쪽을 택한다 */
    if (!touch && s >= 1) s = Math.floor(s);
    s = Math.max(0.4, s);

    let docked = false;
    if (touch) {
      const leftover = innerHeight - VIEW_H * s;
      docked = leftover >= PAD_DOCK_MIN;
      if (docked) {
        const h = Math.min(leftover - 4, PAD_DOCK_MAX);
        document.documentElement.style.setProperty('--pad-h', h + 'px');
      }
    }
    document.documentElement.style.setProperty('--s', String(s));
    document.body.classList.toggle('docked', docked);
    document.body.classList.toggle('overlay', touch && !docked);
  }
  addEventListener('resize', resize);
  addEventListener('orientationchange', () => setTimeout(resize, 120));

  /* ── 스킨 ──────────────────────────────── */
  function applySkin() {
    const sk = SKINS[g.skinIdx];
    if (!g.player) g.player = new Player(sk);
    else g.player.setSkin(sk);
    el.skinName.textContent = sk.name;
    el.skinRow.hidden = SKINS.length < 2;
    try { localStorage.setItem('kingsan.skin', sk.id); } catch (e) {}
  }
  function cycleSkin(d) {
    g.skinIdx = (g.skinIdx + d + SKINS.length) % SKINS.length;
    applySkin(); Sfx.ui();
  }

  /* ── 상태 전환 ─────────────────────────── */
  function show(state) {
    g.state = state;
    g.playing = state === S.PLAYING;
    if (el.btnPause) el.btnPause.textContent = state === S.PAUSED ? '▶' : '❚❚';
    el.loading.hidden = state !== S.LOADING;
    el.title.hidden   = state !== S.TITLE;
    el.pause.hidden   = state !== S.PAUSED;
    el.over.hidden    = state !== S.OVER;
    Input.clear();
  }

  function toTitle() {
    g.bg.reset(); g.fx.reset();
    g.obstacles.length = 0; g.pickups.length = 0;
    g.titleT = 0;
    show(S.TITLE);
  }

  function startRun() {
    g.frame = 0; g.dist = 0; g.score = 0;
    g.combo = 0; g.maxCombo = 0; g.mult = 1; g.items = 0;
    g.goldT = 0; g.speed = SPEED_BASE; g.flash = 0;
    g.obstacles.length = 0; g.pickups.length = 0;
    g.bg.reset(); g.fx.reset(); g.spawner.reset();
    g.player.reset();
    Sfx.init(); Sfx.startMusic();
    show(S.PLAYING);
  }

  function gameOver() {
    Sfx.over();
    const sc = Math.floor(g.score);
    const b = best.get();
    const record = sc > b;
    if (record) best.set(sc);
    el.overTitle.textContent = record ? '신기록!' : '배추를 놓쳤다!';
    el.stScore.textContent = sc.toLocaleString('ko-KR');
    el.stDist.textContent = Math.floor(g.dist / 10).toLocaleString('ko-KR') + ' m';
    el.stCombo.textContent = g.maxCombo;
    el.stItems.textContent = g.items + '개';
    el.stBest.textContent = '최고 기록 ' + Math.max(sc, b).toLocaleString('ko-KR');
    show(S.OVER);
    g.overReady = false;                      // 0.5초 동안 재시작 입력 무시
    setTimeout(() => { g.overReady = true; }, 500);
  }

  /* ── 입력 배선 ─────────────────────────── */
  Input.bind(el.stage);
  Input.onAction(() => {
    Sfx.init();
    if (g.state === S.TITLE) startRun();
    else if (g.state === S.OVER && g.overReady) startRun();
    else if (g.state === S.PAUSED) show(S.PLAYING);
  });
  Input.onKey(code => {
    if (code === 'KeyP' || code === 'Escape') {
      if (g.state === S.PLAYING) show(S.PAUSED);
      else if (g.state === S.PAUSED) show(S.PLAYING);
    } else if (code === 'KeyR') {
      if (g.state === S.OVER || g.state === S.PAUSED) startRun();
    } else if (code === 'KeyM') {
      Sfx.init(); Sfx.toggleMusic(); Sfx.startMusic();
    } else if (code === 'ArrowLeft' && g.state === S.TITLE) cycleSkin(-1);
    else if (code === 'ArrowRight' && g.state === S.TITLE) cycleSkin(1);
  });
  el.skinPrev.addEventListener('pointerdown', e => { e.stopPropagation(); cycleSkin(-1); });
  el.skinNext.addEventListener('pointerdown', e => { e.stopPropagation(); cycleSkin(1); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && g.state === S.PLAYING) show(S.PAUSED);
  });

  /* ── 상단 도구 버튼 (일시정지 / 음악 / 전체화면) ── */
  function tool(btn, fn) {
    if (!btn) return;
    btn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); fn(); });
    btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); });
  }
  tool(el.btnPause, () => {
    Sfx.init(); Sfx.ui();
    if (g.state === S.PLAYING) show(S.PAUSED);
    else if (g.state === S.PAUSED) show(S.PLAYING);
  });
  tool(el.btnMusic, () => {
    Sfx.init();
    const on = Sfx.toggleMusic();
    Sfx.startMusic();
    el.btnMusic.classList.toggle('off', !on);
  });

  const canFullscreen = !!document.documentElement.requestFullscreen;
  if (!canFullscreen) el.btnFull.hidden = true;
  tool(el.btnFull, () => {
    Sfx.ui();
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
  });
  addEventListener('fullscreenchange', () => setTimeout(resize, 80));

  /* ── 한 프레임 시뮬레이션 ──────────────── */
  function step() {
    g.frame++;

    /* 속도 / 골든 러시 */
    const base = Math.min(SPEED_MAX, SPEED_BASE + g.dist * SPEED_RAMP);
    if (g.goldT > 0) g.goldT--;
    g.speed = base * (g.goldT > 0 ? GOLD_SPEEDUP : 1);
    g.dist += g.speed;

    /* 배수 */
    g.mult = Math.min(4, 1 + Math.floor(g.combo / 8) * 0.5) * (g.goldT > 0 ? 2 : 1);
    g.score += g.speed * 0.09 * g.mult;

    g.bg.update(g.speed);
    g.player.update(g.speed, g.fx);
    g.spawner.update(g.speed, g.dist, g.obstacles, g.pickups);

    const pbox = g.player.hitbox();
    const invincible = g.player.invincible || g.goldT > 0;

    /* 장애물 */
    for (const o of g.obstacles) {
      o.update(g.speed);
      if (o.dead || o.cleared) continue;
      if (!aabb(pbox, o.hitbox())) continue;
      if (g.goldT > 0) {
        o.cleared = true; o.dead = true;
        g.score += 60 * g.mult;
        g.fx.sparkle(o.x + 12, FEET_Y - 18, 14, C.gold);
        g.fx.popup(o.x + 12, FEET_Y - 40, '+' + Math.round(60 * g.mult), C.gold);
        g.fx.kick(3); Sfx.coin(7);
      } else if (!g.player.invincible) {
        o.cleared = true;
        g.player.hurt();
        g.combo = 0;
        g.flash = 8;
        g.fx.kick(6);
        g.fx.sparkle(PLAYER_X, g.player.y - 16, 12, C.red);
        Sfx.hit();
        if (g.player.dead) { gameOver(); return; }
      }
    }
    g.obstacles = g.obstacles.filter(o => !o.dead);

    /* 아이템 */
    for (const it of g.pickups) {
      it.update(g.speed, g.player, g.goldT > 0);
      if (it.dead || it.taken) continue;
      if (!aabb(pbox, it.hitbox())) continue;
      it.taken = true; it.dead = true;
      g.items++;
      if (it.kind === 'goldbaechu') {
        g.goldT = GOLD_FRAMES;
        g.score += it.def.score * g.mult;
        g.fx.sparkle(it.cx, it.cy, 26, C.gold);
        g.fx.popup(it.cx, it.cy - 12, 'GOLDEN!', C.gold);
        g.fx.kick(4);
        Sfx.gold();
      } else {
        g.combo++;
        g.maxCombo = Math.max(g.maxCombo, g.combo);
        const gain = it.def.score * g.mult;
        g.score += gain;
        g.fx.sparkle(it.cx, it.cy, 6, it.kind === 'gochu' ? C.red : C.cream);
        if (g.combo % 5 === 0) g.fx.popup(it.cx, it.cy - 10, '+' + Math.round(gain), C.gold);
        Sfx.coin(Math.min(7, (g.combo - 1) % 8));
      }
    }
    g.pickups = g.pickups.filter(it => !it.dead);

    g.fx.update();
    if (g.flash > 0) g.flash--;
  }

  /* ── 그리기 ────────────────────────────── */
  function render() {
    ctx.save();
    const sh = g.fx.shake;
    if (sh > 0.4) ctx.translate((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh);

    g.bg.draw(ctx, g.state === S.PLAYING || g.state === S.PAUSED ? 0.22 : 0.10);

    if (g.state === S.TITLE) {
      g.player.drawIdle(ctx, g.titleT, TITLE_X);
      ctx.restore();
      return;
    }

    /* 아이템은 장애물 뒤 */
    for (const it of g.pickups) it.draw(ctx);
    for (const o of g.obstacles) if (!(o instanceof Awning)) o.draw(ctx);
    g.player.draw(ctx, { noBlink: g.state !== S.PLAYING });
    for (const o of g.obstacles) if (o instanceof Awning) o.draw(ctx);
    g.fx.draw(ctx);

    /* 골든 러시 비네트 */
    if (g.goldT > 0) {
      const pulse = 0.05 + Math.sin(g.frame * 0.2) * 0.025;
      ctx.globalAlpha = pulse; ctx.fillStyle = C.gold;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.globalAlpha = 1;
    }
    /* 피격 플래시 */
    if (g.flash > 0) {
      ctx.globalAlpha = g.flash / 14; ctx.fillStyle = C.red;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H); ctx.globalAlpha = 1;
    }

    ctx.restore();
    Hud.draw(ctx, g);
  }

  /** 상태에 맞는 1프레임 갱신 */
  function tick() {
    if (g.state === S.PLAYING) step();
    else if (g.state === S.TITLE) { g.titleT++; g.bg.update(SPEED_BASE * 0.5); }
    else if (g.state === S.OVER) { g.fx.update(); if (g.flash > 0) g.flash--; }
  }

  /* ── 루프 ──────────────────────────────── */
  let acc = 0, last = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    if (!last) last = now;
    let dt = now - last; last = now;
    if (dt > 250) dt = STEP;          // 탭 복귀 시 폭주 방지
    acc += dt;

    let guard = 6;
    while (acc >= STEP && guard-- > 0) { acc -= STEP; tick(); }
    if (acc > STEP * 6) acc = 0;

    if (g.state !== S.LOADING) render();
  }

  /* ── 디버그 훅 ─────────────────────────
     탭이 백그라운드면 requestAnimationFrame 이 멈추므로
     콘솔에서 프레임을 직접 돌려볼 수 있게 열어 둔다. */
  window.KingsanRun = {
    get g() { return g; },
    S,
    advance(n) {
      for (let i = 0; i < (n || 1); i++) tick();
      render();
      return { frame: g.frame, dist: Math.round(g.dist), score: Math.floor(g.score),
               hp: g.player.hp, combo: g.combo, state: g.state };
    },
    start: startRun,
    title: toTitle,
    setSkin(i) { g.skinIdx = ((i % SKINS.length) + SKINS.length) % SKINS.length; applySkin(); },
    skins: () => SKINS.map(s => s.id),
  };

  /* ── 부트 ──────────────────────────────── */
  resize();
  Assets.loadAll(p => { el.loadFill.style.width = Math.round(p * 100) + '%'; })
    .then(() => {
      el.logo.src = Assets.get('title').src;
      el.start.src = el.retry.src = Assets.get('start_button').src;
      const root = document.documentElement.style;
      root.setProperty('--logo-w', String(Assets.get('title').naturalWidth));
      root.setProperty('--btn-w', String(Assets.get('start_button').naturalWidth));

      let saved = null;
      try { saved = localStorage.getItem('kingsan.skin'); } catch (e) {}
      const i = SKINS.findIndex(s => s.id === saved);
      g.skinIdx = i >= 0 ? i : 0;
      applySkin();

      el.stBest.textContent = '최고 기록 ' + best.get().toLocaleString('ko-KR');
      el.btnMusic.classList.toggle('off', !Sfx.isMusicOn());
      resize();
      toTitle();
      requestAnimationFrame(frame);
    });

})();

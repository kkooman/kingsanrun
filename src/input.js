/* ============================================================
   입력 — 키보드 / 마우스 / 터치
   터치는 화면 아무 곳이나 눌러 점프, 전용 버튼으로 점프·슬라이드.
   ============================================================ */
'use strict';

const Input = (() => {
  const state = { jumpHeld: false, slideHeld: false };
  let jumpEdge = false;                 // 이번 프레임에 새로 눌렸는가
  const listeners = { action: [], key: [] };

  const JUMP_KEYS  = ['Space', 'ArrowUp', 'KeyW', 'KeyZ', 'Enter'];
  const SLIDE_KEYS = ['ArrowDown', 'KeyS', 'ShiftLeft', 'ShiftRight'];

  /* 어떤 포인터가 어느 조작을 누르고 있는지 — 멀티터치 지원 */
  const held = { jump: new Set(), slide: new Set() };

  function emitAction() { listeners.action.forEach(f => f()); }

  function press(which, id) {
    const set = held[which];
    if (set.has(id)) return;
    set.add(id);
    if (which === 'jump') { state.jumpHeld = true; jumpEdge = true; }
    else state.slideHeld = true;
    emitAction();
  }

  function release(which, id) {
    const set = held[which];
    if (!set.delete(id)) return;
    if (set.size) return;
    if (which === 'jump') state.jumpHeld = false;
    else state.slideHeld = false;
  }

  /** 요소를 "누르고 있는 동안 유지"되는 버튼으로 만든다 */
  function bindHold(el, which) {
    if (!el) return;
    const down = ev => {
      ev.preventDefault();
      ev.stopPropagation();
      el.classList.add('on');
      try { el.setPointerCapture(ev.pointerId); } catch (e) {}
      press(which, ev.pointerId);
    };
    const up = ev => {
      ev.stopPropagation();
      el.classList.remove('on');
      release(which, ev.pointerId);
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('lostpointercapture', up);
    /* 마우스 클릭이 두 번 발동하지 않게 */
    el.addEventListener('click', ev => { ev.preventDefault(); ev.stopPropagation(); });
  }

  function bind(stage) {
    /* ── 키보드 ── */
    addEventListener('keydown', e => {
      if (e.repeat) { if (JUMP_KEYS.includes(e.code)) e.preventDefault(); return; }
      if (JUMP_KEYS.includes(e.code)) { e.preventDefault(); press('jump', 'kb'); }
      else if (SLIDE_KEYS.includes(e.code)) { e.preventDefault(); press('slide', 'kb'); }
      else listeners.key.forEach(f => f(e.code));
    });
    addEventListener('keyup', e => {
      if (JUMP_KEYS.includes(e.code)) release('jump', 'kb');
      if (SLIDE_KEYS.includes(e.code)) release('slide', 'kb');
    });
    addEventListener('blur', clear);

    /* ── 무대를 직접 누르면 점프 (슬라이드는 전용 버튼) ── */
    stage.addEventListener('pointerdown', ev => {
      ev.preventDefault();
      if (ev.pointerType === 'touch') showPad();
      try { stage.setPointerCapture(ev.pointerId); } catch (e) {}
      press('jump', ev.pointerId);
    });
    const off = ev => release('jump', ev.pointerId);
    stage.addEventListener('pointerup', off);
    stage.addEventListener('pointercancel', off);
    stage.addEventListener('lostpointercapture', off);
    stage.addEventListener('contextmenu', e => e.preventDefault());

    /* ── 조작 패드 ── */
    bindHold(document.getElementById('btn-jump'), 'jump');
    bindHold(document.getElementById('btn-slide'), 'slide');

    if (matchMedia('(hover: none) and (pointer: coarse)').matches) showPad();
    if (/[?&]pad=1/.test(location.search)) showPad();
  }

  /** 터치 기기로 판단되면 패드와 도구 버튼을 띄운다 */
  function showPad() {
    if (document.body.classList.contains('touch')) return;
    document.body.classList.add('touch');
    document.getElementById('pad').hidden = false;
    document.getElementById('tools').hidden = false;
    document.getElementById('rotate-hint').hidden = false;
    dispatchEvent(new Event('resize'));
  }

  function clear() {
    jumpEdge = false;
    held.jump.clear(); held.slide.clear();
    state.jumpHeld = state.slideHeld = false;
    document.querySelectorAll('.pad-btn.on').forEach(b => b.classList.remove('on'));
  }

  return {
    bind, bindHold, showPad, state, clear,
    /** 프레임당 한 번만 true — 점프 트리거용 */
    takeJump() { const j = jumpEdge; jumpEdge = false; return j; },
    onAction(f) { listeners.action.push(f); },
    onKey(f) { listeners.key.push(f); },
    isTouch: () => document.body.classList.contains('touch'),
  };
})();

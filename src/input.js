/* ============================================================
   입력 — 키보드 + 마우스 + 터치(상단 점프 / 하단 슬라이드)
   ============================================================ */
'use strict';

const Input = (() => {
  const state = { jumpHeld: false, slideHeld: false };
  let jumpEdge = false;                 // 이번 프레임에 새로 눌렸는가
  const listeners = { action: [], key: [] };

  const JUMP_KEYS  = ['Space', 'ArrowUp', 'KeyW', 'KeyZ', 'Enter'];
  const SLIDE_KEYS = ['ArrowDown', 'KeyS', 'ShiftLeft', 'ShiftRight'];

  function emitAction() { listeners.action.forEach(f => f()); }

  function bind(stage) {
    /* ── 키보드 ── */
    addEventListener('keydown', e => {
      if (e.repeat) { if (JUMP_KEYS.includes(e.code)) e.preventDefault(); return; }
      if (JUMP_KEYS.includes(e.code)) {
        e.preventDefault(); state.jumpHeld = true; jumpEdge = true; emitAction();
      } else if (SLIDE_KEYS.includes(e.code)) {
        e.preventDefault(); state.slideHeld = true; emitAction();
      } else {
        listeners.key.forEach(f => f(e.code));
      }
    });
    addEventListener('keyup', e => {
      if (JUMP_KEYS.includes(e.code)) state.jumpHeld = false;
      if (SLIDE_KEYS.includes(e.code)) state.slideHeld = false;
    });
    addEventListener('blur', () => { state.jumpHeld = state.slideHeld = false; });

    /* ── 포인터 (마우스 + 터치 공통) ── */
    const zones = new Map();            // pointerId -> 'jump' | 'slide'

    const zoneOf = ev => {
      const r = stage.getBoundingClientRect();
      return (ev.clientY - r.top) / r.height > 0.64 ? 'slide' : 'jump';
    };

    stage.addEventListener('pointerdown', ev => {
      if (ev.pointerType === 'touch') document.getElementById('touch').hidden = false;
      const z = zoneOf(ev);
      zones.set(ev.pointerId, z);
      if (z === 'jump') { state.jumpHeld = true; jumpEdge = true; }
      else state.slideHeld = true;
      emitAction();
      ev.preventDefault();
    });

    const release = ev => {
      const z = zones.get(ev.pointerId);
      zones.delete(ev.pointerId);
      if (z === 'jump' && ![...zones.values()].includes('jump')) state.jumpHeld = false;
      if (z === 'slide' && ![...zones.values()].includes('slide')) state.slideHeld = false;
    };
    stage.addEventListener('pointerup', release);
    stage.addEventListener('pointercancel', release);
    stage.addEventListener('pointerleave', release);
    stage.addEventListener('contextmenu', e => e.preventDefault());

    if (matchMedia('(hover: none) and (pointer: coarse)').matches) {
      document.getElementById('touch').hidden = false;
    }
  }

  return {
    bind,
    state,
    /** 프레임당 한 번만 true — 점프 트리거용 */
    takeJump() { const j = jumpEdge; jumpEdge = false; return j; },
    clear() { jumpEdge = false; state.jumpHeld = false; state.slideHeld = false; },
    onAction(f) { listeners.action.push(f); },
    onKey(f) { listeners.key.push(f); },
  };
})();

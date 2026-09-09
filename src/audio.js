/* ============================================================
   WebAudio 로 즉석 합성하는 효과음 + 아주 단순한 배경 루프.
   (오디오 에셋이 없으므로 전부 코드로 만든다)
   ============================================================ */
'use strict';

const Sfx = (() => {
  let ac = null, master = null, musicGain = null;
  let musicOn = load('kimchi.music', '1') === '1';
  let musicTimer = null, step = 0;

  function load(k, d) { try { return localStorage.getItem(k) ?? d; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  /** 첫 사용자 입력 시점에 호출 (브라우저 자동재생 정책) */
  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    master = ac.createGain();
    master.gain.value = 0.55;
    master.connect(ac.destination);
    musicGain = ac.createGain();
    musicGain.gain.value = musicOn ? 0.13 : 0;
    musicGain.connect(master);
  }

  function tone(o) {
    if (!ac) return;
    const t0 = ac.currentTime + (o.delay || 0);
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(o.f0, t0);
    if (o.f1 && o.f1 !== o.f0) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t0 + o.dur);
    const peak = o.gain == null ? 0.3 : o.gain;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    osc.connect(g).connect(o.bus || master);
    osc.start(t0);
    osc.stop(t0 + o.dur + 0.02);
  }

  function noise(dur, gain, hp) {
    if (!ac) return;
    const n = Math.floor(ac.sampleRate * dur);
    const buf = ac.createBuffer(1, n, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ac.createBufferSource(); src.buffer = buf;
    const g = ac.createGain(); g.gain.value = gain;
    const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp || 400;
    src.connect(f).connect(g).connect(master);
    src.start();
  }

  /* ── 효과음 ─────────────────────────────── */
  const jump   = () => tone({ f0: 300, f1: 760, dur: 0.14, type: 'square', gain: 0.24 });
  const jump2  = () => { tone({ f0: 520, f1: 1040, dur: 0.13, type: 'square', gain: 0.22 });
                         tone({ f0: 780, f1: 1560, dur: 0.10, type: 'triangle', gain: 0.12, delay: 0.05 }); };
  const slide  = () => noise(0.20, 0.16, 900);
  const land   = () => noise(0.07, 0.10, 260);
  const coin   = (n) => {
    const scale = [880, 988, 1109, 1245, 1319, 1480, 1661, 1760];
    const f = scale[Math.min(scale.length - 1, n | 0)];
    tone({ f0: f, dur: 0.07, type: 'square', gain: 0.16 });
    tone({ f0: f * 1.5, dur: 0.09, type: 'triangle', gain: 0.10, delay: 0.045 });
  };
  const gold   = () => [0, 1, 2, 3, 4].forEach(i =>
    tone({ f0: 660 * Math.pow(2, i / 6), dur: 0.16, type: 'triangle', gain: 0.2, delay: i * 0.055 }));
  const hit    = () => { tone({ f0: 180, f1: 55, dur: 0.28, type: 'sawtooth', gain: 0.3 }); noise(0.16, 0.2, 180); };
  const over   = () => [0, 1, 2, 3].forEach(i =>
    tone({ f0: 520 / Math.pow(2, i / 3.2), dur: 0.28, type: 'square', gain: 0.24, delay: i * 0.14 }));
  const ui     = () => tone({ f0: 620, f1: 880, dur: 0.06, type: 'square', gain: 0.14 });

  /* ── 배경 루프 ──────────────────────────── */
  const BASS = [0, 0, 7, 7, 5, 5, 3, 3];
  const LEAD = [12, 15, 19, 15, 17, 15, 12, 10, 12, 15, 19, 22, 19, 15, 12, 7];
  const hz = s => 110 * Math.pow(2, s / 12);

  function musicTick() {
    if (!ac || !musicOn) return;
    tone({ f0: hz(BASS[step % BASS.length]), dur: 0.20, type: 'triangle', gain: 0.5, bus: musicGain });
    if (step % 2 === 0) tone({ f0: hz(LEAD[(step / 2) % LEAD.length]), dur: 0.16, type: 'square', gain: 0.26, bus: musicGain });
    step++;
  }
  function startMusic() {
    if (musicTimer || !ac) return;
    musicTimer = setInterval(musicTick, 155);
  }
  function stopMusic() { clearInterval(musicTimer); musicTimer = null; }

  function toggleMusic() {
    musicOn = !musicOn;
    save('kimchi.music', musicOn ? '1' : '0');
    if (musicGain) musicGain.gain.value = musicOn ? 0.13 : 0;
    return musicOn;
  }

  return { init, jump, jump2, slide, land, coin, gold, hit, over, ui,
           startMusic, stopMusic, toggleMusic, isMusicOn: () => musicOn };
})();

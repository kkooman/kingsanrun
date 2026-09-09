/* ============================================================
   에셋 로더 — file:// 로 열어도 동작하도록 fetch 를 쓰지 않는다.
   ============================================================ */
'use strict';

const Assets = (() => {
  const img = {};
  let total = 0, done = 0;
  /* http(s) 로 서빙될 때만 캐시 버스터를 붙인다 (file:// 은 쿼리를 못 붙임) */
  const BUST = /^https?:/.test(location.protocol) ? '?v=' + ASSET_VERSION : '';

  const REQUIRED = [
    'sky', 'buildings', 'ground',
    'building_01', 'building_02', 'building_03', 'building_04', 'building_05',
    'player_run', 'player_jump',
    'kid_run', 'kid_jump',
    'halmoni', 'delivery',
    'baechu', 'garlic', 'gochu', 'goldbaechu',
    'heart_on', 'heart_off',
    'title', 'start_button',
  ];

  function one(name, optional) {
    total++;
    return new Promise(resolve => {
      const im = new Image();
      im.onload = () => { img[name] = im; done++; resolve(true); };
      im.onerror = () => {
        done++;
        if (optional) resolve(false);
        else { console.error('에셋 누락: assets/' + name + '.png'); resolve(false); }
      };
      im.src = 'assets/' + name + '.png' + BUST;
    });
  }

  /** 스킨 후보 슬롯을 훑어서 실제로 존재하는 것만 SKINS 에 추가 */
  async function probeSkins() {
    for (const slot of SKIN_SLOTS) {
      if (SKINS.some(s => s.id === slot.id)) continue;
      const runName = slot.id + '_run', jumpName = slot.id + '_jump';
      const [a, b] = await Promise.all([one(runName, true), one(jumpName, true)]);
      if (a && b) {
        SKINS.push({
          id: slot.id, name: slot.name,
          run: runName, jump: jumpName,
          runFeet: SKIN_SPEC.runFH - 1,
          jumpFeet: [62, 44, 53, 63, 63, 63],
          slideFrame: 4,
        });
      }
    }
  }

  async function loadAll(onProgress) {
    const tick = () => onProgress && onProgress(total ? done / total : 1);
    const names = REQUIRED.slice();
    for (const s of SKINS) { if (!names.includes(s.run)) names.push(s.run, s.jump); }

    const jobs = names.map(n => one(n, false).then(r => { tick(); return r; }));
    await Promise.all(jobs);
    await probeSkins();
    tick();
    return img;
  }

  return { img, loadAll, get: n => img[n] };
})();

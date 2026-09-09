/* ============================================================
   KIMCHI-RUN — 설정 / 튜닝값
   원본 해상도 320x180 (에셋 기준). 물리는 60fps 고정 스텝.
   ============================================================ */
'use strict';

const VIEW_W = 320;
const VIEW_H = 180;

const GROUND_TOP = 157;   // ground.png 가 놓이는 y
const FEET_Y     = 159;   // 발이 닿는 y (인도 윗면)
const PLAYER_X   = 62;    // 플레이어 고정 x (스프라이트 중심)

/* ── 스크롤 / 난이도 ─────────────────────── */
const SPEED_BASE  = 2.40;         // px / frame
const SPEED_MAX   = 5.40;
const SPEED_RAMP  = 0.00022;      // 진행 거리 1px 당 가속
const GOLD_SPEEDUP = 1.12;        // 골든 러시 중 속도 배율

/* ── 점프 ─────────────────────────────────── */
const GRAVITY     = 0.52;
const JUMP_V      = -8.20;        // 최고점 ≈ 65px
const JUMP2_V     = -7.00;
const JUMP_CUT    = 0.42;         // 버튼 짧게 누르면 상승 속도 감쇠
const COYOTE      = 5;            // 지면을 벗어난 뒤 점프 허용 프레임
const JUMP_BUFFER = 7;            // 착지 직전 입력 선반영 프레임
const SPIN_FRAMES = 22;           // 2단 점프 회전 길이

/* ── 슬라이드 ─────────────────────────────── */
const SLIDE_MIN   = 16;           // 최소 유지 프레임
const SLIDE_MAX   = 60;           // 최대 유지 프레임(자동 해제)

/* ── 판정 박스 (셀 좌표 기준) ─────────────── */
const HB_RUN   = { x: 10, y:  5, w: 12, h: 27 };   // 32x32 셀 안에서
const HB_SLIDE = { x:  7, y: 18, w: 18, h: 14 };

/* ── 체력 / 무적 ──────────────────────────── */
const MAX_HP      = 3;
const HURT_FRAMES = 78;           // 피격 후 무적 + 깜빡임
const GOLD_FRAMES = 300;          // 골든 러시 5초
const MAGNET_R    = 62;           // 골든 러시 자석 반경

/* ── 아이템 ───────────────────────────────── */
const ITEMS = {
  baechu:     { sprite: 'baechu',     score:  10, w: 17, h: 18, pick: 3 },
  garlic:     { sprite: 'garlic',     score:  25, w: 18, h: 23, pick: 3 },
  gochu:      { sprite: 'gochu',      score:  40, w: 19, h: 18, pick: 3 },
  goldbaechu: { sprite: 'goldbaechu', score: 250, w: 34, h: 36, pick: -6 },
};

/* ── 장애물 ───────────────────────────────── */
const OBSTACLES = {
  /* 할머니: 천천히 마주 걸어온다. 점프로 넘는다. */
  halmoni:  { sprite: 'halmoni',  fw: 26, fh: 40, frames: 3, fps: 4,
              footY: 38, drift: 0.35,
              hb: { x: 6, y: 8, w: 15, h: 30 } },
  /* 배달 스쿠터: 빠르게 달려온다. 점프로 넘는다. */
  delivery: { sprite: 'delivery', fw: 40, fh: 40, frames: 3, fps: 12,
              footY: 39, drift: 1.15,
              hb: { x: 5, y: 10, w: 30, h: 29 } },
};

/* 시장 천막: 절차적으로 그린다. 슬라이드로 지난다. */
const AWNING_BOTTOM = FEET_Y - 20;   // 아래 통과 높이

/* ── 캐릭터 스킨 ──────────────────────────────────────────────
   사람 그림을 바꾸려면 아래 규격에 맞춘 시트를 assets/ 에 넣고
   SKINS 에 한 줄 추가하면 된다. (자세한 규격은 README.md)

     run  시트 : 32x32 프레임 8장, 가로 4 x 세로 2  (128x64)
     jump 시트 : 32x64 프레임 6장, 가로 6 x 세로 1  (192x64)

   jumpFeet[i] 는 i번째 점프 프레임에서 "발바닥이 있는 셀 내부 y".
   시트를 새로 만들 때 프레임별 발 높이가 다르면 이 값만 맞춰주면 된다.
   ------------------------------------------------------------ */
/* 달리기 애니메이션 배속. 스크롤 속도와 무관하게 모션만 조절한다.
   1.0 = 원래 속도, 0.5 = 절반 속도 */
const RUN_ANIM_RATE = 0.5;

const SKIN_SPEC = {
  runFW: 32, runFH: 32, runCols: 4, runFrames: 8,
  jumpFW: 32, jumpFH: 64, jumpCols: 6, jumpFrames: 6,
};

const SKINS = [
  {
    id: 'kimchi',
    name: '김치맨',
    run: 'player_run',
    jump: 'player_jump',
    runFeet: 31,                                // run 셀 안에서 발바닥 y
    jumpFeet: [62, 44, 53, 63, 63, 63],         // jump 프레임별 발바닥 y
    slideFrame: 4,                              // 슬라이드에 쓸 jump 프레임
  },
  // 예) 새 사람으로 교체하려면 시트를 넣고 아래 주석을 풀 것
  // {
  //   id: 'friend', name: '새 캐릭터',
  //   run: 'player2_run', jump: 'player2_jump',
  //   runFeet: 31, jumpFeet: [62, 44, 53, 63, 63, 63], slideFrame: 4,
  // },
];

/* assets/ 에 있으면 자동으로 스킨 목록에 붙는 슬롯.
   player2_run.png + player2_jump.png 를 넣기만 하면 타이틀에서 고를 수 있다. */
const SKIN_SLOTS = [
  { id: 'player2', name: '캐릭터 2' },
  { id: 'player3', name: '캐릭터 3' },
  { id: 'player4', name: '캐릭터 4' },
];

/* ── 배경 레이어 ──────────────────────────── */
const PARALLAX = { sky: 0.06, city: 0.16, shops: 0.42, ground: 1.0 };
const SHOP_SPRITES = ['building_01', 'building_02', 'building_03', 'building_04', 'building_05'];

/* ── 팔레트 ───────────────────────────────── */
const C = {
  ink:      '#1b2036',
  cream:    '#f6efdd',
  gold:     '#ffc32b',
  goldDark: '#c8860a',
  red:      '#d8433c',
  redDark:  '#8f241f',
  white:    '#ffffff',
  shadow:   'rgba(20,24,44,0.28)',
};

# KINGSAN-RUN (킹산런)

쿠키런 오븐브레이크 스타일의 픽셀 러너. `assets/` 의 재래시장 에셋으로 만든
320×180 원본 해상도 웹 게임이다. 빌드 도구·의존성 없음.

## 실행

```bash
python3 -m http.server 5177
```

그 다음 <http://localhost:5177> 을 열면 된다.
`index.html` 을 바로 더블클릭해도 동작한다 (ES 모듈을 쓰지 않아 `file://` 에서도 열린다).

## 조작

| | 키보드 | 터치 |
|---|---|---|
| 점프 / 2단 점프 | `Space` `↑` `W` | 화면 위쪽 탭 |
| 슬라이드 | `↓` `S` `Shift` | 화면 아래쪽 탭 (누르는 동안) |
| 일시정지 | `P` `Esc` | — |
| 다시 시작 | `R` | — |
| 음악 켜기/끄기 | `M` | — |
| 캐릭터 바꾸기 | `←` `→` (타이틀에서) | ◀ ▶ 버튼 |

점프 버튼을 짧게 누르면 낮게, 길게 누르면 높게 뛴다.
공중에서 한 번 더 누르면 회전하며 2단 점프.

## 규칙

- **할머니**, **배달 스쿠터** → 점프로 넘는다
- **시장 천막** → 슬라이드로 지나간다 (점프로는 넘을 수 없다)
- **배추 10점 / 마늘 25점 / 고추 40점** — 연속으로 먹으면 8개마다 배수가 오른다 (최대 ×4)
- **황금 배추** → 5초간 *골든 러시*: 무적 + 자석 + 점수 2배, 장애물은 부딪히면 부서진다
- 하트 3개. 부딪히면 하나 줄고 약 1.3초 무적. 0이 되면 끝
- 달릴수록 빨라진다 (2.4 → 5.4 px/frame)

## 캐릭터 교체

플레이어 스프라이트는 스킨 단위로 갈아끼운다. 현재 등록된 스킨:

| id | 이름 | 시트 |
|---|---|---|
| `kingsan` | 킹산이 | `assets/kid_run.png`, `assets/kid_jump.png` |
| `kimchi` | 김치맨 | `assets/player_run.png`, `assets/player_jump.png` |

### 시트 규격

```
<이름>_run.png    128×64   32×32 프레임 8장 (가로 4 × 세로 2, 왼→오, 위→아래)
<이름>_jump.png   192×64   32×64 프레임 6장 (가로 6 × 세로 1)
                           0 웅크림 → 1 상승 → 2 최고점 → 3 하강 → 4 착지 → 5 복귀
```

- 캐릭터는 **오른쪽을 보고** 있어야 한다
- 배경은 투명, 윤곽선은 검정 1px
- `jumpFeet[i]` 는 i번째 점프 프레임에서 **발바닥이 있는 셀 내부 y**.
  프레임마다 발 높이가 다르면 이 값만 맞춰 주면 위치가 정렬된다
- `slideFrame` 은 슬라이드 자세로 쓸 점프 프레임 번호 (기본 4 = 웅크린 착지 자세)

### 새 사람 넣기

가장 빠른 방법은 파일 이름만 맞춰 넣는 것이다.
`assets/player2_run.png` + `assets/player2_jump.png` 를 두면
게임이 시작할 때 자동으로 찾아서 타이틀 화면 캐릭터 목록에 붙여 준다
(`player2`, `player3` — `src/config.js` 의 `SKIN_SLOTS`).
비어 있는 슬롯 때문에 콘솔에 404 가 몇 개 찍히는데 정상이다.

이름을 직접 정하고 싶으면 [`src/config.js`](src/config.js) 의 `SKINS` 에 추가한다:

```js
{
  id: 'friend', name: '내 캐릭터',
  run: 'friend_run', jump: 'friend_jump',
  runFeet: 31, jumpFeet: [62, 44, 53, 63, 63, 63], slideFrame: 4,
}
```

`SKINS` 의 **첫 번째** 항목이 기본 캐릭터다.

### 사진에서 만들기

`kid_*.png` 는 `runner.jpg` 의 아이(검은 단발 · 초록 선글라스 · 남색 재킷 ·
하늘색 셔츠)를 원본 시트에 입혀 만들었다. 원본의 포즈와 타이밍을 그대로 쓰고
색과 머리 실루엣만 바꾸는 방식이라 애니메이션 품질이 유지된다.

```bash
python3 tools/make_kid_sprites.py        # 기본값으로 다시 생성
python3 tools/make_kid_sprites.py 2      # 뒷머리를 2행 더 남긴다 (긴 머리)
python3 tools/make_kid_sprites.py -4     # 더 짧게 자른다
```

색은 스크립트 상단의 `N_JACKET_L`, `N_SHIRT_L`, `N_GLASS` 등을 고치면 된다.

## 타이틀 로고

```bash
python3 tools/make_title.py               # assets/title.png 재생성
python3 tools/make_title.py "MY GAME"     # 다른 문구
```

원본 `KIMCHI-RUN` 로고의 스타일(획 7px, 이탤릭, 세로 그라데이션, 베벨, 그림자)을
코드로 재현한다. 없는 글자는 `tools/make_title.py` 의 `glyph()` 에 추가한다.
예전 로고는 `assets/title_kimchi.png` 에 남겨 두었다.

## 튜닝

숫자는 전부 [`src/config.js`](src/config.js) 한 곳에 모여 있다. 자주 만지는 것들:

| 상수 | 뜻 |
|---|---|
| `RUN_ANIM_RATE` | 달리기 **모션**만 빠르게/느리게 (이동 속도와 무관). `0.5` = 절반 |
| `SPEED_BASE` `SPEED_MAX` `SPEED_RAMP` | 스크롤 속도와 가속 |
| `JUMP_V` `JUMP2_V` `GRAVITY` | 점프 높이 (`JUMP_V²/(2·GRAVITY)` ≈ 최고점) |
| `MAX_HP` `HURT_FRAMES` | 체력, 피격 후 무적 시간 |
| `GOLD_FRAMES` `MAGNET_R` | 골든 러시 길이와 자석 반경 |
| `AWNING_BOTTOM` | 천막 아래 통과 높이 |
| `ASSET_VERSION` | 에셋을 고쳤는데 브라우저가 옛 파일을 쓸 때 올린다 |

## 구조

```
index.html          화면 골격 + 오버레이 UI (한글 텍스트는 DOM 쪽)
style.css           정수 배율 스케일링, 패널/버튼
src/config.js       모든 튜닝값, 스킨 정의, 팔레트
src/font.js         5×7 픽셀 폰트 (캔버스 HUD 숫자용)
src/assets.js       이미지 프리로드 + 스킨 슬롯 자동 탐지
src/audio.js        WebAudio 로 합성하는 효과음 + 배경 루프
src/input.js        키보드 / 마우스 / 터치
src/background.js   하늘·원경빌딩·상점·바닥 4겹 패럴랙스
src/player.js       달리기/점프/2단점프/슬라이드/피격 상태
src/entities.js     장애물, 아이템, 이펙트, 패턴 스포너
src/hud.js          하트, 점수, 콤보, 골든 게이지
src/game.js         메인 루프, 상태 전환, DOM 연결
tools/              스프라이트·로고 생성 스크립트 (의존성 없는 순수 파이썬)
```

브라우저 콘솔에서 `KingsanRun` 으로 상태를 들여다보고 프레임을 직접 돌릴 수 있다:

```js
KingsanRun.start()        // 바로 시작
KingsanRun.advance(120)   // 120프레임 진행 후 상태 반환
KingsanRun.g.player       // 플레이어 내부 상태
KingsanRun.setSkin(1)     // 스킨 바꾸기
```

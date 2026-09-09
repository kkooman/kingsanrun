#!/usr/bin/env python3
"""
사진을 보고 플레이어 스프라이트를 만든다.

원본 player_run / player_jump 의 포즈와 타이밍을 그대로 쓰고
색과 머리·모자·안경만 바꾸는 방식이라 애니메이션 품질이 유지된다.

  python3 tools/make_characters.py            # 전부 다시 생성
  python3 tools/make_characters.py hosanna    # 하나만

새 캐릭터를 넣으려면 아래 CHARACTERS 에 한 항목 추가하고 돌리면 된다.
"""
import os
import sys
from collections import deque

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pngio import read_png, write_png, blank, hexc

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = os.path.join(ROOT, 'assets')

# ── 원본 스프라이트 팔레트 ───────────────────────────────────
OUTLINE = (0, 0, 0, 255)
SUIT_L  = (224, 110, 18, 255)     # 주황 정장 밝은 면
SUIT_D  = (205, 85, 13, 255)      # 주황 정장 어두운 면
HAIR_L  = (69, 34, 18, 255)
HAIR_D  = (56, 27, 13, 255)
SKIN_L  = (252, 189, 147, 255)
SKIN_D  = (228, 161, 124, 255)
GLASS_F = (64, 64, 54, 255)       # 고글 테
TIE     = (15, 54, 95, 255)
WHITE_A = (238, 226, 212, 255)    # 렌즈 / 셔츠 / 신발이 공유하는 색
WHITE_B = (236, 226, 211, 255)
SUIT_HL = {(251, 183, 120, 255), (241, 129, 81, 255),
           (241, 184, 113, 255), (226, 130, 74, 255), (255, 255, 255, 255)}

WHITES = {WHITE_A, WHITE_B}
HAIRS  = {HAIR_L, HAIR_D}
SUITS  = {SUIT_L, SUIT_D} | SUIT_HL

NEI4 = ((1, 0), (-1, 0), (0, 1), (0, -1))

# ── 캐릭터 정의 ──────────────────────────────────────────────
# hair      : 'keep' 또는 자를 행수(안경 아랫줄 기준, 음수면 더 짧게)
# glasses   : (테색, 렌즈색) 또는 None(안경을 벗기고 눈을 그린다)
# cap       : (크라운색, 챔색) 또는 None
# top/bottom: 상의(몸통) / 하의(다리) 색 — (밝은면, 어두운면)
CHARACTERS = {
    'kid': {
        'name': '킹산이', 'hl': '#7793dd',
        'hair': -2, 'hair_col': ('#26262f', '#121218'),
        'glasses': ('#3fc93f', '#14251a'),
        'cap': None,
        'top':    ('#4a68b8', '#32478a'),
        'bottom': ('#4a68b8', '#32478a'),
        'shirt': '#bfdff7', 'placket': '#7fb0d8', 'shoe': '#dfe4ee',
    },
    'hosanna': {
        'name': '호산나', 'hl': '#ffffff',
        # 사진: SF 야구모자(갈색 크라운 + 주황 챔), 긴 검은 머리,
        #      흰 스트라이프 셔츠, 청바지, 코랄 크로스백
        'hair': 'keep', 'hair_col': ('#23232e', '#111118'),
        'glasses': None,
        'cap': ('#6e4a3c', '#ee6a1c'),      # 검은 머리와 구분되는 갈색 크라운
        'top':    ('#efe9e2', '#c3bcbd'),      # 흰 셔츠
        'bottom': ('#4a6ea8', '#33507e'),      # 청바지
        'shirt': '#7b8fb4', 'placket': '#e0707e', 'shoe': '#e8e4dc',
    },
    'goguma': {
        'name': '고구마', 'hl': '#5f79bb',
        # 사진: 긴 검은 머리, 둥근 안경, 남색 가디건,
        #      흰 셔츠깃, 어두운 체크 치마, 흰 운동화
        'hair': 'keep', 'hair_col': ('#26262f', '#111117'),
        'glasses': ('#b8923a', 'clear'),       # 금테 + 비치는 렌즈
        'cap': None,
        'top':    ('#3f5490', '#2a3a68'),      # 남색 가디건
        'bottom': ('#7d3446', '#57202f'),      # 체크 치마
        'shirt': '#eef2f8', 'placket': '#b9432f', 'shoe': '#eceff5',
    },
    'cookie': {
        # 참고 이미지는 쿠키런의 저작권 캐릭터라 그대로 베끼지 않고,
        # 같은 진저브레드 테마의 자체 디자인으로 만들었다.
        'name': '용감한쿠키', 'hl': '#e8a860',
        'hair': 'keep', 'hair_col': ('#c97e2e', '#a05a18'),
        'glasses': None,
        'cap': None,
        'cookie': True, 'head_r': 6, 'head_dx': -2,
        'cane': {'dx': -11, 'dy': 5, 'len': 13, 'hook': 2, 'w': 2,
                 'red': '#d8342e', 'cream': '#f4f1e8'},
        'icing': '#f4f1e8', 'eye': '#33180c',
        'top':    ('#d08a3a', '#a86020'),      # 진저브레드
        'bottom': ('#c87c2c', '#9c5518'),
        'shirt': '#f4f1e8', 'placket': '#f4f1e8', 'shoe': '#f4f1e8',
        'outline': '#3a1a0c',
    },
}


def components(cells):
    """좌표 집합을 4-이웃 연결 성분으로 나눈다."""
    todo, out = set(cells), []
    while todo:
        q, comp = deque([todo.pop()]), []
        comp.append(q[0])
        while q:
            cx, cy = q.popleft()
            for dx, dy in NEI4:
                n = (cx + dx, cy + dy)
                if n in todo:
                    todo.discard(n)
                    q.append(n)
                    comp.append(n)
        out.append(comp)
    return out


def res_solid(buf, x, y):
    """버퍼에서 윤곽선이 아닌 실제 그림 픽셀인가"""
    if not (0 <= y < len(buf) and 0 <= x < len(buf[0])):
        return False
    c = buf[y][x]
    return c[3] > 0 and c != OUTLINE


def convert_frame(grid, fw, fh, spec):
    at = lambda x, y: grid[y][x] if 0 <= x < fw and 0 <= y < fh else (0, 0, 0, 0)
    C = lambda k: hexc(spec[k]) if isinstance(spec[k], str) else spec[k]

    hair_l, hair_d = (hexc(c) for c in spec['hair_col'])
    top_l, top_d = (hexc(c) for c in spec['top'])
    bot_l, bot_d = (hexc(c) for c in spec['bottom'])
    shirt = hexc(spec['shirt']); placket = hexc(spec['placket']); shoe = hexc(spec['shoe'])
    hl = hexc(spec['hl']) if spec.get('hl') else top_l

    glass = [(x, y) for y in range(fh) for x in range(fw) if at(x, y) == GLASS_F]
    whites = [(x, y) for y in range(fh) for x in range(fw) if at(x, y) in WHITES]
    hair = [(x, y) for y in range(fh) for x in range(fw) if at(x, y) in HAIRS]
    suit = [(x, y) for y in range(fh) for x in range(fw) if at(x, y) in SUITS]
    body = [(x, y) for y in range(fh) for x in range(fw)
            if at(x, y)[3] > 0 and at(x, y) != OUTLINE]
    if not body:
        return [[(0, 0, 0, 0)] * fw for _ in range(fh)]

    body_bottom = max(y for _, y in body)

    # ── 안경 위치 = 얼굴 기준점 ──
    if glass:
        gx0 = min(x for x, _ in glass); gx1 = max(x for x, _ in glass)
        gy0 = min(y for _, y in glass); gy1 = max(y for _, y in glass)
    else:
        gx0 = gy0 = 0; gx1 = fw; gy1 = 0

    # ── 흰색 픽셀을 렌즈 / 신발 / 셔츠로 분류 ──
    lens, shoes = set(), set()
    for comp in components(whites):
        near_glass = any(gx0 - 1 <= x <= gx1 + 1 and gy0 - 1 <= y <= gy1 + 1 for x, y in comp)
        if glass and near_glass:
            lens.update(comp)
        elif min(y for _, y in comp) >= body_bottom - 10:
            shoes.update(comp)

    # ── 상의 / 하의 경계 (허리선) ──
    if suit:
        sy0 = min(y for _, y in suit); sy1 = max(y for _, y in suit)
        waist = sy0 + (sy1 - sy0) * 0.42
    else:
        sy0 = sy1 = 0
        waist = fh

    # ── 머리 다듬기 ──
    hair_cut = set()
    if glass and spec['hair'] != 'keep':
        keep = spec['hair']
        for (x, y) in hair:
            if y > gy1 - 1 + keep or x < gx0 - 6:
                hair_cut.add((x, y))

    # ── 모자를 쓰면 눈높이 위쪽 머리는 크라운이 된다 ──
    cap_crown, cap_brim = set(), set()
    if spec['cap'] and glass:
        # 눈높이보다 위에 있는 머리와 이마를 모자 크라운으로 덮는다
        for (x, y) in hair:
            if y <= gy0 - 1:
                cap_crown.add((x, y))
        for y in range(0, gy0):
            for x in range(fw):
                if at(x, y) in (SKIN_L, SKIN_D):
                    cap_crown.add((x, y))
        if cap_crown:
            # 챔은 눈 바로 위에서 앞쪽으로 살짝 처지게 (야구모자 옆모습).
            # 얼굴 실루엣 바로 옆에서 시작해야 사이에 윤곽선이 끼지 않는다.
            def front_edge(yy):
                row = [x for x in range(fw)
                       if at(x, yy)[3] > 0 and at(x, yy) != OUTLINE]
                return max(row) if row else gx1

            b0 = gy0 - 1
            x0 = front_edge(b0) + 1
            for dx in range(0, 3):
                cap_brim.add((x0 + dx, b0))
            for dx in range(1, 4):
                cap_brim.add((x0 + dx, b0 + 1))

    # ── 재색 ──
    out = [[(0, 0, 0, 0)] * fw for _ in range(fh)]
    for y in range(fh):
        for x in range(fw):
            c = grid[y][x]
            if c[3] == 0 or (x, y) in hair_cut:
                continue
            p = (x, y)
            if c == OUTLINE:
                out[y][x] = OUTLINE
            elif p in cap_crown:
                out[y][x] = hexc(spec['cap'][0])
            elif c in HAIRS:
                out[y][x] = hair_l if c == HAIR_L else hair_d
            elif c in SUITS:
                if c in SUIT_HL:
                    out[y][x] = hl
                elif y >= waist:
                    out[y][x] = bot_d if c == SUIT_D else bot_l
                else:
                    out[y][x] = top_d if c == SUIT_D else top_l
            elif c == SKIN_L:
                out[y][x] = top_l if spec.get('cookie') else SKIN_L
            elif c == SKIN_D:
                out[y][x] = top_d if spec.get('cookie') else SKIN_D
            elif c == GLASS_F:
                if spec.get('cookie'):
                    out[y][x] = top_d
                else:
                    out[y][x] = hexc(spec['glasses'][0]) if spec['glasses'] else SKIN_L
            elif c == TIE:
                out[y][x] = placket
            elif c in WHITES and spec.get('cookie') and p not in lens and p not in shoes:
                out[y][x] = top_l          # 셔츠 자리는 몸통색, 단추는 따로 찍는다
            elif c in WHITES:
                if p in lens:
                    if spec.get('cookie'):
                        out[y][x] = top_l
                    elif not spec['glasses'] or spec['glasses'][1] == 'clear':
                        out[y][x] = SKIN_L          # 렌즈가 비치는 안경 / 안경 없음
                    else:
                        out[y][x] = hexc(spec['glasses'][1])
                elif p in shoes:
                    out[y][x] = shoe
                else:
                    out[y][x] = shirt
            else:
                out[y][x] = c

    # ── 렌즈가 비치거나 안경이 없으면 눈동자를 찍어 준다 ──
    if glass and (spec['glasses'] is None or spec['glasses'][1] == 'clear'):
        eye = hexc('#2a2320')
        for comp in components(list(lens)):
            xs = [x for x, _ in comp]; ys = [y for _, y in comp]
            ex = (min(xs) + max(xs)) // 2
            ey = (min(ys) + max(ys)) // 2
            if 0 <= ex < fw and 0 <= ey < fh:
                out[ey][ex] = eye

    # ── 쿠키 머리 (사람 머리를 지우고 동그란 쿠키를 얹는다) ──
    if spec.get('cookie') and glass:
        # 머리카락만 지운다. 손은 피부색이라 그대로 남는다.
        for (x, y) in hair:
            out[y][x] = (0, 0, 0, 0)
        body_l, body_d = top_l, top_d
        icing = hexc(spec['icing'])
        eye = hexc(spec['eye'])
        cx = (gx0 + gx1) // 2 + spec.get('head_dx', 0)
        cy = gy0 + 1
        r = spec.get('head_r', 5)
        for y in range(cy - r, cy + r + 1):
            for x in range(cx - r, cx + r + 1):
                if not (0 <= x < fw and 0 <= y < fh):
                    continue
                d = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
                if d <= r + 0.35:
                    out[y][x] = body_d if d > r - 0.9 else body_l
        put = lambda ex, ey, col: (0 <= ex < fw and 0 <= ey < fh
                                   and out[ey][ex][3] and out[ey].__setitem__(ex, col))
        # 눈 두 개
        for dx in (0, 3):
            put(cx + dx, cy, eye)
        # 머리 위 아이싱 (원작 캐릭터를 베끼지 않은 자체 디자인)
        for dx in range(-3, 4):
            put(cx + dx, cy - r + 1 + (abs(dx) % 2), icing)
        # 가슴 아이싱 단추 두 개
        for i in (0, 2):
            put(cx - 2, cy + r + 2 + i, icing)

    # ── 치마 (엉덩이 부근을 옆으로 넓혀 실루엣을 만든다) ──
    if spec.get('skirt') and suit:
        hip = int(sy0 + (sy1 - sy0) * 0.50)
        for i in range(spec['skirt']):
            y = hip + i
            if not (0 <= y < fh):
                continue
            row = [x for x in range(fw) if res_solid(out, x, y)]
            if not row:
                continue
            flare = 1 + i // 2
            col = bot_d if i % 2 else bot_l
            for x in range(min(row) - flare, max(row) + flare + 1):
                if 0 <= x < fw and out[y][x][3] == 0:
                    out[y][x] = col

    # ── 모자 챔 ──
    if cap_brim:
        brim = hexc(spec['cap'][1])
        for (x, y) in cap_brim:
            if 0 <= x < fw and 0 <= y < fh:
                out[y][x] = brim

    # ── 사탕 지팡이 ──────────────────────────
    #  손 픽셀은 프레임 대부분에서 몸에 가려 안 보이므로,
    #  머리 기준 고정 위치에 그려서 프레임 간 흔들림을 없앤다.
    cane = spec.get('cane')
    if cane and glass:
        hx = (gx0 + gx1) // 2 + cane['dx']
        hy = gy0 + 1 + cane['dy']
        red, cream = hexc(cane['red']), hexc(cane['cream'])
        wide = cane.get('w', 2)

        def stick(x, y, band):
            for w in range(wide):
                if 0 <= x + w < fw and 0 <= y < fh:
                    out[y][x + w] = red if band else cream

        for i in range(cane['len']):
            stick(hx, hy + i, (i // 2) % 2 == 0)
        # 위쪽 손잡이가 앞으로 휘어진다
        for i in range(cane.get('hook', 3)):
            stick(hx + 1 + i, hy - 1 - (0 if i == 0 else 1), (i // 2) % 2 == 1)

    # ── 윤곽선 재생성 ──
    line = hexc(spec['outline']) if spec.get('outline') else OUTLINE
    solid = [[out[y][x][3] > 0 and out[y][x] != OUTLINE for x in range(fw)] for y in range(fh)]
    res = [[out[y][x] if solid[y][x] else (0, 0, 0, 0) for x in range(fw)] for y in range(fh)]
    for y in range(fh):
        for x in range(fw):
            if solid[y][x]:
                continue
            for dx, dy in NEI4:
                nx, ny = x + dx, y + dy
                if 0 <= nx < fw and 0 <= ny < fh and solid[ny][nx]:
                    res[y][x] = line
                    break
    return res


def build(cid, spec):
    made = []
    for src, fw, fh, out_name in [('player_run.png', 32, 32, cid + '_run.png'),
                                  ('player_jump.png', 32, 64, cid + '_jump.png')]:
        w, h, px = read_png(os.path.join(A, src))
        cols, rows = w // fw, h // fh
        dst = blank(w, h)
        for r in range(rows):
            for c in range(cols):
                grid = [[px[r * fh + y][c * fw + x] for x in range(fw)] for y in range(fh)]
                sub = [[grid[y][x] for x in range(fw)] for y in range(fh)]
                conv = convert_frame(sub, fw, fh, spec)
                for y in range(fh):
                    for x in range(fw):
                        dst[r * fh + y][c * fw + x] = conv[y][x]
        write_png(os.path.join(A, out_name), dst)
        made.append(out_name)
    return made


if __name__ == '__main__':
    want = sys.argv[1:] or list(CHARACTERS)
    for cid in want:
        if cid not in CHARACTERS:
            raise SystemExit('모르는 캐릭터: %s (%s 중에서)' % (cid, ', '.join(CHARACTERS)))
        files = build(cid, CHARACTERS[cid])
        print('  %-10s %-8s -> %s' % (cid, CHARACTERS[cid]['name'], ', '.join(files)))

#!/usr/bin/env python3
"""
runner.jpg 의 아이(검은 단발 + 초록 선글라스 + 남색 재킷 + 하늘색 셔츠)를
플레이어 스프라이트로 만든다.

원본 player_run / player_jump 의 애니메이션(포즈·타이밍)은 그대로 두고
색과 머리 실루엣만 바꾸는 방식이라 동작 품질이 유지된다.

  python3 tools/make_kid_sprites.py
    -> assets/kid_run.png  (128x64, 32x32 x 8)
    -> assets/kid_jump.png (192x64, 32x64 x 6)
"""
import os
import sys
from collections import deque

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pngio import read_png, write_png, blank, hexc

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = os.path.join(ROOT, 'assets')

# ── 원본 팔레트 ──────────────────────────────────────────────
OUTLINE = (0, 0, 0, 255)
SUIT_L  = (224, 110, 18, 255)    # 주황 정장 (밝은 면)
SUIT_D  = (205, 85, 13, 255)     # 주황 정장 (어두운 면)
HAIR_L  = (69, 34, 18, 255)      # 머리 (밝은 면)
HAIR_D  = (56, 27, 13, 255)      # 머리 (어두운 면)
SKIN_L  = (252, 189, 147, 255)
SKIN_D  = (228, 161, 124, 255)
GLASS_F = (64, 64, 54, 255)       # 고글 테
TIE     = (15, 54, 95, 255)       # 넥타이
WHITE_A = (238, 226, 212, 255)    # 렌즈 / 셔츠 / 신발 (같은 색을 공유)
WHITE_B = (236, 226, 211, 255)
SUIT_HL = {(251, 183, 120, 255), (241, 129, 81, 255),
           (241, 184, 113, 255), (226, 130, 74, 255), (255, 255, 255, 255)}

WHITES = {WHITE_A, WHITE_B}
HAIRS  = {HAIR_L, HAIR_D}

# ── 새 팔레트 ────────────────────────────────────────────────
N_JACKET_L = hexc('#4a68b8')     # 남색 재킷 (밝은 면)
N_JACKET_D = hexc('#32478a')     # 남색 재킷 (어두운 면)
N_JACKET_H = hexc('#7793dd')     # 재킷 하이라이트
N_HAIR_L   = hexc('#26262f')     # 검은 단발
N_HAIR_D   = hexc('#121218')
N_SHIRT_L  = hexc('#bfdff7')     # 하늘색 셔츠
N_SHIRT_D  = hexc('#7fb0d8')
N_GLASS    = hexc('#3fc93f')     # 초록 선글라스 테
N_LENS     = hexc('#14251a')     # 어두운 렌즈
N_SHOE     = hexc('#dfe4ee')     # 운동화 (밝게 두어 발이 보이게)

NEI4 = ((1, 0), (-1, 0), (0, 1), (0, -1))
NEI8 = NEI4 + ((1, 1), (1, -1), (-1, 1), (-1, -1))


def components(cells):
    """좌표 집합을 4-이웃 연결 성분으로 나눈다."""
    todo, out = set(cells), []
    while todo:
        seed = todo.pop()
        q, comp = deque([seed]), [seed]
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


def convert_frame(src, fw, fh, ox, hair_keep_rows):
    """한 프레임(fw x fh)을 새 캐릭터로 변환해 돌려준다."""
    grid = [[src[y][ox + x] for x in range(fw)] for y in range(fh)]

    at = lambda x, y: grid[y][x] if 0 <= x < fw and 0 <= y < fh else (0, 0, 0, 0)

    glass = [(x, y) for y in range(fh) for x in range(fw) if at(x, y) == GLASS_F]
    whites = [(x, y) for y in range(fh) for x in range(fw) if at(x, y) in WHITES]
    hair = [(x, y) for y in range(fh) for x in range(fw) if at(x, y) in HAIRS]
    body = [(x, y) for y in range(fh) for x in range(fw)
            if at(x, y)[3] > 0 and at(x, y) != OUTLINE]

    if not body:
        return [[(0, 0, 0, 0)] * fw for _ in range(fh)]

    body_bottom = max(y for _, y in body)

    # ── 안경: 테 주변의 흰 픽셀 = 렌즈 ──
    lens = set()
    if glass:
        gx0 = min(x for x, _ in glass); gx1 = max(x for x, _ in glass)
        gy0 = min(y for _, y in glass); gy1 = max(y for _, y in glass)
        for comp in components(whites):
            if any(gx0 - 1 <= x <= gx1 + 1 and gy0 - 1 <= y <= gy1 + 1 for x, y in comp):
                lens.update(comp)
    else:
        gx0, gy0, gx1, gy1 = 0, 0, fw, 0

    # ── 신발: 아래쪽에 몰린 흰 성분 ──
    shoe = set()
    for comp in components(whites):
        if set(comp) & lens:
            continue
        if min(y for _, y in comp) >= body_bottom - 10:
            shoe.update(comp)

    # ── 머리: 안경 아래로 늘어진 긴 머리를 잘라 단발로 ──
    hair_cut = set()
    if glass:
        for (x, y) in hair:
            too_low = y > gy1 - 1 + hair_keep_rows
            too_far_back = x < gx0 - 6
            if too_low or too_far_back:
                hair_cut.add((x, y))

    # ── 재색 ──
    out = [[(0, 0, 0, 0)] * fw for _ in range(fh)]
    for y in range(fh):
        for x in range(fw):
            c = grid[y][x]
            if c[3] == 0:
                continue
            if (x, y) in hair_cut:
                continue                       # 잘라낸 머리
            if c == OUTLINE:
                out[y][x] = OUTLINE            # 윤곽선은 뒤에서 다시 계산
            elif c in (SUIT_L,):
                out[y][x] = N_JACKET_L
            elif c in (SUIT_D,):
                out[y][x] = N_JACKET_D
            elif c in SUIT_HL:
                out[y][x] = N_JACKET_H
            elif c == HAIR_L:
                out[y][x] = N_HAIR_L
            elif c == HAIR_D:
                out[y][x] = N_HAIR_D
            elif c == SKIN_L:
                out[y][x] = SKIN_L
            elif c == SKIN_D:
                out[y][x] = SKIN_D
            elif c == GLASS_F:
                out[y][x] = N_GLASS
            elif c == TIE:
                out[y][x] = N_SHIRT_D
            elif c in WHITES:
                if (x, y) in lens:
                    out[y][x] = N_LENS
                elif (x, y) in shoe:
                    out[y][x] = N_SHOE
                else:
                    out[y][x] = N_SHIRT_L
            else:
                out[y][x] = c

    # ── 윤곽선 재생성 ──
    solid = [[out[y][x][3] > 0 and out[y][x] != OUTLINE for x in range(fw)] for y in range(fh)]
    res = [[out[y][x] if solid[y][x] else (0, 0, 0, 0) for x in range(fw)] for y in range(fh)]
    for y in range(fh):
        for x in range(fw):
            if solid[y][x]:
                continue
            for dx, dy in NEI4:
                nx, ny = x + dx, y + dy
                if 0 <= nx < fw and 0 <= ny < fh and solid[ny][nx]:
                    res[y][x] = OUTLINE
                    break
    return res


def convert_sheet(name, fw, fh, frames, hair_keep_rows, out_name):
    w, h, px = read_png(os.path.join(A, name))
    assert w == fw * frames or h > fh, (name, w, h)
    cols = w // fw
    rows = h // fh
    dst = blank(w, h)
    for r in range(rows):
        for c in range(cols):
            sub = [[px[r * fh + y][x] for x in range(w)] for y in range(fh)]
            conv = convert_frame(sub, fw, fh, c * fw, hair_keep_rows)
            for y in range(fh):
                for x in range(fw):
                    dst[r * fh + y][c * fw + x] = conv[y][x]
    write_png(os.path.join(A, out_name), dst)
    print('  %-18s -> %-18s %dx%d (%dx%d 프레임 %d칸)'
          % (name, out_name, w, h, fw, fh, cols * rows))


if __name__ == '__main__':
    # 기본 -2: 사진처럼 짧은 단발(바가지 머리)이 되도록 뒷머리를 더 자른다
    keep = int(sys.argv[1]) if len(sys.argv) > 1 else -2
    print('머리 길이 보정: 안경 아랫줄 +%d 행까지 유지' % keep)
    convert_sheet('player_run.png', 32, 32, 8, keep, 'kid_run.png')
    convert_sheet('player_jump.png', 32, 64, 6, keep, 'kid_jump.png')

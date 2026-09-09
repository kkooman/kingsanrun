#!/usr/bin/env python3
"""
타이틀 로고를 만든다. 원본 title.png(KIMCHI-RUN) 의 스타일을 그대로 따른다.

  · 글자 높이 29px, 획 두께 7px, 오른쪽으로 기울어진 이탤릭
  · 세로 그라데이션(노랑 -> 주황 -> 진한 주황)
  · 왼쪽/위 모서리는 한 단계 밝게, 오른쪽/아래는 한 단계 어둡게 (베벨)
  · 1px 어두운 윤곽선 + 아래로 3px 내린 반투명 그림자

  python3 tools/make_title.py            -> assets/title.png
  python3 tools/make_title.py "MY GAME"  -> 다른 문구로
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pngio import write_png, hexc

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

H = 29            # 글자 높이
SLANT = 6         # 맨 윗줄이 맨 아랫줄보다 오른쪽으로 밀리는 양
PAD_L, PAD_R = 2, 2
SHADOW_DX, SHADOW_DY = -1, 3

C_HI    = hexc('#fedf37')
C_YEL   = hexc('#fec526')
C_ORG   = hexc('#fd951a')
C_DARK  = hexc('#bc4003')
C_LINE  = hexc('#232532')
C_SHADE = (0, 0, 0, 102)

BRIGHTER = {C_YEL: C_HI, C_ORG: C_YEL, C_DARK: C_ORG}
DARKER   = {C_YEL: C_DARK, C_ORG: C_DARK, C_DARK: C_DARK}


def band(r):
    """마스크 r번째 행의 기본 색"""
    if r <= 15:
        return C_YEL
    if r <= 25:
        return C_ORG
    return C_DARK


# ── 글자 정의 ────────────────────────────────────────────────
def rect(m, x0, y0, x1, y1):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            m.add((x, y))


def stroke(m, pts, lo, hi):
    """(y, 중심x) 목록을 두께 7의 가로 구간으로 채운다"""
    for y, xc in pts:
        for x in range(max(lo, xc - 3), min(hi, xc + 3) + 1):
            m.add((x, y))


def glyph(ch):
    m = set()
    if ch == 'K':
        w = 21
        rect(m, 0, 0, 6, 28)
        stroke(m, [(y, 20 - y) for y in range(0, 14)], 7, 20)
        stroke(m, [(y, 7 + (y - 14)) for y in range(14, 29)], 7, 20)
    elif ch == 'I':
        w = 15
        rect(m, 0, 0, 14, 8)
        rect(m, 4, 9, 10, 19)
        rect(m, 0, 20, 14, 28)
    elif ch == 'N':
        w = 21
        rect(m, 0, 0, 6, 28)
        rect(m, 14, 0, 20, 28)
        stroke(m, [(y, 3 + round(y * 14 / 28)) for y in range(0, 29)], 0, 20)
    elif ch == 'G':
        w = 21
        rect(m, 3, 0, 20, 7)
        rect(m, 0, 4, 6, 24)
        rect(m, 3, 21, 20, 28)
        rect(m, 11, 14, 20, 20)
        rect(m, 14, 14, 20, 28)
    elif ch == 'S':
        w = 19
        rect(m, 2, 0, 18, 7)
        rect(m, 0, 4, 6, 13)
        rect(m, 1, 11, 17, 18)
        rect(m, 12, 16, 18, 25)
        rect(m, 0, 21, 16, 28)
    elif ch == 'A':
        w = 21
        rect(m, 7, 0, 13, 2)
        rect(m, 5, 1, 15, 4)
        rect(m, 3, 3, 17, 7)
        rect(m, 0, 4, 6, 28)
        rect(m, 14, 4, 20, 28)
        rect(m, 4, 13, 16, 19)
    elif ch == 'R':
        w = 21
        rect(m, 0, 0, 6, 28)
        rect(m, 0, 0, 17, 7)
        rect(m, 12, 4, 18, 13)
        rect(m, 0, 11, 17, 18)
        stroke(m, [(y, 11 + round((y - 17) * 9 / 11)) for y in range(17, 29)], 11, 20)
    elif ch == 'U':
        w = 21
        rect(m, 0, 0, 6, 22)
        rect(m, 14, 0, 20, 22)
        rect(m, 0, 21, 20, 28)
    elif ch == 'M':
        w = 25
        rect(m, 0, 0, 6, 28)
        rect(m, 18, 0, 24, 28)
        stroke(m, [(y, 3 + round(y * 9 / 15)) for y in range(0, 16)], 0, 12)
        stroke(m, [(y, 21 - round(y * 9 / 15)) for y in range(0, 16)], 12, 24)
    elif ch == '-':
        w = 14
        rect(m, 0, 11, 13, 18)
    elif ch == ' ':
        return 10, set()
    else:
        raise SystemExit('지원하지 않는 글자: %r (tools/make_title.py 의 glyph() 에 추가)' % ch)
    return w, m


def round_corners(mask):
    """볼록한 직각 모서리를 1px 깎아 둥글게"""
    out = set(mask)
    for (x, y) in mask:
        up = (x, y - 1) in mask
        dn = (x, y + 1) in mask
        lf = (x - 1, y) in mask
        rt = (x + 1, y) in mask
        if (not up and not lf) or (not up and not rt) or \
           (not dn and not lf) or (not dn and not rt):
            out.discard((x, y))
    return out


def build(text):
    # 글자를 나란히 놓고 기울인다
    placed = {}          # (x, y) -> 마스크 행 r
    pen = PAD_L
    for ch in text:
        w, m = glyph(ch)
        m = round_corners(m)
        for (gx, gy) in m:
            sh = round((H - 1 - gy) * SLANT / (H - 1))
            placed[(pen + gx + sh, gy)] = gy
        pen += w + 1

    mask = set(placed)
    minx = min(x for x, _ in mask)
    W = max(x for x, _ in mask) - minx + 1 + PAD_R + 2
    OUT_H = H + 1 + SHADOW_DY + 1
    px = [[(0, 0, 0, 0)] * W for _ in range(OUT_H)]

    def shift(p):
        return (p[0] - minx + 1, p[1] + 1)

    # 윤곽선 대상: 마스크를 1px 부풀린 영역
    ring = set()
    for (x, y) in mask:
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                if (x + dx, y + dy) not in mask:
                    ring.add((x + dx, y + dy))

    def put(p, col):
        x, y = shift(p)
        if 0 <= x < W and 0 <= y < OUT_H:
            px[y][x] = col

    # 1) 그림자 (실루엣 = 마스크 + 윤곽선)
    sil = mask | ring
    for (x, y) in sil:
        p = (x + SHADOW_DX, y + SHADOW_DY)
        if p in sil:
            continue
        put(p, C_SHADE)

    # 2) 윤곽선
    for p in ring:
        put(p, C_LINE)

    # 3) 글자 면 + 베벨
    for (x, y) in mask:
        base = band(y)
        up = (x, y - 1) in mask
        lf = (x - 1, y) in mask
        dn = (x, y + 1) in mask
        rt = (x + 1, y) in mask
        if not up or not lf:
            col = BRIGHTER[base]
        elif not dn or not rt:
            col = DARKER[base]
        else:
            col = base
        put((x, y), col)

    return px


if __name__ == '__main__':
    text = (sys.argv[1] if len(sys.argv) > 1 else 'KINGSAN-RUN').upper()
    px = build(text)
    out = os.path.join(ROOT, 'assets', 'title.png')
    write_png(out, px)
    print('%s  ->  %s  (%dx%d)' % (text, out, len(px[0]), len(px)))

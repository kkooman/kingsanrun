#!/usr/bin/env python3
"""
상점 간판 글자를 바꾼다.

  building_01  우리재래시장   -> 도깨비시장
  building_02  제일상회       -> 와플대학
  building_03  스타노래방     -> 똥냄새노래방
  building_03  행운미용실     -> 최헤어필
  building_04  싱싱야채·청과  -> ㅇㅇㅅㅋㄹ
  building_05  엄마손만두     -> 맛깔 (로고) 식당

원본은 assets/orig/ 에 백업한다. 다시 실행해도 항상 원본에서 시작하므로
글자만 고쳐서 몇 번이든 돌릴 수 있다.

  python3 tools/retext_buildings.py
"""
import os
import shutil
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pngio import read_png, write_png, hexc
from hangul9 import mask, size, G6

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = os.path.join(ROOT, 'assets')
ORIG = os.path.join(A, 'orig')

NEI4 = ((1, 0), (-1, 0), (0, 1), (0, -1))
NEI8 = NEI4 + ((1, 1), (1, -1), (-1, 1), (-1, -1))


def backup(name):
    """원본을 assets/orig/ 에 보관하고, 이후에는 그 원본을 읽는다."""
    os.makedirs(ORIG, exist_ok=True)
    src = os.path.join(A, name)
    keep = os.path.join(ORIG, name)
    if not os.path.exists(keep):
        shutil.copy2(src, keep)
    return read_png(keep)


def fill_rect(px, x0, y0, x1, y1, color):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            px[y][x] = color


def restore_rows(px, src, x0, y0, x1, y1, src_rows):
    """세로 줄무늬처럼 열에만 의존하는 배경을 위쪽/아래쪽 깨끗한 행에서 복사.
       src_rows 는 y % len(src_rows) 순서로 쓸 원본 행 번호."""
    n = len(src_rows)
    for y in range(y0, y1 + 1):
        sy = src_rows[y % n]
        for x in range(x0, x1 + 1):
            px[y][x] = src[sy][x]


def layout(cells_span, n, glyph_w, advance=None):
    """글자 수에 맞춰 셀 x 좌표를 원래 영역 가운데에 배치."""
    sx, ex = cells_span
    if advance is None:
        advance = glyph_w + 1
    total = (n - 1) * advance + glyph_w
    start = sx + ((ex - sx + 1) - total) // 2
    return [start + i * advance for i in range(n)]


def _fill_holes(core, grown, color, px, clip):
    """테두리로 완전히 둘러싸인 배경 구멍을 색으로 메운다.
       (ㅇ 같은 닫힌 글자 안쪽에 배경이 비쳐 보이는 것을 막는다)"""
    if not grown:
        return
    xs = [p[0] for p in grown]; ys = [p[1] for p in grown]
    x0, x1 = min(xs) - 1, max(xs) + 1
    y0, y1 = min(ys) - 1, max(ys) + 1
    outside = set()
    stack = [(x0, y0)]
    while stack:
        p = stack.pop()
        if p in outside or p in grown or p in core:
            continue
        if not (x0 <= p[0] <= x1 and y0 <= p[1] <= y1):
            continue
        outside.add(p)
        stack.extend([(p[0] + 1, p[1]), (p[0] - 1, p[1]),
                      (p[0], p[1] + 1), (p[0], p[1] - 1)])
    cx0, cy0, cx1, cy1 = clip
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            p = (x, y)
            if p in outside or p in grown or p in core:
                continue
            if cx0 <= x <= cx1 and cy0 <= y <= cy1:
                px[y][x] = color


def draw_text(px, text, cells, top, colors, borders, table=None, clip=None,
              fill_holes=False):
    """글자를 찍고, borders 에 준 색으로 한 겹씩 바깥으로 테두리를 두른다.

       colors  : 글자마다의 채움색 리스트(길이 = len(text))
       borders : [(색, 이웃정의), …] 안쪽부터 바깥쪽 순서
       clip    : (x0, y0, x1, y1) 이 범위 밖으로는 그리지 않는다
    """
    H = len(px); W = len(px[0])
    if clip is None:
        clip = (0, 0, W - 1, H - 1)
    cx0, cy0, cx1, cy1 = clip

    core = set()
    for ch, x0 in zip(text, cells):
        for (dx, dy) in mask(ch, table):
            core.add((x0 + dx, top + dy))

    inside = lambda p: cx0 <= p[0] <= cx1 and cy0 <= p[1] <= cy1

    # 바깥 테두리부터 그려서 안쪽이 위에 오게 한다
    layers = []
    grown = set(core)
    for color, nei in borders:
        ring = set()
        for (x, y) in grown:
            for dx, dy in nei:
                p = (x + dx, y + dy)
                if p not in grown:
                    ring.add(p)
        layers.append((color, ring))
        grown |= ring
    if fill_holes and layers:
        _fill_holes(core, grown, layers[-1][0], px, clip)

    for color, ring in reversed(layers):
        for p in ring:
            if inside(p):
                px[p[1]][p[0]] = color

    # 글자 본체
    for ch, x0, col in zip(text, cells, colors):
        for (dx, dy) in mask(ch, table):
            p = (x0 + dx, top + dy)
            if inside(p):
                px[p[1]][p[0]] = col


# ── 색 ───────────────────────────────────────────────────────
WHITE   = hexc('#ffffff')
NAVY    = hexc('#1b3d67')
INK     = hexc('#2f2d2d')
CREAM   = hexc('#e9dada')
SIGNBLU = hexc('#295fa1')
YELLOW  = hexc('#ecbc1e')
PLATE   = hexc('#4e4949')
PLATEIN = hexc('#3a3636')
SIGNYEL = hexc('#ecbc1e')
OUTWHT  = hexc('#f2efe7')
B_BLUE  = hexc('#2e69b3')
B_GREEN = hexc('#6cb840')
B_RED   = hexc('#d93252')
CIRCLE  = hexc('#bf5454')
TRANS   = (0, 0, 0, 0)


def job_01():
    """우리재래시장 -> 도깨비시장 (하늘 위에 뜬 흰 글자, 남색+검정 테두리)"""
    name = 'building_01.png'
    w, h, src = backup(name)
    px = [row[:] for row in src]
    fill_rect(px, 21, 0, 85, 10, TRANS)
    text = '도깨비시장'
    # 테두리가 3겹(흰+남색+검정)이라 자간 1px 로는 글자끼리 붙는다
    cells = layout((24, 82), len(text), 9, advance=12)
    draw_text(px, text, cells, 2, [WHITE] * len(text),
              [(NAVY, NEI4), (INK, NEI4)], clip=(6, 0, 99, 10))
    write_png(os.path.join(A, name), px)
    return name, text, cells


def job_02():
    """제일상회 -> 와플대학 (파란 간판, 크림색 글자)"""
    name = 'building_02.png'
    w, h, src = backup(name)
    px = [row[:] for row in src]
    # 간판 배경은 열에만 의존하는 세로 줄무늬 -> 깨끗한 41행을 복사
    restore_rows(px, src, 11, 42, 72, 52, [41])
    text = '와플대학'
    cells = layout((23, 61), len(text), 9)
    draw_text(px, text, cells, 43, [CREAM] * len(text),
              [(SIGNBLU, NEI4)], clip=(11, 41, 72, 53))
    write_png(os.path.join(A, name), px)
    return name, text, cells


def job_03():
    """스타노래방 -> 똥냄새노래방, 행운미용실 -> 최헤어필"""
    name = 'building_03.png'
    w, h, src = backup(name)
    px = [row[:] for row in src]

    # (1) 벽돌 배경은 y 방향 주기 4 -> 15..18행에서 복사
    restore_rows(px, src, 9, 4, 110, 14, [16, 17, 18, 15])
    top_text = '똥냄새노래방'
    top_cells = layout((28, 92), len(top_text), 9, advance=12)
    # 앞 세 글자는 크림, 뒤 '노래방' 은 원본처럼 노란색
    top_colors = [CREAM, CREAM, CREAM, YELLOW, YELLOW, YELLOW]
    draw_text(px, top_text, top_cells, 5, top_colors,
              [(INK, NEI4)], clip=(9, 3, 110, 15))

    # (2) 회색 명판은 단색
    fill_rect(px, 46, 56, 106, 68, PLATE)
    plate_text = '최헤어필'
    plate_cells = layout((52, 100), len(plate_text), 9)
    draw_text(px, plate_text, plate_cells, 58, [CREAM] * len(plate_text),
              [(PLATEIN, NEI4)], clip=(45, 56, 107, 68))

    write_png(os.path.join(A, name), px)
    return name, top_text + ' / ' + plate_text, top_cells + plate_cells


def job_04():
    """싱싱야채·청과 -> ㅇㅇㅅㅋㄹ (노란 간판, 색 낱자 + 흰 테두리)"""
    name = 'building_04.png'
    w, h, src = backup(name)
    px = [row[:] for row in src]
    fill_rect(px, 6, 10, 79, 19, SIGNYEL)
    text = 'ㅇㅇㅅㅋㄹ'
    gw, gh = size(text[0], G6)
    cells = layout((13, 75), len(text), gw, advance=gw + 6)
    colors = [B_BLUE, B_BLUE, B_GREEN, B_GREEN, B_RED]
    draw_text(px, text, cells, 12, colors,
              [(OUTWHT, NEI8)], table=G6, clip=(6, 10, 79, 19), fill_holes=True)
    write_png(os.path.join(A, name), px)
    return name, text, cells


def job_05():
    """엄마손만두 -> 맛깔 (빨간 원 로고) 식당"""
    name = 'building_05.png'
    w, h, src = backup(name)
    px = [row[:] for row in src]

    # 원 안의 '손' 글자를 지워 순수한 빨간 원으로 만든다 (행별 좌우 끝 사이만 채움)
    for y in range(9, 22):
        xs = [x for x in range(w) if src[y][x] == CIRCLE]
        if xs:
            fill_rect(px, min(xs), y, max(xs), y, CIRCLE)

    # 원 왼쪽/오른쪽 글자 영역을 간판 크림색으로 초기화
    fill_rect(px, 27, 10, 49, 21, CREAM)
    fill_rect(px, 67, 10, 89, 21, CREAM)

    left, right = '맛깔', '식당'
    lc = layout((29, 47), 2, 9)
    rc = layout((69, 87), 2, 9)
    draw_text(px, left, lc, 11, [INK] * 2, [], clip=(27, 10, 49, 21))
    draw_text(px, right, rc, 11, [INK] * 2, [], clip=(67, 10, 89, 21))

    write_png(os.path.join(A, name), px)
    return name, left + ' ● ' + right, lc + rc


if __name__ == '__main__':
    for job in (job_01, job_02, job_03, job_04, job_05):
        name, text, cells = job()
        print('  %-18s %-16s cells=%s' % (name, text, cells))
    print('\n원본은 assets/orig/ 에 보관되어 있다.')

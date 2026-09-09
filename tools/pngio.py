"""의존성 없는 최소 PNG 읽기/쓰기 (8bit, RGBA 로 통일)."""
import zlib, struct


def read_png(path):
    d = open(path, 'rb').read()
    assert d[:8] == b'\x89PNG\r\n\x1a\n', path
    pos, idat, plte, trns = 8, b'', None, None
    w = h = ct = 0
    while pos < len(d):
        ln, = struct.unpack('>I', d[pos:pos + 4])
        typ = d[pos + 4:pos + 8]
        data = d[pos + 8:pos + 8 + ln]
        pos += 12 + ln
        if typ == b'IHDR':
            w, h, bd, ct, _, _, _ = struct.unpack('>IIBBBBB', data)
            assert bd == 8, '8bit PNG 만 지원'
        elif typ == b'IDAT':
            idat += data
        elif typ == b'PLTE':
            plte = data
        elif typ == b'tRNS':
            trns = data
        elif typ == b'IEND':
            break

    raw = zlib.decompress(idat)
    bpp = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}[ct]
    stride = w * bpp
    out = bytearray(h * stride)
    prev = bytearray(stride)
    p = 0
    for y in range(h):
        f = raw[p]; p += 1
        line = bytearray(raw[p:p + stride]); p += stride
        if f == 1:
            for i in range(bpp, stride):
                line[i] = (line[i] + line[i - bpp]) & 255
        elif f == 2:
            for i in range(stride):
                line[i] = (line[i] + prev[i]) & 255
        elif f == 3:
            for i in range(stride):
                a = line[i - bpp] if i >= bpp else 0
                line[i] = (line[i] + ((a + prev[i]) >> 1)) & 255
        elif f == 4:
            for i in range(stride):
                a = line[i - bpp] if i >= bpp else 0
                b = prev[i]
                c = prev[i - bpp] if i >= bpp else 0
                pa, pb, pc = abs(b - c), abs(a - c), abs(a + b - 2 * c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                line[i] = (line[i] + pr) & 255
        out[y * stride:(y + 1) * stride] = line
        prev = line

    px = []
    for y in range(h):
        row = []
        for x in range(w):
            o = y * stride + x * bpp
            if ct == 6:
                row.append(tuple(out[o:o + 4]))
            elif ct == 2:
                row.append((out[o], out[o + 1], out[o + 2], 255))
            elif ct == 0:
                v = out[o]; row.append((v, v, v, 255))
            elif ct == 4:
                v = out[o]; row.append((v, v, v, out[o + 1]))
            else:
                i = out[o]
                r, g, b = plte[i * 3:i * 3 + 3]
                a = trns[i] if (trns and i < len(trns)) else 255
                row.append((r, g, b, a))
        px.append(row)
    return w, h, px


def write_png(path, px):
    h = len(px); w = len(px[0])
    raw = bytearray()
    for y in range(h):
        raw.append(0)
        for x in range(w):
            r, g, b, a = px[y][x]
            raw += bytes((r, g, b, a)) if a else b'\x00\x00\x00\x00'

    def chunk(t, d):
        return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)

    open(path, 'wb').write(
        b'\x89PNG\r\n\x1a\n'
        + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0))
        + chunk(b'IDAT', zlib.compress(bytes(raw), 9))
        + chunk(b'IEND', b''))


def blank(w, h):
    return [[(0, 0, 0, 0)] * w for _ in range(h)]


def hexc(s, a=255):
    s = s.lstrip('#')
    return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16), a)

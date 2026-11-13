"""
Makes the face every downloaded document prints in (site/src/doc/face.ts and face-bytes.ts) from IBM Plex Sans
(SIL Open Font License 1.1; npm @ibm/plex-sans 1.1.0, its fonts/complete/woff files). Run once when the face or its
letters change, with fontTools and brotli installed:

    npm pack @ibm/plex-sans@1.1.0 && tar xzf ibm-plex-sans-1.1.0.tgz
    python3 scripts/make-face.py package/fonts/complete/woff

Regular and SemiBold, cut to the letters a document prints (Latin, the rupee sign, dashes, quotes, arrows, the maths
signs) with no hinting; their figures are tabular (all one width) by default. Also two tiny woff2 files of the rupee
sign alone, for the screen's body face (Figtree has none): site/public/fonts/rupee-*.woff2.
"""
import base64, io, sys
from fontTools.ttLib import TTFont
from fontTools import subset

SRC = sys.argv[1]
UNICODES = ('U+20-7E,U+A0-FF,U+100-17F,U+192,U+2C6,U+2DC,U+2010-2027,U+2030,U+2032-2033,U+2039-203A,U+20AC,U+20B9,'
            'U+2122,U+2190-2193,U+2212,U+2264-2265')
WEIGHTS = {'R': 'Regular', 'B': 'SemiBold'}

def cut(weight, unicodes, flavor=None):
    opts = subset.Options()
    opts.hinting = False
    opts.layout_features = []
    opts.name_IDs = ['*']
    opts.notdef_outline = True
    opts.drop_tables += ['GPOS', 'GSUB', 'GDEF', 'DSIG', 'FFTM']
    opts.flavor = flavor
    font = TTFont(f'{SRC}/IBMPlexSans-{weight}.woff')
    s = subset.Subsetter(opts)
    s.populate(unicodes=subset.parse_unicodes(unicodes))
    s.subset(font)
    out = io.BytesIO()
    font.flavor = flavor
    font.save(out)
    return out.getvalue()

faces = {k: cut(w, UNICODES) for k, w in WEIGHTS.items()}
fonts = {k: TTFont(io.BytesIO(b)) for k, b in faces.items()}
order = fonts['R'].getGlyphOrder()
assert order == fonts['B'].getGlyphOrder(), 'the two weights must share their glyph order'
cmap = fonts['R'].getBestCmap()
chars = sorted(cmap)

def metrics(f):
    head, os2, hhea = f['head'], f['OS/2'], f['hhea']
    assert head.unitsPerEm == 1000
    return {'ascent': hhea.ascent, 'descent': hhea.descent, 'capHeight': os2.sCapHeight,
            'bbox': [head.xMin, head.yMin, head.xMax, head.yMax], 'stemV': 80 if os2.usWeightClass < 500 else 120}

text = ''.join(chr(c) for c in chars)
js = lambda s: s.replace('\\', '\\\\').replace("'", "\\'")
lines = [
    '/**',
    ' * The face every downloaded document prints in: IBM Plex Sans, Regular and SemiBold (SIL Open Font License 1.1,',
    " * site/src/doc/fonts/OFL-IBM-Plex.txt), cut to the letters a document prints. Here only its measures: the glyph that",
    ' * draws each character and how wide each glyph is, in thousandths of the size; the font files are in face-bytes.ts,',
    ' * loaded with the writers at the download. Made by scripts/make-face.py; not edited by hand.',
    ' */',
    "export type Font = 'R' | 'B';",
    '/** Every character the face draws, in order. */',
    f"export const CHARS = '{js(text)}';",
    '/** The glyph of each of CHARS (the same in both weights). */',
    f"export const GLYPHS = [{','.join(str(order.index(cmap[c])) for c in chars)}];",
    '/** Each glyph\'s width, by its number, in each weight. */',
    'export const ADVANCES: Record<Font, number[]> = {',
    *[f"  {k}: [{','.join(str(f['hmtx'][g][0]) for g in order)}]," for k, f in fonts.items()],
    '};',
    "export const METRICS: Record<Font, { name: string; ascent: number; descent: number; capHeight: number; bbox: number[]; stemV: number }> = {",
    *[f"  {k}: {{ name: 'IBMPlexSans-{WEIGHTS[k]}', " + ', '.join(f'{n}: {v}' for n, v in metrics(f).items()) + ' },' for k, f in fonts.items()],
    '};',
    '',
]
open('site/src/doc/face-metrics.ts', 'w').write('\n'.join(lines))
b64 = {k: base64.b64encode(b).decode() for k, b in faces.items()}
open('site/src/doc/face-bytes.ts', 'w').write('\n'.join([
    '/**',
    ' * The two TrueType files of the face (face-metrics.ts), as base64: about 25 KB each, cut to the letters a document',
    ' * prints. Loaded only with the writers, at the download. Made by scripts/make-face.py; not edited by hand.',
    ' */',
    "import type { Font } from './face-metrics';",
    'export const FACE_FILES: Record<Font, string> = {',
    *[f"  {k}: '{v}'," for k, v in b64.items()],
    '};',
    '',
]))
for k, w in WEIGHTS.items():
    open(f'site/public/fonts/rupee-{w.lower()}.woff2', 'wb').write(cut(w, 'U+20B9', 'woff2'))
print(len(chars), 'characters,', len(order), 'glyphs;', {k: len(b) for k, b in faces.items()}, 'bytes')

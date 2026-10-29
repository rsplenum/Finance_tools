"""Builds mockup.html (published as an artifact; not committed): mockup.src.html with the site's two fonts (base64) and data.json inlined.
Run `npx jiti docs/design-reviews/2026-10-29-or11b/data.ts` first: it writes data.json from the engine."""
import base64, json, pathlib
here = pathlib.Path(__file__).parent
fonts = here.parents[2] / 'site/public/fonts'
b64 = lambda p: base64.b64encode(p.read_bytes()).decode()
html = (here / 'mockup.src.html').read_text()
html = html.replace('__FIGTREE__', b64(fonts / 'figtree-latin.woff2')).replace('__ANEK__', b64(fonts / 'anek-latin.woff2'))
html = html.replace('__DATA__', json.dumps(json.loads((here / 'data.json').read_text()), separators=(',', ':')))
(here / 'mockup.html').write_text(html)
print(len(html) // 1024, 'KB')

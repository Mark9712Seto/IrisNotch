"""Impacchetta app/ui in un solo file HTML (demo da aprire nel browser, con il finto Hermes)."""
import pathlib, re
ui = pathlib.Path(__file__).resolve().parent.parent / "app" / "ui"
out = pathlib.Path(__file__).resolve().parent.parent / "design" / "isola-demo.html"
html = (ui / "index.html").read_text(encoding="utf-8")
html = html.replace('<link rel="stylesheet" href="styles.css">', "<style>\n" + (ui / "styles.css").read_text(encoding="utf-8") + "\n</style>")
def inline(m):
    return "<script>\n" + (ui / m.group(1)).read_text(encoding="utf-8") + "\n</script>"
html = re.sub(r'<script src="([^"]+)"></script>', inline, html)
html = html.replace("<title>Iris</title>", "<title>Isola di Iris (demo)</title>")
out.write_text(html, encoding="utf-8")
print(out, len(html) // 1024, "KB")

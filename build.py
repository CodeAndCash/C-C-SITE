from pathlib import Path
import json
d = Path(__file__).parent
import re
css = re.sub(r"/\*.*?\*/\n?", "", (d/"src/style.css").read_text(), flags=re.S); body = re.sub(r"<!--.*?-->\n?", "", (d/"src/body.html").read_text(), flags=re.S)
js = re.sub(r"(?m)^[ \t]*//.*\n", "", (d/"src/app.js").read_text())
settings = json.loads((d/"site/settings.json").read_text())
DEF = '<script type="application/json" id="cc-default">' + json.dumps(settings, ensure_ascii=False).replace("</", "<\\/") + '</script>'
FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link href="https://fonts.googleapis.com/css2?family=Geologica:wght@400;500;600;700&family=Golos+Text:wght@400;500;600&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">'
PRE = '<script>(function(){var m;try{m=localStorage.getItem("cc-theme")}catch(e){}if(m!=="light"&&m!=="dark")m=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";document.documentElement.setAttribute("data-mode",m)})()</script>'
MAP = '<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.185.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.185.0/examples/jsm/"}}</script>'
(d/"artifact.html").write_text(f"<title>Code&amp;Cash</title>\n<link rel=\"icon\" href=\"icons/favicon-32.png\">\n{PRE}\n{FONTS}\n<style>\n{css}\n</style>\n{MAP}\n{DEF}\n{body}\n<script type=\"module\">\n{js}\n</script>\n")
(d/"site/index.html").write_text(f"""<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Code&amp;Cash — заработок на AI</title>
<meta name="description" content="Бесплатный марафон, команда C&amp;C Family и Parser C&amp;C: как делать сайты и ботов с нейросетями и находить под них клиентов.">
<meta name="theme-color" content="#151619">
<script>window.va = window.va || function () {{ (window.vaq = window.vaq || []).push(arguments); }};</script>
<script defer src="/_vercel/insights/script.js"></script>
<meta property="og:title" content="Code&amp;Cash — заработок на AI">
<meta property="og:description" content="Бесплатный марафон, команда C&amp;C Family и Parser C&amp;C.">
<meta property="og:image" content="icons/icon-512.png">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icons/favicon-32.png" sizes="32x32" media="(prefers-color-scheme: dark)">
<link rel="icon" href="icons/favicon-dark-32.png" sizes="32x32" media="(prefers-color-scheme: light)">
<link rel="icon" href="icons/favicon-48.png" sizes="48x48">
<link rel="apple-touch-icon" href="icons/icon-180.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Code&amp;Cash">
{PRE}
{FONTS}
<style>
{css}
</style>
{MAP}
{DEF}
</head>
<body>
{body}
<script type="module">
{js}
</script>
</body>
</html>
""")
print("ok", len((d/"site/index.html").read_text()))

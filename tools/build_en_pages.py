#!/usr/bin/env python3
"""Generate the English pages under en/ from the Arabic pages.

The Arabic pages are the single source for structure, prices, sizes and
images. This tool rewrites paths/metadata for /en/ and swaps the Arabic text
for English using the maps in tools/en_text/. Numbers pass through, so a
price change in the Arabic page flows to English by re-running:

    python3 tools/build_en_pages.py

It fails loudly if any Arabic text is left untranslated.
"""
import re, sys, pathlib, importlib.util

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = "https://globalmarketingrealestate.com"
TEXT_DIR = pathlib.Path(__file__).resolve().parent / "en_text"

def load(name):
    spec = importlib.util.spec_from_file_location(name, TEXT_DIR / (name + ".py"))
    mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
    return mod

LEFT, RIGHT = "15 18 9 12 15 6", "9 18 15 12 9 6"   # chevron polylines

def structural(html, slug):
    s = html
    def must(old, new, count=None):
        nonlocal s
        n = s.count(old)
        if n == 0 or (count is not None and n != count):
            sys.exit("%s: expected %s of %r, found %d" % (slug, count or ">=1", old, n))
        s = s.replace(old, new)
    must('<html lang="ar" dir="rtl">', '<html lang="en" dir="ltr">', 1)
    must(' dir="rtl" lang="ar"', ' dir="ltr" lang="en"')
    must('content="ar_AR"', 'content="en_US"', 1)
    must('"inLanguage": "ar"', '"inLanguage": "en"', 1)
    # URLs of this page -> /en/slug ; breadcrumb home -> /en/
    s = s.replace(SITE + "/" + slug, SITE + "/en/" + slug)
    must('"item": "%s/" }' % SITE, '"item": "%s/en/" }' % SITE, 1)
    must('<a class="ft-brand" href="%s/"' % SITE, '<a class="ft-brand" href="%s/en/"' % SITE, 1)
    # hreflang pair: the Arabic page declares ar/en/x-default; mirror it here.
    must('hreflang="ar" href="%s/en/%s"' % (SITE, slug), 'hreflang="ar" href="%s/%s"' % (SITE, slug), 1)
    must('hreflang="x-default" href="%s/en/%s"' % (SITE, slug), 'hreflang="x-default" href="%s/%s"' % (SITE, slug), 1)
    # assets live one level up
    s = re.sub(r'(href|src)="(css|js|images)/', r'\1="../\2/', s)
    s = s.replace("url(images/", "url(../images/")
    must('src="../js/script.js?', 'src="../js/script.en.js?', 1)
    s = re.sub(r'(<link rel="stylesheet" href="\.\./css/interactions\.css\?v=([^"]+)">)',
               r'\1\n<link rel="stylesheet" href="../css/en.css?v=\2">', s, count=1)
    # language switch: Arabic page links to en/slug, English page links back
    must('<a class="lang-switch" href="en/%s" hreflang="en" lang="en">English</a>' % slug,
         '<a class="lang-switch" href="../%s" hreflang="ar" lang="ar">العربية</a>' % slug, 1)
    # mirror chevrons for left-to-right reading
    s = s.replace(LEFT, "\0").replace(RIGHT, LEFT).replace("\0", RIGHT)
    return s

def structural_simple(html, slug):
    """Utility pages (thank-you, privacy, home) saved from the old CMS: minified
    markup with unquoted attributes, so they get their own lighter transform."""
    s = html
    n = s.count("dir=rtl lang=ar")
    if n == 0:
        sys.exit("%s: no dir=rtl lang=ar wrapper found" % slug)
    s = s.replace("dir=rtl lang=ar", "dir=ltr lang=en")
    if slug == "index":
        if s.count("<link rel=canonical href=%s/>" % SITE) != 1:
            sys.exit("index: canonical not found")
        s = s.replace("<link rel=canonical href=%s/>" % SITE, "<link rel=canonical href=%s/en/>" % SITE)
        sw = '<a class="lang-switch lang-switch--light" href="en/" hreflang="en" lang="en">English</a>'
        if s.count(sw) != 1:
            sys.exit("index: language switch not found")
        s = s.replace(sw, '<a class="lang-switch lang-switch--light" href="../" hreflang="ar" lang="ar">العربية</a>')
    else:
        s = s.replace("href=%s/%s>" % (SITE, slug), "href=%s/en/%s>" % (SITE, slug))
    s = re.sub(r'(href|src)="(css|js|images)/', r'\1="../\2/', s)
    s = re.sub(r'\bsrc=(images/)', r'src=../\1', s)
    if s.count('src="../js/script.js?') != 1:
        sys.exit("%s: script tag not found" % slug)
    s = s.replace('src="../js/script.js?', 'src="../js/script.en.js?')
    s = s.replace('src="../js/projects.js?', 'src="../js/projects.en.js?')
    s, k = re.subn(r'(<link rel="stylesheet" href="\.\./css/interactions\.css\?v=([^"]+)">)',
                   r'\1\n<link rel="stylesheet" href="../css/en.css?v=\2">', s, count=1)
    if k != 1:
        sys.exit("%s: interactions.css link not found" % slug)
    s = s.replace("href=/>", "href=/en/>")
    s = s.replace(LEFT, "\0").replace(RIGHT, LEFT).replace("\0", RIGHT)
    return s

def translate(s, slug, maps):
    for m in maps:
        for pat, repl in getattr(m, "REGEX", []):
            s, n = re.subn(pat, repl, s)
            if n == 0 and not getattr(m, "OPTIONAL_REGEX", False):
                sys.exit("%s: regex no longer matches, update tools/en_text: %s" % (slug, pat))
    strings = {}
    for m in maps:
        strings.update(m.STRINGS)
    for ar in sorted(strings, key=len, reverse=True):
        s = s.replace(ar, strings[ar])
    probe = re.sub(r'<a class="lang-switch[^>]*>العربية</a>', "", s)
    left = sorted(set(re.findall(r"[؀-ۿ][؀-ۿ ،؟]*", probe)))
    if left:
        sys.exit("%s: untranslated Arabic left:\n  %s" % (slug, "\n  ".join(left)))
    return s

def main():
    common = load("common")
    (ROOT / "en").mkdir(exist_ok=True)
    for path in sorted(TEXT_DIR.glob("*.py")):
        slug = path.stem.replace("_", "-")
        if slug == "common":
            continue
        page = load(path.stem)
        src = (ROOT / (slug + ".html")).read_text(encoding="utf-8")
        shape = structural_simple if getattr(page, "SIMPLE", False) else structural
        out = translate(shape(src, slug), slug, [page, common])
        (ROOT / "en" / (slug + ".html")).write_text(out, encoding="utf-8", newline="")
        print("wrote en/%s.html" % slug)

if __name__ == "__main__":
    main()

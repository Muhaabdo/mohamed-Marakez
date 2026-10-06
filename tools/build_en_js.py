#!/usr/bin/env python3
"""Generate js/script.en.js from js/script.js.

js/script.js is the single source of logic. This tool only swaps the Arabic
UI strings for English ones, so the Arabic site is never touched. Re-run it
whenever js/script.js changes:  python3 tools/build_en_js.py
It fails if any Arabic text is left untranslated.
"""
import re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC, OUT = ROOT / "js" / "script.js", ROOT / "js" / "script.en.js"

STRINGS = {
    "جاري الإرسال…": "Sending…",
    "احصل على قائمة الأسعار": "Get the price list",
    "قائمة الأسعار": "Price list",
    "إغلاق": "Close",
    "سيبلنا بياناتك ونبعتلك أحدث الأسعار وأنظمة التقسيط ونتواصل معاك خلال دقائق.": "Leave your details and we will send you the latest prices and payment plans within minutes.",
    "اكتب اسمك بالكامل": "Your full name",
    "الاسم": "Name",
    "مثال: +20 100 123 4567": "e.g. +20 100 123 4567",
    "رقم الموبايل مش صحيح، اكتبه كامل ومعاه كود الدولة لو بره مصر": "Please enter a valid phone number, including the country code if you are outside Egypt",
    "رقم الموبايل": "Mobile number",
    "المشروع اللي يهمك": "Project of interest",
    "اختار المشروع": "Select a project",
    "بيانات اختيارية تساعدنا نرشحلك الأنسب": "Optional details that help us recommend the right unit",
    "القسط الشهري": "Monthly installment",
    "المقدم المتاح": "Available down payment",
    "بتسجيلك بتوافق على <a href=\"privacy-policy\">سياسة الخصوصية</a>. بياناتك آمنة ومش هتتشارك إلا مع المطوّر المختص.": "By submitting you agree to the <a href=\"privacy-policy\">Privacy Policy</a>. Your data is safe and shared only with the relevant developer.",
    "بتسجيلك بتوافق على <a href=\"privacy-policy\">سياسة الخصوصية</a>": "By submitting you agree to the <a href=\"privacy-policy\">Privacy Policy</a>",
    "أسعار وخطط سداد": "Prices & payment plans",
    "سيبلنا اسمك ورقمك ونبعتلك الأسعار وخطط السداد خلال دقائق.": "Leave your name and number and we will send you prices and payment plans within minutes.",
    "ابعتلي الأسعار وخطط السداد": "Send me prices and payment plans",
    "الأسعار وخطط السداد": "Prices and payment plans",
    "الكل": "All",
    "السابق": "Previous",
    "التالي": "Next",
    "إشعار الكوكيز": "Cookie notice",
    "بنستخدم الكوكيز لتحسين تجربتك وقياس أداء الموقع. <a class=\"ck-link\" href=\"privacy-policy\">سياسة الخصوصية</a>": "We use cookies to improve your experience and measure site performance. <a class=\"ck-link\" href=\"privacy-policy\">Privacy Policy</a>",
    "موافق": "OK",
    "شقتك جاهزة للاستلام في قلب القاهرة الجديدة": "Your ready-to-move apartment in the heart of New Cairo",
    "نبعتلك أسعار District 5 وخطط السداد على الواتساب": "We will send you District 5 prices and payment plans on WhatsApp",
    "شقق وفيلات في قلب التجمع السادس": "Apartments and villas in the heart of the 6th Settlement",
    "نبعتلك أسعار Crescent Walk وخطط السداد على الواتساب": "We will send you Crescent Walk prices and payment plans on WhatsApp",
    "بيتك على بحر رأس الحكمة — متشطب بالكامل": "Your fully finished home on the Ras El Hekma coast",
    "نبعتلك أسعار Ramla وخطط السداد على الواتساب": "We will send you Ramla prices and payment plans on WhatsApp",
    "احجز مكانك بدري في Shams Soma على البحر الأحمر": "Reserve early at Shams Soma on the Red Sea",
    "نبعتلك تفاصيل الوحدات وخطط السداد على الواتساب": "We will send you unit details and payment plans on WhatsApp",
    "احصل على العروض الحالية عن طريق الواتساب": "Get the current offers on WhatsApp",
    "احصل على العروض الحالية": "Get the current offers",
    "ابعتلي العروض": "Send me the offers",
    "مرحبًا، عايز أعرف أسعار وخطط سداد ": "Hello, I would like the prices and payment plans for ",
    "مرحبًا، عايز أعرف أسعار وخطط السداد": "Hello, I would like the prices and payment plans",
    "اتصل بينا": "Call us",
    "كلمنا واتساب": "Chat on WhatsApp",
    "اختار نوع الوحدة واعرف المقدم اللي تبدأ بيه": "Pick a unit type to see the starting down payment",
    "اعرف المقدم اللي تبدأ بيه": "See the starting down payment",
    "اطلب خطة السداد كاملة": "Request the full payment plan",
    "اطلب خطة السداد": "Request the payment plan",
    "خطة السداد": "Payment plan",
    "نظام السداد": "Payment plan",
    "% مقدم — ": "% down — ",
    " سنين": " years",
    "نوع الوحدة": "Unit type",
    "السعر يبدأ من": "Price from",
    "القسط بيتحدد حسب المقدم اللي تختاره ومدة التقسيط": "The installment depends on your down payment and the plan length",
    "الأرقام استرشادية وقابلة للتغيير من المطوّر": "Figures are indicative and subject to change by the developer",
    "ابدأ بأقل مقدم": "Start with the lowest down payment",
    "المقدم (": "Down payment (",
    "%) يبدأ من": "%) from",
    "\"القسط\"": "\"Installment\"",
    "\" على \"": "\" over \"",
    "ج.م": "EGP",
}

# Behaviour differences for the English site.
PATCHES = [
    # Currency before the amount, as on the English cards.
    ('fmt(u.price) + " EGP"', '"EGP " + fmt(u.price)', 1),
    ('fmt(u.price * p.down / 100) + " EGP"', '"EGP " + fmt(u.price * p.down / 100)', 1),
    # Tell the sales team which language the lead used.
    ("pageUrl: window.location.href,", "pageUrl: window.location.href,\n        language: \"en\",", 3),
]

PROJECTS_STRINGS = {
    "رأس الحكمة — الساحل الشمالي": "Ras El Hekma — North Coast",
    "سوما باي — البحر الأحمر": "Soma Bay — Red Sea",
    "القاهرة الجديدة — Zed East و Solana East": "New Cairo — Zed East & Solana East",
    "القاهرة الجديدة": "New Cairo",
    "التجمع السادس": "6th Settlement",
    "مشاريع ORA": "ORA Projects",
    "الأسعار تبدأ من <strong>' + p.startPrice.toLocaleString(\"en-US\") + \" ج.م</strong>": "Prices from <strong>EGP ' + p.startPrice.toLocaleString(\"en-US\") + \"</strong>",
    "اعرف التفاصيل ←": "View details →",
}

def build_projects():
    src = (ROOT / "js" / "projects.js").read_text(encoding="utf-8")
    out = src
    for ar in sorted(PROJECTS_STRINGS, key=len, reverse=True):
        if ar not in out:
            sys.exit("build_en_js: string no longer in projects.js, update PROJECTS_STRINGS: " + ar)
        out = out.replace(ar, PROJECTS_STRINGS[ar])
    out, n = re.subn(r'image: "images/', 'image: "../images/', out)
    if n == 0:
        sys.exit("build_en_js: no image paths found in projects.js")
    left = sorted(set(re.findall(r"[\u0600-\u06FF][\u0600-\u06FF \u060C]*", out)))
    if left:
        sys.exit("build_en_js: untranslated Arabic left in projects.en.js:\n  " + "\n  ".join(left))
    dest = ROOT / "js" / "projects.en.js"
    dest.write_text("/* GENERATED from js/projects.js by tools/build_en_js.py — do not edit by hand. */\n" + out, encoding="utf-8", newline="")
    print("wrote", dest.relative_to(ROOT), len(out), "bytes")

def main():
    build_projects()
    src = SRC.read_text(encoding="utf-8")
    out = src
    for ar in sorted(STRINGS, key=len, reverse=True):
        if ar not in out:
            sys.exit("build_en_js: string no longer in script.js, update STRINGS: " + ar)
        out = out.replace(ar, STRINGS[ar])
    for old, new, count in PATCHES:
        if out.count(old) != count:
            sys.exit("build_en_js: expected %d of %r, found %d" % (count, old, out.count(old)))
        out = out.replace(old, new)
    # mirror the lightbox previous/next chevrons for left-to-right reading
    a, b = "9 18 15 12 9 6", "15 18 9 12 15 6"
    if out.count(a) != 1 or out.count(b) != 1:
        sys.exit("build_en_js: lightbox chevrons changed, review the mirror step")
    out = out.replace(a, "\0").replace(b, a).replace("\0", b)
    left = sorted(set(re.findall(r"[؀-ۿ][؀-ۿ ،]*", out)))
    if left:
        sys.exit("build_en_js: untranslated Arabic left in output:\n  " + "\n  ".join(left))
    header = "/* GENERATED from js/script.js by tools/build_en_js.py — do not edit by hand. */\n"
    OUT.write_text(header + out, encoding="utf-8", newline="")
    print("wrote", OUT.relative_to(ROOT), len(out), "bytes")

if __name__ == "__main__":
    main()

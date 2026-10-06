"""English text for thank-you.html."""
SIMPLE = True
REGEX = [
    (r'(class=ty-wa href="https://wa\.me/\d+\?text=)[^"]+"', r'\1Hello%2C%20I%20just%20submitted%20my%20details%20on%20the%20website%20and%20would%20like%20more%20information"'),
]
STRINGS = {
    "تم استلام بياناتك بنجاح | Global Marketing Real Estate": "We received your details | Global Marketing Real Estate",
    "شكرًا لتواصلك مع Global Marketing Real Estate، فريقنا هيتواصل معاك قريبًا بأحدث الأسعار وأنظمة التقسيط على مشاريع مراكز.": "Thank you for contacting Global Marketing Real Estate. Our team will be in touch shortly with the latest prices and payment plans.",
    "تم استلام بياناتك": "Details received",
    "شكراً لك!": "Thank you!",
    "وصلتنا بياناتك بنجاح، وفريقنا هيتواصل معاك خلال دقائق بأحدث الأسعار وأنظمة التقسيط على مشاريع مراكز.": "We have received your details. Our team will contact you within minutes with the latest prices and payment plans.",
    "مستعجل؟ كلّمنا دلوقتي": "In a hurry? Talk to us now",
    "تواصل على واتساب": "Chat on WhatsApp",
    "العودة للصفحة الرئيسية": "Back to the home page",
}

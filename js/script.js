/* Marakez website interactions: lead-capture modal, project mini-carousels,
   and the projects gallery (tabs + main stage + thumbs + lightbox).
   Rebuilt from scratch: the original site's JS wasn't present in the saved
   pages, only the markup/CSS hooks it used to drive (data-lead-open,
   .mkz-carousel, .mkzg-section, ...). */

(function () {
  "use strict";

  var LEADS_ENDPOINT = "https://script.google.com/macros/s/AKfycbxEXrE6u819hFgPhfzzE8_kyVs1AjZ3d-jCM0UgufpEdeNRmOqvoho2LkVEGX_AsNzVxA/exec";

  /* ---------------- Submit guard (all lead forms) ----------------
     Call after validation passes. Returns false if this form is already
     sending (double click / double Enter), otherwise locks the submit
     button and shows a "sending" state until the redirect happens. */
  function startSending(form) {
    if (form.getAttribute("data-sending") === "1") return false;
    form.setAttribute("data-sending", "1");
    var btn = form.querySelector("[type=submit]");
    if (btn) {
      btn.setAttribute("data-label", btn.innerHTML);
      btn.disabled = true;
      btn.classList.add("is-sending");
      btn.innerHTML = '<span class="send-spinner" aria-hidden="true"></span> جاري الإرسال…';
    }
    return true;
  }

  /* Back button can restore the page from cache with the button still
     locked — reset every form that was mid-send. */
  window.addEventListener("pageshow", function (e) {
    if (!e.persisted) return;
    document.querySelectorAll('form[data-sending="1"]').forEach(function (form) {
      form.removeAttribute("data-sending");
      var btn = form.querySelector("[type=submit]");
      if (btn && btn.hasAttribute("data-label")) {
        btn.innerHTML = btn.getAttribute("data-label");
        btn.disabled = false;
        btn.classList.remove("is-sending");
      }
    });
  });

  /* ---------------- Marketing attribution (gclid / utm_*) ----------------
     The lead sheet has columns for these, so we capture them from the URL
     the first time they appear and keep them in sessionStorage for the rest
     of the visit (in case the lead form is submitted from a later page). */
  function captureAttribution() {
    var params = new URLSearchParams(window.location.search);
    var keys = ["gclid", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
    var stored = {};
    try { stored = JSON.parse(sessionStorage.getItem("mkz_attribution") || "{}"); } catch (e) {}
    keys.forEach(function (key) {
      var value = params.get(key);
      if (value) stored[key] = value;
    });
    try { sessionStorage.setItem("mkz_attribution", JSON.stringify(stored)); } catch (e) {}
    return stored;
  }

  function getAttribution() {
    try { return JSON.parse(sessionStorage.getItem("mkz_attribution") || "{}"); } catch (e) { return {}; }
  }

  function resolveImageSrc(imgEl) {
    if (imgEl.src && !imgEl.src.startsWith("data:")) return imgEl.src;
    var bg = getComputedStyle(imgEl).backgroundImage;
    var match = /url\((['"]?)(.*?)\1\)/.exec(bg);
    return match ? match[2] : imgEl.src;
  }

  /* ---------------- Lead capture modal ---------------- */
  function initLeadModal() {
    var triggers = document.querySelectorAll("[data-lead-open]");
    if (!triggers.length) return;

    var overlay = document.createElement("div");
    overlay.className = "lf-overlay";
    overlay.setAttribute("role", "presentation");
    overlay.innerHTML =
      '<div class="lf-modal" role="dialog" aria-modal="true" aria-label="قائمة الأسعار">' +
        '<button type="button" class="lf-close" aria-label="إغلاق">' +
          '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>' +
        '</button>' +
        '<span class="lf-badge">قائمة الأسعار</span>' +
        '<h2 class="lf-title">احصل على قائمة الأسعار</h2>' +
        '<p class="lf-context"></p>' +
        '<p class="lf-sub">سيبلنا بياناتك ونبعتلك أحدث الأسعار وأنظمة التقسيط ونتواصل معاك خلال دقائق.</p>' +
        '<form class="lf-form" novalidate>' +
          '<div class="lf-field">' +
            '<label class="lf-label" for="lf-name">الاسم <span class="lf-req">*</span></label>' +
            '<input class="lf-input" id="lf-name" name="name" type="text" placeholder="اكتب اسمك بالكامل" autocomplete="name" required>' +
          '</div>' +
          '<div class="lf-field">' +
            '<label class="lf-label" for="lf-phone">رقم الموبايل <span class="lf-req">*</span></label>' +
            '<input class="lf-input" id="lf-phone" name="phone" type="tel" placeholder="مثال: +20 100 123 4567" autocomplete="tel" required>' +
          '</div>' +
          '<div class="lf-field lf-field-project">' +
            '<label class="lf-label" for="lf-project">المشروع اللي يهمك <span class="lf-req">*</span></label>' +
            '<select class="lf-input lf-select" id="lf-project" name="project" required>' +
              '<option value="" disabled selected>اختار المشروع</option>' +
              '<option value="District 5">District 5</option>' +
              '<option value="Crescent Walk">Crescent Walk</option>' +
              '<option value="Ramla">Ramla</option>' +
              '<option value="Shams Soma">Shams Soma</option>' +
            '</select>' +
          '</div>' +
          '<div class="lf-optional-tag"><span>بيانات اختيارية تساعدنا نرشحلك الأنسب</span></div>' +
          '<div class="lf-row">' +
            '<div class="lf-field">' +
              '<label class="lf-label" for="lf-installment">القسط الشهري</label>' +
              '<div class="lf-input-group"><span class="lf-unit">ج.م</span><input class="lf-input" id="lf-installment" name="installment" type="text" inputmode="numeric" placeholder="50,000"></div>' +
            '</div>' +
            '<div class="lf-field">' +
              '<label class="lf-label" for="lf-downpayment">المقدم المتاح</label>' +
              '<div class="lf-input-group"><span class="lf-unit">ج.م</span><input class="lf-input" id="lf-downpayment" name="downpayment" type="text" inputmode="numeric" placeholder="1,000,000"></div>' +
            '</div>' +
          '</div>' +
          '<button class="lf-submit" type="submit">احصل على قائمة الأسعار</button>' +
          '<p class="lf-privacy">بتسجيلك بتوافق على <a href="privacy-policy">سياسة الخصوصية</a>. بياناتك آمنة ومش هتتشارك إلا مع المطوّر المختص.</p>' +
        '</form>' +
      '</div>';
    document.body.appendChild(overlay);

    var modal = overlay.querySelector(".lf-modal");
    var closeBtn = overlay.querySelector(".lf-close");
    var form = overlay.querySelector("form");
    var projectSelect = overlay.querySelector("#lf-project");
    var badgeEl = overlay.querySelector(".lf-badge");
    var titleEl = overlay.querySelector(".lf-title");
    var contextEl = overlay.querySelector(".lf-context");
    var subEl = overlay.querySelector(".lf-sub");
    var submitBtn = overlay.querySelector(".lf-submit");
    var defaults = { badge: badgeEl.textContent, title: titleEl.textContent, sub: subEl.textContent, submit: submitBtn.textContent };
    var currentUnit = "";
    var currentForm = "";
    var lastFocused = null;

    /* unit: set when opened from a unit-type card ([data-unit]) — switches the
       form to a short name + phone version; project and unit are still sent. */
    function open(projectName, unit) {
      lastFocused = document.activeElement;
      if (projectName) {
        var hasOption = Array.prototype.some.call(projectSelect.options, function (o) {
          return o.value === projectName;
        });
        projectSelect.value = hasOption ? projectName : "";
      } else {
        projectSelect.value = "";
      }
      var compact = !!(unit && projectSelect.value);
      currentUnit = compact ? unit : "";
      modal.classList.toggle("lf-compact", compact);
      badgeEl.textContent = compact ? "أسعار وخطط سداد" : defaults.badge;
      titleEl.textContent = compact ? "الأسعار وخطط السداد" : defaults.title;
      contextEl.textContent = compact ? projectSelect.value + " · " + unit : "";
      subEl.textContent = compact ? "سيبلنا اسمك ورقمك ونبعتلك الأسعار وخطط السداد خلال دقائق." : defaults.sub;
      submitBtn.textContent = compact ? "ابعتلي الأسعار وخطط السداد" : defaults.submit;
      overlay.classList.remove("is-closing");
      overlay.classList.add("is-open");
      document.documentElement.style.overflow = "hidden";
      setTimeout(function () {
        overlay.querySelector("#lf-name").focus();
      }, 50);
    }

    function close() {
      overlay.classList.add("is-closing");
      document.documentElement.style.overflow = "";
      setTimeout(function () {
        overlay.classList.remove("is-open", "is-closing");
        if (lastFocused) lastFocused.focus();
      }, 260);
    }

    triggers.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var label = btn.getAttribute("aria-label") || "";
        var project = ["District 5", "Crescent Walk", "Ramla", "Shams Soma"].find(function (p) {
          return label.indexOf(p) !== -1;
        });
        currentForm = btn.getAttribute("data-form") || "";
        open(project, btn.getAttribute("data-unit") || "");
      });
    });

    closeBtn.addEventListener("click", close);
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) close();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && overlay.classList.contains("is-open")) close();
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      if (!startSending(form)) return;

      var attribution = getAttribution();
      var payload = new URLSearchParams({
        name: form.name.value.trim(),
        phone: form.phone.value.trim(),
        project: form.project.value,
        unitType: currentUnit,
        downPayment: form.downpayment.value.trim(),
        installment: form.installment.value.trim(),
        gclid: attribution.gclid || "",
        utmSource: attribution.utm_source || "",
        utmMedium: attribution.utm_medium || "",
        utmCampaign: attribution.utm_campaign || "",
        utmTerm: attribution.utm_term || "",
        utmContent: attribution.utm_content || "",
        pageUrl: window.location.href,
        formType: (currentForm ? currentForm + "_" : currentUnit ? "unit_card_" : "lead_form_") + currentPageKey()
      });

      /* Google Apps Script web apps don't send CORS headers, so the request
         is fired in no-cors mode: it still reaches the script and appends
         the row, we just can't read a response back. */
      fetch(LEADS_ENDPOINT, { method: "POST", mode: "no-cors", body: payload })
        .catch(function () { /* ignore network errors, still forward the user */ })
        .then(function () {
          try { sessionStorage.setItem("mkz_lead_submitted", "1"); } catch (e) {}
          window.location.href = "thank-you";
        });
    });
  }

  /* ---------------- Project mini-carousels (.mkz-carousel) ---------------- */
  function initMiniCarousels() {
    document.querySelectorAll(".mkz-carousel").forEach(function (carousel) {
      var track = carousel.querySelector(".mkz-slides");
      var slides = Array.prototype.slice.call(carousel.querySelectorAll(".mkz-slide"));
      var dots = Array.prototype.slice.call(carousel.querySelectorAll(".mkz-dot"));
      var prevBtn = carousel.querySelector(".mkz-prev");
      var nextBtn = carousel.querySelector(".mkz-next");
      if (!track || slides.length < 2) return;

      var current = Math.max(0, dots.findIndex(function (d) { return d.classList.contains("is-active"); }));
      var autoplayMs = parseInt(carousel.dataset.autoplay, 10) || 0;
      var timer = null;

      function render() {
        track.style.transform = "translateX(-" + current * 100 + "%)";
        dots.forEach(function (d, i) { d.classList.toggle("is-active", i === current); });
      }

      function goTo(index) {
        current = (index + slides.length) % slides.length;
        render();
      }

      function next() { goTo(current + 1); }
      function prev() { goTo(current - 1); }

      function startAutoplay() {
        if (!autoplayMs) return;
        stopAutoplay();
        timer = setInterval(next, autoplayMs);
      }
      function stopAutoplay() {
        if (timer) clearInterval(timer);
        timer = null;
      }

      if (nextBtn) nextBtn.addEventListener("click", function () { next(); startAutoplay(); });
      if (prevBtn) prevBtn.addEventListener("click", function () { prev(); startAutoplay(); });
      dots.forEach(function (dot, i) {
        dot.addEventListener("click", function () { goTo(i); startAutoplay(); });
      });

      carousel.addEventListener("mouseenter", stopAutoplay);
      carousel.addEventListener("mouseleave", startAutoplay);

      var touchStartX = null;
      carousel.addEventListener("touchstart", function (e) {
        touchStartX = e.touches[0].clientX;
        stopAutoplay();
      }, { passive: true });
      carousel.addEventListener("touchend", function (e) {
        if (touchStartX === null) return;
        var dx = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(dx) > 40) {
          if (dx < 0) next(); else prev();
        }
        touchStartX = null;
        startAutoplay();
      });

      render();
      startAutoplay();
    });
  }

  /* ---------------- Projects gallery (.mkzg-section) ---------------- */
  function initGallery() {
    var section = document.querySelector(".mkzg-section");
    if (!section) return;

    var tabs = Array.prototype.slice.call(section.querySelectorAll(".mkzg-tab"));
    var thumbs = Array.prototype.slice.call(section.querySelectorAll(".mkzg-thumb"));
    var mainImg = section.querySelector(".mkzg-main");
    var prevBtn = section.querySelector(".mkzg-prev");
    var nextBtn = section.querySelector(".mkzg-next");
    var curEl = section.querySelector(".mkzg-cur");
    var totalEl = section.querySelector(".mkzg-total");
    var expandBtn = section.querySelector(".mkzg-expand");
    var stage = section.querySelector(".mkzg-stage");
    if (!thumbs.length || !mainImg) return;

    var items = thumbs.map(function (thumb) {
      var img = thumb.querySelector("img");
      return { src: resolveImageSrc(img), alt: img.alt, thumb: thumb };
    });

    var visibleIndexes = items.map(function (_, i) { return i; });
    var current = 0;

    function applyFilter(project) {
      visibleIndexes = [];
      items.forEach(function (item, i) {
        var show = project === "الكل" || item.alt === project;
        item.thumb.style.display = show ? "" : "none";
        if (show) visibleIndexes.push(i);
      });
      showItem(visibleIndexes[0] || 0);
    }

    function showItem(index) {
      current = index;
      var item = items[current];
      mainImg.src = item.src;
      mainImg.alt = item.alt;
      thumbs.forEach(function (t, i) { t.classList.toggle("is-active", i === current); });
      if (curEl) curEl.textContent = String(visibleIndexes.indexOf(current) + 1);
      if (totalEl) totalEl.textContent = String(visibleIndexes.length);
    }

    function step(dir) {
      var pos = visibleIndexes.indexOf(current);
      var nextPos = (pos + dir + visibleIndexes.length) % visibleIndexes.length;
      showItem(visibleIndexes[nextPos]);
    }

    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        tabs.forEach(function (t) { t.classList.remove("is-active"); });
        tab.classList.add("is-active");
        applyFilter(tab.textContent.trim());
      });
    });

    thumbs.forEach(function (thumb, i) {
      thumb.addEventListener("click", function () { showItem(i); });
    });

    if (prevBtn) prevBtn.addEventListener("click", function () { step(-1); });
    if (nextBtn) nextBtn.addEventListener("click", function () { step(1); });

    if (stage) {
      var touchStartX = null;
      stage.addEventListener("touchstart", function (e) { touchStartX = e.touches[0].clientX; }, { passive: true });
      stage.addEventListener("touchend", function (e) {
        if (touchStartX === null) return;
        var dx = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
        touchStartX = null;
      });
    }

    /* Lightbox */
    var lb = section.querySelector(".mkzg-lb") || (function () {
      var el = document.querySelector(".mkzg-lb");
      return el;
    })();
    if (lb) {
      lb.innerHTML =
        '<div class="mkzg-lb-stage">' +
          '<button type="button" class="mkzg-lb-close" aria-label="إغلاق">' +
            '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>' +
          '</button>' +
          '<button type="button" class="mkzg-lb-nav mkzg-lb-prev" aria-label="السابق"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg></button>' +
          '<img class="mkzg-lb-img" alt="">' +
          '<button type="button" class="mkzg-lb-nav mkzg-lb-next" aria-label="التالي"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg></button>' +
          '<span class="mkzg-lb-counter"></span>' +
        '</div>';

      var lbImg = lb.querySelector(".mkzg-lb-img");
      var lbCounter = lb.querySelector(".mkzg-lb-counter");
      var lbClose = lb.querySelector(".mkzg-lb-close");
      var lbPrev = lb.querySelector(".mkzg-lb-prev");
      var lbNext = lb.querySelector(".mkzg-lb-next");

      function syncLightbox() {
        var item = items[current];
        lbImg.src = item.src;
        lbImg.alt = item.alt;
        lbCounter.textContent = (visibleIndexes.indexOf(current) + 1) + " / " + visibleIndexes.length;
      }

      function openLightbox() {
        syncLightbox();
        lb.classList.remove("is-closing");
        lb.classList.add("is-open");
        document.documentElement.style.overflow = "hidden";
      }
      function closeLightbox() {
        lb.classList.add("is-closing");
        document.documentElement.style.overflow = "";
        setTimeout(function () { lb.classList.remove("is-open", "is-closing"); }, 220);
      }

      mainImg.style.cursor = "zoom-in";
      mainImg.addEventListener("click", openLightbox);
      if (expandBtn) expandBtn.addEventListener("click", openLightbox);

      lbClose.addEventListener("click", closeLightbox);
      lb.addEventListener("click", function (e) { if (e.target === lb) closeLightbox(); });
      lbPrev.addEventListener("click", function () { step(-1); syncLightbox(); });
      lbNext.addEventListener("click", function () { step(1); syncLightbox(); });

      document.addEventListener("keydown", function (e) {
        if (!lb.classList.contains("is-open")) return;
        if (e.key === "Escape") closeLightbox();
        if (e.key === "ArrowLeft") { step(-1); syncLightbox(); }
        if (e.key === "ArrowRight") { step(1); syncLightbox(); }
      });

      var lbTouchStartX = null;
      lb.addEventListener("touchstart", function (e) { lbTouchStartX = e.touches[0].clientX; }, { passive: true });
      lb.addEventListener("touchend", function (e) {
        if (lbTouchStartX === null) return;
        var dx = e.changedTouches[0].clientX - lbTouchStartX;
        if (Math.abs(dx) > 40) { step(dx < 0 ? 1 : -1); syncLightbox(); }
        lbTouchStartX = null;
      });
    }

    showItem(0);
  }

  /* ---------------- Cookie / privacy notice ----------------
     Informational only (no tracking is tied to it). Shows once per
     browser session: dismissing it (X or "موافق") hides it for the rest
     of this session, and it shows again on the next new session (new
     tab/window), auto-hiding on its own after a while either way. */
  function initCookieBanner() {
    if (sessionStorage.getItem("mkz_cookie_notice_dismissed") === "1") return;

    var banner = document.createElement("div");
    banner.className = "ck-banner";
    banner.dir = "rtl";
    banner.lang = "ar";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-label", "إشعار الكوكيز");
    banner.innerHTML =
      '<span class="ck-icon" aria-hidden="true">🍪</span>' +
      '<p class="ck-text">بنستخدم الكوكيز لتحسين تجربتك وقياس أداء الموقع. <a class="ck-link" href="privacy-policy">سياسة الخصوصية</a></p>' +
      '<button type="button" class="ck-accept">موافق</button>' +
      '<button type="button" class="ck-close" aria-label="إغلاق">' +
        '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>' +
      '</button>';
    document.body.appendChild(banner);

    var autoHideTimer = setTimeout(dismiss, 10000);

    function dismiss() {
      clearTimeout(autoHideTimer);
      banner.classList.add("is-hiding");
      sessionStorage.setItem("mkz_cookie_notice_dismissed", "1");
      setTimeout(function () { banner.remove(); }, 260);
    }

    banner.querySelector(".ck-accept").addEventListener("click", dismiss);
    banner.querySelector(".ck-close").addEventListener("click", dismiss);

    requestAnimationFrame(function () { banner.classList.add("is-visible"); });
  }

  /* ---------------- Scroll-triggered quick-capture popup ----------------
     Shows after the visitor scrolls halfway down the page, offering to
     send current offers over WhatsApp in exchange for name + phone. Unlike
     the main lead modal it can reappear (with a cooldown) if dismissed,
     but stops for good once a lead is submitted anywhere on the page. */
  /* Scroll-popup copy per page (key = page URL without .html). The project is
     also sent to the sheet. Pages not listed fall back to POPUP_DEFAULT. */
  var POPUP_PAGES = {
    "district-5": { project: "District 5", title: "شقتك جاهزة للاستلام في قلب القاهرة الجديدة", sub: "نبعتلك أسعار District 5 وخطط السداد على الواتساب" },
    "crescent-walk": { project: "Crescent Walk", title: "شقق وفيلات في قلب التجمع السادس", sub: "نبعتلك أسعار Crescent Walk وخطط السداد على الواتساب" },
    "ramla": { project: "Ramla", title: "بيتك على بحر رأس الحكمة — متشطب بالكامل", sub: "نبعتلك أسعار Ramla وخطط السداد على الواتساب" },
    "shams-soma": { project: "Shams Soma", title: "احجز مكانك بدري في Shams Soma على البحر الأحمر", sub: "نبعتلك تفاصيل الوحدات وخطط السداد على الواتساب" },
  };
  var POPUP_DEFAULT = { project: "", title: "احصل على العروض الحالية عن طريق الواتساب", sub: "" };

  function currentPageKey() {
    var slug = window.location.pathname.split("/").pop().replace(/\.html$/, "");
    return slug || "index";
  }

  function initQuickPopup() {
    var SCROLL_THRESHOLD = 0.5;
    var COOLDOWN_MS = 45000;
    var PHONE_RE = /^(?:\+?20|0)1[0125]\d{8}$/;

    if (document.body.hasAttribute("data-no-popup")) return;
    if (sessionStorage.getItem("mkz_lead_submitted") === "1") return;

    var nextEligibleAt = 0;
    var visible = false;

    var offerEls = document.querySelectorAll(".mkz-offer-text");
    var offerText = offerEls.length === 1 ? offerEls[0].textContent.trim() : "";
    var pageKey = currentPageKey();
    var copy = POPUP_PAGES[pageKey] || POPUP_DEFAULT;

    var overlay = document.createElement("div");
    overlay.className = "qp-overlay";
    overlay.innerHTML =
      '<div class="qp-popup" role="dialog" aria-modal="true" aria-label="احصل على العروض الحالية">' +
        '<button type="button" class="qp-close" aria-label="إغلاق">' +
          '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>' +
        '</button>' +
        (offerText ? '<span class="qp-offer">' + offerText + '</span>' : '') +
        '<p class="qp-title">' + copy.title + '</p>' +
        (copy.sub ? '<p class="qp-sub">' + copy.sub + '</p>' : '') +
        '<form class="qp-form" novalidate>' +
          '<div class="qp-row">' +
            '<input class="qp-input" name="name" type="text" placeholder="الاسم" autocomplete="name" required>' +
            '<input class="qp-input" name="phone" type="tel" placeholder="رقم الموبايل" autocomplete="tel" required>' +
          '</div>' +
          '<button type="submit" class="qp-submit">ابعتلي العروض</button>' +
          '<p class="qp-note">بتسجيلك بتوافق على <a href="privacy-policy">سياسة الخصوصية</a></p>' +
        '</form>' +
      '</div>';
    document.body.appendChild(overlay);

    var form = overlay.querySelector(".qp-form");
    var phoneInput = form.phone;

    function show() {
      if (visible) return;
      visible = true;
      overlay.classList.remove("is-hiding");
      overlay.classList.add("is-visible");
    }

    function hide() {
      visible = false;
      nextEligibleAt = Date.now() + COOLDOWN_MS;
      overlay.classList.add("is-hiding");
      setTimeout(function () { overlay.classList.remove("is-visible", "is-hiding"); }, 260);
    }

    overlay.querySelector(".qp-close").addEventListener("click", hide);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) hide(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && overlay.classList.contains("is-visible")) hide();
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = form.name.value.trim();
      var phone = phoneInput.value.trim().replace(/[\s-]/g, "");
      if (!name) { form.name.focus(); return; }
      if (!PHONE_RE.test(phone)) {
        phoneInput.setCustomValidity("رقم الموبايل مش صحيح، لازم يبدأ بـ 010/011/012/015");
        phoneInput.reportValidity();
        return;
      }
      phoneInput.setCustomValidity("");
      if (!startSending(form)) return;

      var attribution = getAttribution();
      var payload = new URLSearchParams({
        name: name,
        phone: phone,
        project: copy.project,
        downPayment: "",
        installment: "",
        gclid: attribution.gclid || "",
        utmSource: attribution.utm_source || "",
        utmMedium: attribution.utm_medium || "",
        utmCampaign: attribution.utm_campaign || "",
        utmTerm: attribution.utm_term || "",
        utmContent: attribution.utm_content || "",
        pageUrl: window.location.href,
        formType: "scroll_popup_" + pageKey
      });

      fetch(LEADS_ENDPOINT, { method: "POST", mode: "no-cors", body: payload })
        .catch(function () {})
        .then(function () {
          try { sessionStorage.setItem("mkz_lead_submitted", "1"); } catch (e) {}
          window.location.href = "thank-you";
        });
    });

    window.addEventListener("scroll", function () {
      if (sessionStorage.getItem("mkz_lead_submitted") === "1") return;
      if (visible || Date.now() < nextEligibleAt) return;
      var doc = document.documentElement;
      var scrolled = (window.scrollY + window.innerHeight) / doc.scrollHeight;
      if (scrolled >= SCROLL_THRESHOLD) show();
    }, { passive: true });
  }

  /* ---------------- Floating WhatsApp / call buttons ----------------
     Secondary contact option, only on pages whose <body> has
     data-float-contact. Appears once the visitor scrolls past the hero.
     Click tracking is done in GTM (not here). */
  var CONTACT_PHONE = "201220170162";

  function initFloatingContact() {
    if (!document.body.hasAttribute("data-float-contact")) return;

    var pageKey = currentPageKey();
    var project = (POPUP_PAGES[pageKey] || POPUP_DEFAULT).project;
    var waText = project
      ? "مرحبًا، عايز أعرف أسعار وخطط سداد " + project
      : "مرحبًا، عايز أعرف أسعار وخطط السداد";

    var wrap = document.createElement("div");
    wrap.className = "fc-wrap";
    wrap.innerHTML =
      '<a class="fc-btn fc-call" href="tel:+' + CONTACT_PHONE + '" aria-label="اتصل بينا" data-contact="call">' +
        '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24 11.36 11.36 0 003.58.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.58a1 1 0 01-.25 1.01l-2.2 2.2z"></path></svg>' +
      '</a>' +
      '<a class="fc-btn fc-wa" href="https://wa.me/' + CONTACT_PHONE + '?text=' + encodeURIComponent(waText) + '" target="_blank" rel="noopener" aria-label="كلمنا واتساب" data-contact="whatsapp">' +
        '<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 004.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0012.04 2zm5.79 14.16c-.24.68-1.42 1.31-1.95 1.35-.5.05-.99.24-3.34-.7-2.83-1.12-4.63-4.02-4.77-4.21-.14-.19-1.14-1.51-1.14-2.89s.72-2.05.98-2.33c.24-.28.53-.35.71-.35.18 0 .35.01.5.01.16 0 .38-.06.59.45.24.58.79 2.02.86 2.16.07.14.12.3.02.49-.09.19-.14.3-.28.46-.14.16-.29.35-.42.47-.14.14-.28.29-.12.57.16.28.71 1.17 1.53 1.9 1.05.94 1.94 1.23 2.22 1.37.28.14.44.12.6-.07.18-.19.7-.81.88-1.09.18-.28.37-.23.61-.14.24.09 1.55.73 1.81.86.28.14.46.21.53.32.07.12.07.66-.17 1.34z"></path></svg>' +
      '</a>';
    document.body.appendChild(wrap);

    var hero = document.querySelector(".hr-hero");
    function update() {
      var threshold = hero ? hero.offsetTop + hero.offsetHeight * 0.6 : 300;
      wrap.classList.toggle("is-visible", window.scrollY > threshold);
    }
    window.addEventListener("scroll", update, { passive: true });
    update();
  }

  /* ---------------- Payment-plan teaser ([data-pay-calc]) ----------------
     Built from the page's own unit cards (.mkzu-card name + start price), so
     it follows the cards when prices change. Shows the minimum down payment;
     the installment is deliberately left hidden (it depends on the down
     payment chosen) — the CTA asks for the full plan via the short lead form.
     Must run before initLeadModal so its CTA is picked up as a trigger. */
  function initPayCalc() {
    var box = document.querySelector("[data-pay-calc]");
    if (!box) return;

    var units = Array.prototype.map.call(document.querySelectorAll(".mkzu-card"), function (card) {
      var nameEl = card.querySelector(".mkzu-name");
      var priceEl = card.querySelector(".mkzu-price-num");
      var cta = card.querySelector("[data-lead-open]");
      return {
        name: nameEl ? nameEl.textContent.trim() : "",
        price: priceEl ? parseInt(priceEl.textContent.replace(/[^\d]/g, ""), 10) : 0,
        label: cta ? cta.getAttribute("aria-label") || "" : ""
      };
    }).filter(function (u) { return u.name && u.price; });
    if (!units.length) return;

    /* Payment plans: data-plans (JSON list) when a page has more than one,
       otherwise a single plan from data-down-pct / data-years. The first
       plan is selected by default. "hot" plans get the highlighted style. */
    var plans;
    try { plans = JSON.parse(box.getAttribute("data-plans") || "null"); } catch (e) { plans = null; }
    if (!plans || !plans.length) {
      plans = [{ down: parseFloat(box.getAttribute("data-down-pct")) || 5, years: box.getAttribute("data-years") || "" }];
    }
    var LOCK = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"></rect><path d="M8 11V7a4 4 0 018 0v4"></path></svg>';
    function fmt(n) { return Math.round(n).toLocaleString("en-US"); }

    box.innerHTML =
      '<div class="pc-card">' +
        '<div class="pc-head">' +
          '<span class="pc-eyebrow">خطة السداد</span>' +
          '<h2 class="pc-title"></h2>' +
          '<p class="pc-sub">' + (units.length > 1 ? 'اختار نوع الوحدة واعرف المقدم اللي تبدأ بيه' : 'اعرف المقدم اللي تبدأ بيه') + '</p>' +
        '</div>' +
        (plans.length > 1 ? '<div class="pc-plans" role="tablist" aria-label="نظام السداد">' + plans.map(function (p, i) {
          return '<button type="button" class="pc-plan' + (p.hot ? ' pc-plan--hot' : '') + '" role="tab" data-p="' + i + '">' +
            '<b>' + p.label + '</b><span>' + p.down + '% مقدم — ' + p.years + ' سنين</span></button>';
        }).join("") + '</div>' : '') +
        (units.length > 1 ? '<div class="pc-tabs" role="tablist" aria-label="نوع الوحدة">' + units.map(function (u, i) {
          return '<button type="button" class="pc-tab" role="tab" data-i="' + i + '">' + u.name + '</button>';
        }).join("") + '</div>' : '') +
        '<div class="pc-rows">' +
          '<div class="pc-row"><span>السعر يبدأ من</span><strong class="pc-price"></strong></div>' +
          '<div class="pc-row pc-row--hi"><span class="pc-down-lbl"></span><strong class="pc-down"></strong></div>' +
          '<div class="pc-row pc-row--locked"><span class="pc-inst-lbl"></span>' +
            '<strong><i class="pc-blur" aria-hidden="true">000,000</i> ج.م' + LOCK + '</strong></div>' +
          '<p class="pc-note">القسط بيتحدد حسب المقدم اللي تختاره ومدة التقسيط</p>' +
        '</div>' +
        '<button type="button" class="pc-cta" data-lead-open data-form="calculator">اطلب خطة السداد كاملة</button>' +
        '<p class="pc-foot">الأرقام استرشادية وقابلة للتغيير من المطوّر</p>' +
      '</div>';

    var titleEl = box.querySelector(".pc-title");
    var priceEl = box.querySelector(".pc-price");
    var downLbl = box.querySelector(".pc-down-lbl");
    var downEl = box.querySelector(".pc-down");
    var instLbl = box.querySelector(".pc-inst-lbl");
    var cta = box.querySelector(".pc-cta");
    var curUnit = 0, curPlan = 0;

    function mark(selector, attr, idx) {
      Array.prototype.forEach.call(box.querySelectorAll(selector), function (t) {
        var on = +t.getAttribute(attr) === idx;
        t.classList.toggle("is-active", on);
        t.setAttribute("aria-selected", on);
      });
    }

    function render() {
      var u = units[curUnit], p = plans[curPlan];
      titleEl.textContent = p.title || "ابدأ بأقل مقدم";
      priceEl.textContent = fmt(u.price) + " ج.م";
      downLbl.textContent = "المقدم (" + p.down + "%) يبدأ من";
      downEl.textContent = fmt(u.price * p.down / 100) + " ج.م";
      instLbl.textContent = "القسط" + (p.years ? " على " + p.years + " سنين" : "");
      // The plan travels with the unit type so sales sees it in the sheet/email
      cta.setAttribute("data-unit", u.name + (p.label ? " — " + p.label : ""));
      cta.setAttribute("aria-label", u.label || "اطلب خطة السداد");
      mark(".pc-tab", "data-i", curUnit);
      mark(".pc-plan", "data-p", curPlan);
    }

    box.addEventListener("click", function (e) {
      var tab = e.target.closest(".pc-tab");
      var plan = e.target.closest(".pc-plan");
      if (tab) { curUnit = +tab.getAttribute("data-i"); render(); }
      if (plan) { curPlan = +plan.getAttribute("data-p"); render(); }
    });
    render();
  }

  /* ---------------- Inline lead form (form[data-inline-lead]) ----------------
     A form placed directly in the page (e.g. the ORA hub's budget form)
     instead of the modal. Sends the same fields to the same sheet. */
  function initInlineLeadForms() {
    var PHONE_RE = /^(?:\+?20|0)1[0125]\d{8}$/;
    document.querySelectorAll("form[data-inline-lead]").forEach(function (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var name = form.name.value.trim();
        var phoneInput = form.phone;
        var phone = phoneInput.value.trim().replace(/[\s-]/g, "");
        if (!name) { form.name.focus(); return; }
        if (!PHONE_RE.test(phone)) {
          phoneInput.setCustomValidity("رقم الموبايل مش صحيح، لازم يبدأ بـ 010/011/012/015");
          phoneInput.reportValidity();
          return;
        }
        phoneInput.setCustomValidity("");

        var attribution = getAttribution();
        var payload = new URLSearchParams({
          name: name,
          phone: phone,
          project: form.project ? form.project.value : "",
          downPayment: form.downpayment ? form.downpayment.value.trim() : "",
          installment: form.installment ? form.installment.value.trim() : "",
          gclid: attribution.gclid || "",
          utmSource: attribution.utm_source || "",
          utmMedium: attribution.utm_medium || "",
          utmCampaign: attribution.utm_campaign || "",
          utmTerm: attribution.utm_term || "",
          utmContent: attribution.utm_content || "",
          pageUrl: window.location.href,
          formType: "inline_form_" + currentPageKey()
        });

        if (!startSending(form)) return;
        fetch(LEADS_ENDPOINT, { method: "POST", mode: "no-cors", body: payload })
          .catch(function () {})
          .then(function () {
            try { sessionStorage.setItem("mkz_lead_submitted", "1"); } catch (e) {}
            window.location.href = "thank-you";
          });
      });
      form.phone.addEventListener("input", function () { form.phone.setCustomValidity(""); });
    });
  }

  captureAttribution();

  document.addEventListener("DOMContentLoaded", function () {
    initPayCalc();
    initLeadModal();
    initMiniCarousels();
    initGallery();
    initCookieBanner();
    initQuickPopup();
    initFloatingContact();
    initInlineLeadForms();
  });
})();

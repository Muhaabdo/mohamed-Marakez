/* Marakez website interactions: lead-capture modal, project mini-carousels,
   and the projects gallery (tabs + main stage + thumbs + lightbox).
   Rebuilt from scratch: the original site's JS wasn't present in the saved
   pages, only the markup/CSS hooks it used to drive (data-lead-open,
   .mkz-carousel, .mkzg-section, ...). */

(function () {
  "use strict";

  var LEADS_ENDPOINT = "https://script.google.com/macros/s/AKfycbxEXrE6u819hFgPhfzzE8_kyVs1AjZ3d-jCM0UgufpEdeNRmOqvoho2LkVEGX_AsNzVxA/exec";

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
        '<h2 class="lf-title">احصل على قائمة أسعار مشاريع مركز</h2>' +
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
          '<div class="lf-field">' +
            '<label class="lf-label" for="lf-project">المشروع اللي يهمك <span class="lf-req">*</span></label>' +
            '<select class="lf-input lf-select" id="lf-project" name="project" required>' +
              '<option value="" disabled selected>اختار المشروع</option>' +
              '<option value="District 5">District 5</option>' +
              '<option value="Crescent Walk">Crescent Walk</option>' +
              '<option value="Ramla">Ramla</option>' +
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
          '<p class="lf-privacy">بتسجيلك بتوافق على <a href="privacy-policy.html">سياسة الخصوصية</a>. بياناتك آمنة ومش هتتشارك إلا مع المطوّر المختص.</p>' +
        '</form>' +
      '</div>';
    document.body.appendChild(overlay);

    var modal = overlay.querySelector(".lf-modal");
    var closeBtn = overlay.querySelector(".lf-close");
    var form = overlay.querySelector("form");
    var projectSelect = overlay.querySelector("#lf-project");
    var lastFocused = null;

    function open(projectName) {
      lastFocused = document.activeElement;
      if (projectName) {
        var hasOption = Array.prototype.some.call(projectSelect.options, function (o) {
          return o.value === projectName;
        });
        projectSelect.value = hasOption ? projectName : "";
      } else {
        projectSelect.value = "";
      }
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
        var project = ["District 5", "Crescent Walk", "Ramla"].find(function (p) {
          return label.indexOf(p) !== -1;
        });
        open(project);
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

      var attribution = getAttribution();
      var payload = new URLSearchParams({
        name: form.name.value.trim(),
        phone: form.phone.value.trim(),
        project: form.project.value,
        downPayment: form.downpayment.value.trim(),
        installment: form.installment.value.trim(),
        gclid: attribution.gclid || "",
        utmSource: attribution.utm_source || "",
        utmMedium: attribution.utm_medium || "",
        utmCampaign: attribution.utm_campaign || "",
        utmTerm: attribution.utm_term || "",
        utmContent: attribution.utm_content || "",
        pageUrl: window.location.href
      });

      /* Google Apps Script web apps don't send CORS headers, so the request
         is fired in no-cors mode: it still reaches the script and appends
         the row, we just can't read a response back. */
      fetch(LEADS_ENDPOINT, { method: "POST", mode: "no-cors", body: payload })
        .catch(function () { /* ignore network errors, still forward the user */ })
        .then(function () { window.location.href = "thank-you.html"; });
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
      '<p class="ck-text">بنستخدم الكوكيز لتحسين تجربتك وقياس أداء الموقع. <a class="ck-link" href="privacy-policy.html">سياسة الخصوصية</a></p>' +
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

  captureAttribution();

  document.addEventListener("DOMContentLoaded", function () {
    initLeadModal();
    initMiniCarousels();
    initGallery();
    initCookieBanner();
  });
})();

/* GENERATED from js/projects.js by tools/build_en_js.py — do not edit by hand. */
/* ==========================================================================
   Projects list — the single source for the homepage project cards.
   To add a project: add one entry below (page = its page URL without .html).
   startPrice is a plain number in EGP (e.g. 11285000); omit it to hide the price.
   ========================================================================== */
(function () {
  "use strict";

  var PROJECTS = [
    { name: "District 5", page: "district-5", location: "New Cairo", image: "../images/img-aa5eb51258dc6ed2.webp", startPrice: 11285000 },
    { name: "Crescent Walk", page: "crescent-walk", location: "6th Settlement", image: "../images/img-1b7eeca852104b27.webp", startPrice: 8464000 },
    { name: "Ramla", page: "ramla", location: "Ras El Hekma — North Coast", image: "../images/img-b71bcab33d0d0238.webp", startPrice: 22176000 },
    { name: "Shams Soma", page: "shams-soma", location: "Soma Bay — Red Sea", image: "../images/ss-img-1.jpg", startPrice: 19500000 },
    { name: "ORA Projects", page: "ora-projects", location: "New Cairo — Zed East & Solana East", image: "../images/ora-ze-2.jpg", startPrice: 8900000 }
  ];

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function renderProjectCards() {
    var grid = document.querySelector("[data-projects-grid]");
    if (!grid || !PROJECTS.length) return;
    grid.innerHTML = PROJECTS.map(function (p) {
      var price = p.startPrice
        ? '<span class="mkzo-price">Prices from <strong>EGP ' + p.startPrice.toLocaleString("en-US") + "</strong></span>"
        : "";
      return '<a class="mkzo-card" href="' + esc(p.page) + '">' +
        '<img decoding="async" src="' + esc(p.image) + '" alt="' + esc(p.name) + '" loading="lazy">' +
        '<div class="mkzo-overlay">' +
        '<span class="mkzo-loc">' + esc(p.location) + "</span>" +
        '<h3 class="mkzo-name">' + esc(p.name) + "</h3>" +
        price +
        '<span class="mkzo-cta">View details →</span>' +
        "</div></a>";
    }).join("");
    var section = grid.closest("[hidden]");
    if (section) section.hidden = false;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", renderProjectCards);
  else renderProjectCards();
})();

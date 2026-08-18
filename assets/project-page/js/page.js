// Small helper script for the project pages: language switch, scroll-to-top,
// BibTeX copy button.
(function () {
  "use strict";

  // --- EN / 中文 -----------------------------------------------------------
  var STORAGE_KEY = "zl-project-lang";

  function applyLang(lang) {
    document.documentElement.classList.toggle("lang-mode-zh", lang === "zh");
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
    var btn = document.getElementById("lang-switch");
    if (btn) {
      btn.textContent = lang === "zh" ? "English" : "中文";
      btn.setAttribute("aria-label", lang === "zh" ? "Switch to English" : "切换到中文");
    }
  }

  function currentLang() {
    return document.documentElement.classList.contains("lang-mode-zh") ? "zh" : "en";
  }

  function initLang() {
    // the inline script in <head> has already set the class from ?lang= or
    // localStorage; here we only sync the button and wire up the click.
    applyLang(currentLang());

    var btn = document.getElementById("lang-switch");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var next = currentLang() === "zh" ? "en" : "zh";
      applyLang(next);
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch (e) {
        /* ignore */
      }
    });
  }

  // --- scroll to top -------------------------------------------------------
  function initScrollTop() {
    var btn = document.querySelector(".scroll-to-top");
    if (!btn) return;
    btn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    window.addEventListener("scroll", function () {
      btn.classList.toggle("visible", window.pageYOffset > 300);
    });
  }

  // --- BibTeX copy ---------------------------------------------------------
  function initCopyBibtex() {
    var btn = document.querySelector(".copy-bibtex-btn");
    var code = document.getElementById("bibtex-code");
    if (!btn || !code) return;
    var label = btn.querySelector(".copy-text");
    btn.addEventListener("click", function () {
      var text = code.textContent;
      var done = function () {
        btn.classList.add("copied");
        if (label) label.textContent = "Copied";
        setTimeout(function () {
          btn.classList.remove("copied");
          if (label) label.textContent = "Copy";
        }, 2000);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, fallback);
      } else {
        fallback();
      }
      function fallback() {
        var ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand("copy");
        } catch (e) {
          /* ignore */
        }
        document.body.removeChild(ta);
        done();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initLang();
    initScrollTop();
    initCopyBibtex();
  });
})();

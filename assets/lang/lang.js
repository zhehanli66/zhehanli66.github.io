// EN / 中文 switch for the al-folio pages.
//
// The theme itself is untouched: this script injects a button into the navbar
// next to the theme toggle, flips a class on <html> (lang.css does the hiding)
// and translates the handful of labels the theme generates itself.
// The choice is shared with the standalone project pages via the same storage key.
(function () {
  "use strict";

  var KEY = "zl-project-lang";

  // labels rendered by the theme, matched on their English text (lower-cased)
  var LABELS = {
    about: "关于",
    projects: "项目",
    news: "最新动态",
    "latest posts": "最新文章",
    research: "研究",
    engineering: "工程实践",
  };

  var LABEL_SELECTOR = ".nav-link, .post-title, h2 > a, h2.category, .category";

  function currentLang() {
    return document.documentElement.classList.contains("lang-mode-zh") ? "zh" : "en";
  }

  function firstTextNode(el) {
    for (var i = 0; i < el.childNodes.length; i++) {
      var n = el.childNodes[i];
      if (n.nodeType === 3 && n.nodeValue.trim()) return n;
    }
    return null;
  }

  function translateLabels(lang) {
    var nodes = document.querySelectorAll(LABEL_SELECTOR);
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var node = firstTextNode(el);
      if (!node) continue;
      if (!el.getAttribute("data-lang-key")) {
        var key = node.nodeValue.trim().toLowerCase();
        if (!Object.prototype.hasOwnProperty.call(LABELS, key)) continue;
        el.setAttribute("data-lang-key", key);
        el.setAttribute("data-lang-en", node.nodeValue);
      }
      node.nodeValue =
        lang === "zh" ? LABELS[el.getAttribute("data-lang-key")] : el.getAttribute("data-lang-en");
    }
  }

  function apply(lang) {
    document.documentElement.classList.toggle("lang-mode-zh", lang === "zh");
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
    translateLabels(lang);
    var btn = document.getElementById("lang-toggle");
    if (btn) {
      var label = btn.querySelector(".nav-link") || btn;
      label.textContent = lang === "zh" ? "EN" : "中文";
      btn.setAttribute("aria-label", lang === "zh" ? "Switch to English" : "切换到中文");
    }
  }

  function addButton() {
    if (document.getElementById("lang-toggle")) return;
    var list = document.querySelector(".navbar-menu-list");
    if (!list) return;
    var li = document.createElement("li");
    li.className = "nav-item";
    var btn = document.createElement("button");
    btn.id = "lang-toggle";
    btn.type = "button";
    btn.title = "Switch language / 切换语言";
    // same shape as the theme's search button: the label lives in a .nav-link
    // span so it lines up with the other navbar entries
    btn.appendChild(document.createElement("span")).className = "nav-link";
    btn.addEventListener("click", function () {
      var next = currentLang() === "zh" ? "en" : "zh";
      apply(next);
      try {
        window.localStorage.setItem(KEY, next);
      } catch (e) {
        /* ignore */
      }
    });
    li.appendChild(btn);
    var themeToggle = list.querySelector(".toggle-container");
    if (themeToggle) list.insertBefore(li, themeToggle);
    else list.appendChild(li);
  }

  function init() {
    addButton();
    apply(currentLang());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

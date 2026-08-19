---
layout: page
title: Projects
permalink: /projects/
description: >
  <span class="lang-en">Selected research and engineering work &mdash; one row per project, newest first.</span><span class="lang-zh">研究与工程项目一览，每项一栏，按时间由新到旧。</span>
nav: true
nav_order: 2
display_categories:
  - id: research
    label_en: Research
    label_zh: 研究
    note_en: Work I led as first or co-first author.
    note_zh: 以第一作者 / 共同第一作者主导的工作。
  - id: contributed
    label_en: Contributed Research
    label_zh: 参与研究
    note_en: Work I contributed to as a co-author rather than led.
    note_zh: 以合作作者身份参与、而非主导的工作。
  - id: engineering
    label_en: Engineering
    label_zh: 工程实践
    note_en: Systems I built and deployed on real robots.
    note_zh: 由我搭建并在真机上部署的系统。
---

<link rel="stylesheet" href="{{ '/assets/lang/lang.css' | relative_url }}">
<link rel="stylesheet" href="{{ '/assets/site/site.css' | relative_url }}">
<script>
  (function () {
    var d = document.documentElement,
      l = null;
    try {
      var m = /[?&]lang=(zh|en)/.exec(window.location.search);
      l = m ? m[1] : window.localStorage.getItem("zl-project-lang");
    } catch (e) {}
    if (l === "zh") d.classList.add("lang-mode-zh");
  })();
</script>
<script defer src="{{ '/assets/lang/lang.js' | relative_url }}"></script>

<!-- pages/projects.md — one horizontal row per project: image left, details right. -->
<div class="projects-list">
{% for cat in page.display_categories %}
  {% assign items = site.projects | where: "category", cat.id | sort: "importance" %}
  {% if items.size == 0 %}{% continue %}{% endif %}
  <section class="proj-section" id="{{ cat.id }}">
    <h2 class="proj-section-title">
      <span class="lang-en">{{ cat.label_en }}</span><span class="lang-zh">{{ cat.label_zh }}</span>
    </h2>
    <p class="proj-section-note">
      <span class="lang-en">{{ cat.note_en }}</span><span class="lang-zh">{{ cat.note_zh }}</span>
    </p>

    {% for p in items %}
      {%- assign href = "" -%}
      {%- if p.redirect -%}
        {%- assign href = p.redirect | relative_url -%}
      {%- elsif p.links -%}
        {%- assign first_link = p.links | first -%}
        {%- assign href = first_link.url -%}
      {%- endif -%}
      {%- assign img_base = p.img | split: "." | first -%}
    <article class="proj-row">
      <div class="proj-media">
        {% if href != "" %}<a href="{{ href }}">{% endif %}
        <picture>
          <source
            class="responsive-img-srcset"
            srcset="{{ img_base | append: '-480.webp' | relative_url }} 480w, {{ img_base | append: '-800.webp' | relative_url }} 800w, {{ img_base | append: '-1400.webp' | relative_url }} 1400w"
            type="image/webp"
            sizes="(min-width: 768px) 320px, 100vw">
          <img
            src="{{ p.img | relative_url }}"
            alt="{{ p.title | strip_html }}"
            width="1200" height="800" loading="lazy"
            onerror="this.onerror=null; document.querySelectorAll('.responsive-img-srcset').forEach(function (n) { n.remove(); });">
        </picture>
        {% if href != "" %}</a>{% endif %}
      </div>

      <div class="proj-body">
        <h3 class="proj-title">
          {% if href != "" %}<a href="{{ href }}">{{ p.title }}</a>{% else %}{{ p.title }}{% endif %}
        </h3>

        {% if p.paper_en %}
        <p class="proj-paper">
          <span class="lang-en">{{ p.paper_en }}</span><span class="lang-zh">{{ p.paper_zh }}</span>
        </p>
        {% endif %}

        {% if p.authors %}
        <p class="proj-authors">{{ p.authors }}</p>
        {% endif %}

        {% if p.authors_note_en %}
        <p class="proj-authors-note">
          <span class="lang-en">{{ p.authors_note_en }}</span><span class="lang-zh">{{ p.authors_note_zh }}</span>
        </p>
        {% endif %}

        <p class="proj-meta">
          <span class="proj-venue"><span class="lang-en">{{ p.venue_en }}</span><span class="lang-zh">{{ p.venue_zh }}</span></span>
          {% if p.status_en %}{% assign st = p.status_en | downcase %}<span class="proj-pill proj-status{% if st contains 'under review' %} proj-status-open{% endif %}"><span class="lang-en">{{ p.status_en }}</span><span class="lang-zh">{{ p.status_zh }}</span></span>{% endif %}
          {% if p.role_en %}<span class="proj-pill proj-role"><span class="lang-en">{{ p.role_en }}</span><span class="lang-zh">{{ p.role_zh }}</span></span>{% endif %}
        </p>

        <p class="proj-desc">{{ p.description }}</p>

        {% if p.links %}
        <p class="proj-links">
          {%- for l in p.links -%}
            {%- if l.url contains "://" -%}{%- assign lurl = l.url -%}{%- else -%}{%- assign lurl = l.url | relative_url -%}{%- endif %}
          <a class="proj-link" href="{{ lurl }}">{% if l.label_zh %}<span class="lang-en">{{ l.label_en }}</span><span class="lang-zh">{{ l.label_zh }}</span>{% else %}{{ l.label_en }}{% endif %}</a>
          {%- endfor %}
        </p>
        {% endif %}
      </div>
    </article>
    {% endfor %}
  </section>
{% endfor %}
</div>

---
layout: page
title: projects
permalink: /projects/
description: Selected research and engineering projects · 研究与工程项目一览，每张卡片都有独立的项目页面。
nav: true
nav_order: 2
display_categories: [research, engineering]
horizontal: false
---

<link rel="stylesheet" href="{{ '/assets/lang/lang.css' | relative_url }}">
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

<!-- pages/projects.md -->
<div class="projects">
{% if site.enable_project_categories and page.display_categories %}
  <!-- Display categorized projects -->
  {% for category in page.display_categories %}
  <a id="{{ category }}" href=".#{{ category }}">
    <h2 class="category">{{ category }}</h2>
  </a>
  {% assign categorized_projects = site.projects | where: "category", category %}
  {% assign sorted_projects = categorized_projects | sort: "importance" %}
  <!-- Generate cards for each project -->
  {% if page.horizontal %}
  <div class="container">
    <div class="row row-cols-1 row-cols-md-2">
    {% for project in sorted_projects %}
      {% include projects_horizontal.liquid %}
    {% endfor %}
    </div>
  </div>
  {% else %}
  <div class="row row-cols-1 row-cols-md-3">
    {% for project in sorted_projects %}
      {% include projects.liquid %}
    {% endfor %}
  </div>
  {% endif %}
  {% endfor %}

{% else %}

<!-- Display projects without categories -->

{% assign sorted_projects = site.projects | sort: "importance" %}

  <!-- Generate cards for each project -->

{% if page.horizontal %}

  <div class="container">
    <div class="row row-cols-1 row-cols-md-2">
    {% for project in sorted_projects %}
      {% include projects_horizontal.liquid %}
    {% endfor %}
    </div>
  </div>
  {% else %}
  <div class="row row-cols-1 row-cols-md-3">
    {% for project in sorted_projects %}
      {% include projects.liquid %}
    {% endfor %}
  </div>
  {% endif %}
{% endif %}
</div>

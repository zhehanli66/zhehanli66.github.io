---
layout: about
title: About
permalink: /
subtitle: >
  <span class="lang-en">Ph.D. Student · <a href="https://zju-fast-lab.github.io/">FASTLAB (Fire Group)</a>, <a href="https://www.zju.edu.cn/english/">Zhejiang University</a></span><span class="lang-zh">博士研究生 · 浙江大学 <a href="https://zju-fast-lab.github.io/">FASTLAB（Fire Group）</a></span>

profile:
  align: right
  image: prof_pic.png
  image_circular: true # crops the image to make it circular
  more_info: >
    <div class="lang-en">
      <p>College of Control Science and Engineering</p>
      <p>Zhejiang University</p>
      <p>Hangzhou, China</p>
    </div>
    <div class="lang-zh">
      <p>浙江大学</p>
      <p>控制科学与工程学院</p>
      <p>中国杭州</p>
    </div>
    <div class="profile-socials">
      <a href="mailto:zhehanli66@gmail.com" title="Email"><i class="fa-solid fa-envelope"></i></a>
      <a href="https://scholar.google.com/citations?user=EvKoyq0AAAAJ" title="Google Scholar"><i class="ai ai-google-scholar"></i></a>
      <a href="https://github.com/zhehanli66" title="GitHub"><i class="fa-brands fa-github"></i></a>
    </div>

selected_papers: false # includes a list of papers marked as "selected={true}"
social: false # the icons live in the profile column instead, see more_info above

announcements:
  enabled: false # news section turned off

latest_posts:
  enabled: false
  scrollable: true
  limit: 3

display_categories:
  - id: research
    label_en: Research
    label_zh: 研究
    note_en: Projects I led as first or co-first author.
    note_zh: 我以第一作者或共同第一作者主导的研究。
  - id: contributed
    label_en: Co-authored Research
    label_zh: 合作研究
    note_en: Projects I contributed to as a co-author.
    note_zh: 我以合作作者身份参与的研究。
  - id: engineering
    label_en: Engineering
    label_zh: 工程实践
    note_en: Systems I led or helped build and deploy on real robots.
    note_zh: 我主导或参与搭建并完成真机部署的系统。
---

<link rel="stylesheet" href="{{ '/assets/lang/lang.css' | relative_url }}">
<link rel="stylesheet" href="{{ '/assets/site/site.css' | relative_url }}">
<script>
  // pick the language before the page paints: ?lang=zh / ?lang=en wins, otherwise the last choice
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

<div class="lang-en" markdown="1">

I am a Ph.D. student in Control Science and Engineering at Zhejiang University, advised by [Yanjun Cao](https://zju-fast-lab.github.io/author/yanjun-cao-%E6%9B%B9%E7%87%95%E5%86%9B/) in [FASTLAB](https://zju-fast-lab.github.io/) (Fire Group). I received my B.Eng. in Mechatronics and Automation from Zhejiang University's Chu Kochen Honors College in 2022 and expect to complete my Ph.D. in June 2027.

My research focuses on **multi-robot relative localization and state estimation**: enabling robots to determine their poses with respect to one another, then using those estimates for cooperative perception, planning and control. I combine multimodal sensing, geometric estimation and learning-based methods, with an emphasis on algorithms that remain reliable under asynchronous measurements, observation outliers, limited communication and GPS denial. I also build the sensing and robotic systems needed to validate these methods beyond simulation.

## Research Interests

- **Multi-robot relative localization and state estimation.** Bearing–range–inertial fusion, continuous-time and outlier-robust estimation, and zero-shot sim-to-real learning.
- **Cooperative perception and active sensing.** Air–ground collaboration, active 3D reconstruction, viewpoint planning and online camera–LiDAR calibration.
- **Real-world multi-robot systems.** Custom sensing hardware, onboard estimation and control, system integration and multi-robot deployment.

Selected projects are grouped below by my role in each one.

For research discussions or potential collaborations, please feel free to contact me at <a href="mailto:zhehanli66@gmail.com">zhehanli66@gmail.com</a>.

</div>

<div class="lang-zh" markdown="1">

我是浙江大学控制科学与工程学院博士研究生，在 [FASTLAB](https://zju-fast-lab.github.io/)（Fire Group）跟随 [曹燕军](https://zju-fast-lab.github.io/author/yanjun-cao-%E6%9B%B9%E7%87%95%E5%86%9B/) 老师从事研究。2022 年本科毕业于浙江大学竺可桢学院机械电子工程专业，预计于 2027 年 6 月完成博士学业。

我的研究聚焦于**多机器人相对定位与状态估计**：让机器人准确获知彼此的相对位姿，并将其用于协同感知、规划与控制。我结合多模态感知、几何估计与学习方法，重点研究异步测量、观测外点、通信受限和 GPS 拒止条件下的可靠估计；同时搭建配套感知硬件与机器人系统，在真机上验证算法。

## 研究方向

- **多机器人相对定位与状态估计。** 方位—测距—惯性融合、连续时间与抗外点估计、零样本 Sim-to-Real 学习。
- **协同感知与主动感知。** 空地协同、主动三维重建、视角规划与在线相机—激光标定。
- **多机器人真机系统。** 自研感知硬件、机载估计与控制、系统集成及多机器人真机部署。

以下项目按照我在其中承担的角色分类展示。

如希望交流研究问题或探讨合作，欢迎邮件联系 <a href="mailto:zhehanli66@gmail.com">zhehanli66@gmail.com</a>。

</div>

<!-- one horizontal row per project: image left, details right -->
<div class="projects-list" id="projects">
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
      {%- comment -%}
        Only work with a project page of my own is clickable (`redirect`);
        everything else is reached through the link buttons below the card.
        只有我自己维护项目页的工作（`redirect`）才能点进去，其余一律走卡片下方的链接按钮。
      {%- endcomment -%}
      {%- assign href = "" -%}
      {%- if p.redirect -%}
        {%- assign href = p.redirect | relative_url -%}
      {%- endif -%}
      {%- assign img_base = p.img | split: "." | first -%}
    <article class="proj-row">
      <div class="proj-media">
        {% if href != "" %}<a href="{{ href }}">{% endif %}
        <picture>
          {% if site.imagemagick.enabled %}<source
            class="responsive-img-srcset"
            srcset="{{ img_base | append: '-480.webp' | relative_url }} 480w, {{ img_base | append: '-800.webp' | relative_url }} 800w, {{ img_base | append: '-1400.webp' | relative_url }} 1400w"
            type="image/webp"
            sizes="(min-width: 768px) 320px, 100vw">{% endif %}
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
          <span class="proj-pill proj-venue"><span class="lang-en">{{ p.venue_en }}</span><span class="lang-zh">{{ p.venue_zh }}</span></span>
          {% if p.role_en %}<span class="proj-pill proj-role"><span class="lang-en">{{ p.role_en }}</span><span class="lang-zh">{{ p.role_zh }}</span></span>{% endif %}
          {% if p.meta_en %}<span class="proj-when"><span class="lang-en">{{ p.meta_en }}</span><span class="lang-zh">{{ p.meta_zh }}</span></span>{% endif %}
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

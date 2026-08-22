---
layout: about
title: About
permalink: /
subtitle: >
  <span class="lang-en">Ph.D. Student · <a href="https://zju-fast-lab.github.io/">FAST Lab (Fire Group)</a>, <a href="https://www.zju.edu.cn/english/">Zhejiang University</a></span><span class="lang-zh">博士研究生 · 浙江大学 <a href="https://zju-fast-lab.github.io/">FAST 实验室（Fire Group）</a></span>

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

I am a Ph.D. student in Control Science and Engineering at the [FAST Lab](https://zju-fast-lab.github.io/) (Fire Group), Zhejiang University, advised by [Yanjun Cao](https://zju-fast-lab.github.io/author/yanjun-cao-%E6%9B%B9%E7%87%95%E5%86%9B/). I received my B.Eng. in Mechatronics and Automation from the Chu Kochen Honors College, Zhejiang University, in 2022, and I expect to receive my Ph.D. in June 2027.

I work on **making a team of robots know where they are with respect to each other**, and on turning that capability into cooperative behaviour in the real world. My work spans the full stack — custom sensing hardware, estimation, planning, control and decision making — and is consistently validated on real multi-robot systems rather than in simulation alone.

## Research Interests

- **Multi-robot relative localization and state estimation.** Bearing–distance–inertial fusion, continuous-time estimation, outlier-robust optimization, learning-based and zero-shot estimators.
- **Cooperative perception and active sensing.** Air–ground collaboration, active 3D reconstruction, gimbal planning, online multi-sensor calibration.
- **Full-stack multi-robot systems.** Custom localization hardware, VIO/LIO, trajectory planning, MPC, sim-to-real and reinforcement learning, real-robot swarm deployment.

Below is a walk-through of what I have been building.

If you would like to discuss my work or a potential collaboration, feel free to reach me at <a href="mailto:zhehanli66@gmail.com">zhehanli66@gmail.com</a>.

</div>

<div class="lang-zh" markdown="1">

我是浙江大学控制科学与工程学院的博士研究生，在 [FAST 实验室](https://zju-fast-lab.github.io/)（Fire Group）跟随 [Yanjun Cao](https://zju-fast-lab.github.io/author/yanjun-cao-%E6%9B%B9%E7%87%95%E5%86%9B/) 老师做研究。2022 年本科毕业于浙江大学竺可桢学院机械电子工程专业，预计 2027 年 6 月博士毕业。

我的研究关注**如何让一群机器人知道彼此之间的相对位置**，并把这种能力变成真实世界中的协同行为。工作覆盖从传感器硬件、状态估计、规划控制到决策的完整链路，并且坚持在真实多机器人系统上验证，而不只停留在仿真里。

## 研究方向

- **多机器人相对定位与状态估计。** 方位—距离—惯性融合、连续时间估计、抗外点优化、基于学习的零样本估计器。
- **协同感知与主动感知。** 空地协同、主动三维重建、云台规划、在线多传感器标定。
- **全栈多机器人系统。** 自研定位硬件、VIO/LIO、轨迹规划、MPC、Sim-to-Real 与强化学习、集群真机部署。

下面是我具体做过的一些工作。

如果你想聊聊我的工作或者潜在的合作，欢迎邮件联系 <a href="mailto:zhehanli66@gmail.com">zhehanli66@gmail.com</a>。

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

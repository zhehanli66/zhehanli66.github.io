---
layout: about
title: About
permalink: /
subtitle: >
  <span class="lang-en">Ph.D. Student · <a href="http://zju-fast.com/">FAST Lab (Fire Group)</a>, <a href="https://www.zju.edu.cn/english/">Zhejiang University</a></span><span class="lang-zh">博士研究生 · 浙江大学 <a href="http://zju-fast.com/">FAST 实验室（Fire Group）</a></span>

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

selected_papers: false # includes a list of papers marked as "selected={true}"
social: true # includes social icons at the bottom of the page

announcements:
  enabled: true # includes a list of news items
  scrollable: true # adds a vertical scroll bar if there are more than 3 news items
  limit: 5 # leave blank to include all the news in the `_news` folder

latest_posts:
  enabled: false
  scrollable: true
  limit: 3
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

I am a Ph.D. student in Control Science and Engineering at the [FAST Lab](http://zju-fast.com/) (Fire Group), Zhejiang University, advised by [Yanjun Cao](http://zju-fast.com/research-group/yanjun-cao/). I received my B.Eng. in Mechatronics and Automation from the Chu Kochen Honors College, Zhejiang University, in 2022, and I expect to receive my Ph.D. in June 2027.

I work on **making a team of robots know where they are with respect to each other**, and on turning that capability into cooperative behaviour in the real world. My work spans the full stack — custom sensing hardware, estimation, planning, control and decision making — and is consistently validated on real multi-robot systems rather than in simulation alone.

## Research Interests

- **Multi-robot relative localization and state estimation.** Bearing–distance–inertial fusion, continuous-time estimation, outlier-robust optimization, learning-based and zero-shot estimators.
- **Cooperative perception and active sensing.** Air–ground collaboration, active 3D reconstruction, gimbal planning, online multi-sensor calibration.
- **Full-stack multi-robot systems.** Custom localization hardware, VIO/LIO, trajectory planning, MPC, sim-to-real and reinforcement learning, real-robot swarm deployment.

Take a look at the [projects]({{ '/projects/' | relative_url }}) page for a walk-through of what I have been building.

If you would like to discuss my work or a potential collaboration, feel free to reach me at <a href="mailto:zhehanli66@gmail.com">zhehanli66@gmail.com</a>.

</div>

<div class="lang-zh" markdown="1">

我是浙江大学控制科学与工程学院的博士研究生，在 [FAST 实验室](http://zju-fast.com/)（Fire Group）跟随 [Yanjun Cao](http://zju-fast.com/research-group/yanjun-cao/) 老师做研究。2022 年本科毕业于浙江大学竺可桢学院机械电子工程专业，预计 2027 年 6 月博士毕业。

我的研究关注**如何让一群机器人知道彼此之间的相对位置**，并把这种能力变成真实世界中的协同行为。工作覆盖从传感器硬件、状态估计、规划控制到决策的完整链路，并且坚持在真实多机器人系统上验证，而不只停留在仿真里。

## 研究方向

- **多机器人相对定位与状态估计。** 方位—距离—惯性融合、连续时间估计、抗外点优化、基于学习的零样本估计器。
- **协同感知与主动感知。** 空地协同、主动三维重建、云台规划、在线多传感器标定。
- **全栈多机器人系统。** 自研定位硬件、VIO/LIO、轨迹规划、MPC、Sim-to-Real 与强化学习、集群真机部署。

想知道我具体做了些什么，可以看[项目]({{ '/projects/' | relative_url }})页面。

如果你想聊聊我的工作或者潜在的合作，欢迎邮件联系 <a href="mailto:zhehanli66@gmail.com">zhehanli66@gmail.com</a>。

</div>

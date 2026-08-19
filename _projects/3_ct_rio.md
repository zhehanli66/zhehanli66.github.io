---
title: 'CT-RIO'
paper_en: 'Parallel Continuous-Time Relative Localization with Augmented Clamped Non-Uniform B-Splines'
paper_zh: '基于增广钳制非均匀 B 样条的并行连续时间相对定位'
authors: 'Jiadong Lu<sup>*</sup>, <strong>Zhehan Li</strong><sup>*</sup>, Tao Han, Miao Xu, Chao Xu, Yanjun Cao'
authors_note_en: '<sup>*</sup>Equal contribution.'
authors_note_zh: '<sup>*</sup>共同第一作者。'
venue_en: 'IEEE Transactions on Robotics (major revision)'
venue_zh: 'IEEE Transactions on Robotics（二审）'
role_en: 'Co-first author'
role_zh: '共同第一作者'
description: '<span class="lang-en">A continuous-time factor graph on augmented clamped non-uniform B-splines lets asynchronous, differently-rated bearing / range / IMU measurements be fused at their raw timestamps, adapts the knot density to how aggressive the motion is, and estimates inter-robot clock offsets online (hundreds of milliseconds converge to sub-millisecond within 3 s). An incremental asynchronous block-coordinate-descent solver, proven to converge, keeps it real time: 0.046 m / 1.8° RMSE, up to 60% better than discrete-time optimization on fast sequences.</span><span class="lang-zh">基于增广钳制非均匀 B 样条的连续时间因子图，使异步、异频的方位/距离/IMU 观测能按原始时间戳融合，并自适应运动剧烈程度、在线估计机间时钟偏移（数百毫秒初始时偏可在 3 s 内收敛至亚毫秒）。配合可证明收敛的增量异步块坐标下降并行求解，真机 RMSE 0.046 m / 1.8°，高速序列较离散时间优化最高降低 60%。</span>'
img: assets/img/projects/ct-rio.png
redirect: /CT-RIO/
importance: 3
category: research
links:
  - label_en: 'arXiv'
    url: 'https://arxiv.org/abs/2602.22006'
  - label_en: 'Video'
    label_zh: '视频'
    url: '/CT-RIO/#video'
---

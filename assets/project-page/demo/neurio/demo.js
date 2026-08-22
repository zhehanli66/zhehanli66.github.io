/* NeuRIO interactive replay — vanilla JS, canvas 2D, no dependencies.
 *
 * Ported from the project's internal viewer and trimmed to what belongs on a
 * public page: the per-frame replay itself, the live error readout and the two
 * error traces. The geometry is unchanged.
 *
 * Reads data/index.json + data/sequenceN.bin. Every array is float32 LE; a
 * sequence's blob concatenates the sections listed in its `layout`, each with
 * its own element offset/count/shape.
 *
 * Frames: the model predicts target j relative to the observer's CANONICAL
 * (gravity-aligned, yaw-preserving) frame — that is what the ego view draws,
 * unmodified. The world view left-multiplies by `c2w`, the canonical frame's
 * GT pose, so it is GT-anchored and labelled as such in the UI.
 */
(function () {
  'use strict';

  var ROOT = document.getElementById('neurio-demo');
  if (!ROOT) return;

  var DATA = ROOT.dataset.src || 'data/';
  /* bumped in the page's data-version whenever the sequences are re-exported:
     without it a cached index.json can outlive the blobs it describes. */
  var VER = ROOT.dataset.version ? '?v=' + ROOT.dataset.version : '';

  /* tab10-ish, indexed by robot id — same palette as the paper's figures. */
  var PALETTE = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
                 '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'];

  var DEFAULT_BAG = 'sequence1';

  var $ = function (sel) { return ROOT.querySelector(sel); };
  var zh = function () { return document.documentElement.classList.contains('lang-mode-zh'); };
  var t = function (en, cn) { return zh() ? cn : en; };
  var bi = function (en, cn) {
    return '<span class="lang-en">' + en + '</span><span class="lang-zh">' + cn + '</span>';
  };
  var css = function (name) {
    return getComputedStyle(ROOT).getPropertyValue(name).trim();
  };

  var S = {
    index: null, meta: null, A: null, name: null,
    T: 0, K: 0, dt: 0.04,
    t: 0, playing: true, speed: 1, last: 0,
    view: 'ego',
    cam: { az: -2.2, el: 0.42, dist: 8 },
    home: { az: -2.2, el: 0.42, dist: 8 },
    on: new Set(),
    opts: { trail: true, triad: true, sigma: true, links: true },
    running: false,
  };

  /* ── small math ───────────────────────────────────────────── */

  function quatToMat(q0, q1, q2, q3) {        // (w, x, y, z) -> row-major 3x3
    var n = Math.hypot(q0, q1, q2, q3) || 1;
    var w = q0 / n, x = q1 / n, y = q2 / n, z = q3 / n;
    return [
      1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y),
      2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x),
      2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y),
    ];
  }
  var mv = function (m, v) {
    return [m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
            m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
            m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
  };
  var mm = function (a, b) {
    var o = new Array(9);
    for (var r = 0; r < 3; r++)
      for (var c = 0; c < 3; c++)
        o[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
    return o;
  };
  var add = function (a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; };
  var sub = function (a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; };
  var scale = function (a, s) { return [a[0] * s, a[1] * s, a[2] * s]; };
  var dot = function (a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; };
  var cross = function (a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  };
  var norm = function (a) { var n = Math.hypot(a[0], a[1], a[2]) || 1; return scale(a, 1 / n); };

  /* ── boot ─────────────────────────────────────────────────── */

  function fail(err) {
    ROOT.classList.add('is-failed');
    $('#nd-status').innerHTML = bi(
      'The replay data could not be loaded (' + err + ').',
      '回放数据加载失败（' + err + '）。');
  }

  function boot() {
    if (S.running) return;
    S.running = true;
    fetch(DATA + 'index.json' + VER)
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (index) {
        S.index = index;
        buildTabs();
        wire();
        var first = index.bags[DEFAULT_BAG] ? DEFAULT_BAG : Object.keys(index.bags)[0];
        return loadBag(first);
      })
      .then(function () {
        ROOT.classList.add('is-ready');
        requestAnimationFrame(tick);
      })
      .catch(function (e) { fail(e.message || e); });
  }

  /* only fetch a few MB once the section is actually on screen */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      if (entries.some(function (e) { return e.isIntersecting; })) {
        io.disconnect();
        boot();
      }
    }, { rootMargin: '300px' });
    io.observe(ROOT);
  } else {
    boot();
  }

  function buildTabs() {
    var tabs = $('#nd-tabs');
    tabs.innerHTML = '';
    Object.keys(S.index.bags).forEach(function (name, i) {
      var m = S.index.bags[name];
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'nd-tab';
      b.dataset.bag = name;
      b.innerHTML =
        '<span class="nd-tab-name">' + bi('Sequence ' + (i + 1), '序列 ' + (i + 1)) + '</span>' +
        '<span class="nd-tab-meta">' +
        bi((m.targets.length + 1) + ' robots · ' + m.duration_s.toFixed(0) + ' s',
           (m.targets.length + 1) + ' 机 · ' + m.duration_s.toFixed(0) + ' s') +
        '</span>';
      b.onclick = function () { loadBag(name).catch(function (e) { loadError(e); }); };
      tabs.appendChild(b);
    });
  }

  /* ── data loading ─────────────────────────────────────────── */

  /* Switching sequence can fail after the widget is already running — a stale
     cached index.json pointing at a blob that has since been re-exported is the
     usual cause. Keep the sequence that still works and say what happened,
     rather than leaving a dead tab. */
  function loadError(err) {
    Array.prototype.forEach.call(ROOT.querySelectorAll('.nd-tab'), function (b) {
      b.classList.toggle('on', b.dataset.bag === S.name);
    });
    $('#nd-note').innerHTML = bi(
      'That sequence could not be loaded (' + (err.message || err) +
      '). Reload the page to try again.',
      '这段序列没能加载（' + (err.message || err) + '），刷新页面再试。');
  }

  function loadBag(name) {
    var meta = S.index.bags[name];
    Array.prototype.forEach.call(ROOT.querySelectorAll('.nd-tab'), function (b) {
      b.classList.toggle('on', b.dataset.bag === name);
    });
    return fetch(DATA + meta.file + VER)
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.arrayBuffer();
      })
      .then(function (buf) {
        var A = {};
        meta.layout.forEach(function (s) {
          A[s.name] = new Float32Array(buf, s.offset * 4, s.count);
        });

        S.name = name; S.meta = meta; S.A = A;
        S.T = meta.frames_played; S.K = meta.targets.length;
        S.dt = A.ts.length > 1 ? A.ts[1] - A.ts[0] : 0.04;
        S.t = 0;
        S.on = new Set(meta.targets.map(function (_, k) { return k; }));

        /* world-frame positions, precomputed once (ego arrays are as exported) */
        var T = S.T, K = S.K, tt, k;
        A.w_gt = new Float32Array(T * K * 3);
        A.w_est = new Float32Array(T * K * 3);
        A.w_obs = new Float32Array(T * 3);
        for (tt = 0; tt < T; tt++) {
          var R = quatToMat(A.c2w[tt * 7], A.c2w[tt * 7 + 1], A.c2w[tt * 7 + 2], A.c2w[tt * 7 + 3]);
          var o = [A.c2w[tt * 7 + 4], A.c2w[tt * 7 + 5], A.c2w[tt * 7 + 6]];
          A.w_obs[tt * 3] = o[0]; A.w_obs[tt * 3 + 1] = o[1]; A.w_obs[tt * 3 + 2] = o[2];
          for (k = 0; k < K; k++) {
            var i = (tt * K + k) * 3;
            var g = add(mv(R, [A.p_gt[i], A.p_gt[i + 1], A.p_gt[i + 2]]), o);
            var e = add(mv(R, [A.p_est[i], A.p_est[i + 1], A.p_est[i + 2]]), o);
            A.w_gt[i] = g[0]; A.w_gt[i + 1] = g[1]; A.w_gt[i + 2] = g[2];
            A.w_est[i] = e[0]; A.w_est[i + 1] = e[1]; A.w_est[i + 2] = e[2];
          }
        }

        /* view fitting: ego radius = p95 of |p_gt| (the max is one flyaway frame
           and would zoom the whole bag out to nothing), world box from the paths */
        var cen = [0, 0, 0], n = 0, i2;
        for (tt = 0; tt < T; tt++)
          for (k = 0; k < K; k++) {
            if (!A.valid[tt * K + k]) continue;
            i2 = (tt * K + k) * 3;
            cen[0] += A.p_gt[i2]; cen[1] += A.p_gt[i2 + 1]; cen[2] += A.p_gt[i2 + 2];
            n++;
          }
        /* aim between the observer and the cloud centroid, so neither is off-screen */
        for (var c = 0; c < 3; c++) cen[c] = n ? cen[c] / n * 0.65 : 0;
        var radii = [];
        for (tt = 0; tt < T; tt++)
          for (k = 0; k < K; k++) {
            if (!A.valid[tt * K + k]) continue;
            i2 = (tt * K + k) * 3;
            radii.push(Math.hypot(A.p_gt[i2] - cen[0], A.p_gt[i2 + 1] - cen[1],
                                  A.p_gt[i2 + 2] - cen[2]));
          }
        radii.push(Math.hypot(cen[0], cen[1], cen[2]));   // keep the observer in
        radii.sort(function (a, b) { return a - b; });
        var r = Math.min(Math.max(radii[Math.floor(radii.length * 0.95)] || 1, 0.8), 12);
        var lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
        var grow = function (arr, i) {
          for (var c2 = 0; c2 < 3; c2++) {
            lo[c2] = Math.min(lo[c2], arr[i + c2]); hi[c2] = Math.max(hi[c2], arr[i + c2]);
          }
        };
        for (tt = 0; tt < T; tt++) {
          grow(A.w_obs, tt * 3);
          for (k = 0; k < K; k++) if (A.valid[tt * K + k]) grow(A.w_gt, (tt * K + k) * 3);
        }
        S.fit = {
          ego: { r: r, center: cen, floor: 0 },
          world: {
            r: Math.max(Math.max((hi[0] - lo[0]) / 2, (hi[1] - lo[1]) / 2, (hi[2] - lo[2]) / 2), 0.5),
            center: [0, 1, 2].map(function (c3) { return (lo[c3] + hi[c3]) / 2; }),
            floor: lo[2] - 0.15,
          },
        };
        /* per-target error ceilings for the traces: p99 over the bag, min 1 unit */
        S.scale = { pos: chartMax(A.pos_err, A.valid), rot: chartMax(A.rot_err, A.valid) };

        drawSeqStat();
        resetView();
        invalidateCharts();
        layout();
      });
  }

  function chartMax(arr, valid) {
    var xs = [];
    for (var i = 0; i < arr.length; i++) if (valid[i]) xs.push(arr[i]);
    xs.sort(function (a, b) { return a - b; });
    return Math.max(xs[Math.floor(xs.length * 0.99)] || 1, 1e-3) * 1.08;
  }

  function drawSeqStat() {
    var m = S.meta, p = m.stats.pos.mean.toFixed(3), rr = m.stats.rot.mean.toFixed(2);
    var cam = Math.round(m.cam_rate * 100), uwb = Math.round(m.uwb_rate * 100);
    $('#nd-seqstat').innerHTML =
      bi('Mean error over this sequence <b>' + p + ' m</b> / <b>' + rr + '&deg;</b>',
         '本段序列平均误差 <b>' + p + ' m</b> / <b>' + rr + '&deg;</b>') +
      '<br>' +
      bi('Bearing available ' + cam + '% of frames, range ' + uwb + '%.',
         '相机 bearing 可用帧占 ' + cam + '%，UWB 测距 ' + uwb + '%。');
  }

  /* ── camera / projection ──────────────────────────────────── */

  function resetView() {
    var f = S.fit[S.view];
    S.cam.az = S.view === 'ego' ? -2.2 : -1.9;
    S.cam.el = S.view === 'ego' ? 0.45 : 1.02;
    /* focal fits the vertical half-extent at tan(0.44); leave ~15% margin */
    S.cam.dist = f.r / Math.tan(0.44) * 0.95 + 0.4;
    S.home = { az: S.cam.az, el: S.cam.el, dist: S.cam.dist };
  }

  function camera(w, h) {
    var f = S.fit[S.view];
    var c = f.center;
    var ce = Math.cos(S.cam.el), se = Math.sin(S.cam.el);
    var eye = add(c, [S.cam.dist * ce * Math.cos(S.cam.az),
                      S.cam.dist * ce * Math.sin(S.cam.az),
                      S.cam.dist * se]);
    var fwd = norm(sub(c, eye));
    var right = norm(cross(fwd, [0, 0, 1]));
    var up = cross(right, fwd);
    var focal = 0.5 * Math.min(w, h) / Math.tan(0.44);
    return {
      eye: eye, fwd: fwd, right: right, up: up, focal: focal,
      cx: w / 2, cy: h / 2, floor: f.floor,
      project: function (p) {
        var d = sub(p, eye);
        var z = dot(d, fwd);
        if (z < 0.05) return null;
        return [this.cx + (dot(d, right) / z) * focal,
                this.cy - (dot(d, up) / z) * focal, z];
      },
    };
  }

  /* ── scene ────────────────────────────────────────────────── */

  function drawScene() {
    var cv = $('#nd-scene'), ctx = cv.getContext('2d');
    var w = cv.clientWidth, h = cv.clientHeight;
    var dpr = window.devicePixelRatio || 1;
    if (!w || !h) return;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (!S.A) return;

    var cam = camera(w, h);
    var ti = frameIndex();
    var A = S.A, K = S.K, world = S.view === 'world';
    var seg = function (a, b) {
      var p = cam.project(a), q = cam.project(b);
      return p && q ? [p, q] : null;
    };

    /* ground: range rings around the observer (ego) or a room grid (world) */
    var f = S.fit[S.view];
    drawGround(ctx, cam, f, world, seg);

    /* observer */
    var obs = world ? [A.w_obs[ti * 3], A.w_obs[ti * 3 + 1], A.w_obs[ti * 3 + 2]] : [0, 0, 0];
    var Rc2w = quatToMat(A.c2w[ti * 7], A.c2w[ti * 7 + 1], A.c2w[ti * 7 + 2], A.c2w[ti * 7 + 3]);
    if (world && S.opts.trail) trail(ctx, cam, A.w_obs, 3, 0, ti, css('--nd-ink-dim'), 0.5, false);
    if (S.opts.triad) triad(ctx, cam, obs, world ? Rc2w : [1, 0, 0, 0, 1, 0, 0, 0, 1], 0.55, 1);
    var po = cam.project(obs);
    if (po) {
      ctx.fillStyle = css('--nd-ink');
      ctx.beginPath(); ctx.arc(po[0], po[1], 5, 0, 7); ctx.fill();
      ctx.font = '11px ui-monospace, monospace';
      ctx.fillStyle = css('--nd-ink-dim');
      ctx.fillText(t('observer', '观测者'), po[0] + 9, po[1] - 7);
    }

    /* targets, painted far to near */
    var order = [], k, i, g;
    for (k = 0; k < K; k++) {
      if (!S.on.has(k) || !A.valid[ti * K + k]) continue;
      i = (ti * K + k) * 3;
      g = world ? [A.w_gt[i], A.w_gt[i + 1], A.w_gt[i + 2]]
                : [A.p_gt[i], A.p_gt[i + 1], A.p_gt[i + 2]];
      var pp = cam.project(g);
      order.push([pp ? pp[2] : 1e9, k, g]);
    }
    order.sort(function (a, b) { return b[0] - a[0]; });

    order.forEach(function (row) {
      var k = row[1], g = row[2];
      var id = S.meta.targets[k];
      var color = PALETTE[id % PALETTE.length];
      var i = (ti * S.K + k) * 3;
      var e = world ? [A.w_est[i], A.w_est[i + 1], A.w_est[i + 2]]
                    : [A.p_est[i], A.p_est[i + 1], A.p_est[i + 2]];

      /* observation link: solid = bearing+range, dashed = bearing only,
         dotted = range only, nothing drawn = neither this frame */
      if (S.opts.links) {
        var cam_ok = A.cam_ok[ti * S.K + k] > 0.5, uwb_ok = A.uwb_ok[ti * S.K + k] > 0.5;
        if (cam_ok || uwb_ok) {
          var s = seg(obs, g);
          if (s) {
            ctx.save();
            ctx.strokeStyle = color;
            ctx.globalAlpha = cam_ok && uwb_ok ? 0.26 : 0.2;
            ctx.lineWidth = 1;
            ctx.setLineDash(cam_ok && uwb_ok ? [] : cam_ok ? [6, 4] : [1.5, 3]);
            ctx.beginPath(); ctx.moveTo(s[0][0], s[0][1]); ctx.lineTo(s[1][0], s[1][1]);
            ctx.stroke(); ctx.restore();
          }
        }
      }

      /* drop line to the ground plane, depth cue */
      var d = seg(g, [g[0], g[1], cam.floor]);
      if (d) {
        ctx.save(); ctx.strokeStyle = color; ctx.globalAlpha = 0.22;
        ctx.setLineDash([2, 3]); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(d[0][0], d[0][1]); ctx.lineTo(d[1][0], d[1][1]);
        ctx.stroke(); ctx.restore();
      }

      if (S.opts.trail) {
        trail(ctx, cam, world ? A.w_gt : A.p_gt, S.K * 3, k * 3, ti, color, 0.45, false, k);
        trail(ctx, cam, world ? A.w_est : A.p_est, S.K * 3, k * 3, ti, color, 0.75, true, k);
      }

      if (S.opts.triad) {
        var Rg = quatToMat(A.q_gt[(ti * S.K + k) * 4], A.q_gt[(ti * S.K + k) * 4 + 1],
                           A.q_gt[(ti * S.K + k) * 4 + 2], A.q_gt[(ti * S.K + k) * 4 + 3]);
        var Re = quatToMat(A.q_est[(ti * S.K + k) * 4], A.q_est[(ti * S.K + k) * 4 + 1],
                           A.q_est[(ti * S.K + k) * 4 + 2], A.q_est[(ti * S.K + k) * 4 + 3]);
        if (world) { Rg = mm(Rc2w, Rg); Re = mm(Rc2w, Re); }
        triad(ctx, cam, g, Rg, 0.4, 0.55);
        triad(ctx, cam, e, Re, 0.4, 1, true);
      }

      /* the error itself: GT hollow, estimate filled, a link between them */
      var pg = cam.project(g), pe = cam.project(e);
      if (S.opts.sigma && pg) {
        var sig = A.sig_pos[ti * S.K + k];
        var rpx = sig * cam.focal / Math.max(pg[2], 0.1);
        if (isFinite(rpx) && rpx > 1) {
          ctx.save(); ctx.strokeStyle = color; ctx.globalAlpha = 0.3;
          ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(pg[0], pg[1], Math.min(rpx, 400), 0, 7);
          ctx.stroke(); ctx.restore();
        }
      }
      if (pg && pe) {
        ctx.strokeStyle = color; ctx.globalAlpha = 0.9; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(pg[0], pg[1]); ctx.lineTo(pe[0], pe[1]); ctx.stroke();
      }
      if (pg) {
        ctx.strokeStyle = color; ctx.globalAlpha = 0.9; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(pg[0], pg[1], 7, 0, 7); ctx.stroke();
      }
      if (pe) {
        ctx.fillStyle = color; ctx.globalAlpha = 1;
        ctx.beginPath(); ctx.arc(pe[0], pe[1], 4.2, 0, 7); ctx.fill();
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = color; ctx.globalAlpha = 0.95;
        ctx.fillText(String(id), pe[0] + 8, pe[1] + 4);
      }
      ctx.globalAlpha = 1;
    });

    /* legend */
    ctx.font = '11px ui-monospace, monospace';
    ctx.fillStyle = css('--nd-ink-faint');
    ctx.fillText(t('○ ground truth   ● estimate   line = position error',
                   '○ 真值   ● 估计   连线 = 位置误差'), 12, h - 12);
  }

  function drawGround(ctx, cam, f, world, seg) {
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = css('--nd-grid');
    ctx.fillStyle = css('--nd-ink-faint');
    ctx.font = '10px ui-monospace, monospace';
    if (world) {
      var span = Math.min(Math.ceil(f.r + 0.5), 14);
      var step = span > 8 ? 2 : 1;
      for (var i = -span; i <= span; i += step) {
        var lines = [
          [[f.center[0] + i, f.center[1] - span, f.floor],
           [f.center[0] + i, f.center[1] + span, f.floor]],
          [[f.center[0] - span, f.center[1] + i, f.floor],
           [f.center[0] + span, f.center[1] + i, f.floor]],
        ];
        for (var li = 0; li < lines.length; li++) {
          var s = seg(lines[li][0], lines[li][1]);
          if (!s) continue;
          ctx.globalAlpha = i === 0 ? 0.8 : 0.38;
          ctx.beginPath(); ctx.moveTo(s[0][0], s[0][1]); ctx.lineTo(s[1][0], s[1][1]);
          ctx.stroke();
        }
      }
    } else {
      /* concentric range rings read the ego view better than a square grid:
         the distances they mark are exactly what the estimate is judged on */
      var maxR = Math.max(2, Math.ceil(f.r));
      var rstep = maxR > 8 ? 4 : 2;
      for (var rr = rstep; rr <= maxR; rr += rstep) {
        ctx.globalAlpha = 0.45;
        ctx.beginPath();
        var started = false, label = null;
        for (var a = 0; a <= 64; a++) {
          var th = a / 64 * Math.PI * 2;
          var q = cam.project([rr * Math.cos(th), rr * Math.sin(th), f.floor]);
          if (!q) { started = false; continue; }
          if (a === 0) label = q;
          if (started) ctx.lineTo(q[0], q[1]); else { ctx.moveTo(q[0], q[1]); started = true; }
        }
        ctx.stroke();
        if (label) {
          ctx.globalAlpha = 0.9;
          ctx.fillText(rr + ' m', label[0] + 4, label[1] - 3);
        }
      }
      ctx.globalAlpha = 0.28;
      for (var a2 = 0; a2 < 8; a2++) {
        var th2 = a2 / 8 * Math.PI * 2;
        var s2 = seg([0, 0, f.floor],
                     [maxR * Math.cos(th2), maxR * Math.sin(th2), f.floor]);
        if (!s2) continue;
        ctx.beginPath(); ctx.moveTo(s2[0][0], s2[0][1]); ctx.lineTo(s2[1][0], s2[1][1]);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function triad(ctx, cam, p, R, len, alpha, dashed) {
    var axes = ['#e05252', '#3fa45b', '#4a86e8'];
    for (var a = 0; a < 3; a++) {
      var dir = [R[a], R[3 + a], R[6 + a]];
      var q0 = cam.project(p), q1 = cam.project(add(p, scale(dir, len)));
      if (!q0 || !q1) continue;
      ctx.save();
      ctx.strokeStyle = axes[a]; ctx.globalAlpha = alpha; ctx.lineWidth = dashed ? 1.6 : 2;
      if (dashed) ctx.setLineDash([3, 2.5]);
      ctx.beginPath(); ctx.moveTo(q0[0], q0[1]); ctx.lineTo(q1[0], q1[1]); ctx.stroke();
      ctx.restore();
    }
  }

  function trail(ctx, cam, arr, stride, off, ti, color, alpha, dashed, k) {
    var N = Math.round(2.0 / S.dt);                  // 2 s of history
    var t0 = Math.max(0, ti - N);
    ctx.save();
    ctx.strokeStyle = color; ctx.globalAlpha = alpha; ctx.lineWidth = dashed ? 1 : 1.6;
    if (dashed) ctx.setLineDash([4, 3]);
    ctx.beginPath();
    var started = false;
    for (var i = t0; i <= ti; i++) {
      if (k != null && !S.A.valid[i * S.K + k]) { started = false; continue; }
      var b = i * stride + off;
      var p = cam.project([arr[b], arr[b + 1], arr[b + 2]]);
      if (!p) { started = false; continue; }
      if (started) ctx.lineTo(p[0], p[1]); else { ctx.moveTo(p[0], p[1]); started = true; }
    }
    ctx.stroke();
    ctx.restore();
  }

  /* ── error traces ─────────────────────────────────────────── */

  var charts = {};
  function invalidateCharts() { for (var k in charts) charts[k].dirty = true; }

  function chart(id, drawStatic) {
    var cv = $(id);
    var dpr = window.devicePixelRatio || 1;
    var w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return;
    var c = charts[id];
    if (!c) c = charts[id] = { buf: document.createElement('canvas'), dirty: true };
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      c.buf.width = cv.width; c.buf.height = cv.height;
      c.dirty = true;
    }
    if (c.dirty && S.A) {
      var bx = c.buf.getContext('2d');
      bx.setTransform(dpr, 0, 0, dpr, 0, 0);
      bx.clearRect(0, 0, w, h);
      drawStatic(bx, w, h);
      c.dirty = false;
    }
    var ctx = cv.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.drawImage(c.buf, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var x = 30 + (w - 36) * (frameIndex() / Math.max(S.T - 1, 1));
    ctx.strokeStyle = css('--nd-ink'); ctx.globalAlpha = 0.55; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function errorChart(key, ceiling, digits) {
    return function (ctx, w, h) {
      var A = S.A, K = S.K, T = S.T;
      var x0 = 30, x1 = w - 6, y0 = 6, y1 = h - 12;
      var X = function (t2) { return x0 + (x1 - x0) * (t2 / Math.max(T - 1, 1)); };
      var Y = function (v) { return y1 - (y1 - y0) * Math.min(v / ceiling, 1); };
      ctx.font = '9.5px ui-monospace, monospace';
      ctx.strokeStyle = css('--nd-line'); ctx.fillStyle = css('--nd-ink-faint');
      [0, 0.5, 1].forEach(function (frac) {
        var y = Y(ceiling * frac);
        ctx.globalAlpha = 0.7;
        ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillText((ceiling * frac).toFixed(digits), 2, y + 3);
      });
      for (var k = 0; k < K; k++) {
        if (!S.on.has(k)) continue;
        ctx.strokeStyle = PALETTE[S.meta.targets[k] % PALETTE.length];
        ctx.globalAlpha = 0.75; ctx.lineWidth = 0.9;
        ctx.beginPath();
        var started = false;
        for (var t2 = 0; t2 < T; t2++) {
          if (!A.valid[t2 * K + k]) { started = false; continue; }
          var x = X(t2), y = Y(A[key][t2 * K + k]);
          if (started) ctx.lineTo(x, y); else { ctx.moveTo(x, y); started = true; }
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };
  }

  /* ── live table ───────────────────────────────────────────── */

  function drawLive() {
    var A = S.A, ti = frameIndex();
    var sig = S.name + '|' + ti + '|' + Array.from(S.on).sort().join(',') + '|' + zh();
    if (S._liveSig === sig) return;
    S._liveSig = sig;
    var rows = [];
    for (var k = 0; k < S.K; k++) {
      var id = S.meta.targets[k];
      var color = PALETTE[id % PALETTE.length];
      var ok = A.valid[ti * S.K + k] > 0.5;
      var cam = A.cam_ok[ti * S.K + k] > 0.5, uwb = A.uwb_ok[ti * S.K + k] > 0.5;
      rows.push(
        '<tr data-k="' + k + '" class="' + (S.on.has(k) ? '' : 'off') + '">' +
        '<td><span class="nd-dot" style="background:' + color + '"></span>' +
        t('robot ', '机器人 ') + id +
        '<span class="nd-tag ' + (cam ? 'on' : '') + '">CAM</span>' +
        '<span class="nd-tag ' + (uwb ? 'on' : '') + '">UWB</span></td>' +
        '<td class="nd-num">' + (ok ? A.pos_err[ti * S.K + k].toFixed(3) + ' m' : '—') + '</td>' +
        '<td class="nd-num">' + (ok ? A.rot_err[ti * S.K + k].toFixed(2) + '°' : '—') + '</td></tr>');
    }
    var el = $('#nd-live');
    el.innerHTML = rows.join('');
    Array.prototype.forEach.call(el.querySelectorAll('tr'), function (tr) {
      tr.onclick = function () {
        var k = +tr.dataset.k;
        if (S.on.has(k)) S.on.delete(k); else S.on.add(k);
        invalidateCharts();
        S._liveSig = null;
      };
    });
  }

  /* ── playback + input ─────────────────────────────────────── */

  function frameIndex() {
    return Math.min(S.T - 1, Math.max(0, Math.round(S.t / S.dt)));
  }

  function tick(now) {
    var dt = S.last ? Math.min((now - S.last) / 1000, 0.1) : 0;
    S.last = now;
    if (S.playing && S.A) {
      S.t += dt * S.speed;
      var end = (S.T - 1) * S.dt;
      if (S.t > end) S.t = 0;
    }
    if (S.A) {
      drawScene();
      chart('#nd-chart-pos', errorChart('pos_err', S.scale.pos, 2));
      chart('#nd-chart-rot', errorChart('rot_err', S.scale.rot, 1));
      drawLive();
      $('#nd-seek').value = String(Math.round(1000 * S.t / Math.max((S.T - 1) * S.dt, 1e-6)));
      $('#nd-time').textContent =
        S.t.toFixed(2) + ' / ' + ((S.T - 1) * S.dt).toFixed(2) + ' s';
    }
    requestAnimationFrame(tick);
  }

  function setView(view) {
    S.view = view;
    Array.prototype.forEach.call(ROOT.querySelectorAll('[data-view]'), function (o) {
      o.classList.toggle('on', o.dataset.view === view);
    });
    if (S.A) resetView();
    layout();
  }

  function layout() {
    $('#nd-note').innerHTML = S.view === 'ego'
      ? bi('Raw model output: the observer sits at the origin, z is opposite gravity.',
           '模型原始输出：观测者位于原点，z 轴为重力反向。')
      : bi('World top-down: the relative estimates are placed back in the room with the ' +
           'observer’s ground-truth pose — that step uses ground truth and is only for ' +
           'reading the formation.',
           '世界系俯视：用观测者的真值位姿把相对估计拼回房间；这一步用了真值，仅用于观察编队。');
    invalidateCharts();
  }

  function wire() {
    var cv = $('#nd-scene');
    var drag = null;
    cv.addEventListener('pointerdown', function (e) {
      drag = { x: e.clientX, y: e.clientY }; cv.setPointerCapture(e.pointerId);
    });
    cv.addEventListener('pointermove', function (e) {
      if (!drag) return;
      S.cam.az -= (e.clientX - drag.x) * 0.006;
      S.cam.el = Math.max(-1.45, Math.min(1.5, S.cam.el + (e.clientY - drag.y) * 0.005));
      drag = { x: e.clientX, y: e.clientY };
    });
    var stop = function () { drag = null; };
    cv.addEventListener('pointerup', stop);
    cv.addEventListener('pointercancel', stop);
    cv.addEventListener('wheel', function (e) {
      e.preventDefault();
      S.cam.dist = Math.max(0.5, Math.min(200, S.cam.dist * Math.exp(e.deltaY * 0.001)));
    }, { passive: false });
    cv.addEventListener('dblclick', function () {
      S.cam = { az: S.home.az, el: S.home.el, dist: S.home.dist };
    });

    Array.prototype.forEach.call(ROOT.querySelectorAll('[data-view]'), function (b) {
      b.onclick = function () { setView(b.dataset.view); };
    });
    [['#nd-opt-trail', 'trail'], ['#nd-opt-triad', 'triad'],
     ['#nd-opt-sigma', 'sigma'], ['#nd-opt-links', 'links']].forEach(function (pair) {
      $(pair[0]).onchange = function (e) { S.opts[pair[1]] = e.target.checked; };
    });

    $('#nd-play').onclick = function () {
      S.playing = !S.playing;
      $('#nd-play').textContent = S.playing ? '❚❚' : '▶';
      $('#nd-play').setAttribute('aria-label', S.playing ? 'Pause' : 'Play');
    };
    $('#nd-seek').oninput = function (e) { S.t = (+e.target.value / 1000) * (S.T - 1) * S.dt; };
    $('#nd-speed').onchange = function (e) { S.speed = +e.target.value; };
    ['#nd-chart-pos', '#nd-chart-rot'].forEach(function (id) {
      var c = $(id);
      var seek = function (e) {
        var r = c.getBoundingClientRect();
        var f = (e.clientX - r.left - 30) / Math.max(r.width - 36, 1);
        S.t = Math.max(0, Math.min(1, f)) * (S.T - 1) * S.dt;
      };
      c.onpointerdown = function (e) { seek(e); c.setPointerCapture(e.pointerId); c._drag = true; };
      c.onpointermove = function (e) { if (c._drag) seek(e); };
      c.onpointerup = c.onpointercancel = function () { c._drag = false; };
    });

    window.addEventListener('resize', invalidateCharts);

    /* the page-wide EN / 中文 switch only toggles a class on <html>; the canvas
       and the generated rows have to be redrawn when it flips. */
    new MutationObserver(function () {
      S._liveSig = null;
      invalidateCharts();
      layout();
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  }
})();

/* AIOG hero replay — vanilla JS, canvas 2D, no dependencies, no video codec.
 *
 * One recorded CARLA vehicle trajectory, replayed twice side by side: the gimbal planner
 * and a fixed forward-facing camera, filling in the *same* LiDAR map. A voxel
 * is grey once the LiDAR has mapped it and turns blue once that run's camera
 * has coloured it. Which voxels end up coloured is the pipeline's own answer
 * (read out of its colored_cloud.ply); only the moment each one turns blue is
 * reconstructed here, by replaying the recorded camera poses.
 *
 * Data:
 *   data.json          coverage curves + headline stats
 *   scene/scene.json   grid, trajectory, both gimbal traces, camera model
 *   scene/voxels.bin   int16 gx,gy,gz for every voxel, then uint8 tMapped,
 *                      tColouredA, tColouredB in units of `tq` seconds
 *                      (255 = never)
 *   media.json         geometry of the two composite video tracks
 *   cam2.mp4           gimbal camera of both runs, side by side
 *   nv3.mp4            held-out viewpoint: ground truth | method A | method B
 *
 * The two tracks are fixed-fps and start at t = 0, so replay time *is*
 * video.currentTime; the page slices each pane back out with drawImage, which
 * keeps the browser down to two decoders and the panes always in step.
 *
 * One clock throughout: t = 0 is the first LiDAR frame of the sequence.
 */
(function () {
  'use strict';

  var ROOT = document.getElementById('aiog-hero');
  if (!ROOT) return;

  var SRC = ROOT.dataset.src || '';
  var VER = ROOT.dataset.version ? '?v=' + ROOT.dataset.version : '';

  var $ = function (sel) { return ROOT.querySelector(sel); };
  var zh = function () { return document.documentElement.classList.contains('lang-mode-zh'); };
  var tr = function (en, cn) { return zh() ? cn : en; };

  var PX = 2;                     // map pixels per voxel
  var NEVER = 255;
  var LANES = ['a', 'b'];

  var S = {
    ready: false, booted: false,
    t: 0, playing: true, speed: 2, last: 0,
    step: -1,                     // last time-step applied to the maps
    sc: null, metric: null, stats: null, media: null, vid: {},
    n: 0, gx: null, gy: null, gz: null, tm: null, tc: { a: null, b: null },
    mapW: 0, mapH: 0, spanY: 0, spanZ: 1,
    topZ: null, topV: null,
    off: {}, img: {},
    bb: null, view: null, seekTo: null,
  };

  /* ── boot ──────────────────────────────────────────────────────────────── */

  function chk(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r; }
  function getJSON(p) { return fetch(SRC + p + VER).then(chk).then(function (r) { return r.json(); }); }

  function boot() {
    if (S.booted) return;
    S.booted = true;
    Promise.all([
      getJSON('data.json'),
      getJSON('scene/scene.json'),
      getJSON('media.json').catch(function () { return null; }),
      fetch(SRC + 'scene/voxels.bin' + VER).then(chk).then(function (r) { return r.arrayBuffer(); }),
    ]).then(function (all) {
      S.metric = all[0].metric;
      S.stats = all[0].stats;
      S.basis = all[0].basis || 'reachable';
      S.sc = all[1];
      S.media = all[2];
      unpack(all[3]);
      build();
    }).catch(function (e) {
      $('.hd-status').textContent = tr('Could not load the replay: ', '回放加载失败：') + e.message;
    });
  }

  function unpack(buf) {
    var sc = S.sc, n = sc.count;
    var g = new Int16Array(buf, 0, n * 3);
    var u = new Uint8Array(buf, n * 6, n * 3);
    S.n = n;
    S.gx = new Int16Array(n); S.gy = new Int16Array(n); S.gz = new Int16Array(n);
    S.tm = new Uint8Array(n);
    S.tc.a = new Uint8Array(n); S.tc.b = new Uint8Array(n);
    for (var i = 0; i < n; i++) {
      S.gx[i] = g[i * 3]; S.gy[i] = g[i * 3 + 1]; S.gz[i] = g[i * 3 + 2];
      S.tm[i] = u[i * 3]; S.tc.a[i] = u[i * 3 + 1]; S.tc.b[i] = u[i * 3 + 2];
    }
    S.spanY = sc.span[1];
    S.spanZ = Math.max(1, sc.span[2]);
    S.mapW = sc.span[0] * PX;
    S.mapH = sc.span[1] * PX;
  }

  /* Counting sort into 256 time buckets: bucket s holds every voxel whose
     event lands on step s, so advancing the clock is a slice walk. */
  function buckets(times) {
    var n = S.n, start = new Int32Array(257), i, s;
    for (i = 0; i < n; i++) if (times[i] !== NEVER) start[times[i] + 1]++;
    for (s = 0; s < 256; s++) start[s + 1] += start[s];
    var order = new Int32Array(start[256]);
    var fill = start.slice(0, 256);
    for (i = 0; i < n; i++) {
      s = times[i];
      if (s !== NEVER) order[fill[s]++] = i;
    }
    return { order: order, start: start };
  }

  /* ── map painting ──────────────────────────────────────────────────────── */

  function paint(lane, v, blue) {
    var d = S.img[lane].data;
    var h = S.gz[v] / S.spanZ;
    var r, g, b;
    if (blue) {
      r = 29 + 67 * h; g = 78 + 87 * h; b = 216 + 34 * h;
    } else {
      var k = 0.80 + 0.32 * h;
      r = 150 * k; g = 162 * k; b = 178 * k;
    }
    var x0 = S.gx[v] * PX, y0 = (S.spanY - 1 - S.gy[v]) * PX;
    for (var dy = 0; dy < PX; dy++) {
      var o = ((y0 + dy) * S.mapW + x0) * 4;
      for (var dx = 0; dx < PX; dx++) {
        d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = 255;
        o += 4;
      }
    }
  }

  function resetMaps() {
    S.topZ.fill(-32768);
    S.topV.fill(-1);
    S.bb = null;
    for (var i = 0; i < LANES.length; i++) {
      var d = S.img[LANES[i]].data;
      for (var o = 0; o < d.length; o += 4) {
        d[o] = 244; d[o + 1] = 247; d[o + 2] = 251; d[o + 3] = 255;
      }
    }
    S.step = -1;
  }

  function applyStep(target) {
    if (target === S.step) return;
    if (target < S.step) resetMaps();
    var colW = S.spanY;
    for (var s = S.step + 1; s <= target; s++) {
      var B = S.bMap, k, v, col;
      for (k = B.start[s]; k < B.start[s + 1]; k++) {
        v = B.order[k];
        col = S.gx[v] * colW + S.gy[v];
        if (S.gz[v] <= S.topZ[col]) continue;   // a taller voxel already owns the column
        S.topZ[col] = S.gz[v];
        S.topV[col] = v;
        if (!S.bb) S.bb = [S.gx[v], S.gx[v], S.gy[v], S.gy[v]];
        else {
          if (S.gx[v] < S.bb[0]) S.bb[0] = S.gx[v];
          else if (S.gx[v] > S.bb[1]) S.bb[1] = S.gx[v];
          if (S.gy[v] < S.bb[2]) S.bb[2] = S.gy[v];
          else if (S.gy[v] > S.bb[3]) S.bb[3] = S.gy[v];
        }
        paint('a', v, S.tc.a[v] !== NEVER && S.tc.a[v] <= s);
        paint('b', v, S.tc.b[v] !== NEVER && S.tc.b[v] <= s);
      }
      for (var L = 0; L < LANES.length; L++) {
        var lane = LANES[L], C = S.bCol[lane];
        for (k = C.start[s]; k < C.start[s + 1]; k++) {
          v = C.order[k];
          col = S.gx[v] * colW + S.gy[v];
          if (S.topV[col] === v) paint(lane, v, true);
        }
      }
    }
    S.step = target;
    for (var j = 0; j < LANES.length; j++) {
      S.off[LANES[j]].ctx.putImageData(S.img[LANES[j]], 0, 0);
    }
  }

  /* ── canvas plumbing ───────────────────────────────────────────────────── */

  function fit(cv) {
    var r = cv.getBoundingClientRect();
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var w = Math.max(1, Math.round(r.width * dpr));
    var h = Math.max(1, Math.round(r.height * dpr));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    return { w: w, h: h, dpr: dpr };
  }

  function frameIndex() {
    var tr_ = S.sc.traj.t, lo = 0, hi = tr_.length - 1;
    while (lo < hi) {
      var mid = (lo + hi + 1) >> 1;
      if (tr_[mid] <= S.t) lo = mid; else hi = mid - 1;
    }
    return lo;
  }

  /* View rectangle, in map-pixel units: everything surveyed so far plus the
     vehicle, padded, never smaller than MIN_SPAN metres, eased toward its
     target so the camera glides open instead of jumping. */
  var MIN_SPAN = 150, PAD_M = 18;

  function updateView(g) {
    var sc = S.sc, cell = sc.cell, o = sc.origin;
    var i = frameIndex(), pos = sc.traj.pos[i];
    var vx = ((pos[0] - o[0]) / cell) * PX;
    var vy = (S.spanY - (pos[1] - o[1]) / cell) * PX;
    var x0 = vx, x1 = vx, y0 = vy, y1 = vy;
    if (S.bb) {
      x0 = Math.min(x0, S.bb[0] * PX); x1 = Math.max(x1, (S.bb[1] + 1) * PX);
      y0 = Math.min(y0, (S.spanY - 1 - S.bb[3]) * PX);
      y1 = Math.max(y1, (S.spanY - S.bb[2]) * PX);
    }
    var pad = (PAD_M / cell) * PX;
    x0 -= pad; x1 += pad; y0 -= pad; y1 += pad;
    var minPx = (MIN_SPAN / cell) * PX;
    var cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    var w = Math.max(x1 - x0, minPx), h = Math.max(y1 - y0, minPx);
    var aspect = g.w / g.h;
    if (w / h < aspect) w = h * aspect; else h = w / aspect;
    var target = { cx: cx, cy: cy, w: w, h: h };
    if (!S.view) S.view = target;
    else {
      var e = S.playing ? 0.08 : 1;
      S.view = {
        cx: S.view.cx + (target.cx - S.view.cx) * e,
        cy: S.view.cy + (target.cy - S.view.cy) * e,
        w: S.view.w + (target.w - S.view.w) * e,
        h: S.view.h + (target.h - S.view.h) * e,
      };
    }
    return S.view;
  }

  function drawMap(lane) {
    var cv = $('#hd-map-' + lane), g = fit(cv), ctx = cv.getContext('2d');
    var sc = S.sc;
    var V = lane === 'a' ? updateView(g) : S.view;
    var k = g.w / V.w;
    var sx = V.cx - V.w / 2, sy = V.cy - V.h / 2;
    ctx.clearRect(0, 0, g.w, g.h);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(S.off[lane].cv, sx, sy, V.w, V.h, 0, 0, g.w, g.h);

    var cell = sc.cell, o = sc.origin;
    function P(x, y) {
      return [(((x - o[0]) / cell) * PX - sx) * k,
              ((S.spanY - (y - o[1]) / cell) * PX - sy) * k];
    }

    var i = frameIndex(), pos = sc.traj.pos, p;
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = Math.max(1, 1.4 * g.dpr);
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (var j = 0; j <= i; j += 2) {
      p = P(pos[j][0], pos[j][1]);
      if (j === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
    }
    ctx.stroke();

    var here = P(pos[i][0], pos[i][1]);
    var yaw = (sc.traj.yaw[i] + S.sc.gimbal[lane].yaw[i]) * Math.PI / 180;
    var reach = (sc.camera.range / cell) * PX * k;
    if (reach < 6) reach = 6;
    var half = sc.camera.fovH * Math.PI / 360;

    ctx.fillStyle = 'rgba(139,92,246,0.20)';
    ctx.strokeStyle = 'rgba(139,92,246,0.75)';
    ctx.lineWidth = Math.max(1, 1 * g.dpr);
    ctx.beginPath();
    ctx.moveTo(here[0], here[1]);
    ctx.arc(here[0], here[1], reach, -yaw - half, -yaw + half);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    var vy = sc.traj.yaw[i] * Math.PI / 180, arm = 5 * g.dpr;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = Math.max(1.2, 1.6 * g.dpr);
    ctx.beginPath();
    ctx.moveTo(here[0], here[1]);
    ctx.lineTo(here[0] + Math.cos(-vy) * arm * 2, here[1] + Math.sin(-vy) * arm * 2);
    ctx.stroke();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(here[0], here[1], Math.max(2, 2.2 * g.dpr), 0, Math.PI * 2);
    ctx.fill();
  }

  /* Both photographic rows come out of one composite track each; a pane is a
     horizontal slice of the current video frame. */
  function drawPane(cv, video, track, index) {
    var g = fit(cv), ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, g.w, g.h);
    if (!video || video.readyState < 2 || !track) return;
    ctx.drawImage(video, index * track.paneW, 0, track.paneW, track.paneH,
                  0, 0, g.w, g.h);
  }

  function drawCam(lane) {
    drawPane($('#hd-cam-' + lane), S.vid.cam,
             S.media && S.media.cam, lane === 'a' ? 0 : 1);
  }

  /* While a track is playing it *is* the clock — the map, the charts and the
     readouts read S.t, and S.t reads the camera track. Nothing drifts, and no
     correction has to be applied. Seeks come from the transport, and a fresh
     seek is never issued while another request is still pending: re-assigning
     currentTime every frame restarts the seek forever and the element never
     produces a frame again. */
  function ready(v) { return v && v.readyState >= 1 && v.duration > 0; }

  function seekVideo(v, t) {
    if (!ready(v) || v.seeking) return;
    if (Math.abs(v.currentTime - t) <= 0.34) return;
    // a host that does not answer Range requests reports nothing seekable;
    // asking anyway leaves the element with no current frame at all
    var sk = v.seekable;
    if (!sk || !sk.length || sk.end(sk.length - 1) < t) return;
    try { v.currentTime = Math.min(t, v.duration - 0.01); } catch (e) {}
  }

  function syncVideos() {
    var want = S.seekTo != null ? S.seekTo : S.t;
    ['cam', 'nv'].forEach(function (key) {
      var v = S.vid[key];
      if (!v) return;
      if (S.playing) {
        if (v.playbackRate !== S.speed) v.playbackRate = S.speed;
        if (v.paused && ready(v)) { var q = v.play(); if (q && q.catch) q.catch(function () {}); }
      } else if (!v.paused) {
        v.pause();
      }
      // the camera track carries the clock, so it is only told where to go
      // when the transport asks; the novel-view track always follows along
      if (key === 'nv' || S.seekTo != null || !S.playing || !ready(S.vid.cam)) {
        seekVideo(v, want);
      }
    });

    // a drag can outrun the seeks it triggers: keep the latest target until the
    // camera track actually lands on it, and drop it if this host cannot seek
    if (S.seekTo != null) {
      var c = S.vid.cam;
      if (!c || !ready(c) || !c.seekable.length
          || Math.abs(c.currentTime - S.seekTo) <= 0.34) {
        S.seekTo = null;
      }
    }
  }

  /* ── coverage chart ────────────────────────────────────────────────────── */

  function interp(x, xs, ys) {
    if (x <= xs[0]) return ys[0];
    var i = 1;
    while (i < xs.length && xs[i] < x) i++;
    if (i >= xs.length) return ys[ys.length - 1];
    var f = (x - xs[i - 1]) / (xs[i] - xs[i - 1]);
    return ys[i - 1] + f * (ys[i] - ys[i - 1]);
  }

  function drawChart() {
    var cv = $('#hd-chart-cov'), g = fit(cv), ctx = cv.getContext('2d');
    var M = S.metric, pad = 6 * g.dpr;
    var box = { l: 34 * g.dpr, r: g.w - pad, t: pad, b: g.h - 16 * g.dpr };
    ctx.clearRect(0, 0, g.w, g.h);

    var X = function (t) { return box.l + (t / S.sc.duration) * (box.r - box.l); };
    var Y = function (v) { return box.b - v * (box.b - box.t); };

    ctx.strokeStyle = '#e2e8f0';
    ctx.fillStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.font = (9 * g.dpr) + 'px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (var v = 0; v <= 1.001; v += 0.25) {
      var y = Math.round(Y(v)) + 0.5;
      ctx.beginPath(); ctx.moveTo(box.l, y); ctx.lineTo(box.r, y); ctx.stroke();
      ctx.fillText(Math.round(v * 100) + '%', box.l - 4 * g.dpr, y);
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (var s = 0; s <= S.sc.duration; s += 30) {
      ctx.fillText(s + 's', X(s), box.b + 3 * g.dpr);
    }

    function series(key, color, dash, width) {
      var ys = M[key].cov, xs = M.t;
      ctx.save();
      ctx.setLineDash(dash || []);
      ctx.strokeStyle = color;
      ctx.lineWidth = width * g.dpr;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (var i = 0; i < xs.length; i++) {
        var px = X(xs[i]), py = Y(ys[i]);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.restore();
    }
    if (M.ceiling) series('ceiling', '#94a3b8', [4 * g.dpr, 3 * g.dpr], 1.2);
    series('b', '#94a3b8', null, 1.8);
    series('a', '#2563eb', null, 2.2);

    var px2 = X(S.t);
    ctx.strokeStyle = 'rgba(15,23,42,0.35)';
    ctx.lineWidth = 1 * g.dpr;
    ctx.beginPath(); ctx.moveTo(px2, box.t); ctx.lineTo(px2, box.b); ctx.stroke();
    LANES.forEach(function (lane) {
      var val = interp(S.t, M.t, M[lane].cov);
      ctx.fillStyle = lane === 'a' ? '#2563eb' : '#94a3b8';
      ctx.beginPath(); ctx.arc(px2, Y(val), 2.6 * g.dpr, 0, Math.PI * 2); ctx.fill();
    });
  }

  /* ── readouts + novel-view strip ───────────────────────────────────────── */

  function drawReadouts() {
    var i = frameIndex();
    LANES.forEach(function (lane) {
      var cov = interp(S.t, S.metric.t, S.metric[lane].cov);
      $('#hd-cov-' + lane).innerHTML = (cov * 100).toFixed(1) + '<small>%</small>';
      var y = S.sc.gimbal[lane].yaw[i];
      $('#hd-yaw-' + lane).innerHTML = (y >= 0 ? '+' : '') + y.toFixed(0) + '<small>&deg;</small>';
    });
    $('#hd-time').textContent = 't = ' + S.t.toFixed(1) + ' s';
  }

  function drawNovel() {
    ['gt', 'a', 'b'].forEach(function (tag, i) {
      drawPane($('#hd-nv-' + tag), S.vid.nv, S.media && S.media.novelView, i);
    });
  }

  /* ── loop ──────────────────────────────────────────────────────────────── */

  function render() {
    syncVideos();
    applyStep(Math.min(S.sc.steps - 1, Math.floor(S.t / S.sc.tq)));
    LANES.forEach(function (lane) { drawMap(lane); drawCam(lane); });
    drawChart();
    drawReadouts();
    drawNovel();
  }

  function tick(now) {
    if (S.playing) {
      var cam = S.vid.cam;
      if (S.seekTo == null && ready(cam) && !cam.paused && !cam.seeking) {
        S.t = cam.currentTime;                 // the track keeps the time
      } else if (S.seekTo != null) {
        S.t = S.seekTo;                        // the drag wins until it lands
      } else {
        var dt = S.last ? Math.min(0.25, (now - S.last) / 1000) : 0;
        S.t += dt * S.speed;
        if (S.t >= S.sc.duration) S.t = 0;
      }
      $('#hd-seek').value = String(Math.round(S.t / S.sc.duration * 1000));
    }
    S.last = now;
    render();
    requestAnimationFrame(tick);
  }

  /* ── build ─────────────────────────────────────────────────────────────── */

  function build() {
    S.topZ = new Int16Array(S.sc.span[0] * S.sc.span[1]);
    S.topV = new Int32Array(S.sc.span[0] * S.sc.span[1]);
    S.bMap = buckets(S.tm);
    S.bCol = { a: buckets(S.tc.a), b: buckets(S.tc.b) };

    LANES.forEach(function (lane) {
      var cv = document.createElement('canvas');
      cv.width = S.mapW; cv.height = S.mapH;
      var ctx = cv.getContext('2d');
      S.off[lane] = { cv: cv, ctx: ctx };
      S.img[lane] = ctx.createImageData(S.mapW, S.mapH);
    });

    if (S.media) {
      [['cam', S.media.cam], ['nv', S.media.novelView]].forEach(function (e) {
        if (!e[1]) return;
        var v = document.createElement('video');
        v.muted = true; v.defaultMuted = true; v.playsInline = true; v.loop = true;
        v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
        v.preload = 'auto';
        v.src = SRC + e[1].file + VER;
        v.className = 'hd-src';
        ROOT.appendChild(v);
        S.vid[e[0]] = v;
      });
    }
    resetMaps();

    var play = $('#hd-play'), seek = $('#hd-seek'), speed = $('#hd-speed');
    play.addEventListener('click', function () {
      S.playing = !S.playing;
      play.innerHTML = S.playing ? '&#10074;&#10074;' : '&#9654;';
      play.setAttribute('aria-label', S.playing ? 'Pause' : 'Play');
    });
    function scrub() {
      S.t = (+seek.value / 1000) * S.sc.duration;
      S.seekTo = S.t;
      S.view = null;
      render();
    }
    seek.addEventListener('input', scrub);
    seek.addEventListener('change', scrub);
    speed.addEventListener('change', function () { S.speed = +speed.value; });
    speed.value = String(S.speed);

    // #t=<seconds> deep-links a moment in the replay, paused there
    var m = /[#&]t=([0-9.]+)/.exec(window.location.hash);
    if (m) {
      S.t = Math.max(0, Math.min(S.sc.duration, parseFloat(m[1])));
      S.playing = false;
      play.innerHTML = '&#9654;';
      seek.value = String(Math.round(S.t / S.sc.duration * 1000));
    }

    if (!S.media) {
      var drop = ROOT.querySelectorAll('.hd-cam, .hd-nv');
      for (var d = 0; d < drop.length; d++) drop[d].style.display = 'none';
    }

    if (!S.metric.ceiling) {
      var keys2 = ROOT.querySelectorAll('.hd-legend .hd-k-ref');
      for (var q = 0; q < keys2.length; q++) keys2[q].parentNode.style.display = 'none';
    }
    var note = $('#hd-basis');
    if (note) {
      note.innerHTML = S.basis === 'reachable'
        ? '<span class="lang-en">&middot; share of camera-reachable surface</span>'
          + '<span class="lang-zh">&middot; 占相机可观测表面的比例</span>'
        : '<span class="lang-en">&middot; share of all LiDAR-mapped surface</span>'
          + '<span class="lang-zh">&middot; 占全部激光建图表面的比例</span>';
    }

    fillStats();
    ROOT.classList.add('is-ready');
    S.ready = true;
    requestAnimationFrame(tick);
    window.addEventListener('resize', function () { render(); });
  }

  function fillStats() {
    if (!S.stats) return;
    LANES.forEach(function (lane) {
      var st = S.stats[lane];
      if (!st) return;
      var cov = $('#hd-final-' + lane), tra = $('#hd-travel-' + lane);
      if (cov && st.coverage != null) cov.textContent = (st.coverage * 100).toFixed(1) + '%';
      if (tra && st.travelDeg != null) tra.textContent = Math.round(st.travelDeg) + '°';
    });
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { io.disconnect(); boot(); } });
    }, { rootMargin: '200px' });
    io.observe(ROOT);
  } else {
    boot();
  }
})();

/* Gimbal-policy replay — vanilla JS, canvas 2D, no dependencies.
 *
 * Same recorded 60 s flight, two gimbal policies, side by side. Each lane shows
 * the scene in 3D: the LiDAR voxel map filling in as it is surveyed, the carrier
 * flying its (identical) path, and the camera frustum swinging under that lane's
 * policy. A voxel is grey once mapped and turns blue the moment that run's
 * pipeline actually photographed it — those times come out of the pipeline, not
 * from anything recomputed here. Under each scene sits the gimbal band (yaw ×
 * pitch, shaded by dwell); the two charts at the bottom share the playhead.
 *
 * Data:
 *   data.json         coverage / cumulative-travel curves for the charts
 *   scene/scene.json  carrier trajectory + body attitude + both gimbal traces
 *   scene/voxels.bin  int16 x6 per voxel: grid index x,y,z then the three event
 *                     times (mapped, photographed by MINCO, photographed by SAC)
 *                     in units of `tq` seconds; -1 = never happened.
 * One clock throughout: t = 0 is the first mapped voxel, the same t0 behind the
 * coverage numbers.
 */
(function () {
  'use strict';

  var ROOT = document.getElementById('gimbal-demo');
  if (!ROOT) return;

  var SRC = ROOT.dataset.src || '';
  var VER = ROOT.dataset.version ? '?v=' + ROOT.dataset.version : '';

  var $ = function (sel) { return ROOT.querySelector(sel); };
  var zh = function () { return document.documentElement.classList.contains('lang-mode-zh'); };
  var t = function (en, cn) { return zh() ? cn : en; };
  var css = function (name) { return getComputedStyle(ROOT).getPropertyValue(name).trim(); };

  var LANES = [
    { key: 'plan', el: 'plan', color: '--gp-plan' },
    { key: 'sac', el: 'sac', color: '--gp-sac' },
  ];

  var S = {
    M: null, SC: null, V: null, T: 0, dt: 0.1, dur: 60,
    t: 0, playing: true, speed: 2, last: 0,
    cam: { az: Math.PI, el: 0.78, dist: 36 },
    home: null,
    grid: {}, gridIdx: {}, heat: {},
  };

  /* ── boot ─────────────────────────────────────────────────── */

  function chk(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r; }

  function boot() {
    if (S.booted) return;
    S.booted = true;
    Promise.all([
      fetch(SRC + 'data.json' + VER).then(chk).then(function (r) { return r.json(); }),
      fetch(SRC + 'scene/scene.json' + VER).then(chk).then(function (r) { return r.json(); }),
      fetch(SRC + 'scene/voxels.bin' + VER).then(chk).then(function (r) { return r.arrayBuffer(); }),
    ]).then(function (all) {
      S.M = all[0].metric;
      S.SC = all[1];
      S.V = unpack(all[2], S.SC);
      S.dt = S.SC.dt;
      S.dur = S.SC.duration;
      S.T = S.SC.traj.pos.length;
      S.home = { az: S.cam.az, el: S.cam.el, dist: S.cam.dist };
      LANES.forEach(function (l) {
        S.grid[l.key] = new Float32Array(GW * GH);
        S.gridIdx[l.key] = -1;
        S.heat[l.key] = document.createElement('canvas');
        S.heat[l.key].width = GW; S.heat[l.key].height = GH;
      });
      wire();
      ROOT.classList.add('is-ready');
      requestAnimationFrame(tick);
    }).catch(function (e) {
      $('#gp-status').textContent = t('The replay data could not be loaded (' +
        (e.message || e) + ').', '回放数据加载失败（' + (e.message || e) + '）。');
    });
  }

  /* Voxels arrive as grid indices; expand to metres once and sort along the
     corridor's long axis, so a window around the carrier is a binary search
     instead of a sweep over all 46k every frame. */
  function unpack(buf, sc) {
    var n = sc.count, raw = new Int16Array(buf), i;
    var c = sc.cell, q = sc.tq;
    var x = new Float32Array(n), y = new Float32Array(n), z = new Float32Array(n);
    var tm = new Float32Array(n), tp = new Float32Array(n), tsv = new Float32Array(n);
    var mn = sc.mapMin || [0, 0, 0];
    for (i = 0; i < n; i++) {
      var b = i * 6;
      x[i] = (raw[b] + 0.5) * c + mn[0];
      y[i] = (raw[b + 1] + 0.5) * c + mn[1];
      z[i] = (raw[b + 2] + 0.5) * c + mn[2];
      tm[i] = raw[b + 3] < 0 ? Infinity : raw[b + 3] * q;
      tp[i] = raw[b + 4] < 0 ? Infinity : raw[b + 4] * q;
      tsv[i] = raw[b + 5] < 0 ? Infinity : raw[b + 5] * q;
    }
    var ord = new Array(n);
    for (i = 0; i < n; i++) ord[i] = i;
    ord.sort(function (a, b2) { return x[a] - x[b2]; });
    var X = new Float32Array(n), Y = new Float32Array(n), Z = new Float32Array(n);
    var TM = new Float32Array(n), TP = new Float32Array(n), TS = new Float32Array(n);
    for (i = 0; i < n; i++) {
      var j = ord[i];
      X[i] = x[j]; Y[i] = y[j]; Z[i] = z[j];
      TM[i] = tm[j]; TP[i] = tp[j]; TS[i] = tsv[j];
    }
    return { n: n, x: X, y: Y, z: Z, mapped: TM, plan: TP, sac: TS };
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); boot(); }
    }, { rootMargin: '300px' });
    io.observe(ROOT);
  } else {
    boot();
  }

  /* ── small math ───────────────────────────────────────────── */

  function quatToMat(w, x, y, z) {
    var n = Math.hypot(w, x, y, z) || 1;
    w /= n; x /= n; y /= n; z /= n;
    return [
      1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y),
      2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x),
      2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y),
    ];
  }
  function mul(a, b) {
    var o = new Array(9);
    for (var r = 0; r < 3; r++)
      for (var c = 0; c < 3; c++)
        o[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
    return o;
  }
  function rotZ(a) { var c = Math.cos(a), s = Math.sin(a); return [c, -s, 0, s, c, 0, 0, 0, 1]; }
  function rotY(a) { var c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 1, 0, -s, 0, c]; }
  var mv = function (m, v) {
    return [m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
            m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
            m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
  };
  var add = function (a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; };
  var sub = function (a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; };
  var scl = function (a, s) { return [a[0] * s, a[1] * s, a[2] * s]; };
  var dot = function (a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; };
  var crs = function (a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  };
  var nrm = function (a) { var n = Math.hypot(a[0], a[1], a[2]) || 1; return scl(a, 1 / n); };

  function frameIndex() { return Math.min(S.T - 1, Math.max(0, Math.round(S.t / S.dt))); }

  function carrier(i) {
    var q = S.SC.traj.quat[i];
    return { p: S.SC.traj.pos[i], R: quatToMat(q[0], q[1], q[2], q[3]) };
  }

  /* camera rotation in world = R_body · Rz(yaw) · Ry(pitch), the same chain the
     simulator composes (both mount extrinsics are pure translations) */
  function cameraRot(lane, i) {
    var g = S.SC.gimbal[lane.key], D = Math.PI / 180;
    return mul(carrier(i).R, mul(rotZ(g.yaw[i] * D), rotY(g.pitch[i] * D)));
  }

  /* ── 3D scene ─────────────────────────────────────────────── */

  var SCALE = 0.55;               // voxels rasterise at this fraction, then upscale
  var WINDOW = 55;                // metres of corridor kept around the carrier

  function viewCamera(target, w, h) {
    var ce = Math.cos(S.cam.el), se = Math.sin(S.cam.el);
    var eye = add(target, [S.cam.dist * ce * Math.cos(S.cam.az),
                           S.cam.dist * ce * Math.sin(S.cam.az),
                           S.cam.dist * se]);
    var fwd = nrm(sub(target, eye));
    var right = nrm(crs(fwd, [0, 0, 1]));
    return { eye: eye, fwd: fwd, right: right, up: crs(right, fwd),
             focal: 0.5 * Math.min(w, h) / Math.tan(0.5), cx: w / 2, cy: h / 2 };
  }

  function project(cam, p) {
    var d = sub(p, cam.eye);
    var z = dot(d, cam.fwd);
    if (z < 0.4) return null;
    return [cam.cx + (dot(d, cam.right) / z) * cam.focal,
            cam.cy - (dot(d, cam.up) / z) * cam.focal, z];
  }

  /* Frame on the surfaces, not just on the carrier: the map is a facade off to
     one side, so centring on the carrier alone leaves half the frame empty.
     Aim halfway between the carrier (a little ahead of it) and the centroid of
     what is currently mapped, smoothed so the view does not jitter per frame.
     One aim point serves both lanes — they have to stay comparable. */
  function aimPoint(car, i, lo, hi) {
    var j = Math.min(S.T - 1, i + 20);
    var ahead = S.SC.traj.pos[j];
    var want = [(car.p[0] + ahead[0]) / 2, (car.p[1] + ahead[1]) / 2, car.p[2] - 1.0];
    var sx = 0, sy = 0, sz = 0, n = 0;
    for (var k = lo; k < hi; k += 13) {
      if (S.V.mapped[k] > S.t) continue;
      sx += S.V.x[k]; sy += S.V.y[k]; sz += S.V.z[k]; n++;
    }
    if (n) {
      want = [(want[0] + sx / n) / 2, (want[1] + sy / n) / 2, (want[2] + sz / n) / 2];
    }
    if (!S.aim || S.aimFrame == null || Math.abs(i - S.aimFrame) > 12) {
      S.aim = want;
    } else {
      for (var c = 0; c < 3; c++) S.aim[c] += (want[c] - S.aim[c]) * 0.12;
    }
    S.aimFrame = i;
    return S.aim;
  }

  function drawGround(ctx, cam, line, centre) {
    var step = 5, span = 30;
    var cx = Math.round(centre[0] / step) * step, cy = Math.round(centre[1] / step) * step;
    var col = css('--gp-grid');
    for (var d = -span; d <= span; d += step) {
      line([cx + d, cy - span, 0], [cx + d, cy + span, 0], col, 1, null, 0.5);
      line([cx - span, cy + d, 0], [cx + span, cy + d, 0], col, 1, null, 0.5);
    }
  }

  /* [top, front, right] for the two voxel states */
  function shade(base, k) {
    return [Math.min(255, Math.round(base[0] * k)),
            Math.min(255, Math.round(base[1] * k)),
            Math.min(255, Math.round(base[2] * k))];
  }
  /* [fill, rim] per visible face, per state. The rim is the outer sliver of each
     face: cells are exactly 0.4 m and therefore touch, so without it a flat
     floor renders as one unbroken sheet of colour. */
  function faceSet(base) {
    return [
      [shade(base, 1.13), shade(base, 0.99)],
      [base.slice(), shade(base, 0.87)],
      [shade(base, 0.84), shade(base, 0.73)],
    ];
  }
  var FACES = [faceSet([186, 197, 211]), faceSet([37, 99, 235])];

  function lowerBound(v) {
    var lo = 0, hi = S.V.n;
    while (lo < hi) { var m = (lo + hi) >> 1; if (S.V.x[m] < v) lo = m + 1; else hi = m; }
    return lo;
  }

  function drawScene(lane, i) {
    var cv = $('#gp-scene-' + lane.el), ctx = cv.getContext('2d');
    var w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return;
    var dpr = window.devicePixelRatio || 1;
    if (cv.width !== Math.round(w * dpr)) {
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    }
    var bw = Math.max(2, Math.round(w * SCALE)), bh = Math.max(2, Math.round(h * SCALE));
    var st = lane.raster;
    if (!st || st.w !== bw || st.h !== bh) {
      st = lane.raster = { w: bw, h: bh, buf: document.createElement('canvas') };
      st.buf.width = bw; st.buf.height = bh;
      st.img = st.buf.getContext('2d').createImageData(bw, bh);
      st.z = new Float32Array(bw * bh);
    }

    var car = carrier(i);
    var lo = lowerBound(car.p[0] - WINDOW), hi = lowerBound(car.p[0] + WINDOW);
    var look = (lane.key === 'plan' || !S.aim) ? aimPoint(car, i, lo, hi) : S.aim;
    var cam = viewCamera(look, bw, bh);
    var now = S.t;

    /* splat the voxels through a z-buffer: correct occlusion, no per-frame sort */
    var img = st.img.data, zb = st.z;
    img.fill(0);
    zb.fill(Infinity);
    var shot = lane.key === 'plan' ? S.V.plan : S.V.sac;
    var cell = S.SC.cell;
    var MAPPED = FACES[0], SHOT = FACES[1];
    /* Every cell is a real 0.4 m axis-aligned cube. Project its centre and the
       three axis half-edges, keep the three faces that look at the camera, and
       rasterise each as a parallelogram through the same z-buffer. The
       projection is written out longhand (no vector allocations) because this
       runs ~12k times per lane per frame. */
    var fx = cam.fwd[0], fy = cam.fwd[1], fz = cam.fwd[2];
    var rx = cam.right[0], ry = cam.right[1], rz = cam.right[2];
    var ux = cam.up[0], uy = cam.up[1], uz = cam.up[2];
    var ex = cam.eye[0], ey = cam.eye[1], ez = cam.eye[2];
    var F = cam.focal, CX = cam.cx, CY = cam.cy, hc = cell * 0.5;

    /* parallelogram centred at (px,py), spanned by ±a and ±b, at depth z */
    var fillFace = function (px, py, ax, ay, bx, by, col, z) {
      var hits = 0;
      var det = ax * by - ay * bx;
      if (det > -1e-9 && det < 1e-9) return 0;
      var inv = 1 / det;
      var spanx = Math.abs(ax) + Math.abs(bx), spany = Math.abs(ay) + Math.abs(by);
      var x0 = Math.floor(px - spanx), x1 = Math.ceil(px + spanx);
      var y0 = Math.floor(py - spany), y1 = Math.ceil(py + spany);
      if (x1 < 0 || y1 < 0 || x0 >= bw || y0 >= bh) return 0;
      if (x0 < 0) x0 = 0;
      if (y0 < 0) y0 = 0;
      if (x1 >= bw) x1 = bw - 1;
      if (y1 >= bh) y1 = bh - 1;
      for (var y = y0; y <= y1; y++) {
        var dyp = y + 0.5 - py, row = y * bw;
        for (var x = x0; x <= x1; x++) {
          var dxp = x + 0.5 - px;
          var u = (dxp * by - dyp * bx) * inv;
          if (u < -1 || u > 1) continue;
          var v = (ax * dyp - ay * dxp) * inv;
          if (v < -1 || v > 1) continue;
          var o = row + x;
          if (z >= zb[o]) continue;
          zb[o] = z;
          var au = u < 0 ? -u : u, av = v < 0 ? -v : v;
          var c = (au > 0.76 || av > 0.76) ? col[1] : col[0];
          var q = o * 4;
          img[q] = c[0]; img[q + 1] = c[1]; img[q + 2] = c[2]; img[q + 3] = 255;
          hits++;
        }
      }
      return hits;
    };

    for (var k = lo; k < hi; k++) {
      if (S.V.mapped[k] > now) continue;
      var wx = S.V.x[k], wy = S.V.y[k], wz = S.V.z[k];
      var dx = wx - ex, dy = wy - ey, dz = wz - ez;
      var zc = dx * fx + dy * fy + dz * fz;
      if (zc < 0.6) continue;
      var rc = dx * rx + dy * ry + dz * rz;
      var uc = dx * ux + dy * uy + dz * uz;
      var izc = F / zc;
      var px = CX + rc * izc, py = CY - uc * izc;
      if (px < -40 || py < -40 || px > bw + 40 || py > bh + 40) continue;

      var zx = zc + hc * fx, zy = zc + hc * fy, zz = zc + hc * fz;
      if (zx < 0.3 || zy < 0.3 || zz < 0.3) continue;
      var i1 = F / zx, i2 = F / zy, i3 = F / zz;
      var ax = CX + (rc + hc * rx) * i1 - px, ay = CY - (uc + hc * ux) * i1 - py;
      var bx = CX + (rc + hc * ry) * i2 - px, by = CY - (uc + hc * uy) * i2 - py;
      var cx = CX + (rc + hc * rz) * i3 - px, cy = CY - (uc + hc * uz) * i3 - py;

      var face = shot[k] <= now ? SHOT : MAPPED;

      /* the face on each axis that the camera is on the near side of */
      var sgx = ex > wx ? 1 : -1, sgy = ey > wy ? 1 : -1, sgz = ez > wz ? 1 : -1;
      var hit =
        fillFace(px + sgz * cx, py + sgz * cy, ax, ay, bx, by, face[0], zc + sgz * hc * fz) +
        fillFace(px + sgx * ax, py + sgx * ay, bx, by, cx, cy, face[1], zc + sgx * hc * fx) +
        fillFace(px + sgy * bx, py + sgy * by, ax, ay, cx, cy, face[2], zc + sgy * hc * fy);
      if (hit) continue;

      var sxp = Math.round(px), syp = Math.round(py);
      if (sxp < 0 || syp < 0 || sxp >= bw || syp >= bh) continue;
      var oo = syp * bw + sxp;
      if (zc >= zb[oo]) continue;
      zb[oo] = zc;
      var qq = oo * 4, fc = face[1][0];
      img[qq] = fc[0]; img[qq + 1] = fc[1]; img[qq + 2] = fc[2]; img[qq + 3] = 255;
    }
    st.buf.getContext('2d').putImageData(st.img, 0, 0);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(st.buf, 0, 0, bw, bh, 0, 0, w, h);

    /* the rest is drawn at full resolution on top of the voxel raster */
    var vcam = viewCamera(look, w, h);
    var line = function (a, b, style, width, dash, alpha) {
      var p1 = project(vcam, a), p2 = project(vcam, b);
      if (!p1 || !p2) return;
      ctx.save();
      ctx.strokeStyle = style; ctx.lineWidth = width || 1;
      ctx.globalAlpha = alpha == null ? 1 : alpha;
      if (dash) ctx.setLineDash(dash);
      ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke();
      ctx.restore();
    };

    drawGround(ctx, vcam, line, look);

    var PATH = '#f59e0b', f;
    for (f = Math.max(1, i - 200); f <= i; f++)
      line(S.SC.traj.pos[f - 1], S.SC.traj.pos[f], PATH, 2, null, 0.95);
    for (f = i + 1; f < Math.min(S.T, i + 200); f++)
      line(S.SC.traj.pos[f - 1], S.SC.traj.pos[f], PATH, 1.5, [3, 4], 0.45);

    /* camera frustum out to the colouring range */
    var R = cameraRot(lane, i);
    var eye = add(car.p, mv(car.R, S.SC.camera.mount));
    var D = Math.PI / 180;
    var th = Math.tan(S.SC.camera.fovH / 2 * D), tv = Math.tan(S.SC.camera.fovV / 2 * D);
    var rng = S.SC.camera.range, camCol = '#7c3aed';
    var corners = [[1, th, tv], [1, -th, tv], [1, -th, -tv], [1, th, -tv]].map(function (c) {
      return add(eye, scl(mv(R, nrm(c)), rng));
    });
    corners.forEach(function (c) { line(eye, c, camCol, 1.2, null, 0.55); });
    for (var c2 = 0; c2 < 4; c2++)
      line(corners[c2], corners[(c2 + 1) % 4], camCol, 2, null, 0.95);

    /* heading: the body's own forward axis, so the gimbal angles below can be
       read as "relative to where the aircraft is pointing" */
    var fwdW = mv(car.R, [1, 0, 0]), leftW = mv(car.R, [0, 1, 0]);
    var tip = add(car.p, scl(fwdW, 4.5));
    var HEAD = '#0f172a';
    line(car.p, tip, HEAD, 2, null, 0.9);
    line(tip, add(add(tip, scl(fwdW, -1.4)), scl(leftW, 0.75)), HEAD, 2, null, 0.9);
    line(tip, add(add(tip, scl(fwdW, -1.4)), scl(leftW, -0.75)), HEAD, 2, null, 0.9);

    var pc = project(vcam, car.p);
    if (pc) {
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(pc[0], pc[1], 6, 0, 7); ctx.fill();
      ctx.fillStyle = css('--gp-ink');
      ctx.beginPath(); ctx.arc(pc[0], pc[1], 3.4, 0, 7); ctx.fill();
      ctx.restore();
    }

    ctx.font = '10px ui-monospace, monospace';
    ctx.fillStyle = css('--gp-ink-faint');
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(t('drag to orbit · scroll to zoom', '拖动旋转 · 滚轮缩放'), 6, 5);
  }

  /* ── gimbal band (yaw × pitch, shaded by dwell) ───────────── */

  var GW = 108, GH = 60;
  var YAWLIM = 135, PMAX = 25, PMIN = -90, FOVH = 81, FOVV = 63;
  /* The band has to cover where the camera *sees*, not just where the gimbal can
     point: the field of view reaches half a FOV beyond the mechanical limits, so
     drawing only ±135 / +25…−90 clipped the dwell and the view box at the edges. */
  var VYAW = YAWLIM + FOVH / 2, VMAX = PMAX + FOVV / 2, VMIN = PMIN - FOVV / 2;

  function bandX(w, yaw) { return (yaw + VYAW) / (2 * VYAW) * w; }
  function bandY(h, p) { return (VMAX - p) / (VMAX - VMIN) * h; }

  function accumulate(lane, idx) {
    var g = S.grid[lane.key], gm = S.SC.gimbal[lane.key];
    var from = S.gridIdx[lane.key];
    if (idx < from) { g.fill(0); from = -1; }
    if (idx === from) return;
    var hw = FOVH / (2 * VYAW) * GW / 2, hh = FOVV / (VMAX - VMIN) * GH / 2;
    for (var i = Math.max(0, from + 1); i <= idx; i++) {
      var cx = (gm.yaw[i] + VYAW) / (2 * VYAW) * GW;
      var cy = (VMAX - gm.pitch[i]) / (VMAX - VMIN) * GH;
      var x0 = Math.max(0, Math.floor(cx - hw)), x1 = Math.min(GW - 1, Math.ceil(cx + hw));
      var y0 = Math.max(0, Math.floor(cy - hh)), y1 = Math.min(GH - 1, Math.ceil(cy + hh));
      for (var y = y0; y <= y1; y++)
        for (var x = x0; x <= x1; x++) g[y * GW + x] += 1;
    }
    S.gridIdx[lane.key] = idx;
  }

  function rgb(hex) {
    var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
    return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [100, 116, 139];
  }

  function drawBand(lane, idx) {
    var cv = $('#gp-band-' + lane.el), ctx = cv.getContext('2d');
    var w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return;
    var dpr = window.devicePixelRatio || 1;
    if (cv.width !== Math.round(w * dpr)) {
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    /* dwell normalised against its own maximum, so the structure survives to the
       end of the run instead of saturating into a flat block */
    accumulate(lane, idx);
    var g = S.grid[lane.key], max = 0, i;
    for (i = 0; i < g.length; i++) if (g[i] > max) max = g[i];
    if (max) {
      var buf = S.heat[lane.key], bctx = buf.getContext('2d');
      var im = bctx.createImageData(GW, GH), d = im.data, c = rgb(css(lane.color));
      for (i = 0; i < g.length; i++) {
        var a = g[i] ? Math.pow(g[i] / max, 0.62) * 0.52 : 0;
        d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2];
        d[i * 4 + 3] = Math.round(a * 255);
      }
      bctx.putImageData(im, 0, 0);
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(buf, 0, 0, GW, GH, 0, 0, w, h);
      ctx.restore();
    }

    ctx.strokeStyle = css('--gp-grid'); ctx.lineWidth = 1;
    ctx.beginPath();
    for (var y = -90; y <= 90; y += 45) {
      if (y === 0) continue;
      var px = Math.round(bandX(w, y)) + 0.5;
      ctx.moveTo(px, 0); ctx.lineTo(px, h);
    }
    for (var pt = 0; pt >= -45; pt -= 45) {
      var py = Math.round(bandY(h, pt)) + 0.5;
      ctx.moveTo(0, py); ctx.lineTo(w, py);
    }
    ctx.stroke();
    ctx.beginPath(); ctx.strokeStyle = css('--gp-line'); ctx.lineWidth = 1.5;
    var zx = Math.round(bandX(w, 0)) + 0.5;
    ctx.moveTo(zx, 0); ctx.lineTo(zx, h); ctx.stroke();

    /* how far the gimbal can actually turn */
    ctx.save();
    ctx.strokeStyle = css('--gp-line'); ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
    ctx.strokeRect(bandX(w, -YAWLIM), bandY(h, PMAX),
                   bandX(w, YAWLIM) - bandX(w, -YAWLIM),
                   bandY(h, PMIN) - bandY(h, PMAX));
    ctx.restore();

    var gm = S.SC.gimbal[lane.key], col = css(lane.color);
    var tail = Math.round(4 / S.dt);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.lineWidth = 1.6;
    ctx.strokeStyle = col;
    for (i = Math.max(1, idx - tail); i <= idx; i++) {
      var al = (i - (idx - tail)) / tail;
      ctx.globalAlpha = 0.1 + 0.55 * al * al;
      ctx.beginPath();
      ctx.moveTo(bandX(w, gm.yaw[i - 1]), bandY(h, gm.pitch[i - 1]));
      ctx.lineTo(bandX(w, gm.yaw[i]), bandY(h, gm.pitch[i]));
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    var cx = bandX(w, gm.yaw[idx]), cy = bandY(h, gm.pitch[idx]);
    var fw = FOVH / (2 * VYAW) * w, fh = FOVV / (VMAX - VMIN) * h;
    ctx.fillStyle = col; ctx.globalAlpha = 0.14;
    ctx.fillRect(cx - fw / 2, cy - fh / 2, fw, fh);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = col; ctx.lineWidth = 1.6;
    ctx.strokeRect(cx - fw / 2, cy - fh / 2, fw, fh);

    ctx.fillStyle = css('--gp-ink-faint');
    ctx.font = '9.5px ui-monospace, monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText(t('where the gimbal has been pointing (yaw × pitch)',
                   '云台指过的方向（yaw × pitch）'), w / 2, h - 3);
  }

  /* ── readouts ─────────────────────────────────────────────── */

  function interp(x, xs, ys) {
    if (x <= xs[0]) return ys[0];
    var n = xs.length;
    if (x >= xs[n - 1]) return ys[n - 1];
    var lo = 0, hi = n - 1;
    while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (xs[mid] <= x) lo = mid; else hi = mid; }
    var f = (x - xs[lo]) / (xs[hi] - xs[lo] || 1);
    return ys[lo] + f * (ys[hi] - ys[lo]);
  }

  function drawReadouts() {
    var m = S.M;
    LANES.forEach(function (l) {
      $('#gp-cov-' + l.el).innerHTML =
        (interp(S.t, m.t, m[l.key].cov) * 100).toFixed(1) + '<small>%</small>';
      $('#gp-tra-' + l.el).innerHTML =
        Math.round(interp(S.t, m.t, m[l.key].travel)).toLocaleString('en-US') + '<small>°</small>';
    });
  }

  /* ── charts ───────────────────────────────────────────────── */

  var cache = {};
  function invalidate() { for (var k in cache) cache[k].dirty = true; }

  function chart(id, draw) {
    var cv = $(id);
    var w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return;
    var dpr = window.devicePixelRatio || 1;
    var c = cache[id] || (cache[id] = { buf: document.createElement('canvas'), dirty: true });
    if (cv.width !== Math.round(w * dpr)) {
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      c.buf.width = cv.width; c.buf.height = cv.height;
      c.dirty = true;
    }
    if (c.dirty) {
      var bx = c.buf.getContext('2d');
      bx.setTransform(dpr, 0, 0, dpr, 0, 0);
      bx.clearRect(0, 0, w, h);
      draw(bx, w, h);
      c.dirty = false;
    }
    var ctx = cv.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.drawImage(c.buf, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var x = 34 + (w - 40) * (S.t / (S.dur || 1));
    ctx.strokeStyle = css('--gp-ink'); ctx.globalAlpha = 0.45; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, 2); ctx.lineTo(x, h - 12); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function frame(ctx, w, h, top, fmt, ticks) {
    var x0 = 34, x1 = w - 6, y0 = 6, y1 = h - 13;
    ctx.font = '9.5px ui-monospace, monospace';
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.strokeStyle = css('--gp-line');
    ctx.fillStyle = css('--gp-ink-faint');
    ticks.forEach(function (v) {
      var y = y1 - (y1 - y0) * (v / top);
      ctx.globalAlpha = 0.8;
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillText(fmt(v), x0 - 4, y);
    });
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    [0, 30, 60].forEach(function (sec) {
      ctx.fillText(sec + 's', x0 + (x1 - x0) * (sec / 60), y1 + 3);
    });
    return { x0: x0, x1: x1, y0: y0, y1: y1 };
  }

  function series(ctx, box, ts, vals, top, color, width, dash, alpha) {
    ctx.save();
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.globalAlpha = alpha == null ? 1 : alpha;
    if (dash) ctx.setLineDash(dash);
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (var i = 0; i < ts.length; i++) {
      var x = box.x0 + (box.x1 - box.x0) * (ts[i] / 60);
      var y = box.y1 - (box.y1 - box.y0) * (vals[i] / top);
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  function coverageChart(ctx, w, h) {
    var m = S.M, top = 0.9;
    var box = frame(ctx, w, h, top, function (v) { return Math.round(v * 100) + '%'; },
                    [0, 0.45, 0.9]);
    series(ctx, box, m.t, m.ceiling.cov, top, css('--gp-ink-faint'), 1, [3, 3], 0.75);
    series(ctx, box, m.t, m.plan.cov, top, css('--gp-plan'), 2);
    series(ctx, box, m.t, m.sac.cov, top, css('--gp-sac'), 2);
  }

  function travelChart(ctx, w, h) {
    var m = S.M, top = 5000;
    var box = frame(ctx, w, h, top, function (v) { return (v / 1000) + 'k°'; }, [0, 2500, 5000]);
    series(ctx, box, m.t, m.plan.travel, top, css('--gp-plan'), 2);
    series(ctx, box, m.t, m.sac.travel, top, css('--gp-sac'), 2);
  }

  /* ── loop + input ─────────────────────────────────────────── */

  function tick(now) {
    var dt = S.last ? Math.min((now - S.last) / 1000, 0.1) : 0;
    S.last = now;
    if (S.playing) {
      S.t += dt * S.speed;
      if (S.t > S.dur) S.t = 0;
    }
    var i = frameIndex();
    LANES.forEach(function (l) { drawScene(l, i); drawBand(l, i); });
    drawReadouts();
    chart('#gp-chart-cov', coverageChart);
    chart('#gp-chart-travel', travelChart);
    $('#gp-seek').value = String(Math.round(1000 * S.t / (S.dur || 1)));
    $('#gp-time').textContent = 't = ' + S.t.toFixed(1) + ' s';
    requestAnimationFrame(tick);
  }

  function wire() {
    $('#gp-play').onclick = function () {
      S.playing = !S.playing;
      this.textContent = S.playing ? '❚❚' : '▶';
    };
    $('#gp-seek').oninput = function (e) { S.t = (+e.target.value / 1000) * S.dur; };
    $('#gp-speed').value = String(S.speed);
    $('#gp-speed').onchange = function (e) { S.speed = +e.target.value; };

    /* both lanes share one camera — they have to stay comparable */
    LANES.forEach(function (l) {
      var cv = $('#gp-scene-' + l.el);
      var drag = null;
      cv.addEventListener('pointerdown', function (e) {
        drag = { x: e.clientX, y: e.clientY }; cv.setPointerCapture(e.pointerId);
      });
      cv.addEventListener('pointermove', function (e) {
        if (!drag) return;
        S.cam.az -= (e.clientX - drag.x) * 0.006;
        S.cam.el = Math.max(-0.15, Math.min(1.45, S.cam.el + (e.clientY - drag.y) * 0.005));
        drag = { x: e.clientX, y: e.clientY };
      });
      var stop = function () { drag = null; };
      cv.addEventListener('pointerup', stop);
      cv.addEventListener('pointercancel', stop);
      cv.addEventListener('wheel', function (e) {
        e.preventDefault();
        S.cam.dist = Math.max(6, Math.min(90, S.cam.dist * Math.exp(e.deltaY * 0.001)));
      }, { passive: false });
      cv.addEventListener('dblclick', function () {
        S.cam = { az: S.home.az, el: S.home.el, dist: S.home.dist };
      });
    });

    ['#gp-chart-cov', '#gp-chart-travel'].forEach(function (id) {
      var c = $(id);
      var seek = function (e) {
        var r = c.getBoundingClientRect();
        var f = (e.clientX - r.left - 34) / Math.max(r.width - 40, 1);
        S.t = Math.max(0, Math.min(1, f)) * S.dur;
      };
      c.onpointerdown = function (e) { seek(e); c.setPointerCapture(e.pointerId); c._drag = true; };
      c.onpointermove = function (e) { if (c._drag) seek(e); };
      c.onpointerup = c.onpointercancel = function () { c._drag = false; };
    });

    window.addEventListener('resize', invalidate);
    new MutationObserver(invalidate).observe(document.documentElement,
      { attributes: true, attributeFilter: ['class'] });
  }
})();

/* All artwork is drawn locally. No images, fonts, or network requests. */
(function (root) {
  'use strict';
  const H = root.Harvest;
  const TAU = Math.PI * 2;
  const BLADES = ['#bce6d5', '#ffc5a1', '#ffe69b', '#cebdff', '#98e4dc', '#f5b5e0'];
  function ellipse(c, x, y, rx, ry, angle = 0) { c.beginPath(); c.ellipse(x, y, rx, ry, angle, 0, TAU); }
  function line(c, points) { c.beginPath(); c.moveTo(...points[0]); for (const p of points.slice(1)) c.lineTo(...p); }
  function body(c, shape) {
    c.beginPath();
    if (shape === 'apple') {
      c.moveTo(0, -24); c.bezierCurveTo(-33, -41, -43, 8, -20, 28); c.bezierCurveTo(-10, 37, -4, 26, 0, 29); c.bezierCurveTo(5, 26, 13, 36, 23, 26); c.bezierCurveTo(43, 5, 29, -40, 0, -24);
    } else if (shape === 'banana') {
      c.moveTo(-29, -24); c.bezierCurveTo(-24, 27, 13, 40, 31, 4); c.bezierCurveTo(7, 21, -8, 8, -18, -24); c.closePath();
    } else if (shape === 'pear') {
      c.moveTo(0, -32); c.bezierCurveTo(-17, -33, -15, -9, -27, 5); c.bezierCurveTo(-45, 39, 44, 40, 27, 5); c.bezierCurveTo(15, -9, 17, -33, 0, -32);
    } else if (shape === 'star') {
      for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? 17 : 33; const x = Math.cos(a) * r, y = Math.sin(a) * r; if (!i) c.moveTo(x, y); else c.lineTo(x, y); } c.closePath();
    } else if (shape === 'pineapple') c.ellipse(0, 5, 24, 30, 0, 0, TAU);
    else if (shape === 'oval' || shape === 'dragon') c.ellipse(0, 0, 28, 33, -0.10, 0, TAU);
    else c.arc(0, 0, 30, 0, TAU);
  }
  function leaf(c, x, y, rotation, size = 1) {
    c.save(); c.translate(x, y); c.rotate(rotation); c.scale(size, size);
    c.fillStyle = '#8ccf91'; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(0, -15, 19, -11); c.quadraticCurveTo(19, 3, 0, 0); c.fill();
    c.strokeStyle = '#39775c'; c.lineWidth = 1; line(c, [[1, 0], [15, -7]]); c.stroke(); c.restore();
  }
  function drawFruit(c, type, inside = false) {
    const fruit = H.FRUITS[type], shape = fruit.shape;
    c.save();
    c.lineJoin = 'round'; c.lineCap = 'round';
    if (shape === 'grape') {
      const grapes = [[-10, -19], [10, -19], [-19, -2], [0, -3], [19, -2], [-10, 14], [10, 14], [0, 27]];
      for (const [x, y] of grapes) {
        const g = c.createRadialGradient(x - 3, y - 5, 1, x, y, 11); g.addColorStop(0, inside ? '#fff0e7' : fruit.light); g.addColorStop(1, inside ? fruit.flesh : fruit.skin);
        ellipse(c, x, y, 10.5, 10.5); c.fillStyle = g; c.fill(); c.strokeStyle = '#563b67'; c.lineWidth = 1.4; c.stroke();
        if (inside) { ellipse(c, x, y, 2, 3, 0.5); c.fillStyle = fruit.seed; c.fill(); }
        else { ellipse(c, x - 3, y - 4, 3, 1.5, -0.5); c.fillStyle = '#ffffff65'; c.fill(); }
      }
    } else {
      const g = c.createRadialGradient(-14, -17, 2, 9, 13, 55); g.addColorStop(0, inside ? fruit.flesh : fruit.light); g.addColorStop(1, fruit.skin);
      body(c, shape); c.fillStyle = g; c.fill(); c.strokeStyle = '#172e38'; c.lineWidth = 2.1; c.stroke();
      c.save(); body(c, shape); c.clip();
      if (inside) {
        c.save(); c.scale(0.87, 0.87); body(c, shape); c.fillStyle = fruit.flesh; c.fill(); c.restore();
        if (type === 2 || type === 14) {
          for (let i = 0; i < 9; i++) { const a = i * TAU / 9; c.strokeStyle = '#fff3cc'; c.lineWidth = 1.8; line(c, [[0, 0], [Math.cos(a) * 24, Math.sin(a) * 24]]); c.stroke(); }
          ellipse(c, 0, 0, 4, 4); c.fillStyle = '#fff3cc'; c.fill();
        } else if (type === 12) {
          for (let i = 0; i < 6; i++) { const a = i * TAU / 6; ellipse(c, Math.cos(a) * 12, Math.sin(a) * 12, 8, 13, a); c.fillStyle = '#fffbf0'; c.fill(); c.strokeStyle = '#e7d2dc'; c.lineWidth = 1; c.stroke(); }
        } else if (type === 13) {
          ellipse(c, 0, 0, 9, 12); c.fillStyle = '#eef7be'; c.fill();
          for (let i = 0; i < 18; i++) { const a = i * TAU / 18; ellipse(c, Math.cos(a) * 17, Math.sin(a) * 21, 1.3, 2.3, a - Math.PI / 2); c.fillStyle = fruit.seed; c.fill(); }
        } else {
          const rng = H.random(1703 + type * 111);
          const number = [0, 1, 5, 8, 9, 11].includes(type) ? 7 : type === 6 ? 32 : 19;
          for (let i = 0; i < number; i++) {
            let x = (rng() - 0.5) * 42, y = (rng() - 0.5) * 44;
            if (type === 0) { x = (i % 2 ? 1 : -1) * (5 + rng() * 4); y *= 0.4; }
            if (type === 11) { x *= 0.5; y *= 0.7; }
            ellipse(c, x, y, type === 6 ? 0.9 : 1.9, type === 6 ? 1.2 : 3, rng() * 2); c.fillStyle = fruit.seed; c.fill();
          }
        }
      } else {
        if (type === 7) {
          c.strokeStyle = '#397f65'; c.lineWidth = 5;
          for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * 15, -35); c.bezierCurveTo(i * 8 - 8, -12, i * 8 + 8, 12, i * 15, 35); c.stroke(); }
        }
        if (type === 4) {
          c.strokeStyle = '#ab793b'; c.lineWidth = 1.4;
          for (let i = -5; i < 6; i++) { line(c, [[-35, i * 11 - 25], [35, i * 11 + 25]]); c.stroke(); line(c, [[-35, i * 11 + 25], [35, i * 11 - 25]]); c.stroke(); }
        }
        if ([2, 10, 13].includes(type)) {
          const rng = H.random(712 + type);
          c.fillStyle = type === 13 ? '#69534280' : '#ffffff36';
          for (let i = 0; i < 45; i++) { ellipse(c, (rng() - 0.5) * 58, (rng() - 0.5) * 62, 0.8, type === 13 ? 1.9 : 0.8); c.fill(); }
        }
        if (type === 6) for (let i = 0; i < 8; i++) { const a = i * TAU / 8; leaf(c, Math.cos(a) * 25, Math.sin(a) * 27, a + 0.7, 0.45); }
        c.fillStyle = '#ffffff40'; ellipse(c, -12, -13, 8, 14, 0.6); c.fill();
        c.fillStyle = '#ffffff65'; ellipse(c, -13, -18, 3, 5, 0.6); c.fill();
      }
      c.restore();
    }
    if (!inside && type !== 1) {
      c.strokeStyle = '#816349'; c.lineWidth = 3.5; line(c, [[0, -27], [3, -37]]); c.stroke();
      if (type === 4) { for (let i = 0; i < 5; i++) leaf(c, 0, -20, -1.9 + i * 0.4, 1.05); }
      else if ([12, 14].includes(type)) for (let i = 0; i < 4; i++) leaf(c, 0, -25, i * Math.PI / 2, 0.65);
      else if (type === 8) { c.fillStyle = '#d09b67'; c.beginPath(); c.moveTo(-9, -28); c.lineTo(-8, -40); c.lineTo(0, -34); c.lineTo(8, -40); c.lineTo(9, -28); c.fill(); }
      else leaf(c, 2, -30, -0.25, 0.65);
    }
    c.restore();
  }
  function drawPot(c) {
    c.save(); c.lineJoin = 'round';
    const g = c.createLinearGradient(-22, -20, 25, 25); g.addColorStop(0, '#d4b59b'); g.addColorStop(1, '#866a67');
    c.beginPath(); c.moveTo(-25, -17); c.lineTo(-20, 21); c.quadraticCurveTo(0, 33, 20, 21); c.lineTo(25, -17); c.closePath(); c.fillStyle = g; c.fill(); c.strokeStyle = '#352d3d'; c.lineWidth = 2.5; c.stroke();
    c.fillStyle = '#edd6b6'; c.fillRect(-28, -24, 56, 10); c.strokeRect(-28, -24, 56, 10);
    c.strokeStyle = '#604851'; c.lineWidth = 2; line(c, [[12, -14], [3, -2], [11, 5], [2, 23]]); c.stroke();
    c.fillStyle = '#423847'; c.beginPath(); c.moveTo(-13, -6); c.lineTo(-2, 13); c.lineTo(-24, 13); c.closePath(); c.fill();
    c.fillStyle = '#ffe7c1'; c.fillRect(-14, 0, 2, 6); ellipse(c, -13, 9, 1, 1); c.fill(); c.restore();
  }
  class Renderer {
    constructor(canvas) {
      this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.cache = new Map(); this.background = null; this.chapter = -1;
      this.width = 390; this.height = 844; this.dpr = 1; this.trail = []; this.shake = 0; this.pulse = 0;
      this.motes = Array.from({ length: 30 }, (_, i) => { const rng = H.random(i * 731 + 51); return { x: rng(), y: rng(), r: rng() * 2 + 1, phase: rng() * TAU }; });
    }
    resize(w, h, quality) {
      this.width = w; this.height = h; this.dpr = Math.min(root.devicePixelRatio || 1, quality === 'low' ? 1 : 2);
      this.canvas.width = Math.round(w * this.dpr); this.canvas.height = Math.round(h * this.dpr); this.canvas.style.width = w + 'px'; this.canvas.style.height = h + 'px';
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); this.background = null; this.trail = [];
    }
    sprite(type, inside = false) {
      const key = type + '-' + inside;
      if (!this.cache.has(key)) {
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 168;
        const c = canvas.getContext('2d'); c.translate(84, 84); c.scale(2, 2);
        if (type === 'pot') drawPot(c); else drawFruit(c, type, inside);
        this.cache.set(key, canvas);
      }
      return this.cache.get(key);
    }
    image(type) { return this.sprite(type).toDataURL(); }
    scene(chapter, contrast) {
      if (this.background && this.chapter === chapter && this.contrast === contrast) return;
      this.chapter = chapter; this.contrast = contrast;
      const w = this.width, h = this.height, colors = H.CHAPTERS[chapter].colors;
      const canvas = document.createElement('canvas'); canvas.width = Math.round(w * this.dpr); canvas.height = Math.round(h * this.dpr);
      const c = canvas.getContext('2d'); c.scale(this.dpr, this.dpr);
      const sky = c.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, colors[0]); sky.addColorStop(0.7, contrast ? '#152932' : colors[1]); sky.addColorStop(1, colors[0]); c.fillStyle = sky; c.fillRect(0, 0, w, h);
      const glow = c.createRadialGradient(w * 0.73, h * 0.28, 10, w * 0.73, h * 0.28, Math.max(w, h) * 0.7); glow.addColorStop(0, colors[2] + (contrast ? '10' : '22')); glow.addColorStop(1, '#ffffff00'); c.fillStyle = glow; c.fillRect(0, 0, w, h);
      c.globalAlpha = contrast ? 0.12 : 0.4;
      c.fillStyle = colors[2]; ellipse(c, w * 0.79, h * 0.21, chapter === 2 || chapter === 4 ? 34 : 48, chapter === 2 || chapter === 4 ? 34 : 48); c.fill();
      if (chapter === 2 || chapter === 4) { c.globalAlpha = 0.4; c.fillStyle = '#fff1dd'; const rng = H.random(445); for (let i = 0; i < 45; i++) { ellipse(c, rng() * w, rng() * h * 0.68, rng() * 1.5 + 0.4, 1); c.fill(); } }
      for (let layer = 0; layer < 3; layer++) {
        c.globalAlpha = 0.16 + layer * 0.12; c.fillStyle = colors[0]; c.beginPath(); c.moveTo(-50, h);
        c.lineTo(-50, h * (0.74 + layer * 0.07)); c.bezierCurveTo(w * 0.18, h * (0.57 + layer * 0.09), w * 0.68, h * (0.96 - layer * 0.05), w + 50, h * (0.65 + layer * 0.08)); c.lineTo(w + 50, h); c.closePath(); c.fill();
      }
      c.globalAlpha = contrast ? 0.16 : 0.45;
      const foliage = H.random(836 + chapter * 79);
      for (const side of [-1, 1]) {
        const x = side < 0 ? -8 : w + 8;
        c.strokeStyle = '#102e35'; c.lineWidth = 7; c.beginPath(); c.moveTo(x, h * 0.85); c.quadraticCurveTo(x + side * 36, h * 0.5, x - side * 70, h * 0.08); c.stroke();
        for (let i = 0; i < 11; i++) { const y = h * (0.12 + i * 0.055); c.save(); c.translate(x - side * (12 + foliage() * 30), y); c.rotate(side * (-0.8 + foliage() * 0.4)); c.fillStyle = i % 2 ? '#79a98b' : '#17433d'; ellipse(c, 0, 0, 12 + foliage() * 18, chapter === 3 ? 39 : 23); c.fill(); c.restore(); }
      }
      if (chapter === 1) { c.globalAlpha = 0.22; c.strokeStyle = '#e3b88b'; c.lineWidth = 4; c.strokeRect(w * 0.12, h * 0.65, w * 0.76, h * 0.35); }
      if (chapter === 2) {
        c.globalAlpha = 0.45;
        for (const x of [w * 0.09, w * 0.91]) { c.strokeStyle = '#d1c4b4'; c.lineWidth = 1; line(c, [[x, 0], [x, h * 0.23]]); c.stroke(); c.fillStyle = '#e3cfac'; ellipse(c, x, h * 0.24, 9, 14); c.fill(); }
      }
      c.globalAlpha = 0.10; c.strokeStyle = '#e3d2b6'; c.lineWidth = 1;
      for (let i = -2; i < 8; i++) { line(c, [[w / 2, h * 0.85], [w * i / 5, h]]); c.stroke(); }
      line(c, [[0, h - 34], [w, h - 34]]); c.stroke();
      c.globalAlpha = 1; this.background = canvas;
    }
    addTrail(x, y, gesture, clock) { this.trail.push({ x, y, gesture, clock }); if (this.trail.length > 80) this.trail.shift(); }
    draw(engine, clock, options = {}) {
      const c = this.ctx, w = this.width, h = this.height, settings = engine?.settings || options.settings || H.defaultSave().settings;
      const chapter = engine?.chapter ?? options.chapter ?? 0;
      this.scene(chapter, settings.contrast);
      c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); c.clearRect(0, 0, w, h); c.drawImage(this.background, 0, 0, w, h);
      c.save();
      if (!settings.reduced && this.shake > 0) c.translate(Math.sin(clock * 77) * this.shake, Math.cos(clock * 67) * this.shake * 0.65);
      this.shake *= 0.84;
      if (!settings.reduced && settings.quality !== 'low') {
        c.fillStyle = H.CHAPTERS[chapter].colors[2];
        for (const p of this.motes) { c.globalAlpha = (0.13 + Math.sin(clock * 0.5 + p.phase) * 0.06); ellipse(c, p.x * w + Math.sin(clock * 0.2 + p.phase) * 13, (p.y * h - clock * 4 % h + h) % h, p.r, p.r); c.fill(); }
        c.globalAlpha = 1;
      }
      if (engine) {
        if (engine.time < engine.rushUntil) { c.strokeStyle = '#ffe09c55'; c.lineWidth = 2; c.strokeRect(11, 11, w - 22, h - 22); }
        // Readable anticipation for the two mechanics that ask the player to choose a route.
        for (let i = engine.eventIndex; i < Math.min(engine.events.length, engine.eventIndex + 6); i++) {
          const event = engine.events[i], wait = event.at - engine.time;
          if (wait < 0 || wait > 0.55 || event.index !== 0) continue;
          const b = engine.bounds;
          c.save(); c.globalAlpha = (1 - wait / 0.55) * 0.45;
          if (event.pattern === 'orbit') {
            c.strokeStyle = '#e1c8f5'; c.lineWidth = 1; c.setLineDash([3, 10]);
            ellipse(c, (b.left + b.right) / 2, b.top + b.depth * 0.44, Math.min(b.span * 0.23, 150), Math.min(b.depth * 0.24, 100)); c.stroke(); c.setLineDash([]);
          } else if (event.hazard) {
            c.fillStyle = '#ffd2b6'; c.textAlign = 'center'; c.font = '600 20px system-ui'; c.fillText('!', b.left + b.span * (event.variant ? 0.94 : 0.06), b.bottom - 30);
          }
          c.restore();
        }
        const rings = new Set();
        for (const e of engine.entities) if (e.orbit && !rings.has(e.wave)) { rings.add(e.wave); c.strokeStyle = '#e1c8f530'; c.lineWidth = 1; c.setLineDash([3, 10]); ellipse(c, e.orbit.cx, e.orbit.cy, e.orbit.rx, e.orbit.ry); c.stroke(); c.setLineDash([]); }
        for (const f of engine.fragments) this.entity(f, true);
        for (const e of engine.entities) if (!e.dead) this.entity(e, false, settings.contrast);
        for (const p of engine.particles) { c.globalAlpha = H.clamp(p.life / p.maxLife, 0, 1); c.fillStyle = p.color; if (p.pot) c.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2); else { ellipse(c, p.x, p.y, p.r, p.r * 1.25); c.fill(); } }
        c.globalAlpha = 1;
        for (const l of engine.labels) { c.save(); c.globalAlpha = Math.min(1, l.life * 4); c.font = '600 ' + (l.text.length > 15 ? 16 : 20) + 'px system-ui, sans-serif'; c.textAlign = 'center'; c.fillStyle = l.color; c.shadowColor = '#162d38'; c.shadowBlur = 8; c.fillText(l.text, l.x, l.y); c.restore(); }
      }
      if (options.preview) {
        const x = w / 2, y = h * 0.52, r = Math.min(58, w * 0.13);
        c.save(); c.translate(x, y); c.rotate(settings.reduced ? -0.12 : Math.sin(clock * 0.8) * 0.12); const size = r * 2.625; c.drawImage(this.sprite(0), -size / 2, -size / 2, size, size); c.restore();
        c.strokeStyle = '#fff0d970'; c.lineWidth = 1; c.setLineDash([4, 7]); ellipse(c, x, y, r + 22, r + 22); c.stroke(); c.setLineDash([]);
      }
      if (options.decorative) {
        for (let i = 0; i < 3; i++) { const x = i === 0 ? w * 0.08 : i === 1 ? w * 0.92 : w * 0.8, y = i === 2 ? h * 0.75 : h * 0.43; c.save(); c.translate(x, y + (settings.reduced ? 0 : Math.sin(clock * 0.5 + i) * 8)); c.rotate(i - 0.5); const r = Math.min(w * 0.065, 36); c.globalAlpha = 0.70; c.drawImage(this.sprite(H.CHAPTERS[chapter].fruits[i]), -r * 1.3125, -r * 1.3125, r * 2.625, r * 2.625); c.restore(); }
      }
      this.drawTrail(clock, settings);
      if (options.cursor) { c.strokeStyle = BLADES[settings.blade]; c.lineWidth = 2; ellipse(c, options.cursor.x, options.cursor.y, 10, 10); c.stroke(); c.fillStyle = BLADES[settings.blade]; ellipse(c, options.cursor.x, options.cursor.y, 2, 2); c.fill(); }
      c.restore();
    }
    entity(e, fragment = false, contrast = false) {
      const c = this.ctx; c.save(); c.translate(e.x, e.y); c.rotate(e.angle);
      if (fragment) {
        c.globalAlpha = H.clamp(e.life / 0.35, 0, 1); c.rotate(e.cutAngle); c.beginPath();
        if (e.side > 0) c.rect(-e.r * 3, e.offset, e.r * 6, e.r * 4); else c.rect(-e.r * 3, -e.r * 4, e.r * 6, e.r * 4 + e.offset);
        c.clip(); c.rotate(-e.cutAngle);
      } else if (e.golden) {
        c.strokeStyle = '#ffe09c'; c.lineWidth = 2.5; ellipse(c, 0, 0, e.r + 6, e.r + 6); c.stroke();
        c.fillStyle = '#ffe09c'; c.font = 'bold 15px system-ui'; c.textAlign = 'center'; c.fillText('✦', 0, -e.r - 12);
      } else if (e.hazard) {
        c.strokeStyle = '#ffc0ab88'; c.lineWidth = 1.5; c.setLineDash([3, 4]); ellipse(c, 0, 0, e.r + 7, e.r + 7); c.stroke(); c.setLineDash([]);
      }
      if (!fragment && contrast) { c.strokeStyle = '#fff3d9'; c.lineWidth = 2; ellipse(c, 0, 0, e.r + 1, e.r + 1); c.stroke(); }
      c.shadowColor = '#10232b66'; c.shadowBlur = fragment ? 0 : 10; c.shadowOffsetY = fragment ? 0 : 5;
      const size = e.r * 2.625; c.drawImage(this.sprite(e.hazard ? 'pot' : e.type, fragment), -size / 2, -size / 2, size, size);
      c.restore();
    }
    drawTrail(clock, settings) {
      const c = this.ctx, duration = settings.reduced ? 0.10 : 0.19;
      this.trail = this.trail.filter(p => clock - p.clock < duration);
      if (this.trail.length < 2) return;
      c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
      const color = BLADES[settings.blade] || BLADES[0];
      for (let i = 1; i < this.trail.length; i++) {
        const a = this.trail[i - 1], b = this.trail[i]; if (a.gesture !== b.gesture) continue;
        const life = H.clamp(1 - (clock - b.clock) / duration, 0, 1);
        c.globalAlpha = life * 0.75; c.strokeStyle = color; c.lineWidth = 9 * life;
        if (!settings.reduced && settings.quality !== 'low') { c.shadowColor = color; c.shadowBlur = 10; }
        line(c, [[a.x, a.y], [b.x, b.y]]); c.stroke(); c.shadowBlur = 0;
        c.strokeStyle = '#fffcf0'; c.lineWidth = 2.5 * life; line(c, [[a.x, a.y], [b.x, b.y]]); c.stroke();
      }
      c.restore();
    }
  }
  H.Renderer = Renderer; H.BLADES = BLADES; H.drawFruit = drawFruit;
})(globalThis);

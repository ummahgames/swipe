/* Swipe Harvest — deterministic game rules. Works in a browser and in Node. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Harvest = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const VERSION = 1;
  const STEP = 1 / 120;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  function random(seed) {
    let value = seed >>> 0;
    return function () {
      value += 0x6D2B79F5;
      let t = Math.imul(value ^ (value >>> 15), value | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash(text) {
    let n = 2166136261;
    for (const c of String(text)) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
    return n >>> 0;
  }
  function localDate(date = new Date()) {
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  }
  const FRUITS = [
    { name: 'Apple', shape: 'apple', skin: '#ed5c5f', light: '#ffaaa1', flesh: '#ffeac0', seed: '#593d30' },
    { name: 'Banana', shape: 'banana', skin: '#f3ce52', light: '#fff0a0', flesh: '#fff3c7', seed: '#ae8445' },
    { name: 'Orange', shape: 'round', skin: '#f39b44', light: '#ffcf7e', flesh: '#ffb352', seed: '#fff0bc' },
    { name: 'Grape', shape: 'grape', skin: '#9c70cd', light: '#d5b2ec', flesh: '#e6cbe9', seed: '#694172' },
    { name: 'Pineapple', shape: 'pineapple', skin: '#dba748', light: '#f8d980', flesh: '#fff2a4', seed: '#b99345' },
    { name: 'Starfruit', shape: 'star', skin: '#d6ce62', light: '#fff39a', flesh: '#fff7ad', seed: '#9b9452' },
    { name: 'Dragonfruit', shape: 'dragon', skin: '#eb639c', light: '#ffa9cf', flesh: '#fff5ed', seed: '#45405b' },
    { name: 'Watermelon', shape: 'oval', skin: '#5eac80', light: '#abd99b', flesh: '#f97981', seed: '#473545' },
    { name: 'Pomegranate', shape: 'round', skin: '#cb536f', light: '#f992a3', flesh: '#f6d9ab', seed: '#cb4661' },
    { name: 'Passionfruit', shape: 'round', skin: '#8e668a', light: '#c79bc1', flesh: '#ffda66', seed: '#67466e' },
    { name: 'Lychee', shape: 'round', skin: '#ec9690', light: '#ffd0b6', flesh: '#fff1df', seed: '#7d4640' },
    { name: 'Papaya', shape: 'pear', skin: '#efac58', light: '#fddd87', flesh: '#ffb35b', seed: '#54404a' },
    { name: 'Mangosteen', shape: 'round', skin: '#776086', light: '#b69dcd', flesh: '#fff1eb', seed: '#a987bd' },
    { name: 'Kiwi', shape: 'oval', skin: '#9d8561', light: '#c5b28b', flesh: '#a9d778', seed: '#44434c' },
    { name: 'Persimmon', shape: 'apple', skin: '#e78252', light: '#ffc089', flesh: '#ffcf8c', seed: '#976045' }
  ];
  const CHAPTERS = [
    { name: 'The Orchard', short: 'Orchard', subtitle: 'Every great harvest begins with one cut.', colors: ['#162f38', '#32594f', '#f6b67d'], fruits: [0, 2, 7, 3, 13], names: ['First Cut', 'Paired Harvest', 'Three in a Row', 'Full Basket', 'Orchard Finale'] },
    { name: 'Citrus Grove', short: 'Citrus', subtitle: 'Follow the arcs. Find the golden fruit.', colors: ['#173c3e', '#476858', '#ffd580'], fruits: [2, 1, 5, 14, 8], names: ['Crossing Paths', 'Rising Ladder', 'Golden Opportunity', 'Grove Mix', 'Citrus Finale'] },
    { name: 'Moon Garden', short: 'Moon', subtitle: 'A careful blade finds its own path.', colors: ['#24263f', '#44405d', '#c5b8f5'], fruits: [3, 9, 10, 12, 0], names: ['Mind the Pot', 'Safe Route', 'Split Decision', 'Garden Guard', 'Moon Finale'] },
    { name: 'Tropical Canopy', short: 'Canopy', subtitle: 'Big fruit. Wide fans. A wilder rhythm.', colors: ['#123b39', '#29675b', '#9edcca'], fruits: [4, 6, 7, 11, 1], names: ['Heavy Harvest', 'Fan Dance', 'Sideways Sweep', 'Canopy Rhythm', 'Tropical Finale'] },
    { name: 'Star Orchard', short: 'Stars', subtitle: 'Trace a constellation with your blade.', colors: ['#252239', '#514365', '#eab7dc'], fruits: [5, 6, 12, 13, 8], names: ['First Orbit', 'Ring Break', 'Orbit and Arc', 'Master Harvest', 'Star Finale'] }
  ];
  const PATTERNS = { single: 1, pair: 2, fan: 3, cross: 2, ladder: 3, sweep: 3, finale: 4, orbit: 3 };
  const SETS = [
    [['single'], ['pair'], ['single', 'fan'], ['pair', 'fan', 'single'], ['fan', 'pair', 'finale']],
    [['cross', 'pair'], ['ladder', 'single'], ['pair', 'fan'], ['cross', 'ladder', 'fan'], ['ladder', 'cross', 'finale']],
    [['single', 'pair'], ['pair', 'single'], ['cross', 'pair'], ['fan', 'cross'], ['ladder', 'fan', 'finale']],
    [['pair', 'fan'], ['fan', 'finale'], ['sweep', 'pair'], ['ladder', 'sweep', 'fan'], ['sweep', 'fan', 'finale']],
    [['orbit', 'single'], ['orbit', 'pair'], ['orbit', 'cross'], ['orbit', 'ladder', 'fan'], ['orbit', 'sweep', 'finale']]
  ];
  const LEVELS = [];
  for (let chapter = 0; chapter < 5; chapter++) {
    for (let index = 0; index < 5; index++) {
      const id = chapter * 5 + index;
      const duration = chapter === 0 ? [22, 30, 35, 40, 45][index] : 36 + index * 4 + chapter * 2;
      const waves = chapter === 0 ? [8, 8, 9, 10, 11][index] : 10 + index;
      const patterns = SETS[chapter][index];
      const comboGoal = Math.min(3, Math.max(...patterns.map(pattern => PATTERNS[pattern])));
      LEVELS.push({ id, chapter, index, name: CHAPTERS[chapter].names[index], duration, waves, patterns, golden: chapter >= 1, hazards: chapter >= 2, hearts: chapter === 2 && index >= 3 || chapter >= 3, comboGoal });
    }
  }
  function defaultSave() {
    return { version: VERSION, tutorial: false, unlocked: 0, levels: {}, bests: {}, discovered: [], sliced: 0, settings: { sound: true, music: false, volume: 0.45, reduced: false, contrast: false, assist: false, slow: false, quality: 'auto', blade: 0, garden: -1, zenHazards: false } };
  }
  function validSave(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw) || raw.version !== VERSION) throw new Error('This is not a compatible Swipe Harvest save.');
    const save = defaultSave();
    const boundedInt = (value, max) => Number.isFinite(value) ? clamp(Math.floor(value), 0, max) : 0;
    save.tutorial = raw.tutorial === true;
    save.unlocked = boundedInt(raw.unlocked, 24);
    save.sliced = boundedInt(raw.sliced, 1e9);
    save.discovered = [...new Set(Array.isArray(raw.discovered) ? raw.discovered.filter(n => Number.isInteger(n) && n >= 0 && n < FRUITS.length) : [])];
    if (raw.levels && typeof raw.levels === 'object') {
      for (const level of LEVELS) {
        const item = raw.levels[level.id];
        if (item && typeof item === 'object') save.levels[level.id] = { passed: item.passed === true, combo: item.combo === true && item.passed === true, precision: item.precision === true && item.passed === true, score: boundedInt(item.score, 1e9) };
      }
    }
    // Reconstruct unlocks from passed levels; don't trust imported unlock counters.
    save.unlocked = 0;
    while (save.unlocked < 24 && save.levels[save.unlocked]?.passed) save.unlocked++;
    if (raw.bests && typeof raw.bests === 'object') {
      for (const [key, value] of Object.entries(raw.bests).slice(0, 1000)) {
        if (/^(campaign-\d{1,2}|quick|zen|survival|daily-\d{4}-\d{2}-\d{2})(-assist)?$/.test(key) && Number.isFinite(value)) save.bests[key] = boundedInt(value, 1e9);
      }
    }
    const input = raw.settings || {};
    for (const key of ['sound', 'music', 'reduced', 'contrast', 'assist', 'slow', 'zenHazards']) if (typeof input[key] === 'boolean') save.settings[key] = input[key];
    if (Number.isFinite(input.volume)) save.settings.volume = clamp(input.volume, 0, 1);
    if (['auto', 'low', 'full'].includes(input.quality)) save.settings.quality = input.quality;
    save.settings.blade = clamp(boundedInt(input.blade, 5), 0, unlockedBlade(save));
    if (Number.isInteger(input.garden) && input.garden >= -1) save.settings.garden = clamp(input.garden, -1, Math.floor(save.unlocked / 5));
    return save;
  }
  function unlockedBlade(save) {
    let complete = 0;
    for (let c = 0; c < 5; c++) if (save.levels[c * 5 + 4]?.passed) complete++;
    return complete;
  }
  class Store {
    constructor(storage) {
      this.storage = storage;
      this.loaded = false;
      this.warning = '';
      this.data = defaultSave();
      try { const raw = storage?.getItem('swipe-harvest-v1'); if (raw) { this.data = validSave(JSON.parse(raw)); this.loaded = true; } }
      catch (_) { this.warning = 'Progress could not be loaded. This session still works; export a save to keep it.'; }
    }
    write() {
      try { if (!this.storage) throw new Error('No storage'); this.storage.setItem('swipe-harvest-v1', JSON.stringify(this.data)); this.warning = ''; return true; }
      catch (_) { this.warning = 'Progress is kept for this session. Export a save to keep it after closing.'; return false; }
    }
    import(text) { const next = validSave(JSON.parse(text)); this.data = next; this.write(); return next; }
    reset() { this.data = defaultSave(); this.write(); }
    record(engine) {
      const result = engine.result;
      if (!result || engine.recorded) return;
      engine.recorded = true;
      const key = engine.bestKey();
      const previous = this.data.bests[key] || 0;
      this.data.bests[key] = Math.max(previous, result.score);
      result.newBest = result.score > previous;
      result.best = this.data.bests[key];
      this.data.sliced = Math.min(1e9, this.data.sliced + result.cut);
      this.data.discovered = [...new Set([...this.data.discovered, ...engine.discovered])];
      this.data.tutorial = true;
      if (engine.mode === 'campaign') {
        const old = this.data.levels[engine.level.id] || {};
        const passed = result.passed || old.passed === true;
        this.data.levels[engine.level.id] = { passed, combo: old.combo === true || result.passed && result.comboBadge, precision: old.precision === true || result.passed && result.precisionBadge, score: Math.max(old.score || 0, result.score) };
        if (passed) this.data.unlocked = Math.max(this.data.unlocked, Math.min(24, engine.level.id + 1));
      }
      // Keep only the most recent 45 dates. Campaign and mode bests remain.
      const daily = Object.keys(this.data.bests).filter(k => k.startsWith('daily-')).sort();
      for (const key of daily.slice(0, Math.max(0, daily.length - 90))) delete this.data.bests[key];
      this.write();
    }
  }
  // First intersection with a circle, including containment. Zero motion isn't a cut.
  function segmentCircle(x1, y1, x2, y2, cx, cy, radius) {
    const dx = x2 - x1, dy = y2 - y1, ax = x1 - cx, ay = y1 - cy;
    const a = dx * dx + dy * dy;
    if (a < 0.000001) return null;
    const c = ax * ax + ay * ay - radius * radius;
    if (c <= 0) return 0;
    const b = 2 * (ax * dx + ay * dy), d = b * b - 4 * a * c;
    if (d < 0) return null;
    const t = (-b - Math.sqrt(d)) / (2 * a);
    return t >= 0 && t <= 1 ? t : null;
  }
  function arena(width, height) {
    const w = clamp(width, 240, 10000), h = clamp(height, 240, 10000);
    const span = Math.min(w - 52, 780);
    const top = h < 500 ? 80 : 136;
    const bottom = h - (h < 500 ? 46 : 82);
    return { width: w, height: h, left: (w - span) / 2, right: (w + span) / 2, top, bottom, span, depth: Math.max(100, bottom - top) };
  }
  function schedule(config, rng) {
    const events = [], waves = [];
    const count = config.waves;
    const interval = count > 1 ? (config.duration - 3.5) / (count - 1) : 3;
    for (let i = 0; i < count; i++) {
      const pattern = config.patterns[i % config.patterns.length];
      const wave = { id: i, at: 0.5 + i * interval, pattern, remaining: 0, required: 0, missed: false, hazard: false, resolved: false };
      const n = PATTERNS[pattern];
      // Moon Garden's first wave demonstrates a pot, safely away from fruit.
      const demo = config.id === 10 && i === 0;
      for (let j = 0; j < (demo ? 0 : n); j++) {
        const golden = config.golden && i % 4 === 2 && j === n - 1;
        events.push({ at: wave.at + (pattern === 'ladder' ? j * 0.12 : 0), wave: i, pattern, index: j, count: n, golden, type: config.fruits[Math.floor(rng() * config.fruits.length)], variant: rng() });
        wave.remaining++; if (!golden) wave.required++;
      }
      if (config.hazards && (demo || i % 3 === 1)) {
        events.push({ at: wave.at, wave: i, pattern: 'pot', index: 0, count: 1, hazard: true, variant: i % 2 });
        wave.remaining++;
      }
      waves.push(wave);
    }
    events.sort((a, b) => a.at - b.at || a.index - b.index);
    return { events, waves, total: waves.reduce((n, w) => n + w.required, 0) };
  }
  class Engine {
    constructor(options = {}) {
      this.mode = options.mode || 'campaign';
      this.level = LEVELS[clamp(options.level || 0, 0, 24)];
      this.chapter = this.mode === 'survival' ? 0 : options.chapter ?? (this.mode === 'campaign' ? this.level.chapter : this.mode === 'daily' ? 4 : 0);
      this.settings = { ...defaultSave().settings, ...options.settings };
      this.date = options.date || localDate();
      this.seed = options.seed ?? (this.mode === 'daily' ? hash('harvest-' + VERSION + '-' + this.date) : this.mode === 'campaign' ? hash('level-' + VERSION + '-' + this.level.id) : 98713);
      this.rng = random(this.seed);
      this.fxRng = random(this.seed ^ 0xACDF1289);
      this.bounds = arena(options.width || 390, options.height || 844);
      this.state = 'ready'; this.previousState = 'playing'; this.time = 0; this.accumulator = 0;
      this.entities = []; this.fragments = []; this.particles = []; this.labels = []; this.signals = [];
      this.serial = 0; this.score = 0; this.cut = 0; this.requiredCut = 0; this.misses = 0; this.potHits = 0;
      this.bestCombo = 0; this.combos = 0; this.flow = 1; this.cleanStreak = 0; this.cleanWaves = 0;
      this.meter = 0; this.rushUntil = 0; this.gesture = null; this.burst = null; this.discovered = new Set();
      this.hearts = this.mode === 'survival' || this.mode === 'campaign' && this.level.hearts ? 3 : null;
      this.result = null; this.eventIndex = 0; this.generatedWaves = 0;
      this.rushEnabled = this.mode !== 'campaign' || this.level.id >= 2;
      const base = this.mode === 'campaign' ? { ...this.level, fruits: CHAPTERS[this.chapter].fruits } : { duration: 60, waves: 17, patterns: this.mode === 'daily' ? ['fan', 'cross', 'ladder', 'orbit', 'finale'] : SETS[this.chapter][4], golden: true, hazards: this.mode === 'daily' || this.mode === 'survival' || this.mode === 'zen' && this.settings.zenHazards, fruits: CHAPTERS[this.chapter].fruits };
      if (this.mode === 'zen') { base.patterns = ['single', 'pair', 'fan']; base.hazards = this.settings.zenHazards; }
      if (this.mode === 'survival') { base.waves = 8; base.duration = 28; }
      this.config = base;
      this.duration = ['zen', 'survival'].includes(this.mode) ? Infinity : base.duration;
      const built = schedule(base, this.rng);
      this.events = built.events; this.waves = Object.fromEntries(built.waves.map(w => [w.id, w])); this.total = built.total;
      this.goal = this.mode === 'campaign' ? Math.ceil(this.total * (this.level.id === 0 ? 0.60 : this.level.index === 4 ? 0.76 : 0.70)) : 0;
      this.generatedWaves = built.waves.length;
      this.lastWaveAt = built.waves[built.waves.length - 1].at;
    }
    emit(signal) { this.signals.push(signal); if (this.signals.length > 64) this.signals.shift(); }
    begin() { if (this.state === 'ready') { this.state = 'playing'; this.emit({ kind: 'start' }); } }
    pause() { if (['playing', 'resolving', 'ready'].includes(this.state)) { this.previousState = this.state; this.state = 'paused'; this.endGesture(); this.accumulator = 0; } }
    resume() { if (this.state === 'paused') { this.state = this.previousState; this.accumulator = 0; } }
    resize(width, height) {
      const previous = this.bounds, next = arena(width, height);
      // Rebase every entity and orbit without treating layout changes as misses.
      for (const e of this.entities) {
        e.x = next.left + (e.x - previous.left) / previous.span * next.span;
        e.y = next.top + (e.y - previous.top) / previous.depth * next.depth;
        e.vx *= next.span / previous.span; e.vy *= next.depth / previous.depth; e.gravity *= next.depth / previous.depth;
        if (e.orbit) { e.orbit.cx = next.left + (e.orbit.cx - previous.left) / previous.span * next.span; e.orbit.cy = next.top + (e.orbit.cy - previous.top) / previous.depth * next.depth; e.orbit.rx *= next.span / previous.span; e.orbit.ry *= next.depth / previous.depth; }
        e.history = [{ t: this.time, x: e.x, y: e.y }];
      }
      this.bounds = next; this.fragments = []; this.particles = []; this.labels = []; this.endGesture();
    }
    bestKey() { return (this.mode === 'campaign' ? 'campaign-' + this.level.id : this.mode === 'daily' ? 'daily-' + this.date : this.mode) + (this.settings.assist || this.settings.slow ? '-assist' : ''); }
    advance(delta) {
      if (!['playing', 'resolving'].includes(this.state)) return;
      if (delta > 0.25) { this.pause(); return; }
      this.accumulator += Math.max(0, delta);
      let steps = 0;
      while (this.accumulator + 1e-10 >= STEP && steps++ < 32 && ['playing', 'resolving'].includes(this.state)) { this.step(STEP); this.accumulator -= STEP; }
    }
    infiniteWave() {
      const i = this.generatedWaves++, tier = Math.min(4, Math.floor(i / 8));
      const patterns = this.mode === 'zen' ? ['single', 'pair', 'fan'] : SETS[tier][4];
      const pattern = patterns[i % patterns.length], count = PATTERNS[pattern];
      const at = Math.max(this.time + 0.3, this.lastWaveAt + (this.mode === 'zen' ? 3.8 : 3.4 - tier * 0.1));
      const wave = { id: i, at, pattern, remaining: count, required: count, missed: false, hazard: false, resolved: false };
      const chapter = this.mode === 'zen' ? this.chapter : tier;
      for (let j = 0; j < count; j++) this.events.push({ at: at + (pattern === 'ladder' ? j * 0.12 : 0), wave: i, chapter, pattern, index: j, count, type: CHAPTERS[chapter].fruits[Math.floor(this.rng() * 5)], variant: this.rng() });
      if ((this.mode === 'survival' || this.settings.zenHazards) && i % 3 === 1) { this.events.push({ at, wave: i, pattern: 'pot', hazard: true, count: 1, index: 0, variant: i % 2 }); wave.remaining++; }
      this.waves[i] = wave; this.lastWaveAt = at; this.total += count;
      this.events.sort((a, b) => a.at - b.at || a.index - b.index);
    }
    spawn(event) {
      if (this.mode === 'survival' && event.chapter !== undefined && event.chapter !== this.chapter) {
        this.chapter = event.chapter;
        this.label(CHAPTERS[this.chapter].name, this.bounds.width / 2, this.bounds.top + 30, CHAPTERS[this.chapter].colors[2], 1.5);
      }
      const b = this.bounds, n = event.count, i = event.index;
      const radius = clamp(Math.min(b.span / 10, b.depth / 8), 23, 37) * (this.settings.assist ? 1.16 : 1);
      let fraction = n === 1 ? 0.5 + (event.variant - 0.5) * 0.20 : 0.5 + (i - (n - 1) / 2) * Math.min(0.18, (radius * 2 + 18) / b.span);
      if (event.pattern === 'cross') fraction = 1 - fraction;
      if (event.hazard) fraction = event.variant ? 0.94 : 0.06;
      const apexX = b.left + b.span * fraction;
      const apexY = b.top + b.depth * (event.hazard ? 0.50 : event.pattern === 'ladder' ? 0.38 - i * 0.055 : 0.34 + event.variant * 0.12);
      const life = event.pattern === 'sweep' ? 2.35 : 2.5;
      const launchY = b.bottom + radius + 8;
      const gravity = 8 * (launchY - apexY) / (life * life);
      let x = apexX, vx = (event.variant - 0.5) * b.span * 0.08;
      if (event.pattern === 'cross') { x = b.left + b.span * (i ? 0.72 : 0.28); vx = (apexX - x) / (life / 2); }
      if (event.pattern === 'sweep') { x = b.left + b.span * (0.25 + i * 0.12); vx = b.span * 0.17; }
      const e = { id: ++this.serial, wave: event.wave, type: event.type ?? 0, golden: !!event.golden, hazard: !!event.hazard, required: !event.hazard && !event.golden, x, y: launchY, vx, vy: -gravity * life / 2, gravity, r: event.hazard ? radius * 0.79 : radius, angle: event.variant * 2 - 1, spin: (event.variant - 0.5) * 2, age: 0, ttl: life + 0.3, born: this.time, dead: false, history: [{ t: this.time, x, y: launchY }] };
      if (event.pattern === 'orbit') {
        const rx = Math.min(b.span * 0.23, 150), ry = Math.min(b.depth * 0.24, 100);
        e.orbit = { cx: (b.left + b.right) / 2, cy: b.top + b.depth * 0.44, rx, ry, phase: i * Math.PI * 2 / n };
        e.ttl = 2.8; this.orbitPosition(e); e.history[0] = { t: this.time, x: e.x, y: e.y };
      }
      this.entities.push(e);
      if (e.golden) this.emit({ kind: 'golden' });
    }
    orbitPosition(e) {
      const a = e.orbit.phase + e.age * 1.5;
      e.x = e.orbit.cx + Math.cos(a) * e.orbit.rx;
      e.y = e.orbit.cy + Math.sin(a) * e.orbit.ry;
      e.vx = -Math.sin(a) * e.orbit.rx * 1.5; e.vy = Math.cos(a) * e.orbit.ry * 1.5;
    }
    step(dt) {
      this.time += dt;
      if (this.burst && this.time - this.burst.at >= 0.45) this.closeBurst();
      if (this.state === 'playing' && this.time >= this.duration) this.state = 'resolving';
      if (this.duration === Infinity && this.eventIndex >= this.events.length - 3) this.infiniteWave();
      while (this.eventIndex < this.events.length && this.events[this.eventIndex].at <= this.time + 1e-9 && this.state === 'playing') {
        const event = this.events[this.eventIndex++]; this.spawn(event);
        const wave = this.waves[event.wave];
        if (this.rushEnabled && !event.hazard && event.index === 0 && this.meter >= 100 && this.time >= this.rushUntil) {
          this.meter = 0; this.rushUntil = this.time + 6; this.emit({ kind: 'rush' }); this.label('HARVEST RUSH', this.bounds.width / 2, this.bounds.top + 30, '#ffe09c', 1.4);
        }
        if (!event.hazard && event.index === 0 && this.time < this.rushUntil) {
          wave.remaining++; this.spawn({ ...event, pattern: 'single', count: 1, index: 0, golden: true, variant: event.variant < 0.5 ? 0 : 1 });
        }
      }
      const physicsDt = dt * (this.settings.slow ? 0.78 : 1);
      for (const e of this.entities) {
        if (e.dead) continue;
        e.age += physicsDt; e.angle += e.spin * physicsDt;
        if (e.orbit) this.orbitPosition(e);
        else { e.x += e.vx * physicsDt; e.y += e.vy * physicsDt + e.gravity * physicsDt * physicsDt / 2; e.vy += e.gravity * physicsDt; }
        e.history.push({ t: this.time, x: e.x, y: e.y });
        while (e.history.length > 2 && e.history[1].t < this.time - 0.20) e.history.shift();
        if (e.age >= e.ttl || !e.orbit && e.age > 0.5 && e.y > this.bounds.bottom + e.r + 24) {
          if (e.required) {
            this.misses++; this.flow = 1; this.cleanStreak = 0; this.waves[e.wave].missed = true;
            if (this.mode === 'survival') this.hearts--;
            this.emit({ kind: 'miss' });
          }
          this.resolveEntity(e);
          if (this.hearts !== null && this.hearts <= 0) { this.finish(); break; }
        }
      }
      this.entities = this.entities.filter(e => !e.dead);
      for (const f of this.fragments) { f.life -= dt; f.x += f.vx * physicsDt; f.y += f.vy * physicsDt; f.vy += 520 * physicsDt; f.angle += f.spin * physicsDt; }
      this.fragments = this.fragments.filter(f => f.life > 0);
      for (const p of this.particles) { p.life -= dt; p.x += p.vx * physicsDt; p.y += p.vy * physicsDt; p.vy += 320 * physicsDt; }
      this.particles = this.particles.filter(p => p.life > 0);
      for (const l of this.labels) { l.life -= dt; l.y -= dt * 21; }
      this.labels = this.labels.filter(l => l.life > 0);
      if (this.state === 'resolving' && !this.entities.length) this.finish();
      // Endless modes keep only active wave records; ids remain monotonic.
      if (this.duration === Infinity && this.eventIndex > 64) {
        this.events.splice(0, this.eventIndex); this.eventIndex = 0;
        for (const id of Object.keys(this.waves)) if (this.waves[id].resolved && Number(id) < this.generatedWaves - 8) delete this.waves[id];
      }
    }
    resolveEntity(e) {
      if (e.dead) return;
      e.dead = true; const wave = this.waves[e.wave]; wave.remaining--;
      // Remaining includes scheduled targets, so a wave cannot complete before its ladder finishes spawning.
      if (wave.remaining === 0 && !wave.resolved) {
        wave.resolved = true;
        if (!wave.missed && !wave.hazard && wave.required > 0) {
          this.cleanWaves++; this.cleanStreak++; if (this.rushEnabled) this.meter = Math.min(100, this.meter + 16);
          if (this.cleanStreak % 3 === 0) this.flow = Math.min(3, this.flow + 0.5);
          this.emit({ kind: 'clean', flow: this.flow });
        }
      }
    }
    startGesture(id) { this.endGesture(); this.gesture = id; }
    endGesture() { this.closeBurst(); this.gesture = null; }
    positionAt(e, time) {
      const h = e.history;
      if (time <= h[0].t) return h[0];
      for (let i = 1; i < h.length; i++) if (h[i].t >= time) { const t = (time - h[i - 1].t) / Math.max(1e-8, h[i].t - h[i - 1].t); return { x: lerp(h[i - 1].x, h[i].x, t), y: lerp(h[i - 1].y, h[i].y, t) }; }
      return h[h.length - 1];
    }
    slice(x1, y1, x2, y2, startTime = this.time) {
      // A tiny nonzero threshold avoids stationary jitter without making cuts depend on input sample rate.
      if (!['playing', 'resolving'].includes(this.state) || this.gesture === null || Math.hypot(x2 - x1, y2 - y1) < 0.05) return [];
      startTime = clamp(startTime, this.time - 0.18, this.time);
      const hits = [];
      for (const e of this.entities) {
        if (e.dead || e.born > startTime + 0.05) continue;
        const before = this.positionAt(e, startTime);
        const t = segmentCircle(x1 - before.x, y1 - before.y, x2 - e.x, y2 - e.y, 0, 0, e.r + 6);
        if (t !== null) hits.push({ e, t });
      }
      hits.sort((a, b) => a.t - b.t || a.e.id - b.e.id);
      const cut = [];
      for (const { e } of hits) {
        if (this.state === 'finished') break;
        if (e.hazard) {
          this.closeBurst(); this.potHits++; this.flow = 1; this.cleanStreak = 0; this.meter = Math.max(0, this.meter - 25); this.waves[e.wave].hazard = true;
          if (this.hearts !== null) this.hearts--;
          this.burstEffect(e, true); this.resolveEntity(e); this.label('Mind the pot', e.x, e.y - e.r, '#e4a69c'); this.emit({ kind: 'pot' });
          if (this.hearts !== null && this.hearts <= 0) this.finish();
          break; // A pot stops this measured segment. Later samples can start a new burst.
        }
        if (!this.burst || this.time - this.burst.at >= 0.45) { this.closeBurst(); this.burst = { at: this.time, count: 0, flow: this.flow, x: e.x, y: e.y }; }
        this.burst.count++; this.burst.x = e.x; this.burst.y = e.y;
        const points = Math.round((e.golden ? 25 : 10) * this.burst.flow);
        this.score += points; this.cut++; if (e.required) this.requiredCut++;
        this.discovered.add(e.type); this.split(e, x1, y1, x2, y2); this.burstEffect(e);
        this.label('+' + points, e.x, e.y - e.r, e.golden ? '#ffe09c' : '#fff4df');
        this.resolveEntity(e); this.emit({ kind: 'slice', type: e.type, golden: e.golden }); cut.push(e.id);
      }
      return cut;
    }
    closeBurst() {
      if (!this.burst) return;
      const b = this.burst; this.burst = null;
      this.bestCombo = Math.max(this.bestCombo, b.count);
      if (b.count >= 2) {
        const bonus = Math.round((b.count === 2 ? 10 : 25 + Math.max(0, b.count - 3) * 15) * b.flow);
        this.score += bonus; this.combos++; if (this.rushEnabled) this.meter = Math.min(100, this.meter + b.count * 4);
        this.label(b.count + ' fruit combo  +' + bonus, b.x, b.y - 45, '#ffe09c', 1.1);
        this.emit({ kind: 'combo', count: b.count });
      }
    }
    split(e, x1, y1, x2, y2) {
      const direction = Math.atan2(y2 - y1, x2 - x1), nx = -Math.sin(direction), ny = Math.cos(direction);
      const offset = clamp((x1 - e.x) * nx + (y1 - e.y) * ny, -e.r * 0.85, e.r * 0.85);
      for (const side of [-1, 1]) this.fragments.push({ ...e, history: undefined, orbit: undefined, cutAngle: direction - e.angle, offset, side, x: e.x, y: e.y, vx: e.vx * 0.6 + nx * side * 105, vy: e.vy * 0.35 + ny * side * 105 - 35, spin: e.spin + side * 1.8, life: 0.85, maxLife: 0.85 });
      if (this.fragments.length > 60) this.fragments.splice(0, this.fragments.length - 60);
    }
    burstEffect(e, pot = false) {
      const count = this.settings.quality === 'low' || this.settings.reduced ? 5 : 13;
      for (let i = 0; i < count; i++) {
        const a = this.fxRng() * Math.PI * 2, v = 70 + this.fxRng() * 170;
        this.particles.push({ x: e.x, y: e.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: 2 + this.fxRng() * 4, color: pot ? '#bca68a' : e.golden ? '#ffe09c' : FRUITS[e.type].flesh, life: 0.3 + this.fxRng() * 0.3, maxLife: 0.6, pot });
      }
      if (this.particles.length > 200) this.particles.splice(0, this.particles.length - 200);
    }
    label(text, x, y, color, life = 0.75) { this.labels.push({ text, x: clamp(x, 85, this.bounds.width - 85), y, color, life, maxLife: life }); if (this.labels.length > 12) this.labels.shift(); }
    finish() {
      if (this.state === 'finished') return;
      this.endGesture(); this.state = 'finished';
      const passed = this.mode !== 'campaign' || this.requiredCut >= this.goal && (this.hearts === null || this.hearts > 0);
      this.result = { passed, score: Math.round(this.score), cut: this.cut, requiredCut: this.requiredCut, goal: this.goal, combo: this.bestCombo, combos: this.combos, clean: this.cleanWaves, misses: this.misses, pots: this.potHits, time: this.time, comboBadge: this.mode === 'campaign' && this.level.id === 0 ? this.requiredCut >= Math.ceil(this.total * 0.85) : this.bestCombo >= this.level.comboGoal, precisionBadge: this.requiredCut >= Math.ceil(this.total * 0.93) && this.potHits === 0 };
      this.emit({ kind: 'finish', passed });
    }
  }
  return { VERSION, STEP, clamp, lerp, random, hash, localDate, FRUITS, CHAPTERS, LEVELS, PATTERNS, SETS, defaultSave, validSave, unlockedBlade, Store, segmentCircle, arena, schedule, Engine };
});

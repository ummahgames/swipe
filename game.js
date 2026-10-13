/* Browser application, menus, input and the rendering loop. */
(function (root) {
  'use strict';
  const H = root.Harvest;
  const $ = id => document.getElementById(id);
  const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const number = n => Math.floor(n).toLocaleString();
  const icon = name => '<svg viewBox="0 0 24 24" aria-hidden="true">' + ({ sound: '<path d="m4 9 4 0 5-4v14l-5-4H4zM16 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/>', muted: '<path d="m4 9 4 0 5-4v14l-5-4H4zM17 9l5 6m0-6-5 6"/>', close: '<path d="m6 6 12 12M18 6 6 18"/>', back: '<path d="m14 5-7 7 7 7M7 12h13"/>' }[name] || '') + '</svg>';
  const stars = (passed, combo, precision) => '<span class="stars" aria-label="' + [passed, combo, precision].filter(Boolean).length + ' of 3 stars">' + [passed, combo, precision].map(s => '<span class="' + (s ? 'earned' : 'empty') + '" aria-hidden="true">★</span>').join('') + '</span>';
  const bladeNames = ['Dewdrop', 'Orchard Peach', 'Citrus Gold', 'Moonlight', 'Canopy Jade', 'Stardust'];
  class App {
    constructor() {
      let storage; try { storage = root.localStorage; } catch (_) {}
      this.store = new H.Store(storage);
      if (!this.store.loaded && root.matchMedia?.('(prefers-reduced-motion: reduce)').matches) this.store.data.settings.reduced = true;
      this.renderer = new H.Renderer($('gameCanvas'));
      if (!this.renderer.ctx) throw new Error('Canvas 2D is unavailable in this browser.');
      this.audio = new H.Audio(() => this.store.data.settings);
      this.engine = null; this.screen = 'home'; this.chapter = Math.floor(this.store.data.unlocked / 5); this.settingsReturn = 'home';
      this.clock = 0; this.lastFrame = 0; this.hudCache = {}; this.pointer = null; this.gestureId = 0; this.keys = new Set(); this.cursor = null; this.keyboardBlade = false;
      this.lowFrames = 0; this.autoLow = false; this.toastTimer = null; this.first = true;
      this.bind(); this.resize(); this.applySettings();
      if (!this.store.data.tutorial) this.start('campaign', 0, true); else this.home();
      if (this.store.warning) this.toast(this.store.warning);
      this.frame = this.frame.bind(this); root.requestAnimationFrame(this.frame);
    }
    settings() { return this.store.data.settings; }
    applySettings() {
      document.body.classList.toggle('high-contrast', this.settings().contrast);
      document.body.classList.toggle('reduced-motion', this.settings().reduced);
      if (this.engine) for (const key of ['sound', 'music', 'volume', 'reduced', 'contrast', 'quality', 'blade']) this.engine.settings[key] = this.settings()[key];
      this.renderer.background = null;
    }
    setScreen(name) {
      this.screen = name; document.body.dataset.screen = name;
      const playing = name === 'playing';
      $('panel').hidden = playing;
      $('hud').hidden = !playing; $('playFooter').hidden = !playing; $('rushHud').hidden = !playing;
      $('siteHeader').hidden = playing;
      if (!playing) { this.renderer.trail = []; this.clearInput(); }
    }
    show(markup, name, label = 'Game menu') {
      this.setScreen(name); const panel = $('panel'); panel.innerHTML = markup; panel.setAttribute('aria-label', label);
      const modal = ['paused', 'results', 'settings'].includes(name);
      panel.setAttribute('role', modal ? 'dialog' : 'region');
      if (modal) panel.setAttribute('aria-modal', 'true'); else panel.removeAttribute('aria-modal');
      panel.scrollTop = 0;
      root.requestAnimationFrame(() => { const target = panel.querySelector('[data-focus]') || panel.querySelector('button:not(:disabled)'); (target || panel).focus({ preventScroll: true }); });
    }
    home() {
      this.audio.stop(); this.engine = null; this.chapter = Math.floor(this.store.data.unlocked / 5); this.renderer.trail = [];
      const save = this.store.data, level = H.LEVELS[save.unlocked], c = H.CHAPTERS[level.chapter];
      const complete = save.levels[24]?.passed;
      let totalStars = 0; for (const item of Object.values(save.levels)) totalStars += [item.passed, item.combo, item.precision].filter(Boolean).length;
      const dots = Array.from({ length: 5 }, (_, i) => { const id = level.chapter * 5 + i; return (i ? '<i></i>' : '') + '<span class="path-dot ' + (save.levels[id]?.passed ? 'done' : id === level.id ? 'current' : '') + '">' + (save.levels[id]?.passed ? '✓' : i + 1) + '</span>'; }).join('');
      this.show('<main class="home-layout"><div class="hero"><span class="eyebrow">A PLAYFUL JOURNEY THROUGH FIVE GARDENS</span><h1>A little slice<br>of <em>wonder.</em></h1><p>Catch the rhythm. Follow the fruit.<br>Turn one good swipe into a great harvest.</p><div class="hero-foot"><i></i> MADE FOR A MOMENT OF PLAY</div></div><section class="journey-card" aria-label="Continue your journey"><div class="card-top"><span class="eyebrow">YOUR NEXT HARVEST</span><span class="pill">' + (complete ? 'All five gardens explored' : 'Chapter ' + (level.chapter + 1) + ' of 5') + '</span></div><h2>' + (complete ? 'The garden is yours.' : c.name) + '</h2><p class="card-copy">' + (complete ? 'Chase the missing stars, find every fruit, or make a fresh personal best.' : c.subtitle) + '</p><div class="path-preview" aria-hidden="true">' + dots + '</div><button class="primary full-width" data-action="play" data-mode="campaign" data-level="' + level.id + '" data-focus>' + (complete ? 'Revisit the finale' : 'Play ' + level.name) + '<span aria-hidden="true">↗</span></button><div class="button-row"><button class="secondary" data-action="chapters">The journey</button><button class="secondary" data-action="modes">More ways to play</button></div><div class="card-bottom"><span>' + totalStars + ' / 75 stars</span><button class="quiet-button" data-action="collection">Fruit journal ↗</button></div><button class="quiet-button full-width" data-action="help">How to play</button></section></main>', 'home', 'Swipe Harvest home');
    }
    chapters(chapter = this.chapter) {
      this.chapter = H.clamp(chapter, 0, 4); const save = this.store.data, c = H.CHAPTERS[this.chapter];
      const tabs = H.CHAPTERS.map((ch, i) => '<button class="chapter-tab ' + (i === this.chapter ? 'selected' : '') + '" data-action="chapter" data-value="' + i + '" aria-pressed="' + (i === this.chapter) + '">' + ch.short + '<span>' + (save.unlocked >= i * 5 ? 'CHAPTER ' + (i + 1) : 'LOCKED') + '</span></button>').join('');
      const levels = H.LEVELS.filter(l => l.chapter === this.chapter).map(l => {
        const item = save.levels[l.id] || {}, locked = l.id > save.unlocked;
        const preview = new H.Engine({ level: l.id });
        const description = 'Basket: ' + preview.goal + ' fruit · ' + l.duration + 's';
        const mastery = l.id === 0 ? 'Extra stars: seven cuts / all eight' : 'Combo star: ' + l.comboGoal + ' fruit · precision: 93%';
        return '<button class="level-card" data-action="play" data-mode="campaign" data-level="' + l.id + '" ' + (locked ? 'disabled' : '') + ' aria-label="' + l.name + (locked ? ', locked' : ', ' + [item.passed, item.combo, item.precision].filter(Boolean).length + ' stars') + '"><span class="level-number">' + (locked ? '·' : l.index + 1) + '</span><span class="level-text"><strong>' + l.name + '</strong><small>' + (locked ? 'Complete the previous harvest to unlock' : description + '<br>' + mastery) + '</small></span>' + stars(item.passed, item.combo, item.precision) + '</button>';
      }).join('');
      this.show('<main class="screen"><div class="screen-heading"><div><span class="eyebrow">CHAPTER ' + (this.chapter + 1) + ' OF 5</span><h1 class="screen-title">' + c.name + '</h1><p class="screen-subtitle">' + c.subtitle + '</p></div><button class="icon-button" data-action="home" aria-label="Back to home">' + icon('back') + '</button></div><nav class="chapter-tabs" aria-label="Choose a chapter">' + tabs + '</nav><div class="level-list">' + levels + '</div><p class="map-note">One star opens the next harvest. First Cut rewards seven and eight cuts. Later harvests award a combo star for the listed stroke size and a precision star for cutting at least 93% of required fruit without hitting a pot. Complete a chapter to unlock a new blade.</p></main>', 'chapters', 'Campaign chapters');
    }
    modes() {
      const date = H.localDate(), assist = this.settings().assist || this.settings().slow ? '-assist' : '';
      const modes = [{ mode: 'quick', symbol: '↗', name: 'Quick Play', copy: 'Sixty seconds of juicy combos. Bring your best blade and leave a new personal best.', foot: '60 SECONDS · SCORE CHASE' }, { mode: 'zen', symbol: '∞', name: 'Zen Garden', copy: 'A quiet, endless harvest. No hearts, no deadline. Stay for as long as you like.', foot: 'ENDLESS · NO PRESSURE' }, { mode: 'daily', symbol: '✦', name: 'Daily Harvest', copy: 'A fresh constellation of waves each day. Same seed on every retry. Your best stays on this device.', foot: date + ' · 60 SECONDS' }, { mode: 'survival', symbol: '♡', name: 'Survival', copy: 'Three hearts. Fruit slips and pot hits cost one. The gardens get wilder as you go.', foot: 'ENDLESS · THREE HEARTS' }];
      this.show('<main class="screen"><div class="screen-heading"><div><span class="eyebrow">MAKE A LITTLE TIME FOR PLAY</span><h1 class="screen-title">Pick your rhythm.</h1><p class="screen-subtitle">' + (assist ? 'Practice scores are kept separately. ' : '') + 'Each garden has a different kind of joy.</p></div><button class="icon-button" data-action="home" aria-label="Back to home">' + icon('back') + '</button></div><div class="mode-grid">' + modes.map(m => '<button class="mode-card" data-action="play" data-mode="' + m.mode + '"><span class="mode-symbol" aria-hidden="true">' + m.symbol + '</span><strong>' + m.name + '</strong><p>' + m.copy + '</p><small>' + m.foot + '<br>BEST ' + number(this.store.data.bests[(m.mode === 'daily' ? 'daily-' + date : m.mode) + assist] || 0) + '</small></button>').join('') + '</div><p class="map-note">Choose a favorite unlocked garden for Quick Play and Zen in Settings. Daily Harvest visits the Star Orchard. Survival travels through all five gardens.</p></main>', 'modes', 'Game modes');
    }
    collection() {
      const save = this.store.data;
      this.show('<main class="screen"><div class="screen-heading"><div><span class="eyebrow">YOUR FRUIT JOURNAL</span><h1 class="screen-title">A colorful collection.</h1><p class="screen-subtitle">' + save.discovered.length + ' of 15 fruit discovered · ' + number(save.sliced) + ' original fruit sliced<br>Meet every variety as you travel through the gardens.</p></div><button class="icon-button" data-action="home" aria-label="Back to home">' + icon('back') + '</button></div><div class="collection-grid">' + H.FRUITS.map((fruit, i) => { const found = save.discovered.includes(i); return '<div class="fruit-card ' + (found ? '' : 'undiscovered') + '"><img src="' + this.renderer.image(i) + '" alt="' + (found ? fruit.name : 'Undiscovered fruit silhouette') + '"><span>' + (found ? fruit.name : 'Still growing') + '</span></div>'; }).join('') + '</div><p class="map-note">The journal and lifetime count update when a round or Zen session finishes.</p></main>', 'collection', 'Fruit collection');
    }
    help() {
      this.show('<main class="screen surface modal"><span class="eyebrow">A SMALL GUIDE TO A GREAT HARVEST</span><h1 class="screen-title">Follow the fruit.</h1><p class="result-tip">Swipe or drag through fruit to cut it. One stroke can cut several fruit together. A combo groups hits within a short burst; lift your blade between waves for deliberate cuts.</p><p class="result-tip">Three clean waves raise your flow multiplier. Combos and clean waves fill the Harvest Rush meter. When it fills, the next wave begins a golden bonus harvest.</p><p class="result-tip">Golden fruit is optional and worth more points. Marked ceramic pots break your flow. In later chapters, pot hits cost a heart; Survival also costs a heart for each missed required fruit.</p><p class="result-tip">For keyboard play, use the arrows to move, hold Space to cut, hold Shift for a faster blade, and press Escape to pause. Target assistance and slower practice are in Settings.</p><button class="primary full-width" data-action="home" data-focus>Ready to grow ↗</button></main>', 'help', 'How to play');
    }
    start(mode, level = 0, introduction = false) {
      this.audio.stop(); this.clearInput(); this.renderer.trail = []; this.renderer.shake = 0;
      const chapter = mode === 'campaign' ? H.LEVELS[level].chapter : mode === 'daily' ? 4 : this.settings().garden >= 0 ? this.settings().garden : Math.floor(this.store.data.unlocked / 5);
      const seed = mode === 'quick' || mode === 'zen' || mode === 'survival' ? Math.floor(Math.random() * 4294967295) : undefined;
      this.engine = new H.Engine({ mode, level, chapter, width: this.renderer.width, height: this.renderer.height, settings: { ...this.settings(), quality: this.effectiveQuality() }, seed });
      this.introduction = introduction; this.recordedEngine = null; this.hudCache = {}; this.cursor = { x: this.renderer.width / 2, y: this.renderer.height * 0.52 };
      if (!introduction) this.engine.begin();
      this.setScreen('playing'); $('endZen').hidden = mode !== 'zen'; $('gameCanvas').focus({ preventScroll: true }); this.updateHud();
      $('announcer').textContent = introduction ? 'Swipe through the apple to begin. Arrow keys and Space also work.' : (mode === 'campaign' ? this.engine.level.name : mode) + ' started.';
    }
    pause() {
      if (!this.engine || this.screen !== 'playing') return;
      this.engine.pause(); this.audio.stop(); this.clearInput();
      this.show('<section class="surface modal"><span class="eyebrow">TAKE YOUR TIME</span><h1 class="screen-title">The garden can wait.</h1><p class="result-tip">Your harvest is paused. Every fruit will be right where you left it.</p><button class="primary full-width" data-action="resume" data-focus>Keep harvesting ↗</button><div class="button-row"><button class="secondary" data-action="retry">Start again</button><button class="secondary" data-action="settings">Settings</button></div>' + (this.engine.mode !== 'campaign' ? '<button class="quiet-button full-width" data-action="end">Finish & save this harvest</button>' : '') + '<button class="quiet-button full-width" data-action="home">Leave this round</button></section>', 'paused', 'Paused game');
    }
    resume() {
      if (!this.engine) return this.home();
      this.engine.resume(); this.setScreen('playing'); $('endZen').hidden = this.engine.mode !== 'zen'; $('gameCanvas').focus({ preventScroll: true }); this.lastFrame = 0;
    }
    retry() { const mode = this.engine?.mode || 'campaign', level = this.engine?.level.id || 0; this.start(mode, level); this.audio.unlock(); }
    results() {
      const e = this.engine, r = e.result;
      if (!r) return;
      if (this.recordedEngine !== e) { this.store.record(e); this.recordedEngine = e; }
      const campaign = e.mode === 'campaign', final = campaign && e.level.id === 24, chapterEnd = campaign && e.level.index === 4 && r.passed;
      const heading = campaign ? r.passed ? final ? 'A world well harvested.' : 'A lovely little harvest.' : 'Another swipe awaits.' : e.mode === 'survival' ? 'What a wild harvest.' : 'A moment well spent.';
      const tip = campaign && !r.passed ? e.hearts === 0 ? 'Keep your blade clear of the marked pots. Try slower practice in Settings for more time to choose your stroke.' : 'Cut ' + Math.max(0, e.goal - r.requiredCut) + ' more required fruit to fill your basket.' : campaign ? 'Next time, chase a bigger combo or a cleaner basket.' : e.mode === 'daily' ? 'Today’s waves repeat on every retry. Your best is saved on this device.' : 'Lift your blade between waves, then cut a whole fan together.';
      let next = campaign && r.passed && !final ? '<button class="primary full-width" data-action="next" data-focus>Next harvest ↗</button>' : '<button class="primary full-width" data-action="retry" data-focus>Harvest again ↗</button>';
      const reward = chapterEnd ? '<div class="reward">✦ ' + bladeNames[e.level.chapter + 1] + ' blade unlocked' + (final ? ' · all five gardens complete!' : ' · a new garden awaits') + '</div>' : '';
      this.show('<section class="surface modal"><span class="eyebrow">' + (campaign ? H.CHAPTERS[e.chapter].short + ' · ' + e.level.name : e.mode === 'daily' ? 'DAILY HARVEST · ' + e.date : e.mode.toUpperCase() + ' HARVEST') + '</span><h1 class="screen-title">' + heading + '</h1>' + (campaign ? '<div class="result-stars">' + stars(r.passed, r.passed && r.comboBadge, r.passed && r.precisionBadge) + '</div>' : '') + '<div class="result-score">' + number(r.score) + '</div><div class="result-caption">' + (r.newBest ? 'A NEW PERSONAL BEST' : 'HARVEST SCORE · BEST ' + number(r.best)) + '</div><div class="stat-grid"><div><strong>' + r.cut + '</strong><span>fruit sliced</span></div><div><strong>' + r.combo + '</strong><span>best combo</span></div><div><strong>' + (e.mode === 'survival' || e.mode === 'zen' ? this.formatTime(r.time) : r.clean) + '</strong><span>' + (e.mode === 'survival' || e.mode === 'zen' ? 'time in the garden' : 'clean waves') + '</span></div></div><p class="result-tip">' + tip + '</p>' + (e.settings.assist || e.settings.slow ? '<div class="badge-list"><span class="pill">Practice score</span><span class="pill">Campaign progress still counts</span></div>' : '') + reward + next + '<div class="button-row">' + (campaign && r.passed && !final ? '<button class="secondary" data-action="retry">Play again</button>' : '<button class="secondary" data-action="modes">Other modes</button>') + '<button class="secondary" data-action="home">Home</button></div>' + (this.store.warning ? '<p class="warning">' + escape(this.store.warning) + '</p>' : '') + '</section>', 'results', 'Round results');
      $('announcer').textContent = heading + ' Score ' + r.score + '. ' + (campaign ? r.passed ? 'Challenge passed.' : 'Challenge incomplete.' : '');
    }
    formatTime(seconds) { const s = Math.floor(seconds); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
    settingsPanel() {
      if (this.screen !== 'settings') { this.settingsReturn = this.screen; if (this.screen === 'playing') { this.pause(); this.settingsReturn = 'paused'; } }
      const s = this.settings();
      const toggle = (key, title, subtitle) => '<label class="setting-row"><span><strong>' + title + '</strong><small>' + subtitle + '</small></span><input class="toggle" type="checkbox" data-setting="' + key + '" ' + (s[key] ? 'checked' : '') + '></label>';
      const blades = bladeNames.map((name, i) => '<option value="' + i + '" ' + (s.blade === i ? 'selected' : '') + ' ' + (i > H.unlockedBlade(this.store.data) ? 'disabled' : '') + '>' + name + (i > H.unlockedBlade(this.store.data) ? ' · locked' : '') + '</option>').join('');
      const gardens = '<option value="-1" ' + (s.garden === -1 ? 'selected' : '') + '>Latest garden</option>' + H.CHAPTERS.map((c, i) => '<option value="' + i + '" ' + (s.garden === i ? 'selected' : '') + ' ' + (i > Math.floor(this.store.data.unlocked / 5) ? 'disabled' : '') + '>' + c.short + '</option>').join('');
      this.show('<main class="screen surface modal"><div class="screen-heading"><div><span class="eyebrow">MAKE THE GARDEN YOURS</span><h1 class="screen-title">Little adjustments.</h1></div><button class="icon-button" data-action="close-settings" aria-label="Close settings">' + icon('close') + '</button></div>' + toggle('sound', 'Sound effects', 'Juicy cuts, combo chimes and quiet pot taps.') + toggle('music', 'Garden melody', 'A gentle, locally synthesized melody during play.') + '<label class="setting-row"><span><strong>Volume</strong></span><input type="range" min="0" max="1" step="0.05" value="' + s.volume + '" data-setting="volume" aria-label="Audio volume"></label><div class="settings-section"><span class="eyebrow">COMFORT & PLAY</span>' + toggle('reduced', 'Reduced motion', 'Less trail, fewer particles and no camera shake.') + toggle('contrast', 'High contrast', 'Quieter backgrounds and clear target outlines.') + toggle('assist', 'Larger targets', 'Extra room for your blade. Applies next round.') + toggle('slow', 'Slower practice', 'More time to read a wave. Applies next round.') + toggle('zenHazards', 'Pots in Zen', 'Optional avoidance practice. Applies next session.') + '<label class="setting-row"><span><strong>Effects quality</strong><small>Auto reduces rendering detail when frames slow down.</small></span><select data-setting="quality"><option value="auto" ' + (s.quality === 'auto' ? 'selected' : '') + '>Automatic</option><option value="full" ' + (s.quality === 'full' ? 'selected' : '') + '>Full</option><option value="low" ' + (s.quality === 'low' ? 'selected' : '') + '>Light</option></select></label><label class="setting-row"><span><strong>Your blade</strong><small>Complete chapters to discover new trails.</small></span><select data-setting="blade">' + blades + '</select></label><label class="setting-row"><span><strong>Quick Play & Zen garden</strong><small>Revisit any garden you have unlocked.</small></span><select data-setting="garden">' + gardens + '</select></label></div><p class="settings-note">Target assistance and slower practice keep separate personal bests. They still unlock campaign levels and rewards.</p><div class="settings-section"><span class="eyebrow">YOUR LOCAL PROGRESS</span><p class="settings-note">Progress stays in this browser. Export a save to move it or keep a backup.</p>' + (this.store.warning ? '<p class="warning">' + escape(this.store.warning) + '</p>' : '') + '<div class="button-row"><button class="secondary" data-action="export">Export save</button><button class="secondary" data-action="import">Import save</button></div><input type="file" id="saveFile" accept=".json,application/json" hidden><button class="quiet-button" data-action="reset">Reset all progress</button></div><button class="primary full-width" data-action="close-settings">Back to the garden</button></main>', 'settings', 'Game settings');
    }
    closeSettings() {
      this.applySettings(); this.resize(false);
      if (this.settingsReturn === 'paused' && this.engine) { this.setScreen('playing'); this.pause(); }
      else if (this.settingsReturn === 'chapters') this.chapters();
      else if (this.settingsReturn === 'modes') this.modes();
      else if (this.settingsReturn === 'collection') this.collection();
      else this.home();
    }
    exportSave() {
      const blob = new Blob([JSON.stringify(this.store.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = 'swipe-harvest-' + H.localDate() + '.json'; document.body.append(a); a.click(); a.remove(); root.setTimeout(() => URL.revokeObjectURL(url), 1000); this.toast('Your garden save is ready.');
    }
    toast(message) { $('toast').textContent = message; $('toast').hidden = false; root.clearTimeout(this.toastTimer); this.toastTimer = root.setTimeout(() => { $('toast').hidden = true; }, 3500); }
    bind() {
      document.addEventListener('click', event => {
        const button = event.target.closest('[data-action]'); if (!button || button.disabled) return;
        const action = button.dataset.action; this.audio.unlock();
        if (action === 'home') this.home();
        else if (action === 'chapters') this.chapters(Math.floor(this.store.data.unlocked / 5));
        else if (action === 'chapter') this.chapters(Number(button.dataset.value));
        else if (action === 'modes') this.modes();
        else if (action === 'collection') this.collection();
        else if (action === 'help') this.help();
        else if (action === 'play') { const level = Number(button.dataset.level || 0); if (button.dataset.mode !== 'campaign' || level <= this.store.data.unlocked) this.start(button.dataset.mode, level); }
        else if (action === 'pause') this.pause();
        else if (action === 'resume') this.resume();
        else if (action === 'retry') this.retry();
        else if (action === 'next') this.start('campaign', Math.min(24, this.engine.level.id + 1));
        else if (action === 'end' && this.engine && this.engine.mode !== 'campaign') { this.engine.finish(); this.results(); }
        else if (action === 'settings') this.settingsPanel();
        else if (action === 'close-settings') this.closeSettings();
        else if (action === 'mute') { this.settings().sound = !this.settings().sound; this.store.write(); this.applySettings(); this.updateHud(); if (!this.settings().sound) this.audio.stop(); }
        else if (action === 'export') this.exportSave();
        else if (action === 'import') $('saveFile').click();
        else if (action === 'reset' && root.confirm('Reset every unlocked level, star, personal best and fruit discovery? Export a save first if you want to keep them.')) { this.store.reset(); this.home(); this.applySettings(); }
      });
      document.addEventListener('change', async event => {
        const input = event.target;
        if (input.id === 'saveFile') {
          const file = input.files[0]; if (!file) return;
          try { if (file.size > 1000000) throw new Error('This save is too large.'); this.store.import(await file.text()); this.engine = null; this.settingsReturn = 'home'; this.applySettings(); this.settingsPanel(); this.toast('Your saved garden is back.'); }
          catch (error) { this.toast('Could not import: ' + error.message); } finally { input.value = ''; }
          return;
        }
        const key = input.dataset.setting; if (!key) return;
        this.settings()[key] = input.type === 'checkbox' ? input.checked : ['volume', 'blade', 'garden'].includes(key) ? Number(input.value) : input.value;
        this.store.write(); this.applySettings(); this.audio.unlock();
        if (key === 'quality') { this.autoLow = false; this.resize(false); }
        if (key === 'sound' || key === 'music') { this.audio.stop(); if (this.settings().sound) this.audio.play('combo', 3); }
      });
      const canvas = $('gameCanvas');
      canvas.addEventListener('pointerdown', event => {
        if (this.screen !== 'playing' || event.button !== 0 || this.pointer || event.isPrimary === false) return;
        event.preventDefault(); this.audio.unlock(); this.keys.clear(); this.keyboardBlade = false;
        const p = this.point(event); this.pointer = { id: event.pointerId, x: p.x, y: p.y, time: this.engine.time, clock: this.clock, gesture: ++this.gestureId };
        this.engine.startGesture(this.pointer.gesture); this.renderer.addTrail(p.x, p.y, this.pointer.gesture, this.clock);
        try { canvas.setPointerCapture(event.pointerId); } catch (_) {}
      });
      canvas.addEventListener('pointermove', event => {
        if (!this.pointer || event.pointerId !== this.pointer.id || this.screen !== 'playing') return;
        event.preventDefault();
        let samples; try { samples = event.getCoalescedEvents?.(); } catch (_) {}
        if (!samples?.length) samples = [event];
        for (const sample of samples) {
          const p = this.point(sample), last = this.pointer;
          if (this.engine.state === 'ready') {
            const hit = H.segmentCircle(last.x, last.y, p.x, p.y, this.renderer.width / 2, this.renderer.height * 0.52, Math.min(58, this.renderer.width * 0.13) + 6);
            if (hit !== null && Math.hypot(p.x - last.x, p.y - last.y) >= 0.05) {
              const fruit = { type: 0, x: this.renderer.width / 2, y: this.renderer.height * 0.52, r: Math.min(58, this.renderer.width * 0.13), vx: 0, vy: 0, angle: 0, spin: 0 };
              this.engine.split(fruit, last.x, last.y, p.x, p.y); this.engine.burstEffect(fruit); this.engine.begin(); this.audio.play('slice'); this.introduction = false;
            }
          } else this.engine.slice(last.x, last.y, p.x, p.y, last.time);
          if (Math.hypot(p.x - last.x, p.y - last.y) > 0.2) this.audio.swish(this.clock);
          this.renderer.addTrail(p.x, p.y, last.gesture, this.clock); last.x = p.x; last.y = p.y; last.time = this.engine.time;
        }
      });
      const end = event => { if (this.pointer?.id === event.pointerId) { this.engine?.endGesture(); this.pointer = null; } };
      canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end); canvas.addEventListener('lostpointercapture', end);
      canvas.addEventListener('contextmenu', event => event.preventDefault());
      document.addEventListener('keydown', event => this.keyDown(event));
      document.addEventListener('keyup', event => { this.keys.delete(event.code); if (event.code === 'Space' && this.keyboardBlade) { this.keyboardBlade = false; this.engine?.endGesture(); } });
      root.addEventListener('resize', () => this.resize());
      root.visualViewport?.addEventListener('resize', () => this.resize());
      root.addEventListener('blur', () => { if (this.screen === 'playing') this.pause(); });
      document.addEventListener('visibilitychange', () => { if (document.hidden && this.screen === 'playing') this.pause(); });
    }
    keyDown(event) {
      if (event.code === 'Escape') { event.preventDefault(); if (this.screen === 'playing') this.pause(); else if (this.screen === 'paused') this.resume(); else if (this.screen === 'settings') this.closeSettings(); else if (this.screen !== 'home' && this.screen !== 'results') this.home(); return; }
      if (event.code === 'Tab' && !$('panel').hidden && $('panel').getAttribute('role') === 'dialog') {
        const nodes = [...$('panel').querySelectorAll('button:not(:disabled), input:not([hidden]), select')];
        if (nodes.length && (event.shiftKey && document.activeElement === nodes[0] || !event.shiftKey && document.activeElement === nodes[nodes.length - 1])) { event.preventDefault(); nodes[event.shiftKey ? nodes.length - 1 : 0].focus(); }
        return;
      }
      if (this.screen !== 'playing' || !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'ShiftLeft', 'ShiftRight'].includes(event.code)) return;
      event.preventDefault(); this.keys.add(event.code); this.cursorVisible = true;
      if (event.code === 'Space' && !event.repeat) { this.audio.unlock(); if (this.engine.state === 'ready') { this.engine.begin(); this.introduction = false; } this.keyboardBlade = true; this.engine.startGesture(++this.gestureId); this.renderer.addTrail(this.cursor.x, this.cursor.y, this.gestureId, this.clock); }
    }
    keyboard(dt) {
      if (!this.cursor || this.screen !== 'playing' || !this.keys.size || this.pointer) return;
      const p = { ...this.cursor }, speed = 430 * dt * (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? 1.85 : 1);
      let dx = Number(this.keys.has('ArrowRight')) - Number(this.keys.has('ArrowLeft')), dy = Number(this.keys.has('ArrowDown')) - Number(this.keys.has('ArrowUp'));
      if (dx && dy) { dx /= Math.SQRT2; dy /= Math.SQRT2; }
      this.cursor.x = H.clamp(p.x + dx * speed, 10, this.renderer.width - 10); this.cursor.y = H.clamp(p.y + dy * speed, 10, this.renderer.height - 10);
      if (this.keyboardBlade && (dx || dy)) { this.engine.slice(p.x, p.y, this.cursor.x, this.cursor.y, this.engine.time - dt); this.renderer.addTrail(this.cursor.x, this.cursor.y, this.gestureId, this.clock); this.audio.swish(this.clock); }
    }
    clearInput() {
      if (this.pointer) { try { $('gameCanvas').releasePointerCapture(this.pointer.id); } catch (_) {} }
      this.pointer = null; this.keys.clear(); this.keyboardBlade = false; this.cursorVisible = false; this.engine?.endGesture();
    }
    point(event) { return { x: (event.clientX - this.rect.left) * this.renderer.width / this.rect.width, y: (event.clientY - this.rect.top) * this.renderer.height / this.rect.height }; }
    effectiveQuality() { return this.settings().quality === 'low' || this.settings().quality === 'auto' && this.autoLow ? 'low' : this.settings().quality; }
    resize(pause = true) {
      const w = Math.round(root.visualViewport?.width || root.innerWidth), h = Math.round(root.visualViewport?.height || root.innerHeight);
      const changed = w !== this.renderer.width || h !== this.renderer.height;
      if (pause && changed && this.screen === 'playing') this.pause();
      this.renderer.resize(w, h, this.effectiveQuality()); this.rect = $('gameCanvas').getBoundingClientRect();
      if (this.engine && changed) this.engine.resize(w, h);
      this.cursor = { x: w / 2, y: h * 0.52 };
    }
    text(id, value) { if (this.hudCache[id] !== value) { $(id).textContent = value; this.hudCache[id] = value; } }
    updateHud() {
      const e = this.engine; if (!e) return;
      this.text('scoreValue', number(e.score)); this.text('flowValue', 'FLOW ×' + e.flow.toFixed(e.flow % 1 ? 1 : 0));
      this.text('roundTitle', e.mode === 'campaign' ? e.level.name : e.mode === 'daily' ? 'Daily Harvest' : e.mode === 'quick' ? 'Quick Play' : e.mode === 'zen' ? 'Zen Garden' : 'Survival');
      this.text('objectiveValue', e.mode === 'campaign' ? e.requiredCut + ' / ' + e.goal + ' fruit' : e.mode === 'survival' ? 'Keep your three hearts' : e.mode === 'zen' ? 'Find your own rhythm' : 'Chase your best harvest');
      const progress = e.mode === 'campaign' ? e.requiredCut / e.goal : e.duration === Infinity ? 1 : e.time / e.duration;
      const width = Math.min(100, progress * 100).toFixed(1) + '%'; if ($('objectiveBar').style.width !== width) $('objectiveBar').style.width = width;
      this.text('roundDetail', H.CHAPTERS[e.chapter].name + (e.settings.assist || e.settings.slow ? ' · practice' : ''));
      this.text('timeValue', e.state === 'ready' ? '—' : e.duration === Infinity ? this.formatTime(e.time) : Math.ceil(Math.max(0, e.duration - e.time)) + 's');
      this.text('heartsValue', e.hearts === null ? '' : '♥'.repeat(Math.max(0, e.hearts)) + '♡'.repeat(3 - Math.max(0, e.hearts)));
      const muted = !this.settings().sound; if (this.hudCache.muted !== muted) { $('muteButton').innerHTML = icon(muted ? 'muted' : 'sound'); $('muteButton').setAttribute('aria-label', muted ? 'Enable sound effects' : 'Mute sound effects'); this.hudCache.muted = muted; }
      const rush = e.time < e.rushUntil; this.text('rushLabel', rush ? '✦ HARVEST RUSH ✦' : e.meter >= 100 ? 'RUSH READY' : 'HARVEST RUSH');
      $('rushBar').style.width = (rush ? (e.rushUntil - e.time) / 6 * 100 : e.meter) + '%'; $('rushHud').hidden = this.screen !== 'playing' || !e.rushEnabled;
      let coach = e.state === 'ready' ? 'Swipe through the apple to begin' : e.state === 'resolving' ? 'One last sweep — finish your harvest' : e.time < 6 ? e.mode === 'survival' ? 'Keep your fruit. Keep your hearts.' : e.chapter === 4 ? 'Trace the constellation. Cut the whole ring.' : e.chapter >= 2 ? 'Choose a clear path around the marked pots.' : e.chapter === 1 ? 'Golden fruit is a little extra joy.' : 'Cut a whole wave together for a combo.' : rush ? 'A golden moment. Make it count.' : e.meter >= 100 ? 'Your next wave starts a Harvest Rush.' : 'Lift your blade. Catch the next rhythm.';
      this.text('coach', coach);
    }
    signals() {
      if (!this.engine) return;
      for (const signal of this.engine.signals.splice(0)) {
        if (signal.kind === 'slice') this.audio.play('slice');
        else if (signal.kind === 'combo') { this.audio.play('combo', Math.min(7, signal.count)); if (!this.settings().reduced) this.renderer.shake = 1.5; }
        else if (signal.kind === 'pot') { this.audio.play('pot'); if (!this.settings().reduced) this.renderer.shake = 3.5; }
        else if (signal.kind === 'rush') this.audio.play('combo', 7);
        else if (signal.kind === 'finish') this.audio.play(signal.passed ? 'finish' : 'pot');
      }
    }
    frame(timestamp) {
      const dt = this.lastFrame ? Math.max(0, (timestamp - this.lastFrame) / 1000) : 0; this.lastFrame = timestamp;
      const playing = this.screen === 'playing';
      if (playing && this.engine) {
        this.engine.advance(dt);
        if (this.engine.state === 'paused') this.pause();
        else { this.keyboard(Math.min(dt, 0.05)); this.signals(); this.updateHud(); if (this.engine.state === 'finished') this.results(); }
        if (this.settings().quality === 'auto') {
          this.lowFrames = dt > 0.027 && dt < 0.15 ? this.lowFrames + 1 : Math.max(0, this.lowFrames - 1);
          if (this.lowFrames > 90 && !this.autoLow) { this.autoLow = true; this.engine.settings.quality = 'low'; this.resize(false); }
        }
      }
      if (!['paused', 'settings', 'results'].includes(this.screen)) this.clock += Math.min(dt, 0.05);
      this.audio.tick(this.clock, this.screen === 'playing' && this.engine?.state === 'playing');
      this.renderer.draw(this.engine && ['playing', 'paused', 'results', 'settings'].includes(this.screen) ? this.engine : null, this.clock, { settings: this.settings(), chapter: this.chapter, preview: this.screen === 'playing' && this.engine.state === 'ready', decorative: !['playing', 'paused', 'results'].includes(this.screen), cursor: this.screen === 'playing' && this.cursorVisible ? this.cursor : null });
      root.requestAnimationFrame(this.frame);
    }
  }
  H.App = App;
  function boot() {
    try { H.app = new App(); }
    catch (error) { const panel = $('panel'); panel.hidden = false; panel.innerHTML = '<section class="surface modal"><h1 class="screen-title">The garden needs a moment.</h1><p>' + escape(error.message) + '</p><p>Use a browser with Canvas 2D and JavaScript enabled, then reload.</p></section>'; }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})(globalThis);

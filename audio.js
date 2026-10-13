(function (root) {
  'use strict';
  class Audio {
    constructor(settings) { this.settings = settings; this.context = null; this.buffers = new Map(); this.voices = new Set(); this.failed = false; this.lastSwish = -10; this.nextNote = 0; this.note = 0; }
    async unlock() {
      if (this.failed) return;
      try {
        if (!this.context) {
          const Context = root.AudioContext || root.webkitAudioContext;
          if (!Context) { this.failed = true; return; }
          this.context = new Context(); this.gain = this.context.createGain(); this.gain.gain.value = this.settings().volume * 0.7;
          if (this.context.createDynamicsCompressor) {
            this.compressor = this.context.createDynamicsCompressor();
            this.compressor.threshold.value = -12; this.compressor.knee.value = 20; this.compressor.ratio.value = 6;
            this.compressor.attack.value = 0.006; this.compressor.release.value = 0.15;
            this.gain.connect(this.compressor); this.compressor.connect(this.context.destination);
          } else this.gain.connect(this.context.destination);
        }
        if (this.context.state === 'suspended') await this.context.resume();
      } catch (_) { this.failed = true; }
    }
    buffer(kind, tier = 0) {
      const key = kind + '-' + tier;
      if (this.buffers.has(key)) return this.buffers.get(key);
      const ctx = this.context, duration = kind === 'swish' ? 0.13 : kind === 'pot' ? 0.18 : kind === 'slice' ? 0.16 : kind === 'music' ? 0.50 : 0.35;
      const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate), data = buffer.getChannelData(0);
      const rng = root.Harvest.random(root.Harvest.hash(key));
      const freq = kind === 'pot' ? 95 : kind === 'slice' ? 420 : kind === 'music' ? tier : kind === 'finish' ? 523 : 440 * Math.pow(2, Math.min(tier, 7) / 12);
      for (let i = 0; i < data.length; i++) {
        const t = i / ctx.sampleRate, attack = Math.min(1, t / 0.008), envelope = attack * Math.pow(1 - t / duration, kind === 'music' ? 2 : 3);
        if (kind === 'swish') data[i] = (rng() * 2 - 1) * envelope * 0.16;
        else if (kind === 'slice') data[i] = ((rng() * 2 - 1) * 0.22 + Math.sin(t * Math.PI * 2 * freq) * 0.09) * envelope;
        else data[i] = (Math.sin(t * Math.PI * 2 * freq) + Math.sin(t * Math.PI * 4 * freq) * 0.16) * envelope * (kind === 'music' ? 0.055 : 0.19);
      }
      this.buffers.set(key, buffer); return buffer;
    }
    play(kind, tier = 0) {
      const settings = this.settings();
      if (!this.context || this.context.state !== 'running' || this.failed || (kind === 'music' ? !settings.music : !settings.sound) || this.voices.size >= 12) return;
      try {
        this.gain.gain.setTargetAtTime(settings.volume * 0.7, this.context.currentTime, 0.02);
        const source = this.context.createBufferSource(); source.buffer = this.buffer(kind, tier); source.connect(this.gain); this.voices.add(source);
        source.onended = () => { source.disconnect(); this.voices.delete(source); }; source.start();
      } catch (_) { this.failed = true; }
    }
    swish(clock) { if (clock - this.lastSwish > 0.085) { this.lastSwish = clock; this.play('swish'); } }
    tick(clock, playing) {
      if (!playing || !this.settings().music || clock < this.nextNote) return;
      this.nextNote = clock + 0.6;
      const melody = [261.63, 329.63, 392, 329.63, 293.66, 349.23, 440, 392]; this.play('music', melody[this.note++ % melody.length]);
    }
    stop() { for (const source of this.voices) { try { source.stop(); } catch (_) {} } this.voices.clear(); }
  }
  root.Harvest.Audio = Audio;
})(globalThis);

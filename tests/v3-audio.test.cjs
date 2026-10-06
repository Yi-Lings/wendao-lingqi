'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const crypto = require('node:crypto');

const source = fs.readFileSync(path.join(__dirname, '../web/audio.js'), 'utf8');
function fixture(stored) {
  let clock = 1000, nextTimer = 0;
  const timers = new Map(), sounds = [], events = new Map(), saves = new Map();
  if (stored !== undefined) saves.set('lingqi_audio_v1', stored);
  let rejectPlay = false, deferPlay = false;
  const pending = [];
  class Audio {
    constructor(src) { this.src = src; this.paused = true; this.ended = false; this.currentTime = 0; this.listeners = {}; sounds.push(this); }
    addEventListener(name, fn) { (this.listeners[name] ||= []).push(fn); }
    removeEventListener(name, fn) { this.listeners[name] = (this.listeners[name] || []).filter(item => item !== fn); }
    play() {
      this.paused = false; this.ended = false;
      if (rejectPlay) { this.paused = true; return Promise.reject(new Error('Autoplay denied')); }
      if (deferPlay) return new Promise(resolve => pending.push(resolve));
      return Promise.resolve();
    }
    pause() { this.paused = true; }
    emit(name) { (this.listeners[name] || []).forEach(fn => fn()); }
  }
  const document = { hidden: false, addEventListener: (name, fn) => events.set(name, fn) };
  const context = { Audio, document, performance: { now: () => clock },
    localStorage: { getItem: key => saves.get(key) || null, setItem: (key, val) => saves.set(key, val) },
    setInterval: fn => { const id = ++nextTimer; timers.set(id, fn); return id; }, clearInterval: id => timers.delete(id),
    addEventListener: (name, fn) => events.set(name, fn) };
  vm.runInNewContext(source, context);
  return { api: context.LingqiAudio, sounds, saves, document, pending,
    advance(ms) { clock += ms; [...timers.values()].forEach(fn => fn()); },
    event(name) { events.get(name)?.(); },
    reject(value) { rejectPlay = value; }, defer(value) { deferPlay = value; },
    audible() { return sounds.filter(node => !node.paused && node.volume > 0); } };
}
const flush = () => new Promise(resolve => setImmediate(resolve));

test('sound waits for a gesture; persisted mute prevents music and effects entirely', async () => {
  const f = fixture();
  f.api.setScene('battle');
  assert.equal(f.api.play('battle-hit'), false);
  assert.equal(f.sounds.length, 0);
  await f.api.unlock(); f.advance(1000); await flush();
  assert.equal(f.audible().length, 1);
  assert.match(f.audible()[0].src, /bgm-battle\.mp3$/);
  f.api.setPreferences({ muted: true });
  assert.equal(f.audible().length, 0);
  assert.equal(f.api.play('red-impact'), false);
  const reload = fixture(f.saves.get('lingqi_audio_v1'));
  await reload.api.unlock(); reload.advance(1000);
  assert.equal(reload.sounds.length, 0);
});

test('preferences are bounded, independent, persistent and returned as copies', () => {
  const f = fixture('{"music":"no","effects":null,"muted":"false"}');
  assert.equal(f.api.getPreferences().music, .42);
  assert.equal(f.api.getPreferences().effects, .55);
  assert.equal(f.api.getPreferences().muted, false);
  f.api.setPreferences({ music: 6, effects: -2, muted: true });
  assert.equal(f.api.getPreferences().music, 1);
  assert.equal(f.api.getPreferences().effects, 0);
  f.api.setPreferences({ music: .3 });
  const copy = f.api.getPreferences(); copy.muted = false;
  assert.equal(f.api.getPreferences().muted, true);
  assert.deepEqual(JSON.parse(f.saves.get('lingqi_audio_v1')), { music: .3, effects: 0, muted: true });
  f.api.setPreferences({ music: NaN, effects: Infinity });
  assert.equal(f.api.getPreferences().music, .3);
  assert.equal(f.api.getPreferences().effects, 0);
});

test('rapid scene changes retain at most two music voices, then one, with battle priority', async () => {
  const f = fixture(); await f.api.unlock(); f.advance(900);
  f.api.setScene('heaven'); f.advance(200);
  assert.equal(f.audible().length, 2);
  f.api.setScene({ battle: true, heaven: true }); f.advance(200);
  assert.equal(f.api.diagnostics().scene, 'battle');
  assert.ok(f.audible().length <= 2);
  f.api.setScene('home'); f.advance(1100); await flush();
  assert.equal(f.audible().length, 1);
  assert.match(f.audible()[0].src, /bgm-home\.mp3$/);
  assert.equal(f.api.setScene('__proto__'), 'home');
});

test('combat chatter is throttled, voices are bounded and the red stinger displaces a click', async () => {
  const f = fixture(); await f.api.unlock(); f.api.setPreferences({ music: 0 });
  assert.equal(f.api.play('battle-hit'), true);
  f.sounds.at(-1).ended = true; f.sounds.at(-1).emit('ended');
  f.advance(250); assert.equal(f.api.play('battle-hit'), false);
  f.advance(250); assert.equal(f.api.play('battle-hit'), true);
  for (const name of ['ui', 'success', 'reveal']) assert.equal(f.api.play(name), true);
  assert.equal(f.api.diagnostics().activeEffects.length, 4);
  assert.equal(f.api.play('error'), true, 'higher priority UI feedback can replace combat chatter');
  assert.equal(f.api.play('red-impact'), true);
  assert.ok(f.api.diagnostics().activeEffects.includes('red-impact'));
  assert.equal(f.api.diagnostics().activeEffects.length, 4);
  assert.equal(f.api.play('red-impact'), false);
  f.api.stopEffect('red-impact');
  assert.ok(!f.api.diagnostics().activeEffects.includes('red-impact'));
});

test('backgrounding and delayed play completion cannot restart effects; resume only restores music', async () => {
  const f = fixture(); f.defer(true); await f.api.unlock();
  assert.equal(f.api.play('red-impact'), true);
  f.api.pause();
  f.pending.splice(0).forEach(resolve => resolve()); await flush();
  assert.equal(f.audible().length, 0);
  f.defer(false); f.api.resume(); f.advance(1000); await flush();
  assert.equal(f.audible().length, 1);
  assert.match(f.audible()[0].src, /bgm-home/);
  assert.equal(f.api.diagnostics().counts['red-impact'], 1, 'resuming does not replay a reward stinger');
  f.document.hidden = true; f.event('visibilitychange');
  assert.equal(f.audible().length, 0);
  f.document.hidden = false; f.event('visibilitychange'); f.advance(1000);
  assert.equal(f.audible().length, 1);
  f.event('pagehide'); assert.equal(f.audible().length, 0);
});

test('effects reuse loaded media and a cancelled old promise cannot stop a fresh play of the same effect', async () => {
  const f = fixture(); await f.api.unlock(); f.api.setPreferences({ music: 0 }); f.defer(true);
  assert.equal(f.api.play('red-impact'), true);
  const audio = f.sounds.at(-1);
  f.api.stopEffect('red-impact'); f.advance(1000);
  assert.equal(f.api.play('red-impact'), true);
  assert.equal(f.sounds.at(-1), audio, 'reuses the local media resource rather than allocating per hit');
  f.pending.splice(0).forEach(resolve => resolve()); await flush();
  assert.equal(audio.paused, false);
  assert.equal(f.api.diagnostics().activeEffects.length, 1);
  f.api.stopEffect(); assert.equal(audio.paused, true);
});

test('autoplay denial is handled and a later gesture retries music without a rejected API promise', async () => {
  const f = fixture(); f.reject(true);
  assert.equal(await f.api.unlock(), true); await flush();
  assert.equal(f.api.diagnostics().musicPlaying.length, 0);
  assert.ok(f.api.diagnostics().playbackFailures > 0);
  f.reject(false); await f.api.unlock(); f.advance(900); await flush();
  assert.equal(f.audible().length, 1);
});

test('all original offline tracks and effects match the manifest and comfortable source levels', () => {
  const dir = path.join(__dirname, '../web/assets/audio');
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json')));
  assert.equal(Object.keys(manifest.assets).length, 14);
  for (const [name, info] of Object.entries(manifest.assets)) {
    const bytes = fs.readFileSync(path.join(dir, info.file));
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), info.sha256, name + ' must be intact');
    assert.ok(bytes.length > 1000);
    assert.ok(info.peak <= .81 && info.rms > .005 && info.rms < .4, name + ' has a useful unclipped waveform');
    if (info.kind === 'music') { assert.ok(info.duration >= 40 && info.duration <= 60); assert.equal(info.loop, true); }
  }
});

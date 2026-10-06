(function (root) {
  'use strict';
  // HTMLAudio keeps the same offline path on HTTP and file:///android_asset/.
  // The game deliberately waits for a gesture; rejected playback stays silent.
  var STORAGE = 'lingqi_audio_v1';
  var DEFAULTS = { music: 0.42, effects: 0.55, muted: false };
  var MUSIC = { home: 'bgm-home.mp3', battle: 'bgm-battle.mp3', heaven: 'bgm-heaven.mp3' };
  var EFFECTS = {
    'ui': { gap: 95, level: 0.44, priority: 0 },
    'success': { gap: 250, level: 0.72, priority: 1 },
    'error': { gap: 300, level: 0.60, priority: 1 },
    'battle-hit': { gap: 450, level: 0.58, priority: 0 },
    'battle-skill': { gap: 600, level: 0.77, priority: 1 },
    'victory': { gap: 1600, level: 0.85, priority: 2 },
    'defeat': { gap: 1600, level: 0.76, priority: 2 },
    'summon-rise': { gap: 800, level: 0.74, priority: 2 },
    'reveal': { gap: 200, level: 0.76, priority: 2 },
    'red-awaken': { gap: 600, level: 0.88, priority: 3 },
    'red-impact': { gap: 900, level: 0.94, priority: 3 }
  };
  var pref = Object.assign({}, DEFAULTS), unlocked = false, scene = 'home';
  var suspended = false, away = false, current = null, fade = null;
  var tracks = Object.create(null), effects = Object.create(null), active = [], last = Object.create(null), serial = 0;
  var counters = { effects: Object.create(null), blocked: 0, playbackFailures: 0, musicStarts: 0 };

  function finiteLevel(value, fallback) {
    return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
  }
  function normalized(value, original) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return Object.assign({}, original);
    return { music: finiteLevel(value.music, original.music), effects: finiteLevel(value.effects, original.effects),
      muted: typeof value.muted === 'boolean' ? value.muted : original.muted };
  }
  try { pref = normalized(JSON.parse(root.localStorage.getItem(STORAGE)), DEFAULTS); } catch (ignore) {}
  function canPlay() { return unlocked && !suspended && !away && !(root.document && root.document.hidden) && !pref.muted; }
  function musicTarget() { return pref.music * 0.64; }
  function time() { return root.performance && root.performance.now ? root.performance.now() : Date.now(); }
  function cancelFade() { if (fade !== null) { root.clearInterval(fade); fade = null; } }
  function pauseNode(node, rewind) {
    try { node.pause(); if (rewind) node.currentTime = 0; } catch (ignore) {}
  }
  function node(file, loop) {
    if (typeof root.Audio !== 'function') return null;
    try {
      var audio = new root.Audio('assets/audio/' + file);
      audio.preload = loop ? 'auto' : 'none';
      audio.loop = !!loop;
      audio.volume = 0;
      audio.addEventListener('error', function () { counters.playbackFailures++; });
      return audio;
    } catch (ignore) { counters.playbackFailures++; return null; }
  }
  function music(name) {
    if (!tracks[name]) {
      var audio = node(MUSIC[name], true);
      if (!audio) return null;
      tracks[name] = { name: name, audio: audio, generation: 0, playing: false };
    }
    return tracks[name];
  }
  function stopTrack(track) {
    track.generation++;
    track.playing = false;
    track.audio.volume = 0;
    pauseNode(track.audio, false);
  }
  function startTrack(track) {
    if (track.playing && !track.audio.paused) return;
    var generation = ++track.generation;
    track.playing = true;
    try {
      var promise = track.audio.play();
      if (promise && promise.then) promise.then(function () {
        if (generation !== track.generation || !canPlay() || !pref.music) {
          if (generation === track.generation || !canPlay()) pauseNode(track.audio, false);
          return;
        }
        counters.musicStarts++;
      }, function () {
        if (generation === track.generation) {
          track.playing = false; track.audio.volume = 0;
          if (canPlay() && pref.music) counters.playbackFailures++;
        }
      });
      else counters.musicStarts++;
    } catch (ignore) { track.playing = false; counters.playbackFailures++; }
  }
  function updateMusic() {
    cancelFade();
    if (!canPlay() || !pref.music) {
      Object.keys(tracks).forEach(function (name) { stopTrack(tracks[name]); });
      return;
    }
    var target = music(scene);
    if (!target) return;
    // Rapid navigation may interrupt a fade. Only the previous and new scene live.
    var previous = current && current !== target ? current : null;
    Object.keys(tracks).forEach(function (name) {
      if (tracks[name] !== target && tracks[name] !== previous) stopTrack(tracks[name]);
    });
    current = target;
    var from = target.audio.volume, oldFrom = previous ? previous.audio.volume : 0;
    startTrack(target);
    var began = time(), duration = 800;
    fade = root.setInterval(function () {
      if (!canPlay() || !pref.music) { cancelFade(); updateMusic(); return; }
      var progress = Math.min(1, (time() - began) / duration);
      var smooth = progress * progress * (3 - 2 * progress);
      target.audio.volume = Math.max(0, Math.min(1, from + (musicTarget() - from) * smooth));
      if (previous) previous.audio.volume = Math.max(0, oldFrom * (1 - smooth));
      if (progress >= 1) { if (previous) stopTrack(previous); cancelFade(); }
    }, 25);
  }
  function stopEntry(entry) {
    entry.cancelled = true;
    if (entry.pool.generation === entry.generation) {
      entry.pool.generation++;
      pauseNode(entry.audio, true);
    }
    if (entry.clean) entry.clean();
    var index = active.indexOf(entry);
    if (index >= 0) active.splice(index, 1);
  }
  function stopEffect(name) {
    active.slice().forEach(function (entry) { if (!name || entry.name === name) stopEntry(entry); });
  }
  function play(name) {
    var config = EFFECTS[name], at = time();
    if (!config || !canPlay() || !pref.effects || (last[name] !== undefined && at - last[name] < config.gap)) {
      counters.blocked++; return false;
    }
    active = active.filter(function (entry) { return !entry.cancelled && !entry.audio.ended; });
    // One voice per effect, at most four voices total. Epic stingers displace clicks.
    if (active.some(function (entry) { return entry.name === name; })) { counters.blocked++; return false; }
    if (active.length >= 4) {
      var replace = active.find(function (entry) { return EFFECTS[entry.name].priority < config.priority; });
      if (!replace) { counters.blocked++; return false; }
      stopEntry(replace);
    }
    var pool = effects[name];
    if (!pool) {
      var created = node(name + '.mp3', false);
      if (!created) return false;
      pool = effects[name] = { audio: created, generation: 0 };
    }
    var audio = pool.audio;
    pauseNode(audio, true);
    audio.volume = pref.effects * config.level;
    var entry = { id: ++serial, name: name, audio: audio, pool: pool, generation: ++pool.generation, cancelled: false };
    active.push(entry);
    last[name] = at;
    var clean = function () {
      if (audio.removeEventListener) { audio.removeEventListener('ended', clean); audio.removeEventListener('error', clean); }
      var index = active.indexOf(entry);
      if (index >= 0) active.splice(index, 1);
    };
    entry.clean = clean;
    audio.addEventListener('ended', clean);
    audio.addEventListener('error', clean);
    try {
      var promise = audio.play();
      counters.effects[name] = (counters.effects[name] || 0) + 1;
      if (promise && promise.then) promise.then(function () {
        if (entry.generation !== pool.generation) return;
        if (entry.cancelled || !canPlay() || !pref.effects) stopEntry(entry);
      }, function () {
        clean();
        if (!entry.cancelled && entry.generation === pool.generation) counters.playbackFailures++;
      });
      return true;
    } catch (ignore) { clean(); counters.playbackFailures++; return false; }
  }
  function unlock() {
    if (!unlocked) { unlocked = true; updateMusic(); }
    else if (canPlay() && (!current || !current.playing)) updateMusic();
    // Calling play inside this synchronous gesture is what grants HTMLAudio access.
    return Promise.resolve(typeof root.Audio === 'function');
  }
  function setScene(value) {
    var next = value && typeof value === 'object' ? (value.battle ? 'battle' : value.heaven ? 'heaven' : 'home') : value;
    if (!Object.prototype.hasOwnProperty.call(MUSIC, next)) next = 'home';
    if (scene !== next) { scene = next; updateMusic(); }
    return scene;
  }
  function setPreferences(patch) {
    pref = normalized(patch, pref);
    try { root.localStorage.setItem(STORAGE, JSON.stringify(pref)); } catch (ignore) {}
    if (pref.muted || !pref.effects) stopEffect();
    else active.forEach(function (entry) { entry.audio.volume = pref.effects * EFFECTS[entry.name].level; });
    updateMusic();
    return getPreferences();
  }
  function getPreferences() { return Object.assign({}, pref); }
  function halt() { cancelFade(); Object.keys(tracks).forEach(function (name) { stopTrack(tracks[name]); }); stopEffect(); }
  function pause() { suspended = true; halt(); }
  function resume() { suspended = false; if (!(root.document && root.document.hidden)) updateMusic(); }
  function diagnostics() {
    return { unlocked: unlocked, scene: scene, paused: suspended || away || !!(root.document && root.document.hidden),
      muted: pref.muted, musicPlaying: Object.keys(tracks).filter(function (name) { return tracks[name].playing && !tracks[name].audio.paused; }),
      activeEffects: active.map(function (entry) { return entry.name; }),
      counts: Object.assign({}, counters.effects), blocked: counters.blocked, playbackFailures: counters.playbackFailures,
      musicStarts: counters.musicStarts };
  }
  if (root.document && root.document.addEventListener) root.document.addEventListener('visibilitychange', function () {
    if (root.document.hidden) halt(); else updateMusic();
  });
  if (root.addEventListener) {
    root.addEventListener('pagehide', function () { away = true; halt(); });
    root.addEventListener('pageshow', function () { away = false; updateMusic(); });
  }
  root.LingqiAudio = Object.freeze({ unlock: unlock, setScene: setScene, play: play, setPreferences: setPreferences,
    getPreferences: getPreferences, pause: pause, resume: resume, stopEffect: stopEffect, diagnostics: diagnostics });
})(typeof window !== 'undefined' ? window : globalThis);

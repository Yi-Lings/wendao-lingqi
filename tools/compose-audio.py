#!/usr/bin/env python3
"""Render the game's original, deterministic score without third-party samples.

Requires Python + numpy, and ffmpeg. All oscillators, instruments, motifs and
arrangements below were authored for 问道·灵契. MP3s are standalone offline assets.
Run from any directory: python3 tools/compose-audio.py
"""
from __future__ import annotations

import hashlib
import json
import math
import subprocess
import tempfile
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "web" / "assets" / "audio"
SR = 24000
RNG = np.random.default_rng(4102026)
TAU = 2 * math.pi


def midi(n):
    return 440 * 2 ** ((n - 69) / 12)


def axis(duration):
    return np.arange(int(duration * SR), dtype=np.float64) / SR


def envelope(t, attack=.02, decay=1.5, release=.15):
    return np.minimum(t / attack, 1) * np.exp(-t / decay) * np.minimum((t[-1] - t) / release, 1).clip(0, 1)


def instrument(note, duration, kind):
    t = axis(duration)
    f = midi(note)
    if kind == "zither":
        # Stretched string partials, a mellow woody pick and a natural decay.
        y = sum(np.sin(TAU * f * h * (1 + .00016 * h * h) * t + .23 * h) *
                np.exp(-t * (.75 + .8 * h)) / h ** 1.7 for h in range(1, 9))
        y *= np.minimum(t / .003, 1) * np.minimum((t[-1] - t) / .09, 1).clip(0, 1)
        y += RNG.normal(0, .035, len(t)) * np.exp(-t * 80)
        return y * .62
    if kind == "flute":
        phase = TAU * f * t + .04 * np.sin(TAU * 4.6 * t) * np.minimum(t / .5, 1)
        y = np.sin(phase) + .22 * np.sin(2 * phase) + .07 * np.sin(3 * phase)
        breath = np.convolve(RNG.normal(0, .035, len(t)), np.ones(7) / 7, mode="same")
        return (y + breath) * envelope(t, .17, 6, .25) * .38
    if kind == "pad":
        y = sum((np.sin(TAU * f * h * t + .32 * np.sin(TAU * .11 * t)) +
                 np.sin(TAU * f * h * 1.0016 * t + .3)) / h ** 2.5 for h in range(1, 5))
        env = np.minimum(t / .8, 1) * np.minimum((t[-1] - t) / 1.1, 1).clip(0, 1)
        return y * env * .22 * (.88 + .12 * np.sin(TAU * .17 * t))
    if kind == "bell":
        y = sum(np.sin(TAU * f * ratio * t) * np.exp(-t * decay) * amp for ratio, amp, decay in
                [(1, .65, .9), (2.01, .2, 1.5), (2.76, .13, 2.2), (4.08, .045, 3.5)])
        return y * np.minimum(t / .009, 1) * np.minimum((t[-1] - t) / .18, 1).clip(0, 1)
    if kind == "strings":
        phase = TAU * f * t + .027 * np.sin(TAU * 5.1 * t)
        y = sum(np.sin(h * phase) / h ** 1.65 for h in range(1, 7))
        return y * envelope(t, .065, .45, .09) * .35
    if kind == "bass":
        return (np.sin(TAU * f * t) + .16 * np.sin(TAU * f * 2 * t)) * envelope(t, .03, 1.7, .15) * .52
    raise ValueError(kind)


def drum(duration=.7, kind="kick"):
    t = axis(duration)
    noise = RNG.normal(0, 1, len(t))
    if kind == "kick":
        phase = TAU * (47 * t + 23 * (.05 - .05 * np.exp(-t / .05)))
        return (.8 * np.sin(phase) * np.exp(-t * 8) + noise * np.exp(-t * 65) * .08) * np.minimum(t / .004, 1)
    if kind == "low":
        return (np.sin(TAU * (76 * t + 2 * (1 - np.exp(-t * 12)))) +
                .14 * np.sin(TAU * 123 * t)) * np.exp(-t * 5.5) * np.minimum(t / .005, 1)
    smooth = np.convolve(noise, np.ones(9) / 9, mode="same")
    if kind == "snare":
        return (smooth * .45 + np.sin(TAU * 170 * t) * .25) * np.exp(-t * 16) * np.minimum(t / .003, 1)
    return smooth * np.exp(-t * 42) * .24 * np.minimum(t / .002, 1)


def add(dst, signal, at, gain=1, pan=0, loop=False):
    i = int(at * SR)
    if i < 0:
        raise ValueError("negative cue")
    stereo = np.column_stack((signal * math.sqrt((1 - pan) / 2), signal * math.sqrt((1 + pan) / 2))) * gain
    if loop:
        indices = (np.arange(len(signal)) + i) % len(dst)
        np.add.at(dst, indices, stereo)
    elif i < len(dst):
        count = min(len(dst) - i, len(stereo))
        dst[i:i + count] += stereo[:count]


def room(audio, loop=False, depth=.22):
    dry = audio.copy()
    for delay, gain in [(.13, .39), (.27, .28), (.41, .2), (.63, .13), (.89, .08)]:
        shift = int(delay * SR)
        wet = np.roll(dry[:, ::-1], shift, axis=0)
        if not loop:
            wet[:shift] = 0
        audio += wet * gain * depth
    return audio


def score(scene):
    bpm = {"home": 80, "battle": 88, "heaven": 76}[scene]
    beat = 60 / bpm
    bar = 4 * beat
    out = np.zeros((int(bar * 16 * SR), 2), dtype=np.float64)
    # D minor pentatonic motifs over Dm / Bb / F / C with a gentle modal finish.
    roots = [50, 46, 53, 48, 50, 46, 43, 48, 50, 53, 46, 48, 50, 46, 48, 50]
    chords = {50: [50, 53, 57], 46: [46, 50, 53], 53: [53, 57, 60], 48: [48, 52, 55], 43: [43, 46, 50]}
    motifs = [[74, 77, 79, 81, 79, 77, 74, 72], [70, 74, 77, 79, 77, 74, 72, 70],
              [77, 81, 84, 81, 79, 77, 74, 77], [72, 74, 79, 77, 74, 72, 69, 72]]
    for b, root in enumerate(roots):
        at = b * bar
        chord = chords[root]
        for n, note in enumerate(chord):
            add(out, instrument(note + 12, bar + 1.5, "pad"), at, .20 if scene == "battle" else .37,
                (n - 1) * .36, True)
        melody = motifs[(b // 2) % 4]
        if scene == "home":
            # Sparse opening, melodic answer from the flute, then a richer final phrase.
            for step, note in enumerate(melody):
                if (b % 4 == 0 and step in (3, 7)) or (b in (7, 15) and step > 4):
                    continue
                add(out, instrument(note, beat * 1.5, "zither"), at + step * beat / 2,
                    .30 + (.08 if step % 2 == 0 else 0), -.22 if step % 2 else .28, True)
            if b % 2 == 1:
                for step, note in [(0, melody[0] - 12), (1.5, melody[3] - 12), (3, melody[6] - 12)]:
                    add(out, instrument(note, beat * 1.5, "flute"), at + step * beat, .28, .05, True)
            add(out, instrument(root - 12, bar * .88, "bass"), at, .18, 0, True)
            if b >= 4:
                add(out, drum(.6, "low"), at + 2 * beat, .038, -.35, True)
        elif scene == "battle":
            intensity = .75 if b < 4 or b >= 14 else 1
            for step in range(8):
                note = chord[step % 3] + 12
                add(out, instrument(note, beat * .62, "strings"), at + step * beat / 2, .30 * intensity,
                    -.30 if step % 2 else .30, True)
            for step, note in enumerate(melody):
                if step in (0, 2, 4, 5, 6) and b % 2:
                    add(out, instrument(note - 12, beat * .75, "zither"), at + step * beat / 2, .30, .12, True)
            for step in (0, 2):
                add(out, drum(.75, "low"), at + step * beat, .27 * intensity, -.08, True)
                add(out, instrument(root - 12, beat * 1.65, "bass"), at + step * beat, .31, 0, True)
            for step in (1, 3):
                add(out, drum(.35, "snare"), at + step * beat, .15 * intensity, .22, True)
            for step in range(8):
                add(out, drum(.18, "hat"), at + step * beat / 2, .16, -.35, True)
            if b in (3, 7, 11):
                for step in (3, 3.5, 3.75):
                    add(out, drum(.4, "low"), at + step * beat, .16, (step - 3.4) * .5, True)
        else:
            # A slow constellation: bells answer a pentatonic celesta figure.
            for step in (0, 1.5, 2.5, 3.5):
                note = melody[int(step * 2)] + (12 if b in (6, 10) else 0)
                add(out, instrument(note, beat * 2.7, "bell"), at + step * beat, .20, -.40 if step < 2 else .40, True)
            if b % 2 == 1:
                for step, note in enumerate([chord[2] + 24, chord[1] + 24, chord[0] + 24]):
                    add(out, instrument(note, beat * 1.7, "zither"), at + (.75 + step) * beat, .11, .15, True)
            add(out, instrument(root - 12, bar * .95, "bass"), at, .18, 0, True)
    return room(out, True, .5 if scene == "heaven" else .32), bpm


def effect(name):
    durations = {"ui": .19, "success": 1.10, "error": .48, "battle-hit": .38, "battle-skill": 1.18,
                 "victory": 3.20, "defeat": 2.35, "summon-rise": 3.80, "reveal": 1.40,
                 "red-awaken": 3.40, "red-impact": 4.20}
    out = np.zeros((int(durations[name] * SR), 2), dtype=np.float64)
    if name == "ui":
        add(out, instrument(81, .16, "zither"), 0, .48)
    elif name == "success":
        for i, n in enumerate([74, 77, 81]):
            add(out, instrument(n, .7, "bell"), i * .14, .38, (i - 1) * .2)
    elif name == "error":
        for i, n in enumerate([57, 55]):
            add(out, instrument(n, .3, "zither"), i * .13, .5)
    elif name == "battle-hit":
        t = axis(.30)
        wind = np.convolve(RNG.normal(0, 1, len(t)), np.ones(5) / 5, mode="same")
        add(out, wind * np.sin(np.pi * (t / .30)) ** 2 * np.exp(-t * 10), 0, .44, .18)
        add(out, drum(.25, "low"), .03, .33, -.1)
    elif name == "battle-skill":
        t = axis(.72)
        y = np.sin(TAU * (180 * t + 400 * t ** 2)) * np.sin(np.pi * t / .72) ** 2
        add(out, y, 0, .13, -.25)
        for i, n in enumerate([62, 69, 74, 81]):
            add(out, instrument(n, .65, "bell"), .22 + i * .09, .24, (i - 1.5) * .2)
        add(out, drum(.7, "low"), .45, .35)
    elif name in ("victory", "defeat"):
        notes = [62, 65, 69, 74, 77, 81] if name == "victory" else [62, 60, 57, 50]
        for i, n in enumerate(notes):
            add(out, instrument(n, 1.5, "bell" if name == "victory" else "flute"), i * .23, .32, (i % 3 - 1) * .2)
        for n in ([50, 53, 57] if name == "victory" else [38, 41, 45]):
            add(out, instrument(n, durations[name], "pad"), 0, .55)
    elif name in ("summon-rise", "red-awaken"):
        seconds = 3.3 if name == "red-awaken" else 3.6
        t = axis(seconds)
        env = np.sin(np.pi * t / seconds) ** .8
        # Low fundamental with a slowly opening harmonic halo; no harsh siren sweep.
        y = (np.sin(TAU * (39 * t + 5 * t ** 2)) + .28 * np.sin(TAU * (78 * t + 9 * t ** 2))) * env
        add(out, y, 0, .36 if name == "red-awaken" else .17)
        notes = [62, 65, 69, 74, 77, 81, 86, 89]
        for i, n in enumerate(notes):
            add(out, instrument(n, 1.3, "bell"), .20 + i * .34, .18, math.sin(i) * .4)
        for n in [50, 57, 65]:
            add(out, instrument(n, seconds, "pad"), 0, .45)
    elif name == "reveal":
        for i, n in enumerate([77, 81, 86]):
            add(out, instrument(n, 1, "bell"), i * .09, .31, (i - 1) * .3)
        add(out, instrument(62, 1.3, "pad"), 0, .35)
    elif name == "red-impact":
        add(out, drum(1.5, "low"), .04, .72)
        add(out, drum(.7, "kick"), .04, .68)
        # A bronze bell has inharmonic partials, but its level remains comfortable.
        t = axis(3.85)
        y = sum(np.sin(TAU * 146.8 * ratio * t) * np.exp(-t * decay) * amp for ratio, amp, decay in
                [(1, .44, .85), (1.51, .21, 1.2), (2.02, .16, 1.7), (2.74, .05, 2.3)])
        add(out, y * np.minimum(t / .012, 1) * np.minimum((t[-1] - t) / .3, 1).clip(0, 1), .08, .50)
        for n in [50, 57, 62, 65]:
            add(out, instrument(n, 3.9, "pad"), .07, .52)
        for i, n in enumerate([74, 77, 81, 86, 89, 93, 98]):
            add(out, instrument(n, 1.9, "bell"), .18 + i * .12, .23, (i % 3 - 1) * .35)
    return room(out, False, .24)


def export(name, audio, kind, bpm=None):
    audio -= audio.mean(axis=0)
    peak = np.abs(audio).max()
    audio = np.tanh(audio * (.73 / peak))
    # The quietest cues stay quieter; BGM is mastered at a conservative peak.
    target = .74 if kind == "music" else .80
    audio *= target / np.abs(audio).max()
    if kind == "effect":
        fade = min(int(.04 * SR), len(audio) // 4)
        audio[-fade:] *= np.linspace(1, 0, fade)[:, None]
    DEST.mkdir(parents=True, exist_ok=True)
    pcm = (audio * 32767).astype("<i2")
    with tempfile.TemporaryDirectory(prefix="lingqi-audio-", dir="/tmp") as scratch:
        wav = Path(scratch) / (name + ".wav")
        with wave.open(str(wav), "wb") as writer:
            writer.setnchannels(2)
            writer.setsampwidth(2)
            writer.setframerate(SR)
            writer.writeframes(pcm.tobytes())
        subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(wav),
                        "-c:a", "libmp3lame", "-b:a", "112k", "-ar", str(SR),
                        "-metadata", "artist=问道·灵契 Original Score", "-metadata", "title=" + name,
                        str(DEST / (name + ".mp3"))], check=True)
    path = DEST / (name + ".mp3")
    info = {"file": name + ".mp3", "kind": kind, "duration": round(len(audio) / SR, 4),
            "sampleRate": SR, "channels": 2, "peak": round(float(np.abs(audio).max()), 5),
            "rms": round(float(np.sqrt(np.mean(audio ** 2))), 5), "bytes": path.stat().st_size,
            "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}
    if bpm:
        info["bpm"] = bpm
        info["loop"] = True
        info["boundaryDelta"] = round(float(np.abs(audio[0] - audio[-1]).max()), 5)
    print(name, info["duration"], "s", info["bytes"], "bytes", "RMS", info["rms"], flush=True)
    return info


def main():
    assets = {}
    for scene in ("home", "battle", "heaven"):
        song, bpm = score(scene)
        assets[scene] = export("bgm-" + scene, song, "music", bpm)
    for name in ("ui", "success", "error", "battle-hit", "battle-skill", "victory", "defeat",
                 "summon-rise", "reveal", "red-awaken", "red-impact"):
        assets[name] = export(name, effect(name), "effect")
    manifest = {"version": 1, "provenance": "Original procedurally composed score and synthesis for 问道·灵契; no external audio samples.",
                "generator": "tools/compose-audio.py", "license": "Project original assets; distributable with the game.", "assets": assets}
    (DEST / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()

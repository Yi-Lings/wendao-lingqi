#!/usr/bin/env python3
"""Compose the original 96-second 云门长明 score and its ascension stinger.

No downloaded samples, generated speech, or third-party melodies are used.
All MIDI notes, articulation, harmony, dynamics, string partials, bell modes and
room responses are defined here. Python + numpy and ffmpeg/ffprobe are required.

Run: python3 tools/audio/compose-ascension.py
The original fourteen audio files and their manifest are read and checked only.
The timed score is also saved as ascension-score.json for review/reproduction.
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

ROOT = Path(__file__).resolve().parents[2]
DEST = ROOT / "web" / "assets" / "audio"
SCORE = Path(__file__).with_name("ascension-score.json")
SR = 44100
TAU = 2 * math.pi
BPM = 80
BEAT = 60 / BPM
BAR = 4 * BEAT
DURATION = 32 * BAR
PENTATONIC = {0, 2, 5, 7, 9}  # C, D, F, G, A: D yu-mode pentatonic.
SEED = 7102026


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def old_assets():
    path = DEST / "manifest.json"
    original = json.loads(path.read_text(encoding="utf-8"))
    assert len(original["assets"]) == 14, "Expected exactly fourteen original assets"
    for info in original["assets"].values():
        asset = DEST / info["file"]
        assert asset.stat().st_size == info["bytes"], "Original asset size changed: " + info["file"]
        assert sha(asset) == info["sha256"], "Original asset changed: " + info["file"]
    return {"file": "manifest.json", "bytes": path.stat().st_size, "sha256": sha(path),
            "assets": original["assets"]}


def frequency(note):
    return 440.0 * 2 ** ((note - 69) / 12)


def smooth(x):
    x = np.clip(x, 0, 1)
    return x * x * (3 - 2 * x)


def envelope(t, attack, release):
    return smooth(t / attack) * smooth((t[-1] - t) / release)


def bowed(note, duration, seed):
    """Three independent bowed voices; fixed body resonances and slow bow swell."""
    t = np.arange(round(duration * SR), dtype=np.float64) / SR
    f = frequency(note)
    rng = np.random.default_rng(seed)
    tone = np.zeros(len(t), dtype=np.float64)
    # Attack/release and vibrato are slow; this is a sustained ensemble, not a beep.
    vibrato_amount = smooth((t - .25) / .8)
    for voice, cents in enumerate((-6.0, 0.4, 5.3)):
        pitch = f * 2 ** (cents / 1200)
        phase = TAU * pitch * t + (.021 + voice * .003) * np.sin(TAU * (4.5 + voice * .17) * t + voice) * vibrato_amount
        for partial in range(1, min(17, int(SR / (2 * pitch)))):
            hz = pitch * partial
            body = .65 + .5 * math.exp(-((hz - 680) / 430) ** 2) + .3 * math.exp(-((hz - 1450) / 650) ** 2)
            amp = body * math.exp(-hz / 3600) / partial ** 1.36
            tone += amp * np.sin(partial * phase + rng.uniform(-math.pi, math.pi)) / 3
    bow_motion = .88 + .075 * np.sin(TAU * .36 * t + seed % 7) + .045 * np.sin(TAU * .12 * t)
    return (tone * envelope(t, .85, .95) * bow_motion * .28).astype(np.float32)


def woodwind(note, duration, seed):
    """A breathy harmonic lead with a soft, articulated onset and modest vibrato."""
    t = np.arange(round(duration * SR), dtype=np.float64) / SR
    f = frequency(note)
    vibrato = .033 * np.sin(TAU * 4.4 * t) * smooth((t - .22) / .6)
    phase = TAU * f * t + vibrato
    tone = sum(amp * np.sin(h * phase + h * .14) for h, amp in
               ((1, .88), (2, .18), (3, .10), (4, .025), (5, .018)))
    rng = np.random.default_rng(seed)
    breath = rng.normal(0, .022, len(t))
    breath = np.convolve(breath, np.ones(19) / 19, mode="same")
    env = envelope(t, .18, .32) * (.94 + .06 * np.sin(TAU * .7 * t))
    return ((tone + breath) * env * .34).astype(np.float32)


def plucked(note, duration, seed):
    """Guqin-like inharmonic stretched string with a short woody pick transient."""
    t = np.arange(round(duration * SR), dtype=np.float64) / SR
    f = frequency(note)
    rng = np.random.default_rng(seed)
    tone = np.zeros(len(t), dtype=np.float64)
    for h in range(1, min(13, int(SR / (2 * f)))):
        stiff = math.sqrt(1 + .00019 * h * h)
        tone += np.sin(TAU * f * h * stiff * t + .17 * h) * np.exp(-t * (.42 + .30 * h)) / h ** 1.55
    pick = rng.normal(0, .045, len(t)) * np.exp(-t * 100)
    return ((tone + pick) * envelope(t, .004, .13) * .37).astype(np.float32)


def bronze(note, duration, seed):
    """A pitched bronze bell: true fundamental and independently decaying modes."""
    t = np.arange(round(duration * SR), dtype=np.float64) / SR
    f = frequency(note)
    tone = np.zeros(len(t), dtype=np.float64)
    for ratio, amp, decay in ((1, .70, .44), (1.498, .19, .72), (2.014, .25, 1.0),
                              (2.756, .11, 1.7), (4.07, .038, 2.6), (5.42, .018, 3.3)):
        tone += amp * np.sin(TAU * f * ratio * t + .07 * ratio) * np.exp(-t * decay)
    return (tone * envelope(t, .011, .35) * .50).astype(np.float32)


INSTRUMENTS = {"bowed": bowed, "woodwind": woodwind, "plucked": plucked, "bronze": bronze}


def cue(events, voice, note, start, duration, gain, pan=0):
    assert note % 12 in PENTATONIC, "Every pitched line stays inside D yu pentatonic"
    assert start >= 0 and duration > 0 and -.85 <= pan <= .85
    events.append({"voice": voice, "midi": note, "pitchHz": round(frequency(note), 5),
                   "start": round(start, 5), "duration": round(duration, 5),
                   "gain": round(gain, 5), "pan": round(pan, 5)})


def score_events():
    events = []
    # Root movement is deliberately modal, with no equal-tempered chromatic filler.
    roots = [50,50,53,53,55,55,57,50, 50,53,55,57,60,57,55,50,
             50,53,55,57,60,57,55,50, 50,55,53,50,57,55,50,50]
    for bar, root in enumerate(roots):
        section = bar // 8
        intensity = [.48, .66, .88, .52][section]
        if bar >= 28:
            intensity *= (32 - bar) / 4
        chord = {50:[50,57,62],53:[53,60,65],55:[55,62,67],57:[57,62,69],60:[60,67,72]}[root]
        for n, note in enumerate(chord):
            cue(events,"bowed",note,bar*BAR,4.05,intensity*(.24 if n==0 else .17),(n-1)*.44)
        # A low register establishes the spacious room without sub-bass rumbling.
        if bar % 2 == 0:
            cue(events,"bowed",root-12,bar*BAR,6.7,intensity*.13,-.06)
        if section in (1,2):
            # Left/right plucked reply is a separate pitched accompaniment voice.
            for beat,n in ((.5,chord[1]+12),(2,chord[0]+12),(3.25,chord[2]+12)):
                cue(events,"plucked",n,bar*BAR+beat*BEAT,2.25,.19 if section==1 else .23,
                    -.36 if beat<2 else .32)
        elif section == 3 and bar < 28:
            cue(events,"plucked",chord[1]+12,bar*BAR+1.5*BEAT,2.65,.10,.25)
    # Original eight-bar motives; silence and long notes belong to the score.
    opening=[(2,0,62,3),(3,1,65,3),(4,0,67,3),(5,0,69,4),(6,0,72,3),(7,0,69,2),(7,2,62,2)]
    stair=[(8,0,62,2),(8,2,65,2),(9,0,67,2),(9,2,69,2),(10,0,72,3),(11,0,69,2),
           (11,2,67,2),(12,0,65,3),(13,0,67,2),(13,2,69,2),(14,0,72,2),(14,2,74,2),(15,0,69,4)]
    gate=[(16,0,74,2),(16,2,77,2),(17,0,79,2),(17,2,81,2),(18,0,84,4),(19,0,81,2),
          (19,2,79,2),(20,0,77,2),(20,2,74,2),(21,0,79,3),(22,0,77,2),(22,2,74,2),(23,0,72,4)]
    return_motif=[(24,0,74,3),(25,0,72,2),(25,2,69,2),(26,0,67,3),(27,0,65,3),
                  (28,0,67,2),(28,2,69,2),(29,0,65,3),(30,0,62,5)]
    for section,melody in enumerate((opening,stair,gate,return_motif)):
        for bar,beat,note,beats in melody:
            cue(events,"woodwind",note,bar*BAR+beat*BEAT,beats*BEAT+.20,
                [.41,.46,.54,.35][section],-.08 if section%2==0 else .10)
    # Countermelody enters at the climax and moves slowly beneath the lead.
    for bar,note in ((16,62),(18,65),(20,67),(22,65),(24,62),(26,57)):
        cue(events,"bowed",note,bar*BAR+.25,5.75,.25 if bar<24 else .16,.42)
    for bar,note in ((0,62),(6,67),(8,74),(15,69),(16,74),(20,77),(24,74),(30,62)):
        cue(events,"bronze",note,bar*BAR+.03,5.7,.23 if bar==16 else .15,-.42 if bar%4==0 else .40)
    return events


def stinger_events():
    events=[]
    # A six-note ascent is timed to the actual confirmation, followed by a held D/A.
    for i,note in enumerate((62,65,67,69,72,74)):
        cue(events,"plucked",note,.10+i*.28,2.15,.44+i*.025,(i-2.5)*.14)
        cue(events,"bronze",note+12,.18+i*.28,3.8,.15+i*.014,(2.5-i)*.13)
    cue(events,"bronze",50,1.86,4.7,.50,-.08)
    for note,pan in ((50,-.35),(57,.35),(62,0),(74,.2)):
        cue(events,"bowed",note,1.62,4.95,.25,pan)
    return events


def space(audio):
    """Stereo early reflections plus a decaying diffused room, never a noise bed."""
    dry=audio.copy()
    for delay,gain in ((.079,.15),(.151,.12),(.233,.085),(.347,.065)):
        offset=round(delay*SR)
        audio[offset:]+=dry[:-offset,::-1]*gain
    # Long irregular recirculating taps disperse harmonic tails into the room.
    for delay,feedback in ((.421,.47),(.613,.38),(.827,.30)):
        offset=round(delay*SR)
        for step in range(1,8):
            shifted=offset*step
            if shifted>=len(audio):
                break
            audio[shifted:]+=dry[:-shifted,::(-1 if step%2 else 1)]*(feedback**step)*.13
    # Cross-channel very short decorrelation keeps the center melody clear.
    offset=round(.017*SR)
    audio[offset:,1]+=dry[:-offset,0]*.018
    return audio


def render(events,duration):
    out=np.zeros((round(duration*SR),2),dtype=np.float32)
    for index,event in enumerate(events):
        signal=INSTRUMENTS[event["voice"]](event["midi"],event["duration"],SEED+index*97)
        start=round(event["start"]*SR);n=min(len(signal),len(out)-start)
        if n<=0:
            continue
        left=math.sqrt((1-event["pan"])/2)*event["gain"]
        right=math.sqrt((1+event["pan"])/2)*event["gain"]
        out[start:start+n,0]+=signal[:n]*left
        out[start:start+n,1]+=signal[:n]*right
    return space(out)


def master(audio,kind):
    audio-=audio.mean(axis=0)
    robust=float(np.quantile(np.abs(audio),.99995))
    audio=np.tanh(audio*(.87/max(robust,1e-6)))
    audio*= (.74 if kind=="music" else .80)/float(np.abs(audio).max())
    fade_in=round((1.8 if kind=="music" else .014)*SR)
    fade_out=round((3.0 if kind=="music" else .85)*SR)
    audio[:fade_in]*=smooth(np.linspace(0,1,fade_in))[:,None]
    audio[-fade_out:]*=smooth(np.linspace(1,0,fade_out))[:,None]
    return audio


def export(file,audio,kind):
    pcm=np.rint(audio*32767).astype("<i2")
    with tempfile.TemporaryDirectory(prefix="lingqi-ascension-audio-",dir="/tmp") as scratch:
        wav=Path(scratch)/"score.wav"
        with wave.open(str(wav),"wb") as writer:
            writer.setnchannels(2);writer.setsampwidth(2);writer.setframerate(SR);writer.writeframes(pcm.tobytes())
        output=DEST/file
        subprocess.run(["ffmpeg","-hide_banner","-loglevel","error","-y","-i",str(wav),
                        "-c:a","libmp3lame","-b:a","128k","-ar",str(SR),"-ac","2",
                        "-map_metadata","-1","-id3v2_version","0","-write_xing","1",str(output)],check=True)
    probe=json.loads(subprocess.check_output(["ffprobe","-v","error","-show_entries",
        "stream=sample_rate,channels,bit_rate:format=duration","-of","json",str(output)],text=True))
    stream=probe["streams"][0]
    assert int(stream["sample_rate"])==SR and stream["channels"]==2 and int(stream["bit_rate"])==128000
    # Decode the shipped MP3, including its delay/padding metadata, for signal QA.
    raw=subprocess.check_output(["ffmpeg","-v","error","-i",str(output),"-f","f32le","-acodec","pcm_f32le","-"])
    decoded=np.frombuffer(raw,dtype="<f4").reshape(-1,2)
    assert len(decoded)==len(audio), "Encoded file must retain the scored sample count"
    assert np.isfinite(decoded).all() and np.abs(decoded).max()<.96
    info={"file":file,"kind":kind,"duration":round(len(audio)/SR,4),"sampleRate":SR,"channels":2,
          "peak":round(float(np.abs(audio).max()),5),"rms":round(float(np.sqrt(np.mean(audio**2))),5),
          "bytes":output.stat().st_size,"sha256":sha(output),"bitrate":128000,
          "decodedPeak":round(float(np.abs(decoded).max()),5),
          "decodedRms":round(float(np.sqrt(np.mean(decoded**2))),5),
          "decodedSamples":len(decoded)}
    if kind=="music":
        info.update(bpm=BPM,loop=True,boundaryDelta=round(float(np.abs(decoded[0]-decoded[-1]).max()),7))
    print(file,info["duration"],"seconds",info["bytes"],"bytes RMS",info["decodedRms"],flush=True)
    return info,decoded


def main():
    preserved=old_assets()
    music_events=score_events();effect_events=stinger_events()
    score={"title":"云门长明","bpm":BPM,"beatsPerBar":4,"bars":32,"duration":DURATION,
           "mode":"D yu pentatonic: D F G A C","seed":SEED,"sampleRate":SR,
           "sections":[{"start":0,"end":24,"name":"云门初映"},{"start":24,"end":48,"name":"叩阶升行"},
                       {"start":48,"end":72,"name":"玉阙展开"},{"start":72,"end":96,"name":"星海回响"}],
           "musicEvents":music_events,"ascensionRiseEvents":effect_events}
    print("Rendering",len(music_events),"pitched cues across four original score sections",flush=True)
    music,decoded=export("bgm-ascension.mp3",master(render(music_events,DURATION),"music"),"music")
    # Each section must contain real, distinct music; no silence/noise size padding.
    windows=decoded.reshape(32,round(BAR*SR),2)
    rms=np.sqrt(np.mean(windows**2,axis=(1,2)))
    assert float(rms.min())>.02 and float(rms.max())<.35
    fingerprints={hashlib.sha256(w.tobytes()).hexdigest() for w in windows}
    assert len(fingerprints)==32,"All scored bars must be distinguishable"
    del decoded,windows
    effect,_=export("ascension-rise.mp3",master(render(effect_events,6.8),"effect"),"effect")
    assert old_assets()==preserved,"Original audio/manifest changed during rendering"
    SCORE.write_text(json.dumps(score,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    manifest={"version":1,"provenance":"Original 32-bar D yu pentatonic score and modal synthesis for 问道·灵契; no external samples or copied melodies.",
              "generator":"tools/audio/compose-ascension.py","score":"tools/audio/ascension-score.json",
              "license":"Project original assets; distributable with the game.",
              "originalManifest":preserved,
              "assets":{"ascension":music,"ascension-rise":effect},
              "mixRecommendation":{"musicSceneGain":.64,"effectLevel":.88,"effectPriority":3,
                                   "musicDefaultSlider":.42,"effectDefaultSlider":.55},
              "validation":{"oldAssetsByteIdentical":14,"scoredBars":32,"uniqueDecodedBars":32,
                            "minimumBarRms":round(float(rms.min()),5),"maximumBarRms":round(float(rms.max()),5)}}
    (DEST/"ascension-manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("Preserved all fourteen original MP3 files and manifest byte-for-byte",flush=True)


if __name__=="__main__":
    main()

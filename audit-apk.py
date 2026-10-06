#!/usr/bin/env python3
"""Verify the APK manifest and every embedded Web resource without Android hardware."""
import argparse, hashlib, json, os, pathlib, subprocess, zipfile

ROOT = pathlib.Path(__file__).resolve().parent
parser = argparse.ArgumentParser()
parser.add_argument('apk', nargs='?', default=str(ROOT / 'dist/lingqi-game.apk'))
parser.add_argument('--report', default=str(ROOT / 'dist/apk-check.txt'))
args = parser.parse_args()
apk = pathlib.Path(args.apk)
tools = ROOT / 'tools/android'
modules = ['data.js', 'equipment-art.js', 'game-art.js', 'core.js', 'builds.js', 'economy.js', 'combat.js', 'story.js', 'engine.js', 'audio.js', 'selection.js', 'app.js']
art = ['v3-heroes.png', 'v3-hero-expressions.png', 'v3-forge.png', 'v3-world.png',
       'v3-map-atlas-a.png', 'v3-map-atlas-b.png', 'v3-monster-atlas.png',
       'v3-boss-atlas.png', 'v3-items-atlas.png', 'v3-skills-atlas.png', 'v3-summon.png', 'v3-shop.png', 'v3-chapter-atlas.png', 'v3-cardback.png',
       'v4-weapons-atlas.png', 'v4-armor-atlas.png', 'v4-utilities-atlas.png',
       'v4-treasures-atlas.png', 'v4-pills-atlas.png', 'v4-basic-skills-atlas.png']
audio = ['bgm-home', 'bgm-battle', 'bgm-heaven', 'ui', 'success', 'error',
         'battle-hit', 'battle-skill', 'victory', 'defeat', 'summon-rise', 'reveal',
         'red-awaken', 'red-impact']
assets = [p for p in sorted((ROOT / 'web').rglob('*')) if p.is_file()]
required = modules + ['index.html', 'style.css', 'selection.css', 'layout.css', 'battle.css', 'builds.css'] + ['assets/' + name for name in art] + ['assets/audio/' + name + '.mp3' for name in audio] + ['assets/audio/manifest.json']
assert all((ROOT / 'web' / name).is_file() and (ROOT / 'web' / name).stat().st_size for name in required), 'Required game asset missing'

def digest(stream):
    h = hashlib.sha256()
    while True:
        block = stream.read(1024 * 1024)
        if not block:
            return h.hexdigest()
        h.update(block)

with zipfile.ZipFile(apk) as archive:
    names = archive.namelist()
    assert len(names) == len(set(names)), 'Duplicate ZIP entries'
    assert 'classes.dex' in names and archive.getinfo('classes.dex').file_size > 0
    expected = {'assets/' + p.relative_to(ROOT / 'web').as_posix() for p in assets}
    assert {n for n in names if n.startswith('assets/') and not n.endswith('/')} == expected, 'APK asset set differs from source'
    for p in assets:
        name = 'assets/' + p.relative_to(ROOT / 'web').as_posix()
        with p.open('rb') as source, archive.open(name) as packed:
            assert digest(source) == digest(packed), name + ' differs from tested source'
    dex_bytes = archive.getinfo('classes.dex').file_size
result = subprocess.run([str(tools / 'aapt2'), 'dump', 'badging', str(apk)],
                        env={**os.environ, 'LD_LIBRARY_PATH': str(tools / 'lib64')},
                        check=True, text=True, capture_output=True)
badging = result.stdout
assert "name='com.lingqi.game'" in badging
assert "versionCode='3'" in badging and "versionName='3.0'" in badging
assert "sdkVersion:'26'" in badging or "minSdkVersion:'26'" in badging
assert "targetSdkVersion:'35'" in badging
assert 'uses-permission:' not in badging, 'APK declares a permission'
lines = [s for s in badging.splitlines() if s.startswith(('package:', 'sdkVersion:', 'minSdkVersion:', 'targetSdkVersion:', 'application-label:', 'launchable-activity:', 'uses-permission:'))]
with apk.open('rb') as source:
    sha256 = digest(source)
report = '\n'.join(lines) + '\n'
report += 'All ' + str(len(assets)) + ' packaged game assets exactly match source.\n'
report += 'Game artwork: ' + ', '.join(art) + '\n'
report += 'Offline audio: ' + ', '.join(audio) + '\n'
report += 'Game modules: ' + ', '.join(modules) + '\n'
report += 'classes.dex bytes: ' + str(dex_bytes) + '\n'
report += 'APK bytes: ' + str(apk.stat().st_size) + '\nAPK SHA256: ' + sha256 + '\n'
pathlib.Path(args.report).write_text(report, encoding='utf-8')
print(report, end='')

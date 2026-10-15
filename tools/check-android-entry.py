#!/usr/bin/env python3
"""Run the actual Java entry guard against preview navigation and foreign URLs."""
import argparse
from pathlib import Path
import re
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--jdk', type=Path, default=Path('/workspace/cloud-toolchain/jdk-17'))
args = parser.parse_args()
source = (ROOT / 'android/app/src/main/java/com/lingqi/game/MainActivity.java').read_text()
entry = re.search(r'private static final String ENTRY = "[^"\n]+";', source)
method = re.search(r'    private static boolean isEntry\(String url\) \{.*?\n    \}', source, re.S)
if not entry or not method:
    raise SystemExit('Android entry guard changed; review the native boundary check')
allowed = ['file:///android_asset/index.html', 'file:///android_asset/index.html#chapter',
           'file:///android_asset/index.html?preview=0', 'file:///android_asset/index.html?preview=1',
           'file:///android_asset/index.html?preview=1&immortal=1',
           'file:///android_asset/index.html?immortal=1&preview=1',
           'file:///android_asset/index.html?preview=1&immortal=1#chapter']
blocked = ['https://example.com/index.html?preview=1', 'file:///android_asset/app.js',
           'file:///android_asset/index.html.evil', 'file:///android_asset/index.html/../other.html',
           'file:///android_asset/index.html?preview=1&redirect=https://example.com',
           'file:///android_asset/index.html?preview=2', 'file:///android_asset/index.html?immortal=1',
           'file:///android_asset/index.html?preview=0&immortal=1',
           'content://provider/android_asset/index.html', 'file://example.com/android_asset/index.html', '']
def literal(value):
    return '"' + value.replace('\\', '\\\\').replace('"', '\\"') + '"'
checks = ['if (!isEntry(' + literal(url) + ')) throw new AssertionError("Allowed URL rejected");' for url in allowed]
checks += ['if (isEntry(' + literal(url) + ')) throw new AssertionError("Foreign URL accepted");' for url in blocked]
checks += ['if (isEntry(null)) throw new AssertionError("Null accepted");']
program = 'public class EntryGuardCheck {\n' + entry[0] + '\n' + method[0] + '\npublic static void main(String[] args) {\n' + '\n'.join(checks) + '\nSystem.out.println("Android entry guard: ' + str(len(checks)) + ' actual Java URL checks passed");\n}\n}\n'
with tempfile.TemporaryDirectory(prefix='lingqi-native-entry-') as temporary:
    directory = Path(temporary)
    java_file = directory / 'EntryGuardCheck.java'
    java_file.write_text(program)
    subprocess.run([str(args.jdk / 'bin/javac'), str(java_file)], check=True)
    subprocess.run([str(args.jdk / 'bin/java'), '-cp', str(directory), 'EntryGuardCheck'], check=True)

#!/usr/bin/env python3
"""Package the reviewed game source, excluding private tools and historical APKs."""
import argparse
import datetime
import hashlib
import json
import pathlib
import subprocess
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser()
parser.add_argument('--output', type=pathlib.Path)
args = parser.parse_args()
version = json.loads((ROOT / 'package.json').read_text(encoding='utf-8'))['version']
output = args.output or ROOT / 'dist' / ('wendao-lingqi-v' + version + '-source.zip')
output.parent.mkdir(parents=True, exist_ok=True)
listed = subprocess.run(['git', 'ls-files', '--cached', '--others', '--exclude-standard', '-z'],
                        cwd=ROOT, check=True, capture_output=True).stdout.decode('utf-8').split('\0')
allowed_roots = {'web', 'tests', 'docs', 'android', 'tools', '.github', 'releases'}
allowed_files = {'README.md', 'HANDOFF.md', 'LICENSE', '.gitignore', 'package.json', 'plan.md', 'audit-apk.py', 'build-android.sh'}
private = {'node_modules', 'qa-tools', '.git', '.gradle', 'build', '__pycache__', 'signing'}
files = []
for name in sorted(set(listed)):
    p = pathlib.PurePosixPath(name)
    if not name or p.is_absolute() or '..' in p.parts or set(p.parts) & private:
        continue
    if p.parts[0] not in allowed_roots and name not in allowed_files:
        continue
    if p.parts[0] == 'releases' and p.suffix not in {'.md', '.json', '.sha256'}:
        continue
    if p.suffix in {'.apk', '.pk8', '.pem', '.keystore', '.jks'} or p.as_posix().startswith('tools/android/'):
        continue
    actual = ROOT / p
    if actual.is_file() and not actual.is_symlink():
        files.append(actual)
assert ROOT / 'web/index.html' in files and ROOT / 'android/app/src/debug/res/values/strings.xml' in files
prefix = 'wendao-lingqi-v' + version
manifest = {'version': version, 'createdAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
            'baseCommit': subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=ROOT, check=True,
                                         capture_output=True, text=True).stdout.strip(),
            'files': {}, 'notice': 'Source snapshot excludes keys, toolchains, caches and historical APKs.',
            'workingTreeClean': not bool(subprocess.run(['git', 'status', '--porcelain'], cwd=ROOT, check=True, capture_output=True, text=True).stdout.strip())}
with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
    for p in files:
        data = p.read_bytes()
        name = p.relative_to(ROOT).as_posix()
        manifest['files'][name] = hashlib.sha256(data).hexdigest()
        archive.writestr(prefix + '/' + name, data)
    archive.writestr(prefix + '/SOURCE-MANIFEST.json', json.dumps(manifest, ensure_ascii=False, indent=2))
with zipfile.ZipFile(output) as archive:
    assert archive.testzip() is None
    for name, digest in manifest['files'].items():
        assert hashlib.sha256(archive.read(prefix + '/' + name)).hexdigest() == digest, name
digest = hashlib.sha256(output.read_bytes()).hexdigest()
output.with_name(output.name + '.sha256').write_text(digest + '  ' + output.name + '\n', encoding='utf-8')
print(json.dumps({'archive': str(output), 'files': len(files), 'bytes': output.stat().st_size, 'sha256': digest}, indent=2))

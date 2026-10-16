#!/usr/bin/env python3
"""Verify the exact tested current preview before a GitHub publication."""
import hashlib
import json
from pathlib import Path
import re
import zipfile

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist'
version = json.loads((ROOT / 'package.json').read_text())['version']
series = '.'.join(version.split('.')[:2])
slug = series.replace('.', '')
prefix = 'wendao-lingqi-v' + series + '-preview'
expected = json.loads((ROOT / ('releases/v' + slug + '-artifact-manifest.json')).read_text())
signature = (DIST / 'apk-signature.txt').read_text()
certs = re.findall(r'certificate SHA-256 digest: ([0-9a-fA-F]+)', signature)
assert len(certs) == 1 and certs[0].lower() == expected['signerCertificateSha256']
assert re.search(r'Verified using v2 scheme[^\n]*: true', signature)
for name, entry in expected['files'].items():
    actual = DIST / name
    digest = hashlib.sha256(actual.read_bytes()).hexdigest()
    assert actual.stat().st_size == entry['bytes'], name
    assert digest == entry['sha256'], name
    actual.with_name(actual.name + '.sha256').write_text(digest + '  ' + name + '\n')
html = (DIST / (prefix + '.html')).read_bytes()
with zipfile.ZipFile(DIST / (prefix + '.zip')) as archive:
    assert archive.testzip() is None
    assert set(archive.namelist()) == {(prefix + '.html'), '试玩说明.txt'}
    assert archive.read((prefix + '.html')) == html
    assert (prefix + '.html') in archive.read('试玩说明.txt').decode()
print('Verified signature, APK, offline HTML, ZIP and all release checksums.')

#!/usr/bin/env python3
"""Reassemble the signed personal APK, validating every part and final SHA-256."""
import argparse
import hashlib
import json
import os
import re
from pathlib import Path
import tempfile

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--parts', type=Path, default=ROOT / 'releases/parts')
parser.add_argument('--output', type=Path, default=ROOT / 'dist/wendao-lingqi-v3.apk')
parser.add_argument('--checksum', type=Path, default=ROOT / 'releases/wendao-lingqi-v3.apk.sha256')
args = parser.parse_args()
manifest = json.loads((args.parts / 'manifest.json').read_text(encoding='utf-8'))
name = manifest['fileName']
if not re.fullmatch(r'[a-z0-9-]+\.apk', name) or not manifest['parts']:
    raise SystemExit('Unexpected APK manifest')
expected = args.checksum.read_text(encoding='utf-8').split()
if expected != [manifest['sha256'], name]:
    raise SystemExit('Manifest and release checksum disagree')
args.output.parent.mkdir(parents=True, exist_ok=True)
fd, temporary = tempfile.mkstemp(prefix=args.output.name + '.', suffix='.tmp', dir=args.output.parent)
temporary = Path(temporary)
try:
    total = 0
    digest = hashlib.sha256()
    with os.fdopen(fd, 'wb') as output:
        for index, part in enumerate(manifest['parts'], 1):
            if part['name'] != f'{name}.part{index:02d}':
                raise ValueError('Unexpected part name or order')
            part_digest = hashlib.sha256()
            part_size = 0
            with (args.parts / part['name']).open('rb') as source:
                while True:
                    block = source.read(1024 * 1024)
                    if not block:
                        break
                    output.write(block)
                    digest.update(block)
                    part_digest.update(block)
                    part_size += len(block)
            if part_size != part['size'] or part_digest.hexdigest() != part['sha256']:
                raise ValueError('Part checksum mismatch: ' + part['name'])
            total += part_size
        output.flush()
        os.fsync(output.fileno())
    if total != manifest['size'] or digest.hexdigest() != manifest['sha256']:
        raise ValueError('Final APK checksum mismatch')
    os.replace(temporary, args.output)
    print(f'Verified {total} bytes: {digest.hexdigest()}')
    print(args.output)
finally:
    temporary.unlink(missing_ok=True)

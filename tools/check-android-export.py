#!/usr/bin/env python3
"""Verify the compiled export method preserves a snapshot without saving a character.

This audits actual DEX instructions; it does not exercise an Android file picker.
"""
import argparse
from pathlib import Path
import re
import subprocess
import tempfile
from zipfile import ZipFile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('apk', type=Path)
parser.add_argument('--dexdump', type=Path, required=True)
parser.add_argument('--report', type=Path)
args = parser.parse_args()

def method(text, owner, name):
    blocks = re.split(r'(?=^    #\d+\s+: \(in )', text, flags=re.M)
    matches = [b for b in blocks if re.match(r'^    #\d+\s+: \(in ', b)
               and '(in ' + owner + ';)' in b.splitlines()[0]
               and re.search(r"^      name\s+: '" + re.escape(name) + r"'$", b, re.M)]
    if len(matches) != 1:
        raise ValueError(f'Expected exactly one compiled {owner}.{name}, found {len(matches)}')
    return matches[0]

with tempfile.TemporaryDirectory(prefix='lingqi-dex-export-') as tmp:
    dumps = []
    with ZipFile(args.apk) as archive:
        for name in sorted(archive.namelist()):
            if re.fullmatch(r'classes\d*\.dex', name):
                output = Path(tmp) / name
                output.write_bytes(archive.read(name))
                dumps.append(subprocess.run([str(args.dexdump), '-d', str(output)], check=True,
                                            capture_output=True, text=True).stdout)
    text = '\n'.join(dumps)
    owner = 'Lcom/lingqi/game/MainActivity'
    export = method(text, owner, 'startExport')
    snapshot = method(text, owner, 'preserveExport')
    persist = method(text, owner + '$SaveBridge', 'persistSave')
    assert '.validatedSave:' in export, 'Normal exports must still validate the save schema'
    assert '.preserveExport:' in export, 'Exports must retain a separate recoverable snapshot'
    assert '.writeInternalSave:' not in export, 'Export must not overwrite a formal character'
    assert '.saveFile:' not in snapshot, 'Snapshot storage must not target the formal save file'
    assert '.exportFile:' in snapshot, 'Snapshot storage must use the separate export file'
    assert '.writeInternalSave:' in persist or '.access$' in persist, 'Formal save bridge must still save'
    # Android debug D8 may use a synthetic accessor for the private save method.
    # Inspect that accessor instead of accepting any unrelated access$ call.
    if '.writeInternalSave:' not in persist:
        accessors = re.findall(r'Lcom/lingqi/game/MainActivity;\.(access\$\d+):', persist)
        assert accessors and all('.writeInternalSave:' in method(text, owner, a) for a in accessors)
    report = ('Compiled Android export boundary: 6 checks passed\n'
              'startExport validates and preserves a separate snapshot; no formal-save call.\n'
              'preserveExport uses exportFile; persistSave still invokes writeInternalSave.\n'
              'This is compiled-code evidence, not a device or system-picker test.\n')
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(report)
    print(report, end='')

#!/bin/sh
set -eu
TASK_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
TASK_TOOLS="$TASK_ROOT/tools/android"
TASK_JAVA="$TASK_TOOLS/jre/bin/java"
TASK_BUILD="$TASK_ROOT/android/build/manual"
TASK_SRC="$TASK_ROOT/android/app/src/main"
TASK_SIGN="${LINGQI_SIGNING_DIR:-$TASK_ROOT/tools/signing}"
export LD_LIBRARY_PATH="$TASK_TOOLS/lib64"
for TASK_FILE in "$TASK_JAVA" "$TASK_TOOLS/android.jar" "$TASK_TOOLS/ecj.jar" "$TASK_TOOLS/aapt2" "$TASK_TOOLS/zipalign" "$TASK_TOOLS/lib/d8.jar" "$TASK_TOOLS/lib/apksigner.jar"; do
 if [ ! -f "$TASK_FILE" ]; then echo "Missing tool: $TASK_FILE. Run python3 tools/prepare-tools.py first." >&2;exit 1;fi
done
for TASK_FILE in index.html app.js engine.js data.js core.js economy.js combat.js story.js style.css; do
 if [ ! -s "$TASK_ROOT/web/$TASK_FILE" ]; then echo "Missing game asset: web/$TASK_FILE" >&2;exit 1;fi
done
if [ ! -f "$TASK_SIGN/signing-key.pk8" ] || [ ! -f "$TASK_SIGN/signing-cert.pem" ]; then
 echo 'Existing release signing pair missing. Restore the previous private key and certificate; never create a new key for an upgrade.' >&2
 echo 'For a fresh debug build, use Gradle :app:assembleDebug instead.' >&2
 exit 1
fi
mkdir -p "$TASK_BUILD" "$TASK_ROOT/dist"
python3 - "$TASK_BUILD" "$TASK_ROOT/web" "$TASK_SRC" <<'PY'
import pathlib,shutil,sys,xml.etree.ElementTree as ET
build,web,src=map(pathlib.Path,sys.argv[1:])
for name in ['classes','dex','generated','assets']:
 path=build/name
 if path.exists():shutil.rmtree(path)
 path.mkdir(parents=True)
shutil.copytree(web,build/'assets',dirs_exist_ok=True)
files=sorted(src.rglob('*.java'))
if not files:raise SystemExit('No Java sources')
(build/'sources.list').write_text('\n'.join('"'+str(p)+'"' for p in files),encoding='utf-8')
ET.register_namespace('android','http://schemas.android.com/apk/res/android')
manifest=ET.parse(src/'AndroidManifest.xml')
manifest.getroot().set('package','com.lingqi.game')
manifest.write(build/'AndroidManifest.xml',encoding='utf-8',xml_declaration=True)
PY
"$TASK_TOOLS/aapt2" compile --dir "$TASK_SRC/res" -o "$TASK_BUILD/resources.zip"
"$TASK_TOOLS/aapt2" link -o "$TASK_BUILD/base.apk" -I "$TASK_TOOLS/android.jar" --manifest "$TASK_BUILD/AndroidManifest.xml" --java "$TASK_BUILD/generated" -A "$TASK_BUILD/assets" "$TASK_BUILD/resources.zip" --min-sdk-version 26 --target-sdk-version 35 --version-code 3 --version-name 3.0
"$TASK_JAVA" -jar "$TASK_TOOLS/ecj.jar" -8 -proc:none -nowarn -classpath "$TASK_TOOLS/android.jar" -d "$TASK_BUILD/classes" "@$TASK_BUILD/sources.list"
python3 - "$TASK_BUILD" <<'PY'
import pathlib,sys,zipfile
build=pathlib.Path(sys.argv[1])
with zipfile.ZipFile(build/'classes.jar','w',zipfile.ZIP_DEFLATED) as jar:
 for p in sorted((build/'classes').rglob('*.class')):jar.write(p,p.relative_to(build/'classes').as_posix())
PY
"$TASK_JAVA" -cp "$TASK_TOOLS/lib/d8.jar" com.android.tools.r8.D8 --lib "$TASK_TOOLS/android.jar" --min-api 26 --output "$TASK_BUILD/dex" "$TASK_BUILD/classes.jar"
python3 - "$TASK_BUILD" <<'PY'
import pathlib,shutil,sys,zipfile
build=pathlib.Path(sys.argv[1]);shutil.copyfile(build/'base.apk',build/'unsigned.apk')
dex=sorted((build/'dex').glob('*.dex'))
if not dex:raise SystemExit('D8 did not generate classes.dex')
with zipfile.ZipFile(build/'unsigned.apk','a',zipfile.ZIP_DEFLATED) as apk:
 for p in dex:apk.write(p,p.name)
PY
"$TASK_TOOLS/zipalign" -p -f 4 "$TASK_BUILD/unsigned.apk" "$TASK_BUILD/aligned.apk"
"$TASK_JAVA" -jar "$TASK_TOOLS/lib/apksigner.jar" sign --key "$TASK_SIGN/signing-key.pk8" --cert "$TASK_SIGN/signing-cert.pem" --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true --v4-signing-enabled false --out "$TASK_ROOT/dist/lingqi-game.apk" "$TASK_BUILD/aligned.apk"
"$TASK_TOOLS/zipalign" -c -p 4 "$TASK_ROOT/dist/lingqi-game.apk"
"$TASK_JAVA" -jar "$TASK_TOOLS/lib/apksigner.jar" verify --verbose --print-certs "$TASK_ROOT/dist/lingqi-game.apk" > "$TASK_ROOT/dist/apk-signature.txt"
cat "$TASK_ROOT/dist/apk-signature.txt"
python3 - "$TASK_ROOT/dist/lingqi-game.apk" <<'PY'
import hashlib,pathlib,sys
apk=pathlib.Path(sys.argv[1]);digest=hashlib.sha256(apk.read_bytes()).hexdigest()
apk.with_suffix('.apk.sha256').write_text(digest+'  '+apk.name+'\n')
print('APK:',apk);print('Bytes:',apk.stat().st_size);print('SHA-256:',digest)
PY

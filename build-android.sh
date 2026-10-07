#!/bin/sh
set -eu
TASK_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
TASK_TOOLS="$TASK_ROOT/tools/android"
TASK_JAVA="$TASK_TOOLS/jre/bin/java"
TASK_BUILD="$TASK_ROOT/android/build/manual"
TASK_SIGNED="$TASK_ROOT/android/build/signed.apk"
TASK_SRC="$TASK_ROOT/android/app/src/main"
TASK_SIGN="${LINGQI_SIGNING_DIR:-$TASK_ROOT/tools/signing}"
export LD_LIBRARY_PATH="$TASK_TOOLS/lib64"
for TASK_FILE in "$TASK_JAVA" "$TASK_TOOLS/android.jar" "$TASK_TOOLS/ecj.jar" "$TASK_TOOLS/aapt2" "$TASK_TOOLS/zipalign" "$TASK_TOOLS/lib/d8.jar" "$TASK_TOOLS/lib/apksigner.jar"; do
 if [ ! -f "$TASK_FILE" ]; then echo "Missing tool: $TASK_FILE. Run python3 tools/prepare-tools.py first." >&2; exit 1; fi
done
for TASK_FILE in index.html app.js engine.js data.js core.js economy.js combat.js story.js style.css; do
 if [ ! -s "$TASK_ROOT/web/$TASK_FILE" ]; then echo "Missing game asset: web/$TASK_FILE" >&2; exit 1; fi
done
for TASK_FILE in v3-heroes.png v3-hero-expressions.png v3-forge.png v3-world.png v3-map-atlas-a.png v3-map-atlas-b.png v3-monster-atlas.png v3-boss-atlas.png v3-items-atlas.png v3-skills-atlas.png v3-summon.png v3-shop.png v3-chapter-atlas.png v3-cardback.png; do
 if [ ! -s "$TASK_ROOT/web/assets/$TASK_FILE" ]; then echo "Missing V3 artwork: $TASK_FILE" >&2; exit 1; fi
done
if [ ! -f "$TASK_SIGN/signing-key.pk8" ] || [ ! -f "$TASK_SIGN/signing-cert.pem" ]; then
 echo 'Existing release signing pair missing. Restore the previous private key and certificate; never create a new key for an upgrade.' >&2
 echo 'For a fresh debug build, use Gradle :app:assembleDebug instead.' >&2
 exit 1
fi
mkdir -p "$TASK_BUILD" "$TASK_ROOT/dist"
cleanup() {
 python3 - "$TASK_BUILD" "$TASK_SIGNED" <<'PY'
import pathlib,sys
build=pathlib.Path(sys.argv[1])
for name in ['base.apk','unsigned.apk','aligned.apk']:
 (build/name).unlink(missing_ok=True)
pathlib.Path(sys.argv[2]).unlink(missing_ok=True)
PY
}
trap cleanup EXIT
cleanup
python3 - "$TASK_BUILD" "$TASK_SRC" <<'PY'
import pathlib,shutil,sys,xml.etree.ElementTree as ET
build,src=map(pathlib.Path,sys.argv[1:])
for name in ['classes','dex','generated','assets']:
 path=build/name
 if path.exists():shutil.rmtree(path)
 if name != 'assets':path.mkdir(parents=True)
files=sorted(src.rglob('*.java'))
if not files:raise SystemExit('No Java sources')
(build/'sources.list').write_text('\n'.join('"'+str(p)+'"' for p in files),encoding='utf-8')
ET.register_namespace('android','http://schemas.android.com/apk/res/android')
manifest=ET.parse(src/'AndroidManifest.xml')
manifest.getroot().set('package','com.lingqi.game')
application=manifest.getroot().find('application')
application.set('{http://schemas.android.com/apk/res/android}label','问道·灵契')
manifest.write(build/'AndroidManifest.xml',encoding='utf-8',xml_declaration=True)
PY
"$TASK_TOOLS/aapt2" compile --dir "$TASK_SRC/res" -o "$TASK_BUILD/resources.zip"
"$TASK_TOOLS/aapt2" link -o "$TASK_BUILD/base.apk" -I "$TASK_TOOLS/android.jar" --manifest "$TASK_BUILD/AndroidManifest.xml" --java "$TASK_BUILD/generated" -A "$TASK_ROOT/web" "$TASK_BUILD/resources.zip" --min-sdk-version 26 --target-sdk-version 35 --version-code 5 --version-name 4.1
"$TASK_JAVA" -jar "$TASK_TOOLS/ecj.jar" -8 -proc:none -nowarn -classpath "$TASK_TOOLS/android.jar" -d "$TASK_BUILD/classes" "@$TASK_BUILD/sources.list"
python3 - "$TASK_BUILD" <<'PY'
import pathlib,sys,zipfile
build=pathlib.Path(sys.argv[1])
with zipfile.ZipFile(build/'classes.jar','w',zipfile.ZIP_DEFLATED) as jar:
 for p in sorted((build/'classes').rglob('*.class')):jar.write(p,p.relative_to(build/'classes').as_posix())
PY
"$TASK_JAVA" -cp "$TASK_TOOLS/lib/d8.jar" com.android.tools.r8.D8 --lib "$TASK_TOOLS/android.jar" --min-api 26 --output "$TASK_BUILD/dex" "$TASK_BUILD/classes.jar"
python3 - "$TASK_BUILD" <<'PY'
import pathlib,sys,zipfile
build=pathlib.Path(sys.argv[1])
(build/'base.apk').replace(build/'unsigned.apk')
dex=sorted((build/'dex').glob('*.dex'))
if not dex:raise SystemExit('D8 did not generate classes.dex')
with zipfile.ZipFile(build/'unsigned.apk','a',zipfile.ZIP_DEFLATED) as apk:
 for p in dex:apk.write(p,p.name)
PY
"$TASK_TOOLS/zipalign" -p -f 4 "$TASK_BUILD/unsigned.apk" "$TASK_BUILD/aligned.apk"
python3 - "$TASK_BUILD/unsigned.apk" <<'PY'
import pathlib,sys
pathlib.Path(sys.argv[1]).unlink()
PY
"$TASK_JAVA" -jar "$TASK_TOOLS/lib/apksigner.jar" sign --key "$TASK_SIGN/signing-key.pk8" --cert "$TASK_SIGN/signing-cert.pem" --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true --v4-signing-enabled false --out "$TASK_SIGNED" "$TASK_BUILD/aligned.apk"
"$TASK_TOOLS/zipalign" -c -p 4 "$TASK_SIGNED"
"$TASK_JAVA" -jar "$TASK_TOOLS/lib/apksigner.jar" verify --verbose --print-certs "$TASK_SIGNED" > "$TASK_BUILD/apk-signature.txt"
python3 - "$TASK_BUILD/apk-signature.txt" <<'PY'
import pathlib,re,sys
text=pathlib.Path(sys.argv[1]).read_text()
certs=re.findall(r'certificate SHA-256 digest: ([0-9a-fA-F]+)',text)
expected='7d1e538f15a8f4a12e6f37f8c16d667a0e0e6e17dc27ba7c7f35bee814022512'
if len(certs)!=1 or certs[0].lower()!=expected:raise SystemExit('Signing certificate does not match previous release')
# API26+ uses APK Signature Scheme v2; verify reports v1 as unused.
for version in (2,3):
 if not re.search(r'Verified using v'+str(version)+r' scheme[^\n]*: true',text):raise SystemExit('Required signing scheme missing')
print(text,end='')
PY
python3 "$TASK_ROOT/audit-apk.py" "$TASK_SIGNED" --report "$TASK_BUILD/apk-check.txt" --version-code 5 --version-name 4.1
python3 - "$TASK_SIGNED" "$TASK_ROOT/dist" "$TASK_BUILD" <<'PY'
import hashlib,os,pathlib,sys
signed,dist,build=map(pathlib.Path,sys.argv[1:])
# Replacing the pathname preserves any older delivery APK hard-linked to the old inode.
apk=dist/'lingqi-game.apk'
os.replace(signed,apk)
for name in ['apk-signature.txt','apk-check.txt']:
 os.replace(build/name,dist/name)
digest=hashlib.sha256(apk.read_bytes()).hexdigest()
temporary=dist/'lingqi-game.apk.sha256.tmp'
temporary.write_text(digest+'  '+apk.name+'\n',encoding='utf-8')
os.replace(temporary,dist/'lingqi-game.apk.sha256')
print('APK:',apk.name);print('Bytes:',apk.stat().st_size);print('SHA-256:',digest)
PY

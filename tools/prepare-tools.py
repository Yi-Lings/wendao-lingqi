#!/usr/bin/env python3
"""Minimal Android35 build tools, no system installation."""
import pathlib,shutil,tarfile,urllib.request,xml.etree.ElementTree as ET,zipfile
ROOT=pathlib.Path(__file__).resolve().parent
OUT=ROOT/"android"
OUT.mkdir(parents=True,exist_ok=True)
def log(*a): print(*a,flush=True)
def fetch(url,target):
 log("Downloading",url)
 partial=target.with_name(target.name+".part")
 try:
  with urllib.request.urlopen(urllib.request.Request(url,headers={"User-Agent":"LingqiBuild/1.0"}),timeout=120) as src,open(partial,"wb") as dst:
   total=0
   while True:
    block=src.read(1024*1024)
    if not block: break
    dst.write(block);total+=len(block)
  partial.replace(target);log("Downloaded",total,"bytes")
 finally:
  if partial.exists():partial.unlink()
 return target
def tag(e):return e.tag.rsplit("}",1)[-1]
def child(e,name):return next((i for i in e if tag(i)==name),None)
def archive_url(doc,path):
 package=next(i for i in doc.iter() if tag(i)=="remotePackage" and i.attrib.get("path")==path)
 for archive in child(package,"archives"):
  host=child(archive,"host-os")
  if host is None or host.text=="linux":
   complete=child(archive,"complete")
   if complete is not None:return "https://dl.google.com/android/repository/"+child(complete,"url").text
 raise RuntimeError("No Linux archive for "+path)
def unpack_zip(url,wanted):
 cache=ROOT/"download.zip";found=set()
 try:
  fetch(url,cache)
  with zipfile.ZipFile(cache) as archive:
   for member in archive.infolist():
    leaf=pathlib.PurePosixPath(member.filename).name
    if leaf not in wanted:continue
    dest=OUT/wanted[leaf];dest.parent.mkdir(parents=True,exist_ok=True)
    with archive.open(member) as src,open(dest,"wb") as dst:shutil.copyfileobj(src,dst)
    if leaf in {"aapt2","zipalign"}:dest.chmod(0o755)
    found.add(leaf);log("Extracted",dest,member.file_size)
  missing=set(wanted)-found
  if missing:raise RuntimeError("Missing members "+repr(missing))
 finally:
  if cache.exists():cache.unlink()
members={"aapt2":"aapt2","zipalign":"zipalign","libc++.so":"lib64/libc++.so","d8.jar":"lib/d8.jar","apksigner.jar":"lib/apksigner.jar"}
need_platform=not(OUT/"android.jar").exists()
need_build=any(not(OUT/p).exists() for p in members.values())
if need_platform or need_build:
 with urllib.request.urlopen("https://dl.google.com/android/repository/repository2-1.xml",timeout=30) as response:document=ET.fromstring(response.read())
 if need_platform:unpack_zip(archive_url(document,"platforms;android-35"),{"android.jar":"android.jar"})
 if need_build:unpack_zip(archive_url(document,"build-tools;35.0.0"),members)
if not(OUT/"ecj.jar").exists():fetch("https://repo.maven.apache.org/maven2/org/eclipse/jdt/ecj/3.40.0/ecj-3.40.0.jar",OUT/"ecj.jar")
if not(OUT/"jre/bin/java").exists():
 cache=ROOT/"jre.tar.gz"
 try:
  fetch("https://api.adoptium.net/v3/binary/latest/17/ga/linux/x64/jre/hotspot/normal/eclipse",cache)
  with tarfile.open(cache,"r:gz") as archive:
   top=archive.getmembers()[0].name.split("/")[0];archive.extractall(OUT)
  (OUT/top).rename(OUT/"jre")
 finally:
  if cache.exists():cache.unlink()
log("Ready",OUT);log("Space",shutil.disk_usage("/tmp"))

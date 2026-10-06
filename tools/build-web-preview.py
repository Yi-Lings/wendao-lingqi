#!/usr/bin/env python3
"""Build a standalone, offline preview without changing any game source or media.

Run: python3 tools/build-web-preview.py
PNG and MP3 bytes are embedded verbatim. Shared CSS variables keep each atlas
out of repeated DOM styles, so animated battles do not copy megabytes per frame.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import mimetypes
from pathlib import Path
import re
import zipfile


REPO = Path(__file__).resolve().parents[1]
CSS_URL = re.compile(r"url\(\s*(['\"]?)(assets/[^)'\"\s]+)\1\s*\)")
STYLE_LINK = re.compile(r'<link\s+rel="stylesheet"\s+href="([^"<>]+)"\s*>')
SCRIPT_LINK = re.compile(r'<script\s+src="([^"<>]+)"\s*>\s*</script>')
ICON_LINK = re.compile(r'(<link\s+rel="icon"\s+href=")([^"<>]+)("[^>]*>)')
PREVIEW_EXPRESSION = "const PREVIEW=new URLSearchParams(location.search).get('preview')==='1';"


def sha256(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def js_script(value: str) -> str:
    # Prevent an embedded script from accidentally closing its HTML container.
    return re.sub(r'</script', r'<\/script', value, flags=re.IGNORECASE)


def local_path(web: Path, relative: str) -> Path:
    path = (web / relative).resolve()
    if not path.is_relative_to(web.resolve()) or not path.is_file():
        raise ValueError(f'Unsupported or missing local resource: {relative}')
    return path


def compile_js(name: str, source: str, asset_vars: dict[str, str]) -> tuple[str, dict[str, int]]:
    counts: dict[str, int] = {}

    # All source dynamic art URL forms are deliberately supported explicitly.
    source, counts['template_art'] = re.subn(
        r'url\(assets/\$\{([A-Za-z_$][\w$]*)\.file\}\)',
        lambda m: "${window.WendaoAssetCSS('assets/'+" + m[1] + '.file)}',
        source,
    )
    source, counts['concatenated_art'] = re.subn(
        r"url\(assets/'\+([A-Za-z_$][\w$]*)\.file\+'\)",
        lambda m: "'+window.WendaoAssetCSS('assets/'+" + m[1] + ".file)+'",
        source,
    )

    def static_art(match: re.Match[str]) -> str:
        path = match[2]
        if path not in asset_vars:
            raise ValueError(f'{name}: missing static image {path}')
        return f'var({asset_vars[path]})'

    source, counts['static_art'] = CSS_URL.subn(static_art, source)
    if name == 'audio.js':
        needle = "new root.Audio('assets/audio/' + file)"
        if source.count(needle) != 1:
            raise ValueError('Audio constructor changed; review embedded source adaptation')
        source = source.replace(needle, "new root.Audio(root.WendaoAssetURLs('assets/audio/' + file))", 1)
        counts['audio_constructor'] = 1
    if name == 'app.js':
        if source.count(PREVIEW_EXPRESSION) != 1:
            raise ValueError('Preview gate changed; review isolated preview adaptation')
        source = source.replace(PREVIEW_EXPRESSION, 'const PREVIEW=true;', 1)
        counts['isolated_preview_gate'] = 1
    if re.search(r'url\(\s*[\'\"]?assets/', source):
        raise ValueError(f'{name}: an unadapted art URL remains')
    return source, counts


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--web-dir', type=Path, default=REPO / 'web')
    parser.add_argument('--output', type=Path, default=REPO / 'dist/wendao-lingqi-preview.html')
    parser.add_argument('--zip', action='store_true', help='Also create a smaller download ZIP containing the standalone HTML and instructions.')
    args = parser.parse_args()
    web, output = args.web_dir.resolve(), args.output.resolve()
    if not (web / 'preview.js').is_file():
        raise SystemExit('Missing web/preview.js; complete the isolated preview before packaging.')

    raw_index = local_path(web, 'index.html').read_bytes()
    index = raw_index.decode('utf-8')
    styles = STYLE_LINK.findall(index)
    scripts = SCRIPT_LINK.findall(index)
    if not styles or scripts[-1:] != ['app.js'] or 'preview.js' not in scripts:
        raise ValueError('Unexpected entry-point order; review before building.')
    sources = {name: local_path(web, name).read_bytes() for name in styles + scripts}
    embedded: dict[str, str] = {}
    assets: dict[str, dict[str, str | int]] = {}
    files = [web / 'icon.svg', *sorted((web / 'assets').rglob('*'))]
    for path in files:
        if not path.is_file():
            continue
        relative = path.relative_to(web).as_posix()
        raw = path.read_bytes()
        mime = mimetypes.guess_type(relative)[0] or 'application/octet-stream'
        embedded[relative] = f'data:{mime};base64,{base64.b64encode(raw).decode("ascii")}'
        assets[relative] = {'bytes': len(raw), 'sha256': sha256(raw), 'mime': mime}

    asset_vars = {path: f'--wendao-embedded-image-{i}' for i, path in enumerate(embedded)
                  if assets[path]['mime'].startswith('image/')}
    # Keep original data URIs once in the file. Browsers limit custom-property
    # values to about 1 MiB, so materialize large images as in-memory Blob URLs.
    # Audio can use its smaller data URI directly. Neither path uses the network.
    bootstrap = """(() => {
 'use strict';
 const assets=Object.freeze(ASSET_JSON),cssNames=Object.freeze(CSS_NAMES_JSON),imageURLs={};
 window.WendaoEmbeddedAssets=assets;
 window.WendaoAssetURLs=path=>{const value=assets[path];if(!value)throw Error('试玩资源缺失：'+path);return value;};
 window.WendaoAssetCSS=path=>{const name=cssNames[path];if(!name)throw Error('试玩图集缺失：'+path);return 'var('+name+')';};
 for(const [path,name] of Object.entries(cssNames)){
  const data=assets[path],comma=data.indexOf(','),mime=data.slice(5,data.indexOf(';')),raw=atob(data.slice(comma+1)),bytes=new Uint8Array(raw.length);
  for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
  const url=URL.createObjectURL(new Blob([bytes],{type:mime}));imageURLs[path]=url;
  document.documentElement.style.setProperty(name,'url("'+url+'")');
 }
 window.WendaoEmbeddedImageURLs=Object.freeze(imageURLs);
 window.WendaoStandalonePreview=Object.freeze({offline:true,assets:Object.keys(assets).length,saveKey:'lingqi-preview-save-v1'});
})();""".replace('ASSET_JSON', json.dumps(embedded, ensure_ascii=False, separators=(',', ':'))).replace(
        'CSS_NAMES_JSON', json.dumps(asset_vars, separators=(',', ':')))
    index = index.replace('</title>', '</title>\n<script id="wendao-embedded-assets">' + js_script(bootstrap) + '</script>', 1)

    def compile_css(match: re.Match[str]) -> str:
        name = match[1]

        def replace_url(url: re.Match[str]) -> str:
            if url[2] not in asset_vars:
                raise ValueError(f'{name}: missing CSS image {url[2]}')
            return f'var({asset_vars[url[2]]})'

        css = CSS_URL.sub(replace_url, sources[name].decode('utf-8'))
        if '</style' in css.lower():
            raise ValueError(f'{name}: HTML style terminator must be reviewed')
        return f'<style data-source="{name}">\n{css}\n</style>'

    index = STYLE_LINK.sub(compile_css, index)
    adaptations: dict[str, dict[str, int]] = {}

    def compile_script(match: re.Match[str]) -> str:
        name = match[1]
        code, adaptations[name] = compile_js(name, sources[name].decode('utf-8'), asset_vars)
        return f'<script data-source="{name}">\n{js_script(code)}\n</script>'

    index = SCRIPT_LINK.sub(compile_script, index)
    index = ICON_LINK.sub(lambda m: m[1] + embedded[m[2]] + m[3], index)
    if re.search(r'<(?:script|link)\b[^>]+(?:src|href)="(?!data:)', index):
        raise ValueError('An external script/style/icon link remains in the package')
    final = index.encode('utf-8')
    output.parent.mkdir(parents=True, exist_ok=True)
    temp = output.with_suffix(output.suffix + '.tmp')
    temp.write_bytes(final)
    temp.replace(output)
    report = {
        'output': output.name,
        'bytes': len(final),
        'sha256': sha256(final),
        'preview': True,
        'saveKey': 'lingqi-preview-save-v1',
        'offline': True,
        'assetEncoding': 'Unmodified source bytes as base64 data URIs. Images become in-memory Blob URLs, avoiding browser CSS variable size limits; no auxiliary files or network requests.',
        'assets': assets,
        'sources': {'index.html': sha256(raw_index), **{name: sha256(raw) for name, raw in sources.items()}},
        'scriptAdaptations': adaptations,
    }
    if args.zip:
        zip_path = output.with_suffix('.zip')
        instructions = ('问道 · 灵契 — 离线试玩\n\n'
                        '解压后，用 Chrome、Edge 或其他现代浏览器打开 wendao-lingqi-preview.html。\n'
                        '所有图片、音乐和音效已经放在 HTML 内，不需要联网、安装软件或运行命令。\n'
                        '首次进入需确认年龄；点击按钮后音乐才开始播放，声音可在设置里调整。\n'
                        '试玩使用单独存档，预置材料和已开放内容方便体验，不代表正式流程的自然进度。\n'
                        '十连感应可体验独立红色道品动画；角色页面可点图片装配，长按或点详情查看说明。\n'
                        '本次交付为网页试玩，没有生成 Android 安装包。\n')
        with zipfile.ZipFile(zip_path, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
            for name, raw in [(output.name, final), ('试玩说明.txt', instructions.encode('utf-8'))]:
                info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
                info.compress_type = zipfile.ZIP_DEFLATED
                info.external_attr = 0o644 << 16
                archive.writestr(info, raw, compress_type=zipfile.ZIP_DEFLATED, compresslevel=6)
        zipped = zip_path.read_bytes()
        report['downloadZip'] = {'file': zip_path.name, 'bytes': len(zipped), 'sha256': sha256(zipped)}
    report_path = output.with_suffix('.manifest.json')
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'output': str(output), 'bytes': len(final), 'sha256': report['sha256'],
                      'embeddedAssets': len(assets), 'manifest': str(report_path),
                      'downloadZip': report.get('downloadZip')}, ensure_ascii=False))


if __name__ == '__main__':
    main()

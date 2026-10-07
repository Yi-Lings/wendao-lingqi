# 当前体验交付与历史包

当前版本为 [V4.1 对齐修正版](https://github.com/Yi-Lings/wendao-lingqi/releases/tag/v4.1.0-preview)。直接下载完整 [APK](https://github.com/Yi-Lings/wendao-lingqi/releases/download/v4.1.0-preview/wendao-lingqi-v4-1-preview.apk) 或 [离线网页ZIP](https://github.com/Yi-Lings/wendao-lingqi/releases/download/v4.1.0-preview/wendao-lingqi-preview.zip)，无需下载分片。全部代码与资源在 [work分支](https://github.com/Yi-Lings/wendao-lingqi/tree/work)。

体验包 `com.lingqi.game.preview`，版本4.1/code5，最低Android8.0。同本环境V4体验签名，可更新V4体验安装；与旧个人签名 `com.lingqi.game` 独立，旧角色可导出JSON再导入。本环境未有Android设备，真机文件选择器与稳定性仍待验证。

仓库的 `parts-v4-1/` 保存本地实测APK的24MiB分片；完整SHA、每片SHA、公开证书指纹与冻结源码 `sourceCommit/buildInputs` 均在manifest。不保存签名私钥。离线重组：

```sh
python3 tools/check-artifact-sources.py --manifest releases/parts-v4-1/manifest.json
python3 tools/assemble-apk.py --parts releases/parts-v4-1 --output dist/wendao-lingqi-v4-1-preview.apk --checksum releases/wendao-lingqi-v4-1-preview.apk.sha256
```

发布前同时检查原生Java、Gradle配置和所有网页资源来自声明的源码提交；纯文档的后续提交允许通过。编译DEX中导出必须只保留独立快照，不能调用正式存档写入。

历史 [V4.0飞升体验版](https://github.com/Yi-Lings/wendao-lingqi/releases/tag/v4.0.0-preview) 和 [V3.0个人签名版](https://github.com/Yi-Lings/wendao-lingqi/releases/tag/v3.0.0) 及其分片保留。默认 `python3 tools/assemble-apk.py` 仍重组历史V3，不代表当前版本。

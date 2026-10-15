# V4.2 当前交付

最新版本为 `v4.2.0-preview`，包含 APK、离线网页 ZIP、完整源码 ZIP 及各自 SHA-256。对应发布使用 `.github/workflows/publish-preview.yml`，与下方历史 V4.1/V4/V3 流程分开。

当前环境的 GitHub API 与 Git 推送可用，`uploads.github.com` 直传被上传接口的认证限制拒绝，因此使用 Actions 上传附件。`parts-v42` 保存已通过本地测试的 APK 分片；manifest 声明全部冻结 Web/Android 输入、原始源码提交、每片/完整文件散列及证书。Actions 先核对来源、重组同一 APK、审计版本/资源/签名，重新生成并匹配离线 HTML 与 ZIP，最后生成完整源码快照并发布；不在 Actions 替换体验证书。

`v42-artifact-manifest.json` 声明本地已验收 APK/HTML/ZIP 的大小与 SHA-256。完整源码快照排除所有历史 APK/分片，仅保留发布清单及说明。用户无需处理分片，直接使用 Release 附件。

## 历史发布记录

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

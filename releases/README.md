# Android 个人发布包

[直接下载问道·灵契 V3.0 APK](https://github.com/Yi-Lings/wendao-lingqi/releases/download/v3.0.0/wendao-lingqi-v3.apk)

最低 Android8.0，保留原个人签名。下载后对照 `wendao-lingqi-v3.apk.sha256` 校验。当前尚未进行安卓真机验证，覆盖旧版前建议先导出存档。

仓库中的 `parts/` 用于绕过上传接口的单次请求大小限制。GitHub工作流逐片检查SHA-256，合并并验证完整APK后上传Release；用户直接下载完整文件即可。

离线也可自行合并：

```sh
python3 tools/assemble-apk.py
```

输出为 `dist/wendao-lingqi-v3.apk`。脚本只在全部分片和最终摘要通过后替换输出文件。发布私钥不在仓库或工作流中。

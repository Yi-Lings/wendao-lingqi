# 问道灵契 Android V4

包名 `com.lingqi.game`，versionCode 4、versionName 4.0，最低 Android 8.0（API 26），目标与编译 API 35。原生 Java Activity 加载 APK 内的 Web 游戏，不请求网络、共享存储或账户权限。卸载、清除应用数据会删除进度，请先导出 JSON。

## 标准 Gradle 构建

准备 Java 17、Gradle 8.9、Android SDK platform 35 和 build-tools 35.0.0：

```sh
node --test tests/v3*.cjs
gradle --no-daemon -p android :app:assembleDebug
```

Android Gradle Plugin 固定为 8.7.3。Web 资源直接从 `web/` 打包，无需 npm 安装。本轮debug体验包使用独立包名 `com.lingqi.game.preview` 和应用名「问道·灵契·体验」，可以与旧 `com.lingqi.game` 发布版并排安装；原发布私钥在本环境缺失，不宣称能够覆盖升级。Debug APK 在 `android/app/build/outputs/apk/debug/app-debug.apk`，使用本机生成的调试签名。Gradle release 默认不签名，禁止把私钥加入工程。

`.github/workflows/android.yml` 在 push、pull request 或手动触发时运行逻辑测试并生成 debug APK；工作流不使用发布私钥。V4 debug 包使用独立包名，可以保留旧版并排安装。

## 保持旧签名的个人发布包

恢复旧发布私钥及完整精简工具链后可使用：

```sh
python3 tools/prepare-tools.py
sh build-android.sh
```

个人发布包输出为 `dist/lingqi-game.apk`、SHA-256 与签名校验记录。工具准备脚本的下载策略见脚本本身；标准 CI 采用上述明确的编译版本。

`build-android.sh` 只读取已有 `tools/signing/signing-key.pk8` 与 `signing-cert.pem`，缺失时停止，不自动创建新密钥。可通过 `LINGQI_SIGNING_DIR` 指向独立私有目录。必须使用与旧 APK 相同的私钥才能保留进度覆盖安装。

`tools/signing/`、工具链二进制、构建缓存、个人存档不应进入 GitHub。单独安全备份原签名，源码包与仓库均不包含私钥。

## 原生接口与保存规则

- `Native.persistSave(json)`：同步返回 boolean；1 MiB 上限、基础结构校验，内部使用 Android AtomicFile 写入。
- `Native.loadSave()`：返回大小受限的原始文本；无档时返回空串。损坏 JSON 保留原文并交网页恢复，已有文件读取失败时返回恢复标记，避免自动新档覆盖。网页仍须完整校验。
- `Native.maxSaveBytes()`：返回 1,048,576。
- `Native.exportSave(json)`：先保存有效快照，然后使用系统文件选择器导出。
- `Native.exportRecovery(text)`：使用系统文件选择器导出恢复原文为 TXT，不将损坏数据写回正式存档。
- `Native.importSave()`：读取用户所选 content URI，不直接覆盖当前档；通过 `window.onNativeImport(json)` 交给游戏完整校验后提交。
- `window.onNativeMessage(message)`：显示文件操作结果。
- `window.onNativeBack()`：返回 true 时由网页处理，否则原生确认退出。
- `window.onNativeLifecycle('pause'|'resume')`：游戏停止前台战斗计时并保存；恢复时处理离线资源，战斗不在后台推进。

原生基础校验接受 V1/V2/V3，严格 UTF-8、BOM 兼容，并要求游戏关键对象。完整数值、UID、功法与进度合法性由游戏校验器负责。网页成功提交必须先完成存储；动画不能先消耗或发奖励。

内部 AtomicFile 可以恢复未完成的写入。导出到用户选择的云盘或文件提供器受该提供器能力约束，不能声称外部文档也具有原子写保证。

## WebView 边界

只允许 `file:///android_asset/` 子资源和入口页/页内锚点；拒绝外部导航、目录穿越、content URI 和其他请求。关闭通用文件访问、多窗口、地理位置与调试，禁止混合内容。包不声明 INTERNET 权限。只有应用内资源可以调用固定 SaveBridge 方法。

系统栏与刘海通过 Insets 处理，返回键与 Android 13+ 返回手势采用相同逻辑。WebView 渲染进程丢失时提示重启，已经提交的内部存档保留。

## 验证边界

历史原生源码已用 ECJ/API35 编译通过，本轮采用 Gradle/JDK17/API35。当前连接的是 Linux VPS，没有 adb、Android 设备或模拟器，因此没有真机验证。V4最终构建、签名、浏览器与逻辑测试记录见 `../docs/validation/V4_ASCENSION_APK_2026-10-07.md`；它们不能替代 Android 文件选择器、系统返回、进程恢复和 30 分钟持续运行测试。


## V4 本轮构建验证

恢复后的现有Gradle8.9/JDK17/API35工具链无需下载即可使用；2026-10-07离线Gradle任务配置检查成功。最终 `assembleDebug` 在游戏、飞升、音画资源全部冻结与测试后执行，具体APK大小、SHA、证书与资源审计以本轮验证文档为准。旧精简工具链接不完整，不能把 `aapt2` 单独存在当作release工具或旧私钥齐全。

体验包设置提供「正式仙途」「人界配装试玩」「天门飞升试玩」。三个存档隔离，后两者明示资源/修为夹具，不能声称试玩种子是自然取得的进度。旧发布版导出的JSON可在体验包导入以延续旧角色。

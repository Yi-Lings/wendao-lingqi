# V4.8 验证记录

环境：Windows 11，Node 24.15.0，Python 3（仅用于本地静态服务）。浏览器检查用本机 Microsoft Edge，经 `qa-tools/node_modules/playwright` 驱动（`LINGQI_CHROMIUM` 指向 `msedge.exe`），**不是**项目 CI 使用的 Chromium headless shell。

## 逻辑测试

```
node tests/run-v3.cjs
tests 476 · pass 475 · fail 0 · skipped 1
```

跳过的 1 项是 `v3-artifact-provenance.cjs` 的符号链接用例：Windows 非管理员令牌无法创建符号链接（`EPERM`）。本轮改为明确 `t.skip` 并打印原因，没有把它算作通过。

新增用例：

- `tests/v3-combat-feedback.cjs`（10 项）：飘字翻译、事件上限、连击档位、真实战斗事件合法性、指标累计与存档往返、DOT 不计最高单击、击杀只计一次、旧档兼容、非法反馈拒绝、反馈不影响奖励。
- `tests/v3-settlement-juice.cjs`（2 项）：稀有战利品单独节拍，普通战利品不受影响，渲染不改动奖励数据。

## 浏览器检查

既有套件（源页面，共 234 项）全部通过：

| 套件 | 通过 |
| --- | --- |
| browser-v3 | 32 |
| browser-v31 | 15 |
| browser-v32 | 13 |
| browser-v43 | 14 |
| browser-v44 | 18 |
| browser-v45 | 27 |
| browser-v46 | 22 |
| browser-v47 | 16 |
| browser-equipment-builds | 22 |
| browser-activity-named-art | 32 |
| browser-story-ritual | 10 |
| browser-ascension | 4 |
| browser-v4-integrity | 9 |

本轮新增 `tests/browser-v48-feedback.cjs`：真实开战后确认飘字出现、受击闪白、连击徽标、敌人卡片暴露序号、暂停后飘字自行清理、无页面错误。实测输出：

```json
{"sawFloat":true,"sawHurt":true,"sawCombo":true,"sawEnemyIndex":true,
 "leftover":0,"errors":[],
 "perf":{"damageDealt":128.62,"maxHit":52,"crits":1,"kills":0,"damageTaken":8.4}}
```

**未运行**：离线 file:// 的 11 项（`browser-v42-offline.cjs` / `browser-preview-file.cjs`）。它们需要先用 `tools/build-web-preview.py` 构建单文件 HTML，本轮没有构建，因此这 11 项没有结论。

## 截图

- [v48-combat-fx-live.png](v48-combat-fx-live.png)：战斗中飘字（`-38`）覆盖目标卡片，深色描边保证在亮色美术上可读。
- [v48-combat-fx.png](v48-combat-fx.png)：暂停后的连击徽标（`3 连击`）与飘字清理结果。

## 离线单文件网页试玩

```
python tools/build-web-preview.py --output dist/wendao-lingqi-v4.8-preview.html --zip
```

| 产物 | 字节 | SHA-256 |
| --- | --- | --- |
| `wendao-lingqi-v4.8-preview.html` | 231,052,349 | `3706d81d04ce42136caa98cddb71081d875a6cdbe1f5fbbf4b0cf5120f939459` |
| `wendao-lingqi-v4.8-preview.zip` | 172,980,158 | `1e4c9018021f13a42917b838ee3abc180145d0cff79e45fd0cb340c3359d283d` |

77 项资源全部内嵌，打开后不访问网络。`tests/browser-v42-offline.cjs` 以真实 `file://` 载入该产物：

```
11 项全部通过 · pageErrors 0 · consoleErrors 0 · externalRequests 0
```

连续运行三次均为 11/11，用于确认结果稳定。

### 本轮修掉的测试竞态

`browser-v42-offline.cjs` 的「挑战锁定与战报重试」原先要求点击重试后**整个存档逐字段相等**。后台每 250ms 的被动结算会推进 `carryMs` / `productionCarryMs` / `wisdomCarryMs` / `sweepMs`，于是这项断言变成与墙上时钟赛跑：CI 的 headless shell 够快，同一秒内完成；在本机用 Edge 打开 220MB 单文件时跨过了 1 秒边界，实测差异恰好是三个字段各 +1000ms。

修法不是放宽断言，而是让它确定：快照前把 `Date.now` 冻结为固定值，被动结算因 `now <= lastAt` 直接返回，两次快照之间不可能再发生推进；比较时同时剔除时钟簿记字段。资源、进度、战报、战斗状态仍逐字段严格比较。冻结在断言后恢复。

## 源码包

```
python tools/package-source.py
```

`wendao-lingqi-v4.8.0-source.zip`：1,583 个文件，475,046,525 字节，SHA-256 `d0c735069a75433fa44f7201e979ef81626c0a209f09f955d75cee2df6011e0f`。

## 没有覆盖的

Android 真机、模拟器、系统文件选择器、返回手势、长时间运行；真人爽感强度与长期经济平衡；会心音效（本轮未实现）。浏览器与逻辑通过只说明行为符合规则。

## Android 构建：debug 包已打通，正式签名包待私钥

最初的判断是「这台机器编不出来」，**后续研究推翻了这个结论**：缺的不是能力，是两条可绕开的依赖路径。

### 绕开方式

| 阻塞 | 实测状态 | 绕法 |
| --- | --- | --- |
| `maven.google.com`（AGP 8.7.3 及依赖） | 443 不可达 | `--init-script` 把 `pluginManagement` 与 `dependencyResolutionManagement` 的仓库清空后指向 `maven.aliyun.com/repository/{google,central,gradle-plugin}` |
| `dl.google.com`（SDK platform 35） | 443 不可达 | `SDK_TEST_BASE_URL=https://mirrors.cloud.tencent.com/AndroidSDK/` 让 `sdkmanager` 从腾讯镜像安装 `platforms;android-35` |
| Gradle 8.9 未安装 | `~/.gradle` 为空，无 wrapper | 从 `mirrors.cloud.tencent.com/gradle/gradle-8.9-bin.zip` 下载（实测 19 MB/s） |

JDK 用 Android Studio 自带的 JBR 21。AGP 8.7.3 与 Gradle 8.9 在 JDK 21 下正常。

### 复现

```powershell
$env:JAVA_HOME='E:\Android\Android Studio\jbr'
$env:ANDROID_HOME='E:\Android\Sdk'
gradle --no-daemon --init-script <aliyun-mirrors.gradle> -p android :app:assembleDebug
```

`local.properties` 写 `sdk.dir`。init 脚本只在本机使用，不进入仓库。

### 结果

```
BUILD SUCCESSFUL in 30s
android/app/build/outputs/apk/debug/app-debug.apk
172,883,380 字节 · SHA-256 85c5759d1873e8dfbfdfa38519ea2192d0aa7e380bfbde4a268e2ecbdff53f6b
```

`audit-apk.py --variant debug --package-id com.lingqi.game.preview --version-code 12 --version-name 4.8` 全部通过：

- `package name='com.lingqi.game.preview' versionCode='12' versionName='4.8' compileSdkVersion='35'`
- `minSdkVersion:'26'` · `targetSdkVersion:'35'` · `application-label:'问道·灵契·体验'`
- `launchable-activity: com.lingqi.game.MainActivity`
- **132 个打包资源与源码逐字节一致**，42 张美术、16 段音频、36 个模块（含新增的 `combat-fx.js`）
- `classes.dex` + `classes2.dex`，ZIP CRC 通过

`apksigner verify`：v2 方案通过，签名者 `CN=Android Debug`。

### 这份 debug 包不能当体验版发布

它与既有体验包**签名不同**，无法覆盖升级已安装的 `com.lingqi.game.preview`（需先卸载）。项目规则明确不交付不同签名的重编包，因此它只作本地验证产物，不进 Release。

### 正式签名包还差什么

只差原私钥的两个文件：`signing-key.pk8` 与 `signing-cert.pem`（可放 `tools/signing/`，或用 `LINGQI_SIGNING_DIR` 指向别处）。拿到后即可 `:app:assembleRelease` 出未签名 APK，再用同一套 `zipalign` + `apksigner` 签名，得到可覆盖升级的正式体验包。

### 顺带修掉的构建链缺陷

`audit-apk.py` 有两处只在 Linux 上成立的写法，在 Windows 上必然失败：

1. 找的是 `aapt2`，而 Windows build-tools 提供 `aapt2.exe`，于是报「aapt2 missing」并建议去准备 SDK——明明 SDK 是完整的。
2. `subprocess.run(..., text=True)` 未指定编码，中文 Windows 默认用 GBK 解码 aapt2 的 UTF-8 输出，抛 `UnicodeDecodeError` 后 `stdout` 变成 `None`，后续断言报 `argument of type 'NoneType' is not iterable`。

两处都已修，并补上 `combat-fx.js` 到必需模块清单。

因此 V4.8 的 APK 需要在具备完整工具链与私钥的环境构建，例如本机已安装的 Android Studio 配合原签名。


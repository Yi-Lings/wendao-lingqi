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

**APK 本轮没有构建**，原因见下。

## 为什么这里构建不了 APK

两条独立的硬阻塞，均已实测：

1. **没有体验签名**。`tools/signing/` 不存在，全机只找到标准的 `~/.android/debug.keystore`。`build-android.sh` 的规则是缺少 `signing-key.pk8` 与 `signing-cert.pem` 时停止，不创建新密钥；项目也明确不交付不同签名的重编包。
2. **构建依赖不可达**。`dl.google.com`（SDK platform 35）与 `maven.google.com`（AGP 8.7.3 及其依赖）的 443 端口连接失败；本机 `~/.gradle` 为空，SDK 只装了 `platforms/android-36`，与项目声明的 `compileSdk 35` 不符。`repo.maven.apache.org` 与 `services.gradle.org` 虽可达，但缺了 Google 的两个源仍然无法解析 AGP。

因此 V4.8 的 APK 需要在具备完整工具链与私钥的环境构建，例如本机已安装的 Android Studio 配合原签名。


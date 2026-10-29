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

## 没有覆盖的

Android 真机、模拟器、系统文件选择器、返回手势、长时间运行；真人爽感强度与长期经济平衡；会心音效（本轮未实现）。浏览器与逻辑通过只说明行为符合规则。

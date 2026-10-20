# V4.6 验证与评审证据

2026-10-20。431 项逻辑、227 项浏览器检查通过（218 源页面＋9 实际 file://）；209 张截图包含 8 张 V4.5 基线和 1 张十八事件联系表。新增 9 个原始 PNG（24 幅插画），原 65 个 PNG/MP3 保留字节。Android 4.6/code10 编译、原体验签名与对齐通过；128 个 APK 内资源匹配源码，138 项构建输入绑定提交 `773af0e0f3a428af7f0576b2638825ac48576964`。尚无 Android 真机结果。

- [项目详细自评与十二项意见](../../review/PROJECT_REVIEW_V4_6.md)
- [改进方案、机制与兼容](../../ITERATION_V4_6.md)
- [本轮美术方向与接线](../../art/V4_6_ART_DIRECTION.md)
- [尺寸、字节、散列](../../art/V4_6_GENERATED_ASSETS.json) / [完整生图提示](../../art/V4_6_GENERATION_RECORDS.json)
- [机器汇总与 209 张截图散列](summary.json)
- [431 项逻辑日志](node.log) / [四条合法公共行动路线](playthrough.json)
- [本轮 22 项界面专项](browser-v46.json) / [实际离线文件](browser-offline.json)
- [APK 审计](apk-v46-check.txt) / [签名](apk-signature.txt) / [冻结输入](source-input-check.log)
- [手工脚本语法与实际版本解析](manual-version-check.json)

## 回归运行说明

所有十三份最终浏览器报告均通过。本轮使用一次全量初跑，随后定点复测飞升与完整性套件：新增批量按钮后，两条旧用例原来的无条件选择器点到了批量静修，现明确选择 count:1，保留单轮费用断言，另由新专项验证批量费用。为避免重复执行已经通过的其余套件，完成定点复测后汇总全部最终报告。

- [全量初跑原始日志（含当时断言失败）](browser-full-initial.log)
- [飞升流程修正后复测](browser-ascension-recheck.log)
- [完整性套件最终复测](browser-integrity-final.log)
- [最终飞升报告](browser-ascension.json) / [最终完整性报告](browser-integrity.json)

正常场景无未捕获脚本、控制台或资源请求失败。完整性套件主动注入的一次提交后展示故障单列为预期，不混入正常场景。新界面除只读新档入口外使用明确的境界、资源和故事进度夹具；独立四条合法引擎路线从普通新档行动，以加速资源等待覆盖全部人界与仙界节点。加速等待不代表自然耗时或长期平衡。

## 实际画面

| 雾桥借火 | 所选道路复核 | 同行录 |
| --- | --- | --- |
| ![事件专属画面](screenshots/v46-encounter-bridge_lantern.png) | ![路线与实际费用](screenshots/v46-choice-review.png) | ![月衡灯下验药](screenshots/v46-record-390x844.png) |

![十八段历世实际界面联系表](screenshots/v46-encounter-contact.png)

![短横屏仙修与独立滚动面板](screenshots/v46-celestial-844x390.png)

![新目录直达](screenshots/v46-art-directory.png)

main/work Android CI 均成功：[main](https://github.com/Yi-Lings/wendao-lingqi/actions/runs/39383140162) / [work](https://github.com/Yi-Lings/wendao-lingqi/actions/runs/39383140218)。

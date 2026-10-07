# V4 存档、结算与音频修复回归

2026-10-07 07:38:58–07:39:13 UTC，对本轮实际源应用运行 `node tests/browser-v4-integrity.cjs`。**9/9 案例通过，正常流程 0 个 page error、0 个 console error、0 个坏响应和失败请求。** 保存后故障注入产生且只产生 1 条预期 console error，独立记录，不混入“正常流程零错误”的结论。

新增的可重复检查为 [tests/browser-v4-integrity.cjs](../../../tests/browser-v4-integrity.cjs)。原版问题/工件审计保留在 [INTEGRITY.md](INTEGRITY.md)；本报告验证修复后的源码行为，不改写原版缺陷证据，也不声称旧公开 APK 已更新。

## 已实际验证的修复

| 对应原问题 | 修复后实际证据 | 结果 |
| --- | --- | --- |
| I-01：试玩导出污染正式原生槽 | 原生 Java `startExport` 现在只 `preserveExport`；mock 用同样的快照导出约定。在 `?preview=1` 和 `?preview=1&immortal=1` 中，通过设置实际切换、导出、取消、返回 `?preview=0`。两次导出均有完整试玩快照，正式 Native 与正式 localStorage 原文未变，另一试玩槽也未变。返回正式实际载入原道号“正式仙途完整性回归”。 | **通过：Java 源检查 + 真实 JS 流程/Native mock** |
| I-02：保存后展示异常撤回内存 | 真正打造紫装，使 UID 与随机流均变化；在保存后的只读活动 model 中注入异常。返回 `ok:true,presentationFailed:true`、提示“操作与所得已保存”，内存/Native/localStorage 与相同公开引擎动作预测的状态完全相同。第一件 `g43` 保留，后续正常打造产生 `g44`，没有重复 UID 或覆盖第一件。 | **通过：提交边界故障回归** |
| I-03：天道尘随机所得无反馈 | 点击真实兑换按钮，120 尘换橙装 `g43`，显示“天品·玄武·天灵宝冠 3阶”；150 尘换橙灵宝 `t8`，显示“雷池令”。卡片 UID/ID、数量、详情入口均与实际到账相同；展开消耗能看到对应天道尘支出。关闭回“天道尘兑换”，再次关闭仍无奖励或费用变化。 | **通过：两种真实随机所得与来源恢复** |
| I-04：仙界晋层只 toast | 飞升一层合法场景 fixture 中，点击静修三次，共投入真实成本，获得 660 仙修、24 仙元；再点晋层，实际进入登仙 2 层，剩余仙修+储备 180。结果标题与内容为新层，未虚构新增仙元/修为或第二次材料投入。实力由 482510 提升为 491616，内存与两个存档一致，关闭不再发奖。 | **通过：实际成长与正确结果语义** |
| I-05：进入仙界音乐延迟 | 对真实 `ascension-open` 玩家按钮调用其 click handler，在同一个 JS 调用内检查 scene，立即为 `ascension`。使用真实 HTMLAudio 解码/播放，媒体时钟从 0.168504s 到 0.518143s，推进 0.349639s；淡入后仅有 ascension 一条循环。Native pause 后音乐/效果全停，resume 恢复。 | **通过：即时映射、真实媒体时钟与后台停止** |

三模式检查正确保留了正式页离开时的两个 Native 保存调用，它们的 query 仍为 `?preview=0`，并未把这些正常生命周期提交误判为试玩写入。实际试玩期间的 Native 操作只有 `export`、模拟系统取消；没有正式槽 load/persist。

独立的保存失败检查也通过：真实十抽执行后 `persistSave` 返回 false，整个状态对象精确恢复，两个持久化槽原文不变；券、灵玉、尘、装备/灵宝/功法/丹药/材料、保底、随机流、nextUid 与 revision 均未留下变化，不出现未保存的抽取/红卡/结算演出。

## 测试方法与证据

- 使用当前 `http://127.0.0.1:8787/` 真实 source 应用，**没有将脚本替换成旧验收版本**，没有伪造 UI 结算或音频节点。
- 资源/进度采用公开人界试玩 fixture；仙界 fixture 通过 `terminalFixture → toReady → completeAscension` 的公开动作建立阶段，其天门胜利来自实际引擎模拟。富材料和属性只帮助定位 UI/事务阶段，不代表自然成长节奏。
- 固定 `Date.now` 以消除被动结算对存档比较的干扰；`performance` 和 HTMLMediaElement 时钟保持真实。音频必须有真正推进的媒体时钟，不能只用 diagnostics 或 `play()` 成功当播放证明。
- Native mock 使用独立正式槽与导出快照槽；取消 helper 模拟 Android 取消结果，不声称增加了正式 Native API。系统文件选择器、进程恢复和磁盘 AtomicFile 仍需实际 Android 验证。
- 提交后异常使用标记 `LINGQI_QA_EXPECTED_POSTCOMMIT_MODEL_FAILURE`。恰好一条对应 console error 为预期；其它 console error、page error、HTTP 错误或请求失败均会使套件失败。
- 测试进程返回 **exit 0**。未重复原版 297 项逻辑全量回归；统一逻辑回归由本轮总验证负责。

完整日志：[browser-v4-integrity.log](evidence/browser-v4-integrity.log)。结构化结果、源文件摘要与每案详情：[browser-v4-integrity.json](evidence/browser-v4-integrity.json)。

截图已保存并抽查橙装实际结算和登仙二层结果：

| 画面 | 文件 |
| --- | --- |
| 人界试玩取消导出 | [integrity-human-export-canceled.png](evidence/integrity-human-export-canceled.png) |
| 天门试玩取消导出 | [integrity-immortal-export-canceled.png](evidence/integrity-immortal-export-canceled.png) |
| 提交后展示错误仍保存所得 | [integrity-postcommit-saved-fallback.png](evidence/integrity-postcommit-saved-fallback.png) |
| 橙装实际物品与费用 | [integrity-orangeGear-actual-settlement.png](evidence/integrity-orangeGear-actual-settlement.png) |
| 橙灵宝实际物品与费用 | [integrity-orangeTreasure-actual-settlement.png](evidence/integrity-orangeTreasure-actual-settlement.png) |
| 仙修晋层真实结果 | [integrity-celestial-layer2-saved.png](evidence/integrity-celestial-layer2-saved.png) |
| 仙界实际音轨场景 | [integrity-ascension-real-audio.png](evidence/integrity-ascension-real-audio.png) |

本次执行对应关键源摘要：

| 文件 | SHA-256 |
| --- | --- |
| `web/app.js` | `a5bb46d2dc4ffe64e474f3ea2b93757f317b68f591e7b0648319f605d0d2597f` |
| `web/activity-rewards.js` | `54a9dac7eab79da065d2c34ebd9a708729d4cdc5b44b68f23ce20eea5d4695ab` |
| `web/audio.js` | `6718c15feef35d46cf5f5e0f6a2a292d71fdc98bd419f039a309738b6d076c71` |
| `web/ascension-screen.js` | `89dbd7cb2b0f755ee2a44c22b6bbef60c57c71debc0fb6542843f263fd994775` |
| `MainActivity.java` | `42d084e58bc720bb4d6d4e9e0d61cf4da5582bbfa9378c9bedf4535c04eae3d4` |

## 仍需区分的完成状态

1. 本报告证明本轮**源码**的三存档隔离、提交异常恢复、真实尘兑换、晋层和仙界音乐行为。原版报告的 I-01～I-05 在上述回归范围内已修复。
2. 本报告没有执行 Android 编译、新 APK 二进制/资源/签名验证，也没有替换分片或公开下载。新包的 DEX 必须确认导出不再调用正式写入；不能拿原版 `1caa5c7` 的 103 文件/签名检查当新包证据。编译与发布状态由本轮独立工件验证给出。
3. I-06 的发布源码绑定、I-07 的 main/work/V4 入口可发现性由发布/交付审计跟进。本套浏览器回归不替代它们。
4. 安卓系统选择器实际取消/失败、试玩导入时进程重建、旧 APK 实际导出迁移、磁盘不足和连续运行仍未在设备上验证。保留这些限制，不把 Native mock 通过描述为真机验收。
5. 晋层结果已准确显示新层和实际保存，但暂未逐项列出前后属性差值与下一目标；当前要求的真实结果和无假奖励已通过，更细的成长解释可继续作为体验迭代项。

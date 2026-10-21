# V4.7 心流迭代验证

2026-10-21。冻结游戏源码：`5095d2f514f4dee410138d1077376c0f6c230210`。本轮 464 项逻辑、245 项浏览器检查通过；224 张截图归档。完整计数和文件散列见 [summary.json](summary.json)，问题、依据和验收标准见 [心流评审](../../review/FLOW_REVIEW_V4_7.md)。

## 验证范围

- 464 项逻辑：包含 33 项新检查，覆盖真实首丹后的炼丹建议、缺料与已有炉次、正式试炼预览/执行门槛、共修互斥、具体故事进度、只读战报与塔层兼容。原有四条完整公共动作路线继续通过。
- 234 项源页面检查 + 11 项实际 `file://` 离线检查 = 245。新套件 16 项，包含真实初始库存、炼丹结算连接约定、精确重试、配装保存失败回滚、正式试炼/试阵，以及 320×480、390×844、844×390、1280×800 的可达性。
- Android 4.7 / code11：131 个打包 Web 文件逐字节匹配；141 项冻结构建输入；原体验证书、V2 签名与 zipalign 对齐通过。
- V4.6 的 74 项 PNG/MP3 原字节保留；实际离线文件再次解码 V4.6 新增的九幅原 PNG 并核对源 SHA。

首轮全回归在旧 V4.5 新档入口用例停下：入口现在统一经 `flow-story` 重新核对目标，旧用例仍查找 `data-ui=story-open`。用例改为点击原来可见的“走进这一卷”，保留场景、图片解码和无存档副作用断言。已通过的五个前置套件保留；V4.5 及其后七个套件按顺序完成复测。两份运行日志均留存，十四份最终报告全通过。生产展示故障注入有一条预期控制台错误，正常场景无脚本、网络或外部资源错误。

## 关键截图

- [新档首丹后：已有库存可炼丹](screenshots/v47-fresh-next-step.png)
- [未满足难度：门槛先显示](screenshots/v47-locked-difficulty.png)
- [正式试炼准备门槛](screenshots/v47-trial-preparation-gate.png)
- [开着抽屉时更新修为门槛](screenshots/v47-trial-live-readiness.png)
- [炼丹所得与实际约定 1/1](screenshots/v47-craft-task-feedback.png)
- [保留原参数重新筹备](screenshots/v47-retry-preparation.png)
- [320×480 战后回顾](screenshots/v47-report-320x480.png)
- [离线文件中的重试](screenshots/v47-offline-retry.png)

## 证据边界

[新档诊断](onboarding-audit.json) 比较相同初始库存与公共动作，二十分钟采用三秒规则时钟、零动作耗时，不自动打赢战斗。它证明资源与目标路径的行为，不能测量人类心流或完成速度。其他后期 UI 测试使用明示的境界、资源、前置胜利、旧档资格与任务夹具。静修门槛用例推进夹具时钟验证状态更新，不是自然时钟试玩。

没有真实 Android 设备验收；没有完成自然首次二十分钟、长期经济或各流派难度平衡实测。本轮未扩写仙界长篇行动链。

## 产物

本地 APK 172,875,163 字节，SHA-256 `be7127502097ded62759faaa3b76b1b835d351bb952ca4a2f86eebf377f74dd4`。独立 HTML 231,025,040 字节，77 项资源内嵌；离线 ZIP 172,973,741 字节。确切清单见 [产物 manifest](../../../releases/v47-artifact-manifest.json)。[GitHub Release](https://github.com/Yi-Lings/wendao-lingqi/releases/tag/v4.7.0-preview) 已公开，发布工作流 [39626644659](https://github.com/Yi-Lings/wendao-lingqi/actions/runs/39626644659) 成功。六项附件经匿名 HTTPS 完整下载，大小、公开 SHA-256 和 GitHub digest 一致；公开 APK/网页 ZIP 与本地验收字节相同，ZIP CRC、内部 HTML 与 1565 项源码散列通过。证据见 [public-release.json](public-release.json) 与 [公开核验日志](public-verification.log)。

发布源码提交 `2e104c05b5ac738ca673e09c974e233554577ebf`。公开源码 ZIP 为 473,874,217 字节，SHA-256 `0733713843c3b89aed6982a90e9601f4e357b83aee6e2f3bb3784f3709492036`；同一源码快照的本地包独立解压后 464 项逻辑通过，见 [日志](source-archive-node.log)。本地与 Actions 源码包的清单生成时间不同，因此 ZIP 散列不同；逐文件内容一致，公开附件以 public-release.json 为准。最终证据提交只更新文档，Web/Android/测试文件与发布源码一致。

两分支 Android CI 均成功：[main 39625410461](https://github.com/Yi-Lings/wendao-lingqi/actions/runs/39625410461)、[work 39625410956](https://github.com/Yi-Lings/wendao-lingqi/actions/runs/39625410956)，对应同一源码冻结提交。

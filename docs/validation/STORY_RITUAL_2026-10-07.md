# 剧情与闭关流程验证（2026-10-07）

这份记录覆盖本轮已完成的六卷三段剧情、十八段同行故事与六境闭关。飞升及仙界扩展正在另一组代码中继续接入，其验证单独记录，不能用此记录代替。

## 已通过的验证

- 全量 Node：275 / 275，日志 `/tmp/story-qa-full-node.log`。
- 新场景与闭关浏览器验收：10 / 10，`tests/browser-story-ritual.cjs`，结果 `dist/browser-story-ritual-report.json`。
- 原生产结算浏览器回归：29 / 29，`tests/browser-activity-named-art.cjs`，结果 `dist/browser-activity-production.json`。
- 六卷、双路线全流程：修法与炼体各 137 场真实模拟战斗，合计到达 120 个修炼节点，六卷三段真实目标、六境闭关、塔 60 层、十二妖王与守护结局全部完成。零抽卡、最高穿紫装、副修进度保持初始状态。

## 如何核实

场景测试用真实玩家按钮完成对白、调查两处线索、作出决定、执行新战斗或生产目标、阅读段间及归来对白，再领取一次奖励。十次历史药圃胜利被记录为选择时的起点，不能抵扣新约定。调查与阅读不会领取奖励，选择、线索与阅读位置可保存并恢复。未开放的后卷无法通过直接发送动作绕过。

闭关测试从缺少必需丹药开始：跟随精确丹方指引研究丹方、支付费用实际炼丹、查看生产结算，然后开始闭关。主药与阵材一次封存；调息与阵纹失误可以调整，保存后重载继续，从问心答复进入真正试炼。成功凝定新境时不会再次扣费。浏览器存储失败及原生存储失败都会退回未提交的材料、进度和抉择。

浏览器使用明确的境界、库存与战斗属性夹具验证界面和事务，不能证明玩家自然获得这些数值。经济可达性另由 `tests/v3-playthrough.cjs` 使用创建、普通动作、受离线上限约束的时间推进、战斗模拟与合法存档恢复检验；它不调用库存或阶段夹具。该流程是加速引擎验证，不等于真人试玩或心流评估。

## 视觉核查及修复

在 360 × 640、390 × 844、1440 × 900 视口核查完整场景和闭关主操作。最初截图发现共同成功提示覆盖对白与问心选择；已修正为剧情阅读及正确仪式动作轻反馈，保留失败和重试提示。重跑截图中对白与三条道心回答均可直接阅读，没有横向溢出。

可复现截图在 `dist/story-intro-360x640.png`、`dist/story-return-390x844.png`、`dist/ritual-preparation-360x640.png`、`dist/ritual-breath-390x844.png`、`dist/ritual-heart-360x640.png`、`dist/ritual-trial-390x844.png`。浏览器没有脚本异常、缺失本地资源或控制台错误。

旧版界面回归中，破境弹窗与底层静室都有「离开」控件。测试定位器原先选择了被弹窗遮住的底层按钮，已改为优先选择当前对话框；针对性重新验证通过。最终整套旧界面回归会在飞升接入后再运行。

## 执行命令

```sh
npm test
LINGQI_CHROMIUM=/usr/bin/chromium node tests/browser-story-ritual.cjs
LINGQI_FILTER=production LINGQI_CHROMIUM=/usr/bin/chromium node tests/browser-activity-named-art.cjs
LINGQI_CHROMIUM=/usr/bin/chromium node tests/browser-v3.cjs
```

网页服务从 `web/` 运行于 8787 端口。本轮没有构建 APK。

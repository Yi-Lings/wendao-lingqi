# 问道·灵契接手说明

更新时间：2026-10-07；此文档优先保存接手检查点，后续完成后回写。

## 目标与用户约束

继续问道·灵契项目。旧会话 `codex://threads/01a10c60-ac24-706e-ad66-20d3ae130025?hostId=durable` 无法加载，当前仓库和历史提交足以继续实现，尚无证据能判断旧会话加载失败原因。

- 先网页试玩，**不要构建、上传或更新 APK**。
- 红装表示红色品级；物体颜色、材质、形状按实际名称设计，可有各自元素特效。凡品使用朴素铁器/布衣；成套装备不复用图位。
- 原有美术保留并用于合适物品。原始 26 PNG、14 MP3 保留；新增 10 张 v6 图集。
- 扫荡、打怪、炼丹、打造等主动产出必须有真实奖励结算。奖励保存成功后才展示，失败回滚，不重复领取；关闭恢复来源页面、输入和滚动位置。普通集市连续购买保持即时反馈。
- 优先更新 `plan.md`、handoff；所有完成的代码与资源提交 GitHub。

## 仓库与发布状态

- 仓库：`Yi-Lings/wendao-lingqi`；当前目录 `/workspace/wendao-lingqi`；开发分支 `work`。
- 本检查点开发提交 `ae630c380e16f949b2f34e1102c285603fb8947c` 已包含命名映射、生产结算初版和 q0/q1 图集；发布分支 `web-preview-download-20261006` 的 `05d88975d6deebd0a44bdd0798e4db9994f5cd4a` 已合入该提交。
- 公开源码：[网页迭代分支](https://github.com/Yi-Lings/wendao-lingqi/tree/web-preview-download-20261006)。`main` 仍为 `28d4dcee4281b9ae713510f4e5e6e61ecf8802b6`。
- 临时发布 worktree `/tmp/wendao-web-preview-delivery` 在环境恢复后已不存在；Git 仍有该分支引用。用普通临时 checkout 恢复发布操作即可，不依赖丢失的进程/路径，不创建新 worktree。
- 当前公开下载仍是上一轮包，**不含本轮未发布的新增命名美术与生产结算**：[已验证旧网页试玩](https://github.com/Yi-Lings/wendao-lingqi/releases/download/v3.0.0/wendao-lingqi-preview.zip?revision=d8a0ee7)。
- 上轮 ZIP：78,387,556 字节；SHA-256 `434e4f51c28fe76077917684fbbeb2ba3575e010a0be3f0a8f094a15fb2c0500`。
- 上轮 HTML：104,627,736 字节；SHA-256 `88e6c7cd5724a988ae3af41789d0ccfd68e9a68bd3bc9ec09d2b92d29e51e5af`；网页发布 run `37494565840` 成功，匿名下载及压缩内容已核验。

## 已完成基础与本轮状态

历史交付：六个主页面、页面位置保留、独立战斗/Boss/洞天、红卡独立动画、图片选择/长按详情、3 BGM + 11 音效、灵玉/天道尘购买资源、套装 2/4 件真实效果、流派与最强配装推荐、一键装配、部位更换、获取指引、真实战斗奖励结算、216 独立装备图位及比例修正。上轮 Node 204 项通过，浏览器记录见 `docs/validation/SET_ART_REWARDS_2026-10-06.md`。

本轮方向与内容表：`docs/ART_DIRECTION.md`。命名矩阵临时文件 `dist/name-art-audit/art-name-matrix.json` 应转存到受 Git 跟踪的 `docs/ART_ASSET_MANIFEST.json`，避免临时输出丢失。

新增映射/表现：`web/equipment-art.js`、`web/game-art.js`、`web/art-identity.js`、`web/item-art.css`。216 装备使用六张 6×6 图集，48 功法/神通使用 8×6，12 灵宝 6×2，18 丹药 6×3，36 功能图标 6×6。图集图位各自独立；品级框与元素光效分别表达。旧资源不移除。

新增结算：`web/activity-rewards.js/css`，`web/app.js` 的保存成功路径与返回来源逻辑。支持 `sweepDungeon`、`craftPill`、`finishAlchemyJob`、`forgeGear`、`claimWisdom`、`claimCommission`、`claimChapter`、`claimSidequest`、`jointStep`（完成）、`claimOverflow`、`recycleGear`、`bulkRecycle`、`recycleTreasure`、`cancelAlchemyJob`、`jointCancel`、`chooseCave`（非战斗产出）。计算真实前后差额、保存装备 UID 快照、溢出及探索待携出奖励；原战斗结算优先。普通 `buyResource/exchangeDust` 不打断连续操作。

本检查点未提交内容：结算与名称映射的后续修正、新纯测试、q2/q5 图集和四张支持图集。q3/q4 尚未生成完成。新增浏览器测试与全套回归正在继续，不能据初版验证宣称本轮已验收。

## 接下来执行

1. 优先提交本 `HANDOFF.md` 与 `plan.md` 并同步网页分支；复制完整美术矩阵到 docs。按批提交已生成代码/资源，避免只保留在本地。
2. 完成缺失 q3/q4 图集；检查所有 330 个命名图位、天然颜色/材质、无复用、无比例拉伸、低品级无夸张效果。使用生图工具生成/编辑，不能用脚本重绘。
3. 补全 `tools/audit-apk.py` 的新资源清单（仅清单维护与语法检查，**不构建 APK**）。检查真实 CSS 选择器与新页面入口。
4. 执行 `npm test`；启动 `python3 -m http.server 8787 --directory web` 并用 Chromium/Playwright 运行新增与现有浏览器测试。设置 `LINGQI_ROOT=/workspace/wendao-lingqi`、`LINGQI_CHROMIUM=/usr/bin/chromium`。测试需检查真实保存、奖励数量、队列/控火、满背包、保存失败回滚、来源模态框/输入/滚动恢复和 360 像素屏幕。旧测试应明确关闭新增结算后继续原操作，不能放宽功能断言。
5. `python3 tools/build-web-preview.py --zip` 生成离线网页；校验无外链资源、36 PNG/14 MP3 全部内嵌、新 JS/CSS 可运行；运行 standalone 浏览器测试。受管浏览器 `file://` 可能被策略禁止，必须报告跳过并用实际解压 HTML 加载后离线验证，不能描述为 file 协议通过。
6. 把所有源码/资源/测试/文档提交并合入发布分支；保留该分支专用 **仅手动网页发布** YAML（开发分支上的原 YAML 是 APK 流程，不可执行）。更新 YAML 的 HTML 字节数与 SHA-256 固定检查为本次实测值。
7. `gh workflow run publish-apk.yml --ref web-preview-download-20261006 --repo Yi-Lings/wendao-lingqi`；先确认仅有网页任务，无 Gradle/Java/APK。该流程把 ZIP 和 SHA 文件覆盖到已有 `v3.0.0` release。
8. 成功后用匿名 HTTPS 实际下载带 `?revision=<提交>` 的 ZIP，核对大小、SHA、CRC、内部 HTML 与本地验收文件一致；核对原 APK 和 main 未变。更新 README/验证记录/plan/handoff，最终给用户新下载链接。

## 环境、测试及发布注意

云环境设置技能：`cloud-environment-onboarding:setup`；使用现有 checkout，不创建 worktree。环境恢复后进程与临时目录可能丢失，重新验证 HTTP 服务；不将 localhost 当用户试玩链接。Node/Python/Chromium、`qa-tools/node_modules/playwright` 为本轮工具，凭证通过平台代理复用，保持代理与 CA 验证，不输出认证内容。

`gh release upload` 从云环境直接上传曾被代理以 `400 BadContentLength` 拒绝，已改用 GitHub Actions 上传；不要反复重试直接上传或要求用户重新提供令牌。Git push 与 workflow dispatch 可用。

原 APK 保护基准：release asset `615156452`，48,035,951 字节，SHA-256 `7c90a5e6870b8cb1b124af1f5325b75715e0d4fb7b11519a2b64702268343597`，更新时间 `2026-10-06T10:12:59Z`；SHA 文件 asset `615156454`，87 字节，更新时间 `2026-10-06T10:12:57Z`。当前任务不用 Android 真机/签名/30 分钟稳定性验证作已通过结论。

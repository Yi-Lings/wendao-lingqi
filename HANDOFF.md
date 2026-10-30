# 问道·灵契 V4.8 接手说明

2026-10-29 起。用户要求「查全部心流，我要爽感，提一版方案」，随后追加「提交到我的github」「继续」「你帮我研究构建」。已推送 `main`/`work`，已构建并验证离线单文件试玩包与源码包，**debug APK 已构建并通过 `audit-apk.py` 审计，Release 仍未发布**。

构建链已在本机打通（`D:\lingqi-toolchain`）：Gradle 8.9 取自 `mirrors.cloud.tencent.com/gradle`；AGP 与依赖经 `--init-script` 指向 `maven.aliyun.com/repository/{google,central,gradle-plugin}`；SDK platform 35 用 `SDK_TEST_BASE_URL=https://mirrors.cloud.tencent.com/AndroidSDK/` 由 `sdkmanager` 安装；JDK 用 Android Studio 自带 JBR 21。命令与实测数据见 `docs/validation/v48/README.md`。

**唯一剩余阻塞是原私钥**：`tools/signing/signing-key.pk8` 与 `signing-cert.pem` 不在本机，全机只有标准 `~/.android/debug.keystore`。因此只能出 `CN=Android Debug` 签名的包，无法覆盖升级既有体验版，按项目规则不进 Release。拿到私钥后：`:app:assembleRelease` 出未签名 APK，再 `zipalign` + `apksigner` 用同一证书签名即可发布。

网络提示：`github.com` 被 hosts 指向 `127.0.0.1`，本机 443 上有一个可用的本地代理（慢）；真实 GitHub IP、`dl.google.com`、`maven.google.com` 均不可达。git 已配置 `gh auth setup-git` 作为凭据助手（账号 Yi-Lings），仓库本地未设置 `http.proxy`。

本轮先做全系统爽感审计（[docs/review/JUICE_REVIEW_V4_8.md](docs/review/JUICE_REVIEW_V4_8.md)），结论是成长曲线不慢、问题在可感知性，因此只改呈现层：`web/combat-fx.js` 新增纯函数翻译层；`combat.js` 产生有界 `b.feedback` 事件流并累计 `performance.damageDealt/maxHit/crits/kills`；`app.js` 用挂在 patch 子树之外的 `#combat-fx-layer` 渲染飘字与连击；`battle.css` 补受击闪白、飘字、连击徽标；`rewards.css` 给 `rarity>=4` 加独立节拍；破境页加前后对比。经济、掉落、敌人强度、经验曲线与存档版本均未改动。

验证：476 项逻辑（475 通过、1 跳过、0 失败），跳过项是 Windows 非管理员无法建符号链接的既有用例，现已明确 `t.skip` 并打印原因；浏览器 245 项全部通过（234 源页面 + 11 真实 `file://`），用本机 Edge 经 Playwright 驱动（`LINGQI_CHROMIUM` 指向 msedge.exe）。新增 `tests/browser-v48-feedback.cjs` 与 `tests/capture-v48-fx.cjs`，截图见 `docs/validation/v48/`。

离线包：`python tools/build-web-preview.py --output dist/wendao-lingqi-v4.8-preview.html --zip`，HTML 231,052,349 字节、ZIP 172,980,158 字节、77 项内嵌资源；`tests/browser-v42-offline.cjs` 连续三次 11/11、零页面错误、零外部请求。源码包 `python tools/package-source.py`，1,583 文件、475,046,525 字节。

顺手修：`browser-v46.cjs` / `browser-v47.cjs` 原先在读取 `LINGQI_CHROMIUM` 之前就 `readdirSync(qa-tools/browsers)`，没有该目录的机器上直接 `ENOENT`，已改为先判断存在性。`browser-v42-offline.cjs` 的「挑战锁定与战报重试」原本要求整档逐字段相等，会与 250ms 被动结算赛跑（本机实测差 1000ms），改为快照前冻结 `Date.now` 使其确定，而非放宽断言。

未做：会心专属音效（需新增 MP3 资产，牵动音频 manifest、APK 资源审计与离线单文件体积）、成就/称号墙、三仙阶长篇行动链、Android 真机验证、真人爽感与长期平衡结论。

# 问道·灵契 V4.7 接手说明

2026-10-24 下载偏好：用户反馈 GitHub 下载极慢，以后优先直接提供最新 APK 的对话下载附件，保留 Release 为来源。新增 prepare-apk-attachment.yml，不 checkout 大仓库，获取指定 Release 原 APK 并核对 SHA-256、字节数、GitHub digest；再用 GitHub 连接器 download_workflow_artifact 转成对话下载文件（ZIP 内 APK＋校验值）。不要交付普通 Android CI 的不同签名重编译包。当前仓库约1.562 GiB，旧 APK 分片和截图占89.224%；详见 docs/validation/DOWNLOAD_DIAGNOSTIC_2026-10-24.md。没有清理历史或修改游戏源码/版本。

下载链接补充：用户随后于 UTC 07:19:47 打开旧附件，收到 AuthenticationFailed，明确原因是签名在 07:05:44 过期。连接器返回的 oaiusercontent download_url 本轮实测只剩约两分钟有效期，不能作为长期入口。按需重新调用 download_workflow_artifact，紧接着交付并写清到期时间，勿等待其他工作完成才给链接；不得延长或改写签名参数。原 APK 另存于 /workspace/deliverables/lingqi-v4.7.apk，可提供真实工作区文件链接；当前没有已验证的永久非 GitHub 下载镜像。

2026-10-21。用户要求先发现现有问题，参考优秀游戏的心流设计，再实施版本迭代。先前同步 main/work、构建与发布体验版的授权继续有效。

当前代码冻结 `5095d2f514f4dee410138d1077376c0f6c230210`，已推 main/work。评审八项见 docs/review/FLOW_REVIEW_V4_7.md，五组参考见 docs/research/FLOW_GAME_REFERENCES_V4_7.md。

engine.journey 使用真实库存/研究/费用连接炼丹与已有炉次。dungeonGate 被 previewDungeon 和 act(startDungeon) 共用，处理正式 trial 的仪式/路线与 busy/joint；不改经济。story-focus.js 只读解释实际约定、归来或剩余条件，battle-guidance.js 只读复盘和合法重试目标；app 接同参数筹备与配装返回，源目标每次重查。新塔报告可选 floor，旧记录不反推；存档 version3、故事 rulesVersion4 不变。

464 项逻辑、245 项浏览器（234源页面＋11file://）、224截图通过；初跑旧V4.5故事入口selector更新为实际可见标签后，V4.5及剩余全部套件完成复测，前置成功套件不重跑。证据 docs/validation/v47。新档20分钟为零动作耗时的规则时钟模拟，非真人心流证据；已排除旧版新手药圃锁定的误判。

Android4.7/code11，131资源、141冻结输入、原签名/对齐通过。APK172875163字节，SHA256 be7127502097ded62759faaa3b76b1b835d351bb952ca4a2f86eebf377f74dd4。74项旧音画原字节保留；无真机、自然20分钟与长期经济结论。

[V4.7 APK、离线网页与完整源码](https://github.com/Yi-Lings/wendao-lingqi/releases/tag/v4.7.0-preview) 已公开交付；发布工作流 [39626644659](https://github.com/Yi-Lings/wendao-lingqi/actions/runs/39626644659) 成功。发布提交 `2e104c05b5ac738ca673e09c974e233554577ebf`，游戏构建输入仍冻结于 `5095d2f514f4dee410138d1077376c0f6c230210`。

六项附件均通过匿名下载、公开 SHA-256 与 GitHub digest 核验；APK、网页 ZIP 与本地验收字节一致，ZIP CRC、内部 HTML 和源码 1565 项文件散列全部通过。相同源码快照独立解压后 464 项逻辑通过。公开源码 ZIP 473874217 字节，SHA-256 `0733713843c3b89aed6982a90e9601f4e357b83aee6e2f3bb3784f3709492036`。完整记录见 docs/validation/v47/public-release.json。

最终提交只补交付证据及文档，Web、Android 与测试文件保持发布提交的内容；全部成果同步 main/work。历史版本保留，自然二十分钟、长期平衡和 Android 真机仍未验收。

## 历史 V4.6 记录

# 问道·灵契 V4.6 接手说明

2026-10-20。用户要求更多美术、详细自评并照意见改进。先前全部提交 GitHub、构建和发布体验版的授权继续有效；同步 main/work，保留历史标签与原体验签名。

本轮评审见 docs/review/PROJECT_REVIEW_V4_6.md；机制与边界见 docs/ITERATION_V4_6.md。新增 9 个原始 PNG（3 主页＋18 事件＋3 同行叙事），原 65 项 PNG/MP3 字节保留。实际生成尺寸、散列与完整提示见 docs/art/V4_6_GENERATED_ASSETS.json 和 V4_6_GENERATION_RECORDS.json。原件保留在 /workspace/generated_images。

scene-art.js 负责图片身份和独立格裁切；companion-records.js 是不补写缺失选择的经历入口；wayfarer-review.js 只读计算费用与缺口。预览的 choice 是模态框参数，不进入存档；真正确认复用 resolveEncounter。保存失败按原事务回滚，可在原预览重试。藏画保留旧 17 个 ID，扩至 26 项，目录每页最多六图。

ascension.meditationPlan 以本层缺口计算 1–10 轮和总费用，复用既有 celestialMeditate，满层余量按原规则进储备；不改经济。发现并修复共修期间仍能仙修：所有飞升动作、view、计划统一检查 joint，八类动作均有原子性回归。计划置于既有 ascension-panel 滚动区，避免短横屏挤掉猎场。

Android 4.6/code10，publish-preview.yml 指向 v4.6.0-preview。431 项逻辑、227 项浏览器（含 9 项实际 file://）覆盖通过，209 张截图归档。两条旧单轮选择器明确 count:1 后，飞升和完整性套件定点复测通过，保留初跑与最终日志。APK128资源、138冻结输入绑定 773af0e0f3a428af7f0576b2638825ac48576964，172866396字节，SHA256 4687f1b6cc06e2edc1661bbfb974c10712a66df3b369406ed22ccd6f5ac7705f；原体验签名和对齐通过。最终构建和公开交付证据见 docs/validation/v46。仍无 Android 真机与自然游玩/长期经济平衡结论。

## V4.6 公开交付已完成

[APK、离线网页及完整源码下载](https://github.com/Yi-Lings/wendao-lingqi/releases/tag/v4.6.0-preview)。发布工作流 [39383470262](https://github.com/Yi-Lings/wendao-lingqi/actions/runs/39383470262) 成功。发布提交 `cde26069796cf732ea930f734202221346b58507`，APK 源冻结提交 `773af0e0f3a428af7f0576b2638825ac48576964`。两分支的 Android CI 成功；完整证据见 docs/validation/v46。

六个公开附件匿名下载、公开 SHA 与 GitHub digest 全部一致。公开 APK/离线 ZIP 对应本地验收字节，ZIP CRC、内部 HTML 及完整源码 1284 文件散列通过。独立解压同源包 431 项逻辑通过。源码 ZIP 415238795 字节，SHA256 `65b056bf4a2d4b95d4e6f593cbe151a0de5af8e35106666c7182ebbcc448a5b6`；完整日志在 public-release.json、public-verification.log、source-archive-node.log。

十二项评审意见中，R01–R09、R11–R12 已完成本轮实现与验证；R10 的长篇主线、三阶独有行动链、自然时长、长期经济与 Android 真机仍为后续范围。最终提交仅补交付证据，Web/Android/测试与发布提交一致。

## 历史 V4.5 记录

# 问道·灵契 V4.5 接手说明

更新：2026-10-20 UTC。用户要求继续优化迭代、广泛查询资料，并授权调用生图模型补充美术；先前全部提交 GitHub、构建和发布体验版的授权持续有效。仍同步 main/work，保留旧标签与原体验签名。

当前 V4.5「接脉留灯」实现三张旋石接脉图：village_lamp（chapter_0 protect 第 1 幕）、archive_exit / archive_seal（chapter_2 第 3 幕两种选择）。正式 source 通关履历可沿用，试阵不计；七块阵石双向旋转，实际连通来息/三关键口/归处且无断口，主动 testFormation 后入册，无额外经济奖励。回到原幕继续对话、原条件与一次性结算。

新任务 rulesVersion 4；V1/V2/V3 已接约定不变，investigation 支持 V3/V4。formations 有界校验，导入不能删去已过检查点所需记录；保存失败回滚全部动作。接通图、人物回应进入只读档案和全文札记。新档首页直接显示剧情入口。

四次 image_gen 已生成并接入 4 个原始 PNG（3 场景＋1 张八证据图集），保留 /workspace/generated_images 原件；游戏副本位于 web/assets/v9-*.png。尺寸/散列见 docs/art/V4_5_GENERATED_ASSETS.json。藏画阁从 13 扩到 17 项，旧身份不变。截图发现证据裁切未生效后，已把新类接入 art-layout.js，明确背景位置并补实际绘制偏移测试；第二轮图像目检正确。

机制和边界见 docs/ITERATION_V4_5.md，12 组一手资料链接及推导见 docs/RESEARCH_V4_5.md。419 项逻辑、203 项浏览器与四条合法完整引擎路线已通过；离线验证与公开发布完成，证据见 docs/validation/v45。Android 4.5/code9，publish-preview.yml 现指 V4.5；仍无真机验收。

419 项逻辑、203 项浏览器（196 源页面＋7 file://）、144 张截图已收录 docs/validation/v45。四条普通新档合法行动路线均完成全部人界/仙界节点。两个 Android CI 39353572480 / 39353572889 成功。APK 冻结输入 afe16861ab3a542d124fcbffd4cc70b8156bb19a（125 项），115 个打包资源逐字节匹配。4.5/code9，APK 144718612 字节，SHA-256 ea465111ef6c20e96f0176f2c9fcd6b8a7751d051e99c556c4682d2f04d30d91；原体验证书、对齐通过。离线 HTML 内嵌 68 项资源且新 4 PNG 原字节经实际 file:// 验证。公开发布与源码包验证已完成。

## V4.5 公开交付已完成

[下载 APK、离线网页及完整源码](https://github.com/Yi-Lings/wendao-lingqi/releases/tag/v4.5.0-preview)。发布工作流 [39354472290](https://github.com/Yi-Lings/wendao-lingqi/actions/runs/39354472290) 成功，版本为公开预发布，保留历史版本。发布提交 `a2ce5600b915ed66be5989b4fcb2a680894394f3`，APK 构建输入冻结在 `afe16861ab3a542d124fcbffd4cc70b8156bb19a`；最终证据文档的提交不改变构建输入。

三个大文件与各自 SHA256 共六项已通过匿名 HTTPS 下载、GitHub digest 和公开校验文件核验。公开 APK/离线 ZIP 与已测字节一致；ZIP CRC、内嵌 HTML SHA 和源码 ZIP 全部 1014 项文件散列通过。源码在干净工作树打包，独立解压后 419 项逻辑检查通过。源码 ZIP 330461687 字节，SHA256 `b057b0eec33df2e53502c150a8f9550a11f1b1be232cf64e1ee88349f4d3fec2`。完整证据见 docs/validation/v45/public-release.json。

main/work 同步代码、美术原文件、方案、截图、测试报告与 APK 分片；无 Android 真机验收与自然时长平衡结论。

## 历史 V4.4 记录

以下保留上一轮证据，当前规则与版本以上文及后续本轮交付记录为准。

# 问道·灵契 V4.4 接手说明

## V4.4 公开交付已完成

Release：https://github.com/Yi-Lings/wendao-lingqi/releases/tag/v4.4.0-preview 。发布标签/源码快照 b536cdb08a01663ce8bda191e2626223aeda21ba，APK 冻结构建输入 450dabd83015d448a7193dcebb6e8d232f68d263，全部 Web/Android 输入相同；后续提交只补验证记录与说明。

发布任务 39012775932、main/work Android CI 39012547822 / 39012548044 均成功。394 项逻辑、174 项浏览器、108 个 APK 资源一致性、原体验签名与对齐通过；119 张截图见 docs/validation/v44。六个公开附件已匿名完整下载并验证 SHA-256、ZIP CRC、离线 HTML 与源码 823 个文件；相同源码快照独立解压后再次通过 394 项检查。所有详情见 docs/validation/v44/public-release.json。没有 Android 真机验收。

main/work 统一同步，旧标签保留。主发布工作流现为 V4.4。下方历史记录保留，不覆盖当前规则与公开状态。

更新：2026-10-17 UTC。用户继续迭代授权持续有效，完成后将全部工程、方案、截图与证据提交 main/work，并发布新的体验版；保留旧标签与体验签名。

当前实现 V4.4「问证与归途」：前两卷 seek 分支接入 bell_flow 与 furnace_seal 两案。正式非试阵履历、两条已读证据、结论均吻合才推进求证。错误可重试且不花资源，成功不可改写，仍需归来对话和原有修行目标后一次性领取章节奖励。归档、全文、下一卷记忆按实际保存结果展示。

新任务 rulesVersion 3；旧 V1/V2 指标、baseline 和文字游标沿用原约定。investigation.js 独立纯规则/有界校验，core/story/engine 共用；没有反推旧档经历。案卷显示及全文阅读不写存档。手机单列、桌面双列，独立正文滚动与固定返回操作；保存失败完整回滚。

V4.4 方案与验证见 docs/ITERATION_V4_4.md、docs/validation/v44。Android 4.4/code8，包名 com.lingqi.game.preview。publish-preview.yml 已切换 V4.4；离线测试从 package.json 推导当前文件名，也支持 LINGQI_PREVIEW_HTML。公开交付状态见本轮后续记录。尚无 Android 真机验收。

394 项逻辑、174 项浏览器检查（169 源页面＋5 实际离线）通过，完整报告与截图已收录 docs/validation/v44；main/work Android CI 39012547822 / 39012548044 均成功。APK 冻结构建输入 450dabd83015d448a7193dcebb6e8d232f68d263，共 118 项；108 个打包资源逐字节匹配，原签名/对齐通过。APK 132224750 字节，SHA-256 4766dcb4721017cd9d2f4acd450ac1e0d68a62f88a0ccc343cc6a303053c8836。releases/parts-v44 为六分片及来源清单；Actions 发布时重组同一 APK 并验证 HTML/ZIP 散列。

## 历史 V4.3 记录

以下为历史证据，当前任务规则和版本以上文为准。

# 问道·灵契 V4.3 接手说明

## V4.3 公开交付已完成

Release：https://github.com/Yi-Lings/wendao-lingqi/releases/tag/v4.3.0-preview 。发布源码/标签 0907fb361154edea78b67cd642a201cc2e7adf8e，APK 构建输入 e760eecf7024fdf69632e73f1fc1e5144fc58c50，二者全部 Web/Android 输入一致。后续提交只补交付证据和说明。

Actions 38935165422 发布成功；main/work 两个 Android CI 均成功。375 项逻辑、155 项浏览器检查、107 个打包资源一致性、签名/对齐通过；源码包独立解压后再次通过 375 项检查。六个公开附件均匿名完整下载并核对 SHA-256，离线 ZIP CRC/HTML 与源码快照 666 个文件逐项通过，详见 docs/validation/v43/public-release.json。两个大 ZIP 使用 HTTP Range 并验证每段范围及完整文件散列；APK 为完整流式下载。没有 Android 真机验证。

主工作流 publish-preview.yml 当前发布 V4.3。离线测试使用 LINGQI_PREVIEW_HTML 指向 dist/wendao-lingqi-v4.3-preview.html（测试文件 browser-v42-offline.cjs 为历史命名）。全部工程、素材、方案、截图和交付证据统一同步 main/work；保留历史标签。


更新：2026-10-16 UTC。用户要求继续上一轮开发，既有“全部提交 GitHub、直接构建和发布”授权持续有效。沿用现有 checkout 与原创音画，保留历史标签。main/work 统一同步。

当前实现：18 配方的亲炼炉数/实际数量、36 套装部位的打造记录；11 处新接剧情目标采用指定配方/部位；首卷守护/求证分别炼回春丹/清心散。`production` 有界并严格校验，不从旧库存/总计反推。故事 `rulesVersion` 缺失为 1、新接为 2，未完成旧约定保留指标、baseline、读到位置、完成及奖励。

24 篇人界故事支持分段全文重读，游标只存在界面；已知历史只显示原分支，旧档无选择时明确标记文本查阅。六段炼体仪式按当前目标重写正文、动作提示和回忆，保留原费用、试炼、阵纹次序及兼容丹方。说明见 docs/ITERATION_V4_3.md。

375 项逻辑、155 项浏览器检查（151 源页面＋4 实际离线文件）通过。报告与截图见 docs/validation/v43。冻结源码 e760eecf7024fdf69632e73f1fc1e5144fc58c50 已构建 Android 4.3/code7 和独立离线网页，107 个资源/签名/对齐通过，已发布 v4.3.0-preview；最新公开状态以 Release 和补充证据为准。当前无 Android 真机/模拟器。

发布使用 .github/workflows/publish-preview.yml，目标已更新 V4.3。APK 先在本地构建并检查，分片/来源 manifest 再交给 Actions 重组同一文件上传，保持体验证书。tools/verify-preview-release.py 从 package.json 推导当前系列并核对对应 manifest；直传上传接口限制仍使用 Actions 处理，不修改认证/TLS。

## 历史 V4.2 记录

以下保留旧轮证据，当前版本/分支/发布操作以上文及本轮补充记录为准。

# 问道·灵契 V4.2 接手说明

更新：2026-10-15（UTC）。本轮用户要求继续迭代、调研常见修仙游戏和小说、优化机制/玩法/前端，并将全部成果提交 GitHub；直接提交和发布已获授权。

## 公开交付已完成

V4.2 已发布：https://github.com/Yi-Lings/wendao-lingqi/releases/tag/v4.2.0-preview 。发布任务 https://github.com/Yi-Lings/wendao-lingqi/actions/runs/38664037389 成功，Android CI 两个分支均成功。六个附件已匿名完整下载，SHA-256、离线 HTML/ZIP 和源码 ZIP 的 527 个文件逐项核对通过。完整源码包独立解压后 359 项检查也通过。

冻结发布源码/标签为 `1c4a24430c3860a9644299c1190445e887dc8d54`；后续提交只补充公开发布证据。原 APK 构建输入基于 `78efa5ed9b6d8e1bec3ee4ae9455ff286e036733`，两者游戏和 Android 输入相同。公开下载证明见 docs/validation/v42/public-release.json，截图入口见 docs/validation/v42/README.md。main/work 已统一同步；历史发布保留。

## 当前版本

V4.2 已将主分支 V3.1/V3.2 开发成果与远端 V4.1 预览开发线整合，保留双方历史。`main` 与 `work` 同步最新源码；V3/V4/V4.1 历史标签和 Release 保留。旧文档中“main 保留 V3”“仅推送 work”的约定已由本轮同步要求替代。

新增六域 18 段原创奇遇、54 种选择、三条道心及真实属性、手札、战前筹备、实时成长目标；整套装备预览、排序比较、分解预览和保存状态/重试一起整合进原有六页面、闭关、剧情、飞升、配装、音画和生产系统。研究来源见 docs/RESEARCH_V3_2.md，最终方案见 docs/ITERATION_V4_2.md。

验证：359 项逻辑检查、139 项浏览器检查全部通过；9 份浏览器报告、89 张截图、构建/签名日志和 107 个 Web 文件散列见 docs/validation/v42/summary.json。完整浏览器命令 `npm run test:browser -- --full`，需本地 HTTP 服务、qa-tools/Playwright 和 Chromium；离线包另用 tests/browser-v42-offline.cjs 验证。当前工具链见下方历史说明，测试程序可使用 LINGQI_CHROMIUM 指定实际浏览器。

Android 包名 com.lingqi.game.preview、versionCode 6、versionName 4.2，最低 API 26，目标 API 35，使用已有体验调试证书。APK 132270355 字节，SHA-256 c95ca6c9dd4aa247463a95f6acda26da2f8fbd59a90fe0652f3d4098a8e38959；`audit-apk.py --variant debug` 自动读取当前 Gradle 版本并核对全部资源。没有 Android 实体设备或模拟器验证，不把浏览器/签名通过当作真机验收。

交付标签 v4.2.0-preview，发布 APK、独立离线网页 ZIP、完整源码 ZIP 和各自 SHA-256；公开状态以 GitHub Release 为准。本环境直传附件遇上传认证限制，当前发布命令为 `gh workflow run publish-preview.yml --ref work`；Actions 根据 releases/parts-v42/manifest.json 重组已测试的同一 APK 并核对 v42-artifact-manifest.json，不替换签名。完整源码包运行 `python3 tools/package-source.py`，包含 HANDOFF、源码、原始音画、调研、方案、测试与证据，不含签名私钥/工具链/缓存/历史 APK。

历世字段 wanderings 保持 V3 存档兼容，缺字段补空手札；全部事件结果、资源及印记在同一保存事务提交。战斗、洞天、共修和闭关禁止道心改动。UI 夹具、长期经济与真实 Android 体验的边界不变；长期剧情/仙界内容扩充仍可参考 V4.1 方案。

## 历史 V4.1 记录

以下保留上轮接手信息，版本号、分支和发布操作以本文件上半部及当前迭代记录为准。

# 问道·灵契 V4.1 接手说明

更新：2026-10-07（香港时间）。最新用户要求自查全部内容与美术对齐，整理需求符合程度，迭代完善方案。当前43项需求追踪与独立审计已完成；本轮源修已落地，V4.1打包/公开交付和匿名字节核验均已完成。用户先研究再制作并直接构建APK的授权有效，覆盖历史“不构建APK”。

## 当前源码与任务

仓库Yi-Lings/wendao-lingqi，/workspace/wendao-lingqi，work分支，共享既有checkout，不创建worktree。main保留历史V3；通过README的work链接和新版release取当前资源。先读plan.md第21节、docs/REQUIREMENTS_TRACEABILITY.md、docs/ITERATION_PLAN_V4_1.md，检查git status保留改动。不要把旧对话无法加载当作资源缺失；根因尚未查明，仓库资源已足以工作。

本轮修正正式Native导出、持久化后展示异常回滚、尘兑换和仙修晋层结算、剧情剩余条件引导、斗技/秘境人物文案、胜利与实际晋境文案、表情行、仙阶背景、双卫/分身裁片、短屏战斗及触控区。45PNG、16MP3；43张V4 PNG和原音频未改字节，新书院/丹房双图和雨夜医舍已接入对应篇章。330物品图位逐一复核，216套装图位独立；117战斗实例核对，13旧图集通过藏画阁逐卷可读。报告在docs/validation/audit-v4/。

## 需求仍未完全满足的部分

现有六章+十八支线是可玩的中短篇骨架。单条人界主线153句、5062/5098字符含标点，4471/4500汉字；不能将未选分支与被覆盖草稿叠算为一遍游玩。线索多为必读门槛，11/24篇两分支目标顺序相同，专属药方仍用通用炼丹计数，章节回顾仅摘要。仙界已有三阶成长与来信，长篇多幕任务还未实现。

下一阶段按ITERATION_PLAN_V4_1的场景表、任务类型、分支、丹方计数、体修叙述、章节重读和心流验收推进。角色核心配置已分离，但不能宣称所有长列表一屏全容纳；一屏定义采用主要行动与关键反馈可见、次级列表分页/滚动。不靠无用文件凑800MB或1GB。

没有adb、模拟器或Android设备。浏览器和DEX检查不能替代真机WebView、系统文件选择器、返回手势及30分钟稳定性。新任务独立恢复和旧线程加载原因也仍未验证。

## 保存与模块边界

正式lingqi-save-v2，人界试玩lingqi-preview-save-v1，天门试玩lingqi-ascension-preview-save-v1；三个角色隔离。源网页默认正式，preview=1人界，preview=1&immortal=1天门；单文件默认人界，preview=0正式。试玩资源只验证可见操作，不是自然经济证据。

正式仅Native.persistSave提交内部档。Native.exportSave只校验并保留独立exportFile快照，不写saveFile；导出与取消均不切换正式角色。run/settle只在持久化之前可回滚，已提交的真实经济/随机数状态不能因展示失败撤销；结算是只读反馈，不能二次发奖。

story.journeys保存对白、线索、选择、实际目标及基线；ritual准备费一次、取消退款、失败可重试；ascension独立规范化对象，人界双路线六境不扩为假第七境。道劫战胜与备料付费晋境分开。

## 启动与验证

node24/Python3.12，网页无需npm安装。Playwright位于qa-tools/node_modules/playwright，Chromium/usr/bin/chromium；浏览器测试明确传LINGQI_CHROMIUM=/usr/bin/chromium，旧browser-v3默认路径不适合本环境。服务进程需恢复：检查8787占用，仓库根目录python3 -m http.server 8787 --bind 127.0.0.1 --directory web，保留会话；HTTP检查真实文件后跑浏览器。

npm test包含v3-*.cjs逻辑和构建来源测试。专项tests/browser-v4-audit-ui.cjs、browser-v4-integrity.cjs、browser-red-art.cjs、browser-story-ritual.cjs、browser-ascension.cjs。故障注入console与正常异常分列。

source /workspace/cloud-setup/env.sh后用gradle --offline --no-daemon --max-workers=2 -p android :app:assembleDebug。JDK17/Gradle8.9/SDK35/AGP8.7.3及缓存在/workspace/cloud-toolchain。audit-apk.py传--package-id com.lingqi.game.preview --version-code 5 --version-name 4.1；apksigner/zipalign验证，tools/check-android-entry.py实际Java19组入口，tools/check-android-export.py实际DEX导出边界。

python3 tools/build-web-preview.py --zip生成确切单HTML；browser-preview-file验收该产物。受管file://禁止是独立跳过，不能称通过；HTTP载入后断网与离线opaque Blob分块核SHA另有证据。45PNG、16MP3、SVG及2manifest共64嵌入资源。

## 构建与发布约定

体验包com.lingqi.game.preview V4.1/code5/API26–35，沿用V4体验调试证书7e0f7d7ffed4616bf6d4f6a0b1e3bff1e29ec032c5451aa9a6960e2c265715a6，可更新V4体验安装；旧个人签名com.lingqi.game独立，JSON导出/导入迁移，旧私钥不在环境。

先将全部代码/资源/测试/文档提交推送work [skip ci]，再用冻结源码编译。新分片releases/parts-v4-1/manifest.json记录sourceCommit、全部web/Android构建输入path/size/SHA、每片/全包SHA及证书。check-artifact-sources.py --write-inputs只能sourceCommit=HEAD且输入全部已提交时生成；验证允许后续纯文档提交。CI浅clone用--fetch-source按安全完整SHA取声明commit。旧V4/旧V3分片及release保留。

.github/workflows/publish-apk.yml从work手动运行：gh workflow run publish-apk.yml --ref work，核对job=verify-and-publish。先校验buildInputs及声明Git树，再重组已实测APK，检查assets/版本/DEX/v2签名/证书，重建HTML核对releases/v4-1-artifact-manifest.json后发布v4.1.0-preview四个文件。直接gh upload曾被平台代理BadContentLength拒绝，应使用Actions上传；复用平台认证/CA，不输出凭证，不关TLS。

匿名HTTPS下载APK/ZIP/checksum，核对全包SHA、ZIP CRC、内部HTML原字节后才能完成交付。大小/run/源码检查点与最终证据写docs/validation/V4_1_ALIGNMENT_2026-10-07.md，并更新本文件及plan。

云环境完整install_script/start_skill已保存并同步4.1/code5及来源/DEX校验。保存不是发布，环境设置发布后供新任务复用；新任务恢复尚未独立验证。

历史V4.0 release v4.0.0-preview、源码1caa5c7、Actions37583120786、APK SHA d230cc061eda39b85eff3d5e11ffc62bdf55f229734d3bd5a3c2c6813994b424。V3资产和main保持，详细证据见docs/validation/V4_ASCENSION_APK_2026-10-07.md。

## V4.1最终公开交付

冻结游戏源d1519c3b4b122fd3f8f41da5c95d189c42219a9f；发布检查点e238ff2；Actions37590588262/job verify-and-publish成功。香港时间2026-10-07 16:02匿名核验完成：

- [APK](https://github.com/Yi-Lings/wendao-lingqi/releases/download/v4.1.0-preview/wendao-lingqi-v4-1-preview.apk)：132183784字节，SHA59a32e09cbeb06547c4c36c1a5e1332bf0e172e557f6c8da0b1cf1348d47f4e6。
- [离线ZIP](https://github.com/Yi-Lings/wendao-lingqi/releases/download/v4.1.0-preview/wendao-lingqi-preview.zip)：132247258字节，SHAe362c3df24d39dd95498ad160f4bbb097ebc8acf9f30c58002ae749ea75aa428。
- HTML176700528字节，SHA2f08e6a63d56f8239a2f389643b90749ae61347cc54e230b2526ef8879c35e20；公开两附件与本地实测字节相同，checksum/ZIP CRC/内部HTML全部通过。

326/326逻辑、32通用、9UI、9完整性（预期故障1单列）、9红品像素、10故事闭关、4飞升/95布局、离线24/0/1通过；原生Java入口19、DEX导出6、106源文件/114输入/签名/对齐通过。61项旧V4 PNG/MP3/JSON全部逐字节保留。旧V4 assets和main28d4dcee保持。完整证据docs/validation/V4_1_ALIGNMENT_2026-10-07.md及audit-v4/evidence。源码、素材、完善方案、报告与分片均已推送work；下一批按迭代方案A/B/C继续，无设备不宣称真机已验收。

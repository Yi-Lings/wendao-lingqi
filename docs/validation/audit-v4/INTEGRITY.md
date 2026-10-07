# V4 内容、存档、音频与交付完整性独立审计

审计日期：2026-10-07。审计对象为已验收 V4 源码 `1caa5c7598b63c76b097d5b2acd2f9f7531bd35f` 与其发布工件；报告中的源码行号以该提交为准，避免后续修复移行混淆。只增加报告及 `dist/audit-v4` 诊断文件，没有改游戏源码。

**结论：原 APK 和离线 HTML 的资源、摘要及签名均一致，但原版本不能算完全符合三存档隔离和完整反馈要求。发现一个会覆盖正式原生存档的导出漏洞、一个保存后异常的状态分叉、两个结算/成长反馈缺口，以及发布源码绑定和可发现性的缺口。** 修复状态由本轮最终回归记录给出；本报告保存原版问题与证据，不把源代码修复等同于已发布 APK 更新。

## 1. 本次实际执行的验证

| 验证 | 结果与边界 |
| --- | --- |
| `audit-apk.py` 重验现有 APK | **通过**：103 个 `web` 文件集合、原字节 SHA-256、ZIP CRC、DEX 类名、包名、版本及最低/目标 API。结果为 `dist/audit-v4/integrity-apk-check.txt`。执行时关键源文件与验收提交一致。 |
| `apksigner verify --verbose --print-certs` | **通过**：单一 Android Debug 证书，v2 签名有效，证书 SHA-256 与两份 V4 manifest 相同。结果为 `integrity-apk-signature.txt`。 |
| `zipalign -c -p 4` | **通过**。 |
| 六个发布 APK 分片 | **通过**：逐片长度、逐片摘要、按序合并摘要和完整 APK 摘要均与 manifest 相同。 |
| 原离线 HTML/ZIP | **通过**：HTML 长度及摘要、ZIP 长度及摘要、两项 ZIP 内容、CRC 与 HTML 原字节一致。实际解析 HTML 中 62 个内嵌资源并逐个 base64 解码，均与源资源原字节相同。41 个入口/脚本/样式的 manifest 摘要均对应验收提交。结果为 `integrity-artifacts.json`。 |
| Android URL 白名单 | **通过**：`tools/check-android-entry.py` 实际提取 Java `isEntry` 执行 19 条检查，含三个模式、query 两种顺序、fragment 与外国 URL。 |
| 定向 Chromium 行为 | **6 个案例全部完成，0 个 page error**。所有浏览器 JS 通过 route 固定为验收提交，避免修复中的代码影响原版复现。覆盖导出污染、保存失败回滚、保存后渲染故障、战斗退出、尘兑换实际物品遗漏、仙界静修/晋层/音乐。`integrity-behavior.cjs` 与 `.json` 可重复检查。Native 文件写入语义使用与实际 Java 一致的 mock；不冒称 Android 设备实测。 |
| APK 内导出代码 | **确认漏洞也存在于 APK 二进制**：`classes2.dex` 的 `MainActivity.startExport` 在 `preserveExport` 前直接调用 `writeInternalSave`；截取反汇编为 `integrity-apk-native-export-dex.txt`。 |
| 原版 Node/已有浏览器回归 | 本次读取既有证据：`node-final.log` 为 **297/297、0 跳过**；故事/闭关 10 案、飞升 4 案、生产结算 29 案、基础浏览器 32 案均通过。离线试玩 25 案中 1 项本地 `file:` 导航因宿主管理政策跳过，不能称 25 项全通过。本次未重复全量 npm；统一修复后须另跑最终回归。 |

原工件：APK `126858599` 字节，SHA-256 `d230cc061eda39b85eff3d5e11ffc62bdf55f229734d3bd5a3c2c6813994b424`；证书 SHA-256 `7e0f7d7ffed4616bf6d4f6a0b1e3bff1e29ec032c5451aa9a6960e2c265715a6`。HTML `169592222` 字节、ZIP `126923094` 字节。103 是 APK 内完整前端文件数，62 是离线 HTML 的内嵌媒体/图标/媒体元数据数，二者不是冲突的统计。

## 2. 需要修复的具体问题

### I-01 / P1：试玩导出覆盖正式 Android 存档

- 位置：`web/app.js:726`；`MainActivity.java:232-238,270`。
- 原因：保存和加载用 `!PREVIEW` 隔离 Native 正式槽，但导出无条件调用 `Native.exportSave(raw)`。Java 非恢复导出先把参数写入唯一 `lingqi-save.json`，随后才打开系统文档选择器。
- 复现：正式槽名字“正式仙途原存档” → 设置切人界试玩 → 导出备份 → 此时原生槽已是“试玩行者”，原正式 localStorage 暂仍正确 → 切正式仙途 → `Native.loadSave()` 优先读污染槽，`boot()` 又将它同步覆盖正式 localStorage。取消或导出失败也无法撤销选择器打开前的覆盖。天门试玩同样受影响。
- 本次实际结果：试玩启动 Native load/persist 次数均 0；导出后 Native export 1 次，正式 native name 变“试玩行者”；返回正式后名字和正式 localStorage 均变“试玩行者”。浏览器使用真实原版动作，原生行为由源码和 APK DEX 双重确认。
- 修复建议：原生导出只保存独立 `exportFile` 快照，不承担正式存档提交；JS 正式进度由 `persist()` 保存。导出参数必须保留所选模式语义。加一个跨模式导出、取消、返回、重载的 Native mock 回归，并在设备上补系统选择器检查。

### I-02 / P2：保存成功后的展示异常会错误撤回内存

- 位置：`web/app.js:662-697`，特别是成功保存 `:672` 与无条件 `catch` 回滚 `:696`。
- 原因：同一个 try 包住引擎动作、提交、结算模型、DOM 渲染及音效。提交后的异常仍把内存恢复为旧状态，持久化却已经保存新状态。
- 复现（明确为故障注入）：替换只读 `WendaoActivityRewards.model` 为抛异常实现 → 执行正常 `forgeGear` → 原生保存成功 → model 抛错 → 返回 `ok:false`，内存背包 42、磁盘背包 43。资源、UID/修订号也随两个状态分叉。
- 影响：错误反馈称“进度已恢复”，重载后却出现已提交奖励；继续操作还可能用旧内存覆盖已提交状态。此证据验证异常边界，不意味着当前美术自然触发这个异常。
- 修复建议：标记持久化提交边界。提交前失败才真正回滚；提交后的展示失败保留已保存状态，告知所得已保存并安全刷新。加入保存后反馈错误故障注入回归，检查内存、磁盘、返回值和后续动作一致。

### I-03 / P2：天道尘随机装备/灵宝兑换没有实际物品反馈

- 位置：`web/economy.js:717-731`、`web/activity-rewards.js:7`、`web/app.js:693`。
- 原因：`exchangeDust` 可以创建随机橙装或灵宝，但不在活动结算 supported 中。UI 只刷新“天道尘兑换”，结果中的 gear/id 没被展示。
- 复现：足够天道尘 → 兑换橙色灵装 → 尘实际减少、背包实际多 1 件橙装 → 没有战利品/活动结算，也没有本次装备 card，玩家不知道刚得到哪件。
- 修复建议：对随机装备/灵宝及有所得的尘兑换用只读 before/after 结算，展示实际 UID/物品名、属性入口、支出；关闭恢复兑换抽屉。常规集市连续购买可继续采用即时反馈。

### I-04 / P2：仙界晋层缺少与静修/升阶一致的成长结果

- 位置：`web/ascension.js:141-143`；`web/app.js:682`、`:588-592`。
- 原因：`advanceCelestial` 实际改变层级并提升属性，但不在 celestial-result 的动作分支中；只留下短暂通用 toast。
- 复现：已飞升 → 静修 3 轮获得 660 仙修和 24 仙元，能看到保存后的独立静修结果 → 关闭 → 晋层到登仙 2 层 → 无结果弹窗，仅 toast。实际层级保存正确。
- 修复建议：晋层显示前后层级、属性提升、储备释放和下一目标，明确“已保存”；不应将晋层错误描述为升阶或新增仙元。人界手动小层与自动晋层可由需求表明确是否需要同样反馈。

### I-05 / P3：叙事场景进入时音轨切换延迟

- 位置：`web/app.js:176-185,323,721`。
- 原因：openStory/openRitual/openAscension 先 closeModal 更新旧音场，再设置 narrative 并只 renderPage；没有当场 updateAudioScene。下一秒的 updateChrome 才会修正。
- 复现：修行音乐 home → `openAscension()` → 同一调用内 diagnostics.scene 仍 home；约 1.2 秒后才 ascension，并最终只剩一首循环。
- 修复建议：赋叙事场景后立即同步音场。故事和闭关使用 home 是现有四配乐设计的合理映射；不是一定需要再作两首音乐。叙事从天道入口打开时应确保映射优先于底层 page。

### I-06 / P2：发布工作流没有绑定原生源码，Java-only 修复可能重发旧包

- 位置：`.github/workflows/publish-apk.yml:22-25,34,47-50`；`audit-apk.py:47-54`。
- 原因：工作流合并预先验收的分片，生成当前网页，校验 APK 的全部 web 字节及 DEX 类名。它不编译当前 Android，也没有校验 manifest.sourceCommit 对应的 Android/构建源码是否改变。
- 可检查的失败条件：只修改 `MainActivity.java`，web 不变 → 297 逻辑检查不覆盖 Java 内容 → 原 APK 的 web 比对仍正确 → HTML 摘要仍一致 → DEX 类名仍在 → 工作流继续上传含旧 Native 的 APK。当前这轮同时修改 app.js 会使 web 比对失败，因此并不是说本轮一定会误发。
- 修复建议：明确此流程是“重发已验收工件”。对 manifest.sourceCommit 与当前提交的 `web/`、`android/`、构建/审计脚本等关键路径做差异检查；允许纯文档提交，无需 HEAD 与 sourceCommit 相等。源码有变化就要求重新构建和验收 APK，更新签名/摘要/分片及离线 HTML manifest。不要仅更新 sourceCommit 字段或绕过摘要。
- 有效防线：现有 web 103 文件原字节检查、HTML 固定摘要、签名固定证书是强检查，应保留。

### I-07 / P2：V4 源码和发布入口可发现性不完整

- 本地证据：`origin/main@28d4dce` 的 README 和发布工作流仍是 V3；`work@bd4634c` 是 V4。这里指本地远端引用快照，不把它冒称本次已验证的 GitHub 默认分支状态。
- `README.md:7` 说明代码位于 work，却没有直接 work 分支链接；泛仓库链接可能将读者带到 V3。`releases/README.md:3-15` 全为 V3，`tools/assemble-apk.py:13-15` 无参默认也只合并 V3。
- 修复建议：V4/旧 V3 双入口明确，提供 work 或已验收源码提交直链；记录默认 main 与 work 的定位。将合并 V4 的完整参数放在 releases README，不悄悄改变旧脚本默认行为。若要把 V4 切成默认源码分支，作为可审阅的仓库操作另行落实。

## 3. 存档与奖励符合项

- 产品版本 V4 继续使用存档 schema `version:3`，不是 bug。Java 接受 1/2/3，完整结构由 JS `E.validate()` 校验，V4 新增 ascension/journeys/ritual 字段由 normalization 兼容未含它们的旧 V3。`ascension` 缺失补 null，不送仙元。
- V1/V2 经 core `migrateV1/migrateV2` 保留旧大境到一层、储备修为、品质映射、UID、最高部位强化、重复投入退款、故事进度和关系；旧战斗安全结束并保留旧记录。既有迁移测试通过，但本次没有实际 Android 旧版应用导出文件可复核。
- 已完成旧章节/支线不被迫重新领一次奖励；旧真实大境试炼以 ritualLegacyWins 承接，终境旧实战仍能满足飞升条件。飞升需要新的天门胜利，旧 heaven_gate 数量会成为 baseline。
- 正常三模式加载/保存采用三套 KEY/AGE，两个试玩不会调用 Native load/persist；原生入口 query 白名单实际通过。隔离结论须排除 I-01 的导出漏洞。
- `E.act` 克隆状态、完成校验才 commit（engine `:66-88`）；保存失败在 UI 提交前撤回。此次 10 抽持久化拒绝后奖励、货币、保底、随机流和 Native 槽完整不变，没有演出。
- 首通使用 firstKey + firstClears，战斗 settled/reported 防重复；支线 sideCompleted、章节 journey.completed、飞升 stage 及 fresh win baseline 阻止重复发首奖。委托是可重复劳动奖励，用 taskCounts 消费已完成次数，不应把它误判为“首奖重复”。
- 结算窗口本身是只读模型/render，关闭、历史回看、图片详情不再调用 grant。仙界战斗 reward.celestial 在 `rewards.js:21` 显示真实仙修/仙元。
- 战斗主动退出：实际原版 browser 检查确认 Native Back 先暂停并弹确认，确认后 outcome=exit、reward=null、没有未结算掉落，回历练页并恢复进入前 scroll。故事/闭关/天门通过 narrativeBookmark 提供继续原叙事入口；已有飞升与故事回归包含真实场景返回。

## 4. 实际活动与结算触发全表

| 活动/动作 | 原版实际反馈 | 奖励或状态约束 |
| --- | --- | --- |
| `sweepDungeon` | 活动结算 | 实际材料与历练储备支出，不授首通 |
| `craftPill`, `finishAlchemyJob` | 活动结算 | 实際成丹，控火追加量独列；队列准备/中途控火不冒称收成 |
| `forgeGear` | 活动结算 | 本次装备 UID、长按/详情、材料支出 |
| `claimWisdom` | 活动结算 | 凝成券到账，储存上限/零新增状态 |
| `claimCommission` | 活动结算 | 实际本轮产出，taskCounts 消费活动进度 |
| `claimChapter`, `claimSidequest` | 活动结算 | 真正 ready 后一次性奖励；章节还改变人物信任，模型当前不逐项展示信任变化 |
| `jointStep` | 共修第三轮结束才活动结算 | 前两轮仍为共修场景，不发/重复显示最终收益 |
| `claimOverflow` | 活动结算 | 从暂存入背包，不重新发装备 |
| `recycleGear`, `bulkRecycle`, `recycleTreasure` | 活动结算 | 实际回收资源，不重新产生装备 |
| `cancelAlchemyJob`, `jointCancel` | 有实际退款才活动结算 | 显示费用退还，不称一般奖励 |
| `chooseCave` | 非战斗房间实际收益活动结算；进入战斗后战斗结算 | 暂存/已携出区分；通关前 pending 不冒称最终到账 |
| `startDungeon` 胜利/败退，`leaveBattle` | 战斗结算 | 试阵无经济奖励；失败/退出只保留洞天已确认 banked |
| `finishCave` | 洞天终结战斗结算 | 通关携出全收益；提前离开只携出 banked |
| `draw`, `drawWithJade` | 聚光、红卡特写、最终抽取结果 | 所有奖励先保存；跳过不漏/补发；多红逐件 |
| `breakthrough` | 独立破境结果 | 已封存丹材不再次扣费，记录真实 realm |
| `completeAscension` | 独立飞升结果 | 初始仙元 100 一次，真实完成条件 |
| `celestialMeditate` | 独立静修结果 | 支出及实际仙修/仙元；本次实际 +660/+24 |
| `celestialHunt` | 开启真实战斗；胜利后战斗结算 | 出征只扣一次费用，不预发仙修/仙元；失败退出不返已投入材料 |
| `celestialBreakthrough` | 独立仙阶结果 | 实际成本、新仙阶或金仙圆满 |
| `advanceCelestial` | **只 toast** | 实际晋层/属性变化，见 I-04 |
| `exchangeDust` | **只刷新兑换目录** | 随机橙装/灵宝没有本次所得，见 I-03 |
| `buyResource`, `buyJade`, `exchangeJade` | 集市原地刷新 + 即时反馈 | 连续购买保留输入；实际库存/余额，不要求逐笔阻塞弹窗 |
| `researchRecipe`, `learnTechnique`, `upgradeTechnique`, `resetTechnique`, `usePill` | 原抽屉/页面更新 + toast | 研究/研习/重置属于状态操作；重置退款、服药实际修为未进统一活动卡。若要求“所有主动所得都独立结算”，需求表应显式补齐，不能说当前 supported 16 项覆盖一切。 |
| 人界挂机静修、设施生产、自动小层 | HUD 定时刷新；离线超过一分钟会显示离线结算 | 离线只基础收益，修为 24h/生产 7d；不自动首次挑战/大境/仙阶 |

## 5. 音频对齐

- 43 PNG、4 首 BGM、12 效果与 2 份音频元数据随工件完整打包；本次逐个原字节检查。新增仙界 BGM 在实际浏览器用 HTMLAudio 播放，1.2 秒后 diagnostics 为单一 ascension 音轨。
- 原版路由：普通修行/故事/闭关 home；战斗/洞天 battle；天道/聚光/红卡 heaven；天門及飞升后叙事 ascension。battle 优先于 ascension，再优先于 heaven。进入独立叙事的同步时机有 I-05。
- battle-hit / skill、victory/defeat、summon-rise/reveal/red-awaken/red-impact、ascension-rise 的实际触发点均在 run/战斗 tick/独立结果；红卡音效会在跳过/关闭时取消定时器并停止，奖励不用音效决定。
- Audio 节点按 track 缓存；800ms 淡入淡出最多容许旧/新两首，第三个导航会停止其它节点；同一 track.playing 且未 paused 不会重复 play。效果同名一声、总量最多四声，间隔/优先级限制正确。
- generation 检查处理迟到播放 Promise；mute/0 音量、visibility hidden、pagehide、Native pause 均停止音乐和效果。本次 `onNativeLifecycle('pause')` 后实际 diagnostics 为 musicPlaying=[]、activeEffects=[]。
- 未重复完整音乐解码套件；既有旧版 audio 检查主要覆盖 14 个旧音频，新增飞升音效在 Android 真机上仍应补听感/中断/连续播放验证。checksum 证明文件完整，不证明循环接缝、主观混音和不同 WebView 的听感都合格。

## 6. build-web-preview 语义与发布边界

`tools/build-web-preview.py:26-27,74-81` 的语义差异是有意的：普通源码无 query 默认正式仙途；单文件默认人界试玩，只有 `preview=0` 切正式，`preview=1&immortal=1` 切天门试玩。三套实际 KEY 相同。脚本不是把美术压缩/换图：它逐字节 base64 内嵌 PNG/MP3，并在浏览器生成 Blob URL 避开大图 CSS 自定义属性长度上限；不要求辅助服务器。当前脚本结构变化会 fail closed，未适配动态 URL 会报错。

`WendaoStandalonePreview.saveKey`/manifest 顶层 saveKey 是默认人界试玩键，不是所有模式的动态当前键；完整三键在 manifest.saveKeys，不能拿顶层字段证明正式模式也保存进试玩键。`preview=True` 同样描述包默认模式。

既有 release 证据记录 `v4.0.0-preview` 手动工作流 run `37583120786` 成功，发布为 prerelease、非 latest，release target 是 `c82b7b1`，工件 sourceCommit 是 `1caa5c7`；两者只要关键源一致就可以合理不同。该记录的公开下载校验支持“当时已上传的原 V4”。本次未重新请求 GitHub、未重新发布、未替换分片，无法据此声称公开 APK 包含本轮修复。

## 7. 必须保留的验证盲点

1. 没有 Android 设备/模拟器。本次 Native mock、实际 Java URL 单测、APK DEX 与签名证明静态及 JS 事务行为，不能代替系统文档选择器取消/失败、返回手势、存储空间不足、后台音频、进程被杀后恢复。
2. MainActivity `onSaveInstanceState` 仅保留 picker/export 标记，onCreate 始终 `web.loadUrl(ENTRY)`。未保存当前试玩 query；若在试玩导入时进程重建，导入可能送到重新启动的正式页。这里是明确需要设备复现的恢复风险，尚未作为已实测缺陷。
3. 暂无真实旧 APK 用户导出文件；迁移测试为合法 schema fixtures。原版 V1/V2/V3 各一份实际导出/导入、损坏文件保留、1MiB 边界、正式/两试玩跨模式导出，应列入设备验收。
4. 既有无注入双路线模拟每条可到人界 60 节点和仙界 30 节点，但用七天资源等待加速，一条路线累计 4200 模拟小时；它证明合法可达，不证明自然节奏、最短时长、难度平衡或手机 30 分钟体验。
5. 资源 byte-match 不是画面语义/裁切正确的证明；这些需与独立美术、内容和布局审计合并。反之，画面审计通过也不能掩盖 I-01 的存档破坏。
6. 本报告问题以原工件为准。完成本轮源修复后，应区分“源码回归通过”“新离线试玩包验证通过”“新 Android 构建/签名验证通过”“已发布下载包更新”四种状态，不自动宣称后两种完成。

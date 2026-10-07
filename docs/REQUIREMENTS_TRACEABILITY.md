# 用户需求、实现与验收追踪

审查日期：2026-10-07（香港时间）。需求来源为本对话全部用户指令，核对对象为已发布 V4 源码检查点 `c82b7b1`，以及本轮自查修复中的工作分支。**已发布 V4 与当前源修复是两个状态：本轮游戏源码/美术已完成专项修复，最终源码检查点尚待提交冻结；新 APK 与公开下载尚待构建验收，单文件验收正在收尾。** 此文件整理需求和证据，不把设计文档、素材数量、测试总数或安装体积当作全部验收通过。

当前可确认的是：多数具体功能已经有实现和逻辑/浏览器证据；独立审计还发现并修复了原生导出覆盖正式存档、提交后展示异常状态分叉、奖励遗漏、错图和界面问题。**单次主线约五千字符，仙界主要仍为三阶同构修炼和可选来信，不能称大型长篇修仙内容已经完成。** 自然游玩心流、实际手机 WebView 表现以及新云环境恢复仍有验收工作。具体下一阶段方案见 [ITERATION_PLAN_V4_1.md](ITERATION_PLAN_V4_1.md)。

## 状态定义与指令优先级

| 状态 | 含义 |
| --- | --- |
| 实现 | 已有真实运行代码，所列证据支持具体行为；不自动涵盖未执行的设备或真人体验验收 |
| 部分 | 已有可玩骨架或主要行为，但用户要求的内容规模、深度或完整体验仍不足，列出具体扩展措施 |
| 缺陷 | 已发现代码行为、实际界面或需求呈现之间存在具体差异，需要修复并复测 |
| 仅规划 | 只有设计、说明或后续工作安排，没有可玩的实现 |
| 未验证 | 现有条件或证据不足以判断是否达到验收标准 |
| 已被后指令替换 | 用户后续明确改变了该限制，历史指令保留但不再约束当前交付 |

用户最后要求“参考一念逍遥……先进行头脑风暴，再做游戏，最后直接构建 apk”，明确覆盖先前“做好先别构建 apk，先给我体验”。“可以往 1GB 或者七八百 M 发展，不要规定大小”表示允许实质内容增长，不是必须填充到某个字节下限。参考游戏的模式不等于授权复制它的角色、文案、素材或宣称本作已经联网。真人联机、灵兽养成、法则系统属于研究中的扩展方向，并非本对话已要求且未完成的功能；不得混入需求缺陷统计。

## 证据目录

下表中的证据均指向实际文件。历史验证文档中的旧数量、旧网页交付限制仅描述当时版本，不能用来替代 V4 现状。

| 编号 | 证据与边界 |
| --- | --- |
| E01 | [HANDOFF.md](../HANDOFF.md) 中的环境恢复命令；`/workspace/cloud-setup/env.sh`、安装脚本及验证日志存在；新建环境复用启动草稿尚未独立验证 |
| E02 | [EQUIPMENT_BUILDS_2026-10-06.md](validation/EQUIPMENT_BUILDS_2026-10-06.md)；[browser-equipment-builds.cjs](../tests/browser-equipment-builds.cjs)；真实装备/技能装配、套装阈值和回滚检查，不证明所有敌人的数学最优搭配 |
| E03 | [SET_ART_REWARDS_2026-10-06.md](validation/SET_ART_REWARDS_2026-10-06.md)；[browser-sources-rewards.cjs](../tests/browser-sources-rewards.cjs)；来源、真实战斗奖励、溢出和裁切检查 |
| E04 | [ART_ASSET_MANIFEST.json](ART_ASSET_MANIFEST.json)、[ART_DIRECTION.md](ART_DIRECTION.md)、[NAMED_ART_PRODUCTION_2026-10-07.md](validation/NAMED_ART_PRODUCTION_2026-10-07.md)；映射、图位独立性和像素指纹可复核，语义与好看程度仍需看实际原图/页面 |
| E05 | [v3-audio.test.cjs](../tests/v3-audio.test.cjs)、[browser-audio-layout.cjs](../tests/browser-audio-layout.cjs)、[browser-preview-file-report.json](validation/v4-2026-10-07/browser-preview-file-report.json)；真实解码、非静音、播放时钟、音量/后台行为 |
| E06 | [node-final.log](validation/v4-2026-10-07/node-final.log)：发布前 297 项逻辑测试；测试数只描述覆盖记录，不是内容质量分数 |
| E07 | [browser-v3-report.json](validation/v4-2026-10-07/browser-v3-report.json)：通用界面 32 项；[browser-activity-production.json](validation/v4-2026-10-07/browser-activity-production.json)：生产/奖励 29 项 |
| E08 | [STORY_RITUAL_2026-10-07.md](validation/STORY_RITUAL_2026-10-07.md)、[browser-story-ritual-report.json](validation/v4-2026-10-07/browser-story-ritual-report.json)：实际阅读、调查、承诺后新行动、仪式与存档；浏览器有明确有效进度夹具 |
| E09 | [browser-ascension-report.json](validation/v4-2026-10-07/browser-ascension-report.json)：真实新天门胜利、飞升、静修/巡猎/试炼与 95 个布局组合；全程可达性另由 E15 验证 |
| E10 | [red-art-report.json](validation/v4-2026-10-07/red-art-report.json)、[red-gear-360x640.png](validation/v4-2026-10-07/red-gear-360x640.png)：装备/功法/灵宝跨三视口共九例，比较实际绘制像素，不仅检查 DOM 存在 |
| E11 | [browser-preview-file-report.json](validation/v4-2026-10-07/browser-preview-file-report.json)：最终单 HTML 24 通过、0 失败、1 项受管 Chromium 禁止的 `file://` 跳过；HTTP 后断网和不透明 Blob 媒体解码分别验证，不能说双击打开已验收 |
| E12 | [V4_ASCENSION_APK_2026-10-07.md](validation/V4_ASCENSION_APK_2026-10-07.md)、[apk-check-v4.txt](validation/v4-2026-10-07/apk-check-v4.txt)、[apk-signature-v4.txt](validation/v4-2026-10-07/apk-signature-v4.txt)、[gradle-build.log](validation/v4-2026-10-07/gradle-build.log)：编译、签名、对齐、103 个游戏文件逐字节审计；没有安卓真机结果 |
| E13 | [public-download-verification.json](validation/v4-2026-10-07/public-download-verification.json)、[github-release-run.json](validation/v4-2026-10-07/github-release-run.json)：公开 APK/ZIP 匿名 HTTPS 返回 200，大小、SHA、公开校验附件及内部 HTML 一致 |
| E14 | [YINIAN_SYSTEMS_2026-10-07.md](research/YINIAN_SYSTEMS_2026-10-07.md)、[YINIAN_SOURCE_MANIFEST_2026-10-07.json](research/YINIAN_SOURCE_MANIFEST_2026-10-07.json)、[BRAINSTORM_2026-10-07.md](research/BRAINSTORM_2026-10-07.md)：23 个实质来源、获取失败/版本差异和实施决策；数量不代替来源质量 |
| E15 | [playthrough-v3-report.json](validation/v4-2026-10-07/playthrough-v3-report.json)、[FIRST30_2026-10-07.json](validation/FIRST30_2026-10-07.json)：普通新档仅经公共动作到金仙圆满，零抽卡/最高紫装；七日粗等待步长证明可达性，不证明最短时长或真人心流 |
| E16 | [V4_ORIGINAL_ASSETS_2026-10-07.json](validation/V4_ORIGINAL_ASSETS_2026-10-07.json)：相对 `c0fb103` 原 36 PNG、14 MP3 及原音频清单完整保留；[releases/parts-v4/manifest.json](../releases/parts-v4/manifest.json) 与发布代码保存在 GitHub `work` |
| E17 | [UI_PLAYTEST.md](validation/audit-v4/UI_PLAYTEST.md)：当前源页面四视口九组真实操作验收全部通过，68 张截图；六主页、部位/套装、长按、短横屏满配战斗、剩余目标、13 张藏画等。有效进度夹具只证明对应 UI/事务，不证明自然心流 |
| E18 | [INTERIOR_ART.md](validation/audit-v4/INTERIOR_ART.md)、[INFIRMARY_ART.md](validation/audit-v4/INFIRMARY_ART.md)：新增书院/丹房双格原创内景及镜湖医舍雨夜完整场景；原 44 PNG 在夜景新增后逐字节保留，当前 45 PNG；实际场景裁格/接线由世界/UI 回归检查 |
| E19 | [WORLD_ART.md](validation/audit-v4/WORLD_ART.md)、[EQUIPMENT_ART.md](validation/audit-v4/EQUIPMENT_ART.md)：实际原图联系表、地图/人物/Boss/20 物种/6 对手/330 物品语义与裁切审查；记录修前问题和当前处理，不能以旧验收报告掩盖新发现 |
| E20 | [STORY_FLOW.md](validation/audit-v4/STORY_FLOW.md)、[STORY_FLOW_COUNTS.json](validation/audit-v4/STORY_FLOW_COUNTS.json)：最终 runtime 可达对白、含标点字符与汉字分开、36 个行动阶段/21 种目标、11/24 篇两选择同任务序列；第二/三卷对手与仙阶来信文本已修 |
| E21 | [INTEGRITY.md](validation/audit-v4/INTEGRITY.md)、[browser-v4-integrity.cjs](../tests/browser-v4-integrity.cjs)：保留原 V4 问题证据；本轮完整性真实浏览器 9/9 通过，预期故障注入错误单独列 1 条，正常错误为 0；Native mock 和提交后故障注入不替代实际 Android 系统验收 |

新增发布防线证据：[check-artifact-sources.py](../tools/check-artifact-sources.py)、[v3-artifact-provenance.cjs](../tests/v3-artifact-provenance.cjs) 的 13 项定向检查；[check-android-export.py](../tools/check-android-export.py) 检查实际 DEX 导出隔离；[v3-audit-contracts.cjs](../tests/v3-audit-contracts.cjs) 的 5 项行为契约。Native 实际 Java 入口 19 项、红品实际像素 9 项、通用浏览器 32 项、故事/闭关 10 项、飞升 4 项及 95 布局均已回归；最终 npm 总数与新产物以冻结验收记录为准。

## 本轮审查层级

“已修”表示源码发生具体修复；“覆盖”表示完成所列独立检查；“部分”表示需求深度尚未达到；“待验”表示还没有相应运行/设备证据。这四种不能互相替代。

| 层级 | 当前内容 | 对应需求 |
| --- | --- | --- |
| 已修，源码阶段 | 试玩原生导出不再写正式存档；提交后展示错误不回滚已保存状态；随机尘兑换展示实际装备/灵宝；仙修晋层结果；叙事音场即时切换；剩余条件及真实入口；对手/阵心/仙阶战后语气；Boss 逐格及双卫肖像；三仙阶实际背景、表情别名；书院/丹房/雨夜医舍补图与藏画阁 | REPO-001、UI-001～005、AUDIO-001、ART-004～009、REWARD-003、STORY-001～003、ASC-001 |
| 覆盖，当前源页面 | 九组 UI 验收、68 张截图；实际看图和语义联系表；13 卷旧图可访问；小屏/横屏满配战斗和 40px 操作；具体逻辑专项已有各自报告 | E17～E20；只覆盖报告明确列出的范围 |
| 部分，需内容扩展 | 单路线主线 5062/5098 字符含标点（4471/4500 汉字）；36 行动阶段仅 21 种目标；11/24 篇两选择目标相同；完成回忆只有摘要；泛用制作计数可完成具体丹药文案；炼体共用修法仪式术语；仙界尚无三条多幕行动主线 | STORY-001～004、GROWTH-001、FLOW-001、ASC-001；详见迭代方案 |
| 待验，冻结/交付 | 326/326逻辑；单文件24通过/0失败/1受管file跳过；新APK106文件字节一致、114构建输入绑定、实际DEX6检查、v2签名/对齐通过；公开下载将在发布后补证 | REPO-001、DEL-002～003、QA-001 |
| 待验，运行条件 | 安卓真机、真实旧版导出档、系统导入/导出选择器和进程重建、低端机持续 30 分钟；新云环境恢复；真人心流/听感 | ENV-001、UI-001～005、AUDIO-001、FLOW-001、DEL-003 |

## 环境、继续工作与交付

| 稳定 ID | 原需求 | 可检查的验收标准 | 实际实现/证据 | 状态 | 剩余措施 |
| --- | --- | --- | --- | --- | --- |
| ENV-001 | 使用 `$cloud-environment-onboarding:setup` 设置此云环境 | 仓库可恢复、测试可执行、网页可启动、Android 可离线构建；保存可复用设置 | 云安装脚本、JDK17/Gradle8.9/SDK35 缓存、启动脚本；E01、E06、E12 | 实现 | 在新建环境独立执行保存的启动草稿，再验证浏览器/构建；保存草稿与发布配置不能混称 |
| CONT-001 | 旧对话无法加载，查原因或直接检索资源继续 | 取得问道·灵契源码/资源/历史并继续；若报告加载原因应有证据 | 当前仓库、Git 历史、原 APK 分片与资源已恢复，后续源码已交付；E16 | 实现 | 用户提供了“或直接继续”替代途径，已满足继续工作；旧会话加载失败原因仍未证实，禁止猜测为平台故障或文件丢失 |
| CONT-002 | 多次“继续完成项目 / 继续” | 将追加需求连贯纳入现有项目，完成可玩的代码与交付 | [plan.md](../plan.md)、[HANDOFF.md](../HANDOFF.md)、V4 发布；E12、E13 | 实现 | 延续本轮审查发现的改进项，不把泛化的“继续”解释为无限制加入未要求系统 |
| REPO-001 | 每一项代码和资源都提交到 GitHub | 完成的源代码、原创图/音频、构建工具、研究/测试/文档、APK 可重组分片均可追溯；不上传私钥和缓存 | GitHub `work`；源检查点 `1caa5c7`，发布检查点 `c82b7b1`，交付证据 `bd4634c`；E16、E13 | 实现 | 本轮新修复/文档也应提交并推送，再冻结新产物；不能只更新本地 |
| DOC-001 | 优先更新 `plan.md`，写入 handoff | 开发前先写范围/现状/剩余事项，交付后记录真实结果与恢复命令 | `ed8a09f` 先提交计划/交接；`plan.md` 第 20 节与 `HANDOFF.md` 记录 V4；本轮已有自查计划检查点 | 实现 | 每轮修复后更新对应需求状态和交接，保留旧记录为历史，避免旧“不构建 APK”被误用 |
| DEL-001 | 做好先别构建 APK，先给体验 | 当时先给网页试玩、不构建安装包 | 早期网页 ZIP 与历史验证记录；随后用户明确要求最终构建 APK | 已被后指令替换 | 当前按 DEL-003 执行；不再把历史限制当作构建阻碍 |
| DEL-002 | 试玩包下载不下来 | 可公开下载，匿名取回实际字节并核对，不仅检查链接存在 | [V4 网页 ZIP](https://github.com/Yi-Lings/wendao-lingqi/releases/download/v4.0.0-preview/wendao-lingqi-preview.zip)、E13 | 实现 | 用户网络/手机文件管理器无法由云端代验；若再报告失败，记录设备/HTTP 状态并提供备用交付，不把 HTTP200 当成所有用户网络已验收 |
| DEL-003 | 最后直接构建 APK | 构建安装包、签名/对齐、资源完整、公开下载；如签名变更须说明 | `android/app/build.gradle`、[publish-apk.yml](../.github/workflows/publish-apk.yml)、E12、E13；[V4 APK](https://github.com/Yi-Lings/wendao-lingqi/releases/download/v4.0.0-preview/wendao-lingqi-v4-preview.apk) | 实现 | 当前 `com.lingqi.game.preview` Debug/v2 签名，可并排安装；旧私钥未恢复，不能宣称可覆盖旧版升级。安装、真机/WebView、导入导出、返回手势及 30 分钟稳定性未验收 |
| QA-001 | 自查全部内容、美术和需求，迭代完善 | 逐需求追踪、实际读图/页面/玩法审查、修真实问题并复测、给出优先级方案 | 本文件、[迭代方案](ITERATION_PLAN_V4_1.md)、E17～E21 | 部分 | 独立审计和具体源修复已有证据；最终全量回归/新产物待验。后续内容扩展仍为方案，不能称“一切完善” |

## 美术与音频

| 稳定 ID | 原需求 | 可检查的验收标准 | 实际实现/证据 | 状态 | 剩余措施 |
| --- | --- | --- | --- | --- | --- |
| ART-001 | 抽出红卡有华丽、视觉冲击的单独动画 | 道品独立全屏揭示，聚光/阵环/冲击与实际物品图，连续红卡可逐张显示、跳过不丢奖 | `app.js:redRevealModal`、`red-reveal.css`、`item-art.css`；E07、E10 | 实现 | 每轮新道品继续覆盖装备/功法/灵宝真实图片和减少动态偏好；“华丽”需玩家实际反馈 |
| BUG-001 | 红品抽卡演出不显示图标 | 揭示时实际图集裁片可见，不能只保留空框 | `style.css` 的隐藏选择器排除 `[data-atlas-picture]`；E10 九例实际像素证据 | 实现 | 新裁切/主题变更后回归红卡，尤其短屏与连续双红 |
| ART-002 | 美术品级对齐，凡品是铁剑、铁枪等较差装备 | 凡品普通铁/旧布，无高级法阵；每阶材质/工艺递进，名称和武器轮廓一致 | `equipment-art.js` 的 216 名称/图位，`art-identity.js`、`item-art.css`；E04 | 实现 | 图位及材质规范已有实现，仍需本轮逐图语义复核；发现枪/杖、布帽/头盔或凡品光效不符则重新生成并替换映射 |
| ART-003 | 美术可用生图模型直接制作 | 原创生成资源实际入库并被游戏使用，非只提供提示词 | `web/assets/v6-*.png`、`v7-*.png` 和独立剧情背景；E04、E16 | 实现 | 后续新内容按稳定 ID 与名称生成，记录图位/裁切/用途，不把生成结果未经看图就当完成 |
| ART-004 | 残缺美术全部补齐、成套装备补齐 | 可取得的装备/功法/丹药/灵宝/资源/怪物都有对应图；缺少库存也能预览 | `equipment-art.js`、`game-art.js`、`monster-art.js`、`mentor-art.js`；新增 `v8-interiors-atlas.png` 与 `story-infirmary-night.png` 补书院/丹房/雨夜医舍；E03、E04、E18、E19 | 实现 | 已补本轮确证的三处场景缺口并检查实际映射；新篇章的新增场景需按完整内容包另制，不把通用地图当全部室内场景 |
| ART-005 | 原有美术不要删除，放在合适装备等位置，不浪费 | 原文件字节保留；适配资源继续使用或明确归档用途，不强留错误绑定 | 原相符装备/地图/Boss/人物继续用；新增 `art-collection.js` 设置藏画阁收录此前无正常路径的 13 张原图；E16、E17～E19 | 实现 | 13 卷真实浏览器访问/解码/等比显示已覆盖，原 44 PNG 在新增夜景后完整保留；藏画为归档观看用途，不声称每个古画裁片都成为现役装备 |
| ART-006 | 成套装备美术不要复用 | 六套×六部位×六品质不同身份不共享图位/同像素裁片 | `equipment-art.js`、`art-crops.js`；E03、E04；216 图位与像素指纹检查 | 实现 | 同身份在背包/掉落/配装页面应使用同图；禁止不同套装身份互相复用，不要求同一装备在每个页面重新画图 |
| ART-007 | 红装是红色品级，不是本体统一红色；全部按名字改 | 品级框/文字为红，器物依名称、材质、元素配色；名称特效可辨 | `art-identity.js`、`item-art.css`，新六阶装备/功法/丹药等图集；E04 | 实现 | 尤其检查离火六部位各自元素、雷霄枪/杖、回春尺；本轮实际视觉审查若有残余错配，进入重生成清单 |
| ART-008 | 怪物美术对不上，重新生成并新增怪物 | 按稳定物种/对手/Boss ID 绑定；虫、兽、人物与仙兽不互相替代；新怪实际进入战斗 | `data.js:monsters/rivals`、`monster-art.js`、`combat.js`；V7 妖物/对手/仙兽图集；本轮逐 Boss 实测边界、双卫分开肖像/寒鸦分身与本体对齐；E08、E09、E16、E19 | 实现 | 图像语义与实际角色已专项覆盖；后续新剧情对手优先使用现有正确资源，新增身份再生成独立图。新敌人不只换名复用无关物种 |
| ART-009 | 部分资源过度拉伸，检查布局优化 | 场景/人物/物品保持原始比例，图集不露邻格或裁断主体；小屏关键图/操作可见 | `art-crops.js`、`art-layout.js`、各 screen CSS；E03、E04、E09、E10 | 实现 | 浏览器已有比例与完整矩形证据；Android WebView 缩放、系统字体、刘海/导航栏未验收，不能泛称所有设备无拉伸 |
| AUDIO-001 | 全游戏要声音与 BGM | 点击后可听到场景 BGM、战斗/操作/胜败/抽卡/飞升音效；音量/静音/后台合理且离线完整 | `audio.js`、`assets/audio/`；E05；原创仙界《云门长明》和飞升音效 | 实现 | 本轮可复核各实际动作的声音覆盖；没有人声配音需求，不将缺少全对白配音列为缺陷。设备音频策略、输出音量与听感需真机/真人验证 |

## 页面、配装、商城与反馈

| 稳定 ID | 原需求 | 可检查的验收标准 | 实际实现/证据 | 状态 | 剩余措施 |
| --- | --- | --- | --- | --- | --- |
| UI-001 | 每按按钮不要刷新整个界面回到最上，保持位置、丝滑 | 同页操作局部更新，保存滚动/输入/焦点；关闭结算恢复来源；不因计时器反复重挂图 | `app.js:patchPageChildren/renderPage/frame/returnFromActivity`；E02、E04、E07 | 实现 | 本轮继续检查退出独立故事/仪式/仙界后来源位置、所有抽屉返回；流程切页可回页首，不等于所有“返回”应丢失原位置 |
| UI-002 | 不设计单页过长，最好一页就是一页；装备功法单开配置 | 一级页分职责、装备/功法/套装/推荐用独立入口、目录分页；小屏关键动作不藏在长页底 | `app.js` 六主页面及页内标签、独立配置抽屉；[PAGES.md](PAGES.md)；E02、E07、E09、E17 | 部分 | 四视口真实操作、主按钮和短横屏满配战斗已覆盖；套装六部位/图鉴/说明仍可滚动。下一轮按首屏决策与详情分层改善信息密度，不声称所有页恰一屏 |
| UI-003 | 选神通/装备可看图选择，长按看描述，要像游戏 | 图片候选、当前选中/穿戴标识、长按完整属性；滑动取消长按，键盘/详情有替代入口 | `selection.js`、`app.js:loadoutModal/equipmentModal`；E02、E03 | 实现 | 新图位、满背包和奖励快照继续使用同一详情；实际手机触控长按未代验 |
| UI-004 | 战斗单独页放大；理清页面功能、尽量少耦合 | 战斗隐藏普通资源栏/导航，战斗控制集中；剧情/闭关/探索有独立场景；引擎负责规则与奖励 | `app.js:renderEncounter`、`battle-screen.css`、`story-screen.js`、`ritual-screen.js`、`ascension-screen.js`；E07～E09 | 实现 | `app.js` 仍集中大量展示与路由，不能宣称架构已完全解耦；以页面体验及事务边界为验收，持续拆分有真实收益的模块 |
| UI-005 | 大 Boss 战怪物资源放大，有冲击 | 独立大图舞台、威压入场、阵环/雾气/受击；清楚显示气血和技能，不挡操作 | `app.js:bossEncounter`、`boss-stage.css`、`monster-art.js:bossArt`；E03、E09 | 实现 | 新仙阶也使用 Boss 舞台；各旧/新 Boss 的完整主体和读招需逐图实战检查，减少动态效果必须可用 |
| SHOP-001 | 集市能用灵玉或天道尘直接买常规资源 | 两币任选一币、1/5/10 批、价格/余额/实际入库一致；不足或保存失败不扣 | `data.js:resourceMarket`、`economy.js:buyResource`、`app.js:shopModal`；[v3-resource-market.test.cjs](../tests/v3-resource-market.test.cjs)、E07 | 实现 | 明示本地模拟灵玉礼包，无实际支付；不把灵玉/天道尘双币购买误改为要同时支付 |
| GEAR-001 | 增加成套装备按钮、套装效果可配功法 | 六套可进入查看，真实两件/四件阈值与战斗效果，说明功法协同，一键仅装已有可用装备 | `core.js`、`combat.js`、`builds.js`、`app.js:equipmentSetsModal`；E02、E06 | 实现 | 继续用真实施法验证效果，而非只展示文字；新仙界战力/推荐应纳入评估缓存和来源约束 |
| GEAR-002 | 点部位再换装直达当前部位，当前/背包同部位都可替换/长按 | 当前穿戴单列、候选仅当前部位、排除当前 UID、六件分页；详情准确，换装保留部位强化 | `app.js:gearDetail/gear-change/equipmentModal`、`selection.js`；E02 | 实现 | 本轮实测所有六部位，含筛选/翻页/详情返回，防止默认全部背包或覆盖错误部位 |
| GEAR-003 | 待获取套装部件提示去抽卡/刷妖王等 | 缺件有独立预览和状态，展示真实定向打造成本/缺口、所有合适 Boss 条件、抽卡定向条件，点击正确来源 | `equipment-sources.js`、`app.js:gearSourceModal/source`；E03 | 实现 | 抽卡仍需主动保存定向并抽取，不自动消费；未开放来源要显示开放条件而不是无效按钮 |
| BUILD-001 | 功法/神通/装备有推荐最强配装、一键装配，有驱动力 | 根据拥有与境界提供强力综合/流派方案、能力变化和成长目标；一键提交真实装备/心法/神通顺序/秘术 | `builds.js`、`engine.js:equipRecommendedBuild`、`app.js:buildRecommendationsModal`；E02 | 实现 | 现有“构筑评估”为机制启发式，不保证全敌人数学最强；敌人针对性推荐、失败原因、明确下一目标仍应评估。“有游玩驱动力”需要真人观察，不能由一键按钮存在判定 |
| BUILD-002 | 功法应有流派推荐，不能只有名字 | 图卡/详情/图鉴显示流派定位、用途标签、搭配理由、核心伙伴功法与实际来源 | `builds.js:techniqueRole`、`selection.js:renderBuildGuidance`、`app.js:techniqueBuildHint`；E02 | 实现 | 本轮逐技能检查描述与实际战斗机制一致，不把统一“增加伤害”当作每个流派的区别 |
| REWARD-001 | 刷怪结算弹出奖励界面，给正反馈 | 正式胜利展示实际入库/首通/星级/装备与快照；失败/退出/试阵清楚区别，不重复发奖 | `combat.js:settle`、`rewards.js`、`app.js:showBattleSettlement`；E03、E07、E09 | 实现 | 所有新怪/仙阶产出要继续覆盖；历史战报只展示已保存记录，不能当领奖入口 |
| REWARD-002 | 扫荡也要结算页面 | 每次成功扫荡自动显示实际数量、储备消耗、入库与来源返回；不计首通 | `activity-rewards.js:sweepDungeon`、`app.js:showActivitySettlement`；E07 | 实现 | 自动重复操作要保持正反馈与连续性；保存失败不显示成功 |
| REWARD-003 | 所有打怪、炼丹等都要结算 | 即时/队列收丹、打造、任务/委托、共修、主动采获、分解/退款有真实结算；离线/突破/飞升有对应反馈 | `activity-rewards.js`、`rewards.js`、`app.js` 对应结果；本轮新增 `exchangeDust` 实际随机装备/灵宝结算、`advanceCelestial` 晋层结果；E07～E09、E17、E21 | 实现 | 新触发已源修，完整性 9/9 已覆盖，最终全量计数/产物待冻结；队列开始/部分控火不假称完成。常规集市连续买即时反馈，自动生产不为每个被动 tick 弹窗 |

## 剧情、修炼流程、规模与研究

| 稳定 ID | 原需求 | 可检查的验收标准 | 实际实现/证据 | 状态 | 剩余措施 |
| --- | --- | --- | --- | --- | --- |
| STORY-001 | 剧情更侧重、有代入感，不能点选项直接完成 | 独立多幕：对白、调查线索、选择、承诺后的真实行动、途中/归来对白，读完才奖励；位置可恢复 | `story-scenes.js`、`story.js`、`story-screen.js`；E08、E15 | 实现 | 已有六卷三任务与十八支线，但角色表现、选择影响、故事易读性仍需逐幕审阅/真人体验；对白条数不是沉浸验收 |
| STORY-002 | 突破不能简单打怪，重梳剧情和整体修炼 | 先同境丹药/阵材，调息/布阵/问心，再实际渡劫和破境；失败重试不多扣，取消真实退款 | `breakthrough-ritual.js`、`ritual-screen.js`、`engine.js`；E08、E15 | 实现 | 仪式仍是无需抢拍的选择交互和真实战斗；不能描述成动作式渡劫。六境问心回应和剧情记忆是否足够差异化需继续体验审查 |
| GROWTH-001 | 突破前必须材料如筑基丹，有引导获得 | 六种当前境界可研究/炼制突破丹；明确丹方/炼丹/护阵总需求与不足，点击前往对应分页/副本/来源 | `data.js:recipes.break0..5`、`breakthrough-ritual.js:view`、`ritual-screen.js:preparation`、`app.js:ritualAcquire`；E08 | 实现 | 所有必需材料应在解锁前可取得，提前备料不会循环锁定；新材料引导保持精确总需求，不只列护阵费用 |
| STORY-003 | 剧情庞大、不短、整体修炼与心流更多 | 有连续身份变化、章间目标、新场景/挑战与后期延续；阅读行动交替；没有不知道下一步的隐形门槛 | 本轮 `story.js:missingRequirements/requirementNav`、`story-screen.js` 和札记已显示缺项/进度/逐项来源；E17、E20 | 部分 | 旧目标误导已修并专项验证；真实单主线仍约五千字符，36 个阶段只有 21 种目标，11/24 篇两选择同目标。下一轮按六卷场景与任务差异扩展，并用真人验证心流 |
| STORY-004 | 参考王道修仙网文爽点，前期斗技、秘境夺魁 | 原创散修到宗门认可、人物回应、实际三轮斗技/三轮秘境，夺魁有首胜物资/称号且可保存 | `data.js:arena_0..2/secret_0..2/rivals`、`combat.js:competitionsView`、`story-scenes.js`；E08、E15 | 实现 | 夺魁后的下一行动和认可要清晰，避免完成高潮又面对模糊旧条件；不直接复刻特定网文剧情/人物 |
| FLOW-001 | 体量大，可以往 1GB 或七八百 M，不规定大小，注重心流 | 增长来自可玩的原创系统/故事/音画；以首 30 分钟目标、活跃/等待比例、阶段反馈、难度与长线选择评估，不凑文件 | V4 多幕/双路/仙界和新增音画；E14、E15、E20；原 APK 126858599 字节 | 部分 | 现有主线是中短篇可玩骨架，仙阶同构，未满足大型内容的深度目标。没有字节下限/上限；按迭代方案补独立场景、分支后果、新目标与仙界链，待真人心流证据 |
| ASC-001 | 应该可以飞升 | 完成真实人界终境/终章后：来信、立誓、备料、天门新实战、告别/飞升；仙界可继续成长与取得实际资源 | `ascension.js`、`ascension-scenes.js`、`ascension-screen.js`、`data.js:heaven_gate/immortal_*`；E09、E15 | 实现 | 三阶各十层与日常猎场/试炼已可玩；仙阶是否过于重复、仙界视图和推荐是否一致需本轮体验审查，不能仅因三组层数就认定长线深度满足 |
| RESEARCH-001 | 参考一念逍遥模式，大量搜索资料 | 使用可核实实际正文，多主题记录来源/版本/限制，区分参考机制和本作实现 | `docs/research/`；E14 覆盖成长、丹药、材料、功法/构筑、竞技、宗门、飞升等 | 实现 | 后续新增机制继续用来源核实和本项目设计，不把旧海外攻略数值当当前国服准确数据；不把搜索失败结果当来源 |
| DESIGN-001 | 先头脑风暴，再做游戏，最后构建 APK | 比较方向和约束，记录选定循环与本轮实际范围，然后实现、验收、构建 | [BRAINSTORM_2026-10-07.md](research/BRAINSTORM_2026-10-07.md)、音画/仙界增补、源码检查点和 E12 构建日志 | 实现 | 本轮用户自查再次要求完善，应以本表缺陷/未验证项排优先级，不用后补“全部完成”文档覆盖事实 |

## 本轮具体收口措施

1. **已源修，最终回归待冻结：存档与奖励。** 原生导出使用独立导出快照，不覆盖正式槽；提交后展示失败保留已提交状态；尘兑换和仙修晋层显示真实结果。另需绑定 APK 与原生/网页/构建关键源码，防止 Java-only 修改重发旧 APK。本轮发布关键源码绑定已实现且 13 项定向检查通过；新版导出 DEX 检查如预期拒绝旧 V4 实际包，新编译验证待执行。当前 Android 源码版本为 4.1/code5，不称新 APK 已构建。
2. **已修且专项覆盖：下一目标、美术与小屏操作。** 剩余条件和入口、对手名字、仙阶战后语气、地图/室内场景、表情、双卫/Boss 裁切与身份标题均有具体源修；13 卷原图归档可访问。E17 九组/68 张截图及 E19 逐图报告覆盖这些行为；不自动覆盖新的冻结产物或所有设备。
3. **部分，下一内容批次：长篇与真实差异。** 优先完成专属制作计数与任务迁移、只读全文重读、两条路线术语，再扩第一/第二卷差异任务和三条仙界多幕链。每个新增目标必须有保存、来源、失败重试、真正发奖与视觉，具体场景/优先级见 [迭代方案](ITERATION_PLAN_V4_1.md)。
4. **待验证：自然节奏。** 普通新档、两路线、两剧情倾向、零抽卡策略与真人观察分开记录；每 3～5 分钟是否有明确可做目标是下一轮观察目标，不是已通过结论。不用七日粗模拟计算强制等待日程，也不拿试玩夹具证明平衡。
5. **待实际设备：安装与恢复。** Android 8 与近期系统、不同 WebView、断网/后台/重启、文件选择器取消/失败、试玩模式进程重建、真实旧档导入、返回手势与 30 分钟性能/发热。没有设备时保留未验收；原 V4 包审计通过不替代当前修复包或设备结果。
6. **待完成的交付顺序。** 代码/资源/证据提交并推送 → 冻结源码 → 全量逻辑及受影响浏览器 → 构建/审计确切 HTML 与 APK → 更新分片和绑定 manifest → 发布 → 匿名下载复核 → 回写计划/交接和本表。只有实际执行并留证后，才能将对应待验项改为完成。

## V4.1最终冻结检查

源检查点d1519c3，326/326逻辑、32/32通用浏览器、9/9 UI、9/9完整性、9/9红品像素、10/10故事闭关、4/4飞升及95布局通过；单HTML24通过/0失败/1受管file跳过。原生实际DEX6项导出边界、106文件字节一致、114构建输入绑定、v2签名/证书/zipalign通过。本轮新增源修、45PNG及证据均在work；公开下载与当前交付见 [V4_1_ALIGNMENT_2026-10-07.md](validation/V4_1_ALIGNMENT_2026-10-07.md)。长篇内容、真人心流、真机、新任务恢复等未验项保持上表状态，不因检查数量变成完成。

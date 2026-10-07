# 问道·灵契接手说明

更新时间：2026-10-07。第19节命名美术/生产结算版本已交付；当前继续第20节沉浸剧情、闭关与怪物美术迭代，正在实施。不要把历史试玩当本轮新版，不构建APK。

## 用户目标与约束

继续问道·灵契。旧会话 `codex://threads/01a10c60-ac24-706e-ad66-20d3ae130025?hostId=durable` 无法加载，原因未获证实；当前仓库与历史提交已用于继续完成项目。

- **先网页体验，不构建、上传或更新APK**；原Android包保持不变。后续只有用户明确修改该要求时才进入Android构建。
- 红装表示红色品级；器物按实际名称、元素、形状和材质着色。凡品为普通铁器/布衣，套装各部位独立图片。
- 原美术保留并用于合适装备/场景；原26 PNG、14 MP3保持原字节，新增10张v6图集。
- 打怪与主动生产/收获给真实结算反馈，保存后展示，关闭不重复发奖，失败回滚，返回来源输入/位置；普通集市连续购买即时反馈。
- 所有完成代码/资源提交GitHub；持续更新plan/handoff。

## 本轮接续检查点（实施中）

六章主线每章三段真实行动，18条支线可恢复场景；调查、抉择、行动、回应与最终领奖分别推进。新增前期斗技/秘境三轮实战。大境突破要求同境丹药、灵莲与玄铁，并采用调息、布阵、心魔和实际渡劫流程。用户刚反馈怪物美术错配和红品抽卡图标缺失，需修复后加入验证。体量随有效内容增长，不定大小、不填充。

分工：story_content 场景数据与设计；story_engine story/core存档与门槛；breakthrough_ritual 闭关模块；immersive_ui 剧情/闭关页面；arena_and_art data/combat、竞技和新美术；story_qa 回归/浏览器；根 app/engine/index/preview 接线、文档与GitHub/网页交付。所有代理共享checkout，避免同文件改写；根统一提交。

本轮新增模块依赖顺序：data → story-scenes/breakthrough-ritual → core → economy/combat/story → engine → story-screen/ritual-screen → app。前一轮结论和下方下载只属于已交付历史版本。本轮尚未完成测试或发布，接手需读取工作树与 plan 第20节。

## 仓库、已发布版本与下载

- 仓库 `Yi-Lings/wendao-lingqi`；工作目录 `/workspace/wendao-lingqi`；开发分支 `work`。
- 核心取图源码检查点 `72bcc1891ced993667a510229c14aeaf8c100174`；测试/证据提交 `4ea6e7e296de563a985dbd2170ab0d776cb46928`；两者网页源码字节一致。
- [GitHub网页迭代分支](https://github.com/Yi-Lings/wendao-lingqi/tree/web-preview-download-20261006)包含所有本轮代码、资源、测试和文档。发布提交 `6c9da807b9934add2daf62a1123d7d139e633a40`；随后说明文档同步不会改变已验收HTML。
- [新版离线网页试玩](https://github.com/Yi-Lings/wendao-lingqi/releases/download/v3.0.0/wendao-lingqi-preview.zip?revision=6c9da80)：ZIP103600843字节，SHA `5104910e4cd3d42d75bd9679dbf94e3a5b07dca5f121f07d54f833a6fa1f75b3`。解压后Chrome/Edge打开HTML，首次交互启用声音。
- 内部HTML138278189字节，SHA `de1f18e605a6741f24ec48fca3aa55616c4a1fe8dc0a3335c65819d55f9d29d4`。36 PNG、14 MP3、SVG、audio manifest全部原字节内嵌，共52资源。
- 仅网页run `37575167224` 成功；匿名HTTPS下载HTTP200，ZIP/公开checksum/CRC/内部HTML与本地测试一致。原APK和main均未改。
- 完整验收：[NAMED_ART_PRODUCTION_2026-10-07.md](docs/validation/NAMED_ART_PRODUCTION_2026-10-07.md)。机器证据和实际截图在 `docs/validation/named-art-production-2026-10-07/`。

## 已完成的游戏能力

历史基础：六个主页面、同页位置/焦点保留、独立战斗/Boss/洞天、红卡独立动画、图片选择/长按详情、3 BGM+11音效、灵玉/天道尘直接补给、套装2/4件真实效果、最强配装/流派推荐与一键装配、部位直接更换、缺件真实获取指引、战斗/首通/洞天与历史结算。历史验证见 `docs/validation/SET_ART_REWARDS_2026-10-06.md`。

本轮美术：216装备、48功法/神通、12灵宝、18丹药、36功能图标，共330个实际独立图位。美术方向 `docs/ART_DIRECTION.md`、完整命名和新旧图位 `docs/ART_ASSET_MANIFEST.json` 已受Git跟踪。旧青锋剑/蚀魄刃保留道品映射；旧黑金甲迁至天灵宝甲，旧白绿扇迁至灵木扇；道品玄武甲/四象扇/雷霄杖使用正确龟甲/四象/环首法杖。品级框与15种元素光色分开表现，物品没有染色filter，凡/灵品无魔法光效，减少动态效果生效。

实际绘制分隔不等分，不能把1254/6当作所有物体边界。`web/art-crops.js`保存十张新图集的实测矩形，`art-identity.js`输出归一化 `data-art-crop`；`art-layout.js`建立独立 `[data-atlas-picture]` 背景窗口，contain完整矩形，外框留白且不露邻格。旧图沿用原cover裁片。最后一行偏高时图片略窄是正确比例，不应改成拉伸或重新等分。图标修改需要保持MutationObserver空闲稳定；classList移除/增加前先检查，避免无效属性更新循环。

生产结算：`web/activity-rewards.js/css`，`web/app.js`保存成功路径与来源恢复。支持扫荡、即时成丹、队列收丹、打造、悟道、委托/主线/支线、共修完成、溢出领取、分解/退款、非战斗洞天采获。依据真实前后差额显示产量/消耗与装备UID，控火加成、奖励暂存、尚未携出各自说明。保存失败不显示成功；关闭/X/遮罩/Escape/原生返回恢复来源状态。丹药/丹方也能长按详情，修行/突破/战斗用途分别说明。普通buyResource/exchangeDust、设置和自动秒产不弹窗，原战斗结算优先。

## 验证与本地启动

最终Node231通过；新增生产/命名图32通过、配装22、音频布局24、来源/战斗结算24。通用玩法32项在精确取图前通过；之后针对最终取图重测上述专项。最终HTML23通过、0失败、1个file://受管策略跳过，所有错误/404/外部请求为0。330实测原生矩形像素指纹独立，26原图SHA一致，1500ms图标无重复变化，360×640/390×844/1440×900奖励与返回按钮可见。

`file://`在平台Chromium被禁止，不能宣称该协议已通过。实际单文件载入后断网交互已验证，另在预先断网opaque HTML Blob中独立解码37图/14音频、HTTP0。138MB完整HTML超过单条CDP传输限制；浏览器测试用17段构造Blob，再回传全部字节校验SHA。不要退回一次setContent发送超大文件，也不要把传输失败当游戏缺资源。

云环境使用 `cloud-environment-onboarding:setup`，现有checkout不创建worktree。已保存start_skill草稿，供新任务使用需在环境设置保存并发布；没有宣称新任务快照验证。当前Node24.19、Python3.12、Chromium151、`qa-tools/node_modules/playwright`可用。环境恢复不保留进程，服务需重新启动：

```sh
cd /workspace/wendao-lingqi
python3 -m http.server 8787 --bind 127.0.0.1 --directory web
```

另会话用curl检查服务，`npm test`检查逻辑。浏览器脚本设置 `LINGQI_ROOT=/workspace/wendao-lingqi LINGQI_CHROMIUM=/usr/bin/chromium`；HTTP脚本为browser-v3、browser-equipment-builds、browser-audio-layout、browser-sources-rewards、browser-activity-named-art；`python3 tools/build-web-preview.py --zip`生成HTML/ZIP，browser-preview-file检验最终文件。以报告实际时间/目标为准，不使用dist中过期失败截图或旧报告作最终状态。测试存档不证明自然经济平衡或Android真机表现。

## 下次迭代与发布方式

本轮范围无剩余代码/资源待提交项。下一轮先基于用户试玩反馈继续改动；保持独立页面、真实奖励、旧存档兼容与原资源保留。Android真机/WebView/30分钟稳定性尚未验证，当前没有APK更新授权。

临时旧worktree `/tmp/wendao-web-preview-delivery`已在环境恢复中丢失；已用普通共享checkout `/tmp/wendao-web-preview-delivery-recovered`恢复发布。临时路径下次也可能消失，不依赖它作为唯一源代码。使用现有checkout或普通临时clone保留分支，按实SHA合并（临时clone没有本地work分支ref），不重建worktree、不丢弃工作目录改动。

发布分支专用 `.github/workflows/publish-apk.yml`实际仅workflow_dispatch网页任务，开发分支同名原文件是APK流程，**不能误执行开发/main版本**。Actions列表可能缓存旧名称，必须核对实际唯一job=`publish-web-preview`。步骤：提交源码/资源/测试，合并发布分支，更新HTML固定大小/SHA校验，push `[skip ci]`，`gh workflow run publish-apk.yml --ref web-preview-download-20261006 --repo Yi-Lings/wendao-lingqi`；成功后匿名下载ZIP核对SHA/CRC/内部HTML，再回写plan/handoff。

直接 `gh release upload`曾被平台代理以400 BadContentLength拒绝，已改用Actions上传，不要重试直接上传或索要新令牌。复用平台HTTPS认证和CA，不输出凭证，不关闭TLS。`audit-apk.py`位于仓库根目录，新资源清单已维护并语法检查，当前不运行APK审计/构建。签名/个人存档/缓存不提交。

APK保护基准：asset615156452，48035951字节，SHA `7c90a5e6870b8cb1b124af1f5325b75715e0d4fb7b11519a2b64702268343597`，更新时间 `2026-10-06T10:12:59Z`；checksum asset615156454，87字节，SHA `7078e1d69f3d70916cf2ca518d265d882f85024032336e1edb952d6299e859ee`，更新时间 `2026-10-06T10:12:57Z`。main=`28d4dcee4281b9ae713510f4e5e6e61ecf8802b6`。

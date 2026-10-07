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

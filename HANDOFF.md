# 问道·灵契 V4 接手说明

更新：2026-10-07。用户最新要求先大量研究、头脑风暴，再制作并直接构建APK；该要求覆盖历史“不构建APK”指令。当前游戏内容与主要QA完成，正在构建及公开交付，未把历史下载当作新版。

## 源码与当前交付

仓库 Yi-Lings/wendao-lingqi，目录 /workspace/wendao-lingqi，工作分支 work，所有代理共享此checkout；不创建worktree。先检查git status并保留当前变化。首批已推送786cb2e，随后飞升/研究/音画/测试与打包文件正在统一提交。main的历史V3源码保留，不依赖main拿本轮内容。

V4发布目标是 v4.0.0-preview：APK wendao-lingqi-v4-preview.apk 与离线ZIP wendao-lingqi-preview.zip。APK包名com.lingqi.game.preview、版本4.0/code4、最低Android8.0；本环境缺旧发布私钥，使用Gradle调试签名，可与旧com.lingqi.game并排安装。旧角色从旧应用导出JSON后在体验包导入。不要声称覆盖升级。最终大小、SHA、Actions与匿名下载证据将写入 docs/validation/V4_ASCENSION_APK_2026-10-07.md。

历史V3资源和发布保留，历史网页交付分支web-preview-download-20261006、本轮之前ZIP103600843字节/HTML138278189字节均不是V4。旧APK48,035,951字节，SHA7c90a5e6870b8cb1b124af1f5325b75715e0d4fb7b11519a2b64702268343597；本轮独立包不替换此asset。

## 已完成

- 原有六主页面、图片配装/长按、独立战斗/洞天/红品动画、216独立装备图位、六流派套装与推荐、常规资源双币购买、真实战斗和生产结算继续保留。
- 六章各三段真实行动，十八支线多幕场景，调查/抉择/回应/归来与最终奖励单独保存；不是点选直接结束。故事与闭关均全屏，退出或跳活动可恢复。
- 闭关必须同境突破丹及灵莲玄铁；调息/布阵/心魔后正式渡劫。费用预扣一次，取消退款，失败可重试，旧真实渡劫记录兼容。
- 三轮斗技、三轮秘境夺魁、六名人物对手、20物种明确映射；大Boss和仙兽独立放大舞台。
- 六境圆满与终章后可立道誓、备料、挑战天门飞升。登仙/真仙/金仙各十层，以仙界静修、历练、仙元与境界挑战继续成长；三位仙界人物来信按实际进度开放。
- 新7 PNG、2 MP3与独立音频manifest。当前43 PNG/16 MP3；原36 PNG与14 MP3、旧manifest逐字节不变。仙界NPC共12表情全部接入对白；4首配乐/12效果音。
- 红品图标缺失已修复，保留data-atlas-picture。实测图集裁片由art-crops/art-layout等比例呈现，不拉伸、不露相邻图；旧素材按合适名称/物种使用。
- 23实质研究来源、可复核获取manifest与头脑风暴选择见docs/research。联网宗门、灵兽养成、法则等列为后续规划，不能声称已完成。

## 模块与存档

index顺序：data、art/monster/mentor映射、story-scenes、ascension-scenes、breakthrough-ritual、ascension、core、economy/combat/story、engine、各独立screen、app。引擎保存模式先计算/校验/持久化成功，再展示奖励；场景与动画不二次发奖。

story.journeys保存阶段、线索、抉择、基线、任务索引。ritual/ritualHistory/ritualLegacyWins独立保存真实仪式和旧胜绩。ascension为严格规范化可选对象，人界双路线六境索引不扩；仙界三阶独立统计。所有奖励、开门条件、仙元与修为来自真实行动。纯演练不计进度/奖励。

设置三个入口：正式lingqi-save-v2，人界lingqi-preview-save-v1，天门lingqi-ascension-preview-save-v1。源网页默认正式；?preview=1为人界，?preview=1&immortal=1为天门。单文件默认人界，?preview=0回正式。试玩含明示进度/资源，不是自然经济证据。原生仅正式调用Native.persistSave，试玩不覆盖正式内部档；MainActivity.isEntry明确白名单允许三模式URL。

## 已验收与边界

297逻辑、32通用浏览器、29美术/生产、10故事/闭关、4飞升专项通过；95仙界布局组合全按钮完整可见，零脚本/缺资源错误。装备、功法、灵宝三类红品在9个视口/物品组合验证实际裁片像素。双路线真实动作无注入、无抽卡、最高紫装跑完六境、终章、三仙阶及金仙圆满；等待模拟每次最多跳七日，不能把其4200/4368小时当最低通关时长。首次30分钟的可复核引擎节奏另见FIRST30文档，动作3秒假设不是真人阅读时间。

原生实际Java入口19组URL检查通过。待最终单文件/APK结果以V4文档为准。没有adb、模拟器或Android设备，不能把Linux编译、签名和浏览器通过当作真机/WebView/文件选择器/返回手势/30分钟稳定性验收。

## 本地恢复与构建

环境保留工具和缓存，不保留进程。已有端口服务先检查，仓库根目录可用python3 -m http.server 8787 --bind 127.0.0.1 --directory web启动；curl核对HTML，再做真实浏览器进入。npm test不需要npm安装。Playwright在qa-tools/node_modules/playwright，Chromium/usr/bin/chromium；LINGQI_ROOT/LINGQI_CHROMIUM变量参照测试。

source /workspace/cloud-setup/env.sh，Gradle8.9/JDK17/SDK35与AGP缓存在/workspace/cloud-toolchain。gradle --offline --no-daemon --max-workers=2 -p android :app:assembleDebug。旧tools/android只保留aapt2和lib64链接，旧tools/signing私钥不存在，不能运行旧release脚本冒充升级。audit-apk.py传--package-id com.lingqi.game.preview --version-code 4 --version-name 4.0；SDK35的apksigner/zipalign验证。tools/check-android-entry.py运行实际Java入口边界。

python3 tools/build-web-preview.py --zip生成单文件，browser-preview-file验证该确切HTML。受管Chromium禁止file://，明确跳过；HTTP载入后断网与预先断网opaque Blob是独立可证实检查，不绕过策略。大HTML通过8MiB分块传入Blob并核对原字节SHA，不使用一次CDP传输。云设置已保存完整install_script/start_skill草稿，包含V4构建和审计参数；保存不等于发布，新任务恢复尚未独立验证。

## V4提交与发布

所有源码资源/测试文档先提交work [skip ci]，再构建冻结源码。APK以24MiB分片放releases/parts-v4，每片及全包SHA和公开证书指纹写manifest，私钥/存档/缓存不入库。tools/assemble-apk.py保持V3默认并支持显式V4参数，重组必须字节相同。

.github/workflows/publish-v4.yml仅手动运行，--ref work。它跑npm，重组确切APK，重建HTML并比对releases/v4-artifact-manifest.json固定hash，审计全源码assets/包名/版本/v2签名/证书，再创建独立预发布。通过后匿名HTTPS下载APK/ZIP与checksum，核对SHA、ZIP CRC和内部HTML；更新plan/handoff。直接gh release upload曾被平台代理BadContentLength拒绝，使用Actions上传，不索取新令牌。复用平台代理认证/CA，不输出凭证、不关闭TLS。

旧会话无法加载的原因尚未证实；现有仓库、历史提交和资源已足以继续，当前无代码/资源依赖旧对话。

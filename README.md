# 问道 · 灵契 V3

原创安卓竖屏单机修仙游戏：逐层修行、六流派功法构筑、自选副本、装备炼丹、天道感应与剧情同行。游戏资源随 APK 打包，安装后离线运行。

GitHub 仓库：[Yi-Lings/wendao-lingqi](https://github.com/Yi-Lings/wendao-lingqi)。个人发布 APK 的仓库路径为 [`releases/wendao-lingqi-v3.apk`](releases/wendao-lingqi-v3.apk)，在完成发布构建后生成；源码构建输出为 `dist/lingqi-game.apk`。

## 已实现的玩法

- **120 个成长节点**：炼体、修法各六大境，每境一至十层。小层晋级保留溢出修为；大境需要圆满修为、试炼与材料，成功提交后确定突破。
- **48 部功法**：12 心法、24 神通、12 秘术，分剑意、金身、雷法、五行、玄冥、丹阵六流派。实际配置为一心法、最多四神通和两秘术，支持分支、研习、重置与三套预设。
- **六类历练**：五方向资源秘境、六宗门入门/进阶试炼、12 妖王、60 层问道塔、三主题洞天、突破试炼。可查看奖励和来源，自由回刷已开放内容。
- **半即时战斗**：自动出招或手动施法，支持转火、打断、净化、护盾、战术暂停、自动施法条件、免费试阵及限次妖王自动重战。
- **装备最高红色**：白、绿、蓝、紫、橙、红六品质，六部位、六套装、两件/四件组合；强化随部位保存，支持打造、洗炼二选一、锁词条、重铸、红装觉醒和分解保护。
- **天道感应**：抽取装备、灵宝、功法、丹药和材料；公开当前奖池、概率与历史，十抽橙及以上保底、八十抽红保底、指定基础目标最坏一百六十抽。
- **洞府养成**：18 丹方、12 灵宝、五设施；普通炼丹基础必成，可批量炼制；支持保存炉队列、三轮控火加成与取消退款。灵草、矿石、灵莲、参悟与炼器精华分别生产。
- **完整故事目录**：六章主线、18 支线、三结局、三位成年伙伴；宗门委托按实际行动累计，共修采用三轮灵息节律玩法。

全部角色为成年人，入口要求玩家确认年满 23 岁；伙伴关系与共修使用含蓄叙事。该年龄声明不构成官方内容评级。

详细操作见 [V3 玩法说明](docs/GAMEPLAY_V3.md)，设计依据与首发目标见 [plan.md](plan.md)。设计稿中的调参目标、未来细节与已经实现的行为需要分别理解。

## 浏览器本地运行

需要 Python 3；从仓库根目录运行：

```sh
python3 -m http.server 8787 --bind 127.0.0.1 --directory web
```

打开 <http://127.0.0.1:8787/>。网页无需 npm 构建，建议使用近期 Chrome、Edge 或更新后的 Android WebView。存档按浏览器的地址、端口与用户配置隔离；切换地址前可先导出 JSON。

## 逻辑测试

需要 Node.js 18 或更新版本，逻辑模块和测试不依赖第三方 npm 包：

```sh
npm test
```

也可以显式运行本次 V3 的七个测试文件：

```sh
node --test tests/v3-catalog.test.cjs tests/v3-core.test.cjs tests/v3-economy.test.cjs tests/v3-combat.test.cjs tests/v3-story.cjs tests/v3-facade.cjs tests/v3-alchemy.cjs
```

`tests/browser-v3.cjs` 是单独的 Playwright 浏览器检查，需要额外准备 `qa-tools` 下的 Playwright、Chromium headless shell 和可用中文字体，再启动上面的本地服务。设置 `LINGQI_ROOT` 为本机仓库目录、`LINGQI_URL` 为服务地址；浏览器路径不同时使用 `LINGQI_CHROMIUM`：

```sh
LINGQI_ROOT="$PWD" LINGQI_URL="http://127.0.0.1:8787/" node tests/browser-v3.cjs
```

旧版 `engine.test.cjs`、`ui.cjs` 属于 V2 回归资料，不代表 V3 验证；V3 的测试入口不执行它们。

## Android 构建

最低 Android 8.0（API 26），目标与编译 API 35，包名 `com.lingqi.game`，版本 3.0、versionCode 3。

标准开发构建使用 Java 17、Gradle 8.9、Android SDK platform 35 与 build-tools 35.0.0：

```sh
gradle --no-daemon -p android :app:assembleDebug
```

输出 `android/app/build/outputs/apk/debug/app-debug.apk`。GitHub Actions 的 Android 工作流运行逻辑测试并生成 debug APK，使用调试签名。

保持既有个人发布签名时，准备精简工具链与原签名：

```sh
python3 tools/prepare-tools.py
sh build-android.sh
```

首次工具下载需要网络。发布脚本仅使用已有签名，可通过 `LINGQI_SIGNING_DIR` 指定私有目录；缺少原签名时停止，不创建新密钥。Debug 包或不同签名无法覆盖原个人发布包，请先导出存档再更换安装。

详细要求、原生保存接口与设备检查边界见 [Android 说明](android/README.md)。私钥、个人存档、工具链二进制和构建缓存不进入仓库。

## 存档与实际限制

关键操作先校验、计算并保存，再展示成功；写入失败撤回该次操作。Android 内部文件使用 AtomicFile，导入/导出使用系统文档选择器。JSON 上限为 1 MiB，检查版本、稳定 ID、数值、装备 UID、进度与嵌套结构。

V1/V2 存档可迁移：保留旧大境并落在该境一层，旧修为进入储备；白/绿/紫/橙身份、资源、装备 UID、强化投入、剧情与伙伴关系保留。迁移后原路线攻击、防御、气血不足时提供传承补偿，并记录迁移报告。

修为离线最多结算 24 小时，设施生产最多七天，悟道券最多储存七张，扫荡储备最多八小时。后台战斗暂停，首次挑战、剧情、洞天选择和大境突破由玩家主动完成。

清除浏览器数据、清除应用数据或卸载会失去本机进度，请定期导出备份。离线存档可以被持有者修改，结构校验用于发现损坏，并不提供联网防作弊保证。

目前采用原创静态插画、图集与程序绘制战斗反馈；宗门和伙伴均为本地 NPC。没有现金支付、服务器联机或真人竞技。长期经济与各流派全流程平衡仍需持续试玩。

编译、签名、Node 与浏览器检查不等同于 Android 真机验证。系统文件选择器、返回手势、不同 WebView、进程恢复及连续 30 分钟运行需在实际设备上确认；验证记录由发布流程更新。

## 当前上传版本

2026-10-06：源码、Android 工程、十张原创美术图集与测试已提交。`npm test` 的 101 项逻辑检查通过；基础浏览器检查 26 项通过，新增炼丹与表情联动仍需最终回归。签名 APK 尚未发布，仓库中的下载路径为后续构建预留。

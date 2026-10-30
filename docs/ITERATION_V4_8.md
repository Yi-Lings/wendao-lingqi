# V4.8「一击可闻」

本轮先做全系统爽感审计（[爽感审计](review/JUICE_REVIEW_V4_8.md)），发现的核心问题是：**数值涨得很快，但玩家看不见它涨**。`data.js` 的成长曲线并不慢，可是暴击率最高 65%、暴伤最高 2.8 倍的战斗数值，在默认界面里只表现为一段折叠日志里的一行文字。

因此本轮只补呈现与信息，不动经济、掉落、敌人强度、经验曲线与存档版本。

## 实现

### 1. 战斗打击反馈（J01–J05）

`web/combat.js` 在结算处产生有界事件流 `b.feedback`，而不是让界面去猜 HP 差值：

- `hit` / `crit` / `dot` / `kill` / `heal` / `player` 六种 `kind`
- 每条记录目标序号、实际数值、溢出量（overkill）与是否会心
- 上限 32 条，超出丢弃最旧的一条；`core.js` 的 `validateBattle` 显式校验类型、目标范围与长度，非法存档会被拒绝

`web/combat-fx.js` 是新增的**纯函数**模块（不依赖 DOM），把事件流翻译成飘字条目与连击档位，因此可以直接在 Node 里测试。`web/app.js` 只负责挂载与定位：

- 飘字层 `#combat-fx-layer` 挂在 `app.innerHTML` 的 `game-shell` 末尾，**不在** `renderEncounter` 的 patch 子树内，避免每 250ms 的重渲染打断动画
- 每帧先 `consumeCombatFx()` 取出事件，再 `persist`，最后 `spawnCombatFx()`，所以事件不会被写进存档再回放
- 敌人卡片新增 `data-enemy-index`，用于把飘字锚到具体目标；玩家受伤锚到气血面板

`web/battle.css` 补齐：

- 普通敌人 `.enemy-card.hurt` 闪白。此前只有 `.boss-target.hurt` 一条规则，而它是把动画关掉的（`battle.css:1432`），等于所有敌人被打中都没有反应
- 飘字上浮淡出，深色描边保证在亮色美术上可读；会心金色放大
- 击杀显示「击破」，溢出伤害显示「溢伤」
- 连击徽标按 3 / 6 / 12 分三档

`prefers-reduced-motion: reduce` 下：飘字改为静态短显、不位移，受击改为描边而非闪白，连击徽标不再脉冲。

### 2. 会心音效（J03）— 本轮不做

新增音效需要新增 MP3 资产，会牵动 `tools/compose-audio.py` 的确定性合成、音频 manifest、APK 资源审计与离线单文件的嵌入体积。为一个音效改动这条二进制资产链不划算，本轮保持原样，记入后续。

### 3. 战报可量化（J06）

`combat.js` 在战斗过程中累计 `performance.damageDealt / maxHit / crits / kills`。`core.js:562` 对 `performance` 是开放数值字典校验，因此**没有改存档版本**，旧档照常读取。

战报界面新增「本场输出」：总输出、最高单击、会心次数、击杀数、承受伤害，并在同一副本有上一场记录时显示增减。

### 4. 稀有战利品节拍（J07）

结算原本已有错峰入场（`rewards.css:17`），审计初稿的判断已在复核中更正。本轮只补「稀有与普通没有区别」这一条：`rarity>=4` 的卡片在入场之后多扫过一道品级色光，减少动态效果时不播放。

### 5. 破境落差（J08）

突破结果页新增攻击、气血、战力的前后值与百分比。数值取 `E.view()` 对突破前后真实状态的两次求值，不做估算；取不到快照时整块不显示。

## 顺手修的

`tests/browser-v46.cjs` 与 `tests/browser-v47.cjs` 在读取 `LINGQI_CHROMIUM` **之前**就 `readdirSync(qa-tools/browsers)`，在没有该目录的机器上直接抛 `ENOENT`，等于这两个套件无法在自带浏览器的环境运行。已改为先判断目录是否存在，并在两者都缺失时给出明确提示。

`tests/v3-artifact-provenance.cjs` 的符号链接用例在 Windows 非管理员环境下必定 `EPERM`。现在明确 `t.skip` 并打印原因，而不是伪装成通过。

## 验证边界

逻辑测试覆盖事件生成、边界、会心标记、存档往返、旧档兼容与非法输入拒绝；浏览器检查覆盖飘字出现与消失、受击闪白、连击徽标、敌人序号锚点。

这些通过只说明**行为符合规则**，不说明游戏已经好玩。真人手感、爽感强度与长期平衡仍需试玩；本轮没有 Android 真机验证。

## 验证与交付

**476 项逻辑（475 通过、1 跳过、0 失败）；浏览器 245 项全部通过** —— 234 项源页面 + 11 项真实 `file://` 离线检查。浏览器检查用本机 Microsoft Edge 经 Playwright 驱动，不是 CI 的 Chromium headless shell。完整记录与截图见 [验证目录](validation/v48/README.md)。

离线单文件试玩包已构建并验证：HTML 231,052,349 字节、ZIP 172,980,158 字节，77 项资源内嵌，离线套件连续三次 11/11、零页面错误、零外部请求。源码包 1,583 个文件、475,046,525 字节。

本轮修掉了一处**测试竞态**：离线套件原先要求点击重试后整个存档逐字段相等，而每 250ms 的被动结算会推进毫秒累加器，在本机慢速环境下跨过 1 秒边界即失败。改为快照前冻结 `Date.now`，让比较确定化，而不是放宽断言。

**Android debug 包已构建并通过项目自带审计。** 起初判断这台机器编不出来，后续研究推翻了它：AGP 与依赖改走阿里云 Google 镜像、SDK platform 35 从腾讯镜像用 `SDK_TEST_BASE_URL` 安装、Gradle 8.9 从腾讯镜像下载，JDK 用 Android Studio 自带 JBR 21。产物 172,883,380 字节，`audit-apk.py` 确认包名 `com.lingqi.game.preview`、4.8/code12、compileSdk 35、132 个资源逐字节匹配源码，`apksigner` 确认 v2 签名有效。

**但这份包不能当体验版发布**：它签的是 Android Debug 证书，与既有体验包签名不同，无法覆盖升级。正式体验包只差原私钥的两个文件（`signing-key.pk8` 与 `signing-cert.pem`）。Release 因此仍未发布。

顺带修掉 `audit-apk.py` 两处只在 Linux 成立的写法：找 `aapt2` 而非 `aapt2.exe`，以及未指定编码导致中文 Windows 上用 GBK 解码 UTF-8 输出而崩溃。详见 [验证目录](validation/v48/README.md)。

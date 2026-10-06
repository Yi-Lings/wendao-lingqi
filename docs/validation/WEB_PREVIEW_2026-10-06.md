# 网页试玩改版验证 · 2026-10-06

已恢复当前仓库并完成云环境配置。本轮按用户要求交付网页试玩，暂停新的 APK 构建和发布。

本记录的产物哈希对应第一轮网页试玩。后续套装、部位换装与流派推荐更新见 [配装验证记录](EQUIPMENT_BUILDS_2026-10-06.md)，下载入口继续使用同一公开ZIP链接，以后续记录的摘要校验新版。

## 改版范围

- 六个主页面分工，角色集中配装；战斗、洞天探索独立全屏，结束恢复原位置。
- 主页面与同类弹窗局部更新，保留滚动和输入焦点；功法、装备、灵宝、丹方及资源目录分页。
- 红色道品独立全屏演出，多红逐件展示，跳过/关闭不重复发奖。
- 六张新增原创图集覆盖六品级装备、低品功法、丹药、灵宝与资源/设施；原14张美术字节完全保留，适当复用高阶图样。
- 三首原创 BGM、十一种音效，手势解锁、分音量、静音与后台暂停。
- 图片配装、长按/右键/键盘详情；滑动取消长按，释放不误装配。
- 妖王主图手机250px、桌面420px；入场威压、命中反馈、独立名牌。最多五敌人的转火目标各自可点。
- 集市七种常规资源可选灵玉或天道尘支付，批量购买；失败不扣款或保留未提交奖励。

## 实际检查

| 检查 | 结果 |
|---|---|
| `npm test` | 152通过，无失败/跳过/取消 |
| `tests/browser-v3.cjs` | 32/32通过 |
| `tests/browser-red-reveal.cjs` | 16/16通过 |
| `tests/browser-audio-layout.cjs` | 24/24通过 |
| `tests/browser-preview-file.cjs` | 18通过，无失败；本地文件导航策略限制1项跳过 |
| 原始美术 | 14文件与HEAD原字节相同 |
| 妖王五敌转火 | 三视口15次真实点击均选中对应目标；小怪不互遮、不遮名牌 |

浏览器报告：`dist/browser-v3-report.json`、`dist/browser-red-reveal-report.json`、`dist/browser-audio-layout-report.json`。三套最终报告的页面错误、控制台错误、失败请求、HTTP错误和外部请求均为0。音频检查包括真实HTMLAudio时间推进、14个MP3解码及非零PCM RMS，不仅依赖调用计数。

集市测试检查双币五批的准确扣费/入库、重载、滚动位置、余额不足禁用，以及 `Native.persistSave=false` 时完整状态与已存储原文不变。集成测试使用校验过的预置进度，奖励由真实引擎计算；这些检查不代表自然成长可达性、长期经济平衡或安卓真机试玩。

## 离线试玩

`web/preview.js` 创建校验通过的独立初始进度；默认游戏入口不调用它。`?preview=1` 使用 `lingqi-preview-save-v1`，排除原生正式存档读写。首次十连预置保底及随机种子，用真实抽卡演示多红逐件演出。

```sh
python3 tools/build-web-preview.py --zip
node tests/browser-preview-file.cjs
```

工具输出 `dist/wendao-lingqi-preview.html`、压缩包和 `.manifest.json`。PNG和MP3原字节内嵌，图片转为内存Blob URL供短CSS变量引用，避免大图dataURI超出CSS变量解析限制与每帧重复巨型字符串。清单记录素材和源码哈希。

最终离线包18项检查通过：真实配装、长按、四技能配置、妖王大图与胜利、集市七商品双币买入、实际十连与两红演出、重载存档隔离、全部媒体原字节哈希及断网解码。页面与音频播放错误、外部请求均为0。报告为 `dist/browser-preview-file-report.json`，完成于2026-10-06 12:30:49 UTC。

- HTML：86,334,378字节，SHA-256 `290b07b8fbd3148997a5c6c6e4de4fc93ddf30d1ab44397a134e42ba355d39b6`。
- ZIP：64,644,954字节，SHA-256 `33c119732d2c735ffee897e191d97cfd957a5fc53729f2e0608225883c352aba`；仅包含同一HTML和试玩说明，内嵌HTML哈希与单文件一致。
- 最终打包清单中的源码及媒体哈希均与当前工作区一致，没有源码漂移。

### 公开下载交付

[下载网页版试玩ZIP](https://github.com/Yi-Lings/wendao-lingqi/releases/download/v3.0.0/wendao-lingqi-preview.zip)及[SHA-256校验文件](https://github.com/Yi-Lings/wendao-lingqi/releases/download/v3.0.0/wendao-lingqi-preview.zip.sha256)已上传至现有发布页。工作区路径不是公开下载入口。

隔离分支 `web-preview-download-20261006` 的[网页专用任务](https://github.com/Yi-Lings/wendao-lingqi/actions/runs/37465835436)运行逻辑测试并生成网页包，先校验HTML与上述已测试产物完全一致，再上传ZIP；没有构建APK。通过保留代理和TLS验证的匿名HTTPS请求实际下载成功（HTTP200，64,644,954字节），ZIP摘要、CRC及内部HTML摘要均通过校验。原APK及其校验附件的ID、大小、摘要、更新时间保持原值。

本环境系统Chromium管理策略禁止 `file://` 导航，该项明确跳过且未绕过策略。离线检查采用允许的本机HTTP仅加载一次HTML后断网，另用 `setContent` 在网络禁用下解码内嵌图片、音频。用户的实际浏览器打开方式和安卓系统文件选择器仍需实际体验确认。

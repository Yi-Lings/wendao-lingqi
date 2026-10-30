# 问道 · 灵契 V4.8「一击可闻」

本轮不新增玩法，只解决一件事：**数值涨得很快，但玩家看不见它涨**。

全系统爽感审计（[JUICE_REVIEW_V4_8](https://github.com/Yi-Lings/wendao-lingqi/blob/main/docs/review/JUICE_REVIEW_V4_8.md)）发现，暴击率最高 65%、暴伤最高 2.8 倍的战斗数值，此前在默认界面里只表现为一段折叠日志里的一行文字；普通敌人被打中时没有任何反应——`battle.css` 里唯一的 `.hurt` 规则是把动画关掉的。成长曲线本身并不慢：第六境每层约 27.5 分钟纯挂机，问题在可感知性。

## 本次改动

- **伤害飘字**：普通命中、持续伤害、护盾吸收、治疗、会心、击杀各有独立表现；深色描边保证在亮色美术上可读
- **会心身份**：金色放大飘字
- **击杀收束**：显示「击破」，并标出溢出伤害
- **普通敌人受击闪白**：此前只有妖王有命中反馈
- **连击徽标**：3 / 6 / 12 三档
- **战报可量化**：新增总输出、最高单击、会心次数、击杀数、承受伤害，并在同一副本有上一场记录时显示增减
- **稀有战利品节拍**：`rarity>=4` 在既有入场错峰之后多扫过一道品级色光
- **破境落差**：突破结果页显示战力、攻击、气血的前后值与百分比

全部动画在 `prefers-reduced-motion: reduce` 下降级为静态。经济、掉落概率、敌人强度、经验曲线与存档版本**均未改动**。

## 下载

| 文件 | 说明 |
| --- | --- |
| `wendao-lingqi-v4.8-debug.apk` | Android 体验包，**debug 签名**，见下方警告 |
| `wendao-lingqi-v4.8-preview.zip` | 离线单文件网页试玩，解压后用 Chrome 或 Edge 打开 HTML |
| `wendao-lingqi-v4.8.0-source.zip` | 完整源码快照，1,583 个文件 |
| `SHA256SUMS.txt` | 上述文件的校验值 |

## ⚠️ 关于这个 APK

**它是 debug 签名的，不是既有体验包的签名。** 这意味着：

- 可以独立安装
- **不能覆盖升级**已经装着的 `com.lingqi.game.preview`——需要先卸载旧版

原体验签名（`signing-key.pk8` + `signing-cert.pem`）不在本次构建环境中，按项目规则不新建密钥、也不把不同签名的重编包当作正式体验版。所以这个包标为 debug，供本轮功能测试使用。正式可覆盖升级的体验包需要原私钥重新签名。

包信息：`com.lingqi.game.preview` · versionCode 12 · versionName 4.8 · minSdk 26 · targetSdk 35 · compileSdk 35 · 172,883,380 字节。`audit-apk.py` 确认 132 个打包资源与源码逐字节一致。

## 验证

- **逻辑 476 项**：475 通过、1 跳过、0 失败。跳过项是 Windows 非管理员无法创建符号链接的既有用例，现明确 `t.skip` 并打印原因
- **浏览器 245 项**：234 项源页面 + 11 项真实 `file://` 离线检查，全部通过
- **离线包**：77 项资源内嵌，连续三次 11/11，零页面错误、零控制台错误、零外部请求
- **APK**：`audit-apk.py` 全项通过，`apksigner` 确认 v2 签名有效

完整记录见 [docs/validation/v48](https://github.com/Yi-Lings/wendao-lingqi/blob/main/docs/validation/v48/README.md)，方案见 [ITERATION_V4_8](https://github.com/Yi-Lings/wendao-lingqi/blob/main/docs/ITERATION_V4_8.md)。

## 未验证

Android 真机、模拟器、系统文件选择器、返回手势、长时间运行；真人爽感强度与长期经济平衡。测试通过只说明行为符合规则，不说明游戏已经好玩。

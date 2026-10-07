# V4 飞升与 APK 验证（2026-10-07）

## 当前结果

游戏源码与资源检查点：`1caa5c7`，已推送 GitHub `work`。最新用户要求构建APK，覆盖早前网页交付限制。资料研究、头脑风暴、多幕故事/突破/斗技/秘境/飞升与新增音画已完成；APK构建、签名、源资源审计通过，正在进行公开发布及匿名下载核验。

## 研究和有效内容

- 23个有实质正文的独立研究来源，获取记录/版本限制可复核，见 `../research/`。选用原创多幕故事推动开放养成与仙界长线；本地NPC竞技不称真人联机。
- 人界六境×十层×双路线，六章每章三次真实任务，18支线、多幕调查/抉择/回应；599条人界对白对象，另128条天门/仙界对白。
- 三轮斗技、三轮秘境夺魁；六种同境突破丹与闭关仪式，实际渡劫及材料来源引导。
- 天门、道誓、凝聚材料、真实天门挑战；登仙/真仙/金仙各十层，仙元/修为/静修/巡猎/境界试炼真实结算。
- 43张PNG、4首BGM与12种效果音；216件装备独立图位、20怪物物种、6人物对手、3仙界人物×4表情。原36PNG、14MP3及旧音频manifest原字节保留；比对清单见 `V4_ORIGINAL_ASSETS_2026-10-07.json`。

## 功能证据

- `npm test` 297/297通过，无失败/跳过，完整日志在 `v4-2026-10-07/node-final.log`。
- 通用浏览器32/32，实际故事/闭关10/10，飞升4/4，美术/生产29/29。飞升95布局组合检查全部按钮完整矩形，360×480短屏和横屏通过；脚本/资源错误为0。
- 红品装备/功法/灵宝跨3视口共9例，确认实际图集裁片绘制且可见，不仅检查DOM存在。
- 双路线完整真实行动测试：六章三任务、全部六境仪式、终章、天门及三阶仙界到金仙圆满；无需抽卡与红装，最高紫装。等待策略遇材料不足粗跳七日，4200/4368模拟小时不是最低通关时间或节奏承诺。首30分钟另见 `FIRST30_2026-10-07.json` 与说明。
- 正式/人界试玩/天门试玩独立存档与原生保存边界；Android实际Java入口方法19个合法/非法URL向量通过，支持模式查询与锚点，拒绝外部、其他资源、附加导航参数。

## Android 构建与包审计

构建环境：JDK17、Gradle8.9、AGP8.7.3、SDK35。执行：

```sh
source /workspace/cloud-setup/env.sh
gradle --offline --no-daemon --max-workers=2 -p android :app:assembleDebug
python3 audit-apk.py dist/wendao-lingqi-v4-preview.apk --package-id com.lingqi.game.preview --version-code 4 --version-name 4.0
python3 tools/check-android-entry.py
```

Gradle `BUILD SUCCESSFUL in 12s`，31任务（13执行、18缓存）；实际Java源码重新编译。原生启动类与SaveBridge在classes2.dex，合计两个DEX25368字节。APK的103个游戏文件集合/字节SHA与冻结源码完全相同，ZIP CRC正常，启动Activity为com.lingqi.game.MainActivity，没有声明任何权限。

最低API26，目标/编译API35，版本4.0/code4，包名com.lingqi.game.preview，名称「问道·灵契·体验」。旧发布私钥不存在，本包使用Debug RSA2048证书及v2签名，可并排安装。SDK35 zipalign检查通过，apksigner验证通过，原始报告附在 `v4-2026-10-07/`。

APK字节：126858599，SHA-256：`d230cc061eda39b85eff3d5e11ffc62bdf55f229734d3bd5a3c2c6813994b424`。

公开证书SHA-256：`7e0f7d7ffed4616bf6d4f6a0b1e3bff1e29ec032c5451aa9a6960e2c265715a6`。只保存公开指纹，私钥/keystore不提交。

APK以6片（每片最多24MiB）保存releases/parts-v4，逐片和最终SHA核验；重组结果与本地签名APK完全相同。旧V3分片与发布保持。

## 离线网页与发布

最终HTML字节：169592222，SHA-256：`8dc05b1acb52c787661b1d970363776c426723e2085a925ce590852b3473cb38`，62原字节内嵌媒体/图标/manifest资源。默认人界试玩，设置可切换天门及正式；三个存档键独立。单文件最终测试进行中，file://受平台Chromium策略禁止，不能宣称双击协议通过；HTTP载入后断网、预先断网opaque Blob媒体检查分别记录。

本地ZIP字节：126923094，SHA-256：`1a4d7514ef944bdb4b71a5eee696690ea0a09f8f5cd6512e2fb6a470e5e600ec`。CI要求内部HTML与已测SHA完全一致、ZIP CRC正常；ZIP容器若因压缩库版本差异不同，以公开文件checksum与内部HTML为依据。

手动Actions `.github/workflows/publish-apk.yml` 的work版本重组确切APK、跑297逻辑检查、重建HTML比对固定SHA、审计资源/证书/v2签名/对齐后发布v4.0.0-preview。default/main同名流程仍是历史V3，必须指定--ref work并核对job=verify-and-publish。公开下载完成后补充实际run、URL与匿名字节验证结果。

## 验证限制与云环境

没有Android设备、adb或模拟器，未执行真机安装/WebView、系统文件选择器、返回手势、进程恢复及30分钟稳定性，浏览器与Linux构建不能代替这些检查。离线单机中宗门、竞技及伙伴是NPC，商城为本地模拟，没有真实支付或联网宗门。

cloud-environment-onboarding:setup 已更新并保存完整install_script/start_skill草稿，复用现有工具链和代理认证，含V4包名/版本审计参数；没有把草稿保存声称为环境发布或新任务恢复验证。可在环境设置保存并发布以供未来任务使用，当前开发与构建已实际验证。

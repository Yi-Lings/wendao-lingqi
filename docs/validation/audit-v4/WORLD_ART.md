# V4 世界、人物与剧情美术对齐复核

日期：2026-10-07。审计对象：`/workspace/wendao-lingqi` 当前 V4 工作树。检查结论基于实际图片、正式战斗对象、运行时 DOM 与源码，图片文件名或同名元数据本身不算语义验证。

## 结论与已修问题

20 种怪物、6 个竞技对手、12 个人界 Boss、7 个仙界战斗入口均有真实对应图片。旧版的名字猜图已被稳定 `species` / `rivalId` / `bossIndex` 取代。逐图复核仍发现原有验收未覆盖的裁片、剧情背景和角色语义问题，本轮已迭代修正。最终 45 张 PNG 全部有正常入口：32 张用于正式内容，13 张历史图通过藏画阁可达；本报告范围内没有尚未处理的 P1/P2 对齐问题。

| 编号 | 原严重程度 | 原问题与证据 | 本轮处理与当前状态 |
|---|---|---|---|
| WA-01 | P1 | `v3-boss-atlas.png` 被严格按 362×362 均格切；寒鸦左缘夹入玄龟碎片，树王/双卫/熔炉底缘夹入下一行的狐、将与劫兽。透明原图合成后的 [修前联系表](evidence/world-bosses-12.png) 可见。 | [monster-art.js:14](../../../web/monster-art.js#L14) 改为逐 Boss 的实测原生矩形；[修后联系表](evidence/world-bosses-12-after.png) 已检查。原 PNG 字节不改。 |
| WA-02 | P1 | chapter_1/2 后增斗技与争魁剧情，但仍沿用验炉/查档旧章图；山君巡界碑用晶矿、镜湖用紫雷崖、书院用熔岩炉，雨夜医舍用白昼湖景。 | story-scenes.js 已按场所改图；斗技用 `story-arena.png`、争魁用 `story-secret.png`，支线按山麓/镜湖/古府/雷崖重接；丹房与书院补 `v8-interiors-atlas.png`，雨夜医舍补 `story-infirmary-night.png`。见 [主线修前](evidence/world-story-main.png)、[主线修后](evidence/world-story-main-after.png)、[支线修前](evidence/world-story-side.png)、[支线最终](evidence/world-story-side-after.png)。 |
| WA-03 | P2 | 两个剧情 renderer 的字符串别名将 smile/joy 映到肃然，worried 映到微笑，determined/serious 映到担忧。数字表情多数路径未触发此潜伏问题。 | [story-screen.js:36](../../../web/story-screen.js#L36)、[ascension-screen.js:44](../../../web/ascension-screen.js#L44) 按实图 `平静/欢欣/肃然/担忧` 四行统一别名；数字值保持原语义。 |
| WA-04 | P1 | `ascension-scenes.js` 已为三个仙阶提供独立 art，但 renderer 只读取未提供的 `view.background` 字符串，三阶实际全部显示天门图。 | [ascension-screen.js:106](../../../web/ascension-screen.js#L106) 接 `realmNarrative.art`；三阶真实浏览器均为各自地图 ROI，见 `world-runtime-realm-0/1/2.png`。 |
| WA-05 | P2 | 双卫两个目标都显示整张双人画；寒鸦分身显示无脸水晶镜影，不能从图认出施法者。 | [monster-art.js:43](../../../web/monster-art.js#L43) 分别取日/月上身肖像，入口保留完整共生组图；寒鸦分身复用寒鸦本人。根代理已使主卡走 enemyArt、添加分身/共生标识。见 [角色联系表](evidence/world-battle-roles-after.png)、[双卫实战](evidence/world-runtime-boss_7.png)、[寒鸦实战](evidence/world-runtime-boss_4.png)。 |
| WA-06 | P2 | 仙界道劫、巡猎与天门守关底部统称“山海妖王”。 | 根代理按 `ascensionKind` 区分天门守关、仙界道劫与仙域巡猎；实际敌名仍来自 species，未把玄律等剧情 NPC 冒作仙兽敌人。见 [太初道劫](evidence/world-runtime-immortal_2.png)。 |
| WA-07 | P1 | 已赢 arena_2 但尚未第二境时，任务画面继续突出已完成的竞技目标，按钮泛称“前往当前目标”。 | [story-screen.js:54](../../../web/story-screen.js#L54) 展示剩余条件、实际计数和逐项入口；主按钮命名首项未完成目标。新测试用合法首境十层、三场已赢存档，验证下一项为突破 rank，而非再去 arena。 |
| WA-08 | P2 | 43 张旧 PNG 中 13 张仅保留在包内，正常玩家路径没有使用；其中 v3-skills 只有失效数据时的回退引用。 | 根代理新增设置 → 藏画阁，收录 13 张历史图，避免强绑不相符的现行装备；原 v3-items 仍有正常的相符装备映射。见下面的正常资源覆盖说明。 |
| WA-09 | P1 | 原故事背景把 atlas 设成 `cols×100% rows×100%`，正方形源格随 390×844 画面被纵向拉长；新内景若按等分两格取图，还会包含 x=886/887 白中缝。 | [story-screen.js:25](../../../web/story-screen.js#L25) 与 [ascension-screen.js:111](../../../web/ascension-screen.js#L111) 输出真实 ROI 与 cover；[art-layout.js:12](../../../web/art-layout.js#L12) 用源图尺寸统一缩放，两个内景测量隔缝。正式截图及四视口矩形证据见下面。 |

P1 表示明确错图、邻格混入或玩家目标误导；P2 表示角色/身份/表情或素材可达性偏差。本报告不把普通场景留白、合理的同区域外景复用列为阻断问题。

## 覆盖与实图证据

以下联系表均有中文名字、稳定 ID、文件与行列标注，生成后实际使用 `view_image` 检查。Boss 图按真实 alpha 合成到深色底，不把透明像素隐藏的 RGB 颜色误报为游戏彩边。

| 内容 | 覆盖 | 联系表 |
|---|---:|---|
| 原怪物 + 新遭遇 + 仙兽 | 20/20 | [world-monsters-20.png](evidence/world-monsters-20.png) |
| 竞技对手 | 6/6 | [world-rivals-6.png](evidence/world-rivals-6.png) |
| 人界 Boss 全身组图 | 12/12 | [world-bosses-12-after.png](evidence/world-bosses-12-after.png) |
| 原伙伴立绘 | 3/3 | [world-companions-3.png](evidence/world-companions-3.png) |
| 原伙伴表情 | 12/12 | [world-companion-expressions-12.png](evidence/world-companion-expressions-12.png) |
| 仙界 NPC 表情 | 12/12 | [world-immortal-mentors-12.png](evidence/world-immortal-mentors-12.png) |
| 主线/支线场景 | 6 + 18 | [主线](evidence/world-story-main-after.png)、[支线](evidence/world-story-side-after.png) |
| 天门与仙阶场所 | 1 + 3 | [world-ascension-scenes-after.png](evidence/world-ascension-scenes-after.png) |
| 竞技正式战斗背景 | 2 | [world-tournament-scenes.png](evidence/world-tournament-scenes.png) |
| 共生组图与个体/分身 | 4 | [world-battle-roles-after.png](evidence/world-battle-roles-after.png) |

20 种实图核对：青岚灵獠为覆藤野猪，晶甲石傀为晶石傀儡，镜湖灵鹿有鹿角与水珠，紫霄雷隼为雷羽猛禽，噬影幽狼为黑紫狼，古甲执戈卫持长戈，赤莲噬灵花为火莲，星桥灵螭为盘绕星轨的灵螭；八种新遭遇依次为翠甲虫、碑纹石灵、浊水妖、灵蛾、短枪方盾机关卫、活根、无面镜片衣影、橙焰浮石。四仙兽对应白金狮、赤顶霜鹤、蓝色苍龙、黑白羽金焰玄凰。

六竞技人物核对：韩岳徒手武修，叶惊鸿红衣火莲术士，骆景行锦衣剑修，许照阵盘与书卷，季凌川紫雷术士，第二次骆景行保留同一人物但换朴素衣剑。六图互不替用怪物。[data.js:211](../../../web/data.js#L211) 明确 rival ID，正式敌人由 [combat.js:346](../../../web/combat.js#L346) 保留身份。

六名可见人物核对：沈青岚的青绿巡山剑修、陆月衡的白金丹道医者、闻素衍的紫色阵图师，原立绘与各自四种表情人物一致；玄律白金执律长者、池照川蓝衣真君、商焚岳红黑铠甲镇将各自四种表情一致，名字、角色与列号对应 [mentor-art.js:13](../../../web/mentor-art.js#L13)。24 个人界 episode 的具名说话者均属于各自 cast；玩家与旁白使用文字章印。顾寒舟等没有专用立绘的人物通过旁白引述，不冒用六名人物肖像。

## 实战与运行时检查

使用正式 `Combat.handle(startDungeon)`、`battleView` 与 `enemyArt` 检查 117 条战斗审查记录，全部有图片。去重后的场景包括 5 个资源副本、12 宗门教学、6 竞技、12 人界 Boss、60 塔层、6 大境试炼、7 仙界入口及四种 Boss 召唤场景。117 包含四次召唤前的重复 Boss 入场，以及一次重复试炼入场，不代表 117 个新副本。另现有 monster-art 测试实际进入三个洞天并验证各自 species。

仙界 7 个入口逐一检查，守关/道劫/巡猎都沿真实战斗管线进入：

| 入口 | 实际敌名 | 图片 |
|---|---|---|
| heaven_gate | 天门镇界狮 | v7-immortal-beasts-atlas 0,0 |
| immortal_0 / immortal_hunt_0 | 霜天玄鹤 | 同图 1,0 |
| immortal_1 / immortal_hunt_1 | 星海苍龙 | 同图 0,1 |
| immortal_2 / immortal_hunt_2 | 太初玄凰 | 同图 1,1 |

正式 Chromium 共捕获 14 张 390×844 运行图：三阶场所、以上七个仙界战斗、寒鸦/树王/双卫/熔炉。截图采用明确的已验证存档 fixture，战斗是实际引擎入场后暂停的状态，不作为自然经济或真实时间通关证明。运行中 0 pageerror。原始 frame/crop/atlasFit 数据保存在 [world-runtime-report.json](evidence/world-runtime-report.json)。

另从正式 `openStory` 入口实拍 [丹房](evidence/world-runtime-yueheng_0.png) 和 [书院](evidence/world-runtime-yueheng_3.png)。两个背景均 absolute、无 contain 内层，390×844 frame 内的整张 atlas 显示为 1688×844，即原生横纵比例完全一致；所选两个独立 ROI 不含白中缝。源数据及藏画阁结果见 [world-interiors-gallery-report.json](evidence/world-interiors-gallery-report.json)。

雨夜医舍用合法已完成前两章伙伴支线的 fixture，经 `openStory → beginStory` 到真实 intro。图为 1024×1536：暖灯药案、药碗/病榻和窗外蓝色雨夜与对白、地点相符。以下四张截图均实际查看，Image.decode 正常、0 pageerror、无横向溢出，背景与 narrative-screen 矩形一致且 absolute；可见源矩形始终在原图边界内。详细比例与可见矩形见 [world-night-report.json](evidence/world-night-report.json)。

| 视口 | 实际故事 frame | 背景统一缩放尺寸 | 实拍 |
|---|---|---|---|
| 390×844 | 390×844 | 562.66667×844 | [竖屏](evidence/world-runtime-yueheng_2-390x844.png) |
| 360×480 | 360×480 | 360×540 | [短屏](evidence/world-runtime-yueheng_2-360x480.png) |
| 844×390 | 620×390 | 620×930 | [横屏](evidence/world-runtime-yueheng_2-844x390.png) |
| 1280×720 | 620×720 | 620×930 | [桌面](evidence/world-runtime-yueheng_2-1280x720.png) |

横屏与桌面按产品布局将故事宽度限制为 620px，表中验证的是实际 frame；`cover` 按同一比例裁切，无非等比拉伸。Chromium computed style 会把 562.66667px 显示为 562.667px，复核同时记录原始 CSS 变量，避免把字符串舍入误报为图像变形。累计正式浏览器截图为 22 张（14 实战/仙界、2 内景、2 藏画阁、4 雨夜视口）。

三阶背景真实尺寸为 1536×1024，frame 为 390×844，`data-atlas-fit` 分别是 `3,2,1,1`、`3,2,0,1`、`3,2,2,1`；三者不同 ROI 均实际接入。背景 `data-art-fit=cover`，由原生尺寸计算单一缩放，不把 square 场景拉成 390×844。新内景原生 1774×887，中缝位于 x=886/887；两块取图为 `[0,0,886,887]` / `[888,0,886,887]`，不包含白缝。故事与仙界 renderer 输出归一化 ROI，根代理的 art-layout cover 分支保持 absolute 背景、无需 contain 内层；普通图标继续 contain。

执行：

```sh
node --test tests/v3-world-art-alignment.cjs tests/v3-monster-art.cjs tests/v3-ascension-screen.cjs
```

结果：17 项通过，0 失败/跳过。新增测试覆盖字符串表情的真实行语义、三个仙阶 art 接线、内景 ROI 三视口比例/白缝排除、原 Boss 邻格排除坐标、双卫分人、寒鸦分身，以及 arena_2 赢后仍未突破的真实剩余目标。日卫原 native width 169 最后收紧为 159，排除月卫紫剑在 x=535/y=950 的细条；两目标实拍已刷新。旧的比例检查改用 `absdiff < 1e-12`，处理非方裁片的 1 ULP 浮点差异；native 边界与尺寸检查仍保留。

## 正常资源覆盖与历史资源

本轮初始 43 张 PNG 中，正常装备/技能/怪物/人物/场景/CSS 映射可触达 30 张；其余 13 张如下。不能把注释、打包清单或 fallback 引用算作玩家正常使用。

- `v3-skills-atlas.png`：selection.js 的 legacy fallback；完整 index 已加载 GameArt，48 个合法功法都返回 v6 art，因此正常不可达。
- `v4-armor-atlas.png`、`v4-basic-skills-atlas.png`、`v4-pills-atlas.png`、`v4-treasures-atlas.png`、`v4-utilities-atlas.png`、`v4-weapons-atlas.png`：正式 runtime 无引用。
- `v5-gear-quality-0.png` 至 `v5-gear-quality-5.png`：正式 runtime 无引用。

根代理把以上 13 张收录为设置里的藏画阁画卷。实际点开设置 → 藏画阁，顺次翻完 13 卷；13 张文件互不重复、各自 Image.decode 正常且页宽不超过 390px。见 [第一卷](evidence/world-runtime-gallery-0.png)、[第十三卷](evidence/world-runtime-gallery-12.png) 与完整 [13 项结果](evidence/world-interiors-gallery-report.json)。新补的 `v8-interiors-atlas.png` 和 `story-infirmary-night.png` 均用于真实剧情，当前图数量为 45；图鉴展示与正式图标身份分别说明，旧图不冒作不相符的新装备。`v3-items-atlas.png` 仍用于青锋剑、蚀魄刃、天灵宝甲和灵木扇等正确旧物图位；整图已使用，不应再标“完全未用”。`v3-forge` 的洞府 hero-scene、`v3-world` 的默认/伙伴 hero-scene、`v3-shop` 的灵玉商城、`v3-summon` 的感应、`v3-cardback` 的抽卡背面均有实际 DOM 入口。

## 边界与尚需持续复核

- 内部审查覆盖实图、名称/身份映射和上述运行时场景；未把每一句旁白中的道具、每一种天气都当成必须逐一绘出的独立资产。普通支线允许同区域外景复用，但标题应明确外景。
- 双卫战斗使用上身肖像，入口仍完整显示全身共生组图。这是明确的肖像选择，不承诺上身卡片展示全衣袖。旧透明 Boss 的装饰边缘在不规则源图上可能少量触到窗口边界，主体脸、身躯与实战辨识已检查。
- 长期养成平衡、低端 Android 性能、触摸真机色彩/显示裁切、所有长对白在所有屏幕的排版不属于本报告已验证范围；由根报告分别记录实际测试状态。

# V4 装备、功法与功能图标语义审计

审计日期：2026-10-07。对象为当前工作区运行映射，不将历史旧映射或哈希一致视为视觉合格证据。

## 结论与覆盖

全部 **330 条当前物品映射已逐件人工目检实际 PNG 裁片**：216 件装备、48 部功法/神通/秘术、12 件灵宝、18 种丹药、36 个资源/设施/洞天节点。查看了 18 张带真实名称与 ID 的 contact sheet；另外查看旧物品首行与 4 个未启用的 V6 候选图位，其中 6 个是当前 330 条之外的额外独立图格。没有发现当前物品被画成错误大类、明显错误元素、凡品布帽变金冠、铁尺变木板、法杖变长枪或道品整体染红等阻断问题。

人工目检辅以运行数据交叉校验：330 条 `currentArt` 全部与当前 `equipment-art.js` / `game-art.js` 输出一致；330 个 `(file, native rectangle)` 全部独立，没有两套装备指向同一格。该检查证明映射独立，视觉结论来自下表对应的真实图片。原 PNG 未改写。

| 范围 | 目检数量 | 图片证据 |
|---|---:|---|
| 装备 | 216 | `dist/audit-v4/gear-q0-1.png 至 gear-q5-2.png，共 12 张` |
| 功法/神通/秘术 | 48 | `dist/audit-v4/techniques-1.png、techniques-2.png` |
| 灵宝 | 12 | `dist/audit-v4/treasures.png` |
| 丹药 | 18 | `dist/audit-v4/pills.png` |
| 功能图标 | 36 | `dist/audit-v4/utilities-1.png、utilities-2.png` |

## 发现与本轮处理

| 编号 / 严重程度 | 证据 | 处理与状态 |
|---|---|---|
| D1 / P1，文档错误 | 原 `ART_DIRECTION.md:213–218` 的护脉丹/固基丹/归藏丹/玉清丹/太一复元丹，与 `data.js:127–132`、manifest `break0/1/2/3/5` 实际名称不一致。实际图像为青绿筑基丹、岩金凝金丹、墨青识海凝婴丹、白青化神丹、阴阳道心丹。 | 已更正文档 5 个名称及药效方向，`ART_DIRECTION.md:179` 的旧丹名例子同步修正；没有替换正确的 PNG。 |
| D2 / P2，统计口径错误 | 原 `ART_DIRECTION.md:18` 写“原有 26 张 PNG”，而 V4 保全报告 `counts.originalPng` 为 36、当前 `totalPng` 为 43。 | 已明确早期基础 26 + V6 图集 10 = V4 基准 36；V4 新增 7，当前 43。保全字节核验由总审计负责，本报告不重复宣称已独立验证全部原文件哈希。 |
| D3 / P2，文档材质与实际图不一致 | `v6-gear-quality-5.png` 第 5 行第 5 列，原生 `[837,785,1043,981]`，实际为墨黑金属长战靴、紫绸带、弯月护踝与隐影；旧文字却要求软履、轻薄鞋形。放大证据：`dist/audit-v4/dao-night-boots-source.png`。 | 经总审计确认，名称“夜行履”允许此材质，按真实月纹战靴更正文档；不是错类图片，不重绘。本报告完成时 manifest 的对应 `shape` 文案由总审计同步维护。 |

品级、套装与元素重点复核：凡品 36 件均是普通铁器、旧布、石佩，六顶头饰均为布帽；没有魔法光晕。灵品使用钢铁、皮革、青布、铜箍，玄品以上逐步加入灵纹、晶体、雕刻与独立元素光。地品撼山锤保持岩铁、离火扇保持火橙，玄星尺保持星蓝，不按紫品染整件；道品 36 件保留玉白、深绿、靛蓝、冰蓝、墨黑等多种本体颜色，朱红离火衣源于火元素及名称。

## 旧图、停用图位与缺项

| 实际旧图位 | 当前用途 | 实际视觉判断 |
|---|---|---|
| v3-items r1c1 | 道品青锋剑 | 直剑、青玉/钢银、清青剑气；形态吻合 |
| v3-items r1c2 | 玄武天品天灵宝甲 | 黑金甲胄；放在泛称宝甲位置合理，不用于明确龟甲的道品玄武甲 |
| v3-items r1c5 | 道品蚀魄刃 | 紫黑曲刃与幽魂光；不是通体红刀 |
| v3-items r1c6 | 离火玄品灵木扇 | 白绿扇面、绿色木叶与扇骨；不用作尺或四象扇 |
| v3-items r1c3 | 当前主物品映射停用 | 尖刃长兵，已不作为道品雷霄杖 |
| v3-items r1c4 | 当前主物品映射停用 | 赤金莲焰长武器，未强行塞入山岩/铁器命名 |

证据：`dist/audit-v4/legacy-items-row1.png`，逻辑由 `equipment-art.js:12,51–60` 决定。216 件当前装备使用 212 个 V6 图格 + 上述 4 个旧图格；V6 原矩阵中的玄品灵木扇、天品天灵宝甲、道品青锋剑、道品蚀魄刃 4 格仍在原图中保留，当前没有启用。它们已额外目检，见 `v6-unused-replacement-cells.png`，不能把这 4 格算作当前缺图或重复映射。

V4/V5 老物品图集与旧技能图集保留为历史资源；`selection.js:17–27` 仍有旧图的兼容后备路径，但有效物品会先调用 `WendaoGameArt`。本报告未穷举所有失效/模块缺失条件。旧 V4/V5 的所有归档裁片没有逐件重新判定语义；当前 330 条没有未核验图片。地图、角色、妖物、背景、音频与整个 APK 的运行显示由其他审计覆盖，不计入此处 330 数量。

本轮目检验证的是实际源裁片的名称、形态、材质、元素及品级方向；没有据此宣称已测试全部游戏流程、全部像素尺寸、动画或真机表现。十张 V6 图集实际不等分边界由 `art-crops.js:21–31,43–52` 提供，当前人工目检未看到相邻图串入或主体误裁。浏览器缩放与交互仍需要主审计的屏幕验证。

## 复现

在仓库根目录执行：

```bash
node dist/audit-v4/export-equipment-runtime.cjs > dist/audit-v4/equipment-runtime-records.json
python dist/audit-v4/art-contact-sheets.py
```

脚本只读取原始 PNG，以运行时矩形生成审计用 contact sheet，不编辑原图。输出 JSON 含真实运行描述、manifest 对比及归一化 crop；下表矩形使用原生像素 `(left, top, right, bottom)`，右/下边界不含。表中的行列从 1 开始。对于四个旧图使用运行时实际等分矩形，不拿新 V6 对应位置冒充实际图片。

## 逐件装备记录：216 件

每个品级的前 3 套/后 3 套分别位于 `gear-q{rarity}-1.png` / `gear-q{rarity}-2.png`。

| ID / 实际名称 | 实际 PNG / 行列 | 原生矩形 | 视觉结论 | manifest 源行 |
|---|---|---|---|---:|
| `0_sword_weapon` / 铁剑 | `v6-gear-quality-0.png` r1c1 | `(0, 0, 221, 203)` | 通过：灰铁直刃剑 | [41](../../ART_ASSET_MANIFEST.json#L41) |
| `0_sword_armor` / 青锋·粗布衣 | `v6-gear-quality-0.png` r1c2 | `(223, 0, 417, 203)` | 通过：旧白青粗布衣 | [77](../../ART_ASSET_MANIFEST.json#L77) |
| `0_sword_head` / 青锋·布帽 | `v6-gear-quality-0.png` r1c3 | `(419, 0, 623, 203)` | 通过：普通布帽而非金冠铁盔 | [113](../../ART_ASSET_MANIFEST.json#L113) |
| `0_sword_bracer` / 青锋·铁护腕 | `v6-gear-quality-0.png` r1c4 | `(625, 0, 841, 203)` | 通过：粗铁护腕、绳布束带 | [149](../../ART_ASSET_MANIFEST.json#L149) |
| `0_sword_boots` / 青锋·旧布靴 | `v6-gear-quality-0.png` r1c5 | `(843, 0, 1047, 203)` | 通过：旧布靴、磨损补缝 | [185](../../ART_ASSET_MANIFEST.json#L185) |
| `0_sword_charm` / 青锋·绳结石佩 | `v6-gear-quality-0.png` r1c6 | `(1049, 0, 1254, 203)` | 通过：绳结普通石佩、流派简纹 | [221](../../ART_ASSET_MANIFEST.json#L221) |
| `0_body_weapon` / 铁锤 | `v6-gear-quality-0.png` r2c1 | `(0, 205, 221, 400)` | 通过：粗铁方锤 | [268](../../ART_ASSET_MANIFEST.json#L268) |
| `0_body_armor` / 玄武·粗布铁甲 | `v6-gear-quality-0.png` r2c2 | `(223, 205, 417, 400)` | 通过：粗布衣外少量铁甲片 | [304](../../ART_ASSET_MANIFEST.json#L304) |
| `0_body_head` / 玄武·布帽 | `v6-gear-quality-0.png` r2c3 | `(419, 205, 623, 400)` | 通过：普通布帽而非金冠铁盔 | [340](../../ART_ASSET_MANIFEST.json#L340) |
| `0_body_bracer` / 玄武·铁护腕 | `v6-gear-quality-0.png` r2c4 | `(625, 205, 841, 400)` | 通过：粗铁护腕、绳布束带 | [376](../../ART_ASSET_MANIFEST.json#L376) |
| `0_body_boots` / 玄武·旧布靴 | `v6-gear-quality-0.png` r2c5 | `(843, 205, 1047, 400)` | 通过：旧布靴、磨损补缝 | [412](../../ART_ASSET_MANIFEST.json#L412) |
| `0_body_charm` / 玄武·绳结石佩 | `v6-gear-quality-0.png` r2c6 | `(1049, 205, 1254, 400)` | 通过：绳结普通石佩、流派简纹 | [448](../../ART_ASSET_MANIFEST.json#L448) |
| `0_thunder_weapon` / 铁枪 | `v6-gear-quality-0.png` r3c1 | `(0, 402, 221, 612)` | 通过：有明确枪尖的铁枪 | [495](../../ART_ASSET_MANIFEST.json#L495) |
| `0_thunder_armor` / 雷霄·粗布衣 | `v6-gear-quality-0.png` r3c2 | `(223, 402, 417, 612)` | 通过：旧蓝粗布衣 | [531](../../ART_ASSET_MANIFEST.json#L531) |
| `0_thunder_head` / 雷霄·布帽 | `v6-gear-quality-0.png` r3c3 | `(419, 402, 623, 612)` | 通过：普通布帽而非金冠铁盔 | [567](../../ART_ASSET_MANIFEST.json#L567) |
| `0_thunder_bracer` / 雷霄·铁护腕 | `v6-gear-quality-0.png` r3c4 | `(625, 402, 841, 612)` | 通过：粗铁护腕、绳布束带 | [603](../../ART_ASSET_MANIFEST.json#L603) |
| `0_thunder_boots` / 雷霄·旧布靴 | `v6-gear-quality-0.png` r3c5 | `(843, 402, 1047, 612)` | 通过：旧布靴、磨损补缝 | [639](../../ART_ASSET_MANIFEST.json#L639) |
| `0_thunder_charm` / 雷霄·绳结石佩 | `v6-gear-quality-0.png` r3c6 | `(1049, 402, 1254, 612)` | 通过：绳结普通石佩、流派简纹 | [675](../../ART_ASSET_MANIFEST.json#L675) |
| `0_elements_weapon` / 素扇 | `v6-gear-quality-0.png` r4c1 | `(0, 614, 221, 812)` | 通过：朴素竹骨纸扇 | [722](../../ART_ASSET_MANIFEST.json#L722) |
| `0_elements_armor` / 离火·粗布衣 | `v6-gear-quality-0.png` r4c2 | `(223, 614, 417, 812)` | 通过：旧赤褐粗布衣 | [758](../../ART_ASSET_MANIFEST.json#L758) |
| `0_elements_head` / 离火·布帽 | `v6-gear-quality-0.png` r4c3 | `(419, 614, 623, 812)` | 通过：普通布帽而非金冠铁盔 | [794](../../ART_ASSET_MANIFEST.json#L794) |
| `0_elements_bracer` / 离火·铁护腕 | `v6-gear-quality-0.png` r4c4 | `(625, 614, 841, 812)` | 通过：粗铁护腕、绳布束带 | [830](../../ART_ASSET_MANIFEST.json#L830) |
| `0_elements_boots` / 离火·旧布靴 | `v6-gear-quality-0.png` r4c5 | `(843, 614, 1047, 812)` | 通过：旧布靴、磨损补缝 | [866](../../ART_ASSET_MANIFEST.json#L866) |
| `0_elements_charm` / 离火·绳结石佩 | `v6-gear-quality-0.png` r4c6 | `(1049, 614, 1254, 812)` | 通过：绳结普通石佩、流派简纹 | [902](../../ART_ASSET_MANIFEST.json#L902) |
| `0_shadow_weapon` / 铁刀 | `v6-gear-quality-0.png` r5c1 | `(0, 814, 221, 1016)` | 通过：粗铁单刃刀 | [949](../../ART_ASSET_MANIFEST.json#L949) |
| `0_shadow_armor` / 太虚·粗布衣 | `v6-gear-quality-0.png` r5c2 | `(223, 814, 417, 1016)` | 通过：旧墨灰粗布衣 | [985](../../ART_ASSET_MANIFEST.json#L985) |
| `0_shadow_head` / 太虚·布帽 | `v6-gear-quality-0.png` r5c3 | `(419, 814, 623, 1016)` | 通过：普通布帽而非金冠铁盔 | [1021](../../ART_ASSET_MANIFEST.json#L1021) |
| `0_shadow_bracer` / 太虚·铁护腕 | `v6-gear-quality-0.png` r5c4 | `(625, 814, 841, 1016)` | 通过：粗铁护腕、绳布束带 | [1057](../../ART_ASSET_MANIFEST.json#L1057) |
| `0_shadow_boots` / 太虚·旧布靴 | `v6-gear-quality-0.png` r5c5 | `(843, 814, 1047, 1016)` | 通过：旧布靴、磨损补缝 | [1093](../../ART_ASSET_MANIFEST.json#L1093) |
| `0_shadow_charm` / 太虚·绳结石佩 | `v6-gear-quality-0.png` r5c6 | `(1049, 814, 1254, 1016)` | 通过：绳结普通石佩、流派简纹 | [1129](../../ART_ASSET_MANIFEST.json#L1129) |
| `0_array_weapon` / 铁尺 | `v6-gear-quality-0.png` r6c1 | `(0, 1018, 221, 1254)` | 通过：铁灰平尺、刻度无刃 | [1176](../../ART_ASSET_MANIFEST.json#L1176) |
| `0_array_armor` / 回春·粗布衣 | `v6-gear-quality-0.png` r6c2 | `(223, 1018, 417, 1254)` | 通过：旧白绿粗布衣 | [1212](../../ART_ASSET_MANIFEST.json#L1212) |
| `0_array_head` / 回春·布帽 | `v6-gear-quality-0.png` r6c3 | `(419, 1018, 623, 1254)` | 通过：普通布帽而非金冠铁盔 | [1248](../../ART_ASSET_MANIFEST.json#L1248) |
| `0_array_bracer` / 回春·铁护腕 | `v6-gear-quality-0.png` r6c4 | `(625, 1018, 841, 1254)` | 通过：粗铁护腕、绳布束带 | [1284](../../ART_ASSET_MANIFEST.json#L1284) |
| `0_array_boots` / 回春·旧布靴 | `v6-gear-quality-0.png` r6c5 | `(843, 1018, 1047, 1254)` | 通过：旧布靴、磨损补缝 | [1320](../../ART_ASSET_MANIFEST.json#L1320) |
| `0_array_charm` / 回春·绳结石佩 | `v6-gear-quality-0.png` r6c6 | `(1049, 1018, 1254, 1254)` | 通过：绳结普通石佩、流派简纹 | [1356](../../ART_ASSET_MANIFEST.json#L1356) |
| `1_sword_weapon` / 精钢剑 | `v6-gear-quality-1.png` r1c1 | `(0, 0, 209, 204)` | 通过：精钢直剑 | [1410](../../ART_ASSET_MANIFEST.json#L1410) |
| `1_sword_armor` / 青锋·青布衣 | `v6-gear-quality-1.png` r1c2 | `(211, 0, 417, 204)` | 通过：青布衣、克制金线 | [1446](../../ART_ASSET_MANIFEST.json#L1446) |
| `1_sword_head` / 青锋·铜箍布冠 | `v6-gear-quality-1.png` r1c3 | `(419, 0, 623, 204)` | 通过：铜箍布冠 | [1482](../../ART_ASSET_MANIFEST.json#L1482) |
| `1_sword_bracer` / 青锋·皮护腕 | `v6-gear-quality-1.png` r1c4 | `(625, 0, 835, 204)` | 通过：皮革护腕与克制镶边 | [1518](../../ART_ASSET_MANIFEST.json#L1518) |
| `1_sword_boots` / 青锋·皮革靴 | `v6-gear-quality-1.png` r1c5 | `(837, 0, 1049, 204)` | 通过：皮革靴、布靴口 | [1554](../../ART_ASSET_MANIFEST.json#L1554) |
| `1_sword_charm` / 青锋·青铜佩 | `v6-gear-quality-1.png` r1c6 | `(1051, 0, 1254, 204)` | 通过：青铜流派佩饰 | [1590](../../ART_ASSET_MANIFEST.json#L1590) |
| `1_body_weapon` / 精钢锤 | `v6-gear-quality-1.png` r2c1 | `(0, 206, 209, 405)` | 通过：精制钢铁锤 | [1637](../../ART_ASSET_MANIFEST.json#L1637) |
| `1_body_armor` / 玄武·精制皮甲 | `v6-gear-quality-1.png` r2c2 | `(211, 206, 417, 405)` | 通过：精制皮甲 | [1673](../../ART_ASSET_MANIFEST.json#L1673) |
| `1_body_head` / 玄武·铜箍布冠 | `v6-gear-quality-1.png` r2c3 | `(419, 206, 623, 405)` | 通过：铜箍布冠 | [1709](../../ART_ASSET_MANIFEST.json#L1709) |
| `1_body_bracer` / 玄武·皮护腕 | `v6-gear-quality-1.png` r2c4 | `(625, 206, 835, 405)` | 通过：皮革护腕与克制镶边 | [1745](../../ART_ASSET_MANIFEST.json#L1745) |
| `1_body_boots` / 玄武·皮革靴 | `v6-gear-quality-1.png` r2c5 | `(837, 206, 1049, 405)` | 通过：皮革靴、布靴口 | [1781](../../ART_ASSET_MANIFEST.json#L1781) |
| `1_body_charm` / 玄武·青铜佩 | `v6-gear-quality-1.png` r2c6 | `(1051, 206, 1254, 405)` | 通过：青铜流派佩饰 | [1817](../../ART_ASSET_MANIFEST.json#L1817) |
| `1_thunder_weapon` / 精铁长枪 | `v6-gear-quality-1.png` r3c1 | `(0, 407, 209, 616)` | 通过：有枪尖的精铁长枪 | [1864](../../ART_ASSET_MANIFEST.json#L1864) |
| `1_thunder_armor` / 雷霄·青布衣 | `v6-gear-quality-1.png` r3c2 | `(211, 407, 417, 616)` | 通过：青蓝布衣与细纹 | [1900](../../ART_ASSET_MANIFEST.json#L1900) |
| `1_thunder_head` / 雷霄·铜箍布冠 | `v6-gear-quality-1.png` r3c3 | `(419, 407, 623, 616)` | 通过：铜箍布冠 | [1936](../../ART_ASSET_MANIFEST.json#L1936) |
| `1_thunder_bracer` / 雷霄·皮护腕 | `v6-gear-quality-1.png` r3c4 | `(625, 407, 835, 616)` | 通过：皮革护腕与克制镶边 | [1972](../../ART_ASSET_MANIFEST.json#L1972) |
| `1_thunder_boots` / 雷霄·皮革靴 | `v6-gear-quality-1.png` r3c5 | `(837, 407, 1049, 616)` | 通过：皮革靴、布靴口 | [2008](../../ART_ASSET_MANIFEST.json#L2008) |
| `1_thunder_charm` / 雷霄·青铜佩 | `v6-gear-quality-1.png` r3c6 | `(1051, 407, 1254, 616)` | 通过：青铜流派佩饰 | [2044](../../ART_ASSET_MANIFEST.json#L2044) |
| `1_elements_weapon` / 竹骨扇 | `v6-gear-quality-1.png` r4c1 | `(0, 618, 209, 821)` | 通过：竹骨竹叶纸扇 | [2091](../../ART_ASSET_MANIFEST.json#L2091) |
| `1_elements_armor` / 离火·青布衣 | `v6-gear-quality-1.png` r4c2 | `(211, 618, 417, 821)` | 通过：青布衣与克制金线 | [2127](../../ART_ASSET_MANIFEST.json#L2127) |
| `1_elements_head` / 离火·铜箍布冠 | `v6-gear-quality-1.png` r4c3 | `(419, 618, 623, 821)` | 通过：铜箍布冠 | [2163](../../ART_ASSET_MANIFEST.json#L2163) |
| `1_elements_bracer` / 离火·皮护腕 | `v6-gear-quality-1.png` r4c4 | `(625, 618, 835, 821)` | 通过：皮革护腕与克制镶边 | [2199](../../ART_ASSET_MANIFEST.json#L2199) |
| `1_elements_boots` / 离火·皮革靴 | `v6-gear-quality-1.png` r4c5 | `(837, 618, 1049, 821)` | 通过：皮革靴、布靴口 | [2235](../../ART_ASSET_MANIFEST.json#L2235) |
| `1_elements_charm` / 离火·青铜佩 | `v6-gear-quality-1.png` r4c6 | `(1051, 618, 1254, 821)` | 通过：青铜流派佩饰 | [2271](../../ART_ASSET_MANIFEST.json#L2271) |
| `1_shadow_weapon` / 精钢刀 | `v6-gear-quality-1.png` r5c1 | `(0, 823, 209, 1021)` | 通过：精钢曲刀 | [2318](../../ART_ASSET_MANIFEST.json#L2318) |
| `1_shadow_armor` / 太虚·青布衣 | `v6-gear-quality-1.png` r5c2 | `(211, 823, 417, 1021)` | 通过：深青布衣 | [2354](../../ART_ASSET_MANIFEST.json#L2354) |
| `1_shadow_head` / 太虚·铜箍布冠 | `v6-gear-quality-1.png` r5c3 | `(419, 823, 623, 1021)` | 通过：铜箍布冠 | [2390](../../ART_ASSET_MANIFEST.json#L2390) |
| `1_shadow_bracer` / 太虚·皮护腕 | `v6-gear-quality-1.png` r5c4 | `(625, 823, 835, 1021)` | 通过：皮革护腕与克制镶边 | [2426](../../ART_ASSET_MANIFEST.json#L2426) |
| `1_shadow_boots` / 太虚·皮革靴 | `v6-gear-quality-1.png` r5c5 | `(837, 823, 1049, 1021)` | 通过：皮革靴、布靴口 | [2462](../../ART_ASSET_MANIFEST.json#L2462) |
| `1_shadow_charm` / 太虚·青铜佩 | `v6-gear-quality-1.png` r5c6 | `(1051, 823, 1254, 1021)` | 通过：青铜流派佩饰 | [2498](../../ART_ASSET_MANIFEST.json#L2498) |
| `1_array_weapon` / 青铜尺 | `v6-gear-quality-1.png` r6c1 | `(0, 1023, 209, 1254)` | 通过：青铜平尺与刻度 | [2545](../../ART_ASSET_MANIFEST.json#L2545) |
| `1_array_armor` / 回春·青布衣 | `v6-gear-quality-1.png` r6c2 | `(211, 1023, 417, 1254)` | 通过：白青布衣与竹叶纹 | [2581](../../ART_ASSET_MANIFEST.json#L2581) |
| `1_array_head` / 回春·铜箍布冠 | `v6-gear-quality-1.png` r6c3 | `(419, 1023, 623, 1254)` | 通过：铜箍布冠 | [2617](../../ART_ASSET_MANIFEST.json#L2617) |
| `1_array_bracer` / 回春·皮护腕 | `v6-gear-quality-1.png` r6c4 | `(625, 1023, 835, 1254)` | 通过：皮革护腕与克制镶边 | [2653](../../ART_ASSET_MANIFEST.json#L2653) |
| `1_array_boots` / 回春·皮革靴 | `v6-gear-quality-1.png` r6c5 | `(837, 1023, 1049, 1254)` | 通过：皮革靴、布靴口 | [2689](../../ART_ASSET_MANIFEST.json#L2689) |
| `1_array_charm` / 回春·青铜佩 | `v6-gear-quality-1.png` r6c6 | `(1051, 1023, 1254, 1254)` | 通过：青铜流派佩饰 | [2725](../../ART_ASSET_MANIFEST.json#L2725) |
| `2_sword_weapon` / 灵纹剑 | `v6-gear-quality-2.png` r1c1 | `(0, 0, 208, 194)` | 通过：银铁青玉灵纹剑 | [2779](../../ART_ASSET_MANIFEST.json#L2779) |
| `2_sword_armor` / 青锋·灵纹衣 | `v6-gear-quality-2.png` r1c2 | `(210, 0, 427, 194)` | 通过：玉白青玉灵纹衣 | [2815](../../ART_ASSET_MANIFEST.json#L2815) |
| `2_sword_head` / 青锋·灵纹冠 | `v6-gear-quality-2.png` r1c3 | `(429, 0, 631, 194)` | 通过：灵纹冠，材质服从流派 | [2851](../../ART_ASSET_MANIFEST.json#L2851) |
| `2_sword_bracer` / 青锋·灵纹护腕 | `v6-gear-quality-2.png` r1c4 | `(633, 0, 837, 194)` | 通过：精工灵纹护腕、局部嵌件 | [2887](../../ART_ASSET_MANIFEST.json#L2887) |
| `2_sword_boots` / 青锋·云纹靴 | `v6-gear-quality-2.png` r1c5 | `(839, 0, 1047, 194)` | 通过：云纹靴，纹样清楚 | [2923](../../ART_ASSET_MANIFEST.json#L2923) |
| `2_sword_charm` / 青锋·灵玉佩 | `v6-gear-quality-2.png` r1c6 | `(1049, 0, 1254, 194)` | 通过：独立流派灵玉佩 | [2959](../../ART_ASSET_MANIFEST.json#L2959) |
| `2_body_weapon` / 玄铁锤 | `v6-gear-quality-2.png` r2c1 | `(0, 196, 208, 391)` | 通过：玄铁龟甲锤 | [3006](../../ART_ASSET_MANIFEST.json#L3006) |
| `2_body_armor` / 玄武·灵纹铁甲 | `v6-gear-quality-2.png` r2c2 | `(210, 196, 427, 391)` | 通过：玄铁龟甲灵纹甲 | [3042](../../ART_ASSET_MANIFEST.json#L3042) |
| `2_body_head` / 玄武·灵纹冠 | `v6-gear-quality-2.png` r2c3 | `(429, 196, 631, 391)` | 通过：灵纹冠，材质服从流派 | [3078](../../ART_ASSET_MANIFEST.json#L3078) |
| `2_body_bracer` / 玄武·灵纹护腕 | `v6-gear-quality-2.png` r2c4 | `(633, 196, 837, 391)` | 通过：精工灵纹护腕、局部嵌件 | [3114](../../ART_ASSET_MANIFEST.json#L3114) |
| `2_body_boots` / 玄武·云纹靴 | `v6-gear-quality-2.png` r2c5 | `(839, 196, 1047, 391)` | 通过：云纹靴，纹样清楚 | [3150](../../ART_ASSET_MANIFEST.json#L3150) |
| `2_body_charm` / 玄武·灵玉佩 | `v6-gear-quality-2.png` r2c6 | `(1049, 196, 1254, 391)` | 通过：独立流派灵玉佩 | [3186](../../ART_ASSET_MANIFEST.json#L3186) |
| `2_thunder_weapon` / 引雷枪 | `v6-gear-quality-2.png` r3c1 | `(0, 393, 208, 594)` | 通过：有枪尖和局部雷弧的枪 | [3233](../../ART_ASSET_MANIFEST.json#L3233) |
| `2_thunder_armor` / 雷霄·灵纹衣 | `v6-gear-quality-2.png` r3c2 | `(210, 393, 427, 594)` | 通过：深蓝云雷灵纹衣 | [3269](../../ART_ASSET_MANIFEST.json#L3269) |
| `2_thunder_head` / 雷霄·灵纹冠 | `v6-gear-quality-2.png` r3c3 | `(429, 393, 631, 594)` | 通过：灵纹冠，材质服从流派 | [3305](../../ART_ASSET_MANIFEST.json#L3305) |
| `2_thunder_bracer` / 雷霄·灵纹护腕 | `v6-gear-quality-2.png` r3c4 | `(633, 393, 837, 594)` | 通过：精工灵纹护腕、局部嵌件 | [3341](../../ART_ASSET_MANIFEST.json#L3341) |
| `2_thunder_boots` / 雷霄·云纹靴 | `v6-gear-quality-2.png` r3c5 | `(839, 393, 1047, 594)` | 通过：云纹靴，纹样清楚 | [3377](../../ART_ASSET_MANIFEST.json#L3377) |
| `2_thunder_charm` / 雷霄·灵玉佩 | `v6-gear-quality-2.png` r3c6 | `(1049, 393, 1254, 594)` | 通过：独立流派灵玉佩 | [3413](../../ART_ASSET_MANIFEST.json#L3413) |
| `2_elements_weapon` / 灵木扇 | `v3-items-atlas.png` r1c6 | `(1045, 0, 1254, 209)` | 通过：白绿灵木扇（吻合旧图） | [3460](../../ART_ASSET_MANIFEST.json#L3460) |
| `2_elements_armor` / 离火·灵纹衣 | `v6-gear-quality-2.png` r4c2 | `(210, 596, 427, 801)` | 通过：木火色灵纹衣 | [3491](../../ART_ASSET_MANIFEST.json#L3491) |
| `2_elements_head` / 离火·灵纹冠 | `v6-gear-quality-2.png` r4c3 | `(429, 596, 631, 801)` | 通过：灵纹冠，材质服从流派 | [3527](../../ART_ASSET_MANIFEST.json#L3527) |
| `2_elements_bracer` / 离火·灵纹护腕 | `v6-gear-quality-2.png` r4c4 | `(633, 596, 837, 801)` | 通过：精工灵纹护腕、局部嵌件 | [3563](../../ART_ASSET_MANIFEST.json#L3563) |
| `2_elements_boots` / 离火·云纹靴 | `v6-gear-quality-2.png` r4c5 | `(839, 596, 1047, 801)` | 通过：云纹靴，纹样清楚 | [3599](../../ART_ASSET_MANIFEST.json#L3599) |
| `2_elements_charm` / 离火·灵玉佩 | `v6-gear-quality-2.png` r4c6 | `(1049, 596, 1254, 801)` | 通过：独立流派灵玉佩 | [3635](../../ART_ASSET_MANIFEST.json#L3635) |
| `2_shadow_weapon` / 幽纹刀 | `v6-gear-quality-2.png` r5c1 | `(0, 803, 208, 1006)` | 通过：紫黑幽纹曲刀 | [3682](../../ART_ASSET_MANIFEST.json#L3682) |
| `2_shadow_armor` / 太虚·灵纹衣 | `v6-gear-quality-2.png` r5c2 | `(210, 803, 427, 1006)` | 通过：墨紫月纹灵纹衣 | [3718](../../ART_ASSET_MANIFEST.json#L3718) |
| `2_shadow_head` / 太虚·灵纹冠 | `v6-gear-quality-2.png` r5c3 | `(429, 803, 631, 1006)` | 通过：灵纹冠，材质服从流派 | [3754](../../ART_ASSET_MANIFEST.json#L3754) |
| `2_shadow_bracer` / 太虚·灵纹护腕 | `v6-gear-quality-2.png` r5c4 | `(633, 803, 837, 1006)` | 通过：精工灵纹护腕、局部嵌件 | [3790](../../ART_ASSET_MANIFEST.json#L3790) |
| `2_shadow_boots` / 太虚·云纹靴 | `v6-gear-quality-2.png` r5c5 | `(839, 803, 1047, 1006)` | 通过：云纹靴，纹样清楚 | [3826](../../ART_ASSET_MANIFEST.json#L3826) |
| `2_shadow_charm` / 太虚·灵玉佩 | `v6-gear-quality-2.png` r5c6 | `(1049, 803, 1254, 1006)` | 通过：独立流派灵玉佩 | [3862](../../ART_ASSET_MANIFEST.json#L3862) |
| `2_array_weapon` / 灵纹尺 | `v6-gear-quality-2.png` r6c1 | `(0, 1008, 208, 1254)` | 通过：玉白青玉灵纹方尺 | [3909](../../ART_ASSET_MANIFEST.json#L3909) |
| `2_array_armor` / 回春·灵纹衣 | `v6-gear-quality-2.png` r6c2 | `(210, 1008, 427, 1254)` | 通过：白绿草木灵纹衣 | [3945](../../ART_ASSET_MANIFEST.json#L3945) |
| `2_array_head` / 回春·灵纹冠 | `v6-gear-quality-2.png` r6c3 | `(429, 1008, 631, 1254)` | 通过：灵纹冠，材质服从流派 | [3981](../../ART_ASSET_MANIFEST.json#L3981) |
| `2_array_bracer` / 回春·灵纹护腕 | `v6-gear-quality-2.png` r6c4 | `(633, 1008, 837, 1254)` | 通过：精工灵纹护腕、局部嵌件 | [4017](../../ART_ASSET_MANIFEST.json#L4017) |
| `2_array_boots` / 回春·云纹靴 | `v6-gear-quality-2.png` r6c5 | `(839, 1008, 1047, 1254)` | 通过：云纹靴，纹样清楚 | [4053](../../ART_ASSET_MANIFEST.json#L4053) |
| `2_array_charm` / 回春·灵玉佩 | `v6-gear-quality-2.png` r6c6 | `(1049, 1008, 1254, 1254)` | 通过：独立流派灵玉佩 | [4089](../../ART_ASSET_MANIFEST.json#L4089) |
| `3_sword_weapon` / 紫玄剑 | `v6-gear-quality-3.png` r1c1 | `(0, 0, 212, 205)` | 通过：有局部紫晶与剑气的紫玄剑 | [4143](../../ART_ASSET_MANIFEST.json#L4143) |
| `3_sword_armor` / 青锋·紫玄衣 | `v6-gear-quality-3.png` r1c2 | `(214, 0, 433, 205)` | 通过：青白衣、局部紫玄材质 | [4179](../../ART_ASSET_MANIFEST.json#L4179) |
| `3_sword_head` / 青锋·紫玄冠 | `v6-gear-quality-3.png` r1c3 | `(435, 0, 635, 205)` | 通过：紫晶/紫玄局部镶饰冠 | [4215](../../ART_ASSET_MANIFEST.json#L4215) |
| `3_sword_bracer` / 青锋·紫玄护腕 | `v6-gear-quality-3.png` r1c4 | `(637, 0, 841, 205)` | 通过：双层纹样、局部紫晶护腕 | [4251](../../ART_ASSET_MANIFEST.json#L4251) |
| `3_sword_boots` / 青锋·紫玄靴 | `v6-gear-quality-3.png` r1c5 | `(843, 0, 1058, 205)` | 通过：紫带/紫晶局部云纹靴 | [4287](../../ART_ASSET_MANIFEST.json#L4287) |
| `3_sword_charm` / 青锋·紫玄佩 | `v6-gear-quality-3.png` r1c6 | `(1060, 0, 1254, 205)` | 通过：紫玄局部晶佩，保留流派色 | [4323](../../ART_ASSET_MANIFEST.json#L4323) |
| `3_body_weapon` / 撼山锤 | `v6-gear-quality-3.png` r2c1 | `(0, 207, 212, 395)` | 通过：岩铁撼山锤、非全紫 | [4370](../../ART_ASSET_MANIFEST.json#L4370) |
| `3_body_armor` / 玄武·紫玄重甲 | `v6-gear-quality-3.png` r2c2 | `(214, 207, 433, 395)` | 通过：龟甲重甲、紫玄嵌件 | [4406](../../ART_ASSET_MANIFEST.json#L4406) |
| `3_body_head` / 玄武·紫玄冠 | `v6-gear-quality-3.png` r2c3 | `(435, 207, 635, 395)` | 通过：紫晶/紫玄局部镶饰冠 | [4442](../../ART_ASSET_MANIFEST.json#L4442) |
| `3_body_bracer` / 玄武·紫玄护腕 | `v6-gear-quality-3.png` r2c4 | `(637, 207, 841, 395)` | 通过：双层纹样、局部紫晶护腕 | [4478](../../ART_ASSET_MANIFEST.json#L4478) |
| `3_body_boots` / 玄武·紫玄靴 | `v6-gear-quality-3.png` r2c5 | `(843, 207, 1058, 395)` | 通过：紫带/紫晶局部云纹靴 | [4514](../../ART_ASSET_MANIFEST.json#L4514) |
| `3_body_charm` / 玄武·紫玄佩 | `v6-gear-quality-3.png` r2c6 | `(1060, 207, 1254, 395)` | 通过：紫玄局部晶佩，保留流派色 | [4550](../../ART_ASSET_MANIFEST.json#L4550) |
| `3_thunder_weapon` / 紫电杖 | `v6-gear-quality-3.png` r3c1 | `(0, 397, 212, 597)` | 通过：圆雷珠杖首紫电法杖、非枪 | [4597](../../ART_ASSET_MANIFEST.json#L4597) |
| `3_thunder_armor` / 雷霄·紫玄衣 | `v6-gear-quality-3.png` r3c2 | `(214, 397, 433, 597)` | 通过：深蓝衣、紫电嵌件 | [4633](../../ART_ASSET_MANIFEST.json#L4633) |
| `3_thunder_head` / 雷霄·紫玄冠 | `v6-gear-quality-3.png` r3c3 | `(435, 397, 635, 597)` | 通过：紫晶/紫玄局部镶饰冠 | [4669](../../ART_ASSET_MANIFEST.json#L4669) |
| `3_thunder_bracer` / 雷霄·紫玄护腕 | `v6-gear-quality-3.png` r3c4 | `(637, 397, 841, 597)` | 通过：双层纹样、局部紫晶护腕 | [4705](../../ART_ASSET_MANIFEST.json#L4705) |
| `3_thunder_boots` / 雷霄·紫玄靴 | `v6-gear-quality-3.png` r3c5 | `(843, 397, 1058, 597)` | 通过：紫带/紫晶局部云纹靴 | [4741](../../ART_ASSET_MANIFEST.json#L4741) |
| `3_thunder_charm` / 雷霄·紫玄佩 | `v6-gear-quality-3.png` r3c6 | `(1060, 397, 1254, 597)` | 通过：紫玄局部晶佩，保留流派色 | [4777](../../ART_ASSET_MANIFEST.json#L4777) |
| `3_elements_weapon` / 离火扇 | `v6-gear-quality-3.png` r4c1 | `(0, 599, 212, 803)` | 通过：橙红莲焰扇、非全紫 | [4824](../../ART_ASSET_MANIFEST.json#L4824) |
| `3_elements_armor` / 离火·紫玄衣 | `v6-gear-quality-3.png` r4c2 | `(214, 599, 433, 803)` | 通过：赤红衣、局部紫玄嵌件 | [4860](../../ART_ASSET_MANIFEST.json#L4860) |
| `3_elements_head` / 离火·紫玄冠 | `v6-gear-quality-3.png` r4c3 | `(435, 599, 635, 803)` | 通过：紫晶/紫玄局部镶饰冠 | [4896](../../ART_ASSET_MANIFEST.json#L4896) |
| `3_elements_bracer` / 离火·紫玄护腕 | `v6-gear-quality-3.png` r4c4 | `(637, 599, 841, 803)` | 通过：双层纹样、局部紫晶护腕 | [4932](../../ART_ASSET_MANIFEST.json#L4932) |
| `3_elements_boots` / 离火·紫玄靴 | `v6-gear-quality-3.png` r4c5 | `(843, 599, 1058, 803)` | 通过：紫带/紫晶局部云纹靴 | [4968](../../ART_ASSET_MANIFEST.json#L4968) |
| `3_elements_charm` / 离火·紫玄佩 | `v6-gear-quality-3.png` r4c6 | `(1060, 599, 1254, 803)` | 通过：紫玄局部晶佩，保留流派色 | [5004](../../ART_ASSET_MANIFEST.json#L5004) |
| `3_shadow_weapon` / 玄冥刃 | `v6-gear-quality-3.png` r5c1 | `(0, 805, 212, 1007)` | 通过：墨银曲刃与幽青影气 | [5051](../../ART_ASSET_MANIFEST.json#L5051) |
| `3_shadow_armor` / 太虚·紫玄衣 | `v6-gear-quality-3.png` r5c2 | `(214, 805, 433, 1007)` | 通过：墨紫玄冥衣 | [5087](../../ART_ASSET_MANIFEST.json#L5087) |
| `3_shadow_head` / 太虚·紫玄冠 | `v6-gear-quality-3.png` r5c3 | `(435, 805, 635, 1007)` | 通过：紫晶/紫玄局部镶饰冠 | [5123](../../ART_ASSET_MANIFEST.json#L5123) |
| `3_shadow_bracer` / 太虚·紫玄护腕 | `v6-gear-quality-3.png` r5c4 | `(637, 805, 841, 1007)` | 通过：双层纹样、局部紫晶护腕 | [5159](../../ART_ASSET_MANIFEST.json#L5159) |
| `3_shadow_boots` / 太虚·紫玄靴 | `v6-gear-quality-3.png` r5c5 | `(843, 805, 1058, 1007)` | 通过：紫带/紫晶局部云纹靴 | [5195](../../ART_ASSET_MANIFEST.json#L5195) |
| `3_shadow_charm` / 太虚·紫玄佩 | `v6-gear-quality-3.png` r5c6 | `(1060, 805, 1254, 1007)` | 通过：紫玄局部晶佩，保留流派色 | [5231](../../ART_ASSET_MANIFEST.json#L5231) |
| `3_array_weapon` / 玄星尺 | `v6-gear-quality-3.png` r6c1 | `(0, 1009, 212, 1254)` | 通过：星蓝方尺与金线星图 | [5278](../../ART_ASSET_MANIFEST.json#L5278) |
| `3_array_armor` / 回春·紫玄衣 | `v6-gear-quality-3.png` r6c2 | `(214, 1009, 433, 1254)` | 通过：白绿丹阵衣、局部紫带 | [5314](../../ART_ASSET_MANIFEST.json#L5314) |
| `3_array_head` / 回春·紫玄冠 | `v6-gear-quality-3.png` r6c3 | `(435, 1009, 635, 1254)` | 通过：紫晶/紫玄局部镶饰冠 | [5350](../../ART_ASSET_MANIFEST.json#L5350) |
| `3_array_bracer` / 回春·紫玄护腕 | `v6-gear-quality-3.png` r6c4 | `(637, 1009, 841, 1254)` | 通过：双层纹样、局部紫晶护腕 | [5386](../../ART_ASSET_MANIFEST.json#L5386) |
| `3_array_boots` / 回春·紫玄靴 | `v6-gear-quality-3.png` r6c5 | `(843, 1009, 1058, 1254)` | 通过：紫带/紫晶局部云纹靴 | [5422](../../ART_ASSET_MANIFEST.json#L5422) |
| `3_array_charm` / 回春·紫玄佩 | `v6-gear-quality-3.png` r6c6 | `(1060, 1009, 1254, 1254)` | 通过：紫玄局部晶佩，保留流派色 | [5458](../../ART_ASSET_MANIFEST.json#L5458) |
| `4_sword_weapon` / 天锋剑 | `v6-gear-quality-4.png` r1c1 | `(0, 0, 207, 202)` | 通过：青玉银剑与风青光 | [5512](../../ART_ASSET_MANIFEST.json#L5512) |
| `4_sword_armor` / 青锋·天灵宝衣 | `v6-gear-quality-4.png` r1c2 | `(209, 0, 427, 202)` | 通过：玉白云青天灵宝衣 | [5548](../../ART_ASSET_MANIFEST.json#L5548) |
| `4_sword_head` / 青锋·天灵宝冠 | `v6-gear-quality-4.png` r1c3 | `(429, 0, 632, 202)` | 通过：华美宝冠、独立流派元素 | [5584](../../ART_ASSET_MANIFEST.json#L5584) |
| `4_sword_bracer` / 青锋·天灵宝腕 | `v6-gear-quality-4.png` r1c4 | `(634, 0, 835, 202)` | 通过：宝腕与局部元素光 | [5620](../../ART_ASSET_MANIFEST.json#L5620) |
| `4_sword_boots` / 青锋·天灵宝履 | `v6-gear-quality-4.png` r1c5 | `(837, 0, 1051, 202)` | 通过：宝履与独立流派光 | [5656](../../ART_ASSET_MANIFEST.json#L5656) |
| `4_sword_charm` / 青锋·天灵宝佩 | `v6-gear-quality-4.png` r1c6 | `(1053, 0, 1254, 202)` | 通过：宝佩与局部元素光 | [5692](../../ART_ASSET_MANIFEST.json#L5692) |
| `4_body_weapon` / 伏岳锤 | `v6-gear-quality-4.png` r2c1 | `(0, 204, 207, 394)` | 通过：岩铁伏岳锤与浮岩 | [5739](../../ART_ASSET_MANIFEST.json#L5739) |
| `4_body_armor` / 玄武·天灵宝甲 | `v3-items-atlas.png` r1c2 | `(209, 0, 418, 209)` | 通过：黑金天灵宝甲（吻合旧图） | [5775](../../ART_ASSET_MANIFEST.json#L5775) |
| `4_body_head` / 玄武·天灵宝冠 | `v6-gear-quality-4.png` r2c3 | `(429, 204, 632, 394)` | 通过：华美宝冠、独立流派元素 | [5806](../../ART_ASSET_MANIFEST.json#L5806) |
| `4_body_bracer` / 玄武·天灵宝腕 | `v6-gear-quality-4.png` r2c4 | `(634, 204, 835, 394)` | 通过：宝腕与局部元素光 | [5842](../../ART_ASSET_MANIFEST.json#L5842) |
| `4_body_boots` / 玄武·天灵宝履 | `v6-gear-quality-4.png` r2c5 | `(837, 204, 1051, 394)` | 通过：宝履与独立流派光 | [5878](../../ART_ASSET_MANIFEST.json#L5878) |
| `4_body_charm` / 玄武·天灵宝佩 | `v6-gear-quality-4.png` r2c6 | `(1053, 204, 1254, 394)` | 通过：宝佩与局部元素光 | [5914](../../ART_ASSET_MANIFEST.json#L5914) |
| `4_thunder_weapon` / 九霄雷杖 | `v6-gear-quality-4.png` r3c1 | `(0, 396, 207, 592)` | 通过：圆雷珠龙绕杖首、雷蓝长杖 | [5961](../../ART_ASSET_MANIFEST.json#L5961) |
| `4_thunder_armor` / 雷霄·天灵宝衣 | `v6-gear-quality-4.png` r3c2 | `(209, 396, 427, 592)` | 通过：雷蓝天灵宝衣 | [5997](../../ART_ASSET_MANIFEST.json#L5997) |
| `4_thunder_head` / 雷霄·天灵宝冠 | `v6-gear-quality-4.png` r3c3 | `(429, 396, 632, 592)` | 通过：华美宝冠、独立流派元素 | [6033](../../ART_ASSET_MANIFEST.json#L6033) |
| `4_thunder_bracer` / 雷霄·天灵宝腕 | `v6-gear-quality-4.png` r3c4 | `(634, 396, 835, 592)` | 通过：宝腕与局部元素光 | [6069](../../ART_ASSET_MANIFEST.json#L6069) |
| `4_thunder_boots` / 雷霄·天灵宝履 | `v6-gear-quality-4.png` r3c5 | `(837, 396, 1051, 592)` | 通过：宝履与独立流派光 | [6105](../../ART_ASSET_MANIFEST.json#L6105) |
| `4_thunder_charm` / 雷霄·天灵宝佩 | `v6-gear-quality-4.png` r3c6 | `(1053, 396, 1254, 592)` | 通过：宝佩与局部元素光 | [6141](../../ART_ASSET_MANIFEST.json#L6141) |
| `4_elements_weapon` / 天焰扇 | `v6-gear-quality-4.png` r4c1 | `(0, 594, 207, 795)` | 通过：火莲扇与火橙光 | [6188](../../ART_ASSET_MANIFEST.json#L6188) |
| `4_elements_armor` / 离火·天灵宝衣 | `v6-gear-quality-4.png` r4c2 | `(209, 594, 427, 795)` | 通过：火红天灵宝衣 | [6224](../../ART_ASSET_MANIFEST.json#L6224) |
| `4_elements_head` / 离火·天灵宝冠 | `v6-gear-quality-4.png` r4c3 | `(429, 594, 632, 795)` | 通过：华美宝冠、独立流派元素 | [6260](../../ART_ASSET_MANIFEST.json#L6260) |
| `4_elements_bracer` / 离火·天灵宝腕 | `v6-gear-quality-4.png` r4c4 | `(634, 594, 835, 795)` | 通过：宝腕与局部元素光 | [6296](../../ART_ASSET_MANIFEST.json#L6296) |
| `4_elements_boots` / 离火·天灵宝履 | `v6-gear-quality-4.png` r4c5 | `(837, 594, 1051, 795)` | 通过：宝履与独立流派光 | [6332](../../ART_ASSET_MANIFEST.json#L6332) |
| `4_elements_charm` / 离火·天灵宝佩 | `v6-gear-quality-4.png` r4c6 | `(1053, 594, 1254, 795)` | 通过：宝佩与局部元素光 | [6368](../../ART_ASSET_MANIFEST.json#L6368) |
| `4_shadow_weapon` / 吞夜刃 | `v6-gear-quality-4.png` r5c1 | `(0, 797, 207, 1002)` | 通过：紫黑曲刃与幽青夜魂气 | [6415](../../ART_ASSET_MANIFEST.json#L6415) |
| `4_shadow_armor` / 太虚·天灵宝衣 | `v6-gear-quality-4.png` r5c2 | `(209, 797, 427, 1002)` | 通过：墨黑幽青天灵宝衣 | [6451](../../ART_ASSET_MANIFEST.json#L6451) |
| `4_shadow_head` / 太虚·天灵宝冠 | `v6-gear-quality-4.png` r5c3 | `(429, 797, 632, 1002)` | 通过：华美宝冠、独立流派元素 | [6487](../../ART_ASSET_MANIFEST.json#L6487) |
| `4_shadow_bracer` / 太虚·天灵宝腕 | `v6-gear-quality-4.png` r5c4 | `(634, 797, 835, 1002)` | 通过：宝腕与局部元素光 | [6523](../../ART_ASSET_MANIFEST.json#L6523) |
| `4_shadow_boots` / 太虚·天灵宝履 | `v6-gear-quality-4.png` r5c5 | `(837, 797, 1051, 1002)` | 通过：宝履与独立流派光 | [6559](../../ART_ASSET_MANIFEST.json#L6559) |
| `4_shadow_charm` / 太虚·天灵宝佩 | `v6-gear-quality-4.png` r5c6 | `(1053, 797, 1254, 1002)` | 通过：宝佩与局部元素光 | [6595](../../ART_ASSET_MANIFEST.json#L6595) |
| `4_array_weapon` / 天衡尺 | `v6-gear-quality-4.png` r6c1 | `(0, 1004, 207, 1254)` | 通过：玉白青玉星图平尺 | [6642](../../ART_ASSET_MANIFEST.json#L6642) |
| `4_array_armor` / 回春·天灵宝衣 | `v6-gear-quality-4.png` r6c2 | `(209, 1004, 427, 1254)` | 通过：白绿天灵宝衣 | [6678](../../ART_ASSET_MANIFEST.json#L6678) |
| `4_array_head` / 回春·天灵宝冠 | `v6-gear-quality-4.png` r6c3 | `(429, 1004, 632, 1254)` | 通过：华美宝冠、独立流派元素 | [6714](../../ART_ASSET_MANIFEST.json#L6714) |
| `4_array_bracer` / 回春·天灵宝腕 | `v6-gear-quality-4.png` r6c4 | `(634, 1004, 835, 1254)` | 通过：宝腕与局部元素光 | [6750](../../ART_ASSET_MANIFEST.json#L6750) |
| `4_array_boots` / 回春·天灵宝履 | `v6-gear-quality-4.png` r6c5 | `(837, 1004, 1051, 1254)` | 通过：宝履与独立流派光 | [6786](../../ART_ASSET_MANIFEST.json#L6786) |
| `4_array_charm` / 回春·天灵宝佩 | `v6-gear-quality-4.png` r6c6 | `(1053, 1004, 1254, 1254)` | 通过：宝佩与局部元素光 | [6822](../../ART_ASSET_MANIFEST.json#L6822) |
| `5_sword_weapon` / 青锋剑 | `v3-items-atlas.png` r1c1 | `(0, 0, 209, 209)` | 通过：青玉银白直剑与清青剑气（吻合旧图） | [6876](../../ART_ASSET_MANIFEST.json#L6876) |
| `5_sword_armor` / 流云衣 | `v6-gear-quality-5.png` r1c2 | `(211, 0, 417, 194)` | 通过：玉白云蓝长袍与流云飘带 | [6907](../../ART_ASSET_MANIFEST.json#L6907) |
| `5_sword_head` / 藏锋冠 | `v6-gear-quality-5.png` r1c3 | `(419, 0, 626, 194)` | 通过：青玉剑饰银冠与隐约浮剑 | [6943](../../ART_ASSET_MANIFEST.json#L6943) |
| `5_sword_bracer` / 追影腕 | `v6-gear-quality-5.png` r1c4 | `(628, 0, 835, 194)` | 通过：银灰护腕、青带与清蓝残影 | [6979](../../ART_ASSET_MANIFEST.json#L6979) |
| `5_sword_boots` / 逐风履 | `v6-gear-quality-5.png` r1c5 | `(837, 0, 1043, 194)` | 通过：白青风羽靴与蓝风涡 | [7015](../../ART_ASSET_MANIFEST.json#L7015) |
| `5_sword_charm` / 剑心佩 | `v6-gear-quality-5.png` r1c6 | `(1045, 0, 1254, 194)` | 通过：青玉剑形佩与清白剑环 | [7051](../../ART_ASSET_MANIFEST.json#L7051) |
| `5_body_weapon` / 镇岳锤 | `v6-gear-quality-5.png` r2c1 | `(0, 196, 209, 387)` | 通过：岩铁山锤、龟甲与浮岩符 | [7098](../../ART_ASSET_MANIFEST.json#L7098) |
| `5_body_armor` / 玄武甲 | `v6-gear-quality-5.png` r2c2 | `(211, 196, 417, 387)` | 通过：玄铁青铜龟甲铠、深苔绿核心 | [7134](../../ART_ASSET_MANIFEST.json#L7134) |
| `5_body_head` / 山骨冠 | `v6-gear-quality-5.png` r2c3 | `(419, 196, 626, 387)` | 通过：岩石脊冠而非整头盔 | [7170](../../ART_ASSET_MANIFEST.json#L7170) |
| `5_body_bracer` / 承岳腕 | `v6-gear-quality-5.png` r2c4 | `(628, 196, 835, 387)` | 通过：厚铁龟甲护腕、土金护盾 | [7206](../../ART_ASSET_MANIFEST.json#L7206) |
| `5_body_boots` / 定山履 | `v6-gear-quality-5.png` r2c5 | `(837, 196, 1043, 387)` | 通过：深绿岩甲战靴与山纹光 | [7242](../../ART_ASSET_MANIFEST.json#L7242) |
| `5_body_charm` / 不动佩 | `v6-gear-quality-5.png` r2c6 | `(1045, 196, 1254, 387)` | 通过：八角玄石龟甲佩与土金环 | [7278](../../ART_ASSET_MANIFEST.json#L7278) |
| `5_thunder_weapon` / 雷霄杖 | `v6-gear-quality-5.png` r3c1 | `(0, 389, 209, 588)` | 通过：圆雷珠杖首、直杖身、无枪刃 | [7325](../../ART_ASSET_MANIFEST.json#L7325) |
| `5_thunder_armor` / 鸣雷衣 | `v6-gear-quality-5.png` r3c2 | `(211, 389, 417, 588)` | 通过：靛蓝雷云袍与蓝白雷弧 | [7361](../../ART_ASSET_MANIFEST.json#L7361) |
| `5_thunder_head` / 九霄冠 | `v6-gear-quality-5.png` r3c3 | `(419, 389, 626, 588)` | 通过：开放银云冠与紫蓝雷珠 | [7397](../../ART_ASSET_MANIFEST.json#L7397) |
| `5_thunder_bracer` / 引电腕 | `v6-gear-quality-5.png` r3c4 | `(628, 389, 835, 588)` | 通过：铜银双环护腕与电弧 | [7433](../../ART_ASSET_MANIFEST.json#L7433) |
| `5_thunder_boots` / 惊电履 | `v6-gear-quality-5.png` r3c5 | `(837, 389, 1043, 588)` | 通过：雷蓝云纹履与电弧 | [7469](../../ART_ASSET_MANIFEST.json#L7469) |
| `5_thunder_charm` / 藏雷佩 | `v6-gear-quality-5.png` r3c6 | `(1045, 389, 1254, 588)` | 通过：云形藏雷佩、紫雷珠 | [7505](../../ART_ASSET_MANIFEST.json#L7505) |
| `5_elements_weapon` / 四象扇 | `v6-gear-quality-5.png` r4c1 | `(0, 590, 209, 783)` | 通过：扇面有木、火、水、山纹样与四向光 | [7552](../../ART_ASSET_MANIFEST.json#L7552) |
| `5_elements_armor` / 离火衣 | `v6-gear-quality-5.png` r4c2 | `(211, 590, 417, 783)` | 通过：朱红离火衣与莲焰 | [7588](../../ART_ASSET_MANIFEST.json#L7588) |
| `5_elements_head` / 木灵冠 | `v6-gear-quality-5.png` r4c3 | `(419, 590, 626, 783)` | 通过：藤蔓翠叶冠与生命微粒 | [7624](../../ART_ASSET_MANIFEST.json#L7624) |
| `5_elements_bracer` / 寒潮腕 | `v6-gear-quality-5.png` r4c4 | `(628, 590, 835, 783)` | 通过：冰蓝透明护腕与银色水波 | [7660](../../ART_ASSET_MANIFEST.json#L7660) |
| `5_elements_boots` / 地脉履 | `v6-gear-quality-5.png` r4c5 | `(837, 590, 1043, 783)` | 通过：岩褐深绿地脉靴与土金线 | [7696](../../ART_ASSET_MANIFEST.json#L7696) |
| `5_elements_charm` / 五行佩 | `v6-gear-quality-5.png` r4c6 | `(1045, 590, 1254, 783)` | 通过：五色五行珠环与元素轨道 | [7732](../../ART_ASSET_MANIFEST.json#L7732) |
| `5_shadow_weapon` / 蚀魄刃 | `v3-items-atlas.png` r1c5 | `(836, 0, 1045, 209)` | 通过：墨钢紫黑曲刃与魂青侵蚀（吻合旧图） | [7779](../../ART_ASSET_MANIFEST.json#L7779) |
| `5_shadow_armor` / 太虚衣 | `v6-gear-quality-5.png` r5c2 | `(211, 785, 417, 981)` | 通过：墨黑月银夜行袍与幽青影雾 | [7810](../../ART_ASSET_MANIFEST.json#L7810) |
| `5_shadow_head` / 幽火冠 | `v6-gear-quality-5.png` r5c3 | `(419, 785, 626, 981)` | 通过：暗银冠架与青紫魂火 | [7846](../../ART_ASSET_MANIFEST.json#L7846) |
| `5_shadow_bracer` / 噬影腕 | `v6-gear-quality-5.png` r5c4 | `(628, 785, 835, 981)` | 通过：墨黑弯甲护腕与散影 | [7882](../../ART_ASSET_MANIFEST.json#L7882) |
| `5_shadow_boots` / 夜行履 | `v6-gear-quality-5.png` r5c5 | `(837, 785, 1043, 981)` | 通过：墨黑金属月纹战靴、紫绸与隐匿雾（文档已对齐） | [7918](../../ART_ASSET_MANIFEST.json#L7918) |
| `5_shadow_charm` / 摄魂佩 | `v6-gear-quality-5.png` r5c6 | `(1045, 785, 1254, 981)` | 通过：黑曜紫魂核佩与幽青魂丝 | [7954](../../ART_ASSET_MANIFEST.json#L7954) |
| `5_array_weapon` / 星罗尺 | `v6-gear-quality-5.png` r6c1 | `(0, 983, 209, 1254)` | 通过：平直方尺、刻度星图、星蓝节点 | [8001](../../ART_ASSET_MANIFEST.json#L8001) |
| `5_array_armor` / 回春衣 | `v6-gear-quality-5.png` r6c2 | `(211, 983, 417, 1254)` | 通过：白绿医修长袍、竹藤白花 | [8037](../../ART_ASSET_MANIFEST.json#L8037) |
| `5_array_head` / 清心冠 | `v6-gear-quality-5.png` r6c3 | `(419, 983, 626, 1254)` | 通过：青玉莲叶冠与白莲 | [8073](../../ART_ASSET_MANIFEST.json#L8073) |
| `5_array_bracer` / 灵枢腕 | `v6-gear-quality-5.png` r6c4 | `(628, 983, 835, 1254)` | 通过：青玉银丝经络护腕与星点 | [8109](../../ART_ASSET_MANIFEST.json#L8109) |
| `5_array_boots` / 归元履 | `v6-gear-quality-5.png` r6c5 | `(837, 983, 1043, 1254)` | 通过：白绿归元靴、循环柔绿光 | [8145](../../ART_ASSET_MANIFEST.json#L8145) |
| `5_array_charm` / 丹心佩 | `v6-gear-quality-5.png` r6c6 | `(1045, 983, 1254, 1254)` | 通过：青玉白莲护座与暖金丹心 | [8181](../../ART_ASSET_MANIFEST.json#L8181) |

## 逐件功法记录：48 部

证据位于 `dist/audit-v4/techniques-1.png、techniques-2.png`。

| ID / 实际名称 | 实际 PNG / 行列 | 原生矩形 | 视觉结论 | manifest 源行 |
|---|---|---|---|---:|
| `sword_heart_0` / 归一剑经 | `v6-techniques-atlas.png` r1c1 | `(0, 0, 177, 186)` | 通过：书册，竹叶与直剑图样 | [8227](../../ART_ASSET_MANIFEST.json#L8227) |
| `sword_heart_1` / 太清剑谱 | `v6-techniques-atlas.png` r1c2 | `(179, 0, 360, 186)` | 通过：银白剑谱，多重剑影 | [8258](../../ART_ASSET_MANIFEST.json#L8258) |
| `sword_skill_0` / 裂空剑 | `v6-techniques-atlas.png` r1c3 | `(362, 0, 535, 186)` | 通过：单剑破空斩击 | [8289](../../ART_ASSET_MANIFEST.json#L8289) |
| `sword_skill_1` / 追影剑 | `v6-techniques-atlas.png` r1c4 | `(537, 0, 720, 186)` | 通过：三道平行剑影 | [8320](../../ART_ASSET_MANIFEST.json#L8320) |
| `sword_skill_2` / 剑域 | `v6-techniques-atlas.png` r1c5 | `(722, 0, 902, 186)` | 通过：环形剑域与五剑 | [8351](../../ART_ASSET_MANIFEST.json#L8351) |
| `sword_skill_3` / 归一斩 | `v6-techniques-atlas.png` r1c6 | `(904, 0, 1089, 186)` | 通过：归一剑束落斩 | [8382](../../ART_ASSET_MANIFEST.json#L8382) |
| `sword_secret_0` / 破锋录 | `v6-techniques-atlas.png` r1c7 | `(1091, 0, 1270, 186)` | 通过：剑锋图卷轴 | [8413](../../ART_ASSET_MANIFEST.json#L8413) |
| `sword_secret_1` / 藏锋诀 | `v6-techniques-atlas.png` r1c8 | `(1272, 0, 1448, 186)` | 通过：云隐剑柄卷轴 | [8444](../../ART_ASSET_MANIFEST.json#L8444) |
| `body_heart_0` / 不动金身诀 | `v6-techniques-atlas.png` r2c1 | `(0, 188, 177, 360)` | 通过：山岳书册 | [8481](../../ART_ASSET_MANIFEST.json#L8481) |
| `body_heart_1` / 百炼回山经 | `v6-techniques-atlas.png` r2c2 | `(179, 188, 360, 360)` | 通过：金岩山岳宝册 | [8512](../../ART_ASSET_MANIFEST.json#L8512) |
| `body_skill_0` / 伏岳掌 | `v6-techniques-atlas.png` r2c3 | `(362, 188, 535, 360)` | 通过：岩石掌击 | [8543](../../ART_ASSET_MANIFEST.json#L8543) |
| `body_skill_1` / 镇骨甲 | `v6-techniques-atlas.png` r2c4 | `(537, 188, 720, 360)` | 通过：护甲纹盾牌 | [8574](../../ART_ASSET_MANIFEST.json#L8574) |
| `body_skill_2` / 回山震 | `v6-techniques-atlas.png` r2c5 | `(722, 188, 902, 360)` | 通过：山峰震荡 | [8605](../../ART_ASSET_MANIFEST.json#L8605) |
| `body_skill_3` / 护命诀 | `v6-techniques-atlas.png` r2c6 | `(904, 188, 1089, 360)` | 通过：双掌护持绿色生命旋纹 | [8636](../../ART_ASSET_MANIFEST.json#L8636) |
| `body_secret_0` / 山骨秘录 | `v6-techniques-atlas.png` r2c7 | `(1091, 188, 1270, 360)` | 通过：山骨山岳图卷轴 | [8667](../../ART_ASSET_MANIFEST.json#L8667) |
| `body_secret_1` / 归元篇 | `v6-techniques-atlas.png` r2c8 | `(1272, 188, 1448, 360)` | 通过：归元旋气卷轴 | [8698](../../ART_ASSET_MANIFEST.json#L8698) |
| `thunder_heart_0` / 九霄雷经 | `v6-techniques-atlas.png` r3c1 | `(0, 362, 177, 544)` | 通过：雷云书册 | [8735](../../ART_ASSET_MANIFEST.json#L8735) |
| `thunder_heart_1` / 藏雷真解 | `v6-techniques-atlas.png` r3c2 | `(179, 362, 360, 544)` | 通过：封雷宝册 | [8766](../../ART_ASSET_MANIFEST.json#L8766) |
| `thunder_skill_0` / 引雷诀 | `v6-techniques-atlas.png` r3c3 | `(362, 362, 535, 544)` | 通过：落雷击地 | [8797](../../ART_ASSET_MANIFEST.json#L8797) |
| `thunder_skill_1` / 惊电步 | `v6-techniques-atlas.png` r3c4 | `(537, 362, 720, 544)` | 通过：电弧中的靴与步伐 | [8828](../../ART_ASSET_MANIFEST.json#L8828) |
| `thunder_skill_2` / 五雷印 | `v6-techniques-atlas.png` r3c5 | `(722, 362, 902, 544)` | 通过：五向雷电印 | [8859](../../ART_ASSET_MANIFEST.json#L8859) |
| `thunder_skill_3` / 天罚 | `v6-techniques-atlas.png` r3c6 | `(904, 362, 1089, 544)` | 通过：雷云天罚落柱 | [8890](../../ART_ASSET_MANIFEST.json#L8890) |
| `thunder_secret_0` / 导雷篇 | `v6-techniques-atlas.png` r3c7 | `(1091, 362, 1270, 544)` | 通过：导雷分枝卷轴 | [8921](../../ART_ASSET_MANIFEST.json#L8921) |
| `thunder_secret_1` / 余雷诀 | `v6-techniques-atlas.png` r3c8 | `(1272, 362, 1448, 544)` | 通过：蓝紫余雷卷轴 | [8952](../../ART_ASSET_MANIFEST.json#L8952) |
| `elements_heart_0` / 五行合道经 | `v6-techniques-atlas.png` r4c1 | `(0, 546, 177, 724)` | 通过：五元素书册 | [8989](../../ART_ASSET_MANIFEST.json#L8989) |
| `elements_heart_1` / 四象轮转法 | `v6-techniques-atlas.png` r4c2 | `(179, 546, 360, 724)` | 通过：四象旋纹书册 | [9020](../../ART_ASSET_MANIFEST.json#L9020) |
| `elements_skill_0` / 青藤缚 | `v6-techniques-atlas.png` r4c3 | `(362, 546, 535, 724)` | 通过：青藤缠绕 | [9051](../../ART_ASSET_MANIFEST.json#L9051) |
| `elements_skill_1` / 火莲 | `v6-techniques-atlas.png` r4c4 | `(537, 546, 720, 724)` | 通过：橙红火焰莲 | [9082](../../ART_ASSET_MANIFEST.json#L9082) |
| `elements_skill_2` / 寒潮 | `v6-techniques-atlas.png` r4c5 | `(722, 546, 902, 724)` | 通过：寒蓝浪潮与雪晶 | [9113](../../ART_ASSET_MANIFEST.json#L9113) |
| `elements_skill_3` / 地脉转 | `v6-techniques-atlas.png` r4c6 | `(904, 546, 1089, 724)` | 通过：岩层地脉球 | [9144](../../ART_ASSET_MANIFEST.json#L9144) |
| `elements_secret_0` / 化生诀 | `v6-techniques-atlas.png` r4c7 | `(1091, 546, 1270, 724)` | 通过：嫩叶化生卷轴 | [9175](../../ART_ASSET_MANIFEST.json#L9175) |
| `elements_secret_1` / 逆五行篇 | `v6-techniques-atlas.png` r4c8 | `(1272, 546, 1448, 724)` | 通过：五行旋纹卷轴 | [9206](../../ART_ASSET_MANIFEST.json#L9206) |
| `shadow_heart_0` / 玄冥蚀魄经 | `v6-techniques-atlas.png` r5c1 | `(0, 726, 177, 901)` | 通过：玄冥蚀魄书册 | [9243](../../ART_ASSET_MANIFEST.json#L9243) |
| `shadow_heart_1` / 摄魂归元诀 | `v6-techniques-atlas.png` r5c2 | `(179, 726, 360, 901)` | 通过：魂核宝册 | [9274](../../ART_ASSET_MANIFEST.json#L9274) |
| `shadow_skill_0` / 蚀魄印 | `v6-techniques-atlas.png` r5c3 | `(362, 726, 535, 901)` | 通过：紫青侵蚀旋涡 | [9305](../../ART_ASSET_MANIFEST.json#L9305) |
| `shadow_skill_1` / 幽火 | `v6-techniques-atlas.png` r5c4 | `(537, 726, 720, 901)` | 通过：幽青魂火 | [9336](../../ART_ASSET_MANIFEST.json#L9336) |
| `shadow_skill_2` / 断魂 | `v6-techniques-atlas.png` r5c5 | `(722, 726, 902, 901)` | 通过：冷银魂链断斩 | [9367](../../ART_ASSET_MANIFEST.json#L9367) |
| `shadow_skill_3` / 摄魄 | `v6-techniques-atlas.png` r5c6 | `(904, 726, 1089, 901)` | 通过：魂手摄取魂光 | [9398](../../ART_ASSET_MANIFEST.json#L9398) |
| `shadow_secret_0` / 残烬秘录 | `v6-techniques-atlas.png` r5c7 | `(1091, 726, 1270, 901)` | 通过：紫青残烬卷轴 | [9429](../../ART_ASSET_MANIFEST.json#L9429) |
| `shadow_secret_1` / 噬影篇 | `v6-techniques-atlas.png` r5c8 | `(1272, 726, 1448, 901)` | 通过：蓝青隐影卷轴 | [9460](../../ART_ASSET_MANIFEST.json#L9460) |
| `array_heart_0` / 太素丹阵经 | `v6-techniques-atlas.png` r6c1 | `(0, 903, 177, 1086)` | 通过：草木丹阵书册 | [9497](../../ART_ASSET_MANIFEST.json#L9497) |
| `array_heart_1` / 星罗炼神法 | `v6-techniques-atlas.png` r6c2 | `(179, 903, 360, 1086)` | 通过：星图书册 | [9528](../../ART_ASSET_MANIFEST.json#L9528) |
| `array_skill_0` / 回春术 | `v6-techniques-atlas.png` r6c3 | `(362, 903, 535, 1086)` | 通过：掌托新生绿苗 | [9559](../../ART_ASSET_MANIFEST.json#L9559) |
| `array_skill_1` / 净尘诀 | `v6-techniques-atlas.png` r6c4 | `(537, 903, 720, 1086)` | 通过：莲叶白蓝净尘气 | [9590](../../ART_ASSET_MANIFEST.json#L9590) |
| `array_skill_2` / 聚灵阵 | `v6-techniques-atlas.png` r6c5 | `(722, 903, 902, 1086)` | 通过：青绿聚灵阵盘 | [9621](../../ART_ASSET_MANIFEST.json#L9621) |
| `array_skill_3` / 星罗阵 | `v6-techniques-atlas.png` r6c6 | `(904, 903, 1089, 1086)` | 通过：星蓝群星法阵 | [9652](../../ART_ASSET_MANIFEST.json#L9652) |
| `array_secret_0` / 清心诀 | `v6-techniques-atlas.png` r6c7 | `(1091, 903, 1270, 1086)` | 通过：白莲清心卷轴 | [9683](../../ART_ASSET_MANIFEST.json#L9683) |
| `array_secret_1` / 灵枢秘录 | `v6-techniques-atlas.png` r6c8 | `(1272, 903, 1448, 1086)` | 通过：人形经络图卷轴 | [9714](../../ART_ASSET_MANIFEST.json#L9714) |

## 逐件灵宝记录：12 件

证据位于 `dist/audit-v4/treasures.png`。

| ID / 实际名称 | 实际 PNG / 行列 | 原生矩形 | 视觉结论 | manifest 源行 |
|---|---|---|---|---:|
| `t0` / 青木铃 | `v6-treasures-atlas.png` r1c1 | `(0, 0, 352, 357)` | 通过：青铜木纹小铃与绿绳 | [9749](../../ART_ASSET_MANIFEST.json#L9749) |
| `t1` / 护脉佩 | `v6-treasures-atlas.png` r1c2 | `(354, 0, 725, 357)` | 通过：青玉圆佩与护脉细纹 | [9779](../../ART_ASSET_MANIFEST.json#L9779) |
| `t2` / 破障镜 | `v6-treasures-atlas.png` r1c3 | `(727, 0, 1077, 357)` | 通过：圆形冷银镜与裂光 | [9809](../../ART_ASSET_MANIFEST.json#L9809) |
| `t3` / 静海珠 | `v6-treasures-atlas.png` r1c4 | `(1079, 0, 1442, 357)` | 通过：透明海蓝水珠 | [9839](../../ART_ASSET_MANIFEST.json#L9839) |
| `t4` / 御风翎 | `v6-treasures-atlas.png` r1c5 | `(1444, 0, 1805, 357)` | 通过：青白羽翎与风涡 | [9869](../../ART_ASSET_MANIFEST.json#L9869) |
| `t5` / 镇岳印 | `v6-treasures-atlas.png` r1c6 | `(1807, 0, 2172, 357)` | 通过：方形山岳印，龟形印纽 | [9899](../../ART_ASSET_MANIFEST.json#L9899) |
| `t6` / 照魂灯 | `v6-treasures-atlas.png` r2c1 | `(0, 359, 352, 724)` | 通过：紫青魂火灯笼 | [9929](../../ART_ASSET_MANIFEST.json#L9929) |
| `t7` / 清心莲 | `v6-treasures-atlas.png` r2c2 | `(354, 359, 725, 724)` | 通过：玉白莲花、青绿莲台 | [9959](../../ART_ASSET_MANIFEST.json#L9959) |
| `t8` / 雷池令 | `v6-treasures-atlas.png` r2c3 | `(727, 359, 1077, 724)` | 通过：长方雷纹令牌与蓝紫电弧 | [9989](../../ART_ASSET_MANIFEST.json#L9989) |
| `t9` / 归元鼎 | `v6-treasures-atlas.png` r2c4 | `(1079, 359, 1442, 724)` | 通过：青铜三足鼎与回元绿气 | [10019](../../ART_ASSET_MANIFEST.json#L10019) |
| `t10` / 天衡盘 | `v6-treasures-atlas.png` r2c5 | `(1444, 359, 1805, 724)` | 通过：天文星环衡盘 | [10049](../../ART_ASSET_MANIFEST.json#L10049) |
| `t11` / 星桥玉 | `v6-treasures-atlas.png` r2c6 | `(1807, 359, 2172, 724)` | 通过：拱桥玉佩与星蓝轨道 | [10079](../../ART_ASSET_MANIFEST.json#L10079) |

## 逐件丹药记录：18 种

证据位于 `dist/audit-v4/pills.png`。

| ID / 实际名称 | 实际 PNG / 行列 | 原生矩形 | 视觉结论 | manifest 源行 |
|---|---|---|---|---:|
| `qi0` / 聚气丹 | `v6-pills-atlas.png` r1c1 | `(0, 0, 291, 293)` | 通过：粗药碗、土黄丹粒，无魔光 | [10111](../../ART_ASSET_MANIFEST.json#L10111) |
| `qi1` / 凝元丹 | `v6-pills-atlas.png` r1c2 | `(293, 0, 588, 293)` | 通过：玉青瓶、绿色凝元丹与细气 | [10140](../../ART_ASSET_MANIFEST.json#L10140) |
| `qi2` / 紫府丹 | `v6-pills-atlas.png` r1c3 | `(590, 0, 881, 293)` | 通过：紫瓷瓶与紫府旋气丹 | [10169](../../ART_ASSET_MANIFEST.json#L10169) |
| `heal0` / 回春丹 | `v6-pills-atlas.png` r1c4 | `(883, 0, 1179, 293)` | 通过：药袋、绿褐草丹，无魔光 | [10198](../../ART_ASSET_MANIFEST.json#L10198) |
| `heal1` / 续命丹 | `v6-pills-atlas.png` r1c5 | `(1181, 0, 1474, 293)` | 通过：白青瓷罐、浅绿生命丹 | [10227](../../ART_ASSET_MANIFEST.json#L10227) |
| `heal2` / 九转养元丹 | `v6-pills-atlas.png` r1c6 | `(1476, 0, 1774, 293)` | 通过：白金药碗、暖金丹与多道细气 | [10256](../../ART_ASSET_MANIFEST.json#L10256) |
| `shield0` / 护体丹 | `v6-pills-atlas.png` r2c1 | `(0, 295, 291, 574)` | 通过：灰青瓶丹与薄护盾 | [10285](../../ART_ASSET_MANIFEST.json#L10285) |
| `shield1` / 金石丹 | `v6-pills-atlas.png` r2c2 | `(293, 295, 588, 574)` | 通过：灰岩金纹丹、金石与护盾 | [10314](../../ART_ASSET_MANIFEST.json#L10314) |
| `shield2` / 玄武定身丹 | `v6-pills-atlas.png` r2c3 | `(590, 295, 881, 574)` | 通过：墨青龟甲丹、土金护盾 | [10343](../../ART_ASSET_MANIFEST.json#L10343) |
| `purify0` / 清心散 | `v6-pills-atlas.png` r2c4 | `(883, 295, 1179, 574)` | 通过：碟中白青散剂与纸包 | [10372](../../ART_ASSET_MANIFEST.json#L10372) |
| `purify1` / 涤魂丹 | `v6-pills-atlas.png` r2c5 | `(1181, 295, 1474, 574)` | 通过：白蓝瓷瓶丹、幽青魂气 | [10401](../../ART_ASSET_MANIFEST.json#L10401) |
| `purify2` / 无垢明心丹 | `v6-pills-atlas.png` r2c6 | `(1476, 295, 1774, 574)` | 通过：白玉净化丹、白莲与净光 | [10430](../../ART_ASSET_MANIFEST.json#L10430) |
| `break0` / 筑基丹 | `v6-pills-atlas.png` r3c1 | `(0, 576, 291, 887)` | 通过：青绿筑基丹、草药聚元纹 | [10459](../../ART_ASSET_MANIFEST.json#L10459) |
| `break1` / 凝金丹 | `v6-pills-atlas.png` r3c2 | `(293, 576, 588, 887)` | 通过：岩灰暖金凝结丹心、金石碎块 | [10488](../../ART_ASSET_MANIFEST.json#L10488) |
| `break2` / 凝婴丹 | `v6-pills-atlas.png` r3c3 | `(590, 576, 881, 887)` | 通过：墨青瓶、魂元旋气与识海图纹 | [10517](../../ART_ASSET_MANIFEST.json#L10517) |
| `break3` / 化神丹 | `v6-pills-atlas.png` r3c4 | `(883, 576, 1179, 887)` | 通过：白青化神丹、清灵绿气 | [10546](../../ART_ASSET_MANIFEST.json#L10546) |
| `break4` / 渡厄丹 | `v6-pills-atlas.png` r3c5 | `(1181, 576, 1474, 887)` | 通过：白蓝雷纹丹、紫蓝劫电 | [10575](../../ART_ASSET_MANIFEST.json#L10575) |
| `break5` / 道心丹 | `v6-pills-atlas.png` r3c6 | `(1476, 576, 1774, 887)` | 通过：白青阴阳丹、柔绿收念气 | [10604](../../ART_ASSET_MANIFEST.json#L10604) |

## 逐件功能图标记录：36 个

证据位于 `dist/audit-v4/utilities-1.png、utilities-2.png`。

| ID / 实际名称 | 实际 PNG / 行列 | 原生矩形 | 视觉结论 | manifest 源行 |
|---|---|---|---|---:|
| `herb` / 灵草 | `v6-utilities-atlas.png` r1c1 | `(0, 0, 210, 208)` | 通过：真实药草束、根与叶 | [10635](../../ART_ASSET_MANIFEST.json#L10635) |
| `ore` / 玄铁 | `v6-utilities-atlas.png` r1c2 | `(212, 0, 414, 208)` | 通过：深黑铁矿块 | [10666](../../ART_ASSET_MANIFEST.json#L10666) |
| `lotus` / 灵莲 | `v6-utilities-atlas.png` r1c3 | `(416, 0, 627, 208)` | 通过：白莲青叶 | [10697](../../ART_ASSET_MANIFEST.json#L10697) |
| `insight` / 参悟砂 | `v6-utilities-atlas.png` r1c4 | `(629, 0, 834, 208)` | 通过：浅碟中的细砂 | [10728](../../ART_ASSET_MANIFEST.json#L10728) |
| `essence` / 灵粹 / 炼器精华 | `v6-utilities-atlas.png` r1c5 | `(836, 0, 1039, 208)` | 通过：清青灵粹液滴瓶 | [10759](../../ART_ASSET_MANIFEST.json#L10759) |
| `soul` / 器魂 | `v6-utilities-atlas.png` r1c6 | `(1041, 0, 1254, 208)` | 通过：剑形魂核及魂环 | [10790](../../ART_ASSET_MANIFEST.json#L10790) |
| `crystal0` / 炼气天命晶 / 一阶天命晶 | `v6-utilities-atlas.png` r2c1 | `(0, 210, 210, 411)` | 通过：乳白自然晶簇 | [10821](../../ART_ASSET_MANIFEST.json#L10821) |
| `crystal1` / 筑基天命晶 / 二阶天命晶 | `v6-utilities-atlas.png` r2c2 | `(212, 210, 414, 411)` | 通过：青白双晶与雕纹基座 | [10852](../../ART_ASSET_MANIFEST.json#L10852) |
| `crystal2` / 金丹天命晶 / 三阶天命晶 | `v6-utilities-atlas.png` r2c3 | `(416, 210, 627, 411)` | 通过：三角晶棱与内凝丹核 | [10883](../../ART_ASSET_MANIFEST.json#L10883) |
| `crystal3` / 元婴天命晶 / 四阶天命晶 | `v6-utilities-atlas.png` r2c4 | `(629, 210, 834, 411)` | 通过：通透紫晶、内灵影与纹环 | [10914](../../ART_ASSET_MANIFEST.json#L10914) |
| `crystal4` / 化神天命晶 / 五阶天命晶 | `v6-utilities-atlas.png` r2c5 | `(836, 210, 1039, 411)` | 通过：星形晶棱与银金核心 | [10945](../../ART_ASSET_MANIFEST.json#L10945) |
| `crystal5` / 渡劫天命晶 / 六阶天命晶 | `v6-utilities-atlas.png` r2c6 | `(1041, 210, 1254, 411)` | 通过：虹彩雷晶、浮空蓝紫环 | [10976](../../ART_ASSET_MANIFEST.json#L10976) |
| `stones` / 灵石 | `v6-utilities-atlas.png` r3c1 | `(0, 413, 210, 605)` | 通过：数颗玉白青晶石 | [11007](../../ART_ASSET_MANIFEST.json#L11007) |
| `tickets` / 感应券 | `v6-utilities-atlas.png` r3c2 | `(212, 413, 414, 605)` | 通过：古纸感应符券与青金印 | [11038](../../ART_ASSET_MANIFEST.json#L11038) |
| `dust` / 天道尘 | `v6-utilities-atlas.png` r3c3 | `(416, 413, 627, 605)` | 通过：绸袋中的星尘细粉 | [11069](../../ART_ASSET_MANIFEST.json#L11069) |
| `jade` / 灵玉 | `v6-utilities-atlas.png` r3c4 | `(629, 413, 834, 605)` | 通过：青玉圆孔玉与绿绳 | [11100](../../ART_ASSET_MANIFEST.json#L11100) |
| `contribution` / 宗门贡献 | `v6-utilities-atlas.png` r3c5 | `(836, 413, 1039, 605)` | 通过：青铜宗门山纹圆章 | [11131](../../ART_ASSET_MANIFEST.json#L11131) |
| `universal` / 通用残页 | `v6-utilities-atlas.png` r3c6 | `(1041, 413, 1254, 605)` | 通过：纸质残页书叠 | [11162](../../ART_ASSET_MANIFEST.json#L11162) |
| `blueprint` / 炼器蓝图 | `v6-utilities-atlas.png` r4c1 | `(0, 607, 210, 811)` | 通过：器物图样炼器蓝图 | [11193](../../ART_ASSET_MANIFEST.json#L11193) |
| `field` / 灵田 | `v6-utilities-atlas.png` r4c2 | `(212, 607, 414, 811)` | 通过：围栏内灵草田 | [11224](../../ART_ASSET_MANIFEST.json#L11224) |
| `furnace` / 药炉 | `v6-utilities-atlas.png` r4c3 | `(416, 607, 627, 811)` | 通过：火焰药炉与鼎 | [11255](../../ART_ASSET_MANIFEST.json#L11255) |
| `forge` / 炼器坊 | `v6-utilities-atlas.png` r4c4 | `(629, 607, 834, 811)` | 通过：锻造砧、锤与炉火 | [11286](../../ART_ASSET_MANIFEST.json#L11286) |
| `library` / 藏经阁 | `v6-utilities-atlas.png` r4c5 | `(836, 607, 1039, 811)` | 通过：木书架、书册与卷轴 | [11317](../../ART_ASSET_MANIFEST.json#L11317) |
| `array` / 阵室 | `v6-utilities-atlas.png` r4c6 | `(1041, 607, 1254, 811)` | 通过：符阵石台 | [11348](../../ART_ASSET_MANIFEST.json#L11348) |
| `battle` / 守门灵卫 / 战斗 | `v6-utilities-atlas.png` r5c1 | `(0, 813, 210, 1020)` | 通过：持兵守门灵卫 | [11379](../../ART_ASSET_MANIFEST.json#L11379) |
| `elite` / 残阵妖影 / 精英战 | `v6-utilities-atlas.png` r5c2 | `(212, 813, 414, 1020)` | 通过：破裂阵盘与残阵幽焰 | [11410](../../ART_ASSET_MANIFEST.json#L11410) |
| `herb-room` / 灵圃残园 | `v6-utilities-atlas.png` r5c3 | `(416, 813, 627, 1020)` | 通过：草药残园与镰刀 | [11441](../../ART_ASSET_MANIFEST.json#L11441) |
| `ore-room` / 星铁石台 | `v6-utilities-atlas.png` r5c4 | `(629, 813, 834, 1020)` | 通过：铁矿石台与矿镐 | [11472](../../ART_ASSET_MANIFEST.json#L11472) |
| `healing` / 清泉石亭 | `v6-utilities-atlas.png` r5c5 | `(836, 813, 1039, 1020)` | 通过：泉水石亭 | [11503](../../ART_ASSET_MANIFEST.json#L11503) |
| `insight-room` / 无字古碑 | `v6-utilities-atlas.png` r5c6 | `(1041, 813, 1254, 1020)` | 通过：刻灵纹的无字石碑 | [11534](../../ART_ASSET_MANIFEST.json#L11534) |
| `boon` / 天意石阶 | `v6-utilities-atlas.png` r6c1 | `(0, 1022, 210, 1254)` | 通过：实际石阶与天意金光 | [11565](../../ART_ASSET_MANIFEST.json#L11565) |
| `curse` / 失衡阵眼 | `v6-utilities-atlas.png` r6c2 | `(212, 1022, 414, 1254)` | 通过：破裂失衡阵盘 | [11596](../../ART_ASSET_MANIFEST.json#L11596) |
| `merchant` / 云游行商 | `v6-utilities-atlas.png` r6c3 | `(416, 1022, 627, 1254)` | 通过：戴草帽商囊及古钱 | [11627](../../ART_ASSET_MANIFEST.json#L11627) |
| `escort` / 迷路采药人 | `v6-utilities-atlas.png` r6c4 | `(629, 1022, 834, 1254)` | 通过：背药篓、持杖采药人 | [11658](../../ART_ASSET_MANIFEST.json#L11658) |
| `relic` / 封存书匣 | `v6-utilities-atlas.png` r6c5 | `(836, 1022, 1039, 1254)` | 通过：实际木书匣，内书页与玉石 | [11689](../../ART_ASSET_MANIFEST.json#L11689) |
| `exit` / 归途阵门 | `v6-utilities-atlas.png` r6c6 | `(1041, 1022, 1254, 1254)` | 通过：石砌阵门与蓝色出口光 | [11720](../../ART_ASSET_MANIFEST.json#L11720) |

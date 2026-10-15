# V4 室内场景补图核验

日期：2026-10-07（香港时区）。本报告只记录本次已确认的两处室内资源缺口。

## 原因与生成范围

长明书院的丹典试读桌需要真实学舍室内；宗门炼丹房需要完整丹炉、药材与可控炉火。原熔岩炼器图不适合这两种场景。本次只用 OpenAI `image_gen.imagegen` 生成一张原创 2 × 1 背景图集，未生成其它新图，未修改 JavaScript、资源 manifest 或原图，未提交或构建。

生成要求：左格为中国仙侠书院内部，青玉木案、打开的草药图丹典、书架、窗外云山及暖柔光；右格为宗门炼丹房，完整青铜丹炉、药材竹匾、玉瓶、小型受控炉火与青绿金色灯光。两格独立，中心保留清晰纵深，不跨界；无人物、文字、水印和界面元素。

生成器原始输出保留在 `/workspace/generated_images/exec-a671f51a-dc91-49b2-bac7-3cd90386c72b.png`。项目文件为原字节复制，未做重绘、缩放、压缩或颜色修改。

## 文件与实际裁格

- 文件：`web/assets/v8-interiors-atlas.png`
- 格式：PNG / RGB
- 原生尺寸：1774 × 887
- 字节数：2934345
- SHA-256：`abec37b8fec38d09ae68832830958aecad145dea786ece49b629ee4852cfca51`
- 逻辑图集：2 列 × 1 行；左列为书院，右列为炼丹房。

逐列读取原生像素确认：中间亮分隔线占用 `x = 886` 和 `x = 887`。下列实际矩形排除这两列，保留各室内完整绘制范围。

| 场景 | col / row | 原生矩形 [x, y, width, height] | 归一化 crop [left, top, width, height] |
| --- | --- | --- | --- |
| 书院室内 | 0 / 0 | [0, 0, 886, 887] | [0, 0, 0.4994363021420518, 1] |
| 宗门炼丹房 | 1 / 0 | [888, 0, 886, 887] | [0.5005636978579482, 0, 0.4994363021420518, 1] |

逻辑映射可使用 `file: 'v8-interiors-atlas.png', cols: 2, rows: 1` 与上表的 col、row 和 crop；等分逻辑位置为左 `0% 50%`、右 `100% 50%`。接线仍由根代理负责。

竖屏背景应先隔离对应原生矩形，再按同一缩放比例 cover 到舞台；不能拉伸图像或让另一格、亮中缝进入显示窗口。如需查看全景，可对已隔离的单格使用 contain。

## 视觉与几何核验

已用 `view_image` 检查完整原生图：

- 书院为可见木梁、书架与青玉案的真实室内，打开的丹典展示草药图，窗外为云山；无熔岩。
- 炼丹房有完整炉盖、炉身、支脚、药材、药瓶，只有炉底小型受控火焰；无岩浆、破炉或炼铁高炉。
- 两格没有人物、可读文字、水印或界面元素，左右室内互不穿越中线。
- 360 × 640、390 × 844、412 × 915 及 1440 × 900 的单格 cover 几何检查使用统一比例；裁格窗口不包含另一格或中缝。此项为几何核验，不代替根代理接线后的游戏截图验收。

## 原资源保留

生成前记录的原有 43 张 PNG，在新图复制后逐一比较字节数及 SHA-256：**43 / 43 完全一致**。本次只有新增 PNG，总数由 43 增至 44。以下为本次现场快照的匹配哈希；原 V4 基准核验另见 `docs/validation/V4_ORIGINAL_ASSETS_2026-10-07.json`。

| 原文件 | 字节数 | 生成前后相同的 SHA-256 |
| --- | --- | --- |
| story-arena.png | 3397476 | `cc1f6087e7a44babadf1979e7a43137f7c254f325a132d701145ad1b832fde60` |
| story-heaven.png | 3311737 | `3425b8872846a05edc4272dc0f383877bac3240270d73f94603f02ad839c52d7` |
| story-secret.png | 3491255 | `eff4b2627bf21be69cd6aa67820ef7f0b1fcbd481ff17755318f88484c83ee6b` |
| v3-boss-atlas.png | 3764241 | `44eab227875b14f222041928625a8248ece132fd435faf8bcc5c832b0f3fa636` |
| v3-cardback.png | 3449815 | `397176d5c979adf75f81d2d078da1d15ff2436a3acaf7961392b0902380dfff1` |
| v3-chapter-atlas.png | 3877451 | `0c92a9967915e9b8258da3407c98588b2c8ebcdeaad124c254b7bc1b04813b47` |
| v3-forge.png | 3267994 | `de6cbea983b22f9bac14a4dfb000e57ce474447e029f452b498e4377b2e1a36d` |
| v3-hero-expressions.png | 3313431 | `1c4250e6fabd351e983f2c8f630e02703ae02ad242b8aec436186591b44f9fd5` |
| v3-heroes.png | 3623076 | `22881ef1575d96a3a5ac799022fe98062c67e591c43bf80a4c8b5c7971c37cbd` |
| v3-items-atlas.png | 3097567 | `b529d1d02d1404da934121d5754c746ec410202c5bd7de86beb3775b975bc682` |
| v3-map-atlas-a.png | 3741606 | `8672f15e6e83a4d055afdc413603147b867c95b3309bcd0869c2838e1554eefa` |
| v3-map-atlas-b.png | 3745999 | `c3a2f19fe4af059e1b255069b23de45a33eb7c968bc6dd46032b9986b23a61d0` |
| v3-monster-atlas.png | 3444184 | `d0244da185015909077092ff246d70137c127149a20d408e37ab3c3e6f744b34` |
| v3-shop.png | 3271795 | `f6c1f2201bc03a6b20a8b8c85bfca0abc729b5507de6910181c0f6b22e38704f` |
| v3-skills-atlas.png | 3328791 | `82461241caa0be798fd123359c7ebfe2324bb81a78542900dabfca6a63746ac3` |
| v3-summon.png | 3024109 | `3a726730585736377cbf427a6ee4687beefa90138ef627403657011ab13a1adb` |
| v3-world.png | 2931600 | `60cc4021afe1793518d44ab67986bdd375439dd1031daccda2ef5408923c51a0` |
| v4-armor-atlas.png | 2472998 | `f898e51bd56db508a1f4013488abe0c0267dc7fc5fec648ffc86061e396bb591` |
| v4-basic-skills-atlas.png | 2343251 | `41feafd53aeebb207bb32a6610591deb7e109dcdbbc97a2d527bbf46e26937e2` |
| v4-pills-atlas.png | 2373638 | `b6fe16de1e065e3ecf324e0bd6e88d11063b5b36b8df5cb8227b65676dc15ee0` |
| v4-treasures-atlas.png | 2446131 | `38593628f1064dd44d56a656578e370fe47676236c31ed127d2c8c14a51d2816` |
| v4-utilities-atlas.png | 2514627 | `18cf3df94862623c8b84b9596c28c5e69c9523d670131adb0dafe9f5dd2d51f6` |
| v4-weapons-atlas.png | 1994741 | `d9ec3830e052e72a983fb62519ddad0799acedb08a608ea80ed95b3925bb217b` |
| v5-gear-quality-0.png | 2046574 | `9dadf69fea35d250a427c20533dc1d6a6020d6dc36fa34bd5f7fb085905d3c7b` |
| v5-gear-quality-1.png | 2063098 | `1a94c3b76a47a81a3b109551e952615dd42b266fb9775a7a1b8086d86600c1f4` |
| v5-gear-quality-2.png | 2233465 | `2c999b6ca8128d38e75163846a34fbbb9de83816c7aefd3f17c517481b3bf703` |
| v5-gear-quality-3.png | 2320813 | `2610b1033e58e645a6bff7a1987e1c31b3704932bf53136c5037dd08aa503197` |
| v5-gear-quality-4.png | 2466761 | `e9db9384e7ef286095dc8de41a621a4c3c593c6b1e0ddc6de83017302a80da95` |
| v5-gear-quality-5.png | 2516192 | `cf8742b5eddc0ab7228c073d8a4aeb569ab3841615c0bb89237c19c74360b9b7` |
| v6-gear-quality-0.png | 1879955 | `833b5754a8003d02435018db4399c68e79b8110d4cf20a7791c4f376d6c014c1` |
| v6-gear-quality-1.png | 2188879 | `4d83821b39846121fc5d3ec11c693109f82784dc8d2d0ae068cce897fc1ac963` |
| v6-gear-quality-2.png | 2516134 | `c8392cdb6119652a014373ebd7de95c63fd9537e9e89871eb9d97a075d15c68f` |
| v6-gear-quality-3.png | 2828949 | `73b7cc9752a86c5f88a6ffc4ac313dc224bb30697cd53fb339fb26463ff7c598` |
| v6-gear-quality-4.png | 3004651 | `514619508f16526b455479cf6670c567af49649f6c1745292db1fd1c183310e1` |
| v6-gear-quality-5.png | 2810196 | `127582018b941d934a9d2a3ba9c3cc4ef7bd74e12ae2e750eba3d5d4a66df157` |
| v6-pills-atlas.png | 2243665 | `d085ab42532ca7c9e32cae95a3555129c818e9a6f07b03a47702fd197047cfa1` |
| v6-techniques-atlas.png | 2787505 | `3ef98f376efec4ae529b2d7ec7cf70796cfe241759e262edc5dcddb639be86cd` |
| v6-treasures-atlas.png | 2396861 | `a79055b3119ab525472db44c6b3389602be58259d248772caf413b7f62ccffc8` |
| v6-utilities-atlas.png | 2553478 | `063d56dc582381fa4d3ff1aa8dc70725132d85af2a05e619b97caa538004827b` |
| v7-encounters-atlas.png | 2823154 | `e5357b72bf47bda6c3bc7c5ab5ae06e4346fb3ef7f4eb7ad1beef892bf123db7` |
| v7-immortal-beasts-atlas.png | 3336553 | `c81138eb077ac8edcaf44f1833feaaa8ff1ffa1ed724c012241fb371013acc96` |
| v7-immortal-mentors-atlas.png | 2962921 | `1f7ce0a6375655b87d2552135807a173fe0582c9fe68b8a11c2a8cf6cae50aa6` |
| v7-rivals-atlas.png | 2284199 | `bf911627333c60019e92bafae9fe59546914e073e3be8abb249c53c68a44b834` |

本报告不宣称界面已接线，不改变任何旧资源的配置或归属。


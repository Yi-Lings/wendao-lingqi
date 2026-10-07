# 镜湖医舍雨夜：原创场景核验

日期：2026-10-07。

## 缺口与用途

支线 `yueheng_2` 的地点、交班对白与情境是镜湖医舍雨夜；原 `map2` 为白昼雪湖，新增 `v8-interiors-atlas.png` 两格同样有日光。因此新增独立夜间室内画面 `web/assets/story-infirmary-night.png`，用于这段支线的对话背景。原图继续保留，未以夜色蒙层代替真实夜景。本次未接线剧情、修改 JS 或更新资源清单，运行时接线由主任务完成。

## 生成与原生文件

- 来源：`image_gen.imagegen`，原创中国修仙镜湖医舍雨夜内景，单张完整场景，无引用旧图。
- 原始生成缓存：`/workspace/generated_images/exec-24cfed2d-69e9-4b1c-b676-8b22ad355617.png`，保留不动。
- 项目文件：`web/assets/story-infirmary-night.png`，从生成缓存直接复制，逐字节一致。
- 原生尺寸：**1024 × 1536**，PNG / RGB，2,384,384 字节。
- SHA-256：`6c7a11574332d3590780add72e6f43722f0563aa1df72e356e971d85cb1c696b`。
- 无缩放、重绘、调色或像素后处理。

## 视觉检查

已通过 `view_image` 查看项目文件，确认：

- 窗外为暗蓝雨夜，能看到细雨、湖面微光、青灰瓦檐与滴雨，无白昼、日出或夕阳。
- 暖灯照亮木桌、药碗、白瓷药罐与摊开的竹简交班簿；竹简没有可读文字。
- 后侧有空病榻、枕头与叠放被褥，草药、布巾及木架形成医舍生活细节。
- 整体宁静温暖，室内暖光与室外冷夜有明确层次；没有人物、人物剪影、UI、标识、水印或文字。
- 不是炼丹炉场景，无岩浆、大型炉火或白昼光窗。

## 原生裁切与不拉伸核验

这是完整单图，不是图集：`cols:1, rows:1, col:0, row:0`，原生矩形 `[0,0,1024,1536]`，归一化 `crop:[0,0,1,1]`。推荐 `center center` 的等比例 `cover`；完整欣赏图可使用 `contain`。

使用现有 `web/art-layout.js` 的 `geometry` 对以下尺寸做实际数学检查，检查等比缩放、视口完整覆盖和源裁切不超出原图；**4/4 通过**。此处为裁切算法核验，尚非运行时剧情截图验收。

| 视口 | 原图中可见矩形 x,y,width,height | 结果 |
| --- | --- | --- |
| 360×640 | `80,0,864,1536` | 通过 |
| 390×844 | `157.1185,0,709.763,1536` | 通过 |
| 412×915 | `166.1902,0,691.6197,1536` | 通过 |
| 1440×900 | `0,448,1024,640` | 通过 |

竖屏等比覆盖会裁去两侧家具，中央竹简、桌案、空病榻与夜窗维持画面主线；横屏会裁去上、下缘，保留床榻与桌面情境。所有尺寸均维持原画比例，不将宽高单独拉伸。

## 原有资源保护

生成前记录 `web/assets/*.png` 全部 **44** 个文件的字节数和 SHA-256；复制新图后重读核对，**44/44 完全一致，改变 0**。现有 PNG 总计 **45**，仅增加本文件。校验基线如下，均已与生成后文件逐项比对：

| 原有 PNG | 字节数 | SHA-256 |
| --- | ---: | --- |
| `story-arena.png` | 3397476 | `cc1f6087e7a44babadf1979e7a43137f7c254f325a132d701145ad1b832fde60` |
| `story-heaven.png` | 3311737 | `3425b8872846a05edc4272dc0f383877bac3240270d73f94603f02ad839c52d7` |
| `story-secret.png` | 3491255 | `eff4b2627bf21be69cd6aa67820ef7f0b1fcbd481ff17755318f88484c83ee6b` |
| `v3-boss-atlas.png` | 3764241 | `44eab227875b14f222041928625a8248ece132fd435faf8bcc5c832b0f3fa636` |
| `v3-cardback.png` | 3449815 | `397176d5c979adf75f81d2d078da1d15ff2436a3acaf7961392b0902380dfff1` |
| `v3-chapter-atlas.png` | 3877451 | `0c92a9967915e9b8258da3407c98588b2c8ebcdeaad124c254b7bc1b04813b47` |
| `v3-forge.png` | 3267994 | `de6cbea983b22f9bac14a4dfb000e57ce474447e029f452b498e4377b2e1a36d` |
| `v3-hero-expressions.png` | 3313431 | `1c4250e6fabd351e983f2c8f630e02703ae02ad242b8aec436186591b44f9fd5` |
| `v3-heroes.png` | 3623076 | `22881ef1575d96a3a5ac799022fe98062c67e591c43bf80a4c8b5c7971c37cbd` |
| `v3-items-atlas.png` | 3097567 | `b529d1d02d1404da934121d5754c746ec410202c5bd7de86beb3775b975bc682` |
| `v3-map-atlas-a.png` | 3741606 | `8672f15e6e83a4d055afdc413603147b867c95b3309bcd0869c2838e1554eefa` |
| `v3-map-atlas-b.png` | 3745999 | `c3a2f19fe4af059e1b255069b23de45a33eb7c968bc6dd46032b9986b23a61d0` |
| `v3-monster-atlas.png` | 3444184 | `d0244da185015909077092ff246d70137c127149a20d408e37ab3c3e6f744b34` |
| `v3-shop.png` | 3271795 | `f6c1f2201bc03a6b20a8b8c85bfca0abc729b5507de6910181c0f6b22e38704f` |
| `v3-skills-atlas.png` | 3328791 | `82461241caa0be798fd123359c7ebfe2324bb81a78542900dabfca6a63746ac3` |
| `v3-summon.png` | 3024109 | `3a726730585736377cbf427a6ee4687beefa90138ef627403657011ab13a1adb` |
| `v3-world.png` | 2931600 | `60cc4021afe1793518d44ab67986bdd375439dd1031daccda2ef5408923c51a0` |
| `v4-armor-atlas.png` | 2472998 | `f898e51bd56db508a1f4013488abe0c0267dc7fc5fec648ffc86061e396bb591` |
| `v4-basic-skills-atlas.png` | 2343251 | `41feafd53aeebb207bb32a6610591deb7e109dcdbbc97a2d527bbf46e26937e2` |
| `v4-pills-atlas.png` | 2373638 | `b6fe16de1e065e3ecf324e0bd6e88d11063b5b36b8df5cb8227b65676dc15ee0` |
| `v4-treasures-atlas.png` | 2446131 | `38593628f1064dd44d56a656578e370fe47676236c31ed127d2c8c14a51d2816` |
| `v4-utilities-atlas.png` | 2514627 | `18cf3df94862623c8b84b9596c28c5e69c9523d670131adb0dafe9f5dd2d51f6` |
| `v4-weapons-atlas.png` | 1994741 | `d9ec3830e052e72a983fb62519ddad0799acedb08a608ea80ed95b3925bb217b` |
| `v5-gear-quality-0.png` | 2046574 | `9dadf69fea35d250a427c20533dc1d6a6020d6dc36fa34bd5f7fb085905d3c7b` |
| `v5-gear-quality-1.png` | 2063098 | `1a94c3b76a47a81a3b109551e952615dd42b266fb9775a7a1b8086d86600c1f4` |
| `v5-gear-quality-2.png` | 2233465 | `2c999b6ca8128d38e75163846a34fbbb9de83816c7aefd3f17c517481b3bf703` |
| `v5-gear-quality-3.png` | 2320813 | `2610b1033e58e645a6bff7a1987e1c31b3704932bf53136c5037dd08aa503197` |
| `v5-gear-quality-4.png` | 2466761 | `e9db9384e7ef286095dc8de41a621a4c3c593c6b1e0ddc6de83017302a80da95` |
| `v5-gear-quality-5.png` | 2516192 | `cf8742b5eddc0ab7228c073d8a4aeb569ab3841615c0bb89237c19c74360b9b7` |
| `v6-gear-quality-0.png` | 1879955 | `833b5754a8003d02435018db4399c68e79b8110d4cf20a7791c4f376d6c014c1` |
| `v6-gear-quality-1.png` | 2188879 | `4d83821b39846121fc5d3ec11c693109f82784dc8d2d0ae068cce897fc1ac963` |
| `v6-gear-quality-2.png` | 2516134 | `c8392cdb6119652a014373ebd7de95c63fd9537e9e89871eb9d97a075d15c68f` |
| `v6-gear-quality-3.png` | 2828949 | `73b7cc9752a86c5f88a6ffc4ac313dc224bb30697cd53fb339fb26463ff7c598` |
| `v6-gear-quality-4.png` | 3004651 | `514619508f16526b455479cf6670c567af49649f6c1745292db1fd1c183310e1` |
| `v6-gear-quality-5.png` | 2810196 | `127582018b941d934a9d2a3ba9c3cc4ef7bd74e12ae2e750eba3d5d4a66df157` |
| `v6-pills-atlas.png` | 2243665 | `d085ab42532ca7c9e32cae95a3555129c818e9a6f07b03a47702fd197047cfa1` |
| `v6-techniques-atlas.png` | 2787505 | `3ef98f376efec4ae529b2d7ec7cf70796cfe241759e262edc5dcddb639be86cd` |
| `v6-treasures-atlas.png` | 2396861 | `a79055b3119ab525472db44c6b3389602be58259d248772caf413b7f62ccffc8` |
| `v6-utilities-atlas.png` | 2553478 | `063d56dc582381fa4d3ff1aa8dc70725132d85af2a05e619b97caa538004827b` |
| `v7-encounters-atlas.png` | 2823154 | `e5357b72bf47bda6c3bc7c5ab5ae06e4346fb3ef7f4eb7ad1beef892bf123db7` |
| `v7-immortal-beasts-atlas.png` | 3336553 | `c81138eb077ac8edcaf44f1833feaaa8ff1ffa1ed724c012241fb371013acc96` |
| `v7-immortal-mentors-atlas.png` | 2962921 | `1f7ce0a6375655b87d2552135807a173fe0582c9fe68b8a11c2a8cf6cae50aa6` |
| `v7-rivals-atlas.png` | 2284199 | `bf911627333c60019e92bafae9fe59546914e073e3be8abb249c53c68a44b834` |
| `v8-interiors-atlas.png` | 2934345 | `abec37b8fec38d09ae68832830958aecad145dea786ece49b629ee4852cfca51` |

本次仅写入新 PNG 与本报告；未修改任何旧图片、音频、代码或清单，未提交，未构建。


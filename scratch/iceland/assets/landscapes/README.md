# 冰岛风景资产

27 张通过内置 imagegen 生成的细像素风格插画，供当前冰岛原型使用。原画不是严格可编辑的像素网格工程文件，也不是实景照片或精确机位复原。未使用 CLI fallback。

- 图片、完整实际提示词均保存在本目录。
- 唯一资产清单为 [manifest.json](manifest.json)，使用相对路径并记录关联地点与生成原文件。
- 地点、文案和天气设置集中在 [places.js](../../src/places.js)。
- [画廊](index.html) 展示全部图片及两组天气对照；[返回原型](../../)。
- 地貌和坐标依据见 [原有地点来源](../../docs/geography-sources.md) 与 [扩展地点来源](../../docs/place-sources.md)。

01–12 使用此前认可的冰岛海湾画法为参考；13–27 仅以 06 的画法为参考，各自重新构图。城市与 Mælifell 的天气对照保留近似构图，但存在生成漂移，不是可直接无缝混合的图层。原画中的水、瀑布、喷泉、蒸汽、云和海鸟仍包含静态细节。

| 图片 / 提示词 | 对应地点 | 画面天气 |
| --- | --- | --- |
| [01-city-rain](01-city-rain.png) · [Prompt](01-city-rain.prompt.md) | Reykjavík / 雷克雅未克 | 雨后 |
| [02-city-clear](02-city-clear.png) · [Prompt](02-city-clear.prompt.md) | Reykjavík / 雷克雅未克 | 晴天 |
| [03-harbor](03-harbor.png) · [Prompt](03-harbor.prompt.md) | Seyðisfjörður / 塞济斯菲厄泽港 | 低云 |
| [04-black-beach](04-black-beach.png) · [Prompt](04-black-beach.prompt.md) | Reynisfjara / 雷尼斯黑沙滩 | 强风 |
| [05-glacial-outlet](05-glacial-outlet.png) · [Prompt](05-glacial-outlet.prompt.md) | Jökulsárlón · Fellsfjara / 杰古沙龙湖出流口 | 晴冷 |
| [06-maelifell-sun](06-maelifell-sun.png) · [Prompt](06-maelifell-sun.prompt.md) | Mælifell / 梅利费尔火山 | 云隙日光 |
| [07-maelifell-rain](07-maelifell-rain.png) · [Prompt](07-maelifell-rain.prompt.md) | Mælifell / 梅利费尔火山 | 低云细雨 |
| [08-rhyolite](08-rhyolite.png) · [Prompt](08-rhyolite.prompt.md) | Landmannalaugar / 兰德曼纳劳卡 | 明亮多云 |
| [09-waterfall](09-waterfall.png) · [Prompt](09-waterfall.prompt.md) | Dettifoss / 黛提瀑布 | 细雨 |
| [10-lava-desert](10-lava-desert.png) · [Prompt](10-lava-desert.prompt.md) | Askja · Ódáðahraun / 阿斯恰火山与奥达达赫劳恩 | 干冷晴天 |
| [11-autumn-fjord](11-autumn-fjord.png) · [Prompt](11-autumn-fjord.prompt.md) | Reyðarfjörður / 雷扎尔峡湾 | 雨后间晴 |
| [12-glacier](12-glacier.png) · [Prompt](12-glacier.prompt.md) | Skaftafellsjökull / 斯卡夫塔山冰川 | 雪后 |
| [13-hornbjarg](13-hornbjarg.png) · [Prompt](13-hornbjarg.prompt.md) | Hornbjarg / 霍恩比亚格海崖 | 海雾 |
| [14-dynjandi](14-dynjandi.png) · [Prompt](14-dynjandi.prompt.md) | Dynjandi / 丁扬迪瀑布 | 湿冷 |
| [15-raudasandur](15-raudasandur.png) · [Prompt](15-raudasandur.prompt.md) | Rauðasandur / 红沙滩 | 多云偏冷 |
| [16-isafjordur](16-isafjordur.png) · [Prompt](16-isafjordur.prompt.md) | Ísafjörður / 伊萨菲厄泽 | 雨后初晴 |
| [17-kirkjufell](17-kirkjufell.png) · [Prompt](17-kirkjufell.prompt.md) | Kirkjufell / 教会山 | 晴间多云 |
| [18-arnarstapi](18-arnarstapi.png) · [Prompt](18-arnarstapi.prompt.md) | Arnarstapi / 阿尔纳斯塔皮海岸 | 海风 |
| [19-hvitserkur](19-hvitserkur.png) · [Prompt](19-hvitserkur.prompt.md) | Hvítserkur / 赫维策库尔海蚀柱 | 阵风 |
| [20-godafoss](20-godafoss.png) · [Prompt](20-godafoss.prompt.md) | Goðafoss / 众神瀑布 | 冬日晴间多云 |
| [21-hverir](21-hverir.png) · [Prompt](21-hverir.prompt.md) | Hverir / 赫维里地热区 | 蒸汽低云 |
| [22-studlagil](22-studlagil.png) · [Prompt](22-studlagil.prompt.md) | Stuðlagil / 斯图德拉吉尔玄武岩峡谷 | 冷晴 |
| [23-vestrahorn](23-vestrahorn.png) · [Prompt](23-vestrahorn.prompt.md) | Vestrahorn / 韦斯特拉角山 | 强风 |
| [24-thingvellir](24-thingvellir.png) · [Prompt](24-thingvellir.prompt.md) | Þingvellir / 辛格维利尔裂谷 | 清冷 |
| [25-strokkur](25-strokkur.png) · [Prompt](25-strokkur.prompt.md) | Strokkur / 斯特罗库尔间歇泉 | 蒸汽 |
| [26-heimaey](26-heimaey.png) · [Prompt](26-heimaey.prompt.md) | Heimaey / 海梅岛 | 海雾间晴 |
| [27-kerlingarfjoll](27-kerlingarfjoll.png) · [Prompt](27-kerlingarfjoll.prompt.md) | Kerlingarfjöll / 凯德灵加山 | 高地多云 |

新增画面使用新版本文件名，更新清单、地点设置和画廊后运行 `node scratch/iceland/tests/verify-atlas.mjs`。保留原画与来源，不覆盖已有图片。

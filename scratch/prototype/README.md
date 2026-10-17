# Zima Blue · A return to the essential

隔离视觉原型，对应重写后的 [设计规范](../../docs/zima-visual-and-lusion-tactile-spec.md)。不接入 Hugo。

```bash
python3 -m http.server 4173 --bind 127.0.0.1 --directory scratch/prototype
```

打开 `http://127.0.0.1:4173`。划过装置展台推动方向流，点击或“触碰水面”产生局部透镜波。拖动节点标签或用方向键移动装置；顶部切换主题，向下阅读可选中文字。

## 本轮变化

- 原创蓝色方框、陶瓷环、金属球、深色瓷片，使用真实几何、环境照明、投影和展台倒影。Three.js r158 本地固定版本，不依赖运行时 CDN。
- 场景缓存到纹理，192×128 双缓冲 flowmap 做连续线段注入、速度输运与衰减。不是完整流体求解。
- 后处理直接折射场景；点击透镜波作为辅助。移除 DOM 文字镜像、叠加的虹彩轮廓与高度场高光。原生标题、节点标签和正文不参与重画。
- 无手势后停止 RAF，视口外、后台、reduced-motion 暂停；WebGL 不可用时显示静态装置并保留控件。高像素比与输出尺寸有上限。
- `zima:node-motion` 与 `onColorSchemeChange` 适配接口保留，初始布局事件静默。

## 实拍

云端流程：`.github/workflows/prototype-visual.yml`。仅隔离分支运行，不部署网站。截图、录像和诊断上传为 `visual-evidence`。覆盖浅色、深色、移动端、拖拽、键盘、主题切换、阅读选择、reduced-motion、无 WebGL。实际观察与运行链接见设计规范。默认采用可辨识的正常流量；`?flow=soft` 是复拍对照的较弱版本，`?precision=byte` 强制检查 RGBA8 降级。静态降级图直接来自本轮场景渲染，按桌面/移动与明暗主题切换。

旧版高度场代码与模拟 GL 测试只证明旧模型的一些数学性质，已从当前原型移除；旧基线保存在隔离分支提交 `52899cab172834e5322141f01e2ba513827467e9`。本轮以真实浏览器视觉和交互证据判断，不以旧测试计数代替。

## 依赖与边界

`vendor/three.module.js`、`RoomEnvironment.js`、`Reflector.js` 来自 Three.js 0.158.0，许可证见 `vendor/THREE-LICENSE.txt`。Reflector 只增加可选的 render-target type 参数，以便无半浮点能力时降级。本项目的装置、流场和合成着色器为独立实现。

原型尚未接入正式 D3、文章图像、Hugo 资源管线，也没有真机帧率或功耗结论。整站任意 DOM 折射尚无可靠实现，不应据此承诺全站部署。

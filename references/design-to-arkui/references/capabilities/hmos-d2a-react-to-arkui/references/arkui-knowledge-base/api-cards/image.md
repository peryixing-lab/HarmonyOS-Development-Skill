# Image

## 概述

图片显示组件，支持 png/jpg/bmp/svg/gif/heif 格式（不支持 apng 和 svga）。可加载本地资源、网络图片、Resource 资源、rawfile、媒体库路径、base64、PixelMap、DrawableDescriptor。

## 何时使用

- 所有图片、头像、封面图、角标、装饰图、业务操作图标
- 本地 SVG 默认保留为 SVG 资源，优先通过 Image 展示
- 只有需要可编程矢量、着色或交互时才改用 Shape/Path/Canvas
- 不要用文本、表情、纯色块或 placeholder 代替真实图标

## 构造

```ts
Image(src: PixelMap | ResourceStr | DrawableDescriptor)
```

## 属性

| 属性 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `objectFit` | ImageFit | Cover | 图片缩放/裁剪方式 |
| `objectRepeat` | ImageRepeat | NoRepeat | 图片重复样式 |
| `interpolation` | ImageInterpolation | None | 图片插值，低分辨率放大时提高清晰度 |
| `renderMode` | ImageRenderMode | Original | 渲染模式：原色/黑白 |
| `sourceSize` | { width, height } | — | 解码尺寸，降低分辨率 |
| `colorFilter` | number[] | — | 像素颜色矩阵滤镜，4×5 矩阵 |
| `fillColor` | ResourceColor | — | 改变 SVG 图片的绘制颜色 |
| `syncLoad` | boolean | false | 同步加载，避免刷新闪烁。不建议长时间加载时使用 |
| `draggable` | boolean | false | 是否可拖拽 |
| `alt` | string \| Resource | — | 加载时显示的占位图 |
| `autoResize` | boolean | true | 是否自动调整图片尺寸 |

## 事件

| 事件 | 说明 |
|---|---|
| `onComplete(msg)` | 加载成功，返回 `{ width, height, componentWidth, componentHeight }` |
| `onError(() => {})` | 加载失败 |

## 常见枚举

```
// objectFit
ImageFit.Cover        // 填充裁剪保持比例（最常用，对应 bg-cover）
ImageFit.Contain      // 包含不裁剪可能留白
ImageFit.Fill         // 拉伸填满不保持比例
ImageFit.Auto         // 自适应显示
ImageFit.ScaleDown    // 缩小到适合不放大
ImageFit.None         // 原始尺寸不缩放

// objectRepeat
ImageRepeat.X / Y / XY / NoRepeat

// interpolation
ImageInterpolation.None / Low / Medium / High

// renderMode
ImageRenderMode.Original  // 原色
ImageRenderMode.Template  // 黑白
```

## 展示情况

### 数据源类型
- 本地路径：`Image('images/view.jpg')`（根目录为 ets 文件夹，不支持跨包跨模块）
- Resource 资源：`Image($r('app.media.icon'))`（可跨包跨模块）
- rawfile：`Image($rawfile('example.png'))`
- 网络图片：`Image('https://...')`（需声明 `ohos.permission.INTERNET`）
- 媒体库：`Image('file://media/Photos/5')`
- base64：`Image('data:image/png;base64,...')`
- PixelMap：解码后的像素图
- DrawableDescriptor：分层叠加、动态属性调整、动画序列等高级效果

### 缩放类型
Cover（填充裁剪）、Contain（包含留白）、Fill（拉伸）、Auto（自适应）、ScaleDown（缩小不放大）、None（原始尺寸）。

### 矢量图（SVG）
SVG 可用 `fillColor` 改变绘制颜色。SVG 无原始大小时需设宽高否则不显示。SVG 不支持通过 image 标签引用 SVG 和 gif 格式的本地其他图片。SVG 引用本地位图时路径设为与 SVG 同级的相对路径。

### 图片插值
低分辨率原图放大时用 `interpolation(ImageInterpolation.High)` 提高清晰度。

### 图片重复
`objectRepeat(ImageRepeat.XY)` 在水平/竖直轴上重复绘制。

### 解码尺寸
`sourceSize({ width: 40, height: 40 })` 降低分辨率，配合 `aspectRatio(1)` 使用。

### 滤镜
`colorFilter([1,1,0,0,0, 0,1,0,0,0, 0,0,1,0,0, 0,0,0,1,0])` 4×5 矩阵调整像素颜色。

### 同步加载
`syncLoad(true)` 避免刷新闪烁，但会导致页面无法响应（不建议长时间加载时使用）。

### 背景图替代
React 中 `style={{ backgroundImage: 'url(...)' }}` 的等价写法：用 Image + `objectFit(ImageFit.Cover)` 在 Stack 底层实现。

## 最小可编译模板

```ts
Image($r('app.media.cover'))
  .width('100%').height(180)
  .objectFit(ImageFit.Cover)
  .borderRadius(12)
  .clip(true)
```

## 约束

- 不要用文本、表情、纯色块或临时占位资源替代原始图片、SVG 或导出图标
- `.clip(true)` 只在需要裁剪圆角时加在 Image 自身上，不要加在承载外溢背景的父容器上
- 网络图片需申请 `ohos.permission.INTERNET` 权限
- 覆盖图片文件时应先删除再重新创建同名文件，直接覆盖可能引起崩溃
- 不要把图片背景和内容拼成一个字符串，用 Stack 分层
- SVG 无原始大小时必须设宽高，否则不显示

# Swiper

## 概述

滑动轮播容器，子组件按顺序作为各页。支持循环、自动播放、导航点、箭头、多页同屏、自定义切换动画、控制器跳转、保持可见内容位置。

## 何时使用

- 内容区域宽度接近视口宽，有分页点/轮播指示器/横滑语义
- banner、引导页、卡片页组
- Figma 静态导出可能只展示当前页：一个接近视口宽的 banner 图片或 backgroundImage 面板 + 独立 SVG 分页点位于图片下方中间 → 仍判为 Swiper
- 普通横向图标栏或标签流不要误用 Swiper

## 构造

```ts
Swiper(controller?: SwiperController)
```

`controller` 用于 showNext/showPrevious/changeIndex；当前页索引通过 `index` 属性设置。

## 属性

| 属性 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `index` | number | 0 | 当前显示页索引 |
| `loop` | boolean | true | 是否循环播放。false 时首尾页无法继续切换 |
| `autoPlay` | boolean | false | 是否自动轮播 |
| `interval` | number | 3000 | 自动轮播间隔(ms) |
| `indicator` | boolean \| DotIndicator \| DigitIndicator | 默认圆点 | 导航点样式。false=隐藏 |
| `vertical` | boolean | false | 轮播方向。true=垂直 |
| `displayCount` | number \| SwiperAutoFill | 1 | 每页显示子组件数 |
| `displayArrow` | boolean \| ArrowStyle | false | 导航箭头 |
| `prevMargin` | Length | 0 | 前一项露出宽度 |
| `nextMargin` | Length | 0 | 后一项露出宽度 |
| `cachedCount` | number | 1 | 预加载数量，只在 LazyForEach 中生效 |
| `itemSpace` | number \| string | 0 | 子项间距 |
| `maintainVisibleContentPosition` | boolean | false | 数据增删时保持可见内容位置不变 |

## 事件

| 事件 | 说明 |
|---|---|
| `onChange(index)` | 页面切换时触发 |
| `onSelected(index)` | 选中元素改变时触发（API18+） |
| `onAnimationStart` / `onAnimationEnd` | 切换动画开始/结束 |
| `onGestureSwipe(index, extraInfo)` | 手势滑动时触发，extraInfo 为当前滑动速度等信息 |

SwiperController 方法：

| 方法 | 说明 |
|---|---|
| `showNext()` | 切换到后一页 |
| `showPrevious()` | 切换到前一页 |
| `changeIndex(index, animationMode)` | 跳转到指定页 |

## 常见枚举

```
// indicator
Indicator.dot()                    // 圆点（默认），显示在下方居中
Indicator.dot().itemWidth(15).selectedItemWidth(30).color(Gray).selectedColor(Blue)
Indicator.dot().left(0).bottom(0)  // 自定义位置
new DotIndicator().space(v)        // 设置圆点间距
new DotIndicator().bottom(LengthMetrics.vp(0), true)  // 忽略组件大小，消除底部间距
new DigitIndicator()               // 数字导航点

// SwiperAnimationMode（changeIndex 第二参数）
SwiperAnimationMode.NO_ANIMATION
SwiperAnimationMode.DEFAULT_ANIMATION
SwiperAnimationMode.FAST_ANIMATION

// ArrowStyle
displayArrow(true, false)          // 默认箭头（带底板），第二参数 isHoverShow=false 表示箭头常显
displayArrow({ showBackground, isSidebarMiddle, backgroundSize, backgroundColor, arrowSize, arrowColor }, false)
```

## 展示情况

### 尺寸规则
- 设了自身尺寸 → 轮播中均以该尺寸生效
- 未设尺寸 + 设了 prevMargin/nextMargin → 跟随父组件尺寸
- 未设尺寸 + 未设 prevMargin/nextMargin → 按子组件大小自适应

### 导航点
默认显示在下方居中。可通过 `Indicator.dot()` 自定义尺寸、颜色、位置。原始 React 里的 SVG 分页点应替换为原生 indicator。根据 `data-个数`、`data-位置` 推断页数和当前页。

### 多页同屏
`displayCount(2)` 可在一页内显示 2 个子组件。

### 自定义切换动画
通过 `customContentTransition` 回调逐帧设置透明度、缩放、位移、zIndex。

### Swiper 与 Tabs 联动
`onSelected` 回调中调 `tabsController.changeIndex(index)`，`onTabBarClick` 中调 `swiperController.changeIndex(index)`。

## 最小可编译模板

```ts
private swiperController: SwiperController = new SwiperController()

Swiper(this.swiperController) {
  Image($r('app.media.banner1')).width('100%').height(140)
  Image($r('app.media.banner2')).width('100%').height(140)
}
.loop(true)
.indicator(Indicator.dot().itemWidth(6).selectedItemWidth(18).color('rgba(255,255,255,0.4)').selectedColor('#FFFFFF'))
.onChange((index: number) => { this.currentIndex = index })
```

## 约束

- 不要把明确分页的内容写成 `Row + Scroll`
- 原始 React 里的 SVG/图片分页点应去掉，改用 Swiper 原生 indicator
- `indicator(false)` 可隐藏导航点，但不要在有分页语义时隐藏
- `maintainVisibleContentPosition` 只在 LazyForEach 懒加载时生效
- 导航点 bottom 设为 0 后仍有间距时，用 `bottom(LengthMetrics.vp(0), true)` 忽略组件大小

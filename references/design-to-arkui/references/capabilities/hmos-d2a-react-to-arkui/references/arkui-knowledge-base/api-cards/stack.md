# Stack

## 概述

层叠布局容器，子元素依次入栈，后入栈的覆盖前面的。支持九宫格对齐和 Z 序控制。用于元素重叠的场景。

## 何时使用

- 真正的覆盖层：背景层 + 前景内容、封面图 + 工具栏 + 资料、角标/徽标叠在图片上、渐变遮罩
- 卡片内局部覆盖：播放量在封面上、头像压在图片区与文字区边界
- 不要用 Stack 承载可用 Row/Column/Flex 表达的流式内容
- 不要用 Stack 拼完整页面再把高阶组件当局部装饰塞进去

## 构造

```ts
Stack(value?: StackOptions)
```

StackOptions:

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `alignContent` | Alignment | Center | 所有子元素在容器内的对齐方式 |

## 属性

| 属性 | 类型 | 说明 |
|---|---|---|
| `alignContent` | Alignment | 所有子元素在容器内的对齐方式。等同于在 Stack 自身上调用 `.align()`；子组件自身的 `.align()` 不会改变该子组件在 Stack 中的位置 |

子组件通用定位属性（详见 location.md）：

| 属性 | 说明 |
|---|---|
| `.position({ top, right, bottom, left })` | 绝对定位，相对父组件内容区。设了 position 的子组件不占位 |
| `.align(Alignment.xxx)` | 设置该组件内部子组件的对齐方式（不是该组件自身在 Stack 中的位置） |
| `.zIndex(n)` | Z 序控制。值越大显示层级越高 |

## 常见枚举

```
// alignContent / align 取值（九宫格）
Alignment.TopStart    Alignment.Top       Alignment.TopEnd
Alignment.Start       Alignment.Center    Alignment.End
Alignment.BottomStart Alignment.Bottom    Alignment.BottomEnd

// layoutGravity（API20+，单独设置 Stack 子组件对齐，优先级高于 align）
LocalizedAlignment.CENTER / START / END / TOP / BOTTOM / TOP_START / TOP_END / BOTTOM_START / BOTTOM_END
```

## 展示情况

### 默认居中堆叠
子元素默认居中堆叠，后入栈的覆盖前面的。

### 九宫格对齐
`alignContent: Alignment.TopStart` 等控制所有子元素位置。

### Z 序控制
后面的子元素尺寸大于前面的时，前面的会被完全隐藏。通过 `.zIndex(n)` 改变显示层级。

### 局部覆盖层 + 精确定位
`alignContent` 控制默认对齐，子组件用 `.position({ top, right })` 精确定位覆盖层（如角标）。

### 背景层不裁剪 + 前景裁剪
父容器 `.clip(false)` 保留外溢背景（渐变、光效、阴影），需要裁剪的子区域自身加 `.clip(true)`。

### 跨区头像与浮层
优先用流式负边距表达跨区关系（Column 内 Stack + Row 负 margin），不要用卡片级 Stack + 全页坐标。详见 arkui-basic-mapping.md"跨区头像与浮层"。

## 最小可编译模板

```ts
Stack({ alignContent: Alignment.TopStart }) {
  Image($r('app.media.cover'))
    .width('100%').height('100%').objectFit(ImageFit.Cover)
  Image($r('app.media.badge'))
    .width(26).height(26)
    .position({ top: 6, right: 6 })
}
.width('100%').height(180).clip(true)
```

背景不裁剪 + 前景裁剪：

```ts
Stack({ alignContent: Alignment.TopStart }) {
  Row()
    .width('100%').height(220)
    .linearGradient({ direction: GradientDirection.Bottom, colors: [['rgba(0,0,0,0.5)', 0], ['rgba(0,0,0,0)', 1]] })
  Image($r('app.media.avatar'))
    .width(160).height(96).borderRadius(12).clip(true)
    .position({ left: 16, top: 48 })
}
.width('100%').height(96).clip(false)
```

## 约束

- `alignContent` 和子组件 `.align()` 不要混用表达同一定位意图。`.align()` 设置的是该组件子组件的定位，不是该组件自身在 Stack 中的位置
- 父容器没有裁剪语义时不要加 `.clip(true)`，会截断外溢背景/阴影/模糊层
- 需要 `.clip(true)` 时只放在需要裁剪的子区域自身上
- `Alignment.BottomCenter` / `Alignment.TopCenter` 等组合名不存在，用 `Alignment.Bottom` 或 `Alignment.Center`
- 跨区头像优先用流式负边距，不要用卡片级 Stack + 全页坐标
- `@Builder` 调用结果不能链式写样式，要外包一层 Row/Column/Stack

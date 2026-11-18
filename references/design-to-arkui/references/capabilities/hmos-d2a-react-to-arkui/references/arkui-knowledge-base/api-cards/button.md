# Button

## 概述

按钮组件，用于响应点击操作。支持胶囊、圆形、普通、圆角矩形四种类型。可包含文本或单个子组件（基础组件或容器组件）。

## 何时使用

- 操作按钮、CTA、提交/确认/取消
- 图标+文字组合按钮（用子组件形式）
- 不要把链接式文本操作默认写成 Button，可先用 Text + onClick
- 悬浮按钮（配合 Stack + position）

## 构造

两种形式：

```ts
// 1. 文本按钮（不含子组件）
Button(label?: ResourceStr, options?: { type?: ButtonType, stateEffect?: boolean })

// 2. 子组件按钮
Button(options?: { type?: ButtonType, stateEffect?: boolean }) {
  // 只支持包含一个子组件
}
```

## 属性

| 参数/属性 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `type` | ButtonType | Capsule | 按钮类型 |
| `stateEffect` | boolean | true | 是否开启点击效果 |
| `controlSize` | ControlSize | — | 控件尺寸。NORMAL/SMALL（影响 ROUNDED_RECTANGLE 默认圆角） |
| `buttonStyle` | ButtonStyleMode | — | 按钮样式模式 |

通用属性：fontSize、fontColor、fontWeight、backgroundColor、borderRadius、width、height、margin、padding、border、shadow 等均可使用。

## 常见枚举

```
// type
ButtonType.Capsule           // 胶囊（默认）。圆角自动=高度一半，不支持 borderRadius 重新设置
ButtonType.Circle            // 圆形。不支持 borderRadius 重新设置
ButtonType.Normal            // 普通。默认圆角=0，支持 borderRadius 自定义
ButtonType.ROUNDED_RECTANGLE // 圆角矩形。NORMAL 时默认圆角 20vp，SMALL 时 14vp，支持 borderRadius 自定义

// controlSize
ControlSize.NORMAL / SMALL

// buttonStyle
ButtonStyleMode.NORMAL / ...
```

## 展示情况

### 胶囊按钮（默认）
圆角自动设为高度的一半，不支持 borderRadius 重新设置。适合主操作按钮。

### 圆形按钮
为圆形，不支持 borderRadius。适合图标按钮、删除操作。

### 普通按钮
默认圆角 0，支持 borderRadius 自定义。适合自定义圆角矩形按钮。

### 圆角矩形按钮
controlSize=NORMAL 时默认圆角 20vp，SMALL 时 14vp，支持 borderRadius 自定义。

### 子组件按钮
包含一个子组件（基础或容器），实现图标+文字组合。

### 悬浮按钮
配合 Stack + position，滑动时按钮始终保持悬浮状态。

## 最小可编译模板

```ts
Button('确定', { type: ButtonType.Capsule, stateEffect: true })
  .width('100%').height(44)
  .fontSize(16).fontColor('#FFFFFF')
  .backgroundColor('#007DFF')
  .onClick(() => { /* action */ })
```

图标+文字组合：

```ts
Button({ type: ButtonType.Capsule, stateEffect: true }) {
  Row({ space: 6 }) {
    Image($r('app.media.icon')).width(16).height(16)
    Text('分享').fontSize(14).fontColor('#FFFFFF')
  }
}
.height(36).backgroundColor('#333333')
```

## 约束

- Capsule 和 Circle 类型不支持通过 borderRadius 重新设置圆角
- Normal 和 ROUNDED_RECTANGLE 支持通过 borderRadius 自定义圆角
- 子组件形式只支持包含一个子组件
- Button 的 `align` 属性设置的是其内部子组件/文字的对齐，不是 Button 自身在父容器中的位置
- 不要为绕过 checklist 而删除真实按钮或替换为占位块
- 不要默认引入三方 UI 库的按钮

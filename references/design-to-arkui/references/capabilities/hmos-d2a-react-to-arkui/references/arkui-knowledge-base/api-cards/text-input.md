# TextInput / TextArea / Search

## 概述

文本输入组件。TextInput 单行输入，TextArea 多行输入，Search 搜索框（默认包含搜索图标）。支持多种输入类型、多态样式、输入事件、自动填充、光标控制、键盘避让。

## 何时使用

- React 静态 DOM 中的静态文本可能是输入框（需求澄清时的可选组件猜测）
- 搜索栏、评论输入框、表单字段
- 仅支持单文本样式，需富文本样式用 RichEditor

## 构造

```ts
TextInput(value?: { placeholder?: ResourceStr, text?: ResourceStr, controller?: TextInputController })
TextArea(value?: { placeholder?: ResourceStr, text?: ResourceStr, controller?: TextAreaController })
Search(options?: { placeholder?: ResourceStr, value?: ResourceStr, controller?: SearchController, icon?: string })
```

## 属性

| 属性 | 类型 | 说明 |
|---|---|---|
| `type` | InputType | 输入框类型 |
| `placeholder` | ResourceStr | 占位提示文本 |
| `text` | ResourceStr | 当前文本内容 |
| `placeholderColor` | ResourceColor | 占位文字颜色 |
| `placeholderFont` | { size, weight, family, style } | 占位文字样式 |
| `fontSize` | Length | 字号 |
| `fontColor` | ResourceColor | 文字颜色 |
| `fontWeight` | FontWeight | 字重 |
| `fontStyle` | FontStyle | 字体风格 |
| `fontFamily` | string | 字体族 |
| `textAlign` | TextAlign | 水平对齐 |
| `caretStyle` | { width } | 光标样式 |
| `caretColor` | ResourceColor | 光标颜色 |
| `maxLength` | number | 最大可输入字符数 |
| `showPassword` | boolean | 密码模式是否显示明文 |
| `style` | TextContentStyle / TextInputStyle | 多态样式。DEFAULT=默认；INLINE=内联模式 |
| `contentType` | ContentType | 自动填充类型 |
| `ellipsisMode` | EllipsisMode | 省略位置（需配合 textOverflow=Ellipsis） |
| `strokeWidth` | LengthMetric | 文本描边宽度（API20+） |
| `strokeColor` | ResourceColor | 文本描边颜色（API20+） |
| `lineSpacing` | LengthMetrics + { onlyBetweenLines } | 行间距（API20+，TextArea） |
| `minLines` | number | 最少展示行数（API20+，TextArea） |
| `inputFilter` | { regex, errorMessage } | 输入过滤 |
| `enableKeyboardOnFocus` | boolean | 获焦时是否拉起键盘 |
| `selectAll` | boolean | 编辑态是否全选 |
| `editMenuOptions` | { onCreateMenu, onMenuItemClick } | 自定义选中菜单 |
| `barState` | BarState | 滚动条显示 |
| `backgroundColor` / `borderRadius` | — | 背景色/圆角 |

## 事件

| 事件 | 说明 |
|---|---|
| `onChange(value)` | 文本内容变化 |
| `onSubmit(enterKey, event)` | 回车提交 |
| `onTextSelectionChange(start, end)` | 文本选择/光标位置变化 |
| `onSecurityStateChange(isShow)` | 密码显隐切换（API12+） |
| `onWillInsert(info)` / `onDidInsert(info)` | 输入前/后拦截 |
| `onWillDelete(info)` / `onDidDelete(info)` | 删除前/后拦截 |
| `onWillChange(value)` | 图文变化前拦截（onWillChange 晚于 onWillInsert/onWillDelete，早于 onDidInsert/onDidDelete） |
| `onFocus` / `onBlur` | 获焦/失焦 |

Controller 方法：

| 方法 | 说明 |
|---|---|
| `caretPosition(index)` | 设置光标位置 |
| `setTextSelection(start, end)` | 设置选区 |

## 常见枚举

```
// type (TextInput)
InputType.Normal / Password / Number / PhoneNumber / Email
InputType.USER_NAME / NEW_PASSWORD / NUMBER_PASSWORD / NUMBER_DECIMAL / URL

// style
TextContentStyle.DEFAULT  // 默认风格，编辑态/非编辑态无区别
TextContentStyle.INLINE   // 内联模式，编辑态/非编辑态样式明显区分
TextInputStyle.Inline     // TextInput 内联样式

// textAlign
TextAlign.Start / Center / End

// EnterKeyType
EnterKeyType.Go / Search / Send / Done / Next

// EllipsisMode
EllipsisMode.START / CENTER / END

// ContentType
ContentType.USER_NAME / PASSWORD / NEW_PASSWORD / EMAIL_ADDRESS / PHONE_NUMBER / ...
```

## 展示情况

### 输入类型
Normal(默认) / Password(密码) / Email(邮箱，只能一个@) / Number(纯数字) / PhoneNumber / NUMBER_DECIMAL(带小数点) / URL。

### 多态样式
DEFAULT 默认风格编辑态/非编辑态无区别；INLINE 内联模式编辑态/非编辑态样式明显区分。

### TextArea 自适应高度
- `minLines(n)`（API20+）设置最少展示行数
- `height("auto")` + `constraintSize({ minHeight })` 自行计算高度

### 键盘避让
滚动容器组件（Scroll/List/Grid）横竖屏切换时自动生效。非滚动容器外嵌 Scroll。OFFSET_WITH_CARET/RESIZE_WITH_CARET 支持光标二次避让。

### 自动填充
`contentType(ContentType.EMAIL_ADDRESS)` 设置自动填充类型。

### 文本描边
`strokeWidth(LengthMetrics.px(3))` + `strokeColor(Color.Red)`（API20+）。

## 最小可编译模板

```ts
TextInput({ placeholder: '请输入搜索内容' })
  .height(36)
  .fontSize(14)
  .placeholderColor('rgba(0,0,0,0.4)')
  .backgroundColor('#F5F5F5')
  .borderRadius(18)
  .padding({ left: 16, right: 16 })
  .onChange((value: string) => { this.query = value })
```

多行输入：

```ts
TextArea({ placeholder: '说点什么...' })
  .width('100%').height(80).fontSize(14).borderRadius(8)
```

## 约束

- 未设置 padding 时默认值为 `{ top: '8vp', right: '16vp', bottom: '8vp', left: '16vp' }`
- 设置 `height` 时，height 必须大于 `top + bottom + fontSize`，否则文本被截断
- 不支持在宽高为零的布局容器上设置 position
- `align` 属性在 TextInput 上设置的是 textAlign 效果，不是组件自身在父容器中的定位
- `ellipsisMode` 需配合 `textOverflow(TextOverflow.Ellipsis)` 使用，单独设置不生效
- 仅支持单文本样式，需富文本用 RichEditor

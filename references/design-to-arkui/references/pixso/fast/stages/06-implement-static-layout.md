# 06 - 实现页面静态布局

## 阶段元数据

- id: 06
- title: 06 - 实现页面静态布局
- variant: fast
- designSource: pixso
- instruction: references/pixso/fast/stages/06-implement-static-layout.md
- 子 Agent: 无

## 强制阶段入口 Todo 同步

在本阶段执行任何工作前：

1. 读取成功的 `stage-start` 调用返回的 `todoPayloadPath`。
2. 原样调用一次 `todowrite`，传入 `todo-payload.json.todos`，不得修改。
3. 不得翻译、摘要、重建、追加、删除或重排 Todo 项。
4. 不得运行 `status` 来准备本次同步；`stage-start` 已经刷新过 payload。
5. 只有 `todowrite` 成功后，才可以加载所需能力、查看项目文件、修改代码、构建、截图或发送阶段进度回复。

必须始终执行本次同步。不要试图判断 UI 是否已经包含相同的 Todo 列表。在阶段入口完整重放一次列表是有意为之且幂等的。

## 目标

以阶段 2 已集成且编译通过的 ArkTS 静态骨架为结构起点，按阶段 5 权威契约组织最终原生 ArkUI/HDS 静态结构，完成响应式布局、资源引用、组件拆分、工程接入和静态安全区消费链。

阶段 6 负责静态结构和工程接入。交互逻辑、异步状态和运行时验证归阶段 7；最终审计评级归阶段 8。

## 必需输入

- `<designToArktsFastRunDir>/pre-codegen-security-report.json` 且 `pass=true`。
- 阶段 5 全部权威产物：`design-doc.md`、`component-tree.md`、`hds-decision.json`、`system-ui-policy.json`、`viewport-boundary-spec.json`、`system-ui-coordinate-normalization.json`、`safe-area-unit-contract.json`、`startup-page-policy.json`。
- 阶段 4 选择（`stage4-selected-practices.json`）。
- 阶段 2 骨架、`image-assets-manifest.json` 和集成结果。
- `repo-understand` 报告。

## 执行步骤

阶段 5 是系统 UI、安全区、视口边界、坐标归一化、HDS 和启动页规则的唯一设计来源。阶段 6 读取阶段 5 机器产物执行，不得重新选择、弱化或改写这些规则。

1. 读取并确认 `pre-codegen-security-report.json` 存在且 `pass=true`；缺失或失败时不得开始。
2. 读取阶段 5 全部权威产物和阶段 2 骨架。
3. 对照设计文档组件树、DSL 组件树和阶段 2 骨架组件树，确定最终组件树。
4. 保留阶段 2 可用结构、颜色、布局参数、资源引用和 `@Builder`/组件片段。
5. 删除 mock-only：状态栏、信号、电量、系统手势条、设备外壳、设计模板容器；不得把设计稿中的时间、电量、信号、手势小横条作为应用组件保留。
6. 按响应式策略组织 Column、Row、Flex、Grid、List、Scroll、Tabs、Navigation/NavDestination 或 HDS 对应组件。使用标准 ArkUI `Navigation` 时，必须声明并持有 `NavPathStack`，调用 `Navigation(this.navStack) { ... }`；禁止无参数 `Navigation() { ... }`。不需要页面路由时改用 `Column`、`Stack` 等普通容器。若项目使用 V2 状态管理，可替换 `@State` 为项目适用的状态装饰器，但仍必须把同一个 `NavPathStack` 实例传给 `Navigation`。
7. 把图片图标资源统一转换为项目资源引用，如 `$r('app.media.xxx')`。
8. 用户可见字符串、主要颜色按项目规范提取或复用资源文件。
9. 更新路由、入口和页面注册，并执行 `startup-page-policy.json`：保留 `Index.ets` 文件、`Index` 启动 `@Entry`、`EntryAbility` 的 `pages/Index` 加载路径及 `main_pages.json` 中的 `pages/Index`。目标页面必须使用不会覆盖历史产物的独立文件、组件名和路由名，并导出可复用 `@Component`；按项目现有模式将其加入 Index 的 `Navigation/NavDestination`、路由表或等价页面注册结构。首次运行且不存在业务首页或历史 design-to-arkts-fast 页面时，将本次页面设为初始目标；后续运行只追加 destination/route，保留原初始目标和所有历史页面。只有用户明确要求切换首页时才更新初始目标，并记录变更原因。禁止把完整目标页面代码复制进 Index、删除 Index、把 `loadContent` 改为目标页面、保留多个启动 `@Entry`，或把 Index 改写成仅渲染本次页面。

### 契约执行清单

对以下每个契约项，记录 `implemented` / `not-applicable` / `blocked`，并对 `implemented` 项记录源码路径、组件或函数。不得自行改变契约或工作流状态。不改变已生成组件树和核心契约的问题，保持当前阶段并修正前序实现或业务产物。必须改变已生成组件树或核心契约时，阻塞当前阶段并报告；不得自动返回阶段 5 或重新调用旧阶段 `stage-start`。

- **坐标归一化**：按 `system-ui-coordinate-normalization.json` 逐项处理阶段 2 骨架中的固定画板高度、固定 top/bottom padding、`position({ y })`、`offset`、底部 spacer、mock 状态栏/手势区占位。若设计稿坐标已包含 mock 状态栏或 mock 手势区，必须先减去对应 mock 系统 UI 占用或改为响应式结构间距，再叠加真实安全区。
- **安全区单位**：按 `safe-area-unit-contract.json` 确定安全区原始单位、唯一 px→vp 转换位置、最终布局变量单位和唯一消费者。若 EntryAbility 写入 AppStorage，则写入值必须是最终布局单位；页面不得再次转换。Navigation/HDS 承担 safeTop 时，同一标题栏链路不得再手动叠加 safeTop。
- **系统 UI 总体策略**：按 `system-ui-policy.json` 保持 EntryAbility/WindowStage 级窗口沉浸/全屏布局。不得为避免顶部重叠而关闭 `setWindowLayoutFullScreen`、移除窗口级沉浸配置或恢复系统栏默认背景。
- **背景/前景分层**：按 `systemUiLayeringSpec` 形成背景层和前景层分离结构。背景层铺满窗口，可延伸到系统栏区域；前景层按安全区避让。不得把承载标题栏/首个内容的同一前景容器作为背景沉浸层一起侵入系统区。
- **顶部前景**：按 `topViewportSpec` 的组件清单，确保前景组件在真实状态栏安全区下方布局。使用 Navigation/HDS Navigation 时，承载 `titleBar` 的节点归为前景安全区层，不得直接调用 TOP `expandSafeArea`。
- **视口边界**：按 `viewportBoundarySpec` 确保根背景覆盖全窗口；Scroll/List/Column 不能成为唯一背景承载层；底部可读留白只作用于内容滚动空间；固定底栏/卡片/Tab 与系统手势区按约束布局。

### 非显然事实（仅记录一次）

- `expandSafeArea` 不会自动推开子组件；如果容器既调用 TOP `expandSafeArea` 又直接承载前景子组件，必须给该前景子树单独加安全区消费层。
- 沉浸式背景与前景安全区必须分层；不得用固定 padding/margin 或纯色占位模拟系统栏。
- 不得关闭窗口级沉浸来解决顶部重叠。
- safe area 转换和消费必须服从 `safe-area-unit-contract.json`。

## 阶段 6 不处理的内容

- `avoidAreaChange` 等异步更新链的完整运行时验证（归阶段 7）。
- 首屏数据加载完成信号（归阶段 7）。
- 点击、切换、输入、刷新、播放等交互（归阶段 7）。
- 运行时错误态、空态和加载态（归阶段 7）。
- 最终审计评级（归阶段 8）。

## 必需产物

`<designToArktsFastRunDir>/stage6-implementation-report.md`，用"骨架承接""响应式布局""系统 UI 沉浸""坐标归一化""安全区单位"五个小节承载阶段 6 的实现证据。

每个小节内统一记录证据矩阵：

```text
- contractSource: <阶段 5 产物文件名>
- contractItem: <契约字段名>
- status: implemented | not-applicable | blocked
- sourceLocation: <源码文件:行号 或 组件/函数名>
- implementationNote: <简要说明>
```

报告证明"已经落地"，不复制阶段 5 的规则正文。

## 完成条件

### 通过条件

- `stage6-implementation-report.md` 已写入，且包含"骨架承接""响应式布局""系统 UI 沉浸""坐标归一化""安全区单位"五个小节。
- `pre-codegen-security-report.json` 存在且 `pass=true`。
- 启动页策略已落地：`EntryAbility → pages/Index 稳定导航壳 → 已注册页面`。

### 阻塞或失败条件

- `pre-codegen-security-report.json` 缺失或 `pass=false`。

满足全部完成条件后，调用：

```text
workflow.mjs --mode stage-complete --run-dir <runDir> --stage 6 --result passed
```

无法继续时，调用：

```text
workflow.mjs --mode stage-complete --run-dir <runDir> --stage 6 --result blocked --reason-code <stable_reason_code>
```

Gate 由 Controller 自动生成。不得自行创建、修改或覆盖 stage gate。

### 允许返工范围

保持当前 `currentStage` 不变，可以修正前序阶段产生的实现或业务产物，然后重新执行当前阶段检查。不得直接修改 `workflow-state.json`，也不得重新调用旧阶段的 `stage-start`。

## 禁止事项

- 丢弃阶段 2 骨架从零重写页面。
- 使用 WebView 或运行时 HTML。
- 绘制假状态栏/假底部手势条。
- 只设置页面级 `expandSafeArea` 却不检查窗口级沉浸配置。
- 通过关闭 `setWindowLayoutFullScreen`、删除窗口级沉浸配置或恢复系统栏默认背景来解决顶部重叠。
- 在同一个 Navigation/HDS Navigation/HdsNavigation 节点上同时配置 `titleBar`/返回按钮/顶部搜索并调用 TOP `expandSafeArea`，使 TitleBar 跟随背景进入系统状态栏。
- 只给 Scroll/List/Column 内层容器设置背景，导致顶部或底部系统区域露出默认白/黑底。
- 用固定底部 padding/margin 遮盖系统区，或把系统手势区留成空白边。
- 将页面标题栏或顶部操作按钮放入系统状态栏区域。
- 直接复用设计稿顶部绝对坐标，导致标题和真实状态栏重叠。
- 直接复用设计稿底部绝对坐标、mock 手势区高度或固定底部 spacer，导致底部白边、黑边、过大空隙或内容被挤压。
- 同时保留设计稿 mock 状态栏/手势区间距并叠加真实 `safeTop/safeBottom`。
- 在多个容器重复消费 `safeTop/safeBottom`，或安全区 px/vp 重复转换、漏转换。
- 以固定画板高度作为页面主布局高度，导致不同设备上下留边异常。
- 仅依赖修改 `statusBarHeight/topSafeHeight` 初始值来解决重叠，而没有背景/前景分层、框架安全区能力或完整赋值链保护。
- 报告写了 AppStorage/安全区避让方案，但最终页面源码未采用该方案。
- 以页面级固定坐标作为主要布局方式。

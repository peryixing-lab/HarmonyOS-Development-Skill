---
name: app-quality-verification
description: >-
  通过 devecocli 的 `verify appanalyzer` 命令执行应用/元服务体检。
  当用户提到以下内容时使用：
  - "appanalyzer"、"应用体检"、"元服务体检"
  - "UX 体检"、"UX 检测"、"多设备适配检测"
  - "功耗检测"、"功耗体检"
  - "当前页体检"、"指定页面体检"、"自动体检"
---

# AppAnalyzer 命令行体检

AppAnalyzer 在真机或模拟器上运行被测应用，采集页面、布局与性能数据，输出问题清单、截图、源码位置和修复建议，通过 `devecocli verify appanalyzer` 调用。
读法：先看 §0 前置检查，再用 §3 判断该走哪种体检流程；§4–§6 是各子命令的参数与限制速查，只在确认参数、排查报错时打开。

## 0. 前置检查

每轮体检开始前按顺序确认四项。任一项不满足，先处理它，不要带着缺口开检——debugLine 决定的是源码定位能力：缺了它报告仍会生成，但 `sourceFile` 会缺失或偏移。不过当前页体检的目标就是眼前这一屏，不必为了 debugLine 把已经停好的页面重编丢掉。

**① 子命令可用**

```bash
devecocli verify appanalyzer --version
```

报未知命令 → devecocli 版本过旧或未装 CLI 版（AppAnalyzer 组件只在命令行工具安装源里），提示用户升级/安装后重试。

**② 设备在线与参数来源**

```bash
devecocli device list
```

设备标识：**真机填 SN，模拟器填 `IP:port`**。不传 `-d` 时优先第一个可用真机，否则第一个可用模拟器。当存在多个设备时，提示用户选择一个设备进行检测，不可自行选择。


`-b` 与 `-p` 从哪来：

- **包名**：工程 `AppScope/app.json5` 的 `bundleName`；没有工程时用`devecocli device app foreground --format json`（当前前台应用）或 `devecocli device app list`。
- **工程路径**：`build-profile.json5` 所在目录。`build` 和 `run` 都从当前目录读取工程，没有 `--project` 参数；当前目录不是工程、用户也没给路径时，先问清楚，不要猜一个目录开跑。

**③ 是否需要编译安装（决定问题能否定位到源码）**

AppAnalyzer 依赖包内的 debugLine 信息，把问题组件映射回 `sourceFile:行号`。包不带它，`sourceFile` 会缺失或偏移，只能按页面和规则人工翻找。先判断本轮要不要构建安装，别默认"每轮都重编"：

| 情况 | 处理 |
|---|---|
| 应用未安装，或设备前台不是被测包 | `devecocli build --debug-line` → `devecocli run --skip-build` |
| 上次构建之后改过被测代码（修 bug、加 deeplink 临时入口都算） | 重新 `build --debug-line` → `run --skip-build` |
| 不确定设备上的包是否带 debugLine，且本轮需要源码定位 | 重新 `build --debug-line` → `run --skip-build` |
| 本轮已用 `--debug-line` 构建安装，之后代码未变 | 跳过构建，直接体检 |
| **当前页面体检**：设备已停在目标页、前台是被测应用 | **不构建、不安装，直接体检** |

应用签名参考 `deveco-cli` SKILL中的 `devecocli signature generate` 部分。

```bash
devecocli build --debug-line
devecocli run --skip-build --device <serial>
```
**老版本没有该参数**：跑 `devecocli build --debug-line` 报错，说明版本过旧，安装最新版后重试：`npm install -g @deveco/deveco-cli@latest`。不要退化成无 debugLine 的构建继续体检。

**④ 页面导航方式（仅指定页面体检需要）**

当前页体检不需要导航——页面已经在屏幕上，确认前台是被测应用就够了。只有指定页面体检（目标页不在当前屏幕）才需要选导航方式。检查 `ui-verification-with-deeplink` 技能是否存在，只跑 `autoAnalyze`、目标页已经在屏幕上或使用`ui click` 点击成本小于等于5次时，不需要加载和引入该SKILL。

- **存在** → 优先用它把设备直接开到目标页：只加一条临时自定义 URI 路由做导航，替代逐级点击，不替代被测业务动作、不改写业务逻辑、**只做导航不使用它的 `verify_ui` 流程**。把 URI 注入放在第一次 build --debug-line 之前，让一次构建同时带上 debugLine 和调试入口。
- **不存在** → 用 `devecocli ui` 操作设备：`ui layout` 找控件，`ui click` / `ui click --selector` / `ui swipe` /
  `ui text` / `ui press_key` / `ui press_key power` 操作，`ui screenshot` 截图，`ui window list` 看窗口。

## 1. 初始化环境

初始化是执行检测的前提：未完成初始化时，检测无法进行。

```bash
devecocli verify appanalyzer init                      # 执行一次即可
```

初始化只需成功执行一次；之后不必每轮重跑，只有环境缺依赖或被清理时才需要再做。

| 参数 | 说明 |
|---|---|
| `-p, --proxy <http://host:port>` | 网络代理，格式 `http://[user:pass@]host:port` |
| `-s, --sslVerify <true\|false>` | SSL 证书校验，默认 true |
| `-i, --indexUrl <http://host/simple>` | pip 镜像源，覆盖默认源 |
| `-n, --noProxyList <HOST,HOST>` | 绕过代理的主机，逗号分隔，支持 `*` 通配，需配合 `-p` 使用 |
| `-l, --language <CN\|EN>` | 输出语言，默认 EN |

## 2. 场景与设备支持表

| 分类 | 场景 | 名称 | 推荐 | 支持的设备 | 说明 |
|---|---|---|---|---|---|
| D03 多设备 | S14 | 截断 Truncation | ⭐ | 真机：直板机/折叠屏/三折叠；模拟器：直板机/折叠屏/三折叠 | — |
| D03 多设备 | S15 | 大图大字 Large Image | ⭐ | 真机：**仅折叠屏/三折叠**；模拟器：折叠屏/三折叠 | — |
| D03 多设备 | S16 | 留白 White Space | ⭐ | 真机：**仅折叠屏/三折叠**；模拟器：折叠屏/三折叠 | — |
| D03 多设备 | S17 | 避让区遮挡 Avoid Area | ⭐ | 真机：直板机/折叠屏/三折叠；模拟器：直板机/折叠屏/三折叠 | — |
| D03 多设备 | S18 | 基础 Foundation | — | 真机：直板机/折叠屏/三折叠；模拟器：直板机/折叠屏/三折叠 | `-m` HAP 图标检查只在此场景生效 |
| D04 功耗 | S11 | 前台静置 Front Standby | ⭐ | **仅真机**（直板机/折叠屏/三折叠） |模拟器不支持 |

推荐场景集合 = `S14, S15, S16, S17, S11`，即 `autoAnalyze` 不传 `-s` 时的实际执行范围。其余子命令只在自己的场景类别里取推荐：`uxAnalyze` → `S14–S17`，`powerAnalyze` → `S11`。当用户没有显示指定场景时，不传递 `-s`参数检测推荐场景即可。当用户显示指定了需要检测应用图标规则或元服务图标规则时，`uxAnalyze` 和 `autoAnalyze` 追加 `-m` 参数，hap包路径在 `devecocli build` 的末尾输出中会给出，一般使用带签名的即可。

被设备限制的场景不会报错退出，而是**跳过**并在报告里体现，只有当选择的场景都不支持检测时才会报错退出；`devecocli device list`的查询结果只有 `kind` 字段可以区分设备是真机还是模拟器，`Device Type`字段无法区分设备是直板机还是折叠屏，只需要区分出设备是真机还是模拟器即可。

## 3. 体检模式与执行流程

命令只是手段，先判定用户要的是哪一种体检，再按对应流程走。

### 3.1 模式判定

| mode | 用户通常怎么说 | 判定依据 | 用哪个命令 |
|---|---|---|---|
| current-page-check | "体检当前页 / 这一屏 / 这个页面" | 没指定具体页面，设备已停在目标页 | `uxAnalyze` / `powerAnalyze`（MANUAL 单页） |
| target-page-check | "检查 pages/Xxx.ets 这个页面"、给了 deeplink | 指定了页面（源码路径或页面名） | 导航到该页 + `uxAnalyze` / `powerAnalyze` |
| full-check | "全页体检 / 所有页面 / 自动遍历 / 30 分钟" | 要覆盖全应用页面 | `autoAnalyze`（AUTO 全页遍历） |

```text
用户诉求
  ├─ 指定了具体页面 ──────────────────────→ target-page-check
  ├─ 没指定页面，要覆盖全应用 / 给了时长 ──→ full-check
  └─ 没指定页面，只看眼前这一屏 ──────────→ current-page-check
```

专项（specialties）只有两种：

- `ux` → D03 多设备场景（S14–S18）
- `power` → D04 前台静置（S11）

可单选也可多选。多选时固定按 **UX → 功耗** 顺序逐个执行：功耗录制要求设备静置，把它放在后面，避免 UX 阶段的交互和录制互相干扰。用户没说专项时默认只做 `ux`，执行前用一句话说明本次专项范围。

### 3.2 当前页面体检（current-page-check）

适用：设备已连接、应用已安装，用户想体检"眼前这一屏"。手动模式只采集一次当前页面。

① **确认前台是被测应用**

```bash
devecocli device app foreground --device <serial>     # 前台 bundleName 是不是被测应用
```
只确认这一件事：前台是被测应用就开检。如果前台不是被测应用则提示用户当前前台应用不是被测应用。当前页体检不重新编译，无法确认设备上的包是否带 debugLine，所以检测报告可能没有 `sourceFile` 字段；

② **确认专项列表**

`specialties = [ux]`、`[power]` 或 `[ux, power]`；多选按 UX → 功耗固定顺序。

③ **执行专项检测**

```bash
# ux
devecocli verify appanalyzer uxAnalyze -b <bundleName> -p <projectPath> -d <serial> -o <projectPath>/.appanalyzer
# power（仅真机）
devecocli verify appanalyzer powerAnalyze -b <bundleName> -p <projectPath> -d <serial> -o <projectPath>/.appanalyzer
```
多个专项时，**每个专项开始前重新确认前台仍是被测应用**：设备可能因上一次检测、通知、自动跳转而漂移，在别的应用上跑第二个专项会得到一份指向错页的报告。

④ **定位报告**

```text
<projectPath>/.appanalyzer/appanalyzer/<yyyyMMdd_HHmmss>/result.json     # 最新一次运行的目录
```

每次运行都会新建一个时间戳目录，每个专项各有一份 `result.json`。取"本次运行新建的那个"——先记录运行前的目录列表，或运行后取最新修改时间，不要拿上一次残留的目录当结果。

⑤ **输出体检结论**

按下面模板回话，整段照抄（不要加 `#` 标题，空行、`—`、`｜` 都照抄），只替换 `<…>` 和示例值；只跑一个专项时，删掉另一个专项的段、场景行和括号计数。取值只来自 `result.json` 和报告目录里的截图：`scene` / `ruleName` / `componentType` / `metricValue` / `文件:行号`。

```text
专项：ux（D03，场景 S14–S17）+ power（D04，场景 S11）｜ 设备：<型号><deviceId>
报告：<报告目录完整路径>/result.json（同目录 report.zip 可导入 DevEco Studio AppAnalyzer 插件）

结论：命中 2 组问题，共 12 条明细（ux 1 组 / 10 条；power 1 组 / 2 条）。
| 场景 | 结果 | 组数 | 明细 |
|---|---|---|---|
| S14 截断 | 命中 | 1 | 10 |
| S15 大图大字 | 未命中 | 0 | 0 |
| S16 留白 | 未命中 | 0 | 0 |
| S17 避让区遮挡 | 未命中 | 0 | 0 |
| S11 前台静置 | 命中 | 1 | 2 |

1. 截断 · 布局基础要求 · Text — entry/src/main/ets/pages/ux_old_demo/popuptruncation.ets:250（10 条）
   - 单屏态 2 条 ｜ 页面存在文字内容或按钮截断问题 ｜ files/fold_ori_state_screen_20261110192606_truncation.jpeg
   - 双屏态横屏 2 条 ｜ 页面存在文字内容或按钮截断问题 ｜ files/ori_state_screen_20261110192619_truncation.jpeg
   - 三屏态横屏 3 条 ｜ 页面存在文字内容或按钮截断问题 ｜ files/tri_fold_landscape_state_screen_20261110192628_truncation.jpeg
   - 三屏态竖屏 3 条 ｜ 页面存在文字内容或按钮截断问题 ｜ files/tri_fold_portrait_state_screen_20261110192636_truncation.jpeg

2. 前台静置 · UI空跑 — entry/src/main/ets/powerDiagnose/UI/UISkip.ets（2 条）
   指标：59.84帧/s
   - entry/src/main/ets/powerDiagnose/UI/UISkip.ets:130 ｜ 应用使用属性动画不当导致出现UI空跑问题 ｜ files/1110_161137_OP_endimage.jpeg
   - entry/src/main/ets/powerDiagnose/UI/UISkip.ets:124 ｜ 应用使用属性动画不当导致出现UI空跑问题 ｜ files/1110_161137_OP_endimage.jpeg
```

### 3.3 指定页面体检（target-page-check）

适用：用户指定一个页面（`pages/xxx.ets` 或 deeplink），对该页做单个或多个专项。组合 = **指定页面遍历** + **§3.2 当前页体检**。

① **编译构建安装运行**（应用未安装，或按 §0 ③ 需要重编时）

```bash
devecocli build --debug-line
devecocli run --skip-build --device <serial>
```

走 deeplink 导航时，把"注册临时 URI"放在构建之前，一次构建同时带上 debugLine 和调试入口；先构建再注入会导致"注入 → 重新构建 → 再部署"的重复往返。

② **导航到目标页**（子流程见 §3.3.1）

③ **执行专项检测**：同 §3.2 ③，多专项时每个专项前重新确认页面未漂移。

④ **定位报告 + 输出结论**：同 §3.2 ④⑤。

#### 3.3.1 页面到达子流程

```text
deeplink 技能可用?
  ├─ 是 → 注册临时 URI 路由 → build --debug-line → run --skip-build
  │        → device app start --uri "<scheme>://test/xxx" → 截图抽查
  └─ 否 → devecocli run → 按源码路由 / Tab 逐级操作（ui layout 找控件 → ui click/swipe）
```
### 3.4 全页体检（full-check）

适用：用户要对应用做全页自动体检（例如 30 分钟全页 UX 体检），单专项或多专项同时。

① **应用未安装或需重编**：同 §3.3 ①（`build --debug-line` → `run --skip-build`）。

② **全页自动体检**

```bash
devecocli verify appanalyzer autoAnalyze -b <bundleName> -p <projectPath> -t 10 -d <serial> -o <projectPath>/.appanalyzer
```

- 专项映射：`ux` → `-s D03`（多设备 UX 场景）；`power` → `-s D04`（功耗场景）；
  两者都要 → 不传 `-s`，或显式 `-s D03,D04`。
- `-t/--duration` 默认 10 分钟，范围 5–240，按用户要求指定（如 `-t 30`）。
- AUTO 自己遍历页面，**不需要 deeplink，也不需要手动导航**；遍历期间不要操作设备，
  否则会改变遍历路径，报告里的页面覆盖范围不可信。

③ **定位报告 + 输出结论**：同 §3.2 ④⑤，按 `uxIssues` / `powerIssues` 分类汇总。

## 4. 手动 UX 检测（`uxAnalyze`）

适合"只想检查当前这一屏"。工具只采集**一次**当前页面，仅支持 D03 场景。

```text
执行流：
当前页体检? ──是──→ 确认前台是被测应用 → 开检（跳过构建/导航）
           └─否──→ 包带 debugLine 且已安装? ──否──→ build --debug-line → run --skip-build
                                           └─是──→ 导航到目标页（deeplink 或 ui click/swipe）
执行：uxAnalyze（采集一次）→ <projectPath>/.appanalyzer/appanalyzer/<时间戳>/result.json → 结论
```

```bash
devecocli verify appanalyzer uxAnalyze -b <bundleName> -p <projectPath> -s <Dxx,Sxx> -d <serial|IP:port> -o <projectPath>/.appanalyzer -m <hapPaths>
```

- 当前页体检**不重新编译**：规格变更、换专项、加场景都不需要 build/run，确认前台是被测应用即可；页面已经在屏幕上，重编只会把它拉回首页。
- `-m` 仅 S18 基础场景的图标检查生效。**没有 `-t`**，手动检测不分时长。
- 单页检测**通常 1-2 分钟左右**（录制 + 分析 + 生成报告）。期间工具会自己折叠/展开设备，采集单屏、双屏、三屏等形态，屏幕变化是正常现象，不要手动干预，也不要在这期间操作设备。
- 检测期间保持亮屏、不要切页；切页会导致采到别的页面。

## 5. 自动遍历检测（`autoAnalyze`）

工具自动遍历页面并逐页检测，覆盖全应用页面。**同时支持 UX（D03）与功耗（D04）场景**。

```text
执行流：
包带 debugLine 且已安装? ──否──→ build --debug-line → run --skip-build
                         └─是──→ 直接开检
执行：autoAnalyze（自动遍历，-t 默认 10 分钟）→ 期间不要操作设备
产出：<projectPath>/.appanalyzer/appanalyzer/<时间戳>/result.json → 按 uxIssues / powerIssues 分类 → 结论
```

```bash
devecocli verify appanalyzer autoAnalyze -b <bundleName> -p <projectPath> -s <Dxx,Sxx> -t <num> -d <serial|IP:port> -o <projectPath>/.appanalyzer -m <hapPaths>
```

- `-t/--duration` 为遍历时长（分钟），范围 **5–240**，默认 10，越界会被参数校验拒绝。
- 不传 `-s` 时执行推荐场景，其中已包含功耗场景 S11。只想要 UX 结果请显式传 `-s D03`，只想要功耗结果传 `-s D04`。
- 功耗场景受真机限制，规则同 §2。

## 6. 功耗前台静置检测（`powerAnalyze`）

适合"只想检查当前页面的功耗表现"。工具录制**一次**前台静置画面，仅支持 D04 场景。

```text
执行流：
设备是真机? ──否──→ 停止：模拟器不支持功耗，改用真机
当前页体检? ──是──→ 确认前台是被测应用 → 停在当前页（跳过构建/导航）
           └─否──→ 包带 debugLine 且已安装? ──否──→ build --debug-line → run --skip-build
                                           └─是──→ 导航到目标页
执行：保持亮屏 + 全程不操作 → powerAnalyze（录 15s）→ <projectPath>/.appanalyzer/appanalyzer/<时间戳>/result.json → 结论
```

```bash
devecocli verify appanalyzer powerAnalyze -b <bundleName> -p <projectPath> -d <serial> -o <projectPath>/.appanalyzer
```

- **仅支持真机**。仅功耗场景连模拟器 → 直接报错退出；功耗 + UX 混选且设备是模拟器 →功耗部分标记为未执行，UX 正常执行。
- **没有** `-t`（固定录制 15s）也**没有** `-m`（不需要 HAP）。场景只接受 `D04` / `S11`；
- 录制期间设备必须静置：不要点屏幕、不要切页、不要锁屏。

## 7. 参数速查

公共参数：

| 参数 | 说明 | 必填 |
|---|---|---|
| `-b, --bundleName <PACKAGE>` | 应用/元服务包名 | ✓ |
| `-p, --projectPath <DIR>` | 项目路径，用于把问题映射回源码页面 | ✓ |
| `-s, --scenes <Dxx\|Sxx>` | 场景，逗号分隔；缺省用推荐场景 | ✗ |
| `-d, --device <SERIAL\|IP:PORT>` | 真机 SN 或模拟器 IP:port；缺省优先真机，否则模拟器 | ✗ |
| `-o, --output <DIR>` | 报告输出目录。**固定传当前项目的 `.appanalyzer`**：`-o <projectPath>/.appanalyzer` | ✗ |
| `-m, --hapPaths <PATH,PATH>` | HAP 路径，仅 S18 基础场景的图标检查生效 | ✗ |
| `-l, --language <CN\|EN>` | 输出语言，默认 EN | ✗ |

子命令差异：

| 项 | uxAnalyze | autoAnalyze | powerAnalyze |
|---|---|---|---|
| `-t, --duration` | ✗ | ✓ 5–240 分钟，默认 10 | ✗（固定录制 15s） |
| `-m, --hapPaths` | ✓ | ✓ | ✗ |
| 场景范围 | 仅 D03 | D03 + D04 | 仅 D04 / S11 |
| 设备 | 真机 + 模拟器 | 真机 + 模拟器 | **仅真机** |
| 设备交互 | 用户预先停在目标页并保持亮屏 | 自动遍历 | 启动应用后静置，勿操作 |

## 8. 结果解读

报告**不在 `-o` 根目录**，而是落在 `<-o 目录>/appanalyzer/<yyyyMMdd_HHmmss>/`。`-o` 固定用 `<projectPath>/.appanalyzer`，所以完整报告路径是：

```text
<projectPath>/.appanalyzer/appanalyzer/<yyyyMMdd_HHmmss>/
├── result.json      # 结构化结果
├── report.zip       # 完整报告（可在 DevEco Studio 的 AppAnalyzer 插件历史报告页面导入查看）
└── files/           # 检测过程文件
```
`result.json` 的示例与字段含义见 `references/report-format.md`——仅在需要逐字段解读报告或向用户解释字段含义时读取；只汇报问题数量、场景与源码位置时无需加载。
**检测通过时对应的数组为空**：`result.json` 只记录命中的问题，`uxIssues`（或 `powerIssues`）为 `[]`
就表示该专项没有命中任何问题，报告里不会出现"通过"字样。

汇报问题时优先给出 `sourceFile`（`文件路径:行号`）和截图路径，这是用户最需要的两样东西。

## 9. 常见坑

- **把失败当成功**：命令非 0 退出（场景不支持、参数非法、设备被占用）就停下来看报错，不要把上一次运行留下的报告当成本次结果。
- **手动检测前没停到目标页**：采到错误页面或黑屏；多专项之间设备也会漂移，每轮都要重确认。
- **同一设备并发检测**：同一时刻只跑一个，并发会因设备占用失败。
- 使用真机进行检测时，可能会遇到用户设备息屏时间设置极短，导航过程中频繁息屏，提示用户将息屏时间设置在1分钟以上，不要尝试修改息屏时间，尝试多次电源键和滑动解锁设备还是息屏，结束体检。
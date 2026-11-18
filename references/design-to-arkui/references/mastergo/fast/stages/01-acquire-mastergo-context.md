# 01 - 获取并校验 MasterGo 官方设计源

首次进入时读取 Controller 返回的 todoPayloadPath，将 .todos 原样同步一次 todowrite；恢复已确认阶段时不重复同步。

读取并执行 `references/mastergo/acquire.md`，当前 variant=fast，designSource=mastergo。只执行当前阶段。

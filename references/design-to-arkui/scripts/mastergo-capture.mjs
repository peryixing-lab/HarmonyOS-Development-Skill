import { lstatSync, mkdirSync, readFileSync, realpathSync } from "node:fs"
import { join, relative, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"
import { capture } from "./mastergo-evidence.mjs"
import { withMasterGoClient } from "./mastergo-connection.mjs"

const READ_TOOLS = new Set([
  "getDesignSections",
  "getDsl",
  "getD2c",
  "getDesignSvgs",
  "getMeta",
  "get_frontend_code",
  "get_selection_node",
  "get_selection_code",
  "get_screenshot",
  "get_selection_image",
  "get_variables",
  "mastergo_api_categories",
  "mastergo_api_list",
  "mastergo_api_scheme",
  "mastergo_api_call",
])
const COMMUNITY_READS = new Set([
  "mg.apiVersion",
  "mg.document",
  "mg.documentId",
  "mg.getNodeById",
  "node.page",
  "node.summary",
  "node.findChildren",
  "node.findAll",
  "node.findAllWithCriteria",
  "node.export",
  "node.exportAsync",
])

// Platform policy and execution stay in the skill; no Code builtin is required.
export function prepareMasterGoCapture(input, directory = process.cwd()) {
  requireInput(input)
  const project = realpathSync(directory)
  const runDir = resolveRunDir(project, input.runDir)
  if (input.operation === "tools") return { operation: "tools", server: input.server }
  const name = typeof input.tool === "string" ? input.tool.replace(/^mcp__?/, "") : ""
  if (!READ_TOOLS.has(name))
    throw new Error("Select a MasterGo design-reading tool; canvas editing is not supported here")
  const args = readArguments(name, input.arguments)
  const outputDir = prepareExportDirectory(runDir)
  configureExportArguments(name, args, project, outputDir)
  return { operation: "call", server: input.server, tool: name, arguments: args, outputDir }
}

export async function captureMasterGo(client, input, directory = process.cwd(), signal) {
  const result = await capture(client, prepareMasterGoCapture(input, directory), directory, signal)
  if (input.operation !== "tools") return result
  return { ...result, tools: result.tools.filter((tool) => READ_TOOLS.has(tool.name.replace(/^mcp__?/, ""))) }
}

function requireInput(input) {
  if (!input || !["tools", "read"].includes(input.operation)) throw new Error("Choose tools or read")
  if (typeof input.server !== "string" || !input.server.trim()) throw new Error("Choose a configured MCP server")
  if (typeof input.runDir !== "string" || !input.runDir || input.runDir.includes("\0"))
    throw new Error("Invalid MasterGo run directory")
  if (
    input.arguments !== undefined &&
    (!input.arguments || typeof input.arguments !== "object" || Array.isArray(input.arguments))
  ) {
    throw new Error("Tool arguments must be an object")
  }
  if (containsCredentials(input.arguments))
    throw new Error("Keep credentials in MCP configuration, not in tool arguments")
}

function resolveRunDir(project, value) {
  const destination = resolve(project, value.replaceAll("\\", "/"))
  const rel = relative(project, destination)
  if (!/^\.deveco[\\/]design-to-arkts(?:-fast)?[\\/]runs[\\/][^\\/]+$/.test(rel)) {
    throw new Error("Use a single run under .deveco/design-to-arkts[-fast]/runs")
  }
  checkDirectories(project, rel.split(sep), "run")
  const state = JSON.parse(readFileSync(join(destination, "workflow-state.json"), "utf8").replace(/^\uFEFF/, ""))
  if (state?.designSource !== "mastergo" || state.currentStage !== 1 || state.status !== "running") {
    throw new Error("Capture only during a running MasterGo stage 1; for stage 2 use workflow.mjs --mode reacquire with a new sibling run")
  }
  return destination
}

function checkDirectories(root, parts, label) {
  return parts.reduce((parent, part) => {
    const current = join(parent, part)
    const info = lstatSync(current, { throwIfNoEntry: false })
    if (info?.isSymbolicLink()) throw new Error(`MasterGo ${label} paths must not contain symlinks`)
    if (info && !info.isDirectory()) throw new Error(`MasterGo ${label} paths must be directories`)
    return current
  }, root)
}

function readArguments(name, input) {
  const args = { ...input }
  if (name !== "mastergo_api_call") return args
  if (typeof args.method !== "string" || !COMMUNITY_READS.has(args.method)) {
    throw new Error("Only read-only community MasterGo methods are allowed")
  }
  if (!["node.export", "node.exportAsync"].includes(args.method)) return args
  if (!args.params || typeof args.params !== "object" || Array.isArray(args.params)) {
    throw new Error("Community exports require node parameters")
  }
  args.params = { ...args.params, maxBytes: 3 * 1024 * 1024 }
  return args
}

function prepareExportDirectory(runDir) {
  const outputDir = checkDirectories(runDir, ["source", "mastergo", "export"], "export")
  mkdirSync(outputDir, { recursive: true })
  if (realpathSync(outputDir) !== outputDir) throw new Error("MasterGo export directory must not contain symlinks")
  return outputDir
}

function configureExportArguments(name, args, project, outputDir) {
  if (name === "getD2c") args.outDir = outputDir
  if (name === "get_frontend_code") {
    args.projectDir = project
    args.outDir = outputDir
    args.frontendFramework = "html"
    args.writeToFile = true
    delete args.fileName
  }
  if (
    ["get_selection_node", "get_selection_code", "get_screenshot", "get_selection_image", "get_variables"].includes(
      name,
    )
  ) {
    args.projectDir = project
  }
  if (["getDsl", "getDesignSections", "getDesignSvgs", "getMeta"].includes(name)) args.format = "json"
}

function containsCredentials(value) {
  if (!value || typeof value !== "object") return false
  return Object.entries(value).some(
    ([key, entry]) => /token|cookie|password|authorization|secret/i.test(key) || containsCredentials(entry),
  )
}

async function main() {
  const flags = process.argv.slice(2)
  if (flags.length !== 6 || flags[0] !== "--config" || flags[2] !== "--connection" || flags[4] !== "--runtime") {
    throw new Error(
      "Usage: node mastergo-capture.mjs --config <capture.json> --connection <connection.json> --runtime <runtime-directory>",
    )
  }
  const input = JSON.parse(readFileSync(resolve(flags[1]), "utf8").replace(/^\uFEFF/, ""))
  // Validate before loading the SDK or starting a server process.
  prepareMasterGoCapture(input)
  const connection = JSON.parse(readFileSync(resolve(flags[3]), "utf8").replace(/^\uFEFF/, ""))
  const abort = new AbortController()
  const stop = () => abort.abort(new Error("Capture interrupted"))
  const timeout = setTimeout(stop, 180_000)
  process.once("SIGINT", stop)
  process.once("SIGTERM", stop)
  try {
    const result = await withMasterGoClient(connection, flags[5], input.server, process.cwd(), abort.signal, (client) =>
      captureMasterGo(client, input, process.cwd(), abort.signal),
    )
    process.stdout.write(JSON.stringify(result) + "\n")
    if (result.isError) process.exitCode = 1
  } finally {
    clearTimeout(timeout)
    process.removeListener("SIGINT", stop)
    process.removeListener("SIGTERM", stop)
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await main()
  } catch (error) {
    process.stderr.write(`mastergo-capture: ${error.message}\n`)
    process.exitCode = 1
  }
}

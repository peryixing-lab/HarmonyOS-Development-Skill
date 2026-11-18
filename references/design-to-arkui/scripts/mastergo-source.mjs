import { createHash, randomUUID } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const MASTERGO_CONTRACT = 'source/mastergo/input-contract.json';
export const MASTERGO_RUN_STATE = 'stage2/hmos-d2a-mastergo-to-arkui-run.json';
export const MASTERGO_CONFIRMATION_FILES = [
  ['componentVisionAnalysis', 'stage2/component-vision-analysis.json'],
  ['componentAnalysis', 'stage2/component-analysis.md'],
  ['componentTree', 'component-tree.md'],
  ['designDoc', 'design-doc.md'],
  ['systemUI', 'system-ui-policy.json'],
  ['viewport', 'viewport-boundary-spec.json'],
  ['reusePlan', 'stage2/component-reuse-plan.json'],
  ['assetSelection', 'stage2/asset-selection.json'],
];

const MAX_FILE = 10 * 1024 * 1024;
const MAX_TOTAL = 100 * 1024 * 1024;
const EXTENSIONS = new Set(['.html', '.htm', '.jsx', '.json', '.css', '.png', '.jpg', '.jpeg', '.webp', '.svg', '.woff', '.woff2', '.ttf']);
const READ_TOOLS = new Set([
  'get_frontend_code', 'get_selection_node', 'get_selection_code', 'get_screenshot', 'get_selection_image',
  'get_variables', 'get_library_list', 'get_component_info', 'get_component_catalog', 'get_component_details',
  'get_library_assets', 'getDsl', 'getDesignSections', 'getD2c', 'getDesignSvgs', 'getMeta',
  'mastergo_api_call',
]);

const COMMUNITY_READS = new Set([
  'mg.apiVersion', 'mg.document', 'mg.documentId', 'mg.getNodeById',
  'node.page', 'node.summary', 'node.findChildren', 'node.findAll',
  'node.findAllWithCriteria', 'node.export', 'node.exportAsync',
]);

function hash(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function json(path) {
  return JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));
}

function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}

function inside(root, value) {
  requireValue(typeof value === 'string' && value.length > 0 && !value.includes('\0') && !value.includes('\\'), 'Invalid evidence path');
  const path = resolve(root, value);
  const rel = relative(root, path);
  requireValue(rel !== '' && rel !== '..' && !rel.startsWith('..' + sep) && !isAbsolute(rel), 'Evidence path escapes its root');
  // Check every existing ancestor as well as the leaf, including dangling symlinks.
  const parts = rel.split(sep);
  parts.reduce((parent, part) => {
    const current = join(parent, part);
    const stat = lstatSync(current, { throwIfNoEntry: false });
    requireValue(!stat?.isSymbolicLink(), 'Symlink evidence is not allowed');
    return current;
  }, root);
  return path;
}

function readBounded(path) {
  const stat = lstatSync(path);
  requireValue(stat.isFile() && stat.size > 0 && stat.size <= MAX_FILE, 'Evidence must be a non-empty regular file of at most 10 MiB');
  return readFileSync(path);
}

function png(bytes) {
  requireValue(bytes.length >= 33 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) && bytes.toString('ascii', 12, 16) === 'IHDR', 'Expected a PNG screenshot');
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  requireValue(width > 0 && height > 0 && width * height <= 40_000_000, 'Screenshot pixel limit exceeded');
  return { width, height };
}

function atomic(path, bytes) {
  mkdirSync(dirname(path), { recursive: true });
  const temp = path + '.' + randomUUID() + '.tmp';
  writeFileSync(temp, bytes, { flag: 'wx', mode: 0o600 });
  try {
    renameSync(temp, path);
  } finally {
    if (existsSync(temp)) unlinkSync(temp);
  }
}

function toolName(value) {
  return String(value).replace(/^mcp__?/, '');
}

function resourceReferences(text) {
  return [...text.matchAll(/<(?:img|image)\b[^>]*?\b(?:src|href|xlink:href)\s*=\s*["']([^"']+)["']|url\(\s*["']?([^\s)'"\n]+)["']?\s*\)/gi)]
    .map((match) => match[1] ?? match[2])
    .filter((value) => !value.startsWith('data:') && !value.startsWith('#'));
}

function validateCommunityAcquisition(entries, read, identity) {
  const calls = entries.map((entry) => {
    requireValue(toolName(entry.tool) === 'mastergo_api_call' && COMMUNITY_READS.has(entry.arguments?.method), 'Unsupported community read method');
    const body = read(entry);
    const value = body.structuredContent ?? JSON.parse(body.content.find((item) => item.type === 'text')?.text ?? 'null');
    requireValue(body.isError !== true && value?.data?.code === 0, 'Community MCP evidence reports an error');
    return { method: entry.arguments.method, params: entry.arguments.params, result: value.data.res };
  });
  requireValue(calls.some((call) => call.method === 'mg.document' && String(call.result?.id) === identity.documentId), 'Community document identity is not verified');
  requireValue(calls.some((call) => call.method === 'mg.getNodeById' && call.params?.id === identity.nodeId && call.result?.id === identity.nodeId), 'Community target node identity is not verified');
  requireValue(calls.some((call) => call.method === 'node.findAll' && call.params?.id === identity.nodeId && Array.isArray(call.result?.items) && call.result.truncated === false && call.result.items.length === call.result.total), 'Community node acquisition is incomplete');
}

// This imports MCP outputs as inert evidence. It never renders HTML,
// executes JSX, contacts resource URLs, or modifies the ArkUI project.
export function importMasterGoSource(config) {
  requireValue(config && ['vibe', 'magic', 'community'].includes(config.mode), 'Choose a supported MasterGo MCP mode');
  requireValue(typeof config.identity?.documentId === 'string' && config.identity.documentId.length > 0 && typeof config.identity?.nodeId === 'string' && config.identity.nodeId.length > 0, 'Lock a single documentId and nodeId before importing');
  requireValue(['html', 'jsx', 'dsl', 'nodes'].includes(config.format), 'Source format must be html, jsx, dsl or nodes');
  requireValue(config.mode === 'community' ? config.format === 'nodes' : config.format !== 'nodes', 'Community node data must use its own nodes format');
  requireValue((config.format === 'html' ? ['.html', '.htm'] : config.format === 'jsx' ? ['.jsx'] : ['.json']).includes(extname(config.sourceFile).toLowerCase()), 'Source file extension must match its format');
  const project = realpathSync(config.projectRoot);
  // Directory configuration may use native Windows separators; evidence paths remain strict.
  const runDir = inside(project, typeof config.runDir === 'string' ? config.runDir.replaceAll('\\', '/') : config.runDir);
  const state = json(join(runDir, 'workflow-state.json'));
  requireValue(state.designSource === 'mastergo' && state.currentStage === 1 && state.status === 'running', 'Import only during MasterGo stage 1');
  const exportRoot = realpathSync(inside(project, typeof config.exportRoot === 'string' ? config.exportRoot.replaceAll('\\', '/') : config.exportRoot));
  requireValue(Array.isArray(config.responses) && config.responses.length > 0, 'Save the actual MCP responses before import');
  const pending = [];
  const prepare = (source, destination, extra = {}) => {
    const bytes = readBounded(inside(exportRoot, source));
    const path = inside(runDir, destination);
    pending.push({ path, bytes });
    return { path: relative(runDir, path).replaceAll('\\', '/'), sha256: hash(bytes), size: bytes.length, ...extra };
  };
  const source = prepare(config.sourceFile, `source/mastergo/design/${config.sourceFile}`, { format: config.format });
  requireValue(config.format !== 'dsl' || extname(config.sourceFile) === '.json', 'DSL must be saved as JSON');
  if (['dsl', 'nodes'].includes(config.format)) json(inside(exportRoot, config.sourceFile));
  const responses = config.responses.map((entry, index) => {
    requireValue(READ_TOOLS.has(toolName(entry.tool)), 'Only supported design-reading MCP tools belong in this workflow');
    const body = json(inside(exportRoot, entry.path));
    requireValue(body && typeof body === 'object' && body.isError !== true && Array.isArray(body.content) && body.content.length > 0, 'MCP response is missing content or reports an error');
    requireValue(config.mode === 'community' || toolName(entry.tool) !== 'mastergo_api_call', 'Community evidence must retain its own mode');
    return prepare(entry.path, `source/mastergo/mcp/response-${index + 1}.json`, { tool: entry.tool, ...(config.mode === 'community' ? { arguments: entry.arguments } : {}) });
  });
  const names = responses.map((entry) => toolName(entry.tool));
  if (config.mode === 'community') validateCommunityAcquisition(config.responses, (entry) => json(inside(exportRoot, entry.path)), config.identity);
  requireValue(config.mode === 'community' || (config.mode === 'vibe'
    ? names.some((name) => ['get_frontend_code', 'get_selection_node', 'get_selection_code'].includes(name))
    : names.some((name) => ['getDsl', 'getDesignSections', 'getD2c'].includes(name))), 'Missing official source acquisition response');
  const screenshot = (value, path) => {
    const bytes = readBounded(inside(exportRoot, value.path));
    requireValue([1, 2].includes(value.scale), 'Screenshot scale must be 1 or 2');
    return { ...prepare(value.path, path), ...png(bytes), scale: value.scale };
  };
  const reference = screenshot(config.reference, 'source/mastergo/reference-screenshot.png');
  const recognition = screenshot(config.recognition, 'source/mastergo/component-recognition-screenshot.png');
  requireValue(recognition.scale === 1 && reference.width === recognition.width * reference.scale && reference.height === recognition.height * reference.scale, 'Screenshots must show the same target at their declared scales');
  const assets = (config.assets ?? []).map((entry) => {
    requireValue(EXTENSIONS.has(extname(entry.path).toLowerCase()), 'Unsupported asset extension');
    return prepare(entry.path, `source/mastergo/design/${entry.path}`, { reference: entry.reference ?? entry.path });
  });
  const references = [...new Set([
    ...(config.requiredAssetReferences ?? []),
    ...(['dsl', 'nodes'].includes(config.format) ? [] : resourceReferences(readFileSync(inside(exportRoot, config.sourceFile), 'utf8'))),
    ...assets.filter((entry) => entry.path.endsWith('.css')).flatMap((entry) => resourceReferences(pending.find((item) => item.path === join(runDir, entry.path)).bytes.toString('utf8'))),
  ])];
  const missing = references.filter((ref) => !assets.some((entry) => entry.reference === ref));
  requireValue(missing.length === 0, `Missing design assets: ${missing.join(', ')}`);
  const files = [source, reference, recognition, ...assets, ...responses];
  requireValue(new Set(files.map((entry) => entry.path)).size === files.length, 'Duplicate imported evidence paths');
  requireValue(files.reduce((sum, entry) => sum + entry.size, 0) <= MAX_TOTAL, 'Design evidence exceeds 100 MiB');
  const contract = {
    schemaVersion: 1, designSource: 'mastergo', mode: config.mode,
    identity: config.identity, source, reference, recognition, assets, responses,
    requiredAssetReferences: references, files,
  };
  // All validation finishes before publishing any imported evidence.
  for (const entry of pending) {
    requireValue(!existsSync(entry.path) || readBounded(entry.path).equals(entry.bytes), 'Imported evidence changed within this run; use a new run');
  }
  const contractPath = inside(runDir, MASTERGO_CONTRACT);
  const contractBytes = JSON.stringify(contract, null, 2) + '\n';
  requireValue(!existsSync(contractPath) || readFileSync(contractPath, 'utf8') === contractBytes, 'Source contract changed within this run; use a new run');
  for (const entry of pending) atomic(entry.path, entry.bytes);
  atomic(contractPath, contractBytes);
  return contract;
}

export function collectMasterGoInputIssues(runDir) {
  const issues = [];
  try {
    const contract = json(inside(runDir, MASTERGO_CONTRACT));
    requireValue(contract.schemaVersion === 1 && contract.designSource === 'mastergo' && ['vibe', 'magic', 'community'].includes(contract.mode), 'Invalid MasterGo input contract');
    requireValue(typeof contract.identity?.documentId === 'string' && contract.identity.documentId.length > 0 && typeof contract.identity?.nodeId === 'string' && contract.identity.nodeId.length > 0, 'Missing locked MasterGo identity');
    requireValue(['html', 'jsx', 'dsl', 'nodes'].includes(contract.source?.format), 'Invalid design format');
    requireValue(contract.mode === 'community' ? contract.source.format === 'nodes' : contract.source.format !== 'nodes', 'Community node data must use its own nodes format');
    requireValue(Array.isArray(contract.files) && contract.files.length >= 4 && contract.files.length <= 2000, 'Missing or excessive evidence files');
    requireValue(new Set(contract.files.map((file) => file.path)).size === contract.files.length, 'Duplicate evidence paths');
    requireValue(contract.files.reduce((sum, file) => sum + file.size, 0) <= MAX_TOTAL, 'Design evidence exceeds 100 MiB');
    const expected = [contract.source, contract.reference, contract.recognition, ...contract.assets, ...contract.responses];
    requireValue(JSON.stringify(expected.map((file) => [file.path, file.sha256, file.size])) === JSON.stringify(contract.files.map((file) => [file.path, file.sha256, file.size])), 'Evidence file inventory differs from the contract');
    for (const file of contract.files) {
      requireValue(file.path.startsWith('source/mastergo/'), 'MasterGo evidence must stay in its source directory');
      const bytes = readBounded(inside(runDir, file.path));
      requireValue(/^[a-f0-9]{64}$/.test(file.sha256) && hash(bytes) === file.sha256 && bytes.length === file.size, `MasterGo input changed: ${file.path}`);
    }
    for (const entry of [contract.reference, contract.recognition]) {
      const size = png(readBounded(inside(runDir, entry.path)));
      requireValue(size.width === entry.width && size.height === entry.height, 'Screenshot dimensions differ from the contract');
    }
    requireValue(contract.reference.path === 'source/mastergo/reference-screenshot.png' && contract.recognition.path === 'source/mastergo/component-recognition-screenshot.png', 'Unexpected screenshot paths');
    requireValue([1, 2].includes(contract.reference.scale) && contract.recognition.scale === 1 && contract.reference.width === contract.recognition.width * contract.reference.scale && contract.reference.height === contract.recognition.height * contract.reference.scale, 'Invalid screenshot scale mapping');
    requireValue(contract.responses.every((entry) => READ_TOOLS.has(toolName(entry.tool))), 'Unexpected MCP tool in the contract');
    const names = contract.responses.map((entry) => toolName(entry.tool));
    requireValue(contract.mode === 'community' || (contract.mode === 'vibe'
      ? names.some((name) => ['get_frontend_code', 'get_selection_node', 'get_selection_code'].includes(name))
      : names.some((name) => ['getDsl', 'getDesignSections', 'getD2c'].includes(name))), 'Missing official source acquisition response');
    if (contract.mode === 'community') validateCommunityAcquisition(contract.responses, (entry) => json(inside(runDir, entry.path)), contract.identity);
    for (const response of contract.responses) {
      const body = json(inside(runDir, response.path));
      requireValue(body && body.isError !== true && Array.isArray(body.content) && body.content.length > 0, 'MCP evidence reports an error');
      requireValue(contract.mode === 'community' || toolName(response.tool) !== 'mastergo_api_call', 'Community evidence must retain its own mode');
    }
    requireValue(contract.requiredAssetReferences.every((ref) => contract.assets.some((asset) => asset.reference === ref)), 'Incomplete resource inventory');
    const manifest = json(join(runDir, 'inputs-manifest.json'));
    requireValue(manifest.designSource === 'mastergo' && Array.isArray(manifest.missingInputs) && manifest.missingInputs.length === 0, 'MasterGo inputs are incomplete');
    requireValue(manifest.mastergoContractSha256 === hash(readBounded(inside(runDir, MASTERGO_CONTRACT))), 'inputs-manifest must lock the MasterGo contract hash');
    requireValue(json(join(runDir, 'input-security-report.json')).pass === true, 'Input security review has not passed');
  } catch (error) {
    issues.push(error.message);
  }
  return issues;
}

export function collectMasterGoStage2Issues(runDir, { proposal = false, variant } = {}) {
  const issues = collectMasterGoInputIssues(runDir);
  try {
    const run = json(join(runDir, MASTERGO_RUN_STATE));
    requireValue(typeof run.invocationId === 'string' && run.invocationId.length > 0 && run.capability === 'hmos-d2a-mastergo-to-arkui', 'Missing MasterGo conversion invocation');
    requireValue(run.confirmationPolicy === (variant === 'full' ? 'manual' : 'auto-accept'), 'Incorrect confirmation policy');
    requireValue(run.phase === (proposal ? 'awaiting_confirmation' : 'completed'), 'MasterGo conversion checkpoint is not ready');
    requireValue(run.inputs?.contract === hash(readBounded(inside(runDir, MASTERGO_CONTRACT))), 'Conversion input hash changed');
    for (const [, file] of MASTERGO_CONFIRMATION_FILES) {
      const bytes = readBounded(inside(runDir, file));
      requireValue(bytes.toString('utf8').trim().length > 0, `${file} contains only whitespace`);
    }
    readBounded(inside(runDir, 'stage2/project-analysis.md'));
    const raw = json(join(runDir, 'capability-invocation-ledger.json'));
    const ledger = Array.isArray(raw) ? raw : raw.invocations;
    requireValue(Array.isArray(ledger) && ledger.some((entry) => entry.capability === 'hmos-d2a-solution-design' && entry.status === 'completed' && entry.invocationId === run.invocationId), 'Missing completed solution-design invocation for the current conversion');
    if (!proposal) requireValue(ledger.some((entry) => entry.capability === 'hmos-d2a-mastergo-to-arkui' && entry.status === 'completed' && entry.invocationId === run.invocationId), 'Missing completed MasterGo conversion invocation');
    const reuse = json(join(runDir, 'stage2/component-reuse-plan.json'));
    requireValue(Array.isArray(reuse.components) && reuse.components.every((entry) => typeof entry.designNode === 'string' && ['reuse', 'new'].includes(entry.action) && typeof entry.reason === 'string' && entry.reason.length > 0 && (entry.action !== 'reuse' || typeof entry.codeFile === 'string' && typeof entry.symbol === 'string')), 'Component reuse decisions are incomplete');
    const contract = json(join(runDir, MASTERGO_CONTRACT));
    const selection = json(join(runDir, 'stage2/asset-selection.json'));
    requireValue(new Set(selection.assets?.map((entry) => entry.source)).size === selection.assets?.length && selection.assets.every((entry) => contract.assets.some((asset) => asset.path === entry.source && asset.sha256 === entry.sha256)), 'Resource selection contains duplicate or unknown assets');
    requireValue(Array.isArray(selection.assets) && contract.assets.every((asset) => selection.assets.some((item) => item.source === asset.path && item.sha256 === asset.sha256 && ['use', 'unused'].includes(item.action) && (item.action !== 'unused' || typeof item.reason === 'string' && item.reason.length > 0))), 'Every source resource needs an explicit selection decision');
    const manifest = json(join(runDir, 'inputs-manifest.json'));
    const project = realpathSync(resolve(runDir, manifest.integrationSnapshot.projectRootPath));
    for (const entry of reuse.components.filter((entry) => entry.action === 'reuse')) {
      requireValue(readBounded(inside(project, entry.codeFile)).toString('utf8').includes(entry.symbol), 'Reusable component does not exist in the locked project');
    }
    if (!proposal) {
      const bindings = json(join(runDir, 'stage2/asset-bindings.json'));
      requireValue(Array.isArray(bindings.assets), 'Missing installed asset bindings');
      for (const selected of selection.assets.filter((entry) => entry.action === 'use')) {
        const binding = bindings.assets.find((entry) => entry.source === selected.source && entry.sha256 === selected.sha256);
        requireValue(binding && hash(readBounded(inside(project, binding.target))) === selected.sha256, 'Installed resource differs from selected original');
      }
    }
  } catch (error) {
    issues.push(error.message);
  }
  return issues;
}

export function collectMasterGoConfirmationIssues(runDir, snapshot) {
  try {
    const run = json(join(runDir, MASTERGO_RUN_STATE));
    requireValue(snapshot?.invocationId === run.invocationId && snapshot?.contractSha256 === run.inputs?.contract && snapshot.contractSha256 === hash(readBounded(inside(runDir, MASTERGO_CONTRACT))), 'MasterGo confirmation belongs to another invocation or input');
    return [];
  } catch (error) {
    return [error.message];
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    requireValue(process.argv.length === 4 && process.argv[2] === '--config', 'Usage: node mastergo-source.mjs --config <import-config.json>');
    const contract = importMasterGoSource(json(resolve(process.argv[3])));
    process.stdout.write(JSON.stringify({ status: 'imported', contractPath: MASTERGO_CONTRACT, contractSha256: hash(Buffer.from(JSON.stringify(contract, null, 2) + '\n')), identity: contract.identity, files: contract.files.length }) + '\n');
  } catch (error) {
    process.stderr.write(`mastergo-source: ${error.message}\n`);
    process.exitCode = 1;
  }
}

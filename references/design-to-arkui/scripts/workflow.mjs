#!/usr/bin/env node

import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, realpathSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MASTERGO_CONTRACT, MASTERGO_RUN_STATE, MASTERGO_CONFIRMATION_FILES, collectMasterGoInputIssues, collectMasterGoStage2Issues, collectMasterGoConfirmationIssues } from './mastergo-source.mjs';

// Run files may be written by the host shell (PowerShell 5.1 UTF-8 emits a
// BOM); JSON.parse throws on a leading U+FEFF, so strip it before parsing.
function readJsonFile(path) {
  const raw = readFileSync(path, 'utf8')
  return JSON.parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw)
}

const DESIGN_DOC_RECOVERY_REQUEST = 'design-doc-recovery-request.json';

const VALID_MODES = new Set(['init', 'status', 'stage-start', 'confirm', 'stage-complete', 'reacquire']);
const VALID_DECISIONS = new Set(['request', 'accepted', 'revision-requested']);
const VALID_RESULTS = new Set(['passed', 'blocked']);
const VALID_SOURCES = new Set(['pixso', 'figma', 'mastergo']);
const VALID_REASON_CODES = new Set([
  'build_failed',
  'dependency_unavailable',
  'invalid_input',
  'missing_asset',
  'security_blocked',
  'evidence_invalid',
  'external_tool_failed',
]);

function fail(message) {
  process.stderr.write(`workflow: ${message}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      fail(`unexpected argument: ${token}`);
    }
    const key = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      fail(`missing value for --${key}`);
    }
    result[key] = value;
    index += 1;
  }
  return result;
}

function readJson(path, label) {
  try {
    return readJsonFile(path);
  } catch (error) {
    fail(`${label} is missing or invalid JSON: ${path} (${error.message})`);
  }
}

function readJsonOrNull(path, label, issues) {
  if (!existsSync(path)) {
    issues.push(`${label} is missing: ${path}`);
    return null;
  }
  try {
    return readJsonFile(path);
  } catch (error) {
    issues.push(`${label} is invalid JSON: ${path} (${error.message})`);
    return null;
  }
}

function writeJsonAtomic(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = path + '.tmp';
  writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  renameSync(tmp, path);
}

function hashFile(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function gatePath(runDir, stage) {
  return join(runDir, 'stage-gates', `stage${String(stage).padStart(2, '0')}-gate.json`);
}

function readGate(runDir, stage) {
  const path = gatePath(runDir, stage);
  if (!existsSync(path)) {
    return null;
  }
  return readJson(path, `stage ${stage} gate`);
}

function isPassed(gate) {
  return gate?.status === 'passed';
}

function resolveEvidencePath(runDir, value, label, issues) {
  if (typeof value !== 'string' || value.length === 0) {
    issues.push(`${label} path is missing`);
    return null;
  }
  const path = resolve(runDir, value);
  const pathFromRunDir = relative(runDir, path);
  if (pathFromRunDir.startsWith('..') || isAbsolute(pathFromRunDir)) {
    issues.push(`${label} must stay inside the run directory`);
    return null;
  }
  return path;
}

function reportCheckPassed(report, name) {
  if (report?.checks && !Array.isArray(report.checks)) {
    return report.checks[name] === true;
  }
  if (Array.isArray(report?.checks)) {
    const check = report.checks.find((item) => item?.name === name);
    return check?.result === true || check?.result === 'pass' || check?.status === 'passed';
  }
  return false;
}

const FIGMA_COMPONENT_RECOGNITION_IMAGE = 'source/figma/component-recognition-screenshot.png';
const FIGMA_REFERENCE_SCREENSHOT = 'source/figma/reference-screenshot.png';

function collectComponentRecognitionEvidenceIssues(runDir, designSource = 'figma') {
  const expectedImage = FIGMA_COMPONENT_RECOGNITION_IMAGE.replace('figma', designSource);
  const referenceScreenshot = FIGMA_REFERENCE_SCREENSHOT.replace('figma', designSource);
  const issues = [];
  const artifactPath = join(runDir, 'stage2', 'component-vision-analysis.json');
  if (existsSync(artifactPath) && statSync(artifactPath).size > 2 * 1024 * 1024) {
    issues.push(`stage 2 component recognition artifact exceeds the 2 MB limit: ${artifactPath}`);
    return issues;
  }
  const artifact = readJsonOrNull(
    artifactPath,
    'stage 2 component recognition artifact',
    issues
  );
  if (!artifact) {
    return issues;
  }

  if (artifact.schemaVersion !== 1 && artifact.schemaVersion !== 2) {
    issues.push('stage 2 component recognition artifact schemaVersion must equal 1 or 2');
  }
  if (
    artifact.producer?.tool !== 'recognize_ui_components' ||
    typeof artifact.producer?.model !== 'string' ||
    artifact.producer.model.length === 0 ||
    typeof artifact.producer?.invocationId !== 'string' ||
    artifact.producer.invocationId.length === 0 ||
    typeof artifact.producer?.createdAt !== 'string' ||
    !Number.isFinite(Date.parse(artifact.producer.createdAt))
  ) {
    issues.push('stage 2 component recognition artifact producer metadata is invalid');
  }

  if (artifact.schemaVersion === 2 && artifact.status !== 'ok' && artifact.status !== 'degraded') {
    issues.push('stage 2 component recognition artifact status must be ok or degraded for schemaVersion 2');
  }

  if (artifact.inputs?.source !== undefined) {
    issues.push('stage 2 component recognition must not include source input');
  }

  const image = artifact.inputs?.image;
  const normalizedPath = typeof image?.path === 'string' ? image.path.replaceAll('\\', '/') : '';
  if (
    normalizedPath.length === 0 ||
    isAbsolute(normalizedPath) ||
    normalizedPath.split('/').includes('..') ||
    !normalizedPath.endsWith(expectedImage)
  ) {
    if (normalizedPath.endsWith(referenceScreenshot)) {
      issues.push(
        `stage 2 component recognition image must not use the 2x ${referenceScreenshot}`
      );
    } else {
      issues.push('stage 2 component recognition image path is invalid');
    }
  }
  if (typeof image?.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(image.sha256)) {
    issues.push('stage 2 component recognition image sha256 is invalid');
  } else {
    const expectedPath = join(runDir, ...expectedImage.split('/'));
    if (!existsSync(expectedPath) || !statSync(expectedPath).isFile()) {
      issues.push(`stage 2 component recognition image input is missing: ${expectedPath}`);
    } else if (hashFile(expectedPath) !== image.sha256) {
      issues.push('stage 2 component recognition image sha256 does not match the current input');
    }
  }

  const requirements = artifact.inputs?.requirements;
  if (
    typeof requirements?.text !== 'string' ||
    requirements.text.length > 8000 ||
    typeof requirements?.sha256 !== 'string' ||
    sha256Text(requirements?.text ?? '') !== requirements?.sha256
  ) {
    issues.push('stage 2 component recognition requirements evidence is invalid');
  }

  const analysisError = validateComponentRecognitionAnalysis(artifact);
  if (analysisError) {
    issues.push(analysisError);
  }
  return issues;
}

function validateComponentRecognitionAnalysis(artifact) {
  if (artifact.schemaVersion === 1) {
    return isValidLegacyComponentRecognitionAnalysis(artifact.analysis)
      ? null
      : 'stage 2 component recognition analysis does not match the required schema';
  }
  if (artifact.schemaVersion === 2 && artifact.status === 'ok') {
    return isValidComponentRecognitionInventory(artifact.analysis)
      ? null
      : 'stage 2 component recognition analysis does not match the required schema';
  }
  if (artifact.schemaVersion === 2 && artifact.status === 'degraded') {
    return isValidComponentRecognitionDegraded(artifact)
      ? null
      : 'stage 2 component recognition degraded evidence does not match the required schema';
  }
  return 'stage 2 component recognition artifact schemaVersion or status is not supported';
}

function collectFigmaStage1EvidenceIssues(runDir, catalog, ctx = {}) {
  const issues = [];
  const manifest = readJsonOrNull(
    join(runDir, 'inputs-manifest.json'),
    'stage 1 inputs manifest',
    issues
  );
  if (!manifest) {
    return issues;
  }

  const screenshots = manifest.screenshots;
  if (!screenshots || typeof screenshots !== 'object') {
    issues.push('stage 1 inputs manifest must record screenshots for the figma source');
    return issues;
  }

  for (const [name, expectedPath, expectedPurpose, expectedScale] of [
    ['reference', FIGMA_REFERENCE_SCREENSHOT, 'general-visual-reference', 2],
    ['componentRecognition', FIGMA_COMPONENT_RECOGNITION_IMAGE, 'recognize-ui-components-only', 1]
  ]) {
    const entry = screenshots[name];
    const normalizedPath =
      typeof entry?.path === 'string' ? entry.path.replaceAll('\\', '/') : '';
    if (
      normalizedPath.length === 0 ||
      isAbsolute(normalizedPath) ||
      normalizedPath.split('/').includes('..') ||
      normalizedPath !== expectedPath
    ) {
      issues.push(`stage 1 screenshot ${name} path must be ${expectedPath}`);
    }
    if (entry?.purpose !== expectedPurpose) {
      issues.push(`stage 1 screenshot ${name} purpose must be ${expectedPurpose}`);
    }
    if (entry?.scale !== expectedScale) {
      issues.push(`stage 1 screenshot ${name} scale must be ${expectedScale}`);
    }
    if (
      !isPositiveBoundedNumber(entry?.width, 100000) ||
      !isPositiveBoundedNumber(entry?.height, 100000) ||
      typeof entry?.size !== 'number' ||
      !Number.isFinite(entry.size) ||
      entry.size <= 0
    ) {
      issues.push(`stage 1 screenshot ${name} dimensions and size must be positive numbers`);
    }
    if (typeof entry?.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(entry.sha256)) {
      issues.push(`stage 1 screenshot ${name} sha256 is invalid`);
      continue;
    }
    const filePath = join(runDir, ...expectedPath.split('/'));
    if (!existsSync(filePath) || !statSync(filePath).isFile()) {
      issues.push(`stage 1 screenshot ${name} file is missing: ${expectedPath}`);
    } else if (hashFile(filePath) !== entry.sha256) {
      issues.push(`stage 1 screenshot ${name} sha256 does not match the current file`);
    }
  }

  const reference = screenshots.reference;
  const componentRecognition = screenshots.componentRecognition;
  if (
    isPositiveBoundedNumber(reference?.width, 100000) &&
    isPositiveBoundedNumber(reference?.height, 100000) &&
    isPositiveBoundedNumber(componentRecognition?.width, 100000) &&
    isPositiveBoundedNumber(componentRecognition?.height, 100000)
  ) {
    if (
      reference.width !== componentRecognition.width * 2 ||
      reference.height !== componentRecognition.height * 2
    ) {
      issues.push(
        'stage 1 screenshots must render the same target node: the 2x reference dimensions must be exactly twice the 1x component recognition dimensions'
      );
    }
  }
  issues.push(...collectPageStage1IntegrationIssues(runDir, catalog, manifest, ctx));
  return issues;
}

const PAGE_REQUIRED_SNAPSHOT_FIELDS = [
  'projectRootPath',
  'runIndexFile',
  'existingGeneratedPages',
  'existingGeneratedRoutes',
  'startupPageBefore',
  'defaultPageBefore',
  'indexPageFile',
  'entryAbilityFile',
  'mainPagesFile',
  'registrationMode',
];

function collectPageStage1IntegrationIssues(runDir, catalog, manifest, ctx = {}) {
  const issues = [];
  const snapshot = manifest.integrationSnapshot;
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    issues.push('stage 1 integrationSnapshot is missing');
    return issues;
  }
  for (const field of PAGE_REQUIRED_SNAPSHOT_FIELDS) {
    if (snapshot[field] === undefined || snapshot[field] === null) {
      issues.push(`stage 1 integrationSnapshot.${field} is missing`);
    }
  }
  if (typeof snapshot.existingGeneratedPages !== 'object' || !Array.isArray(snapshot.existingGeneratedPages)) {
    issues.push('stage 1 integrationSnapshot.existingGeneratedPages must be an array');
  }
  if (typeof snapshot.existingGeneratedRoutes !== 'object' || !Array.isArray(snapshot.existingGeneratedRoutes)) {
    issues.push('stage 1 integrationSnapshot.existingGeneratedRoutes must be an array');
  }
  if (!PAGE_VALID_REGISTRATION_MODES.has(snapshot.registrationMode)) {
    issues.push('stage 1 integrationSnapshot.registrationMode must be index-navigation, route-table or existing-router');
  }
  // The global run-index is variant-scoped and shared between Figma and Pixso;
  // a mismatched path would silently split or cross-read the wrong index.
  const expectedRunIndexFile = catalog.variant === 'fast'
    ? '.deveco/design-to-arkts-fast/run-index.json'
    : '.deveco/design-to-arkts/run-index.json';
  if (snapshot.runIndexFile !== expectedRunIndexFile) {
    issues.push(
      `stage 1 integrationSnapshot.runIndexFile must match the ${catalog.variant} workflow index path: ${expectedRunIndexFile}`
    );
  }

  const projectRoot = resolveLockedProjectRoot(
    runDir,
    snapshot.projectRootPath,
    'stage 1 integrationSnapshot.projectRootPath',
    issues
  );
  if (!projectRoot) {
    return issues;
  }
  if (!isArkUIProject(projectRoot)) {
    issues.push(`stage 1 integrationSnapshot.projectRootPath is not an ArkUI project (missing AppScope/app.json5 or entry/src/main/module.json5): ${snapshot.projectRootPath}`);
  }

  const appFiles = [
    ['integrationSnapshot.indexPageFile', snapshot.indexPageFile, 'Index'],
    ['integrationSnapshot.entryAbilityFile', snapshot.entryAbilityFile, 'EntryAbility'],
    ['integrationSnapshot.mainPagesFile', snapshot.mainPagesFile, 'main_pages'],
  ];
  for (const [label, rel, humanLabel] of appFiles) {
    const path = resolveProjectFile(projectRoot, rel, `stage 1 ${label}`, issues);
    if (path && (!existsSync(path) || !statSync(path).isFile())) {
      issues.push(`stage 1 ${humanLabel} file does not exist within projectRoot: ${rel}`);
    }
  }

  const entryFile = readProjectFile(projectRoot, snapshot.entryAbilityFile, 'stage 1 integrationSnapshot.entryAbilityFile', issues);
  const startupBefore = typeof snapshot.startupPageBefore === 'string' ? snapshot.startupPageBefore : 'pages/Index';
  if (ctx.live && entryFile.content !== null) {
    const loaded = findLoadContentPage(entryFile.content);
    if (loaded === null) {
      issues.push('stage 1 EntryAbility must load the startup page through a loadContent string literal argument; the loaded page could not be determined');
    } else if (loaded !== startupBefore) {
      issues.push(`stage 1 EntryAbility actually loads "${loaded}", but integrationSnapshot.startupPageBefore is "${startupBefore}"`);
    }
  }

  const mainPagesFile = readProjectFile(projectRoot, snapshot.mainPagesFile, 'stage 1 integrationSnapshot.mainPagesFile', issues);
  if (ctx.live && mainPagesFile.content !== null) {
    const src = parseMainPagesSrc(mainPagesFile.content);
    if (src === null) {
      issues.push('stage 1 main_pages.json is not valid JSON');
    } else if (!src.includes(startupBefore)) {
      issues.push(`stage 1 main_pages.json must contain ${startupBefore}`);
    }
  }

  const declaredPages = Array.isArray(snapshot.existingGeneratedPages) ? snapshot.existingGeneratedPages : [];
  const declaredRoutes = Array.isArray(snapshot.existingGeneratedRoutes) ? snapshot.existingGeneratedRoutes : [];
  const { pages } = readRunIndexPages(projectRoot, snapshot.runIndexFile, issues);
  // The snapshot describes the project state before this run started. Records
  // legitimately added by the current run (stage 2 completion) are excluded from
  // the comparison, but only after identity validation against the stage 2
  // policy; anything else that differs from the snapshot is an error.
  const stage2 = ctx.stage2 ?? null;
  const declaredPageSet = new Set(declaredPages.map((page) => String(page)));
  const isCurrentRunRecord = (page) =>
    !!page && typeof page === 'object' &&
    page.designSource === (catalog.designSource ?? 'figma') && page.runId === stage2?.runId;
  if (stage2 && stage2.scenario !== 'pre-commit' && stage2.identity) {
    const comparablePages = pages.filter((page) => {
      if (!isCurrentRunRecord(page)) return true;
      // A record already covered by the snapshot is historical (runId collision),
      // never a newly added current-run record.
      if (declaredPageSet.has(String(page.pageFile ?? ''))) return true;
      return !matchesStage2Identity(page, stage2.identity);
    });
    collectStage1PageComparisonIssues(projectRoot, comparablePages, declaredPages, declaredRoutes, issues);
  } else {
    if (stage2) {
      for (const page of pages) {
        if (isCurrentRunRecord(page) && !declaredPageSet.has(String(page.pageFile ?? ''))) {
          issues.push(stage2.scenario === 'pre-commit'
            ? 'run-index contains a record for the current run before stage 2 completion; the controller writes it during stage-complete 2'
            : 'run-index contains a current-run record but the stage 2 target identity is unavailable; restore stage2/startup-page-policy.json');
        }
      }
    }
    collectStage1PageComparisonIssues(projectRoot, pages, declaredPages, declaredRoutes, issues);
  }
  return issues;
}

function collectStage1PageComparisonIssues(projectRoot, pages, declaredPages, declaredRoutes, issues) {
  const actualPages = pages.map((page) => page?.pageFile);
  const actualRoutes = pages.map((page) => page?.route);
  if (sortedStringify(declaredPages) !== sortedStringify(actualPages)) {
    issues.push('stage 1 integrationSnapshot.existingGeneratedPages does not match the real run-index');
  }
  if (sortedStringify(declaredRoutes) !== sortedStringify(actualRoutes)) {
    issues.push('stage 1 integrationSnapshot.existingGeneratedRoutes does not match the real run-index');
  }

  for (const pageFile of actualPages) {
    const path = resolveProjectFile(projectRoot, pageFile, 'stage 1 run-index historical page file', issues);
    if (path && (!existsSync(path) || !statSync(path).isFile())) {
      issues.push(`stage 1 historical generated page no longer exists: ${pageFile}`);
    }
  }
}

function sortedStringify(values) {
  return JSON.stringify([...(values ?? [])].map((value) => String(value)).sort());
}

function sha256Text(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

const PAGE_STAGE2_STARTUP_POLICY = 'stage2/startup-page-policy.json';
const PAGE_STAGE2_GENERATED_MANIFEST = 'stage2/generated-ui-manifest.json';
const PAGE_STAGE2_INITIAL_BUILD_REPORT = 'stage2/initial-build-report.json';
const PAGE_VALID_REGISTRATION_MODES = new Set(['index-navigation', 'route-table', 'existing-router']);

function resolveLockedProjectRoot(runDir, value, label, issues) {
  if (typeof value !== 'string' || value.length === 0) {
    issues.push(`${label} is missing`);
    return null;
  }
  const root = isAbsolute(value) ? resolve(value) : resolve(runDir, value);
  if (!existsSync(root) || !statSync(root).isDirectory()) {
    issues.push(`${label} is not an existing directory: ${value}`);
    return null;
  }
  return root;
}

function isArkUIProject(projectRoot) {
  return (
    existsSync(join(projectRoot, 'AppScope', 'app.json5')) ||
    existsSync(join(projectRoot, 'entry', 'src', 'main', 'module.json5'))
  );
}

function stripArkTsComments(content) {
  let result = '';
  let index = 0;
  const length = content.length;
  while (index < length) {
    const ch = content[index];
    const next = content[index + 1];
    if (ch === "'" || ch === '"' || ch === '`') {
      const quote = ch;
      result += ch;
      index += 1;
      while (index < length) {
        if (content[index] === '\\') {
          result += content[index] + (content[index + 1] ?? '');
          index += 2;
          continue;
        }
        result += content[index];
        if (content[index] === quote) {
          index += 1;
          break;
        }
        index += 1;
      }
    } else if (ch === '/' && next === '/') {
      while (index < length && content[index] !== '\n') index += 1;
    } else if (ch === '/' && next === '*') {
      index += 2;
      while (index < length && !(content[index] === '*' && content[index + 1] === '/')) index += 1;
      index += 2;
    } else {
      result += ch;
      index += 1;
    }
  }
  return result;
}

function hasArkTsDecorator(content, decorator) {
  return new RegExp(`^\\s*@${decorator}\\b`, 'm').test(stripArkTsComments(content));
}

function isArkTsIdentifier(value) {
  return typeof value === 'string' && /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(value);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasDecoratedExportStruct(content, decorator, componentName) {
  const stripped = stripArkTsComments(content);
  const componentPattern = escapeRegExp(componentName);
  const decl = new RegExp(`(^|[^\\w$])export\\s+struct\\s+${componentPattern}\\b`, 'm');
  const match = decl.exec(stripped);
  if (!match) return false;
  const declIndex = match.index + match[1].length;
  const after = stripped.slice(declIndex + `export struct ${componentName}`.length);
  if (!/^\s*\{/.test(after)) return false;
  // Walk backwards from the declaration over whitespace and other legal decorators.
  // The target decorator must directly precede the export, possibly with other
  // decorators, whitespace, or decorator argument lists in between.
  let end = declIndex;
  while (end > 0) {
    // Skip trailing whitespace before the declaration
    let start = end;
    while (start > 0 && /\s/.test(stripped[start - 1])) start -= 1;
    if (start === 0) return false;
    // Expect a decorator (optionally with a balanced argument list) ending at `start`
    const before = stripped.slice(0, start);
    const decoratorMatch = /@[\w$]+(\s*\([^()]*\))?[\s]*$/.exec(before);
    if (!decoratorMatch) return false;
    const decoratorStart = start - decoratorMatch[0].length;
    const nameOnly = /^@[\w$]+/.exec(decoratorMatch[0]);
    if (nameOnly && nameOnly[0] === `@${decorator}`) return true;
    end = decoratorStart;
  }
  return false;
}

function isComponentInstantiated(content, componentName) {
  const stripped = stripArkTsComments(content);
  return new RegExp(`(^|[^\\w$])${escapeRegExp(componentName)}\\s*\\(`).test(stripped);
}

function routeAndComponentRegisteredTogether(content, route, component) {
  const stripped = stripArkTsComments(content);
  const routePattern = escapeRegExp(route);
  const componentPattern = escapeRegExp(component);
  const pairPatterns = [
    new RegExp(`['"]${routePattern}['"]\\s*:\\s*${componentPattern}\\b`),
    new RegExp(`\\.set\\s*\\(\\s*['"]${routePattern}['"]\\s*,\\s*${componentPattern}\\b`),
    new RegExp(`['"]${routePattern}['"]\\s*,\\s*${componentPattern}\\s*[,)]`),
    new RegExp(`\\(\\s*\\{\\s*[^(){}]*['"]${routePattern}['"][^(){}]*${componentPattern}[^(){}]*\\}\\s*\\)`)
  ];
  return pairPatterns.some((pattern) => pattern.test(stripped));
}

const LOAD_CONTENT_CALL = 'loadContent';

// Extracts the page path when the first loadContent argument is a plain string
// literal followed by the argument separator or the closing parenthesis.
// Dynamic expressions, template literals, and string concatenations stay
// unresolved (null) instead of guessing a partial path.
function extractLoadContentFirstArgument(stripped, openParenIndex) {
  let index = openParenIndex;
  while (index < stripped.length && /\s/.test(stripped[index])) index += 1;
  const quote = stripped[index];
  if (quote !== "'" && quote !== '"') {
    return null;
  }
  index += 1;
  let value = '';
  while (index < stripped.length) {
    const ch = stripped[index];
    if (ch === '\\') {
      const escaped = stripped[index + 1];
      if (escaped === undefined) {
        return null;
      }
      value += escaped;
      index += 2;
      continue;
    }
    if (ch === quote) {
      index += 1;
      break;
    }
    value += ch;
    index += 1;
    if (value.length > 4096) {
      return null;
    }
  }
  if (index > stripped.length || stripped[index - 1] !== quote) {
    return null;
  }
  let after = index;
  while (after < stripped.length && /\s/.test(stripped[after])) after += 1;
  if (after >= stripped.length || (stripped[after] !== ')' && stripped[after] !== ',')) {
    return null;
  }
  return value;
}

// Scans comment-stripped source outside string literals so that example text
// inside comments or ordinary strings is never treated as a real call.
function findLoadContentPage(content) {
  const stripped = stripArkTsComments(content);
  const length = stripped.length;
  let index = 0;
  while (index < length) {
    const ch = stripped[index];
    if (ch === "'" || ch === '"' || ch === '`') {
      const quote = ch;
      index += 1;
      while (index < length) {
        if (stripped[index] === '\\') {
          index += 2;
          continue;
        }
        if (stripped[index] === quote) {
          index += 1;
          break;
        }
        index += 1;
      }
      continue;
    }
    if (
      ch === 'l' &&
      stripped.startsWith(LOAD_CONTENT_CALL, index) &&
      (index === 0 || !/[A-Za-z0-9_$]/.test(stripped[index - 1]))
    ) {
      let parenIndex = index + LOAD_CONTENT_CALL.length;
      while (parenIndex < length && /\s/.test(stripped[parenIndex])) parenIndex += 1;
      if (parenIndex < length && stripped[parenIndex] === '(') {
        return extractLoadContentFirstArgument(stripped, parenIndex + 1);
      }
      index += LOAD_CONTENT_CALL.length;
      continue;
    }
    index += 1;
  }
  return null;
}

function parseMainPagesSrc(content) {
  try {
    const parsed = JSON.parse(stripArkTsComments(content));
    const src = parsed?.src;
    return Array.isArray(src) ? src : null;
  } catch {
    return null;
  }
}

function readRunIndexPages(projectRoot, runIndexFileRel, issues) {
  if (typeof runIndexFileRel !== 'string' || runIndexFileRel.length === 0) {
    issues.push('run-index path is missing');
    return { path: null, pages: [], exists: false };
  }
  const indexPath = resolve(projectRoot, runIndexFileRel);
  const relFromRoot = relative(projectRoot, indexPath);
  if (relFromRoot.startsWith('..') || isAbsolute(relFromRoot)) {
    issues.push(`run-index path must stay within the project root: ${runIndexFileRel}`);
    return { path: null, pages: [], exists: false };
  }
  if (!existsSync(indexPath)) {
    return { path: indexPath, pages: [], exists: false };
  }
  if (!statSync(indexPath).isFile()) {
    issues.push(`run-index is not a file: ${runIndexFileRel}`);
    return { path: indexPath, pages: [], exists: false };
  }
  let parsed;
  try {
    parsed = readJsonFile(indexPath);
  } catch (error) {
    issues.push(`run-index is invalid JSON: ${runIndexFileRel} (${error.message})`);
    return { path: indexPath, pages: [], exists: false };
  }
  if (!Array.isArray(parsed?.pages)) {
    issues.push(`run-index pages must be an array: ${runIndexFileRel}`);
    return { path: indexPath, pages: [], exists: false };
  }
  return { path: indexPath, pages: parsed.pages, exists: true };
}

function targetRegistrationFileOf(policy) {
  if (typeof policy.targetRegistrationFile === 'string' && policy.targetRegistrationFile.length > 0) {
    return policy.targetRegistrationFile;
  }
  if (policy.targetRegistrationMode === 'index-navigation') {
    return policy.indexPageFile;
  }
  return undefined;
}

function resolveProjectFile(projectRoot, rel, label, issues) {
  if (typeof rel !== 'string' || rel.length === 0) {
    issues.push(`${label} is missing`);
    return null;
  }
  const path = resolve(projectRoot, rel);
  const relFromRoot = relative(projectRoot, path);
  if (relFromRoot.startsWith('..') || isAbsolute(relFromRoot)) {
    issues.push(`${label} must stay within the project root: ${rel}`);
    return null;
  }
  return path;
}

function readProjectFile(projectRoot, rel, label, issues) {
  const path = resolveProjectFile(projectRoot, rel, label, issues);
  if (!path) {
    return { path: null, content: null };
  }
  if (!existsSync(path) || !statSync(path).isFile()) {
    issues.push(`${label} is missing: ${rel}`);
    return { path, content: null };
  }
  return { path, content: readFileSync(path, 'utf8') };
}

// Stage 2 run-index validation scenarios, derived from persisted state and the
// stage 2 gate — never from caller-provided stage numbers or file timestamps.
//   pre-commit: stage 2 not completed and no valid passed gate; the current-run
//               record must not exist yet (the controller writes it).
//   recovery:   gate written (and for Full, confirmation accepted) but state not
//               advanced; the interrupted stage-complete 2 may be replayed, so
//               0 or 1 identity-validated current records are allowed.
//   completed:  stage 2 in completedStages; exactly 1 current record is required
//               and later stages may legitimately edit the page content, so the
//               registered content hash is not re-compared.
function derivePageStage2IndexContext(runDir, catalog, state) {
  if (!['figma', 'mastergo'].includes(catalog.designSource)) {
    return null;
  }
  const runId = basename(runDir);
  if (state.completedStages.includes(2)) {
    return { scenario: 'completed', designSource: catalog.designSource, runId, identity: readStage2TargetIdentity(runDir) };
  }
  const gate = readGateOrNull(runDir, 2);
  const stage2Confirmed = !requiresPageStage2Confirmation(catalog, 2) ||
    (Array.isArray(state.confirmedStages) && state.confirmedStages.includes(2));
  if (
    Number(gate?.stage) === 2 &&
    gate?.status === 'passed' &&
    state.currentStage === 2 &&
    state.status === 'running' &&
    stage2Confirmed
  ) {
    return { scenario: 'recovery', designSource: catalog.designSource, runId, identity: readStage2TargetIdentity(runDir) };
  }
  return { scenario: 'pre-commit', designSource: catalog.designSource, runId, identity: null };
}

function readGateOrNull(runDir, stage) {
  const path = gatePath(runDir, stage);
  if (!existsSync(path)) {
    return null;
  }
  try {
    return readJsonFile(path);
  } catch {
    return null;
  }
}

function readStage2TargetIdentity(runDir) {
  const policyPath = join(runDir, PAGE_STAGE2_STARTUP_POLICY);
  if (!existsSync(policyPath) || !statSync(policyPath).isFile()) {
    return null;
  }
  let policy;
  try {
    policy = readJsonFile(policyPath);
  } catch {
    return null;
  }
  const pageFile = typeof policy.targetPageFile === 'string' && policy.targetPageFile.length > 0
    ? policy.targetPageFile.replaceAll('\\', '/')
    : null;
  const componentName = isArkTsIdentifier(policy.targetComponentName)
    ? policy.targetComponentName
    : null;
  const route = typeof policy.targetRoute === 'string' && policy.targetRoute.length > 0
    ? policy.targetRoute
    : null;
  if (!pageFile || !componentName || !route) {
    return null;
  }
  return { pageFile, componentName, route };
}

function matchesStage2Identity(record, identity) {
  return !!identity &&
    String(record.pageFile ?? '').replaceAll('\\', '/') === identity.pageFile &&
    record.componentName === identity.componentName &&
    record.route === identity.route;
}

function collectRunIndexIssues(runDir, projectRoot, policy, targetComponentName, targetRoute, indexContext) {
  const issues = [];
  const runId = basename(runDir);
  const { pages, exists } = readRunIndexPages(projectRoot, policy.runIndexFile, issues);
  const pageFile = policy.targetPageFile;
  const normalizedTargetPage = String(pageFile ?? '').replaceAll('\\', '/');
  const scenario = indexContext?.scenario ?? 'pre-commit';

  let contentSha256 = null;
  const targetPath = resolveProjectFile(projectRoot, pageFile, 'stage 2 target page file hash', issues);
  if (targetPath && existsSync(targetPath) && statSync(targetPath).isFile()) {
    contentSha256 = hashFile(targetPath);
  }

  if (scenario === 'completed' && !exists) {
    issues.push(`run-index is missing although stage 2 is completed: ${policy.runIndexFile}`);
  }

  const currentRecords = [];
  for (const existing of pages) {
    if (!existing || typeof existing !== 'object') {
      continue;
    }
    const existingPage = String(existing.pageFile ?? '').replaceAll('\\', '/');
    const existingPath = resolveProjectFile(projectRoot, existing.pageFile, 'run-index historical page file', issues);
    if (existingPath && (!existsSync(existingPath) || !statSync(existingPath).isFile())) {
      issues.push(`stage 2 historical generated page no longer exists: ${existing.pageFile}`);
    }
    if (typeof existing.registrationFile === 'string' && existing.registrationFile.length > 0) {
      const regPath = resolveProjectFile(projectRoot, existing.registrationFile, 'run-index historical registration file', issues);
      if (regPath && (!existsSync(regPath) || !statSync(regPath).isFile())) {
        issues.push(`stage 2 historical registration file no longer exists: ${existing.registrationFile}`);
      }
    }

    if (existing.designSource === (indexContext?.designSource ?? 'figma') && existing.runId === runId) {
      currentRecords.push(existing);
      continue;
    }

    if (existingPage.length > 0 && existingPage === normalizedTargetPage) {
      issues.push(`stage 2 target page file conflicts with an existing run: ${pageFile}`);
    }
    if (existing.componentName && existing.componentName === targetComponentName) {
      issues.push(`stage 2 target component name conflicts with an existing run: ${targetComponentName}`);
    }
    if (existing.route && existing.route === targetRoute) {
      issues.push(`stage 2 target route conflicts with an existing run: ${targetRoute}`);
    }
  }

  const declaredPageSet = new Set(
    (Array.isArray(indexContext?.declaredPages) ? indexContext.declaredPages : []).map((page) => String(page))
  );
  if (scenario === 'pre-commit') {
    for (const record of currentRecords) {
      if (declaredPageSet.has(String(record.pageFile ?? ''))) {
        issues.push(`stage 2 runId ${runId} collides with a historical run-index record; use a new runId`);
      } else {
        issues.push('stage 2 run-index record for the current run must not exist before stage 2 completion; the controller writes it during stage-complete 2');
      }
    }
    return issues;
  }

  const validCurrentRecords = [];
  for (const record of currentRecords) {
    if (declaredPageSet.has(String(record.pageFile ?? ''))) {
      issues.push(`stage 2 runId ${runId} collides with a historical run-index record; use a new runId`);
      continue;
    }
    if (!matchesStage2Identity(record, { pageFile: normalizedTargetPage, componentName: targetComponentName, route: targetRoute })) {
      issues.push('stage 2 same run with a different target identity or content must use a new runId');
      continue;
    }
    if (scenario === 'recovery' && record.contentSha256 !== contentSha256) {
      // Replay consistency: gate and index are written but state has not
      // advanced, so the submitted page content must still match the
      // registered hash.
      issues.push('stage 2 same run with a different target identity or content must use a new runId');
      continue;
    }
    validCurrentRecords.push(record);
  }
  if (scenario === 'completed' && validCurrentRecords.length !== 1) {
    issues.push('run-index must contain exactly one record for the current run after stage 2 completion');
  }
  if (scenario === 'recovery' && validCurrentRecords.length > 1) {
    issues.push('run-index must contain at most one record for the current run during stage 2 recovery');
  }
  return issues;
}

function collectPageRegistrationEvidenceIssues(runDir, ctx = {}) {
  const issues = [];
  const policy = readJsonOrNull(
    join(runDir, PAGE_STAGE2_STARTUP_POLICY),
    'stage 2 startup page policy',
    issues
  );
  if (!policy) {
    return issues;
  }

  if (policy.preserveIndexEntry !== true) {
    issues.push('stage 2 startup page policy must set preserveIndexEntry=true');
  }
  if (policy.indexRole !== 'stable-navigation-shell') {
    issues.push('stage 2 startup page policy must set indexRole=stable-navigation-shell');
  }
  if (policy.startupPageAfter !== 'pages/Index') {
    issues.push('stage 2 startup page policy must keep startupPageAfter=pages/Index');
  }
  if (policy.entryAbilityLoadContentAfter !== 'pages/Index') {
    issues.push('stage 2 startup page policy must keep entryAbilityLoadContentAfter=pages/Index');
  }
  if (typeof policy.changeDefaultPage !== 'boolean') {
    issues.push('stage 2 startup page policy changeDefaultPage must be a boolean');
  }
  if (typeof policy.targetRegistrationMode !== 'string' ||
    !PAGE_VALID_REGISTRATION_MODES.has(policy.targetRegistrationMode)) {
    issues.push('stage 2 startup page policy targetRegistrationMode must be one of index-navigation, route-table, existing-router');
  }
  for (const key of ['defaultPageBefore', 'defaultPageAfter']) {
    if (typeof policy[key] !== 'string') {
      issues.push(`stage 2 startup page policy ${key} must be a string`);
    }
  }
  if (typeof policy.projectType !== 'string' || !['template', 'business'].includes(policy.projectType)) {
    issues.push('stage 2 startup page policy projectType must be template or business');
  }
  if (typeof policy.userRequestedDefaultChange !== 'boolean') {
    issues.push('stage 2 startup page policy userRequestedDefaultChange must be a boolean');
  }
  const targetComponentName = policy.targetComponentName;
  if (typeof targetComponentName !== 'string' || targetComponentName.length === 0) {
    issues.push('stage 2 startup page policy targetComponentName is missing');
  }
  const validTargetComponentName = isArkTsIdentifier(targetComponentName);
  if (!validTargetComponentName) {
    issues.push('stage 2 startup page policy targetComponentName must be a valid ArkTS identifier');
  }
  const targetRoute = policy.targetRoute;
  if (typeof targetRoute !== 'string' || targetRoute.length === 0) {
    issues.push('stage 2 startup page policy targetRoute is missing');
  }

  const projectRoot = resolveLockedProjectRoot(runDir, policy.projectRootPath, 'stage 2 startup page policy projectRootPath', issues);
  if (!projectRoot) {
    return issues;
  }

  const inputsManifest = readJsonOrNull(
    join(runDir, 'inputs-manifest.json'),
    'stage 1 inputs manifest',
    issues
  );
  const snapshot = inputsManifest?.integrationSnapshot;
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    issues.push('stage 1 integrationSnapshot is missing; stage 2 cannot bind the target project');
    return issues;
  }
  const snapshotRoot = resolveLockedProjectRoot(runDir, snapshot.projectRootPath, 'stage 1 integrationSnapshot.projectRootPath', issues);
  if (!snapshotRoot) {
    return issues;
  }
  if (snapshotRoot !== projectRoot) {
    issues.push('stage 2 projectRootPath must equal stage 1 integrationSnapshot.projectRootPath');
  }
  for (const field of ['indexPageFile', 'entryAbilityFile', 'mainPagesFile', 'runIndexFile']) {
    if (String(policy[field] ?? '') !== String(snapshot[field] ?? '')) {
      issues.push(`stage 2 ${field} must equal stage 1 integrationSnapshot.${field}`);
    }
  }

  const indexFile = readProjectFile(projectRoot, policy.indexPageFile, 'stage 2 indexPageFile', issues);
  if (indexFile.content !== null && !hasArkTsDecorator(indexFile.content, 'Entry')) {
    issues.push('stage 2 index page must retain the startup @Entry decorator');
  }

  const targetFile = readProjectFile(projectRoot, policy.targetPageFile, 'stage 2 targetPageFile', issues);
  if (targetFile.content !== null) {
    if (hasArkTsDecorator(targetFile.content, 'Entry')) {
      issues.push('stage 2 target page must not declare @Entry');
    }
    if (validTargetComponentName && !hasDecoratedExportStruct(targetFile.content, 'Component', targetComponentName)) {
      issues.push(`stage 2 target page must be a reusable @Component decorating export struct ${targetComponentName}`)
    }
  }

  const entryFile = readProjectFile(projectRoot, policy.entryAbilityFile, 'stage 2 entryAbilityFile', issues);
  if (entryFile.content !== null) {
    const loaded = findLoadContentPage(entryFile.content);
    if (loaded === null) {
      issues.push('stage 2 EntryAbility must load pages/Index through a loadContent string literal argument; the loaded page could not be determined');
    } else if (loaded !== 'pages/Index') {
      issues.push('stage 2 EntryAbility must still load pages/Index');
    }
  }

  const mainPagesFile = readProjectFile(projectRoot, policy.mainPagesFile, 'stage 2 mainPagesFile', issues);
  if (mainPagesFile.content !== null) {
    const src = parseMainPagesSrc(mainPagesFile.content);
    if (src === null) {
      issues.push('stage 2 main_pages.json must be valid JSON');
    } else if (!src.includes('pages/Index')) {
      issues.push('stage 2 main_pages.json must still contain pages/Index');
    }
  }

  const registrationFileRel = targetRegistrationFileOf(policy);
  if (!registrationFileRel) {
    issues.push(`stage 2 ${policy.targetRegistrationMode} requires startup page policy targetRegistrationFile`);
  } else {
    const registrationFile = readProjectFile(projectRoot, registrationFileRel, 'stage 2 target registration file', issues);
    if (registrationFile.content !== null) {
      if (policy.targetRegistrationMode === 'index-navigation') {
        if (validTargetComponentName && !isComponentInstantiated(registrationFile.content, targetComponentName)) {
          issues.push('stage 2 index-navigation registration must instantiate the target component in Index');
        }
      } else if (validTargetComponentName && !routeAndComponentRegisteredTogether(registrationFile.content, targetRoute, targetComponentName)) {
        issues.push(`stage 2 ${policy.targetRegistrationMode} registration must register the target route and component together`);
      }
    }
  }

  issues.push(...collectRunIndexIssues(runDir, projectRoot, policy, targetComponentName, targetRoute, {
    scenario: ctx.stage2?.scenario ?? 'pre-commit',
    designSource: ctx.stage2?.designSource ?? ctx.designSource ?? 'figma',
    declaredPages: Array.isArray(snapshot.existingGeneratedPages) ? snapshot.existingGeneratedPages : null,
  }));

  const uiManifest = readJsonOrNull(
    join(runDir, PAGE_STAGE2_GENERATED_MANIFEST),
    'stage 2 generated ui manifest',
    issues
  );
  if (uiManifest) {
    const page = uiManifest.page;
    const registration = uiManifest.registration;
    const startup = uiManifest.startup;
    if (typeof page?.file !== 'string' || page.file !== policy.targetPageFile) {
      issues.push('stage 2 generated ui manifest page.file must match startup page policy targetPageFile');
    }
    if (typeof page?.component !== 'string' || page.component !== targetComponentName) {
      issues.push('stage 2 generated ui manifest page.component must match targetComponentName');
    }
    if (page?.hasEntry !== false) {
      issues.push('stage 2 generated ui manifest page.hasEntry must be false');
    }
    if (typeof registration?.file !== 'string' || registration.file !== registrationFileRel) {
      issues.push('stage 2 generated ui manifest registration.file must match the target registration file');
    }
    if (typeof registration?.component !== 'string' || registration.component !== targetComponentName) {
      issues.push('stage 2 generated ui manifest registration.component must match targetComponentName');
    }
    if (typeof registration?.mode !== 'string' || registration.mode !== policy.targetRegistrationMode) {
      issues.push('stage 2 generated ui manifest registration.mode must match targetRegistrationMode');
    }
    if (typeof registration?.route !== 'string' || registration.route !== targetRoute) {
      issues.push('stage 2 generated ui manifest registration.route must match targetRoute');
    }
    if (registration?.default !== policy.changeDefaultPage) {
      issues.push('stage 2 generated ui manifest registration.default must match changeDefaultPage');
    }
    if (startup?.indexFile !== policy.indexPageFile) {
      issues.push('stage 2 generated ui manifest startup.indexFile must match indexPageFile');
    }
    if (startup?.entryAbilityPage !== 'pages/Index') {
      issues.push('stage 2 generated ui manifest startup.entryAbilityPage must be pages/Index');
    }
    if (startup?.mainPagesContainsIndex !== true) {
      issues.push('stage 2 generated ui manifest startup.mainPagesContainsIndex must be true');
    }
  }

  const buildReport = readJsonOrNull(
    join(runDir, PAGE_STAGE2_INITIAL_BUILD_REPORT),
    'stage 2 initial build report',
    issues
  );
  if (buildReport) {
    if (buildReport.success !== true) {
      issues.push('stage 2 initial build report must record success=true');
    }
    if (typeof buildReport.command !== 'string' || buildReport.command.trim().length === 0) {
      issues.push('stage 2 initial build report must record a non-empty command');
    }
    if (buildReport.exitCode !== 0) {
      issues.push('stage 2 initial build report must record exitCode=0');
    }
    if (typeof buildReport.completedAt !== 'string' || !Number.isFinite(Date.parse(buildReport.completedAt))) {
      issues.push('stage 2 initial build report must record a valid completedAt timestamp');
    }
  }

  if (policy.changeDefaultPage === true) {
    if (typeof policy.changeDefaultPageReason !== 'string' || policy.changeDefaultPageReason.length === 0) {
      issues.push('stage 2 must record changeDefaultPageReason when changing the default page');
    }
    const evidence = policy.defaultDecisionEvidence ?? {};
    const templateFirstRun = policy.projectType === 'template' &&
      evidence.templateHelloWorldOnly === true &&
      evidence.hasBusinessHome === false &&
      evidence.hasHistoricalGeneratedPages === false;
    if (!templateFirstRun && policy.userRequestedDefaultChange !== true) {
      issues.push('stage 2 must not change the default page unless it is the first generated page in a template project or the user explicitly requests it');
    }
  } else if (policy.changeDefaultPage === false && policy.defaultPageAfter !== policy.defaultPageBefore) {
    issues.push('stage 2 defaultPageAfter must equal defaultPageBefore when the default page is unchanged');
  }

  return issues;
}

function updateRunIndex(runDir, projectRoot, policy, designSource = 'figma') {
  const runIndexFileRel = policy.runIndexFile;
  const indexPath = resolve(projectRoot, runIndexFileRel);
  const existing = existsSync(indexPath)
    ? readJsonFile(indexPath)
    : { schemaVersion: 1, pages: [] };
  const pages = Array.isArray(existing.pages) ? existing.pages : [];
  const record = {
    designSource,
    runId: basename(runDir),
    pageFile: policy.targetPageFile,
    componentName: policy.targetComponentName,
    route: policy.targetRoute,
    registrationMode: policy.targetRegistrationMode,
    registrationFile: targetRegistrationFileOf(policy),
    default: policy.changeDefaultPage === true,
    contentSha256: hashFile(resolve(projectRoot, policy.targetPageFile)),
  };
  const index = pages.findIndex(
    (page) => page.designSource === record.designSource && page.runId === record.runId && page.pageFile === record.pageFile
  );
  if (index === -1) {
    pages.push(record);
  } else {
    pages[index] = record;
  }
  if (record.default) {
    for (const page of pages) {
      if (page !== record) {
        page.default = false;
      }
    }
  }
  writeJsonAtomic(indexPath, { schemaVersion: 1, pages });
}

function isValidLegacyComponentRecognitionAnalysis(analysis) {
  if (
    !analysis ||
    typeof analysis !== 'object' ||
    !isPositiveBoundedNumber(analysis.canvas?.width, 100000) ||
    !isPositiveBoundedNumber(analysis.canvas?.height, 100000) ||
    !Array.isArray(analysis.regions) ||
    analysis.regions.length === 0 ||
    analysis.regions.length > 200 ||
    !isBoundedStringArray(analysis.global_observations, 100, 4000) ||
    !isBoundedStringArray(analysis.uncertainties, 100, 4000)
  ) {
    return false;
  }
  const ids = analysis.regions.map((region) => region?.id);
  if (
    ids.some((id) => !isNonEmptyBoundedString(id, 128)) ||
    new Set(ids).size !== ids.length
  ) {
    return false;
  }
  return analysis.regions.every((region) =>
    isNonEmptyBoundedString(region?.name, 4000) &&
    isNonEmptyBoundedString(region?.visual_evidence, 4000) &&
    isValidNormalizedBounds(region?.bounds) &&
    Array.isArray(region?.component_candidates) &&
    region.component_candidates.length > 0 &&
    region.component_candidates.length <= 10 &&
    region.component_candidates.every((candidate) =>
      isNonEmptyBoundedString(candidate?.name, 4000) &&
      ['arkui-native', 'custom', 'basic-layout', 'unknown'].includes(candidate?.category) &&
      isConfidence(candidate?.confidence) &&
      isNonEmptyBoundedString(candidate?.reason, 4000)
    ) &&
    isBoundedStringArray(region?.children, 100, 128) &&
    region.children.every((child) => child !== region.id && ids.includes(child)) &&
    isBoundedStringArray(region?.interaction_hints, 20, 4000) &&
    typeof region?.overlay === 'boolean' &&
    isConfidence(region?.confidence)
  );
}

function isValidNormalizedBounds(bounds) {
  return bounds &&
    typeof bounds.x === 'number' && Number.isFinite(bounds.x) && bounds.x >= 0 && bounds.x <= 1000 &&
    typeof bounds.y === 'number' && Number.isFinite(bounds.y) && bounds.y >= 0 && bounds.y <= 1000 &&
    isPositiveBoundedNumber(bounds.width, 1000) &&
    isPositiveBoundedNumber(bounds.height, 1000) &&
    bounds.x + bounds.width <= 1000 &&
    bounds.y + bounds.height <= 1000;
}

function isValidComponentRecognitionInventory(analysis) {
  if (
    !analysis ||
    typeof analysis !== 'object' ||
    !isPositiveBoundedNumber(analysis.canvas?.width, 100000) ||
    !isPositiveBoundedNumber(analysis.canvas?.height, 100000) ||
    !Array.isArray(analysis.visible_components) ||
    analysis.visible_components.length === 0 ||
    analysis.visible_components.length > 200 ||
    !isBoundedStringArray(analysis.global_observations, 100, 4000) ||
    !isBoundedStringArray(analysis.uncertainties, 100, 4000)
  ) {
    return false;
  }
  const ids = analysis.visible_components.map((component) => component?.id);
  if (
    ids.some((id) => !isNonEmptyBoundedString(id, 128)) ||
    new Set(ids).size !== ids.length
  ) {
    return false;
  }
  return analysis.visible_components.every((component) =>
    isNonEmptyBoundedString(component?.name, 4000) &&
    isNonEmptyBoundedString(component?.visual_evidence, 4000) &&
    Array.isArray(component?.component_candidates) &&
    component.component_candidates.length > 0 &&
    component.component_candidates.length <= 10 &&
    component.component_candidates.every((candidate) =>
      isNonEmptyBoundedString(candidate?.name, 4000) &&
      isConfidence(candidate?.confidence) &&
      isNonEmptyBoundedString(candidate?.reason, 4000)
    )
  );
}

function isValidComponentRecognitionDegraded(artifact) {
  return artifact.analysis === null &&
    artifact.failure?.code === 'empty_components' &&
    artifact.failure?.attempts === 2 &&
    artifact.failure?.fallbackPolicy === 'ignore-visual-component-recognition';
}

function isBoundedStringArray(value, maxItems, maxChars) {
  return Array.isArray(value) &&
    value.length <= maxItems &&
    value.every((item) => isNonEmptyBoundedString(item, maxChars));
}

function isNonEmptyBoundedString(value, maxChars) {
  return typeof value === 'string' && value.length > 0 && value.length <= maxChars;
}

function isPositiveBoundedNumber(value, max) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= max;
}

function isConfidence(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

const PAGE_STAGE2_CONFIRMATION_FILES = [
  ['componentVisionAnalysis', 'stage2/component-vision-analysis.json'],
  ['componentAnalysis', 'stage2/component-analysis.md'],
  ['componentTree', 'component-tree.md'],
  ['designDoc', 'design-doc.md']
];

function pageStage2ConfirmationFiles(catalog) {
  if (catalog.designSource === 'mastergo') return MASTERGO_CONFIRMATION_FILES;
  return PAGE_STAGE2_CONFIRMATION_FILES;
}

function buildPageStage2ConfirmationSnapshot(runDir, catalog, issues) {
  const files = {};
  for (const [name, relativePath] of pageStage2ConfirmationFiles(catalog)) {
    const path = join(runDir, ...relativePath.split('/'));
    if (!existsSync(path) || !statSync(path).isFile()) {
      issues.push(`stage 2 confirmation file is missing: ${relativePath}`);
      continue;
    }
    const size = statSync(path).size;
    if (size === 0 || size > 2 * 1024 * 1024) {
      issues.push(`stage 2 confirmation file must be between 1 byte and 2 MB: ${relativePath}`);
      continue;
    }
    files[name] = {
      path: relativePath,
      sha256: hashFile(path)
    };
  }
  if (issues.length > 0) {
    return null;
  }
  try {
    return {
      stage: 2,
      files,
      ...(catalog.designSource === 'mastergo' ? {
        invocationId: readJsonFile(join(runDir, MASTERGO_RUN_STATE)).invocationId,
        contractSha256: hashFile(join(runDir, MASTERGO_CONTRACT))
      } : {}),
      createdAt: new Date().toISOString()
    };
  } catch {
    // Evidence may disappear or change between validation and snapshot creation.
    issues.push('stage 2 conversion checkpoint or input contract changed while creating confirmation; validate and retry');
    return null;
  }
}

function collectPageStage2ConfirmationSnapshotIssues(runDir, catalog, state) {
  const issues = [];
  const snapshot = state.confirmationSnapshots?.['2'];
  const source = state.designSource ?? 'pixso';
  if (source === 'mastergo') issues.push(...collectMasterGoConfirmationIssues(runDir, snapshot));
  if (!snapshot || snapshot.stage !== 2 || !snapshot.files) {
    return ['stage 2 confirmation snapshot is missing or invalid'];
  }
  for (const [name, relativePath] of pageStage2ConfirmationFiles(catalog)) {
    const evidence = snapshot.files[name];
    if (
      evidence?.path !== relativePath ||
      typeof evidence?.sha256 !== 'string' ||
      !/^[a-f0-9]{64}$/.test(evidence.sha256)
    ) {
      issues.push(`stage 2 confirmation snapshot entry is invalid: ${name}`);
      continue;
    }
    const path = join(runDir, ...relativePath.split('/'));
    if (!existsSync(path) || !statSync(path).isFile() || statSync(path).size === 0) {
      issues.push(`stage 2 confirmed file is missing or empty: ${relativePath}`);
    } else if (hashFile(path) !== evidence.sha256) {
      issues.push(`stage 2 confirmed file changed after confirmation request: ${relativePath}`);
    }
  }
  return issues;
}

function isPageStage2(catalog, stage) {
  return ['figma', 'mastergo'].includes(catalog.designSource) && stage === 2;
}

function requiresPageStage2Confirmation(catalog, stage) {
  return isPageStage2(catalog, stage) && catalog.stages[stage - 1]?.requiresConfirmation === true;
}

// Stages whose authoritative output is design-doc.md. Manual Full flows keep
// confirmation-snapshot validation and are intentionally excluded.
function requiresDesignDocMissingGuard(catalog, stage) {
  const designSource = catalog.designSource ?? 'pixso';
  return (
    (designSource === 'figma' && catalog.variant === 'fast' && stage === 2) ||
    (designSource === 'pixso' && stage === 5)
  );
}

function collectDesignDocEvidenceIssues(runDir) {
  const path = join(runDir, 'design-doc.md');

  if (!existsSync(path)) {
    return ['design-doc.md is missing'];
  }

  const stat = statSync(path);
  if (!stat.isFile()) {
    return ['design-doc.md must be a regular file'];
  }

  if (stat.size === 0) {
    return ['design-doc.md is empty'];
  }

  if (readFileSync(path, 'utf8').trim().length === 0) {
    return ['design-doc.md contains only whitespace'];
  }

  return [];
}

const DESIGN_DOC_RECOVERY_INSTRUCTION = 'references/design-doc-auto-recovery.md';
const SOLUTION_DESIGN_SKILL = 'hmos-d2a-solution-design';
const FIGMA_REACT_TO_ARKUI_RUN_STATE = 'stage2/hmos-d2a-react-to-arkui-run.json';
const FIGMA_REACT_TO_ARKUI_PHASES = new Set([
  'analyzing',
  'awaiting_confirmation',
  'implementing',
  'validating',
  'completed'
]);
const FIGMA_REACT_TO_ARKUI_RESUME_FORBIDDEN_PHASES = new Set(['implementing', 'validating', 'completed']);

function designDocStage(catalog) {
  if (['figma', 'mastergo'].includes(catalog.designSource)) return 2;
  return 5;
}

function isNonEmptyFile(path) {
  if (!existsSync(path)) return false;
  const stat = statSync(path);
  return stat.isFile() && stat.size > 0;
}

function isParseableJsonFile(path) {
  if (!isNonEmptyFile(path)) return false;
  try {
    readJsonFile(path);
    return true;
  } catch {
    return false;
  }
}

function runDirRelativePath(runDir, relativePath) {
  return join(runDir, ...relativePath.split('/'));
}

// The page DSL is located strictly through inputs-manifest.json pages[].dslPath.
// Two path formats are accepted: a runDir-relative `source/...` path and a
// repo-relative `.deveco/.../runs/{runId}/source/...` path that must start with
// the manifest's own runDir. Scanning the source directory for any parseable
// DSL is never a pass condition.
function collectPixsoDslEntries(runDir) {
  const issues = [];
  const entries = [];
  const manifest = readJsonOrNull(
    join(runDir, 'inputs-manifest.json'),
    'inputs manifest',
    issues
  );
  if (!manifest) {
    return { issues, entries };
  }
  if (!Array.isArray(manifest.pages) || manifest.pages.length === 0) {
    issues.push('inputs-manifest.json pages must be a non-empty array');
    return { issues, entries };
  }
  const manifestRunDir = typeof manifest.runDir === 'string' && manifest.runDir.length > 0
    ? manifest.runDir.replaceAll('\\', '/').replace(/\/+$/, '')
    : null;
  manifest.pages.forEach((page, index) => {
    const label = `inputs-manifest.json pages[${index}]` +
      (typeof page?.pageSlug === 'string' && page.pageSlug.length > 0 ? ` (${page.pageSlug})` : '');
    const rawPath = page?.dslPath;
    if (typeof rawPath !== 'string' || rawPath.length === 0) {
      issues.push(`${label} dslPath is missing`);
      return;
    }
    const normalized = rawPath.replaceAll('\\', '/');
    let candidate;
    if (normalized.startsWith('source/')) {
      candidate = normalized;
    } else if (manifestRunDir && normalized.startsWith(`${manifestRunDir}/`)) {
      candidate = normalized.slice(manifestRunDir.length + 1);
      if (!candidate.startsWith('source/')) {
        issues.push(`${label} dslPath must resolve into the run source directory: ${rawPath}`);
        return;
      }
    } else {
      issues.push(
        `${label} dslPath must be a source/... path or start with the manifest runDir (${manifestRunDir ?? 'missing'}): ${rawPath}`
      );
      return;
    }
    const resolved = resolve(runDir, candidate);
    const relFromRunDir = relative(runDir, resolved);
    if (relFromRunDir.startsWith('..') || isAbsolute(relFromRunDir)) {
      issues.push(`${label} dslPath escapes the run directory: ${rawPath}`);
      return;
    }
    entries.push({
      label,
      rawPath,
      relPath: relFromRunDir.replaceAll('\\', '/'),
      resolved,
      expectedSha256: typeof page?.dslSha256 === 'string' ? page.dslSha256 : undefined
    });
  });
  return { issues, entries };
}

function pixsoDslIssues(runDir) {
  const { issues, entries } = collectPixsoDslEntries(runDir);
  for (const entry of entries) {
    if (!existsSync(entry.resolved)) {
      issues.push(`${entry.label} DSL file is missing: ${entry.rawPath}`);
      continue;
    }
    const stat = statSync(entry.resolved);
    if (!stat.isFile()) {
      issues.push(`${entry.label} DSL file is not a regular file: ${entry.rawPath}`);
      continue;
    }
    if (stat.size === 0) {
      issues.push(`${entry.label} DSL file is empty: ${entry.rawPath}`);
      continue;
    }
    try {
      readJsonFile(entry.resolved);
    } catch (error) {
      issues.push(`${entry.label} DSL file is not valid JSON: ${entry.rawPath} (${error.message})`);
      continue;
    }
    if (entry.expectedSha256 !== undefined) {
      if (!/^[a-f0-9]{64}$/.test(entry.expectedSha256)) {
        issues.push(`${entry.label} dslSha256 must be 64 lowercase hex characters`);
      } else if (hashFile(entry.resolved) !== entry.expectedSha256) {
        issues.push(`${entry.label} dslSha256 does not match the DSL file: ${entry.rawPath}`);
      }
    }
  }
  return issues;
}

function missingNonEmptyInputs(runDir, relativePaths) {
  return relativePaths
    .filter((relativePath) => !isNonEmptyFile(runDirRelativePath(runDir, relativePath)))
    .map((relativePath) => `${relativePath} is missing or empty`);
}

function missingParseableJsonInputs(runDir, relativePaths) {
  return relativePaths
    .filter((relativePath) => !isParseableJsonFile(runDirRelativePath(runDir, relativePath)))
    .map((relativePath) => `${relativePath} is missing or not parseable`);
}

// Authoritative inputs that let hmos-d2a-solution-design rebuild only the
// missing design-doc.md for a Pixso run.
function pixsoRestoreDocumentInputIssues(runDir) {
  return [
    ...missingNonEmptyInputs(runDir, ['component-tree.md']),
    ...missingParseableJsonInputs(runDir, ['requirement-clarification.json']),
    ...pixsoDslIssues(runDir),
    ...missingParseableJsonInputs(runDir, [
      'hds-decision.json',
      'startup-page-policy.json',
      'system-ui-policy.json',
      'viewport-boundary-spec.json',
      'system-ui-coordinate-normalization.json',
      'safe-area-unit-contract.json'
    ])
  ];
}

// Stage 1-4 upstream inputs that let the Pixso stage 5 solution-design subflow
// run again from its documented entry point.
function pixsoUpstreamInputIssues(runDir) {
  const issues = [
    ...missingParseableJsonInputs(runDir, ['requirement-clarification.json']),
    ...pixsoDslIssues(runDir),
    ...missingParseableJsonInputs(runDir, [
      'stage2/image-assets-manifest.json',
      'stage3-repo-understand-report.json',
      'stage4-selected-practices.json'
    ])
  ];
  const generatedDir = runDirRelativePath(runDir, 'stage2/generated');
  const hasSkeleton = existsSync(generatedDir) &&
    statSync(generatedDir).isDirectory() &&
    readdirSync(generatedDir).some((name) => name.endsWith('.ets'));
  if (!hasSkeleton) {
    issues.push('stage2/generated/ contains no generated page skeleton');
  }
  return issues;
}

// Authoritative products that must all survive for a Figma "document-only"
// restore; if any is missing the assessment falls through to the resume path.
function figmaRestoreDocumentInputIssues(runDir) {
  return [
    ...missingNonEmptyInputs(runDir, [
      'source/figma/page.jsx',
      'source/figma/reference-screenshot.png',
      'stage2/project-analysis.md',
      'stage2/component-analysis.md',
      'component-tree.md'
    ]),
    ...missingParseableJsonInputs(runDir, [
      'system-ui-policy.json',
      'viewport-boundary-spec.json',
      'requirement-clarification.json'
    ])
  ];
}

// Validates the persisted hmos-d2a-react-to-arkui run state. The in-run resume
// keeps the historical restriction (the design generation must not have
// finished); design-only recovery may read a run state that already advanced
// past design generation but never one parked on a confirmation wait.
const FIGMA_REACT_TO_ARKUI_DESIGN_ONLY_FORBIDDEN_PHASES = new Set(['awaiting_confirmation']);

function figmaRunStateIssues(runDir, options = {}) {
  const designOnlyRecovery = options.designOnlyRecovery === true;
  const runStatePath = runDirRelativePath(runDir, FIGMA_REACT_TO_ARKUI_RUN_STATE);
  if (!isNonEmptyFile(runStatePath)) {
    return [`${FIGMA_REACT_TO_ARKUI_RUN_STATE} is missing or empty`];
  }
  let runState;
  try {
    runState = readJsonFile(runStatePath);
  } catch {
    return [`${FIGMA_REACT_TO_ARKUI_RUN_STATE} is not valid JSON`];
  }
  if (typeof runState?.invocationId !== 'string' || runState.invocationId.length === 0) {
    return [`${FIGMA_REACT_TO_ARKUI_RUN_STATE} invocationId is missing`];
  }
  if (!runState.inputs || typeof runState.inputs !== 'object' || Array.isArray(runState.inputs)) {
    return [`${FIGMA_REACT_TO_ARKUI_RUN_STATE} inputs are missing`];
  }
  const pageJsxHash = runState.inputs.pageJsx;
  if (typeof pageJsxHash !== 'string' || !/^[a-f0-9]{64}$/.test(pageJsxHash)) {
    return [
      `${FIGMA_REACT_TO_ARKUI_RUN_STATE} inputs.pageJsx must be the 64-char lowercase SHA-256 of source/figma/page.jsx`
    ];
  }
  const pageJsxPath = runDirRelativePath(runDir, 'source/figma/page.jsx');
  if (!isNonEmptyFile(pageJsxPath) || hashFile(pageJsxPath) !== pageJsxHash) {
    return [`${FIGMA_REACT_TO_ARKUI_RUN_STATE} inputs.pageJsx does not match the current source/figma/page.jsx`];
  }
  if (!FIGMA_REACT_TO_ARKUI_PHASES.has(runState.phase)) {
    return [`${FIGMA_REACT_TO_ARKUI_RUN_STATE} phase is invalid`];
  }
  if (designOnlyRecovery) {
    if (FIGMA_REACT_TO_ARKUI_DESIGN_ONLY_FORBIDDEN_PHASES.has(runState.phase)) {
      return [
        `${FIGMA_REACT_TO_ARKUI_RUN_STATE} phase awaiting_confirmation cannot be resumed by design-only recovery`
      ];
    }
  } else if (FIGMA_REACT_TO_ARKUI_RESUME_FORBIDDEN_PHASES.has(runState.phase)) {
    return [`${FIGMA_REACT_TO_ARKUI_RUN_STATE} has advanced past the design generation phase: ${runState.phase}`];
  }
  return [];
}

// Upstream inputs that let hmos-d2a-react-to-arkui resume its design
// generation, which then invokes hmos-d2a-solution-design for the document.
// Component recognition evidence is validated through the shared collector;
// the run state never redefines those fields.
function figmaUpstreamInputIssues(runDir, options = {}) {
  const issues = [
    ...missingNonEmptyInputs(runDir, [
      'source/figma/page.jsx',
      'source/figma/reference-screenshot.png',
      'stage2/project-analysis.md',
      'stage2/component-analysis.md'
    ]),
    ...missingParseableJsonInputs(runDir, ['requirement-clarification.json']),
    ...figmaRunStateIssues(runDir, options)
  ];
  const assetsDir = runDirRelativePath(runDir, 'source/figma/assets');
  if (!existsSync(assetsDir) || !statSync(assetsDir).isDirectory()) {
    issues.push('source/figma/assets is missing');
  }
  issues.push(...collectComponentRecognitionEvidenceIssues(runDir));
  return issues;
}

// Run dirs created before the ledger rename keep the legacy filename; prefer
// the canonical name and fall back so design-doc recovery can still read them.
function resolveLedgerPath(runDir) {
  const ledgerPath = join(runDir, 'capability-invocation-ledger.json');
  if (existsSync(ledgerPath)) return ledgerPath;
  const legacyPath = join(runDir, 'skill-invocation-ledger.json');
  return existsSync(legacyPath) ? legacyPath : ledgerPath;
}

// The design-doc.md writer is hmos-d2a-solution-design by contract; a live
// completion of a doc stage must show a completed ledger record for it.
function collectSolutionDesignLedgerIssues(runDir, stage) {
  const ledgerPath = resolveLedgerPath(runDir);
  if (!isNonEmptyFile(ledgerPath)) {
    return [`stage ${stage} requires capability-invocation-ledger.json with a completed ${SOLUTION_DESIGN_SKILL} invocation`];
  }
  let ledger;
  try {
    ledger = readJsonFile(ledgerPath);
  } catch {
    return [`stage ${stage} capability-invocation-ledger.json is not valid JSON`];
  }
  const entries = Array.isArray(ledger)
    ? ledger
    : Array.isArray(ledger?.invocations)
      ? ledger.invocations
      : null;
  if (!entries) {
    return [`stage ${stage} capability-invocation-ledger.json must be an array or contain an invocations array`];
  }
  const hasCompleted = entries.some(
    (entry) =>
      entry &&
      typeof entry === 'object' &&
      (entry.capability === SOLUTION_DESIGN_SKILL || entry.skill === SOLUTION_DESIGN_SKILL || entry.skillName === SOLUTION_DESIGN_SKILL) &&
      entry.status === 'completed'
  );
  if (!hasCompleted) {
    return [`stage ${stage} capability-invocation-ledger.json must contain a completed ${SOLUTION_DESIGN_SKILL} invocation record`];
  }
  return [];
}

// Unified assessment for an invalid design-doc.md. Outcomes:
//   none                              — the document is valid
//   restore_document                  — authoritative inputs are complete, so
//                                       hmos-d2a-solution-design can rebuild
//                                       only the document
//   resume_design_generation          — the doc generation stage is still
//                                       running, or it already completed and a
//                                       later stage lost the document; the
//                                       original orchestration subflow can be
//                                       resumed (design-only for Figma)
//   blocked_missing_upstream_evidence — recovery is impossible; report
//                                       design_stage_evidence_incomplete
function assessDesignDocRecovery(runDir, catalog, state) {
  const docIssues = collectDesignDocEvidenceIssues(runDir);
  if (docIssues.length === 0) {
    return { outcome: 'none', issues: [] };
  }

  const designSource = catalog.designSource ?? 'pixso';
  const docStage = designDocStage(catalog);
  const docStageCompleted = state.completedStages.includes(docStage);
  const inGenerationStage = state.currentStage === docStage && !docStageCompleted;

  // Safety boundary: after Pixso Full stage 5 completed, the component tree is
  // the user-confirmed artifact and no snapshot of that confirmation exists, so
  // nothing may be regenerated in its place.
  if (designSource === 'pixso' && catalog.variant === 'full' && docStageCompleted) {
    if (!isNonEmptyFile(runDirRelativePath(runDir, 'component-tree.md'))) {
      return {
        outcome: 'blocked_missing_upstream_evidence',
        issues: [
          ...docIssues,
          'component-tree.md is missing or empty; the user-confirmed Pixso component tree cannot be regenerated'
        ]
      };
    }
  }

  const restoreIssues = designSource === 'figma'
    ? figmaRestoreDocumentInputIssues(runDir)
    : pixsoRestoreDocumentInputIssues(runDir);
  if (restoreIssues.length === 0) {
    return { outcome: 'restore_document', issues: docIssues };
  }

  if (inGenerationStage || docStageCompleted) {
    const upstreamIssues = designSource === 'figma'
      ? figmaUpstreamInputIssues(runDir, { designOnlyRecovery: docStageCompleted })
      : pixsoUpstreamInputIssues(runDir);
    if (upstreamIssues.length === 0) {
      return { outcome: 'resume_design_generation', issues: docIssues };
    }
    return {
      outcome: 'blocked_missing_upstream_evidence',
      issues: [...docIssues, ...restoreIssues, ...upstreamIssues]
    };
  }

  return {
    outcome: 'blocked_missing_upstream_evidence',
    issues: [...docIssues, ...restoreIssues]
  };
}

function stageCompleteRetry(requestedStage, result, reasonCode) {
  const retry = { mode: 'stage-complete', stage: requestedStage, result };
  if (result === 'blocked') {
    retry.reasonCode = reasonCode;
  }
  return retry;
}

function buildDesignDocRecoveryPayload(runDir, catalog, assessment, retry) {
  if (assessment.outcome === 'restore_document') {
    return {
      strategy: 'restore_document',
      skill: SOLUTION_DESIGN_SKILL,
      operation: 'restore_missing_design_doc',
      instructionPath: DESIGN_DOC_RECOVERY_INSTRUCTION,
      retry
    };
  }
  if ((catalog.designSource ?? 'pixso') === 'figma') {
    return {
      strategy: 'resume_design_generation',
      runnerSkill: 'hmos-d2a-react-to-arkui',
      operation: 'restore_design_artifacts',
      stopAfterDesign: true,
      runStatePath: runDirRelativePath(runDir, FIGMA_REACT_TO_ARKUI_RUN_STATE),
      mustInvokeSkill: SOLUTION_DESIGN_SKILL,
      instructionPath: DESIGN_DOC_RECOVERY_INSTRUCTION,
      retry
    };
  }
  return {
    strategy: 'resume_design_generation',
    runner: 'pixso_stage5_solution_design_subflow',
    instructionPath: DESIGN_DOC_RECOVERY_INSTRUCTION,
    stageInstructionPath: catalog.stages[designDocStage(catalog) - 1].instructionPath,
    mustInvokeSkill: SOLUTION_DESIGN_SKILL,
    retry
  };
}

// Read-only inputs whose content must stay frozen for the duration of one
// recovery event. Only files that currently exist are recorded; outputs the
// recovery may (re)create are never hashed.
function designDocRecoveryInputPaths(runDir, catalog, strategy) {
  const designSource = catalog.designSource ?? 'pixso';
  if (strategy === 'restore_document') {
    if (designSource === 'figma') {
      return [
        'source/figma/page.jsx',
        'source/figma/reference-screenshot.png',
        'stage2/project-analysis.md',
        'stage2/component-analysis.md',
        'component-tree.md',
        'system-ui-policy.json',
        'viewport-boundary-spec.json',
        'requirement-clarification.json',
        'inputs-manifest.json'
      ];
    }
    return [
      'component-tree.md',
      'requirement-clarification.json',
      'hds-decision.json',
      'startup-page-policy.json',
      'system-ui-policy.json',
      'viewport-boundary-spec.json',
      'system-ui-coordinate-normalization.json',
      'safe-area-unit-contract.json',
      'inputs-manifest.json'
    ];
  }
  if (designSource === 'figma') {
    return [
      'source/figma/page.jsx',
      'source/figma/reference-screenshot.png',
      'requirement-clarification.json',
      'stage2/project-analysis.md',
      'stage2/component-analysis.md',
      'source/figma/component-recognition-screenshot.png',
      'stage2/component-vision-analysis.json',
      'inputs-manifest.json',
      FIGMA_REACT_TO_ARKUI_RUN_STATE
    ];
  }
  return [
    'requirement-clarification.json',
    'inputs-manifest.json',
    'stage2/image-assets-manifest.json',
    'stage3-repo-understand-report.json',
    'stage4-selected-practices.json'
  ];
}

function computeDesignDocRecoveryInputHashes(runDir, catalog, strategy) {
  const inputHashes = {};
  const paths = designDocRecoveryInputPaths(runDir, catalog, strategy);
  if ((catalog.designSource ?? 'pixso') === 'pixso') {
    paths.push(...collectPixsoDslEntries(runDir).entries.map((entry) => entry.relPath));
    if (strategy === 'resume_design_generation') {
      // Freeze the stage 2 page skeletons the stage 5 subflow consumes: only
      // direct regular .ets children of stage2/generated, sorted by name so
      // the recorded set is stable.
      const generatedDir = join(runDir, 'stage2', 'generated');
      if (existsSync(generatedDir) && statSync(generatedDir).isDirectory()) {
        paths.push(
          ...readdirSync(generatedDir)
            .filter((name) => name.endsWith('.ets') && statSync(join(generatedDir, name)).isFile())
            .sort()
            .map((name) => relative(runDir, join(generatedDir, name)).replaceAll('\\', '/'))
        );
      }
    }
  }
  for (const relPath of new Set(paths)) {
    const fullPath = runDirRelativePath(runDir, relPath);
    if (isNonEmptyFile(fullPath)) {
      inputHashes[relPath] = hashFile(fullPath);
    }
  }
  return inputHashes;
}

function readPendingDesignDocRecoveryRequest(runDir) {
  const requestPath = join(runDir, DESIGN_DOC_RECOVERY_REQUEST);
  if (!existsSync(requestPath)) {
    return null;
  }
  try {
    const request = readJsonFile(requestPath);
    if (
      request?.status !== 'pending' ||
      typeof request?.recoveryInvocationId !== 'string' ||
      request.recoveryInvocationId.length === 0 ||
      !request?.recovery ||
      typeof request.recovery !== 'object' ||
      Array.isArray(request.recovery)
    ) {
      return null;
    }
    return request;
  } catch {
    return null;
  }
}

// Ensures a pending design-doc-recovery-request.json exists before a recovery
// payload is returned to the agent. Within one missing-document event the
// original ID and the original payload are reused; a completed request from an
// earlier event is replaced by a fresh UUID.
function prepareDesignDocRecovery(runDir, catalog, state, assessment, retry) {
  const existing = readPendingDesignDocRecoveryRequest(runDir);
  if (existing) {
    return existing.recovery;
  }
  const recoveryInvocationId = randomUUID();
  const recovery = {
    ...buildDesignDocRecoveryPayload(runDir, catalog, assessment, retry),
    recoveryInvocationId
  };
  writeJsonAtomic(join(runDir, DESIGN_DOC_RECOVERY_REQUEST), {
    schemaVersion: 1,
    recoveryInvocationId,
    strategy: assessment.outcome,
    designSource: catalog.designSource ?? 'pixso',
    documentStage: designDocStage(catalog),
    inputHashes: computeDesignDocRecoveryInputHashes(runDir, catalog, assessment.outcome),
    recovery,
    status: 'pending'
  });
  return recovery;
}

function findSolutionDesignLedgerEntry(runDir, invocationId) {
  const ledgerPath = resolveLedgerPath(runDir);
  if (!isNonEmptyFile(ledgerPath)) {
    return null;
  }
  let ledger;
  try {
    ledger = readJsonFile(ledgerPath);
  } catch {
    return null;
  }
  const entries = Array.isArray(ledger)
    ? ledger
    : Array.isArray(ledger?.invocations)
      ? ledger.invocations
      : null;
  if (!entries) {
    return null;
  }
  return entries.find(
    (entry) =>
      entry &&
      typeof entry === 'object' &&
      entry.invocationId === invocationId &&
      (entry.capability === SOLUTION_DESIGN_SKILL || entry.skill === SOLUTION_DESIGN_SKILL || entry.skillName === SOLUTION_DESIGN_SKILL) &&
      entry.status === 'completed'
  ) ?? null;
}

function designDocRecoveryInputHashIssues(runDir, request) {
  const issues = [];
  const inputHashes = request.inputHashes;
  if (!inputHashes || typeof inputHashes !== 'object' || Array.isArray(inputHashes)) {
    return [`${DESIGN_DOC_RECOVERY_REQUEST} inputHashes is invalid`];
  }
  for (const [relPath, expectedHash] of Object.entries(inputHashes)) {
    const fullPath = resolve(runDir, relPath);
    const relFromRunDir = relative(runDir, fullPath);
    if (relFromRunDir.startsWith('..') || isAbsolute(relFromRunDir)) {
      issues.push(`design-doc recovery input path escapes the run directory: ${relPath}`);
      continue;
    }
    if (typeof expectedHash !== 'string' || !/^[a-f0-9]{64}$/.test(expectedHash)) {
      issues.push(`design-doc recovery input hash for ${relPath} is invalid`);
      continue;
    }
    if (!isNonEmptyFile(fullPath)) {
      issues.push(`design-doc recovery input changed: ${relPath} is missing or empty`);
      continue;
    }
    if (hashFile(fullPath) !== expectedHash) {
      issues.push(`design-doc recovery input changed: ${relPath}`);
    }
  }
  return issues;
}

function outputDesignDocRecoveryUnverified(runDir, catalog, state, issues) {
  process.stdout.write(`${JSON.stringify({
    workflow: catalog.workflow,
    variant: catalog.variant,
    designSource: state.designSource ?? 'pixso',
    status: state.status,
    currentStage: state.currentStage,
    error: 'design_doc_recovery_unverified',
    issues
  }, null, 2)}\n`);
  process.stderr.write('workflow: design-doc recovery could not be verified; stop and report the real failure\n');
  process.exit(1);
}

function outputSavedDesignDocRecovery(runDir, catalog, state, request) {
  process.stdout.write(`${JSON.stringify({
    workflow: catalog.workflow,
    variant: catalog.variant,
    designSource: state.designSource ?? 'pixso',
    status: state.status,
    currentStage: state.currentStage,
    error: 'design_doc_invalid',
    issues: collectDesignDocEvidenceIssues(runDir),
    nextRequiredAction: request.strategy === 'restore_document'
      ? 'regenerate_design_doc'
      : 'resume_design_generation',
    recovery: request.recovery
  }, null, 2)}\n`);
  process.stderr.write('workflow: design-doc.md is still invalid; complete the pending recovery before retrying\n');
  process.exit(1);
}

// Runs before ordinary gates and design-doc assessments in every mode except
// init. A pending recovery request is either completed (document restored and
// the same-ID solution-design ledger record verified) or it short-circuits the
// call; it can never be silently bypassed.
function checkPendingDesignDocRecovery(runDir, catalog, state) {
  const requestPath = join(runDir, DESIGN_DOC_RECOVERY_REQUEST);
  if (!existsSync(requestPath)) {
    return;
  }
  let request;
  try {
    request = readJsonFile(requestPath);
  } catch (error) {
    outputDesignDocRecoveryUnverified(runDir, catalog, state, [
      `${DESIGN_DOC_RECOVERY_REQUEST} is not valid JSON: ${error.message}`
    ]);
  }
  if (!request || typeof request !== 'object' || Array.isArray(request)) {
    outputDesignDocRecoveryUnverified(runDir, catalog, state, [
      `${DESIGN_DOC_RECOVERY_REQUEST} must contain a JSON object`
    ]);
  }
  if (request.status === 'completed') {
    return;
  }
  if (
    request.status !== 'pending' ||
    request.schemaVersion !== 1 ||
    typeof request.recoveryInvocationId !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(request.recoveryInvocationId) ||
    !['restore_document', 'resume_design_generation'].includes(request.strategy) ||
    !request.recovery ||
    typeof request.recovery !== 'object' ||
    Array.isArray(request.recovery)
  ) {
    outputDesignDocRecoveryUnverified(runDir, catalog, state, [
      `${DESIGN_DOC_RECOVERY_REQUEST} does not match the recovery request schema`
    ]);
  }
  const hashIssues = designDocRecoveryInputHashIssues(runDir, request);
  if (hashIssues.length > 0) {
    outputDesignDocRecoveryUnverified(runDir, catalog, state, hashIssues);
  }
  if (collectDesignDocEvidenceIssues(runDir).length > 0) {
    outputSavedDesignDocRecovery(runDir, catalog, state, request);
  }
  if (!findSolutionDesignLedgerEntry(runDir, request.recoveryInvocationId)) {
    outputDesignDocRecoveryUnverified(runDir, catalog, state, [
      `design-doc.md is valid but capability-invocation-ledger.json has no completed ${SOLUTION_DESIGN_SKILL} record for recovery invocation ${request.recoveryInvocationId}`
    ]);
  }
  writeJsonAtomic(requestPath, { ...request, status: 'completed' });
}

function buildDesignDocAssessmentResponse(runDir, catalog, state, assessment, retry) {
  if (assessment.outcome === 'blocked_missing_upstream_evidence') {
    return {
      workflow: catalog.workflow,
      variant: catalog.variant,
      designSource: state.designSource ?? 'pixso',
      status: state.status,
      currentStage: state.currentStage,
      error: 'design_stage_evidence_incomplete',
      issues: assessment.issues
    };
  }
  return {
    workflow: catalog.workflow,
    variant: catalog.variant,
    designSource: state.designSource ?? 'pixso',
    status: state.status,
    currentStage: state.currentStage,
    error: 'design_doc_invalid',
    issues: assessment.issues,
    nextRequiredAction: assessment.outcome === 'restore_document'
      ? 'regenerate_design_doc'
      : 'resume_design_generation',
    recovery: prepareDesignDocRecovery(runDir, catalog, state, assessment, retry)
  };
}

function outputDesignDocAssessment(runDir, catalog, state, assessment, retry) {
  process.stdout.write(`${JSON.stringify(
    buildDesignDocAssessmentResponse(runDir, catalog, state, assessment, retry),
    null,
    2
  )}\n`);
}

// Recoverable design-doc failures keep the original stderr message and exit
// code; the structured recovery protocol rides on stdout so the parent agent
// can regenerate the document and retry the original operation.
function failWithDesignDocAssessment(runDir, catalog, state, assessment, retry, message) {
  outputDesignDocAssessment(runDir, catalog, state, assessment, retry);
  fail(message);
}

function collectVisualCalibrationEvidenceIssues(runDir, stage) {
  const issues = [];
  const clarification = readJsonOrNull(
    join(runDir, 'requirement-clarification.json'),
    `stage ${stage} requirement clarification`,
    issues
  );
  const report = readJsonOrNull(
    join(runDir, `stage${stage}-visual-calibration-report.json`),
    `stage ${stage} visual calibration report`,
    issues
  );
  if (!clarification || !report) {
    return issues;
  }

  if (clarification.visualCalibration?.enabled === false) {
    if (
      report.status !== 'skipped' ||
      report.reason !== 'visualCalibration.disabled' ||
      report.roundsCompleted !== 0
    ) {
      issues.push(
        `stage ${stage} skipped report must use status=skipped, reason=visualCalibration.disabled, and roundsCompleted=0`
      );
    }
    return issues;
  }

  const threshold =
    typeof clarification.visualCalibration?.scoreThreshold === 'number'
      ? clarification.visualCalibration.scoreThreshold
      : 80;
  // maxRounds is the user-configurable round cap (1-5, default 5). Stage 1
  // validation rejects out-of-range values, so the fallback here is defensive.
  const maxRounds =
    Number.isInteger(clarification.visualCalibration?.maxRounds) &&
    clarification.visualCalibration.maxRounds >= 1 &&
    clarification.visualCalibration.maxRounds <= 5
      ? clarification.visualCalibration.maxRounds
      : 5;
  const roundsCompleted = Number(report.roundsCompleted);
  const validRounds =
    Number.isInteger(roundsCompleted) && roundsCompleted >= 1 && roundsCompleted <= maxRounds;

  if (report.status !== 'completed' || !validRounds) {
    issues.push(
      `stage ${stage} enabled calibration requires status=completed and roundsCompleted between 1 and ${maxRounds}`
    );
  }
  const invocations = Array.isArray(report.capabilityInvocations)
    ? report.capabilityInvocations
    : report.skillInvocations;
  const parentInvocation = Array.isArray(invocations)
    ? invocations.find(
        (item) =>
          (item?.capability === 'hmos-d2a-arkui-scoring-workflow' || item?.skill === 'hmos-d2a-arkui-scoring-workflow') &&
          item?.status === 'completed'
      )
    : null;
  if (!parentInvocation) {
    issues.push(`stage ${stage} report is missing completed hmos-d2a-arkui-scoring-workflow invocation`);
  }

  const upperBound = validRounds ? roundsCompleted : 0;
  for (let round = 1; round <= upperBound; round += 1) {
    const invocation = Array.isArray(invocations)
      ? invocations.find(
          (item) =>
            (item?.capability === 'hmos-d2a-ui-reconstruction-score' || item?.skill === 'hmos-d2a-ui-reconstruction-score') &&
            Number(item?.round) === round &&
            item?.status === 'completed'
          )
        : null;
    if (!invocation) {
      issues.push(`stage ${stage} report is missing completed hmos-d2a-ui-reconstruction-score invocation for round ${round}`);
    }

    const roundEvidence = Array.isArray(report.rounds)
      ? report.rounds.find((item) => Number(item?.round) === round)
      : null;
    if (!roundEvidence) {
      issues.push(`stage ${stage} report is missing evidence for round ${round}`);
      continue;
    }
    for (const [field, label] of [
      ['scoreJson', `stage ${stage} round ${round} score.json`],
      ['metricsJson', `stage ${stage} round ${round} metrics.json`]
    ]) {
      const path = resolveEvidencePath(runDir, roundEvidence[field], label, issues);
      if (path) {
        readJsonOrNull(path, label, issues);
      }
    }
  }

  const validReasons = ['score-threshold-reached', 'max-rounds-reached'];
  if (!validReasons.includes(report.completionReason)) {
    issues.push(
      `stage ${stage} report must include completionReason of score-threshold-reached or max-rounds-reached`
    );
  }
  if (validRounds) {
    const lastRound = Array.isArray(report.rounds)
      ? report.rounds.find((item) => Number(item?.round) === roundsCompleted)
      : null;
    const lastScore = typeof lastRound?.score === 'number' ? lastRound.score : Number.NaN;
    if (
      report.completionReason === 'score-threshold-reached' &&
      (!Number.isFinite(lastScore) || lastScore < threshold)
    ) {
      issues.push(
        `stage ${stage} completionReason=score-threshold-reached requires last round score >= ${threshold}`
      );
    }
    if (
      report.completionReason === 'max-rounds-reached' &&
      (roundsCompleted !== maxRounds || !Number.isFinite(lastScore) || lastScore >= threshold)
    ) {
      issues.push(
        `stage ${stage} completionReason=max-rounds-reached requires roundsCompleted=${maxRounds} and last round score < ${threshold}`
      );
    }
  }

  for (const name of [
    'hmos-d2a-ui-reconstruction-score-invoked',
    'score-artifacts-present',
    'no-direct-compare-images-bypass',
    'calibration-completed'
  ]) {
    if (!reportCheckPassed(report, name)) {
      issues.push(`stage ${stage} report check ${name} must pass`);
    }
  }
  return issues;
}

// Source-agnostic stage 1 evidence: the requirement clarification document is
// created by stage 1 itself, so it must exist and be structurally valid by the
// time stage 1 completes. The controller only validates evidence; it never
// creates, repairs, or rewrites this file.
function collectRequirementClarificationEvidenceIssues(runDir, catalog) {
  const issues = [];
  const clarification = readJsonOrNull(
    join(runDir, 'requirement-clarification.json'),
    'stage 1 requirement clarification',
    issues
  );
  // readJsonOrNull returns null both for missing/unparseable files (issue
  // already recorded) and for a legal JSON null document (no issue yet); the
  // latter must not slip through as a valid document.
  if (clarification === null) {
    if (issues.length === 0) {
      issues.push('stage 1 requirement clarification must be an object');
    }
    return issues;
  }
  if (typeof clarification !== 'object' || Array.isArray(clarification)) {
    issues.push('stage 1 requirement clarification must be an object');
    return issues;
  }
  if (clarification.preCheckCompleted !== true) {
    issues.push('stage 1 requirement clarification preCheckCompleted must be true');
  }
  const expectedSource = catalog.designSource ?? 'pixso';
  if (clarification.designSource !== expectedSource) {
    issues.push(`stage 1 requirement clarification designSource must be ${expectedSource}, got ${clarification.designSource}`);
  }
  // Only a truly absent field (undefined) skips the optional checks; a present
  // null is a type error per the runtime contract.
  if (clarification.visualCalibration !== undefined) {
    if (clarification.visualCalibration === null || typeof clarification.visualCalibration !== 'object' || Array.isArray(clarification.visualCalibration)) {
      issues.push('stage 1 requirement clarification visualCalibration must be an object');
    } else {
      if (clarification.visualCalibration.enabled !== undefined && typeof clarification.visualCalibration.enabled !== 'boolean') {
        issues.push('stage 1 requirement clarification visualCalibration.enabled must be a boolean');
      }
      if (clarification.visualCalibration.scoreThreshold !== undefined && !Number.isFinite(clarification.visualCalibration.scoreThreshold)) {
        issues.push('stage 1 requirement clarification visualCalibration.scoreThreshold must be a finite number');
      }
      if (
        clarification.visualCalibration.maxRounds !== undefined &&
        (!Number.isInteger(clarification.visualCalibration.maxRounds) ||
          clarification.visualCalibration.maxRounds < 1 ||
          clarification.visualCalibration.maxRounds > 5)
      ) {
        issues.push('stage 1 requirement clarification visualCalibration.maxRounds must be an integer between 1 and 5 when present');
      }
    }
  }
  return issues;
}

function collectStageEvidenceIssues(runDir, catalog, stage, ctx = {}) {
  const issues = [];
  const designSource = catalog.designSource ?? 'pixso';
  const visualStage = ['figma', 'mastergo'].includes(designSource) ? 5 : 9;
  if (stage === 1) {
    issues.push(...collectRequirementClarificationEvidenceIssues(runDir, catalog));
  }
  if (designSource === 'figma' && stage === 1) {
    issues.push(...collectFigmaStage1EvidenceIssues(runDir, catalog, ctx));
  }
  if (designSource === 'figma' && stage === 2) {
    issues.push(...collectComponentRecognitionEvidenceIssues(runDir));
    issues.push(...collectPageRegistrationEvidenceIssues(runDir, ctx));
  }
  if (designSource === 'mastergo' && stage === 1) {
    issues.push(...collectMasterGoInputIssues(runDir));
    const manifest = readJsonOrNull(join(runDir, 'inputs-manifest.json'), 'MasterGo inputs manifest', issues);
    if (manifest) issues.push(...collectPageStage1IntegrationIssues(runDir, catalog, manifest, ctx));
  }
  if (designSource === 'mastergo' && stage === 2) {
    issues.push(...collectComponentRecognitionEvidenceIssues(runDir, 'mastergo'));
    issues.push(...collectMasterGoStage2Issues(runDir, { variant: catalog.variant }));
    issues.push(...collectPageRegistrationEvidenceIssues(runDir, { ...ctx, designSource }));
  }
  if (designSource === 'mastergo' && stage >= 3) {
    // The catalog owns report paths; its reuse links identify the shared Figma instructions.
    const definition = catalog.stages[stage - 1];
    const required = definition.requiredOutputs;
    for (const name of required) {
      if (!isNonEmptyFile(join(runDir, name))) issues.push(`stage ${stage} report is missing or empty: ${name}`);
    }
    if (definition.buildEvidence) {
      const report = readJsonOrNull(join(runDir, definition.buildEvidence), 'quality audit', issues);
      if (report?.build?.success !== true || report?.build?.exitCode !== 0 || !report?.build?.command?.trim() || !Number.isFinite(Date.parse(report?.build?.completedAt))) {
        issues.push(`stage ${stage} requires successful final build evidence`);
      }
    }
  }
  if (requiresDesignDocMissingGuard(catalog, stage) && ctx.waiveDesignDocEvidence !== true) {
    issues.push(...collectDesignDocEvidenceIssues(runDir));
    // Live completion of a doc stage must prove the solution-design skill ran;
    // completed-stage replays keep working for runs predating this rule.
    if (ctx.live === true) {
      issues.push(...collectSolutionDesignLedgerIssues(runDir, stage));
    }
  }
  if (catalog.variant === 'full' && stage === visualStage) {
    issues.push(...collectVisualCalibrationEvidenceIssues(runDir, stage));
  }
  return issues;
}

function validatePathWithinSkillRoot(relPath, label, skillRoot) {
  if (typeof relPath !== 'string' || relPath.length === 0) {
    fail(`${label} is missing`);
  }
  if (isAbsolute(relPath)) {
    fail(`${label} must be relative, got absolute path: ${relPath}`);
  }
  const resolved = resolve(skillRoot, relPath);
  const rel = relative(skillRoot, resolved);
  if (rel.startsWith('..') || isAbsolute(rel)) {
    fail(`${label} must stay within the skill root directory: ${relPath}`);
  }
  return resolved;
}

function validateStageCatalog(catalog, expectedVariant, expectedSource, skillRoot) {
  if (catalog.schemaVersion !== 1) {
    fail(`catalog schemaVersion must be 1, got ${catalog.schemaVersion}`);
  }
  if (catalog.workflowVersion !== 4) {
    fail(`catalog workflowVersion must be 4, got ${catalog.workflowVersion}`);
  }
  if (catalog.variant !== expectedVariant) {
    fail(`catalog variant mismatch: expected ${expectedVariant}, got ${catalog.variant}`);
  }
  const catalogSource = catalog.designSource ?? 'pixso';
  if (catalogSource !== expectedSource) {
    fail(`catalog designSource mismatch: expected ${expectedSource}, got ${catalogSource}`);
  }
  if (typeof catalog.workflow !== 'string' || catalog.workflow.length === 0) {
    fail('catalog workflow must be a non-empty string');
  }
  const runtimeContractFullPath = validatePathWithinSkillRoot(catalog.runtimeContractPath, 'catalog runtimeContractPath', skillRoot);
  if (!existsSync(runtimeContractFullPath)) {
    fail(`catalog runtimeContractPath file does not exist: ${catalog.runtimeContractPath}`);
  }
  const stat = statSync(runtimeContractFullPath);
  if (!stat.isFile()) {
    fail(`catalog runtimeContractPath must be a file, not a directory: ${catalog.runtimeContractPath}`);
  }
  if (!catalog.runtimeContractPath.startsWith('references/')) {
    fail(`catalog runtimeContractPath must be under references/: ${catalog.runtimeContractPath}`);
  }
  if (!Array.isArray(catalog.stages) || catalog.stages.length === 0) {
    fail('catalog stages must be a non-empty array');
  }
  const expectedDir = `references/${expectedSource}/${expectedVariant}/stages/`;
  const instructionPaths = new Set();
  for (const [index, stage] of catalog.stages.entries()) {
    const expectedId = index + 1;
    if (stage.id !== expectedId) {
      fail(`catalog stage at index ${index} has id ${stage.id}, expected ${expectedId}`);
    }
    if (typeof stage.title !== 'string' || stage.title.length === 0) {
      fail(`catalog stage ${expectedId} title is missing`);
    }
    const instructionFullPath = validatePathWithinSkillRoot(stage.instructionPath, `catalog stage ${expectedId} instructionPath`, skillRoot);
    if (!stage.instructionPath.startsWith(expectedDir)) {
      fail(`catalog stage ${expectedId} instructionPath must be under ${expectedDir}: ${stage.instructionPath}`);
    }
    if (instructionPaths.has(stage.instructionPath)) {
      fail(`duplicate catalog instructionPath: ${stage.instructionPath}`);
    }
    instructionPaths.add(stage.instructionPath);
    if (!existsSync(instructionFullPath)) {
      fail(`catalog stage ${expectedId} instruction file does not exist: ${stage.instructionPath}`);
    }
    const instructionStat = statSync(instructionFullPath);
    if (!instructionStat.isFile()) {
      fail(`catalog stage ${expectedId} instructionPath must be a file: ${stage.instructionPath}`);
    }
    if (catalogSource === 'mastergo' && stage.id >= 3) {
      if (!Array.isArray(stage.requiredOutputs) || stage.requiredOutputs.some((file) => typeof file !== 'string' || !/^[a-z0-9-]+\.(?:md|json)$/.test(file)) || new Set(stage.requiredOutputs).size !== stage.requiredOutputs.length) {
        fail(`catalog stage ${expectedId} requiredOutputs must be unique run-relative report names`);
      }
      if (stage.buildEvidence !== undefined && !stage.requiredOutputs.includes(stage.buildEvidence)) {
        fail(`catalog stage ${expectedId} buildEvidence must be a required output`);
      }
    }
    if (typeof stage.requiresConfirmation !== 'boolean') {
      fail(`catalog stage ${expectedId} requiresConfirmation must be boolean`);
    }
    if (
      stage.confirmationContinuesStage !== undefined &&
      typeof stage.confirmationContinuesStage !== 'boolean'
    ) {
      fail(`catalog stage ${expectedId} confirmationContinuesStage must be boolean when present`);
    }
    if (stage.confirmationContinuesStage === true && stage.requiresConfirmation !== true) {
      fail(`catalog stage ${expectedId} confirmationContinuesStage requires requiresConfirmation=true`);
    }
    if (expectedSource === 'mastergo' && stage.id >= 3) {
      const reusedPath = validatePathWithinSkillRoot(stage.reusesInstructionPath, 'reused stage instruction', skillRoot);
      if (!existsSync(reusedPath) || !statSync(reusedPath).isFile()) {
        fail(`reused stage instruction is missing: ${stage.reusesInstructionPath}`);
      }
    }
  }
}

function computeWorkflowDigest(skillRoot, catalog, catalogRelPath) {
  const paths = [
    catalogRelPath,
    catalog.runtimeContractPath,
    ...catalog.stages.map((s) => s.instructionPath)
  ];
  if (catalog.designSource === 'mastergo') {
    paths.push('scripts/mastergo-community-start.mjs', 'scripts/mastergo-community-verify.mjs', 'references/mastergo/community/manifest.json', 'references/mastergo/community/README.md', 'scripts/mastergo-source.mjs', 'scripts/mastergo-capture.mjs', 'scripts/mastergo-connection.mjs', 'scripts/mastergo-evidence.mjs', 'references/runtime-contract.md', 'references/mastergo/input-contract.md', 'references/mastergo/acquire.md', 'references/mastergo/convert.md', 'references/mastergo/mcp-setup.md', 'references/capabilities/hmos-d2a-mastergo-to-arkui/INSTRUCTIONS.md');
    paths.push(...catalog.stages.filter((stage) => stage.id >= 3).map((stage) => stage.reusesInstructionPath).filter(Boolean));
  }
  const normalized = paths.map((p) => p.replace(/\\/g, '/')).sort();
  const hash = createHash('sha256');
  for (const p of normalized) {
    const fullPath = join(skillRoot, p);
    if (!existsSync(fullPath)) {
      fail(`workflow digest: file does not exist: ${p}`);
    }
    hash.update(Buffer.from(p, 'utf8'));
    hash.update(Buffer.from([0]));
    hash.update(readFileSync(fullPath));
    hash.update(Buffer.from([0]));
  }
  return 'sha256:' + hash.digest('hex');
}

function validateState(state, catalog) {
  if (state.schemaVersion !== 2) {
    fail(`workflow-state schemaVersion must be 2, got ${state.schemaVersion}`);
  }
  if (state.workflowVersion !== 4) {
    fail(`workflow-state workflowVersion must be 4, got ${state.workflowVersion}; reinitialize this run`);
  }
  if (state.workflow !== catalog.workflow) {
    fail(`workflow-state.workflow mismatch: expected ${catalog.workflow}, got ${state.workflow}`);
  }
  if (state.variant !== catalog.variant) {
    fail(`workflow-state.variant mismatch: expected ${catalog.variant}, got ${state.variant}`);
  }
  const stateSource = state.designSource ?? 'pixso';
  const catalogSource = catalog.designSource ?? 'pixso';
  if (stateSource !== catalogSource) {
    fail(`workflow-state.designSource mismatch: expected ${catalogSource}, got ${stateSource}`);
  }
  if (typeof state.workflowDigest !== 'string' || state.workflowDigest.length === 0) {
    fail('workflow-state.workflowDigest is missing');
  }
  if (!Number.isInteger(state.currentStage) || state.currentStage < 1 || state.currentStage > catalog.stages.length) {
    fail(`workflow-state.currentStage must be an integer from 1 to ${catalog.stages.length}`);
  }
  if (!Array.isArray(state.completedStages)) {
    fail('workflow-state.completedStages must be an array');
  }
  for (const [index, value] of state.completedStages.entries()) {
    const expected = index + 1;
    if (value !== expected) {
      fail(`workflow-state.completedStages must be consecutive from 1; got ${value} at index ${index}, expected ${expected}`);
    }
  }
  if (state.completedStages.length !== state.currentStage - 1 && state.status !== 'completed') {
    fail(`workflow-state.completedStages length (${state.completedStages.length}) must equal currentStage - 1 (${state.currentStage - 1})`);
  }
  if (state.status === 'completed' && state.completedStages.length !== catalog.stages.length) {
    fail('workflow-state is completed but completedStages does not cover all stages');
  }
  const validStatuses = ['running', 'awaiting_confirmation', 'blocked', 'completed'];
  if (!validStatuses.includes(state.status)) {
    fail(`workflow-state.status must be one of ${validStatuses.join(', ')}, got ${state.status}`);
  }
  if (state.status === 'awaiting_confirmation') {
    if (state.awaitingConfirmationFor !== state.currentStage) {
      fail(`workflow-state.awaitingConfirmationFor must equal currentStage when awaiting_confirmation`);
    }
  }
  if (state.status === 'blocked' && (!state.blockedReasonCode || typeof state.blockedReasonCode !== 'string')) {
    fail('workflow-state.blockedReasonCode must be a non-empty string when status is blocked');
  }
  if (!Array.isArray(state.confirmedStages)) {
    fail('workflow-state.confirmedStages must be an array');
  }
  const confirmedSet = new Set(state.confirmedStages);
  if (confirmedSet.size !== state.confirmedStages.length) {
    fail('workflow-state.confirmedStages must not contain duplicates');
  }
  for (const stageId of state.confirmedStages) {
    if (!Number.isInteger(stageId) || stageId < 1 || stageId > catalog.stages.length) {
      fail(`workflow-state.confirmedStages contains invalid stage id: ${stageId}`);
    }
    if (!catalog.stages[stageId - 1].requiresConfirmation) {
      fail(`workflow-state.confirmedStages contains stage ${stageId} which does not require confirmation`);
    }
  }
  if (state.confirmationSnapshots !== undefined) {
    if (!state.confirmationSnapshots || typeof state.confirmationSnapshots !== 'object' || Array.isArray(state.confirmationSnapshots)) {
      fail('workflow-state.confirmationSnapshots must be an object');
    }
    for (const [stageKey, snapshot] of Object.entries(state.confirmationSnapshots)) {
      const stageId = Number(stageKey);
      if (
        !Number.isInteger(stageId) ||
        stageId < 1 ||
        stageId > catalog.stages.length ||
        !catalog.stages[stageId - 1].requiresConfirmation ||
        snapshot?.stage !== stageId ||
        !snapshot.files ||
        typeof snapshot.files !== 'object'
      ) {
        fail(`workflow-state.confirmationSnapshots contains invalid stage snapshot: ${stageKey}`);
      }
    }
  }
}

function checkDigest(state, catalog, skillRoot, catalogRelPath) {
  const currentDigest = computeWorkflowDigest(skillRoot, catalog, catalogRelPath);
  if (currentDigest !== state.workflowDigest) {
    return {
      mismatch: true,
      expected: state.workflowDigest,
      actual: currentDigest
    };
  }
  return { mismatch: false };
}

function deriveTodo(catalog, state) {
  return catalog.stages.map((stage) => {
    let status;
    if (state.status === 'completed') {
      status = 'completed';
    } else if (state.completedStages.includes(stage.id)) {
      status = 'completed';
    } else if (stage.id === state.currentStage) {
      status = 'in_progress';
    } else {
      status = 'pending';
    }
    return {
      content: stage.title,
      status,
      priority: 'high'
    };
  });
}

function writeTodoPayload(runDir, catalog, state) {
  const payload = {
    workflow: catalog.workflow,
    variant: catalog.variant,
    designSource: state.designSource ?? 'pixso',
    todos: deriveTodo(catalog, state)
  };
  writeJsonAtomic(join(runDir, 'todo-payload.json'), payload);
  return payload;
}

function checkCompletedGateIssues(runDir, catalog, stage, state, evidenceContext = {}) {
  const gate = readGate(runDir, stage);
  if (!gate) {
    return [`stage ${stage} gate is missing`];
  }
  if (!isPassed(gate)) {
    return [`stage ${stage} gate status must be passed, got ${gate.status}`];
  }
  if (Number(gate.stage) !== stage) {
    return [`stage ${stage} gate.stage must equal ${stage}`];
  }
  return [
    ...collectStageEvidenceIssues(runDir, catalog, stage, evidenceContext),
    ...(requiresPageStage2Confirmation(catalog, stage)
      ? collectPageStage2ConfirmationSnapshotIssues(runDir, catalog, state)
      : [])
  ];
}

function collectCompletedGateIssues(runDir, catalog, state, evidenceContext = {}) {
  return state.completedStages.flatMap((stage) => checkCompletedGateIssues(runDir, catalog, stage, state, evidenceContext));
}

function loadCatalogForVariant(skillRoot, variant, designSource = 'pixso') {
  if (!VALID_SOURCES.has(designSource)) {
    fail(`design source must be one of ${[...VALID_SOURCES].join(', ')}`);
  }
  const catalogRelPath = `references/${designSource}/stage-catalog-${variant}.json`;
  const catalogPath = join(skillRoot, catalogRelPath);
  const catalog = readJson(catalogPath, 'stage catalog');
  validateStageCatalog(catalog, variant, designSource, skillRoot);
  return { catalog, catalogRelPath };
}

function loadCatalogFromState(skillRoot, runDir) {
  const statePath = join(runDir, 'workflow-state.json');
  const state = readJson(statePath, 'workflow-state');
  if (!state.variant || !['full', 'fast'].includes(state.variant)) {
    fail('workflow-state.variant is missing or invalid');
  }
  const designSource = state.designSource ?? 'pixso';
  if (!VALID_SOURCES.has(designSource)) {
    fail('workflow-state.designSource is invalid');
  }
  const { catalog, catalogRelPath } = loadCatalogForVariant(skillRoot, state.variant, designSource);
  validateState(state, catalog);
  return { state, catalog, catalogRelPath, statePath };
}

function outputDigestError(state, catalog, digestResult) {
  process.stdout.write(`${JSON.stringify({
    workflow: catalog.workflow,
    variant: catalog.variant,
    designSource: state.designSource ?? 'pixso',
    status: state.status,
    currentStage: state.currentStage,
    error: 'workflow_digest_mismatch',
    message: 'Workflow instruction files have changed since initialization. Reinitialize this run to use the updated files.',
    expectedDigest: digestResult.expected,
    actualDigest: digestResult.actual
  }, null, 2)}\n`);
  process.exit(1);
}

function isCurrentStageConfirmed(state, catalog) {
  const stageInfo = catalog.stages[state.currentStage - 1];
  return stageInfo?.requiresConfirmation === true &&
    Array.isArray(state.confirmedStages) &&
    state.confirmedStages.includes(state.currentStage);
}

function confirmedStageNextAction(state, catalog) {
  if (!isCurrentStageConfirmed(state, catalog)) {
    return null;
  }
  return catalog.stages[state.currentStage - 1].confirmationContinuesStage === true
    ? 'resume_confirmed_stage'
    : 'stage_complete';
}

function checkPendingCurrentGate(runDir, state) {
  if (state.completedStages.includes(state.currentStage)) {
    return null;
  }
  const gate = readGate(runDir, state.currentStage);
  if (!gate) {
    return null;
  }
  if (Number(gate.stage) !== state.currentStage) {
    return { error: 'current_stage_gate_invalid', issues: [`gate.stage ${gate.stage} does not match currentStage ${state.currentStage}`] };
  }
  if (gate.status === 'passed') {
    return { completionResult: 'passed' };
  }
  if (gate.status === 'blocked') {
    if (!gate.reasonCode || !VALID_REASON_CODES.has(gate.reasonCode)) {
      return { error: 'current_stage_gate_invalid', issues: [`blocked gate has invalid reasonCode: ${gate.reasonCode}`] };
    }
    return { completionResult: 'blocked', reasonCode: gate.reasonCode };
  }
  return { error: 'current_stage_gate_invalid', issues: [`gate status ${gate.status} is not passed or blocked`] };
}

function deriveNextRequiredAction(state, catalog, runDir) {
  if (state.status === 'completed') {
    return 'sync_final_todo_then_finish';
  }
  if (state.status === 'blocked') {
    return 'resolve_blocking_issue';
  }
  if (state.status === 'awaiting_confirmation') {
    // A valid blocked gate for the current stage means a blocked write was
    // interrupted before the state advanced; replaying the blocked completion
    // takes precedence over resuming the confirmation question. Invalid gates
    // never reach here as an action: status fails earlier with
    // current_stage_gate_invalid.
    const pendingGate = checkPendingCurrentGate(runDir, state);
    if (pendingGate?.completionResult === 'blocked') {
      return 'stage_complete';
    }
    return 'resume_confirmation';
  }
  const pendingGate = checkPendingCurrentGate(runDir, state);
  if (pendingGate) {
    return 'stage_complete';
  }
  const confirmationAction = confirmedStageNextAction(state, catalog);
  if (confirmationAction) {
    return confirmationAction;
  }
  return 'stage_start';
}

function gateSemanticEquals(gate, stage, expectedStatus, expectedReasonCode) {
  if (Number(gate.stage) !== stage) {
    return false;
  }
  if (gate.status !== expectedStatus) {
    return false;
  }
  if (expectedStatus === 'blocked') {
    return gate.reasonCode === expectedReasonCode;
  }
  return true;
}

function buildCanonicalGate(stage, result, reasonCode, now) {
  const gate = {
    stage,
    status: result,
    completedAt: now,
  };
  if (result === 'blocked') {
    gate.reasonCode = reasonCode;
  }
  return gate;
}

const args = parseArgs(process.argv.slice(2));
const mode = args.mode;
if (!VALID_MODES.has(mode)) {
  fail(`--mode must be one of ${[...VALID_MODES].join(', ')}`);
}
if (!args['run-dir']) {
  fail('--run-dir is required');
}

const scriptPath = fileURLToPath(import.meta.url);
const skillRoot = dirname(dirname(scriptPath));
const runDir = isAbsolute(args['run-dir']) ? resolve(args['run-dir']) : resolve(process.cwd(), args['run-dir']);

if (mode === 'init') {
  const variant = args.variant;
  if (!['full', 'fast'].includes(variant)) {
    fail('--variant must be full or fast');
  }
  const designSource = args.source ?? 'pixso';
  if (!VALID_SOURCES.has(designSource)) {
    fail(`--source must be one of ${[...VALID_SOURCES].join(', ')}`);
  }
  const statePath = join(runDir, 'workflow-state.json');
  if (existsSync(statePath)) {
    fail('workflow-state.json already exists; refusing to overwrite. Use status to inspect or delete the run directory to reinitialize.');
  }
  const { catalog, catalogRelPath } = loadCatalogForVariant(skillRoot, variant, designSource);
  const digest = computeWorkflowDigest(skillRoot, catalog, catalogRelPath);
  mkdirSync(join(runDir, 'stage-gates'), { recursive: true });
  if (['figma', 'mastergo'].includes(designSource)) {
    mkdirSync(join(runDir, 'source', designSource), { recursive: true });
  }
  const now = new Date().toISOString();
  const responseLanguage = args.language || 'zh-CN';
  const state = {
    schemaVersion: 2,
    workflowVersion: 4,
    workflow: catalog.workflow,
    variant,
    designSource,
    workflowDigest: digest,
    responseLanguage,
    currentStage: 1,
    completedStages: [],
    confirmedStages: [],
    confirmationSnapshots: {},
    status: 'running',
    awaitingConfirmationFor: null,
    blockedReasonCode: null,
    createdAt: now,
    updatedAt: now
  };
  writeJsonAtomic(statePath, state);
  writeTodoPayload(runDir, catalog, state);
  process.stdout.write(`${JSON.stringify({
    workflow: catalog.workflow,
    variant,
    designSource,
    status: 'running',
    currentStage: 1,
    nextRequiredAction: 'stage_start'
  }, null, 2)}\n`);
  process.exit(0);
}

if (!existsSync(runDir)) {
  fail(`run directory does not exist: ${runDir}`);
}

const { state, catalog, catalogRelPath, statePath } = loadCatalogFromState(skillRoot, runDir);

const digestResult = checkDigest(state, catalog, skillRoot, catalogRelPath);
if (digestResult.mismatch) {
  outputDigestError(state, catalog, digestResult);
}

// A new acquisition never mutates frozen inputs or inherits an old human confirmation.
if (state.reacquisition) {
  if (mode !== 'status') fail(`run superseded by reacquisition: ${state.reacquisition.runDir}`);
  process.stdout.write(`${JSON.stringify({ status: 'blocked', nextRequiredAction: 'continue_reacquisition', ...state.reacquisition }, null, 2)}\n`);
  process.exit(0);
}
if (mode === 'reacquire') {
  if (state.designSource !== 'mastergo' || state.currentStage !== 2 || !['running', 'awaiting_confirmation', 'blocked'].includes(state.status)) {
    fail('reacquire requires a MasterGo run in stage 2');
  }
  const reason = args.reason?.trim();
  if (!reason || reason.length > 1000) fail('--reason must explain the missing or changed design input (1–1000 characters)');
  const parent = realpathSync(dirname(runDir));
  const newRun = resolve(args['new-run-dir'] ?? runDir);
  // Compare both parents after resolving aliases such as macOS /tmp and /var.
  if (!statSync(dirname(newRun), { throwIfNoEntry: false })?.isDirectory() || realpathSync(dirname(newRun)) !== parent || !/^[a-zA-Z0-9_-]+$/.test(basename(newRun)) || newRun === realpathSync(runDir)) {
    fail('--new-run-dir must name a new sibling run using letters, digits, hyphens or underscores');
  }
  if (lstatSync(newRun, { throwIfNoEntry: false })) fail('reacquisition destination already exists');
  mkdirSync(newRun);
  const init = spawnSync(process.execPath, [scriptPath, '--mode', 'init', '--source', 'mastergo', '--variant', state.variant, '--language', state.responseLanguage ?? 'zh-CN', '--run-dir', newRun], { encoding: 'utf8' });
  if (init.status !== 0) {
    const detail = (init.error?.message || init.stderr?.trim() || `exit ${init.status ?? init.signal ?? 'unknown'}`).slice(-2000);
    try {
      // This directory did not exist before this invocation; discard only the failed new run.
      rmSync(newRun, { recursive: true });
    } catch (error) {
      fail(`unable to initialize reacquisition run (${detail}); original run is unchanged; unable to clean new run ${newRun} (${error.code})`);
    }
    fail(`unable to initialize reacquisition run (${detail}); original run is unchanged`);
  }
  const now = new Date().toISOString();
  const reacquisition = { runDir: newRun, reason, createdAt: now };
  writeJsonAtomic(join(newRun, 'reacquisition-origin.json'), { runDir: realpathSync(runDir), reason, createdAt: now });
  writeJsonAtomic(gatePath(runDir, 2), buildCanonicalGate(2, 'blocked', 'missing_asset', now));
  writeJsonAtomic(statePath, { ...state, status: 'blocked', awaitingConfirmationFor: null, blockedReasonCode: 'missing_asset', reacquisition, updatedAt: now });
  process.stdout.write(`${JSON.stringify({ status: 'running', currentStage: 1, nextRequiredAction: 'stage_start', ...reacquisition }, null, 2)}\n`);
  process.exit(0);
}

// Validation context derived once per invocation from the persisted state.
// stage2 describes how the current run relates to the run-index (see
// derivePageStage2IndexContext) so that completed-stage replays, interrupted
// recovery windows, and pre-commit checks each get the right strictness.
const evidenceContext = { stage2: derivePageStage2IndexContext(runDir, catalog, state) };

// Every non-init mode settles a pending design-doc recovery request before any
// gate validation or design-doc assessment runs.
checkPendingDesignDocRecovery(runDir, catalog, state);

if (mode === 'status') {
  // A blocked run must keep reporting its original blocker; a missing
  // design-doc.md in a completed stage is waived so it neither errors nor
  // triggers recovery. Other gate structure and non-doc evidence stay checked.
  const statusEvidenceContext = state.status === 'blocked'
    ? { ...evidenceContext, waiveDesignDocEvidence: true }
    : evidenceContext;
  const gateIssues = collectCompletedGateIssues(runDir, catalog, state, statusEvidenceContext);
  // For non-terminal states an invalid current-stage gate is an error, not a
  // nextRequiredAction. Checked once here for both Figma and Pixso so the
  // error always precedes confirmation-snapshot issues and todo writes.
  let statusPendingGate = null;
  if (state.status === 'running' || state.status === 'awaiting_confirmation') {
    statusPendingGate = checkPendingCurrentGate(runDir, state);
    if (statusPendingGate?.error) {
      process.stdout.write(`${JSON.stringify({
        workflow: catalog.workflow,
        variant: catalog.variant,
        designSource: state.designSource ?? 'pixso',
        status: state.status,
        currentStage: state.currentStage,
        error: statusPendingGate.error,
        issues: statusPendingGate.issues
      }, null, 2)}\n`);
      process.exit(1);
    }
  }
  // A pending blocked gate means the blocked write was interrupted before the
  // state advanced; replaying the blocked completion takes precedence over
  // every completed-stage evidence error below (including design-doc
  // recovery) so the state write can be completed first.
  const recoveringBlockedWrite = statusPendingGate?.completionResult === 'blocked';
  if (!recoveringBlockedWrite && state.status !== 'blocked') {
    // A completed doc stage with an invalid design-doc.md is assessed first so
    // recovery (or the explicit evidence-incomplete block) takes priority over
    // the generic completed-stage gate error below.
    const docStage = designDocStage(catalog);
    if (requiresDesignDocMissingGuard(catalog, docStage) && state.completedStages.includes(docStage)) {
      const assessment = assessDesignDocRecovery(runDir, catalog, state);
      if (assessment.outcome !== 'none') {
        outputDesignDocAssessment(runDir, catalog, state, assessment, { mode: 'status' });
        process.exit(1);
      }
    }
  }
  if (!recoveringBlockedWrite && gateIssues.length > 0) {
    process.stdout.write(`${JSON.stringify({
      workflow: catalog.workflow,
      variant: catalog.variant,
      designSource: state.designSource ?? 'pixso',
      status: state.status,
      currentStage: state.currentStage,
      error: 'completed_stage_gate_invalid',
      issues: gateIssues
    }, null, 2)}\n`);
    process.exit(1);
  }
  if (
    state.status === 'awaiting_confirmation' &&
    requiresDesignDocMissingGuard(catalog, state.currentStage) &&
    !recoveringBlockedWrite
  ) {
    const assessment = assessDesignDocRecovery(runDir, catalog, state);
    if (assessment.outcome !== 'none') {
      outputDesignDocAssessment(runDir, catalog, state, assessment, { mode: 'status' });
      process.exit(1);
    }
  }
  if (
    state.status === 'awaiting_confirmation' &&
    requiresPageStage2Confirmation(catalog, state.currentStage)
  ) {
    // Recovering an already-written blocked result must not depend on the
    // current stage's confirmation materials still being intact. Normal
    // confirmation waiting (and every passed path) keeps the snapshot check.
    // Invalid gates already failed above, so the gate error keeps priority
    // over missing or corrupted confirmation snapshots.
    if (!recoveringBlockedWrite) {
      const snapshotIssues = collectPageStage2ConfirmationSnapshotIssues(runDir, catalog, state);
      if (snapshotIssues.length > 0) {
        process.stdout.write(`${JSON.stringify({
          workflow: catalog.workflow,
          variant: catalog.variant,
          designSource: state.designSource ?? 'pixso',
          status: state.status,
          currentStage: state.currentStage,
          error: 'confirmation_snapshot_invalid',
          issues: snapshotIssues
        }, null, 2)}\n`);
        process.exit(1);
      }
    }
  }
  const payload = writeTodoPayload(runDir, catalog, state);
  const nextRequiredAction = deriveNextRequiredAction(state, catalog, runDir);
  const result = {
    workflow: catalog.workflow,
    variant: catalog.variant,
    designSource: state.designSource ?? 'pixso',
    status: state.status,
    currentStage: state.currentStage,
    completedStages: state.completedStages,
    awaitingConfirmationFor: state.awaitingConfirmationFor,
    blockedReasonCode: state.blockedReasonCode,
    nextRequiredAction
  };
  if (state.status === 'completed') {
    result.todoPayloadPath = join(runDir, 'todo-payload.json');
  }
  if (state.status === 'awaiting_confirmation') {
    result.instructionPath = catalog.stages[state.currentStage - 1].instructionPath;
  }
  if (nextRequiredAction === 'resume_confirmed_stage') {
    result.instructionPath = catalog.stages[state.currentStage - 1].instructionPath;
  }
  if (nextRequiredAction === 'stage_complete') {
    // Invalid gates already exited above with current_stage_gate_invalid; the
    // pending gate here is a valid one (or absent for a confirmed stage).
    if (statusPendingGate) {
      result.completionResult = statusPendingGate.completionResult;
      if (statusPendingGate.reasonCode) {
        result.reasonCode = statusPendingGate.reasonCode;
      }
    } else {
      result.completionResult = 'passed';
    }
  }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(0);
}

if (mode === 'stage-start') {
  const requestedStage = Number(args.stage);
  if (!Number.isInteger(requestedStage) || requestedStage < 1 || requestedStage > catalog.stages.length) {
    fail(`--stage must be an integer from 1 to ${catalog.stages.length}`);
  }
  const issues = collectCompletedGateIssues(runDir, catalog, state, evidenceContext);
  if (state.status === 'blocked') {
    issues.push(`workflow is blocked: ${state.blockedReasonCode}`);
  } else if (state.status === 'completed') {
    issues.push('workflow is already completed');
  } else if (state.status === 'awaiting_confirmation') {
    issues.push(`workflow is awaiting confirmation for stage ${state.awaitingConfirmationFor}`);
    if (requiresPageStage2Confirmation(catalog, requestedStage)) {
      issues.push(...collectPageStage2ConfirmationSnapshotIssues(runDir, catalog, state));
    }
  }
  if (state.status === 'running' && isCurrentStageConfirmed(state, catalog)) {
    const action = confirmedStageNextAction(state, catalog);
    issues.push(
      action === 'resume_confirmed_stage'
        ? `stage ${requestedStage} has been confirmed; resume the loaded stage without another stage-start`
        : `stage ${requestedStage} has been confirmed; call stage-complete --result passed`
    );
  }
  // Check pending current gate
  let pendingGateResult = null;
  if (state.status === 'running' && !state.completedStages.includes(requestedStage) && requestedStage === state.currentStage) {
    pendingGateResult = checkPendingCurrentGate(runDir, state);
    if (pendingGateResult?.error) {
      process.stdout.write(`${JSON.stringify({
        ready: false,
        error: pendingGateResult.error,
        stage: requestedStage,
        issues: pendingGateResult.issues
      }, null, 2)}\n`);
      process.exit(1);
    }
    if (pendingGateResult) {
      issues.push(`stage ${requestedStage} has a pending gate; call stage-complete --result ${pendingGateResult.completionResult}`);
    }
  }
  if (requestedStage !== state.currentStage) {
    issues.push(`requested stage ${requestedStage} differs from currentStage ${state.currentStage}`);
  }
  const uniqueIssues = [...new Set(issues)];
  const ready = uniqueIssues.length === 0;
  const docStage = designDocStage(catalog);
  const completedDocAssessment =
    requiresDesignDocMissingGuard(catalog, docStage) && state.completedStages.includes(docStage)
      ? assessDesignDocRecovery(runDir, catalog, state)
      : { outcome: 'none', issues: [] };
  const designDocRecoveryNeeded = completedDocAssessment.outcome === 'restore_document' ||
    completedDocAssessment.outcome === 'resume_design_generation';
  const designDocEvidenceIncomplete = completedDocAssessment.outcome === 'blocked_missing_upstream_evidence';
  // Priority: blocked-gate recovery > design-doc recovery > design-doc evidence
  // block > pending passed gate > confirmed-stage continuation > generic
  // issue resolution.
  let nextRequiredAction;
  if (ready) {
    nextRequiredAction = 'load_instruction_then_sync_todo_then_run_stage';
  } else if (pendingGateResult?.completionResult === 'blocked') {
    nextRequiredAction = 'stage_complete';
  } else if (designDocRecoveryNeeded) {
    nextRequiredAction = completedDocAssessment.outcome === 'restore_document'
      ? 'regenerate_design_doc'
      : 'resume_design_generation';
  } else if (designDocEvidenceIncomplete) {
    nextRequiredAction = 'resolve_issues';
  } else if (pendingGateResult) {
    nextRequiredAction = 'stage_complete';
  } else if (state.status === 'running' && isCurrentStageConfirmed(state, catalog)) {
    nextRequiredAction = confirmedStageNextAction(state, catalog);
  } else {
    nextRequiredAction = 'resolve_issues';
  }
  const result = {
    ready,
    nextRequiredAction,
    stage: requestedStage,
    designSource: state.designSource ?? 'pixso',
    title: catalog.stages[requestedStage - 1]?.title,
    requiresConfirmation: catalog.stages[requestedStage - 1]?.requiresConfirmation ?? false,
    issues: uniqueIssues
  };
  if (nextRequiredAction === 'regenerate_design_doc' || nextRequiredAction === 'resume_design_generation') {
    result.error = 'design_doc_invalid';
    result.recovery = prepareDesignDocRecovery(runDir, catalog, state, completedDocAssessment, {
      mode: 'stage-start',
      stage: requestedStage
    });
  }
  if (designDocEvidenceIncomplete && nextRequiredAction === 'resolve_issues') {
    result.error = 'design_stage_evidence_incomplete';
  }
  if (ready) {
    result.instructionPath = catalog.stages[requestedStage - 1].instructionPath;
    writeTodoPayload(runDir, catalog, state);
    result.todoPayloadPath = join(runDir, 'todo-payload.json');
  }
  if (pendingGateResult && !ready) {
    result.completionResult = pendingGateResult.completionResult;
    if (pendingGateResult.reasonCode) {
      result.reasonCode = pendingGateResult.reasonCode;
    }
  }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(0);
}

if (mode === 'confirm') {
  const requestedStage = Number(args.stage);
  if (!Number.isInteger(requestedStage) || requestedStage < 1 || requestedStage > catalog.stages.length) {
    fail(`--stage must be an integer from 1 to ${catalog.stages.length}`);
  }
  const decision = args.decision;
  if (!decision || !VALID_DECISIONS.has(decision)) {
    fail(`--decision must be one of ${[...VALID_DECISIONS].join(', ')}`);
  }
  if (requestedStage !== state.currentStage) {
    fail(`can only confirm the current stage ${state.currentStage}, got ${requestedStage}`);
  }
  const stageInfo = catalog.stages[requestedStage - 1];
  if (!stageInfo.requiresConfirmation) {
    fail(`stage ${requestedStage} does not require confirmation`);
  }
  // Checked before any evidence validation so a blocked (or otherwise
  // non-running) run can never be handed a design-doc recovery action.
  if (decision === 'request' && state.status !== 'running') {
    fail(`request decision requires status running, got ${state.status}`);
  }
  const gateIssues = collectCompletedGateIssues(runDir, catalog, state, evidenceContext);
  if (gateIssues.length > 0) {
    const docStage = designDocStage(catalog);
    if (requiresDesignDocMissingGuard(catalog, docStage) && state.completedStages.includes(docStage)) {
      const assessment = assessDesignDocRecovery(runDir, catalog, state);
      if (assessment.outcome !== 'none') {
        failWithDesignDocAssessment(
          runDir,
          catalog,
          state,
          assessment,
          { mode: 'confirm', stage: requestedStage, decision },
          `cannot confirm: completed stage gate issues: ${gateIssues.join('; ')}`
        );
      }
    }
    fail(`cannot confirm: completed stage gate issues: ${gateIssues.join('; ')}`);
  }
  let requestedConfirmationSnapshot = null;
  if (decision === 'request' && isPageStage2(catalog, requestedStage)) {
    const evidenceIssues = collectComponentRecognitionEvidenceIssues(runDir, catalog.designSource);
    if (catalog.designSource === 'mastergo') {
      evidenceIssues.push(...collectMasterGoStage2Issues(runDir, { proposal: true, variant: catalog.variant }));
    }
    if (evidenceIssues.length > 0) {
      fail(`cannot request confirmation: ${evidenceIssues.join('; ')}`);
    }
    requestedConfirmationSnapshot = buildPageStage2ConfirmationSnapshot(runDir, catalog, evidenceIssues);
    if (evidenceIssues.length > 0) {
      fail(`cannot request confirmation: ${evidenceIssues.join('; ')}`);
    }
  }
  if (decision === 'request' && requiresDesignDocMissingGuard(catalog, requestedStage)) {
    const assessment = assessDesignDocRecovery(runDir, catalog, state);
    if (assessment.outcome !== 'none') {
      failWithDesignDocAssessment(
        runDir,
        catalog,
        state,
        assessment,
        { mode: 'confirm', stage: requestedStage, decision: 'request' },
        `cannot request confirmation: ${assessment.issues.join('; ')}`
      );
    }
  }
  const now = new Date().toISOString();
  let newState;
  if (decision === 'request') {
    newState = {
      ...state,
      status: 'awaiting_confirmation',
      awaitingConfirmationFor: requestedStage,
      ...(requestedConfirmationSnapshot && {
        confirmationSnapshots: {
          ...(state.confirmationSnapshots ?? {}),
          [String(requestedStage)]: requestedConfirmationSnapshot
        }
      }),
      updatedAt: now
    };
  } else if (decision === 'accepted') {
    if (state.status !== 'awaiting_confirmation') {
      fail(`accepted decision requires status awaiting_confirmation, got ${state.status}`);
    }
    if (state.awaitingConfirmationFor !== requestedStage) {
      fail(`awaitingConfirmationFor (${state.awaitingConfirmationFor}) does not match requested stage (${requestedStage})`);
    }
    if (isPageStage2(catalog, requestedStage)) {
      const snapshotIssues = collectPageStage2ConfirmationSnapshotIssues(runDir, catalog, state);
      if (snapshotIssues.length > 0) {
        fail(`cannot accept confirmation: ${snapshotIssues.join('; ')}`);
      }
    }
    if (requiresDesignDocMissingGuard(catalog, requestedStage)) {
      const assessment = assessDesignDocRecovery(runDir, catalog, state);
      if (assessment.outcome !== 'none') {
        failWithDesignDocAssessment(
          runDir,
          catalog,
          state,
          assessment,
          { mode: 'confirm', stage: requestedStage, decision: 'accepted' },
          `cannot accept confirmation: ${assessment.issues.join('; ')}`
        );
      }
    }
    const confirmedStages = Array.isArray(state.confirmedStages) ? [...state.confirmedStages] : [];
    if (!confirmedStages.includes(requestedStage)) {
      confirmedStages.push(requestedStage);
    }
    newState = {
      ...state,
      status: 'running',
      awaitingConfirmationFor: null,
      confirmedStages,
      updatedAt: now
    };
  } else if (decision === 'revision-requested') {
    if (state.status !== 'awaiting_confirmation') {
      fail(`revision-requested decision requires status awaiting_confirmation, got ${state.status}`);
    }
    if (state.awaitingConfirmationFor !== requestedStage) {
      fail(`awaitingConfirmationFor (${state.awaitingConfirmationFor}) does not match requested stage (${requestedStage})`);
    }
    const confirmedStages = Array.isArray(state.confirmedStages) ? state.confirmedStages.filter((s) => s !== requestedStage) : [];
    const confirmationSnapshots = { ...(state.confirmationSnapshots ?? {}) };
    if (isPageStage2(catalog, requestedStage)) {
      delete confirmationSnapshots[String(requestedStage)];
    }
    newState = {
      ...state,
      status: 'running',
      awaitingConfirmationFor: null,
      confirmedStages,
      confirmationSnapshots,
      updatedAt: now
    };
  }
  writeJsonAtomic(statePath, newState);
  writeTodoPayload(runDir, catalog, newState);
  const confirmNextAction = decision === 'request'
    ? 'await_user_confirmation'
    : decision === 'accepted'
      ? stageInfo.confirmationContinuesStage === true
        ? 'resume_confirmed_stage'
        : 'stage_complete'
      : 'stage_start';
  process.stdout.write(`${JSON.stringify({
    status: newState.status,
    currentStage: newState.currentStage,
    decision,
    nextRequiredAction: confirmNextAction,
    ...(confirmNextAction === 'resume_confirmed_stage'
      ? { instructionPath: stageInfo.instructionPath }
      : {})
  }, null, 2)}\n`);
  process.exit(0);
}

if (mode === 'stage-complete') {
  const requestedStage = Number(args.stage);
  if (!Number.isInteger(requestedStage) || requestedStage < 1 || requestedStage > catalog.stages.length) {
    fail(`--stage must be an integer from 1 to ${catalog.stages.length}`);
  }
  const result = args.result;
  if (!result || !VALID_RESULTS.has(result)) {
    fail(`--result must be one of ${[...VALID_RESULTS].join(', ')}`);
  }
  const reasonCode = args['reason-code'];
  if (result === 'passed' && reasonCode) {
    fail('--result=passed must not include --reason-code');
  }
  if (result === 'blocked') {
    if (!reasonCode || !VALID_REASON_CODES.has(reasonCode)) {
      fail(`--reason-code must be one of ${[...VALID_REASON_CODES].join(', ')} when --result=blocked`);
    }
  }

  // Idempotent replay: already completed stage
  if (state.completedStages.includes(requestedStage)) {
    if (result !== 'passed') {
      fail(`stage ${requestedStage} is already completed; only result=passed replay is allowed`);
    }
    // Full validation including gate structure and special evidence
    const replayIssues = checkCompletedGateIssues(runDir, catalog, requestedStage, state, evidenceContext);
    if (replayIssues.length > 0) {
      if (requiresDesignDocMissingGuard(catalog, requestedStage)) {
        const assessment = assessDesignDocRecovery(runDir, catalog, state);
        if (assessment.outcome !== 'none') {
          failWithDesignDocAssessment(
            runDir,
            catalog,
            state,
            assessment,
            stageCompleteRetry(requestedStage, 'passed'),
            `stage ${requestedStage} replay validation failed: ${replayIssues.join('; ')}`
          );
        }
      }
      fail(`stage ${requestedStage} replay validation failed: ${replayIssues.join('; ')}`);
    }
    writeTodoPayload(runDir, catalog, state);
    const nextRequiredAction = deriveNextRequiredAction(state, catalog, runDir);
    const replayResult = {
      alreadyCompleted: true,
      status: state.status,
      currentStage: state.currentStage,
      completedStages: state.completedStages,
      nextRequiredAction
    };
    if (state.status === 'completed') {
      replayResult.todoPayloadPath = join(runDir, 'todo-payload.json');
    }
    process.stdout.write(`${JSON.stringify(replayResult, null, 2)}\n`);
    process.exit(0);
  }

  // Reject impossible stage requests
  if (requestedStage !== state.currentStage) {
    if (requestedStage > state.currentStage) {
      fail(`cannot complete future stage ${requestedStage}; current stage is ${state.currentStage}`);
    }
    fail(`cannot complete stage ${requestedStage}; current stage is ${state.currentStage}`);
  }
  if (state.status === 'blocked') {
    fail(`workflow is blocked: ${state.blockedReasonCode}; reinitialize the run before continuing`);
  }
  if (state.status === 'completed') {
    fail('workflow is already completed');
  }
  if (result === 'passed' && state.status === 'awaiting_confirmation') {
    fail(`stage ${requestedStage} is still awaiting confirmation; call confirm first`);
  }

  // A consistent blocked gate on disk means the blocked write was interrupted
  // before the state advanced. Replaying it must not be blocked by completed
  // stage design-doc recovery; only the stage, status and reasonCode still
  // have to match, and the gate consistency check below enforces that.
  const existingCurrentGate = readGate(runDir, requestedStage);
  const replayingBlockedWrite =
    result === 'blocked' &&
    existingCurrentGate?.status === 'blocked' &&
    Number(existingCurrentGate.stage) === requestedStage &&
    existingCurrentGate.reasonCode === reasonCode;

  // Validate completed stage gates
  const gateIssues = collectCompletedGateIssues(runDir, catalog, state, {
    ...evidenceContext,
    waiveDesignDocEvidence: replayingBlockedWrite
  });
  if (gateIssues.length > 0) {
    const docStage = designDocStage(catalog);
    if (
      !replayingBlockedWrite &&
      requiresDesignDocMissingGuard(catalog, docStage) &&
      state.completedStages.includes(docStage)
    ) {
      const assessment = assessDesignDocRecovery(runDir, catalog, state);
      if (assessment.outcome !== 'none') {
        failWithDesignDocAssessment(
          runDir,
          catalog,
          state,
          assessment,
          stageCompleteRetry(requestedStage, result, reasonCode),
          `cannot complete: completed stage gate issues: ${gateIssues.join('; ')}`
        );
      }
    }
    fail(`cannot complete: completed stage gate issues: ${gateIssues.join('; ')}`);
  }

  // Validate confirmation if required — the confirmation requirement only
  // constrains passing the stage; blocked may be recorded from any non-terminal
  // state, including before or during confirmation.
  const stageInfo = catalog.stages[requestedStage - 1];
  if (result === 'passed' && stageInfo.requiresConfirmation) {
    const confirmedStages = Array.isArray(state.confirmedStages) ? state.confirmedStages : [];
    if (!confirmedStages.includes(requestedStage)) {
      fail(`stage ${requestedStage} requires confirmation but has not been confirmed`);
    }
  }

  // Source-specific Full workflow evidence validation.
  if (result === 'passed') {
    const evidenceIssues = [
      ...collectStageEvidenceIssues(runDir, catalog, requestedStage, { ...evidenceContext, live: true }),
      ...(requiresPageStage2Confirmation(catalog, requestedStage)
        ? collectPageStage2ConfirmationSnapshotIssues(runDir, catalog, state)
        : [])
    ];
    if (requiresDesignDocMissingGuard(catalog, requestedStage)) {
      const assessment = assessDesignDocRecovery(runDir, catalog, state);
      if (assessment.outcome !== 'none') {
        failWithDesignDocAssessment(
          runDir,
          catalog,
          state,
          assessment,
          stageCompleteRetry(requestedStage, result),
          evidenceIssues.join('; ')
        );
      }
    }
    if (evidenceIssues.length > 0) {
      fail(evidenceIssues.join('; '));
    }
  }

  const now = new Date().toISOString();
  const canonicalGate = buildCanonicalGate(requestedStage, result, reasonCode, now);

  // Check for existing gate conflicts
  const existingGate = existingCurrentGate;
  if (existingGate) {
    if (gateSemanticEquals(existingGate, requestedStage, result, reasonCode)) {
      // Consistent gate from interrupted write — keep original completedAt, proceed to state
      canonicalGate.completedAt = existingGate.completedAt;
    } else {
      process.stdout.write(`${JSON.stringify({
        error: 'gate_result_conflict',
        stage: requestedStage,
        existingStatus: existingGate.status,
        existingReasonCode: existingGate.reasonCode,
        requestedResult: result,
        requestedReasonCode: reasonCode
      }, null, 2)}\n`);
      process.exit(1);
    }
  }

  writeJsonAtomic(gatePath(runDir, requestedStage), canonicalGate);

  if (result === 'passed' && isPageStage2(catalog, requestedStage)) {
    const policy = readJsonOrNull(join(runDir, PAGE_STAGE2_STARTUP_POLICY), 'stage 2 startup page policy', []);
    if (policy) {
      const projectRoot = resolveLockedProjectRoot(
        runDir,
        policy.projectRootPath,
        'stage 2 startup page policy projectRootPath',
        []
      );
      if (projectRoot) {
        updateRunIndex(runDir, projectRoot, policy, catalog.designSource);
      }
    }
  }

  if (result === 'blocked') {
    const newState = {
      ...state,
      status: 'blocked',
      blockedReasonCode: reasonCode,
      awaitingConfirmationFor: null,
      updatedAt: now
    };
    writeJsonAtomic(statePath, newState);
    writeTodoPayload(runDir, catalog, newState);
    process.stdout.write(`${JSON.stringify({
      status: 'blocked',
      currentStage: newState.currentStage,
      blockedReasonCode: reasonCode,
      nextRequiredAction: 'resolve_blocking_issue'
    }, null, 2)}\n`);
    process.exit(0);
  }

  // result === 'passed'
  const completedStages = [...state.completedStages, requestedStage];
  const isLastStage = requestedStage === catalog.stages.length;
  const newState = {
    ...state,
    completedStages,
    currentStage: isLastStage ? requestedStage : requestedStage + 1,
    status: isLastStage ? 'completed' : 'running',
    updatedAt: now
  };
  writeJsonAtomic(statePath, newState);
  writeTodoPayload(runDir, catalog, newState);
  if (isLastStage) {
    process.stdout.write(`${JSON.stringify({
      status: 'completed',
      currentStage: newState.currentStage,
      completedStages: newState.completedStages,
      nextRequiredAction: 'sync_final_todo_then_finish',
      todoPayloadPath: join(runDir, 'todo-payload.json')
    }, null, 2)}\n`);
  } else {
    process.stdout.write(`${JSON.stringify({
      status: 'running',
      currentStage: newState.currentStage,
      completedStages: newState.completedStages,
      nextRequiredAction: 'stage_start'
    }, null, 2)}\n`);
  }
  process.exit(0);
}

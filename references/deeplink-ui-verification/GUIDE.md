---
name: deeplink-ui-verification
description: In DevEco Code, temporarily add controlled custom-scheme URI routes to HarmonyOS applications to simplify UI intent verification. Use `devecocli build` to compile, `devecocli run --skip-build` to deploy, and verify_ui to run a reduced test plan, then restore source files and the installed application even when the project has no Git. Trigger this skill for requests such as simplify verification of a feature, simplify UI intent verification, reduce verification steps, optimize a verify_ui flow, or skip repeated test preparation, even when the user does not mention URI or DeepLink. Also use it for UI tests containing login, data preparation, multi-level navigation, list lookup, or parameter entry when those prerequisites can be replaced without changing the business behavior under test.
---

# HarmonyOS URI UI Intent Verification

Use a temporary, controlled URI to open the page under test and remove irrelevant navigation. Always follow: analyze, baseline, inject, build, deploy, verify, restore. Restore before reporting results whether verification succeeds or fails.

## Hard constraints

- Replace only setup steps unrelated to the assertion; never bypass the business action, permission, or server authorization being tested.
- Add the smallest possible temporary entry. After URI parsing, reuse the target page's existing navigation, parameter model, and initialization whenever possible; never copy or rewrite a test-only business flow.
- Scope the check to the current verification target: a URI may open a prerequisite page such as an order or detail page, but that page must still run its existing lifecycle and data loading. Only the operation, state, or result being verified must not be fabricated or bypassed by the URI.
- Never use a URI to write the result, business state, or mock data under verification directly, or bypass permissions, queries, state transitions, or submission behavior covered by this verification. Do not require proof of whole-module equivalence.
- Treat every URI value as untrusted input. Validate scheme, host, path, type, length, range, and enum allowlists.
- Never allow a URI to select an arbitrary page, file, database statement, network address, or destructive operation.
- Never put passwords, tokens, identity numbers, or other secrets in a URI, test plan, or log.
- Enable the test entry only in a temporary debug/test build; never leave it in production code or on the device.
- Never use Git commands that overwrite user changes. Before editing `.ets`, load `hmos-arkui-develop-skill`.

## 1. Define the verification boundary

Separate the original flow into:

1. Setup or phase-transition steps that may be replaced by a URI: multi-level navigation, list lookup, test-data selection, and form prefill.
2. The core action and observable result that must remain: submit, save, play, error display, and page state.

A URI must not perform the core assertion. For example, when verifying “tap Submit Order”, the URI may open a prepared order-confirmation page but must not submit the order.

Treat each independently verified functional point or user story as one verification unit. When a verification unit involves multiple pages, its test plan may use a separate URI to jump directly to each required page instead of navigating through unrelated intermediate screens. URI jumps are not limited to the first step and may be interleaved with UI actions; preserve any required state between page checks within the same unit. Before verification, register all URI routes needed by all verification units in one temporary change; do not re-edit the application between units. This capability does not merge multiple functional points or user stories into one `verify_ui` call.

Before editing, identify the package, entry module, entry `UIAbility`, root page, target page, normal Router/Navigation/AppStorage/component/business-service flow, existing parameter model, index conversion, data lookup, initialization timing, login state, database, and network dependencies.

## 2. Establish a baseline without Git

Do not depend on Git for cleanup. Before editing, create a session-specific temporary directory outside the project and record:

- A modification ledger: absolute path, prior existence, insertion point, temporary symbols, and replaced values.
- Byte-for-byte baseline copies preserving relative paths.
- A manifest containing SHA-256, byte length, and prior existence for every file.
- A post-injection hash for every edit round to detect concurrent changes.

Snapshot every newly created file before creating it, marking its baseline as nonexistent. Keep snapshots outside the project until cleanup is verified. If Git exists, record `git status --short` and existing diffs to distinguish user changes; Git is supplemental audit information, not the only restoration source.

Wrap all temporary TypeScript and JSON5 content in paired markers:

```ts
// UI_VERIFY_DEEPLINK_BEGIN
// temporary verification code
// UI_VERIFY_DEEPLINK_END
```

If a file changed concurrently and the overlap cannot be safely separated, stop automatic restoration, preserve the snapshot, and report the conflict.

## 3. Design the URI

Use the stable form:

```text
scheme://host/path?query
```

Examples:

```text
exampleapp://test/order-confirm?source=buyNow&productIds=p1,p3
exampleapp://test/orders
```

`exampleapp` is only an example; use a scheme name derived from the tested application's business domain in practice.

Rules:

- Use lowercase scheme and host. Do not use schemes beginning with `ohos`, or `http`, `https`, or `file` for this internal custom-scheme flow.
- Prefer `test` as host and stable business names as paths; never expose ArkUI file paths.
- Carry only the minimum setup data. Document each URI’s target, parameter contract, defaults, invalid-value behavior, and dependencies.
- URL-encode Chinese, spaces, `&`, `=`, and other special characters.
- Keep the scheme, host, path, and query explicit and directly executable; do not write vague instructions such as “go to the order page”.

### Parameter transport and selection

Inspect the target page’s existing parameter entry before choosing a transport. Adapt to existing business code instead of creating a second page implementation:

```text
URI query
→ one parser performs conversion and validation
→ convert to the existing route parameters, navigation model, or business object
→ call the existing navigation/initialization method
→ let the target page receive data in its original way
```

Choose in this order:

| Existing entry or parameter nature | Preferred approach | Impact |
|---|---|---|
| Existing Router parameter model | Reuse it through `pushUrl` `params` | Usually no target-page change |
| Existing Navigation parameter model | Reuse the existing NavPath model | Keeps normal and URI entry consistent |
| Application-level state or cold-start data | Reuse `AppStorage` or the existing state manager | Clear one-shot commands after consumption |
| Existing business initializer | Call it from the URI adapter | The target page may need no change |
| No existing parameter entry | Add the smallest explicit model/interface | Add only receiving, validation, and conversion |

Use URI query parameters by default because they are copyable and fully visible in a test plan:

```text
exampleapp://test/order-confirm?source=buyNow&productIds=p1,p3
```

Query values arrive as strings. Strictly convert numbers, accept only `true`/`false` for booleans, enforce enum allowlists, and define delimiters, empty-value behavior, duplicate handling, and maximum count for lists. For example, split `productIds=p1,p3` and validate every product ID. URL-encode Chinese, spaces, `&`, `=`, and other special characters; when executing the device command, wrap the complete command in double quotes and the complete URI in single quotes.

### Use URI query parameters exclusively

The current tool passes only the complete URI. It does not support additional launch arguments such as `--pi`, `--pb`, `--ps`, or `--psn`. Encode integer, boolean, enum, and multi-value inputs as minimal strings in the URI, then perform type conversion, range checks, and allowlist validation in the application’s single parsing layer. This keeps the test-plan URI identical to the actual tool invocation.

Parameter rules:

- Map paths only through a fixed route allowlist; never concatenate URI input into a page path.
- Parse in the Ability or a dedicated parser; the target page must not parse the raw URI.
- Convert only what the existing model requires, such as a one-based chapter number to the existing zero-based index.
- Reject missing, invalid, oversized, or out-of-range values with a diagnosable reason; do not silently create an invalid state.
- When no URI is supplied, preserve the original startup path and defaults.
- Do not put passwords, tokens, identity numbers, or other sensitive information in a URI; record only redacted scenarios and parameters in logs and test reports.
- Do not use parameters to trigger payment, deletion, submission under test, or other destructive behavior.

## 4. Register the temporary DeepLink

In the target module’s `src/main/module.json5`, add a separate skill to the target Ability. One skill may contain several URI entries:

```json5
// UI_VERIFY_DEEPLINK_BEGIN
{
  "actions": ["ohos.want.action.viewData"],
  "uris": [
    { "scheme": "exampleapp", "host": "test", "path": "order-confirm" },
    { "scheme": "exampleapp", "host": "test", "path": "orders" }
  ]
}
// UI_VERIFY_DEEPLINK_END
```

Ensure the Ability is externally launchable (`exported: true`, restoring any temporary change), keep this skill separate from the HOME skill, keep `actions` non-empty and use `ohos.want.action.viewData`, configure a scheme, and use `host`, `path`, `pathStartWith`, or `pathRegex` to narrow matching. Do not add `/` before or after path matching values.

## 5. Receive and execute URI

HarmonyOS matches the Ability and places the URI in `Want`; the application parses, validates, adapts, and navigates. Handle cold and warm starts through the same URI parsing and command-conversion entry point. Keep existing lifecycle bodies and add only marked calls. The first URI can arrive through `onCreate`; later URIs usually arrive through `onNewWant`. In `onCreate`, only parse and queue the command; do not navigate. Do not turn URI handling into one-time startup initialization or require force-stop before every URI. Use this chain:

```text
Want.uri
→ validate scheme, host, path, and parameters
→ convert to an existing route parameter or business object
→ store a one-shot command
→ consume and clear it when UIContext is ready
```

Requirements:

- Use the SDK's structured URL API instead of splitting query strings manually.
- Use an explicit command model and route allowlist. Do not let the target page parse the raw URI.
- Never call Router from Ability `onCreate`.
- **Never call `pushUrl`, `replaceUrl`, or another UI routing API synchronously inside a `windowStage.loadContent(..., callback)` callback.** When that callback runs, UIContext, the page stack, and the root-page entrance transition may still be unstable.
- Navigate with the explicit UIContext bound to the current window, such as `windowStage.getMainWindowSync().getUIContext().getRouter()`. Do not use the global `router` from an Ability, timer, or asynchronous callback.
- On cold start, consume the command at an explicit UI-ready point such as the root page's first `onPageShow`. If changing the root page is inappropriate, let the successful `loadContent` callback schedule a later task and let that task obtain the explicit UIContext and navigate. Never navigate synchronously in the callback itself.
- Preserve `[home, target]` by default. Call `loadContent(target)` directly only when the target can independently serve as the root page, requires neither route parameters nor home-page initialization, and returning by exiting the application is acceptable for the test.
- Create and consume a new command for every `onNewWant`; never ignore a later URI because an earlier one was handled.
- When URI commands overlap or a route transition is in progress, queue distinct commands and consume them serially so a later URI cannot overwrite an earlier one.

### Default lifecycle template

Use one default pattern that preserves the application's existing root-page loading and business initialization. The following is a structural template: merge it into existing lifecycle methods and map every placeholder to the project's existing implementation instead of copying it into a second business flow:

```ts
// Ability: preserve existing lifecycle statements and insert only marked calls.
onCreate(want: Want, launchParam: AbilityConstant.LaunchParam): void {
  this.enqueueUiVerifyDeepLink(want); // Parse, validate, and queue only; do not navigate.
}

onNewWant(want: Want, launchParam: AbilityConstant.LaunchParam): void {
  this.enqueueUiVerifyDeepLink(want);
  this.notifyUiReadyConsumer(); // Consume only when UI is ready and no transition is active.
}

onWindowStageCreate(windowStage: window.WindowStage): void {
  // Preserve the project's existing home page and loadContent call.
  windowStage.loadContent('pages/Index', (error) => {
    if (error.code) {
      this.recordUiVerifyDeepLinkError(error);
    }
    // Never call Router synchronously in this callback.
  });
}

// Root page: prefer merging into an existing onPageShow or UI-ready callback.
onPageShow(): void {
  const uiContext = this.getUIContext();
  this.consumeUiVerifyDeepLink(uiContext, (command) => {
    const originalParams = this.adaptToOriginalParams(command);
    return this.openTargetWithOriginalFlow(uiContext, originalParams);
  });
}
```

`adaptToOriginalParams` and `openTargetWithOriginalFlow` are semantic placeholders. They must respectively reuse the normal entry's parameter conversion and navigation/business-initialization method. Clear the command only after routing has been submitted successfully. Never use these methods to write the expected result, create mock business data, or add state mutations absent from the normal entry.

Prefer an existing root-page lifecycle or UI-ready mechanism; do not introduce a fixed delay. If changing the root page is inappropriate, the successful `loadContent` callback may only schedule a later task. That task must obtain the explicit UIContext again before navigating; the callback itself must still not call Router synchronously. Handle Router success and failure according to the target SDK, record failures, and never retry without a bound.

For warm starts and later URIs, enqueue every `onNewWant` separately and consume commands serially after UIContext is ready and the current route transition completes. Never overwrite the previous command or force-stop the application to navigate.

Use `loadContent(target)` only as a restricted exception after demonstrating that the target requires no route parameters, no home or global initialization, can independently serve as the root page, and may exit the application on Back. Otherwise always use the default pattern.

### Mandatory post-implementation checks

- Search for and confirm there is no synchronous Router call inside a `loadContent` callback.
- Confirm the URI replaces only prerequisite steps unrelated to the current assertion; the target page still runs its existing lifecycle and data loading, and the operation, state, and result under verification are not written, fabricated, or bypassed by the URI.
- Confirm a cold-start URI reaches the target without overlapping home Tabs, navigation bars, or the root layout.
- Confirm the default cold-start flow returns to home; only the restricted exception may exit the application on Back.
- Confirm warm-start and later URIs in the same verification unit reach their targets while preserving required business state.
- Confirm URI parameters are converted exactly once and consumed pending commands are cleared without repeated navigation or loops.

## 6. Build and deploy with current tools

Run exactly:

```text
devecocli build → devecocli run --skip-build → verify_ui
```

1. Run `devecocli build` for the debug build through bash:

   ```text
   devecocli build
   ```

   Run `devecocli build clean` only when the user explicitly requests cache cleanup or a full rebuild. Pass the actual `--modules` or `--product` options for multi-module projects.

2. Only after a successful build run `devecocli run --skip-build` through bash to install and launch the new HAP:

   ```text
   devecocli run --skip-build
   ```

   `devecocli run --skip-build` deploys the freshly built package. If no device is available, record the command result and continue according to the project workflow; do not invent another deployment path.

3. Repair only errors introduced by this temporary route; do not repair unrelated business code or failures already present in the baseline.
4. On build, install, or launch failure, record the tool result and proceed to diagnosis or cleanup; do not invent another deployment path.

Verify both `freshStart=true` cold start and warm start without force-stop. Later URI jumps must preserve prior business state.

## 7. Create reduced test plans by verification unit

Create one reduced test plan for each functional point or user story. When that unit covers multiple pages, use multiple URI jumps to reach those pages directly, with dependent UI actions between them when required:

```text
1. Start the app and use URI exampleapp://test/order-confirm?source=buyNow&productIds=p1,p3.
   Expected: the order-confirmation page shows the smart watch and portable charger.
2. Tap Submit Order.
   Expected: order submission succeeds.
3. Tap Return Home.
   Expected: the home page appears.
4. Use URI exampleapp://test/orders.
   Expected: the order-management page appears.
5. Observe the latest order.
   Expected: it contains the smart watch and portable charger.
```

Every verification-unit plan must state a complete URI when a URI jump is requested, an action, and an observable expected result. Do not repeat navigation, lookup, or prefill already done by a URI, and do not put the core assertion into a URI. Keep each plan independent for verification purposes, while preserving all state-dependent steps within that unit.

## 8. Call `verify_ui`

After all URI routes for all verification units have been inserted and the temporary build is deployed, call `verify_ui` once per functional point or user story, sequentially, with that unit's reduced test plan, `freshStart: true`, and an optional device identifier. This preserves an independent verification boundary and retry counter for every unit. Route insertion is performed only once for the complete verification run.

Each call represents exactly one verification unit: an independent functional point or user story. Process units sequentially. Read `failType` when `verify_ui` returns it. A unit passes when `success` is true or `failType` is `''`. Older engines omit `failType`; then use `success` alone.

Retry only when `failType` is `verification_failed` and the failure is caused by this temporary route, and limit each unit to three attempts. If `failType` is absent, keep that same rule: retry only when the failure is caused by this temporary route. If a temporary-route fix is required, update the shared temporary route set, rebuild and redeploy, then continue the loop. Do not edit business code for a `verification_failed` result that this temporary route did not cause.

Do not edit application code or the temporary route to chase a pass when `failType` is `unsupported` or `invalid_plan`. `execution_error` and `inconclusive` do not confirm an application defect: `execution_error` is an interruption, and `inconclusive` includes an engine round limit. Retry `verify_ui` for that unit within the same three-attempt limit, without editing application code or the temporary route. If that retry returns `verification_failed` and this temporary route caused it, continue with the temporary-route fix above. Otherwise record the result and continue to the next unit.

When a temporary-route fix occurred, perform one final no-fix pass for every verification unit before cleanup. After all units and any final pass finish, clean up the shared temporary changes once.

Check that each URI actually opens its target page, query values reach the business correctly, later URI jumps preserve earlier state, and there is no parameter loss, duplicate consumption, abnormal back stack, or unintended side effect.

## 9. Mandatory restoration on every exit path

Treat cleanup as a finally block. Run it after success, verification failure, build/install failure, or interruption.

- Remove temporary URI skills/entries and restore `exported` and other prior values.
- Remove Ability, page, parameter-model, pending-queue, window-reference, routing-state, timer, helper, test, and temporary-file changes.
- Remove every `UI_VERIFY_DEEPLINK_BEGIN/END` block and temporary scheme, URI, and key.
- Compare current hashes with the latest injected-state hashes. If they match, restore the byte-for-byte snapshot and delete files absent from the baseline. If they differ, do not overwrite; remove only clearly marked temporary blocks. Stop and report when a concurrent edit overlaps the temporary change.

If a temporary HAP was installed, rebuild the restored source with `devecocli build` and run `devecocli run --skip-build` to overwrite it with a clean build. If that fails, explicitly report that the device may still run the temporary build.

## 10. Verify restoration and report

After cleanup, search for temporary markers, schemes, URIs, and pending keys. With Git, run `git diff --check` and compare with the initial status. Without Git, rely on the external snapshot, SHA-256 manifest, file-existence checks, and residue search. Delete the snapshot only after restoration is confirmed; preserve and report it on conflict.

Report:

1. Inserted URIs and steps replaced.
2. `devecocli build`, `devecocli run --skip-build`, and `verify_ui` results.
3. Source cleanup and hash verification.
4. Clean-build deployment result.
5. Any unresolved conflict or residue.

# Eval Builder — Implemented Requirements

## 1. Purpose

A lightweight React UI for creating, editing, and managing Promptfoo-style eval configurations through a guided form builder, with full raw YAML access. The app reduces YAML friction while maintaining flexibility for advanced users.

Integrates with a Prompt Management API for prompt project/version selection, embedded prompt editing, and eval execution via Promptfoo.

### Implemented Tech Stack

* React 19 + TypeScript
* Next.js 16 (App Router)
* Radix UI + shadcn/ui component library (replaces MUI from original spec)
* Tailwind CSS v4 with custom design tokens (light/dark themes)
* Monaco Editor for YAML editing
* Zustand-style state management via React Context + `useReducer`
* Sonner for toast notifications
* Zod for API input validation
* OpenAI API for AI-assisted generation features
* Prisma (PostgreSQL datasource configured; schema stub only — no models defined)
* Vercel Analytics

### Product Positioning

The app is a guided eval builder with YAML transparency. Users can:

1. Build common evals through a form-based UI
2. Switch to raw YAML editing at any time
3. Have changes compiled back into YAML automatically

---

## 2. Implemented Product Goals

1. Users can create evals without writing YAML via a structured form UI.
2. Full YAML editability is available via a Monaco-based editor tab.
3. Both deterministic assertions and LLM-as-judge assertions are supported with dedicated UIs.
4. An Assertion Advisor guides users toward the right assertion type through a decision-tree quiz.
5. Multi-prompt configs are supported for prompt version comparison.
6. AI-assisted generation of assertions and test cases is available via OpenAI.
7. Integration with a Prompt Management API allows selecting real prompt projects/versions and executing evals.

---

## 3. Implemented User Flows

### 3.1 Start a New Eval Config

* User can create a new config via the **+ New Config** button in the Config Sidebar.
* A default config is pre-populated with a sample prompt (project `10000`, version `mo024xy827as`), provider configuration targeting the Prompt Management API's execute-prompt endpoint, and a default judge model (`openai:gpt-4.1-2025-04-14`).

### 3.2 Create Eval via UI (Form Tab)

1. Enter eval configuration name (text input in header) and description (textarea).
2. Select prompt project via searchable combobox and prompt version via dropdown.
3. Optionally add another prompt for comparison (**Add Another Prompt** button).
4. Optionally expand and edit prompt content inline via the Embedded Prompt Editor.
5. Optionally configure per-prompt model settings (vendor, model, temperature, max tokens).
6. Add assertions — deterministic or LLM-as-judge — via guided UI.
7. Add test cases manually or generate them with AI.
8. Review generated YAML by switching to the YAML tab (Code/YAML toggle).
9. Save configuration or run the eval.

### 3.3 Edit via Raw YAML (YAML Tab)

1. Switch to the YAML tab via the Code toggle in the header.
2. Edit YAML directly in the Monaco editor (syntax highlighting, word wrap, folding).
3. Switch back to the Form tab — the app attempts to parse the YAML back into the structured form.
4. If YAML parsing fails, a warning toast is shown; the form retains the last valid config state.
5. Save and Run actions from the YAML tab commit YAML changes before executing.

### 3.4 Add Assertion with Guidance (Assertion Advisor)

1. User clicks **Help Me Choose** in the Add Assertion popover or from the empty-state card.
2. A decision-tree wizard asks intent questions (6 questions covering exact output, term presence/absence, format/length, subjective quality).
3. Based on answers, the advisor recommends deterministic or LLM-as-judge with confidence level, reasoning, and suggested assertion types.
4. User can add the recommended assertion type directly from the result screen.

### 3.5 Manage Saved Configurations

1. Config Sidebar lists all saved configurations.
2. User can load, delete (with confirmation dialog), and designate a config as primary.
3. Designated config is visually indicated with a filled circle icon.
4. Sample configurations are pre-loaded for demonstration.

### 3.6 Run Eval and Monitor

1. User clicks **Run** to submit the eval configuration.
2. The app POSTs the config to `/api/run-eval`, which transforms it into Promptfoo format and forwards to the Prompt Management API.
3. A polling mechanism checks job status (initial poll after 3 seconds, then every 15 seconds).
4. The Eval Runs Sidebar displays run status (Queued, In Progress, Complete, Error), pass rate, date, and run-by info.
5. Completed runs with an `evalId` and `promptfooBaseUrl` show an external link to open results in Promptfoo.

---

## 4. Scope of Supported YAML

### 4.1 Supported Sections (Form UI)

* `description` — free-text textarea
* `prompts` — array of JSON-string prompt references (`promptId`, `versionId`, optional `label`)
* `providers` — HTTP provider config (URL, method, headers, body, optional `transformResponse`)
* `defaultTest.options.provider` — judge model configuration for LLM-as-judge assertions
* `defaultTest.assert` — array of assertion objects
* `tests` — inline test cases with `vars`, or a URL string for external datasets

### 4.2 YAML Handling Capabilities

* **YAML generation**: UI state is compiled to YAML via a custom serializer (`configToYaml`) with proper indentation, folding for long values, and JSON-in-YAML prompt formatting.
* **YAML parsing**: Raw YAML is parsed back into `EvalConfig` via the `yaml` package with support for prompts (object or JSON string), providers (nested body flattening), assertions, and tests.
* **Unsupported section preservation**: Unknown top-level YAML keys are collected into an `unsupportedSections` map and preserved through round-trips.
* **YAML validation**: Heuristic checks for non-empty content, required `description`, required `prompts`, and tab character detection.
* **Form ↔ YAML sync**: Switching between Form and YAML tabs syncs state bidirectionally. Parse failures show a warning toast without losing the last valid form state.

---

## 5. Functional Requirements — Implemented

### 5.1 Description Section

* Editable description textarea.
* Compiles to top-level `description` in YAML.

### 5.2 Prompt Source Section

* **Prompt project selection**: Searchable combobox populated from a prompt catalog (local seed data + optional remote API).
* **Version selection**: Dropdown populated per selected project, with fallback to synthetic versions when remote is unavailable.
* **Placeholder support**: Default prompt uses `{{currentPromptProjectId}}` / `{{currentPromptVersionId}}` placeholders, resolved to demo values (`2735` / `14631`) at runtime.
* **Multiple prompts**: Users can add multiple prompts via **Add Another Prompt**; each prompt has independent project, version, and label fields.
* **Optional prompt label**: Free-text input per prompt for labeling (e.g., `anthropic`, `open-ai`).
* **Delete prompt**: Available when more than one prompt exists.
* **Accordion-style expansion**: One prompt expanded at a time for editing.
* **Unsaved changes guard**: Changing project or version while the embedded editor has unsaved changes triggers a confirmation dialog.

### 5.3 Embedded Prompt Editor

* **View / Edit Prompt** collapsible section per prompt.
* **Message-based editor**: Lists prompt messages with role selector (system, user, assistant) and monospace textarea per message; supports add/remove messages.
* **Raw JSON view**: Toggle to view/edit the full `PromptVersionContent` as JSON.
* **Unsaved state tracking**: Badge indicates unsaved changes; comparison against loaded snapshot.
* **Save as new version**: Creates a new prompt version via the Prompt Management API (or local fallback), updates the version list, and selects the new version.
* **Live draft sync**: Content changes propagate to `PromptDraftsContext` so downstream features (assertion/test generation) can read live prompt content without requiring a save.

### 5.4 Per-Prompt Model Settings

* **Model Settings** card per prompt with:
  * Vendor dropdown (OpenAI, Anthropic, Google, Meta, Mistral, DeepSeek, xAI)
  * Model dropdown (filtered by selected vendor; includes models like GPT-4.1, Claude Sonnet 4, Gemini 2.5 Pro, etc.)
  * Temperature number input (0–2, step 0.1)
  * Max Tokens number input
* Vendor change preserves current model if compatible; otherwise defaults to first available.

### 5.5 Provider Configuration

* Provider settings are system-driven and not exposed as a separate UI section.
* Default provider is pre-configured as an HTTP provider targeting the Prompt Management API's execute-prompt endpoint.
* Provider includes `transformResponse` for OpenAI-style JSON + tool call extraction.
* `Authorization: Bearer` header is injected server-side from environment variables when executing evals.
* `{{promptManagementApiBaseUrl}}` placeholder in provider URLs is resolved server-side from `PROMPT_MANAGEMENT_API_BASE_URL`.

### 5.6 Assertions Section

* **Add Assertion** popover with three options:
  * Add Deterministic Assertion
  * Add LLM as Judge Assertion
  * Help Me Choose (opens Assertion Advisor)
* **Empty state**: Two visually distinct cards (deterministic vs LLM) with descriptions and a link to the advisor.
* **Assertion list**: Collapsible card per assertion with:
  * Badge indicating Deterministic or LLM category
  * Assertion type display
  * Collapsed preview of value/rubric
  * Expand/collapse toggle
  * Duplicate and delete actions
  * Checkbox for bulk selection
* **Bulk operations**: Select all, delete selected (with confirmation), delete all (with confirmation).
* **Expand all / Collapse all** toggle.

### 5.7 Deterministic Assertion Builder

* **Grouped assertion type picker** with categories:
  * Equality (equals, is-json, is-valid-openai-function-call, is-valid-openai-tools-call)
  * Contains (contains, icontains, not-contains, not-icontains, contains-any, icontains-any, not-contains-any, not-icontains-any, contains-all, icontains-all)
  * Pattern (regex, not-regex, starts-with, ends-with)
  * Semantic (similar, classifier)
  * Numeric (cost, latency, perplexity)
  * Structure (is-json, is-sql, is-valid-openai-function-call, is-valid-openai-tools-call, javascript, python)
  * Length (wordCount)
* **Value editors** adapt to assertion type:
  * Array tag input for list-based assertions (e.g., `not-icontains-any`)
  * JSON object editor for `wordCount` (min/max word count)
  * Number input for numeric assertions
  * Textarea for text-based assertions (e.g., `equals`, `regex`)
  * Threshold slider for `similar` (0–1)
  * No value field for assertions that don't require one (e.g., `is-json`)
* **Metric name**: Optional text input per assertion.
* **Info alerts**: Per-type description shown when assertion type is selected (what it checks, when to use, example).

### 5.8 LLM-as-Judge Assertion Builder

* **Rubric** textarea for free-text evaluation criteria.
* **Judge Settings** (`ModelSettingsFields` mapped to `provider` field):
  * Model vendor and model selection (from `JUDGE_MODELS` subset)
  * Temperature (0–2)
  * Max tokens
* Default judge model: `openai:gpt-4.1-2025-04-14`.
* **Metric name**: Optional text input.

### 5.9 AI-Assisted Assertion Generation

* **Generate Assertions** button with three modes:
  * Generate (initial, when no assertions exist)
  * Generate More (append to existing)
  * Regenerate (replace all existing)
* **Generation dialog**:
  * Optional instructions textarea
  * Sends prompt content (from live drafts or loaded catalog content), existing assertions, and test case summary to `/api/generate-assertions`
* **Server-side** (`/api/generate-assertions`):
  * Uses OpenAI chat completions with `response_format: json_object`
  * System prompt includes full assertion type catalog (descriptions, when-to-use, examples)
  * Normalizes returned types (coerces invalid types like `javascript`/`python` to `llm-rubric`)
  * Returns 3–5 assertion suggestions
  * Requires `OPENAI_API_KEY` environment variable

### 5.10 Dataset / Tests Section

* **Two modes**:
  * **Inline tests**: Manual test case table with variable columns
  * **URL-based dataset**: Text input for CSV/SharePoint link
* **Manual test editing**:
  * Dynamic columns derived from prompt template variables (`{{...}}` patterns from live prompt content)
  * Add new test case form
  * Edit existing test case (inline)
  * Delete individual tests
  * Bulk selection with checkboxes, bulk delete, delete all (with confirmation)
  * Select-all checkbox
* **CSV import**: Dialog for adding a CSV file link (switches to URL mode).
* **Variable auto-detection**: Variable names extracted from prompt content (both saved catalog versions and live draft edits).

### 5.11 AI-Assisted Test Case Generation

* **Generate Tests** button with three modes:
  * Generate (initial)
  * Generate More (append)
  * Regenerate (replace all)
* **Generation panel** with settings:
  * Count slider (1–10 test cases)
  * Model settings (vendor, model, temperature, max tokens)
  * Collapsible **Examples** section: manually add examples or upload JSON/CSV file (up to 10 examples)
* **Server-side** (`/api/generate-tests`):
  * Uses OpenAI chat completions
  * Prompt includes variable names, existing assertions, and user-provided examples
  * Returns structured test cases matching prompt variable schema
  * Requires `OPENAI_API_KEY` environment variable

### 5.12 Assertion Advisor (Decision Tree)

* Multi-step wizard with 6 questions covering:
  * Whether exact expected output is known
  * Whether checking presence/absence of terms
  * Whether checking format or length constraints
  * Whether checking subjective quality (tone, clarity, brevity)
  * Whether checking structural validity
  * Whether checking semantic similarity
* **Result screen** includes:
  * Recommendation: Deterministic or LLM-as-Judge
  * Confidence level badge
  * Reasoning explanation
  * Suggested assertion types as chips
  * "Next step" guidance
  * Collapsible "Why this recommendation?" section
  * **Add Assertion** CTA matching the recommendation
* **Navigation**: Back button, Start Over, progress bar with question count.

### 5.13 Configuration Management (Config Sidebar)

* **Configuration list** with:
  * Click to load a saved configuration
  * **+ New Config** button
  * Delete with confirmation dialog
  * **Designate** a config as primary (filled vs. empty circle icon)
* **Collapsed state**: Vertical strip of dot indicators with tooltips; click loads config.
* **Collapsible panel**: Chevron toggle, minimum ~4% width when collapsed.
* **Back to Prompt** button rendered (navigation not wired).
* Sample configurations pre-loaded for demonstration.

### 5.14 Eval Runs Sidebar

* **Run list** displaying:
  * Status icon color-coded: green (pass rate ≥ 50%), red (fail), yellow (in progress), gray (queued), red (error)
  * Pass rate percentage
  * Passed/total test count
  * Formatted date (locale-aware, client-rendered to avoid hydration mismatch)
  * Run-by user name
  * External link to Promptfoo results (when `evalId` and `promptfooBaseUrl` are available)
* **Collapsed state**: Up to 8 runs as status icons with tooltips (name + pass % or status text).
* **Collapsible panel**: Chevron toggle matching Config Sidebar behavior.
* Sample runs pre-loaded for demonstration.

### 5.15 YAML Editor (Monaco)

* Full Monaco Editor with YAML language mode.
* Theme-aware: `vs-dark` in dark mode, `light` in light mode (via `next-themes`).
* Editor options: minimap enabled, word wrap, folding, indentation guides, bracket pair colorization, padding, custom scrollbar styling.
* Dynamically loaded (SSR disabled) with loading placeholder.

### 5.16 YAML Syntax Highlighter (Read-Only)

* Custom line-based tokenizer for YAML display (separate from Monaco).
* Highlights: keys, strings, numbers, booleans, null, comments, punctuation, `{{...}}` template variables.
* Light and dark theme support.

---

## 6. API Layer — Implemented

### 6.1 Run Eval (`POST /api/run-eval`)

* Accepts `{ config: EvalConfig }`.
* Resolves `{{promptManagementApiBaseUrl}}` placeholder in provider URLs.
* Injects `Authorization: Bearer` header from `PROMPT_MANAGEMENT_API_TOKEN`.
* Transforms `EvalConfig` into Promptfoo-compatible format via `buildPromptfooConfig`.
* POSTs to `${PROMPT_MANAGEMENT_API_BASE_URL}/api/v3/eval-runs`.
* Returns upstream response merged with `{ success: true }`.

### 6.2 Poll Eval Job (`GET /api/run-eval/[jobId]`)

* Proxies to `${PROMPT_MANAGEMENT_API_BASE_URL}/api/v3/eval-runs/by-job-id/{jobId}/summary`.
* Forwards Bearer token.
* Returns upstream status (status ID, successes, total test cases, eval ID, promptfoo base URL, error message).

### 6.3 Generate Assertions (`POST /api/generate-assertions`)

* Input validated with Zod: prompts with `PromptVersionContent`, existing assertions, optional test summary, instructions, vendor/model/temperature.
* Uses OpenAI `response_format: json_object` to generate 3–5 assertion suggestions.
* System prompt includes the full assertion type reference (all types, descriptions, examples).
* Normalizes returned types and strips markdown fences from responses.

### 6.4 Generate Test Cases (`POST /api/generate-tests`)

* Input validated with Zod: prompts, assertions, variables, count (1–10), examples, vendor/model/temperature/maxTokens.
* Uses OpenAI to generate structured test cases matching prompt variables.
* Returns `{ testCases }` sliced to requested count.

### 6.5 Prompt Management Proxy (`GET|POST /api/prompt-management/[...segments]`)

* Forwards requests to `${PROMPT_MANAGEMENT_API_BASE_URL}/api/v3/{segments}`.
* Passes query strings, content-type, POST body, and Bearer token.
* Enables browser-side prompt catalog operations without CORS issues.

### 6.6 Mock Prompt Management API (`mock-pm-api/server.js`)

* Standalone Node.js HTTP server on port 3001.
* Endpoints:
  * `GET /api/v3/prompt-projects` — list projects
  * `GET /api/v3/prompt-projects/:id/versions` — list versions for project
  * `GET /api/v3/prompt-projects/:pid/versions/:vid` — get version content
  * `POST /api/v3/prompt-projects/:pid/versions` — create new version (auto-creates project if needed)
  * `OPTIONS` — CORS preflight support
* Reads/writes `data.json` for persistence across restarts.
* Seed data includes demo projects (CRM Subject Line Writer, Sample Project 1234, Current Prompt Project) with multiple versions and full prompt content.

---

## 7. Data Model — Implemented Types

### 7.1 Core Types

* **`EvalConfig`**: `description`, `prompts: PromptConfig[]`, `providers: ProviderConfig[]`, `defaultTest` (judge provider + assertions), `tests: TestCase[]`, `testsUrl?: string`, `unsupportedSections?: Record<string, unknown>`
* **`PromptConfig`**: `promptProjectId`, `versionId`, `label?`, `vendor?`, `model?`, `temperature?`, `maxTokens?`
* **`Assertion`**: `id`, `type: AssertionType`, `value?`, `metric?`, `threshold?`, `provider?: JudgeProviderConfig`
* **`TestCase`**: `id`, `vars: Record<string, string>`, `description?`
* **`ProviderConfig`**: `id?`, `url?`, `method?`, `headers?`, `body?`, `transformResponse?`
* **`JudgeProviderConfig`**: `id`, `config` (max_tokens, temperature, headers)
* **`SavedConfig`**: `id`, `name`, `config: EvalConfig`, `createdAt`, `updatedAt`
* **`EvalRun`**: `id`, `name`, `status`, `passRate?`, `passed?`, `total?`, `date`, `runBy?`, `evalId?`, `promptfooBaseUrl?`, `errorMessage?`

### 7.2 Prompt Studio Types

* **`PromptVersionContent`**: `messages: PromptMessage[]`, `variables`, `vendor?`, `model?`, `params?`
* **`PromptMessage`**: `role` (system | user | assistant), `content: string`

### 7.3 Assertion Type Catalog

* 25+ assertion types organized into categories:
  * **Equality**: equals, is-json, is-valid-openai-function-call, is-valid-openai-tools-call
  * **Contains**: contains, icontains, not-contains, not-icontains, contains-any, icontains-any, not-contains-any, not-icontains-any, contains-all, icontains-all
  * **Pattern**: regex, not-regex, starts-with, ends-with
  * **Semantic**: similar, classifier
  * **Numeric**: cost, latency, perplexity
  * **Structure**: is-json, is-sql, javascript, python
  * **Length**: wordCount
  * **LLM**: llm-rubric
* Each type has metadata: description, whenToUse, example value.

### 7.4 Vendor / Model Catalog

* **Vendors**: OpenAI, Anthropic, Google, Meta, Mistral, DeepSeek, xAI
* **Models per vendor** (examples): GPT-4.1, GPT-4.1 mini, GPT-4o, Claude Sonnet 4, Claude Haiku 3.5, Gemini 2.5 Pro/Flash, Llama 4 Scout/Maverick, Mistral Large, DeepSeek Chat/Reasoner, Grok 3/mini
* **Separate model lists** for judge models and generation models (subsets of full catalog)

---

## 8. UI Layout — Implemented

### 8.1 Three-Panel Resizable Layout

* **Left panel**: Config Sidebar (default ~15%, min 12%, max 25%, collapsible to ~4%)
* **Center panel**: Main Editor (default ~70%, min 40%)
* **Right panel**: Eval Runs Sidebar (same sizing rules as left)
* Resizable handles between panels with visible drag indicators.

### 8.2 Main Editor Header

* Configuration name text input
* **Code/YAML** toggle button (switches between Form and YAML tabs)
* **Save** button
* **Run** button (primary, shows loading state during execution)
* **Run options** chevron button (rendered, dropdown not wired)
* **Cancel** button (rendered, no handler attached)
* "Eval relevancy" badge row (rendered as placeholder, value shows "—")

### 8.3 Form Tab Section Order

1. Description
2. Prompt Source
3. Assertions
4. Dataset / Tests

### 8.4 Component Library

Built on Radix UI primitives + shadcn/ui:

* Resizable panels, ScrollArea, Separator
* Button, Input, Textarea, Select, Checkbox, Label
* Card, Badge, Alert, Tooltip, Popover
* Collapsible, Accordion (assertion cards)
* AlertDialog (delete confirmations)
* Command (searchable combobox)
* Tabs (form/yaml switching)
* Sheet, Dialog, Drawer
* Sonner Toaster (bottom-right, rich colors)

---

## 9. Theming — Implemented

* **Light/dark mode** via `next-themes` with `class` attribute strategy.
* Default theme: light; system preference detection enabled.
* Custom design tokens in CSS custom properties:
  * Background, foreground, primary (with hover/active states), accent, destructive, success, warning
  * Card, popover, sidebar color tokens
  * Border radius variable
* Component-level styling: input shadows, card shadows, button weight/transform.
* Monaco editor theme switches between `vs-dark` and `light`.

---

## 10. State Management — Implemented

* **`EvalProvider`** (React Context + `useReducer`):
  * Immutable reducer for all `EvalConfig` mutations (description, prompts CRUD, assertions CRUD with duplicate/reorder/replace-all/bulk-delete, tests CRUD with batch-add/replace/bulk-delete, YAML round-trip, judge provider, URL-based tests)
  * Config name, saved configs (in-memory), eval runs, active config/run tracking
  * `yaml` derived state via `useMemo` over `configToYaml`
  * `runEval` with POST + polling lifecycle
  * `saveConfig`, `loadConfig`, `createNewConfig`, `deleteSavedConfig`
* **`PromptCatalogProvider`**: Projects, versions, version content (local seed + remote API), save-as-new-version flow.
* **`PromptDraftsProvider`**: Ref-based map of unsaved prompt editor content keyed by `promptId:versionId`, used by generation features.

---

## 11. Integration Points — Implemented

### 11.1 Prompt Management API Integration

* Feature-flagged via `NEXT_PUBLIC_PROMPT_MANAGEMENT_API` environment variable.
* When enabled: projects loaded from remote API, versions fetched per project, version content loaded remotely, new versions saved remotely.
* When disabled: falls back to local seed data and in-memory operations.
* All remote calls proxied through `/api/prompt-management/[...segments]` to avoid CORS.

### 11.2 Promptfoo Integration

* `EvalConfig` is transformed to Promptfoo-compatible format via `buildPromptfooConfig`:
  * Prompts as JSON strings with `promptId`/`versionId`/`label`
  * Providers with URL, method, headers, body, optional `transformResponse`
  * Assertions stripped of internal IDs; include type, metric, value, threshold
  * Tests as array or URL passthrough
* Eval execution via Prompt Management API's `/api/v3/eval-runs` endpoint.
* Job polling via `/api/v3/eval-runs/by-job-id/{jobId}/summary`.
* External link to Promptfoo results viewer when available.

### 11.3 OpenAI Integration

* Used for assertion generation and test case generation.
* Configured via `OPENAI_API_KEY` (required), optional `OPENAI_ASSERTION_MODEL` and `OPENAI_TEST_GEN_MODEL` for model override.
* JSON response format with post-processing normalization.

---

## 12. Non-Functional Requirements — Implemented

* **No persistent backend for config storage**: Saved configs and eval runs are held in-memory (React state) with sample data pre-loaded.
* **Fast local iteration**: Next.js dev server; mock PM API on port 3001.
* **UI state separate from YAML serialization**: Config state managed via reducer; YAML derived as a computed value.
* **Safe YAML fallback**: Parse failures on tab switch show toast warning; last valid form state preserved.
* **Unsupported YAML preservation**: Unknown top-level keys stored in `unsupportedSections` and preserved through round-trips.
* **Theme support**: Light/dark mode with system preference detection.
* **Deployment**: Vercel with deployment protection disabled for preview URLs; `promptfoo` marked as server-external package; images unoptimized.

---

## 13. Partially Implemented / Placeholder Features

These features have UI elements rendered but are not fully wired:

* **Cancel button** in Main Editor header — rendered, no click handler.
* **Run options dropdown** (chevron next to Run) — button rendered, no menu attached.
* **Eval relevancy badge** — displays "—" with "View details" text, no data or navigation.
* **Back to Prompt** button in Config Sidebar — rendered, no navigation behavior.
* **Assertion reorder** — grip handle icon rendered on each assertion card, but no drag-and-drop implementation.
* **Embedded Prompt Editor code mode** — JSON textarea is displayed, but edits in code mode are not synced back to the draft (one-directional sync only: draft → code view).
* **Prisma schema** — PostgreSQL datasource configured with generated client path, but no data models defined.

---

## 14. Deployment & Configuration

### Environment Variables

| Variable | Purpose |
|---|---|
| `PROMPT_MANAGEMENT_API_BASE_URL` | Base URL for Prompt Management API (required for eval execution) |
| `PROMPT_MANAGEMENT_API_TOKEN` | Bearer token for PM API authentication |
| `NEXT_PUBLIC_PROMPT_MANAGEMENT_API` | Feature flag (`1` or `true`) to enable remote PM integration |
| `OPENAI_API_KEY` | Required for AI-assisted assertion and test generation |
| `OPENAI_ASSERTION_MODEL` | Optional override for assertion generation model |
| `OPENAI_TEST_GEN_MODEL` | Optional override for test generation model |

### Scripts

| Script | Command |
|---|---|
| `dev` | Next.js development server |
| `build` | Next.js production build |
| `start` | Next.js production server |
| `lint` | Linting |
| `mock-pm` | Starts mock Prompt Management API on port 3001 |

# ATOP26 Smart

Frontend application for ATOP26 Smart, built with Vue 3, TypeScript, Vite, and Ant Design Vue.

## Prerequisites

- Node.js 22.12.0 or later
- npm

## Installation

```bash
npm install
```

> Running `npm install` also sets up Husky Git hooks automatically via the `prepare` script. No extra setup is required.

## Available Scripts

```bash
npm run dev
```

Starts the Vite development server at `http://localhost:5173`.

```bash
npm run build
```

Builds the production application using Vite. Output is in the `dist/` directory.

```bash
npm run build:dev
```

Builds a static SPA bundle using `.env.development`.

```bash
npm run build:prod
```

Builds a static SPA bundle using `.env.production`.

```bash
npm run preview
```

Previews the production build locally.

```bash
npm run lint
```

Checks Prettier formatting and ESLint rules. This command is deterministic and is safe for CI because it does not rewrite files.

```bash
npm run lint:fix
```

Formats files with Prettier and applies auto-fixable ESLint rules.

```bash
npm run format
```

Formats the project with Prettier.

```bash
npm run format:check
```

Checks project formatting without writing files.

```bash
npm run type-check
```

Runs TypeScript type checking with `vue-tsc`.

```bash
npm run test
```

Runs the unit test suite with Vitest.

## Git Hooks (Husky)

Husky runs local quality checks before code is committed. Hooks are installed automatically on `npm install`.

- **pre-commit** - runs `lint-staged` (ESLint + Prettier on staged files).
- **commit-msg** - runs `commitlint` to enforce the commit format.

If a check fails, the commit is blocked. Do not bypass hooks with `--no-verify`.

## Commit Convention

Messages must follow the format `type(scope): message`. This is enforced by `commitlint`.
`type`, `scope`, and `message` are all **required** - the scope must not be empty.

The `scope` should be the **Jira ticket** (preferred). If there is no Jira ticket yet, use a short module name instead.

Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.

Valid:

- `feat(ABC-123): add login validation` (with Jira ticket - preferred)
- `feat(auth): add login validation` (module name, when no Jira ticket)

Invalid (rejected):

- `fix: handle null response` (missing scope)
- `chore: configure husky git hooks` (missing scope)
- `update code` / `fix bug` (not conventional)

## Project Structure

The application uses a feature-based architecture with Vite and Ant Design Vue.

- `src/main.ts` - application entry point.
- `src/App.vue` - root Vue component.
- `src/boot/` - startup integrations for third-party Vue plugins.
- `src/router/` - Vue Router configuration and route records.
- `src/layouts/` - shell layouts that compose headers, navigation, sidebars, and page containers.
- `src/pages/` - route-level pages that are not owned by a specific feature.
- `src/features/` - business feature modules. Each feature owns its UI, pages, composables, services, stores, and types.
- `src/components/` - shared presentational Vue components used by multiple features.
- `src/composables/` - shared Vue composables that are not specific to one feature.
- `src/services/` - shared API clients and cross-feature services.
- `src/stores/` - shared Pinia stores and store exports.
- `src/types/` - shared TypeScript contracts and DTOs.
- `src/utils/` - framework-independent helper functions.
- `src/constants/` - shared constants and configuration values.
- `src/assets/` - bundled static assets imported from source code.
- `src/css/` - global application styles.
- `public/` - static public assets served as-is.
- `tests/` - Vitest tests.
- `vite.config.ts` - Vite build configuration.

### Feature Module Convention

Create new business features under `src/features/<feature-name>/`:

```text
src/features/example/
  components/    # Feature-only Vue components.
  composables/   # Feature-only composition functions.
  pages/         # Feature-owned route pages.
  services/      # Feature API calls and data access.
  stores/        # Feature Pinia stores.
  types/         # Feature-specific TypeScript types.
  index.ts       # Public exports for the feature module.
```

Feature modules may import from shared folders such as `src/services`, `src/utils`, and `src/components`. Shared folders should not import from a feature module.

Feature-only mocks and fixtures live in `src/features/<feature-name>/mocks`. Production services and stores must not import mock data; mocks are intended for examples, local development adapters, and tests.

### Naming and File Placement

- Vue components and layouts use PascalCase, for example `AppSectionHeader.vue` and `MainLayout.vue`.
- Route-level components use the `Page` suffix, for example `ExamplePage.vue`.
- Composables use the `use-<name>.ts` filename pattern and export a `use<Name>` function.
- Pinia stores use the `<name>.store.ts` filename pattern and export `use<Name>Store`.
- API and data-access modules use the `<name>.service.ts` filename pattern.
- Shared TypeScript contracts live in `src/types`; feature-owned contracts use `<name>.types.ts` inside the feature.
- Keep code inside a feature until it is used by multiple features and has a feature-independent responsibility.

### Imports and Module Boundaries

- Use path aliases such as `~`, `@`, `components/`, `assets/`, and `stores/` for shared or cross-feature imports (configured in `vite.config.ts`).
- Use relative imports for files inside the same feature module.
- A feature exposes its supported cross-feature API from `src/features/<feature-name>/index.ts`.
- Other features import from that public `index.ts` instead of reaching into internal feature folders.
- Shared modules must not import from `src/features`; this keeps the dependency direction from features to shared code.

### Routes

Route records live in `src/router/routes.ts`. Route pages owned by a business feature live under that feature's `pages/` directory; generic pages such as landing and error pages live in `src/pages/`. Prefer named routes and keep authentication or authorization rules in route metadata when those concerns are introduced.

### Store Convention

Stores use Pinia. App-wide stores live in `src/stores`, while feature-specific stores live in `src/features/<feature-name>/stores`.

Use the naming pattern `use<Name>Store`, for example `useAppStore` or `useExampleStore`.

Stores own client-side state and actions. Services own HTTP and data access. A service should return application data rather than exposing Axios response objects to stores and components.

### Testing Convention

Tests use Vitest and live under `tests/`, mirroring the relevant source area. Use the `*.test.ts` suffix. Unit tests should exercise composables, services, stores, and utilities through their public behavior; mock only external boundaries such as HTTP requests.

### Boot Files

Use `src/boot/` for startup integrations that must be installed on the Vue application, such as i18n, monitoring, or third-party Vue plugins. Boot files are imported and executed in `src/main.ts`. Keep one concern per boot file. Do not use boot files for feature-specific initialization.

### Assets and Public Files

Place assets imported by source code in `src/assets/` so Vite can process, hash, and bundle them. Place files that must keep a stable public filename in `public/` and reference them from the application root path.

## Environment Configuration

Vite loads environment files based on the current mode:

- `npm run dev` loads `.env.development`.
- `npm run build` loads `.env.production`.

Vite also loads its default env files when present, such as `.env`, `.env.local`, `.env.dev`, and `.env.prod`.

The shared Axios client in `src/services/api-client.ts` reads `VITE_API_BASE_URL` from the active env file and uses it as the API `baseURL`.

Copy `.env.example` when creating a new environment configuration. `VITE_API_BASE_URL` is declared in `env.d.ts` and validated when the API client is initialized; startup fails with a clear error when the value is missing or blank. Environment files must contain configuration only and must never contain committed secrets.

## Coding Standard

- ESLint uses the flat config in `eslint.config.js` with Vue, TypeScript, Quasar, import sorting, and unused import checks.
- Prettier uses `.prettierrc.json` with single quotes and a 100 character print width.
- EditorConfig keeps UTF-8, LF line endings, two-space indentation, final newlines, and trimmed trailing whitespace consistent across editors.
- Generated and dependency output is excluded through `.prettierignore` and ESLint ignores.

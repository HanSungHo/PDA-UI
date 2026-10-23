# Engineering & Design System Standards (`AGENT.md`)

This document establishes the mandatory architectural patterns, coding conventions, and quality standards for this repository. All contributors and AI coding assistants must adhere to these guidelines to maintain a scalable, maintainable, and robust codebase.

## 1. Domain-Driven Component Architecture

- **Business-First API Design:** Component interfaces (props, events, models) must be derived directly from **Business Domain** logic rather than arbitrary UI presentation needs.
- **Semantic Variants Over Hardcoded Styles:** Avoid low-level styling props (e.g., passing explicit colors like `color="green"` or layout rules directly into components). Use semantic business states or variants (e.g., `status="failed"`, `variant="danger"`) that delegate styling to the design system layer.
- **Encapsulation of Business Logic:** Keep business workflows decoupled from primitive UI components. Components should remain predictable and reusable across different business modules.

## 2. Design Token Architecture & Discipline

- **Zero Hardcoding in Tokens:** Design tokens must remain pure, abstract, and scalable. Never hardcode layout widths, hardcoded component dimensions, or magic numbers directly into token definitions (e.g., avoid `--ds-column-width` or component-specific sizing variables).
- **Abstraction from Design Tools:** Code must never reference raw design tool variables directly (e.g., `--figma-global-colors-*` or raw typography sizing variables). Always consume semantic tokens mapped through the project's design token pipeline.
- **Token Hierarchy:** Maintain a strict hierarchy: Global Tokens -> Semantic/Alias Tokens -> Component-Specific Tokens. Avoid skipping layers.

## 3. Native Accessibility (a11y) by Default

- **Proactive Inclusion:** Accessibility is a core architectural requirement, **never an afterthought or post-build patch**.
- **Prohibition of Runtime DOM Patches:** Do not use runtime workarounds such as manual `querySelector` lookups coupled with `setAttribute` injections to fix missing accessibility attributes.
- **Built-In Compliance:** Semantic HTML elements, proper ARIA attributes, keyboard navigability, focus management, and descriptive labels (`aria-label` vs user-facing labels) must be baked directly into the component's render lifecycle from the initial commit.

## 3.1 Icon Usage

- **Quasar Icons:** Use `QIcon` with the repository's configured Material Symbols names for interface icons. Do not add inline SVG icon markup to feature screens unless a reviewed design-system exception requires an unavailable custom asset.

## 4. DRY (Don't Repeat Yourself) & Code Hygiene

- **Eliminate Duplication:** Strictly avoid duplicated CSS rules, redundant component markup, and repeated configuration boilerplate. Extract shared patterns into composables, utility functions, or base components.
- **Storybook DRYness:** Keep documentation and story files clean by leveraging shared args, canvas templates, and control mappings rather than copying boilerplate configurations across multiple stories.
- **Modular Codebase:** Favor composition over inheritance and keep single-file components focused on a single responsibility.

## 5. CSS Architecture & Specificity Control

- **Ban on `!important`:** The use of `!important` to override properties (such as `background`, `color`, `transform`, or `transition`) is strictly prohibited. It indicates a broken CSS cascade or specificity war.
- **Proper Cascade Management:** Resolve style conflicts structurally through proper selector scoping, CSS modules, Tailwind utilities, or correct design token overriding. Maintain a predictable, low-specificity cascade.
- **Animation and State Transitions:** Ensure transitions and transforms are handled cleanly via native state classes rather than forced utility overrides.

## 6. Merge Request Delivery

When the user requests creation of a merge request, the deliverable must include a screen- or change-scoped Markdown review document under `docs/migration/` (unless the user explicitly excludes it). The document must link the relevant Jira ticket(s), describe requirements, technical solution, impact, test evidence, rollback, coverage, known gaps, and legacy-migration parity where applicable.

Create the merge request description from the repository MR template supplied by the user. Include the review-document path in `Doc Link`, populate every applicable section with evidence, and leave external checks (CI/CD, SonarQube, review resolution) unchecked until their results are known. Use the title format `[ABC-123] Short description` and assign the MR to the authenticated user when supported by GitLab.
## 7. Android Migration Copy Parity

- Before implementation, compare each user-facing string with the legacy Activity/Fragment and XML, including labels, hints/placeholders, button captions, validation and error text, empty states, and dialog messages.
- Preserve the exact legacy wording, capitalization, and punctuation by default. Use design for presentation; it does not silently override Android behavior or copy.
- If Figma copy differs, preserve Android wording and record both exact strings in the migration checklist and MR description. Ask only if the Android source is ambiguous, contradictory, appears defective, or an intentional copy change is proposed. Apply intentional copy changes only after explicit approval.

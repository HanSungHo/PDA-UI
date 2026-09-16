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

## 4. DRY (Don't Repeat Yourself) & Code Hygiene

- **Eliminate Duplication:** Strictly avoid duplicated CSS rules, redundant component markup, and repeated configuration boilerplate. Extract shared patterns into composables, utility functions, or base components.
- **Storybook DRYness:** Keep documentation and story files clean by leveraging shared args, canvas templates, and control mappings rather than copying boilerplate configurations across multiple stories.
- **Modular Codebase:** Favor composition over inheritance and keep single-file components focused on a single responsibility.

## 5. CSS Architecture & Specificity Control

- **Ban on `!important`:** The use of `!important` to override properties (such as `background`, `color`, `transform`, or `transition`) is strictly prohibited. It indicates a broken CSS cascade or specificity war.
- **Proper Cascade Management:** Resolve style conflicts structurally through proper selector scoping, CSS modules, Tailwind utilities, or correct design token overriding. Maintain a predictable, low-specificity cascade.
- **Animation and State Transitions:** Ensure transitions and transforms are handled cleanly via native state classes rather than forced utility overrides.

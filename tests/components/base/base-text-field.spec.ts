import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

function read(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

// Figma Base Component -> Input Form: Input Field 50:24040 and Text Area 50:23967.
// The spec applies to layout="horizontal" (the default); layout="vertical" keeps the stacked look.
// jsdom does not apply SFC styles, so these assertions guard the CSS contract; the rendered
// geometry is verified with Playwright against Storybook.
describe('text-field styles', () => {
  const shellStyles = read('src/components/base/shared/base-field-shell.css');
  // The text-field rules live at the end of the shared field shell stylesheet.
  const styles = shellStyles.slice(shellStyles.indexOf('Text-like fields'));
  const inputStyles = read('src/components/base/input/base-input.scss');
  const dropdownStyles = read('src/components/base/dropdown-list/base-dropdown-list.css');

  it('lives in the field shell stylesheet and is not re-imported by each component', () => {
    expect(styles).toContain(':where(.ds-input, .ds-dropdown-list)');
    expect(inputStyles).not.toContain('@use');
    expect(dropdownStyles).not.toContain('@import');
  });

  it('keeps layout="vertical" on the existing input and dropdown sizes', () => {
    expect(inputStyles).toMatch(
      /^\.ds-input \{\s*--ds-input-control-height: var\(--ds-control-height-md\);/,
    );
    expect(dropdownStyles).toMatch(
      /^\.ds-dropdown-list \{\s*--ds-dropdown-list-height: var\(--ds-control-height-md\);/,
    );
    // Every Figma rule in the shell is scoped to the horizontal layout.
    const scopedRules = styles.replace(/\/\*[\s\S]*?\*\//g, '').match(/^[^\s{}][^{}]*\{/gm) ?? [];
    for (const selector of scopedRules) {
      expect(selector, selector).toMatch(/:where\(|\.ds-field--horizontal/);
    }
  });

  it('applies the Figma size to horizontal inputs, textareas and dropdowns', () => {
    expect(inputStyles).toMatch(
      /&\.ds-field--horizontal \{\s*--ds-input-control-height: var\(--ds-text-field-height\);\s*--ds-input-control-font-size: var\(--ds-text-field-font-size\);\s*--ds-input-control-line-height: var\(--ds-text-field-line-height\);\s*--ds-input-placeholder-color: var\(--ds-text-field-placeholder-color\);/,
    );
    expect(inputStyles).toContain(
      'padding: calc(var(--ds-text-field-padding-y) - var(--ds-input-border-width))',
    );
    expect(inputStyles).toMatch(
      /&\.ds-field--horizontal\.ds-input--textarea \{\s*--ds-text-field-height: var\(--ds-input-textarea-height-sm\);/,
    );
    expect(dropdownStyles).toMatch(
      /\.ds-dropdown-list\.ds-field--horizontal \{\s*--ds-dropdown-list-height: var\(--ds-text-field-height\);/,
    );
    expect(dropdownStyles).toContain('padding: 0 var(--ds-text-field-padding-x);');
  });

  it('keeps a horizontal disabled value in primary text and mutes only the placeholder', () => {
    expect(inputStyles).toMatch(
      /&\.ds-field--horizontal\.ds-input--disabled \{\s*--ds-input-control-background: var\(--gray-200\);\s*--ds-input-control-color: var\(--text-text-primary\);\s*--ds-input-placeholder-color: var\(--text-text-disabled\);/,
    );
    expect(dropdownStyles).toMatch(
      /\.ds-dropdown-list\.ds-field--horizontal\.ds-dropdown-list--disabled \{\s*--ds-dropdown-list-border: var\(--border-border-disabled\);\s*--ds-field-placeholder-color: var\(--text-text-disabled\);/,
    );
    // Quasar's !important opacity on disabled children is avoided by dropping the container box.
    expect(dropdownStyles).toMatch(/\.q-field__control-container \{\s*display: contents;/);
  });

  it('marks keyboard focus on a default-status readonly input with the brand border', () => {
    expect(inputStyles).toMatch(
      /&\.ds-field--default\.ds-input--readonly\s+&__qinput:has\(\.ds-input__native:focus-visible\)\s+\.q-field__control \{\s*border-color: var\(--ds-input-focus-border-color\);\s*\}/,
    );
    expect(inputStyles).not.toContain('outline-offset');
  });

  it('shows horizontal helper text 4px below the control, green while an editable field has focus', () => {
    expect(styles).toMatch(
      /:is\(\.ds-input, \.ds-dropdown-list\)\.ds-field--horizontal \.ds-field__message \{\s*margin-top: calc\(-1 \* var\(--spacing-space-0\)\);/,
    );
    expect(styles).toMatch(
      /\.ds-field--horizontal\.ds-field--default:not\(\s*\.ds-input--readonly,\s*\.ds-dropdown-list--readonly\s*\):focus-within\s+\.ds-field__message \{\s*color: var\(--text-text-success\);/,
    );
  });

  it('uses the shared label width and centres it on the horizontal control', () => {
    expect(styles).toMatch(
      /:is\(\.ds-input, \.ds-dropdown-list\)\.ds-field--horizontal \{[^}]*--ds-field-label-font-size: var\(--font-size-12px\);[^}]*grid-template-columns: var\(--ds-field-label-width\) minmax\(0, 1fr\);[^}]*column-gap: var\(--spacing-space-1\);/,
    );
    expect(styles).toMatch(
      /:is\(\.ds-input, \.ds-dropdown-list\)\.ds-field--horizontal \.ds-field__header \{\s*min-height: var\(--ds-text-field-height\);/,
    );
    expect(styles).toMatch(
      /:is\(\.ds-input, \.ds-dropdown-list\)\.ds-field--horizontal \.ds-field__label \{\s*max-width: none;/,
    );
    expect(styles).toMatch(
      /:is\(\.ds-input, \.ds-dropdown-list\)\.ds-field--horizontal > \.q-field \{\s*grid-column: 2;/,
    );
    expect(styles).toMatch(
      /:not\(:has\(> \.ds-field__header\)\)\s+> \.ds-field__message \{\s*grid-column: 1 \/ -1;/,
    );
  });
});

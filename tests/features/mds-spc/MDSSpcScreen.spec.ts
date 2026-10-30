import { flushPromises, mount } from '@vue/test-utils';
import { BaseDropdownList } from 'src/components/base';
import MDSSpcScreen from 'src/features/mds-spc/components/MDSSpcScreen.vue';
import { emptyMDSSpcFields, MDS_SPC_FIELD_ROWS } from 'src/features/mds-spc/mds-spc';
import { afterEach, describe, expect, it } from 'vitest';

const fields = {
  ...emptyMDSSpcFields(),
  Time: '2026-10-26 09:15:30.123',
  Slot: '3',
  Equipid: 'EQP-DEMO-01',
  Parameter: 'ETCH_RATE',
  SpcResult: '[1, 3]',
  Avg: '12.5',
};

const options = [
  { label: 'NULL', value: 0 },
  { label: 'Inspection one', value: 1 },
];

function mountScreen(isBusy = false) {
  return mount(MDSSpcScreen, {
    attachTo: document.body,
    props: {
      fields,
      title: '#MDSSPC INTERLOCK#',
      measureOptions: options,
      actionOptions: options,
      selectedMeasure: 0,
      selectedAction: 0,
      isBusy,
    },
  });
}

// BaseModal's QDialog (stubbed in tests/setup.ts) teleports the content to <body>.
function textbox(label: string): HTMLInputElement {
  const field = [...document.body.querySelectorAll('.ds-input')].find(
    (element) => element.querySelector('.ds-field__label')?.textContent?.trim() === label,
  );
  const input = field?.querySelector<HTMLInputElement>('input');
  if (!input) throw new Error(`No textbox labelled ${label}`);
  return input;
}

function button(name: string): HTMLButtonElement {
  const match = [...document.body.querySelectorAll<HTMLButtonElement>('button')].find(
    (element) => element.textContent?.trim() === name,
  );
  if (!match) throw new Error(`No button named ${name}`);
  return match;
}

describe('MDSSpcScreen', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders the Android fields read-only in the Figma two-column modal', async () => {
    const wrapper = mountScreen();
    await flushPromises();

    const dialog = document.body.querySelector('.q-dialog');
    expect(dialog?.getAttribute('aria-label')).toBe('#MDSSPC INTERLOCK#');
    expect(document.body.querySelector('.ds-modal__title')?.textContent?.trim()).toBe(
      '#MDSSPC INTERLOCK#',
    );
    expect(document.body.querySelector('.ds-modal__close-btn')).toBeNull();

    const rows = [...document.body.querySelectorAll('.mds-spc-row')];
    expect(rows.map((row) => row.children.length)).toEqual(MDS_SPC_FIELD_ROWS.map((r) => r.length));
    for (const field of MDS_SPC_FIELD_ROWS.flat()) {
      expect(textbox(field.label).readOnly).toBe(true);
    }
    expect(textbox('발생시간').value).toBe('2026-10-26 09:15:30.123');
    expect(textbox('ALARM_LEVEL').value).toBe('3');
    expect(textbox('FACILITY').closest('.ds-input')?.className).toContain('tone-warning-subtle');
    expect(textbox('SPC 결과').closest('.ds-input')?.className).toContain('tone-error-text');
    expect(textbox('SPC 결과').closest('.ds-input')?.className).toContain(
      'mds-spc-value--spc-result',
    );

    const footer = document.body.querySelector('.ds-modal__footer');
    expect(
      [...(footer?.querySelectorAll('button') ?? [])].map((b) => b.textContent?.trim()),
    ).toEqual(['OK', '저장']);
    wrapper.unmount();
  });

  it('emits OK, save and the selected choices', async () => {
    const wrapper = mountScreen();
    await flushPromises();

    button('OK').click();
    button('저장').click();
    const [measure, action] = wrapper.findAllComponents(BaseDropdownList);
    measure!.vm.$emit('update:modelValue', 1);
    action!.vm.$emit('update:modelValue', 1);

    expect(wrapper.emitted('ok')).toHaveLength(1);
    expect(wrapper.emitted('save')).toHaveLength(1);
    expect(wrapper.emitted('update:selectedMeasure')).toEqual([[1]]);
    expect(wrapper.emitted('update:selectedAction')).toEqual([[1]]);
    wrapper.unmount();
  });

  it('marks only the pending choices busy and blocks OK, the choices and Save', async () => {
    const wrapper = mountScreen(true);
    await flushPromises();

    expect(document.body.querySelector('.mds-spc-fields')?.hasAttribute('aria-busy')).toBe(false);
    expect(document.body.querySelector('.mds-spc-choices')?.getAttribute('aria-busy')).toBe('true');
    expect(button('OK').disabled).toBe(true);
    expect(button('저장').getAttribute('aria-busy')).toBe('true');
    for (const dropdown of wrapper.findAllComponents(BaseDropdownList)) {
      expect(dropdown.props('disabled')).toBe(true);
    }
    wrapper.unmount();
  });
});

import { mount } from '@vue/test-utils';
import ESheetLegacyPage from 'src/pages/ESheetLegacyPage.vue';
import { describe, expect, it } from 'vitest';

describe('ESheetLegacyPage', () => {
  it('renders legacy grid and supports search, selection, modes and drawer', async () => {
    const wrapper = mount(ESheetLegacyPage);
    expect(wrapper.get('h1').text()).toBe('eSheet');
    expect(wrapper.findAll('tbody tr')).toHaveLength(7);
    await wrapper.get('input[aria-label="LOT"]').setValue('tj00003');
    await wrapper.get('button[aria-label="Search LOT"]').trigger('click');
    expect(wrapper.get('[role="status"]').text()).toContain('TJ00003');
    await wrapper.findAll('tbody tr')[1].trigger('click');
    await wrapper.findAll('.legacy-footer button')[0].trigger('click');
    expect(wrapper.find('[aria-label="Legacy action drawer"]').exists()).toBe(true);
  });
});

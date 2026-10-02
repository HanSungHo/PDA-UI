import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { route, router } = vi.hoisted(() => ({
  route: { query: { LOTID: 'LOT-A' } },
  router: { replace: vi.fn() },
}));

vi.mock('vue-router', () => ({ useRoute: () => route, useRouter: () => router }));

import RemoteChildUnavailablePage from 'src/features/remote-machine-select/pages/RemoteChildUnavailablePage.vue';

describe('RemoteChildUnavailablePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ['meas', 'Remote MEAS'],
    ['imp', 'Remote IMP'],
    ['cvd', 'Remote CVD'],
  ] as const)('labels the %s route and returns to eSheet with the LOT', async (flow, title) => {
    const wrapper = mount(RemoteChildUnavailablePage, {
      props: { flow },
      global: {
        stubs: { BaseButton: { template: '<button @click="$emit(\'click\')"><slot /></button>' } },
      },
    });

    expect(wrapper.text()).toContain(title);
    expect(wrapper.text()).toContain('LOT-A');
    expect(wrapper.text()).toContain('아직 구현되지 않았습니다');
    await wrapper.get('button').trigger('click');
    expect(router.replace).toHaveBeenCalledWith({ path: '/esheet', query: { lotId: 'LOT-A' } });
  });
});

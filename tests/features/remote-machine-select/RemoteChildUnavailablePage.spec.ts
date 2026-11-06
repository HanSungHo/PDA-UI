import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { route, router } = vi.hoisted(() => ({
  route: { query: { LOTID: 'LOT-A' } as Record<string, string | string[] | undefined> },
  router: { replace: vi.fn() },
}));

vi.mock('vue-router', () => ({ useRoute: () => route, useRouter: () => router }));

import RemoteChildUnavailablePage from 'src/features/remote-machine-select/pages/RemoteChildUnavailablePage.vue';

describe('RemoteChildUnavailablePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    route.query = { LOTID: 'LOT-A' };
  });

  function mountPage() {
    return mount(RemoteChildUnavailablePage, {
      props: { flow: 'cvd' },
      global: {
        stubs: { BaseButton: { template: '<button @click="$emit(\'click\')"><slot /></button>' } },
      },
    });
  }

  it('uses the first LOTID when the query repeats it', async () => {
    route.query = { LOTID: ['LOT-B', 'LOT-C'] };
    const wrapper = mountPage();

    expect(wrapper.text()).toContain('LOT No. LOT-B');
    await wrapper.get('button').trigger('click');
    expect(router.replace).toHaveBeenCalledWith({ path: '/esheet', query: { lotId: 'LOT-B' } });
  });

  it('hides the LOT line and returns with an empty LOT when LOTID is missing', async () => {
    route.query = {};
    const wrapper = mountPage();

    expect(wrapper.text()).not.toContain('LOT No.');
    await wrapper.get('button').trigger('click');
    expect(router.replace).toHaveBeenCalledWith({ path: '/esheet', query: { lotId: '' } });
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

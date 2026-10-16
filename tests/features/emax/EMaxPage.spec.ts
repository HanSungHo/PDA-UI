import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import EMaxPage from 'src/features/emax/pages/EMaxPage.vue';
import appRoutes from 'src/router/routes';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { createMemoryHistory, createRouter, type Router, RouterView } from 'vue-router';

enableAutoUnmount(afterEach);
let router: Router;

function receiverMessage(): string {
  const fields = ['<TIME>2026-10-15T10:20:30+09:00'];
  for (let index = 1; index < 23; index += 1) fields.push(`<F${index}>value${index}`);
  fields.push('<DESC>Vent completed');
  return `INTERLOCKMANAGER<Table diffgr:${fields.join('</')}`;
}

async function mountPage(message?: string) {
  await router.push({ path: '/emax', query: message ? { receiverMessage: message } : {} });
  const wrapper = mount(defineComponent({ setup: () => () => h(RouterView) }), {
    attachTo: document.body,
    global: { plugins: [router] },
  });
  await flushPromises();
  return wrapper;
}

describe('EMaxPage legacy behavior', () => {
  beforeEach(async () => {
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/main', component: { template: '<div>Main</div>' } },
        { path: '/emax', component: EMaxPage },
      ],
    });
    await router.push('/main');
    await router.isReady();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('registers the real named route', async () => {
    const route = appRoutes.find((record) => record.path === '/emax');
    expect(route?.name).toBe('emax');
    expect(await (route?.component as () => Promise<{ default: unknown }>)()).toHaveProperty(
      'default',
      EMaxPage,
    );
  });

  it('renders exact legacy labels and parsed UDP content', async () => {
    await mountPage(receiverMessage());
    expect(document.querySelector('#emax-title')?.textContent).toBe('Vent 완료');
    expect(document.querySelector('.emax-dialog__time-label')?.textContent).toBe('발생시간');
    const timeChips = Array.from(document.querySelectorAll('.emax-dialog__chip')).map((chip) =>
      chip.textContent?.trim(),
    );
    expect(timeChips).toEqual(['2026-10-15', '10:20:30']);
    expect(document.querySelector('[data-testid="txt-receiver-comment"]')?.textContent).toBe(
      ' \nVent completed\n',
    );
    expect(document.querySelector('[data-testid="btn-ok"]')?.textContent).toContain('Ok');
  });

  it('does not inject preview data on the normal route', async () => {
    await mountPage();
    expect(document.querySelector('[data-testid="txt-receiver-time-result"]')?.textContent).toBe(
      '',
    );
    expect(document.querySelector('[data-testid="txt-receiver-comment"]')?.textContent).toBe(' ');
  });

  it('finishes on Ok and ignores a double click within 1000 ms', async () => {
    let now = 10_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    await mountPage(receiverMessage());
    const button = document.querySelector('[data-testid="btn-ok"]') as HTMLElement;
    button.click();
    button.click();
    await flushPromises();
    expect(router.currentRoute.value.path).toBe('/main');
    now += 1001;
  });

  it('matches Activity back behavior with Escape', async () => {
    await mountPage(receiverMessage());
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await flushPromises();
    expect(router.currentRoute.value.path).toBe('/main');
  });
});

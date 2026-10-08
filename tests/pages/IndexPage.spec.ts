import { flushPromises, mount } from '@vue/test-utils';
import App from 'src/App.vue';
import IndexPage from 'src/pages/IndexPage.vue';
import SecondPage from 'src/pages/SecondPage.vue';
import { describe, expect, it } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';

const quasarGalleryComponents = [
  'q-avatar',
  'q-badge',
  'q-banner',
  'q-breadcrumbs',
  'q-breadcrumbs-el',
  'q-btn',
  'q-btn-dropdown',
  'q-carousel',
  'q-carousel-slide',
  'q-card',
  'q-card-actions',
  'q-card-section',
  'q-checkbox',
  'q-chip',
  'q-circular-progress',
  'q-date',
  'q-dialog',
  'q-editor',
  'q-expansion-item',
  'q-fab',
  'q-fab-action',
  'q-file',
  'q-icon',
  'q-input',
  'q-item',
  'q-item-label',
  'q-item-section',
  'q-linear-progress',
  'q-list',
  'q-markup-table',
  'q-option-group',
  'q-pagination',
  'q-range',
  'q-rating',
  'q-select',
  'q-separator',
  'q-skeleton',
  'q-slider',
  'q-space',
  'q-spinner-dots',
  'q-tab',
  'q-tab-panel',
  'q-tab-panels',
  'q-table',
  'q-tabs',
  'q-time',
  'q-toggle',
  'q-tooltip',
].reduce<Record<string, boolean>>((stubs, component) => {
  stubs[component] = true;
  return stubs;
}, {});

describe('IndexPage', () => {
  it('renders the Quasar component gallery sections', () => {
    const wrapper = mount(IndexPage, {
      global: {
        stubs: quasarGalleryComponents,
        directives: {
          'close-popup': {},
          ripple: {},
        },
      },
    });

    try {
      expect(wrapper.get('h1').text()).toBe('Quasar component gallery');
      expect(wrapper.text()).toContain('Common controls, navigation, feedback, and data display.');
      expect(wrapper.text()).toContain('Buttons & indicators');
      expect(wrapper.text()).toContain('Form controls');
      expect(wrapper.text()).toContain('Selection & range');
      expect(wrapper.text()).toContain('Navigation patterns');
      expect(wrapper.text()).toContain('Feedback & overlays');
      expect(wrapper.text()).toContain('Tables & pagination');
      expect(wrapper.text()).toContain('Date and time pickers');
      expect(wrapper.text()).toContain('Rich text & carousel');
    } finally {
      wrapper.unmount();
    }
  });

  it('switches between routed pages', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: IndexPage },
        { path: '/second', component: SecondPage },
      ],
    });
    await router.push('/');
    await router.isReady();

    const wrapper = mount(App, {
      global: {
        plugins: [router],
        stubs: quasarGalleryComponents,
        directives: { 'close-popup': {}, ripple: {} },
      },
    });

    try {
      expect(wrapper.get('h1').text()).toBe('Quasar component gallery');
      await router.push('/second');
      await flushPromises();

      expect(router.currentRoute.value.fullPath).toBe('/second');
      expect(wrapper.text()).toContain('Second Page');
      expect(wrapper.text()).toContain('Go to Index Page');

      await wrapper.get('button').trigger('click');
      await flushPromises();

      expect(router.currentRoute.value.fullPath).toBe('/');
      expect(wrapper.get('h1').text()).toBe('Quasar component gallery');
    } finally {
      wrapper.unmount();
    }
  });
});

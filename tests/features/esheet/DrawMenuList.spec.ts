import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { enableAutoUnmount, mount } from '@vue/test-utils';
import type { DrawMenuListProps } from 'src/features/esheet';
import { DRAW_MENU_ACTION_ID } from 'src/features/esheet';
import { DrawMenuList } from 'src/features/esheet';
import { afterEach, describe, expect, it } from 'vitest';

enableAutoUnmount(afterEach);

const props: DrawMenuListProps = {
  open: true,
  title: 'CONT CD',
  lotId: 'WIP00001',
  factoryName: 'HF',
  productName: 'PRODUCT-A',
  routeName: 'ROUTE-A',
  area: 'DIFF',
  selectedAction: DRAW_MENU_ACTION_ID.lotStatus,
  row: {
    ISCURRENT: 'Y',
    OPERATION: '10001',
    SUBOPERATION: '010',
    PROCESSSTEP: 'CONT CD',
    OPERSEQUENCE: '20',
    COMMENTCNT: '1',
    ENDTIME: '',
    LOT_STATUS: 'WAIT',
  },
};

describe('DrawMenuList', () => {
  it('renders title, actions, selected item, and disabled state', () => {
    const wrapper = mount(DrawMenuList, { props });

    expect(wrapper.get('.draw-menu-list__title').text()).toBe('CONT CD');
    expect(wrapper.text()).toContain('EEN 설정');
    expect(wrapper.text()).toContain('LOT 상태');
    expect(wrapper.find(`[data-action-id="${DRAW_MENU_ACTION_ID.lotStatus}"]`).classes()).toContain(
      'ds-drawer-item--selected',
    );
    expect(
      wrapper.find(`[data-action-id="${DRAW_MENU_ACTION_ID.moveOut}"]`).attributes('disabled'),
    ).toBeDefined();
  });

  it('emits close from overlay and back button', async () => {
    const wrapper = mount(DrawMenuList, { props });

    await wrapper.get('.draw-menu-list__overlay').trigger('click');
    await wrapper.get('.draw-menu-list__back').trigger('click');

    expect(wrapper.emitted('close')).toHaveLength(2);
  });

  it('emits enabled action selection and blocks disabled actions', async () => {
    const wrapper = mount(DrawMenuList, { props });

    await wrapper.find(`[data-action-id="${DRAW_MENU_ACTION_ID.lotStatus}"]`).trigger('click');
    await wrapper.find(`[data-action-id="${DRAW_MENU_ACTION_ID.moveOut}"]`).trigger('click');

    expect(wrapper.emitted('select-action')).toHaveLength(1);
    expect(wrapper.emitted('select-action')?.[0]?.[0]).toMatchObject({
      id: DRAW_MENU_ACTION_ID.lotStatus,
      label: 'LOT 상태',
      payload: { LOTID: 'WIP00001' },
    });
  });

  it('hides the drawer from interaction when closed', () => {
    const wrapper = mount(DrawMenuList, {
      props: { ...props, open: false },
    });

    expect(wrapper.classes()).toContain('draw-menu-list--closed');
    expect(wrapper.attributes('aria-hidden')).toBe('true');
  });

  it('keeps the drawer inside narrow viewports and uses design font sizing', () => {
    const css = readFileSync(
      resolve(process.cwd(), 'src/features/esheet/components/draw-menu-list/draw-menu-list.css'),
      'utf8',
    );

    expect(css).toContain('max-width: 100vw');
    expect(css).not.toContain('min-width: 360px');
    expect(css).toContain(
      'background: linear-gradient(180deg, #1c493a 0%, #96b1a8 53.85%, #ecf8f1 100%)',
    );
    expect(css).toContain('border-bottom: 1px solid rgb(2 176 165 / 20%)');
    expect(css).toContain('padding: 24px');
    expect(css).toContain('gap: 24px');
    expect(css).toContain('height: 110px');
    expect(css).toContain('padding: 12px 24px');
    expect(css).toContain('gap: 8px');
    expect(css).toContain('border-radius: 8px');
    expect(css).toContain('font-size: 44px');
    expect(css).toContain('font-size: 38px');
    expect(css).toContain('background: #02b0a5');
    expect(css).toContain('color: #f9fafb');
    expect(css).toContain('color: #d1d5dc');
    expect(css).toContain('width: 32px');
    expect(css).toContain('height: 32px');
  });
});

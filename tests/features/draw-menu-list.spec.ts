import { mount } from '@vue/test-utils';
import { DRAW_MENU_ACTION_ID } from 'src/features/esheet/components/draw-menu-list/draw-menu-list.constants';
import DrawMenuList from 'src/features/esheet/components/draw-menu-list/DrawMenuList.vue';
import { useDrawMenuActions } from 'src/features/esheet/composables/use-draw-menu-actions';
import type { ESheetDrawMenuRow } from 'src/features/esheet/esheet.types';
import { describe, expect, it } from 'vitest';

const row: ESheetDrawMenuRow = {
  ACTIONTYPE: '',
  COMMENTCNT: '2',
  ENDTIME: '',
  EQPGROUP: 'PHOTO',
  ISCURRENT: 'Y',
  LOT_STATUS: 'WAIT',
  OPERATION: 'P00002',
  OPERSEQUENCE: '0002',
  PROCESSSTEP: 'Inspection',
  SUBOPERATION: '00',
};

describe('useDrawMenuActions', () => {
  it('builds comment payload from the selected process and leaves comment enabled', () => {
    const actions = useDrawMenuActions({
      lotId: 'WP00001',
      factoryName: 'GUMI',
      productName: 'P-DM-TEST-6F',
      routeName: 'BP04',
      area: 'DIFF',
      row,
    });
    const comment = actions.find((action) => action.id === DRAW_MENU_ACTION_ID.comment);
    expect(comment).toMatchObject({
      disabled: false,
      payload: {
        LOTID: 'WP00001',
        OPERATION: 'P00002',
        PROCESSSTEP: 'Inspection',
        OPERSEQUENCE: '0002',
      },
    });
  });

  it('disables move-in for a non-current row', () => {
    const actions = useDrawMenuActions({
      lotId: 'WP00001',
      factoryName: 'GUMI',
      productName: '',
      routeName: '',
      area: 'DIFF',
      row: { ...row, ISCURRENT: 'N' },
    });
    expect(actions.find((action) => action.id === DRAW_MENU_ACTION_ID.moveIn)?.disabled).toBe(true);
  });
});

describe('DrawMenuList focus behavior', () => {
  it('does not leave focus inside the drawer when it is closed', async () => {
    const wrapper = mount(DrawMenuList, {
      attachTo: document.body,
      props: {
        open: true,
        title: 'BARC COATING',
        lotId: 'WP00001',
        factoryName: 'GUMI',
        productName: 'P-DM-TEST-6F',
        routeName: 'BP04',
        area: 'DIFF',
        row,
      },
    });
    const overlay = wrapper.get('.draw-menu-list__overlay');
    (overlay.element as HTMLButtonElement).focus();

    expect(document.activeElement).toBe(overlay.element);
    await overlay.trigger('click');

    expect(document.activeElement).not.toBe(overlay.element);
    wrapper.unmount();
  });

  it('does not leave action-button focus inside the drawer when an action is selected', async () => {
    const wrapper = mount(DrawMenuList, {
      attachTo: document.body,
      props: {
        open: true,
        title: 'BARC COATING',
        lotId: 'WP00001',
        factoryName: 'GUMI',
        productName: 'P-DM-TEST-6F',
        routeName: 'BP04',
        area: 'DIFF',
        row,
      },
    });
    const action = wrapper.get('[data-action-id="comment"]');
    (action.element as HTMLButtonElement).focus();

    expect(document.activeElement).toBe(action.element);
    await action.trigger('click');

    expect(document.activeElement).not.toBe(action.element);
    wrapper.unmount();
  });
});

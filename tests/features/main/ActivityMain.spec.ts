import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { enableAutoUnmount, mount } from '@vue/test-utils';
import {
  ACTIVITY_MAIN_ACTION_ID,
  ACTIVITY_MAIN_LEFT_ACTIONS,
  ACTIVITY_MAIN_RIGHT_ACTIONS,
  ActivityMain,
  type ActivityMainProps,
  getVisibleActivityMainActions,
} from 'src/features/main/components/activity-main';
import { ROUTE } from 'src/constants/routes';
import { afterEach, describe, expect, it } from 'vitest';

enableAutoUnmount(afterEach);

const screenProps: ActivityMainProps = {
  deviceName: 'PDA-01',
  mainTitle: 'HiFOS AR-DEMO',
  isLoggedIn: false,
  operatorName: '',
  gasInput: 'N',
};

function mountActivityMain(props: Partial<ActivityMainProps> = {}) {
  return mount(ActivityMain, {
    props: {
      ...screenProps,
      ...props,
    },
  });
}

function actionSelector(actionId: string): string {
  return `[data-action-id="${actionId}"]`;
}

describe('activity main action mapping', () => {
  it('keeps the launcher actions in the original columns', () => {
    expect(ACTIVITY_MAIN_LEFT_ACTIONS.map((action) => action.id)).toEqual([
      ACTIVITY_MAIN_ACTION_ID.login,
      ACTIVITY_MAIN_ACTION_ID.esheet,
      ACTIVITY_MAIN_ACTION_ID.dispatching,
      ACTIVITY_MAIN_ACTION_ID.diffParam,
      ACTIVITY_MAIN_ACTION_ID.wetAuto,
      ACTIVITY_MAIN_ACTION_ID.shelfIncoming,
      ACTIVITY_MAIN_ACTION_ID.prChange,
      ACTIVITY_MAIN_ACTION_ID.rcp,
      ACTIVITY_MAIN_ACTION_ID.merge,
      ACTIVITY_MAIN_ACTION_ID.autoMerge,
      ACTIVITY_MAIN_ACTION_ID.sampleRelease,
      ACTIVITY_MAIN_ACTION_ID.chat,
      ACTIVITY_MAIN_ACTION_ID.sendMessage,
      ACTIVITY_MAIN_ACTION_ID.gas,
      ACTIVITY_MAIN_ACTION_ID.waferMaterialCheck,
      ACTIVITY_MAIN_ACTION_ID.esdMaster,
      ACTIVITY_MAIN_ACTION_ID.maskBulkChange,
    ]);

    expect(ACTIVITY_MAIN_RIGHT_ACTIONS.map((action) => action.id)).toEqual([
      ACTIVITY_MAIN_ACTION_ID.split,
      ACTIVITY_MAIN_ACTION_ID.sideDummy,
      ACTIVITY_MAIN_ACTION_ID.lotStatus,
      ACTIVITY_MAIN_ACTION_ID.maskLocation,
      ACTIVITY_MAIN_ACTION_ID.machineStatus,
      ACTIVITY_MAIN_ACTION_ID.lotStatusByBay,
      ACTIVITY_MAIN_ACTION_ID.etch,
      ACTIVITY_MAIN_ACTION_ID.batch,
      ACTIVITY_MAIN_ACTION_ID.testResultInput,
      ACTIVITY_MAIN_ACTION_ID.furnaceRemote,
      ACTIVITY_MAIN_ACTION_ID.measRemote,
      ACTIVITY_MAIN_ACTION_ID.cvdTest,
      ACTIVITY_MAIN_ACTION_ID.operationProgress,
      ACTIVITY_MAIN_ACTION_ID.inputScopeData,
      ACTIVITY_MAIN_ACTION_ID.wipInquiry,
    ]);
  });

  it('keeps action config labels and visibility independent from launcher display text', () => {
    expect(
      ACTIVITY_MAIN_LEFT_ACTIONS.find((action) => action.id === ACTIVITY_MAIN_ACTION_ID.diffParam),
    ).toMatchObject({
      label: 'Diff 계측 Para',
      visibility: 'always',
    });
    expect(
      ACTIVITY_MAIN_LEFT_ACTIONS.find(
        (action) => action.id === ACTIVITY_MAIN_ACTION_ID.maskBulkChange,
      ),
    ).toMatchObject({
      label: 'Mask 일괄 변경',
      visibility: 'always',
    });
    expect(
      ACTIVITY_MAIN_RIGHT_ACTIONS.find(
        (action) => action.id === ACTIVITY_MAIN_ACTION_ID.inputScopeData,
      ),
    ).toMatchObject({
      label: 'Scope Data 입력',
      visibility: 'always',
    });
  });

  it('keeps send message and operation progress hidden while gas follows GASINPUT', () => {
    const withoutGas = getVisibleActivityMainActions({ gasInput: 'N' });
    const withGas = getVisibleActivityMainActions({ gasInput: 'Y' });

    expect(withoutGas.map((action) => action.id)).not.toContain(
      ACTIVITY_MAIN_ACTION_ID.sendMessage,
    );
    expect(withGas.map((action) => action.id)).not.toContain(ACTIVITY_MAIN_ACTION_ID.sendMessage);
    expect(withoutGas.map((action) => action.id)).not.toContain(
      ACTIVITY_MAIN_ACTION_ID.operationProgress,
    );
    expect(withGas.map((action) => action.id)).not.toContain(
      ACTIVITY_MAIN_ACTION_ID.operationProgress,
    );
    expect(withoutGas.map((action) => action.id)).not.toContain(ACTIVITY_MAIN_ACTION_ID.gas);
    expect(withGas.map((action) => action.id)).toContain(ACTIVITY_MAIN_ACTION_ID.gas);
  });

  it('uses action id constants outside the action id source of truth', () => {
    const componentSource = readFileSync(
      resolve(process.cwd(), 'src/features/main/components/activity-main/ActivityMain.vue'),
      'utf8',
    );
    const constantsSource = readFileSync(
      resolve(
        process.cwd(),
        'src/features/main/components/activity-main/activity-main.constants.ts',
      ),
      'utf8',
    );
    const actionConfigSource = constantsSource.slice(
      constantsSource.indexOf('export const ACTIVITY_MAIN_HEADER_ACTIONS'),
    );

    expect(componentSource).toContain('ACTIVITY_MAIN_ACTION_ID');
    expect(componentSource).not.toMatch(/['"]btn_[^'"]+['"]/);
    expect(actionConfigSource).not.toMatch(/id:\s*['"]btn_[^'"]+['"]/);
  });
});

describe('ActivityMain', () => {
  it('renders launcher title, visible action columns, and footer actions', () => {
    const wrapper = mountActivityMain();

    expect(wrapper.get('.activity-main__title').text()).toBe('HiFOS AR-DEMO');
    expect(wrapper.get('[data-testid="activity-main-profile-card"]').text()).toContain(
      'HiFOS DEMO',
    );

    const actionPanel = wrapper.get('[data-testid="activity-main-action-panel"]');
    expect(actionPanel.text()).toContain('eSheet');
    expect(actionPanel.text()).not.toContain('LOG IN');
    expect(actionPanel.text()).not.toContain('환경 설정');
    expect(actionPanel.text()).not.toContain('종료');

    expect(actionPanel.text()).toContain('Split');

    const footer = wrapper.get('[data-testid="activity-main-footer"]');
    expect(footer.text()).toContain('환경 설정');
    expect(footer.text()).toContain('종료');
  });

  it('renders function menu as two-column rows from the original left and right action lists', () => {
    const wrapper = mountActivityMain();
    const rows = wrapper.findAll('[data-testid="activity-main-action-row"]');

    expect(rows).toHaveLength(14);
    expect(
      rows.map((row) =>
        row.findAll('[data-action-id]').map((button) => button.attributes('data-action-id')),
      ),
    ).toEqual([
      [ACTIVITY_MAIN_ACTION_ID.esheet, ACTIVITY_MAIN_ACTION_ID.split],
      [ACTIVITY_MAIN_ACTION_ID.dispatching, ACTIVITY_MAIN_ACTION_ID.sideDummy],
      [ACTIVITY_MAIN_ACTION_ID.diffParam, ACTIVITY_MAIN_ACTION_ID.lotStatus],
      [ACTIVITY_MAIN_ACTION_ID.wetAuto, ACTIVITY_MAIN_ACTION_ID.maskLocation],
      [ACTIVITY_MAIN_ACTION_ID.shelfIncoming, ACTIVITY_MAIN_ACTION_ID.machineStatus],
      [ACTIVITY_MAIN_ACTION_ID.prChange, ACTIVITY_MAIN_ACTION_ID.lotStatusByBay],
      [ACTIVITY_MAIN_ACTION_ID.rcp, ACTIVITY_MAIN_ACTION_ID.etch],
      [ACTIVITY_MAIN_ACTION_ID.merge, ACTIVITY_MAIN_ACTION_ID.batch],
      [ACTIVITY_MAIN_ACTION_ID.autoMerge, ACTIVITY_MAIN_ACTION_ID.testResultInput],
      [ACTIVITY_MAIN_ACTION_ID.sampleRelease, ACTIVITY_MAIN_ACTION_ID.furnaceRemote],
      [ACTIVITY_MAIN_ACTION_ID.chat, ACTIVITY_MAIN_ACTION_ID.measRemote],
      [ACTIVITY_MAIN_ACTION_ID.waferMaterialCheck, ACTIVITY_MAIN_ACTION_ID.cvdTest],
      [ACTIVITY_MAIN_ACTION_ID.esdMaster, ACTIVITY_MAIN_ACTION_ID.inputScopeData],
      [ACTIVITY_MAIN_ACTION_ID.maskBulkChange, ACTIVITY_MAIN_ACTION_ID.wipInquiry],
    ]);
    expect(rows.some((row) => row.classes().includes('activity-main__action-row--single'))).toBe(
      false,
    );
  });

  it('keeps one-sided overflow actions in a half-width column instead of spanning both columns', () => {
    const wrapper = mountActivityMain({ gasInput: 'Y' });
    const rows = wrapper.findAll('[data-testid="activity-main-action-row"]');
    const lastRow = rows.at(-1);

    expect(lastRow?.findAll('[data-action-id]').map((button) => button.attributes('data-action-id')))
      .toEqual([ACTIVITY_MAIN_ACTION_ID.maskBulkChange]);
    expect(lastRow?.classes()).not.toContain('activity-main__action-row--single');
  });

  it('keeps rendering labels from the action constants while applying the new style', () => {
    const wrapper = mountActivityMain();

    expect(wrapper.text()).toContain('Diff 계측 Para');
    expect(wrapper.text()).toContain('Lot 상태');
    expect(wrapper.text()).toContain('Mask 위치 지정');
    expect(wrapper.text()).toContain('Wet 자동화');
    expect(wrapper.text()).toContain('장비 상태');
    expect(wrapper.text()).toContain('Shelf 입고');
    expect(wrapper.text()).toContain('Bay별 Lot 현황');
    expect(wrapper.text()).toContain('Etch 조건표');
    expect(wrapper.text()).toContain('PR 교체');
    expect(wrapper.text()).toContain('계측 Rcp 조회');
    expect(wrapper.text()).toContain('검사 결과 입력');
    expect(wrapper.text()).toContain('DIFF Test 자동화');
    expect(wrapper.text()).toContain('계측장비 자동화');
    expect(wrapper.text()).toContain('W/F 자재 정보 Check');
    expect(wrapper.text()).toContain('환경 설정');
    expect(wrapper.text()).toContain('종료');
  });

  it('routes header settings and profile auth controls through action ids', async () => {
    const wrapper = mountActivityMain();

    await wrapper.get('[data-testid="activity-main-header-setting"]').trigger('click');
    await wrapper.get('[data-testid="activity-main-auth-button"]').trigger('click');

    expect(wrapper.emitted('select-action')).toHaveLength(2);
    expect(wrapper.emitted('select-action')?.[0]?.[0]).toMatchObject({
      id: ACTIVITY_MAIN_ACTION_ID.systemSetting,
      target: ROUTE.systemSetting,
    });
    expect(wrapper.emitted('select-action')?.[1]?.[0]).toMatchObject({
      id: ACTIVITY_MAIN_ACTION_ID.login,
      target: ROUTE.login,
    });
  });

  it('does not render hidden labels or gas action when GASINPUT is disabled', () => {
    const wrapper = mountActivityMain({ gasInput: 'N' });

    expect(wrapper.text()).not.toContain('메시지 보내기');
    expect(wrapper.text()).not.toContain('공정 진행 이력 등록');
    expect(wrapper.text()).not.toContain('GAS 사용량 입력');
  });

  it('renders gas action when GASINPUT is enabled', () => {
    const wrapper = mountActivityMain({ gasInput: 'Y' });

    expect(wrapper.text()).toContain('GAS 사용량 입력');
  });

  it('renders logged-in operator name with logout text', () => {
    const wrapper = mountActivityMain({
      isLoggedIn: true,
      operatorName: '홍길동',
    });

    const loginButton = wrapper.get(actionSelector(ACTIVITY_MAIN_ACTION_ID.login));

    expect(loginButton.text()).toContain('"홍길동 님"');
    expect(loginButton.text()).toContain('LOGOUT');
    expect(loginButton.classes()).toContain('activity-main__button--logged-in');
  });

  it('emits selected action from visible eSheet button', async () => {
    const wrapper = mountActivityMain();

    await wrapper.get(actionSelector(ACTIVITY_MAIN_ACTION_ID.esheet)).trigger('click');

    expect(wrapper.emitted('select-action')).toHaveLength(1);
    expect(wrapper.emitted('select-action')?.[0]?.[0]).toMatchObject({
      id: ACTIVITY_MAIN_ACTION_ID.esheet,
      label: 'eSheet',
      target: ROUTE.esheet,
    });
  });

  it('keeps footer outside the scrollable function area', () => {
    const css = readFileSync(
      resolve(process.cwd(), 'src/features/main/components/activity-main/activity-main.css'),
      'utf8',
    );

    expect(css).toContain('height: 100vh');
    expect(css).toContain('min-height: 0');
    expect(css).toContain('overflow-y: auto');
  });

  it('uses the compact PDA card spacing from the new design tokens', () => {
    const css = readFileSync(
      resolve(process.cwd(), 'src/features/main/components/activity-main/activity-main.css'),
      'utf8',
    );

    expect(css).toContain('padding: 12px;');
    expect(css).toContain('gap: 16px;');
    expect(css).toContain('min-height: 140px;');
    expect(css).toContain('width: 40px;');
    expect(css).toContain('height: 40px;');
    expect(css).toContain('font-size: 16px;');
    expect(css).toContain('min-height: 36px;');
    expect(css).toContain('gap: 8px;');
    expect(css).toContain('font-size: 14px;');
  });

  it('keeps the action panel from shrinking away from its rows', () => {
    const css = readFileSync(
      resolve(process.cwd(), 'src/features/main/components/activity-main/activity-main.css'),
      'utf8',
    );
    const actionPanelRuleStart = css.indexOf('.activity-main__action-panel {');
    const actionPanelRuleEnd = css.indexOf('}', actionPanelRuleStart);
    const actionPanelRule = css.slice(actionPanelRuleStart, actionPanelRuleEnd);

    expect(actionPanelRuleStart).toBeGreaterThan(-1);
    expect(actionPanelRule).toContain('flex: 0 0 auto;');
  });

  it('does not keep full-width action row css because the menu uses two columns', () => {
    const css = readFileSync(
      resolve(process.cwd(), 'src/features/main/components/activity-main/activity-main.css'),
      'utf8',
    );

    expect(css).not.toContain('activity-main__button--wide');
    expect(css).not.toContain('activity-main__action-row--single');
  });

  it('keeps action menu buttons compact by default for PDA width viewports', () => {
    const css = readFileSync(
      resolve(process.cwd(), 'src/features/main/components/activity-main/activity-main.css'),
      'utf8',
    );

    expect(css).toContain('min-height: 36px;');
    expect(css).toContain('font-size: 14px;');
    expect(css).not.toContain('@media (width <= 600px)');
    expect(css).not.toContain('@media (width <= 360px)');
  });

  it('keeps logged-in auth text smaller than default button text', () => {
    const css = readFileSync(
      resolve(process.cwd(), 'src/features/main/components/activity-main/activity-main.css'),
      'utf8',
    );
    const loggedInRuleIndex = css.indexOf('.activity-main__button--logged-in');

    expect(loggedInRuleIndex).toBeGreaterThan(-1);
    expect(css.slice(loggedInRuleIndex)).toContain('font-size: 12px;');
  });
});

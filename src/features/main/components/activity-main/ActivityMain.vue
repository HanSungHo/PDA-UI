<template>
  <main class="activity-main">
    <header class="activity-main__toolbar">
      <h1 class="activity-main__title">{{ mainTitle }}</h1>
      <button
        type="button"
        class="activity-main__icon-button"
        data-testid="activity-main-header-setting"
        :data-action-id="settingAction.id"
        aria-label="Settings"
        @click="emit('select-action', settingAction)"
      >
        <SettingOutlined />
      </button>
    </header>

    <section class="activity-main__content" aria-label="Activity main actions">
      <section
        class="activity-main__profile-card"
        data-testid="activity-main-profile-card"
        aria-label="Login status"
      >
        <div class="activity-main__avatar" aria-hidden="true">{{ avatarInitial }}</div>
        <h2 class="activity-main__profile-title">HiFOS DEMO</h2>
        <button
          type="button"
          class="activity-main__auth-button"
          :class="buttonClass(loginAction)"
          data-testid="activity-main-auth-button"
          :data-action-id="loginAction.id"
          @click="emit('select-action', loginAction)"
        >
          {{ getActionLabel(loginAction) }}
        </button>
      </section>

      <section
        class="activity-main__action-panel"
        data-testid="activity-main-action-panel"
        aria-label="Function menu"
      >
        <div
          v-for="(row, rowIndex) in menuRows"
          :key="row.map((action) => action.id).join('-')"
          class="activity-main__action-row"
          data-testid="activity-main-action-row"
          :data-row-index="rowIndex"
        >
          <button
            v-for="action in row"
            :key="action.id"
            type="button"
            class="activity-main__button"
            :class="buttonClass(action)"
            :data-action-id="action.id"
            @click="emit('select-action', action)"
          >
            {{ getActionLabel(action) }}
          </button>
        </div>
      </section>
    </section>

    <footer class="activity-main__footer" data-testid="activity-main-footer">
      <button
        v-for="action in footerActions"
        :key="action.id"
        type="button"
        class="activity-main__footer-button"
        :class="footerButtonClass(action)"
        :data-action-id="action.id"
        @click="emit('select-action', action)"
      >
        {{ action.label }}
      </button>
    </footer>
  </main>
</template>

<script setup lang="ts">
import { SettingOutlined } from '@ant-design/icons-vue';
import { computed } from 'vue';

import {
  ACTIVITY_MAIN_ACTION_ID,
  ACTIVITY_MAIN_FOOTER_ACTIONS,
  ACTIVITY_MAIN_HEADER_ACTIONS,
  ACTIVITY_MAIN_LEFT_ACTIONS,
  ACTIVITY_MAIN_RIGHT_ACTIONS,
  getVisibleActivityMainActions,
} from './activity-main.constants';
import type {
  ActivityMainAction,
  ActivityMainEmits,
  ActivityMainProps,
} from './activity-main.types';

defineOptions({ name: 'ActivityMain' });

const props = defineProps<ActivityMainProps>();
const emit = defineEmits<ActivityMainEmits>();

const leftActions = computed(() =>
  getVisibleActivityMainActions({ gasInput: props.gasInput }, ACTIVITY_MAIN_LEFT_ACTIONS),
);
const rightActions = computed(() =>
  getVisibleActivityMainActions({ gasInput: props.gasInput }, ACTIVITY_MAIN_RIGHT_ACTIONS),
);
const footerActions = computed(() =>
  getVisibleActivityMainActions({ gasInput: props.gasInput }, ACTIVITY_MAIN_FOOTER_ACTIONS),
);
const loginAction = computedAction(ACTIVITY_MAIN_ACTION_ID.login, ACTIVITY_MAIN_LEFT_ACTIONS);
const settingAction = computedAction(
  ACTIVITY_MAIN_ACTION_ID.systemSetting,
  ACTIVITY_MAIN_HEADER_ACTIONS,
);

const avatarInitial = computed(() => {
  const source = props.isLoggedIn ? props.operatorName : props.deviceName;

  return source.trim().charAt(0).toUpperCase() || 'A';
});

const menuRows = computed(() => {
  const leftMenuActions = leftActions.value.filter((action) => action.id !== loginAction.id);
  const rowCount = Math.max(leftMenuActions.length, rightActions.value.length);

  return Array.from({ length: rowCount }, (_, index) =>
    [leftMenuActions[index], rightActions.value[index]].filter(
      (action): action is ActivityMainAction => action !== undefined,
    ),
  );
});

function computedAction(
  id: ActivityMainAction['id'],
  actions: ActivityMainAction[],
): ActivityMainAction {
  const action = actions.find((candidate) => candidate.id === id);

  if (!action) throw new Error(`Missing activity main action: ${id}`);

  return action;
}

function getActionLabel(action: ActivityMainAction): string {
  if (action.id !== ACTIVITY_MAIN_ACTION_ID.login || !props.isLoggedIn) return action.label;

  return `"${props.operatorName} 님"\nLOGOUT`;
}

function buttonClass(action: ActivityMainAction): Record<string, boolean> {
  return {
    'activity-main__button--auth': action.id === ACTIVITY_MAIN_ACTION_ID.login,
    'activity-main__button--logged-in':
      action.id === ACTIVITY_MAIN_ACTION_ID.login && props.isLoggedIn,
    'activity-main__button--small-text': action.textSize === 'small',
  };
}

function footerButtonClass(action: ActivityMainAction): Record<string, boolean> {
  return {
    'activity-main__footer-button--primary': action.id === ACTIVITY_MAIN_ACTION_ID.setting,
  };
}
</script>

<style scoped src="./activity-main.css" />

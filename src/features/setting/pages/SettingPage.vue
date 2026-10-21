<template>
  <main class="activity-setting" aria-labelledby="page-title">
    <header class="page-header">
      <h1 id="page-title">환경설정 v{{ appVersion }}</h1>
    </header>
    <form class="settings-form" @submit.prevent="executeSetting">
      <div class="settings-content">
        <section class="settings-card" aria-labelledby="location-title">
          <h2 id="location-title">위치설정</h2>
          <div class="setting-select-field">
            <span class="ds-field__label">FACILITY</span>
            <BaseDropdownList
              ref="facilityDropdown"
              class="setting-field"
              data-testid="facility"
              aria-label="FACILITY"
              :model-value="form.facility || undefined"
              :options="facilityOptions"
              :loading="loading.facility"
              @click.capture="handleDropdownClick('facility', $event)"
              @update:model-value="selectFacility"
            />
          </div>
          <div class="setting-select-field">
            <span class="ds-field__label">AREA</span>
            <BaseDropdownList
              ref="areaDropdown"
              class="setting-field"
              data-testid="area"
              aria-label="AREA"
              :model-value="form.area || undefined"
              :options="areaOptions"
              :loading="loading.area"
              @click.capture="handleDropdownClick('area', $event)"
              @update:model-value="selectArea"
            />
          </div>
          <div class="setting-select-field">
            <span class="ds-field__label">BAY</span>
            <BaseDropdownList
              ref="bayDropdown"
              class="setting-field"
              data-testid="bay"
              aria-label="BAY"
              :model-value="form.bay || undefined"
              :options="bayOptions"
              :loading="loading.bay"
              @click.capture="handleDropdownClick('bay', $event)"
              @update:model-value="selectBay"
            />
          </div>
        </section>
        <section class="settings-card" aria-labelledby="sheet-title">
          <h2 id="sheet-title">e-Sheet 설정</h2>
          <BaseInput
            class="setting-field setting-field--input"
            data-testid="history-count"
            label="History Count"
            name="historyCount"
            type="number"
            :max-length="4"
            autocomplete="off"
            :model-value="form.historyCount"
            @update:model-value="form.historyCount = normalizeInputCount($event)"
          />
          <BaseInput
            class="setting-field setting-field--input"
            data-testid="forward-count"
            label="Forward Count"
            name="forwardCount"
            type="number"
            :max-length="4"
            autocomplete="off"
            :model-value="form.forwardCount"
            @update:model-value="form.forwardCount = normalizeInputCount($event)"
          />
        </section>
      </div>
      <footer class="page-footer">
        <BaseButton
          class="button button--primary"
          html-type="submit"
          :disabled="saving"
          data-testid="btn-ok"
          >확인</BaseButton
        >
        <BaseButton
          class="button button--secondary"
          :disabled="saving"
          data-testid="btn-cancel"
          @click="finish(SETTING_RESULT.CANCELED)"
          >취소</BaseButton
        >
      </footer>
    </form>
  </main>
  <BaseModal
    :open="dialog.open"
    :title="dialog.title"
    :closable="false"
    :overlay-closable="false"
    class="setting-dialog"
  >
    <p>{{ dialog.message }}</p>
    <template #footer
      ><BaseButton data-testid="dialog-ok" @click="handleDialog">확인</BaseButton></template
    >
  </BaseModal>
</template>

<script setup lang="ts">
import type { BaseDropdownValue, BaseInputValue, BaseOption } from 'src/components/base';
import { BaseButton, BaseDropdownList, BaseInput, BaseModal } from 'src/components/base';
import { ROUTE } from 'src/constants/routes';
import {
  SETTING_RESULT,
  type SettingResult,
  useMainStore,
} from 'src/features/main/stores/main.store';
import { getWifiIpAddress } from 'src/features/system-setting/services/system-setting-native.service';
import { computed, nextTick, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import { settingApi } from '../services/setting.api';
import type { SettingInfo } from '../types/setting.types';

defineOptions({ name: 'SettingPage' });
type DialogAction = 'none' | 'send-config' | 'finish-ok';
type DropdownName = 'facility' | 'area' | 'bay';
interface DropdownInstance {
  $el: HTMLElement;
}
const router = useRouter();
const store = useMainStore();
const appVersion = computed(() => store.versionName);
const api = settingApi;
const form = reactive<SettingInfo>({
  facility: '',
  area: '',
  bay: '',
  historyCount: '10',
  forwardCount: '10',
});
const facilityItems = ref<string[]>([]);
const areaItems = ref<string[]>([]);
const bayItems = ref<string[]>([]);
const toOptions = (items: string[]): BaseOption[] =>
  items.map((value) => ({ label: value, value }));
const facilityOptions = computed(() => toOptions(facilityItems.value));
const areaOptions = computed(() => toOptions(areaItems.value));
const bayOptions = computed(() => toOptions(bayItems.value));
const loading = reactive({ facility: false, area: false, bay: false });
const facilityDropdown = ref<DropdownInstance | null>(null);
const areaDropdown = ref<DropdownInstance | null>(null);
const bayDropdown = ref<DropdownInstance | null>(null);
const reopeningDropdown = ref<DropdownName | null>(null);
const saving = ref(false);
const dialog = reactive({ open: false, title: '', message: '', action: 'none' });

function openDialog(title: string, message: string, action: DialogAction = 'none'): void {
  Object.assign(dialog, { open: true, title, message, action });
}
function warning(message: string): void {
  openDialog('경  고', message);
}
function normalizeInputCount(value: BaseInputValue): string {
  return String(value ?? '')
    .replace(/\D/g, '')
    .slice(0, 4);
}
function capCount(value: string): string {
  return Number(value) > 2000 ? '2000' : value;
}
function valueOf(value: BaseDropdownValue): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}
function selectFacility(value: BaseDropdownValue): void {
  form.facility = valueOf(value);
  form.area = '';
  form.bay = '';
  areaItems.value = [];
  bayItems.value = [];
}
function selectArea(value: BaseDropdownValue): void {
  form.area = valueOf(value);
  form.bay = '';
  bayItems.value = [];
}
function selectBay(value: BaseDropdownValue): void {
  form.bay = valueOf(value);
}

function dropdownRef(name: DropdownName) {
  return {
    facility: facilityDropdown,
    area: areaDropdown,
    bay: bayDropdown,
  }[name];
}

/**
 * Legacy SpinnerTouchEvent consumes the original touch, then calls
 * performClick() once its async adapter data has been installed. Recreate
 * that sequence locally without changing the shared BaseDropdownList API.
 */
async function reopenDropdown(name: DropdownName): Promise<void> {
  await nextTick();
  const control = dropdownRef(name).value?.$el?.querySelector<HTMLElement>('.q-field__control');
  if (!control) return;

  reopeningDropdown.value = name;
  control.click();
  queueMicrotask(() => {
    if (reopeningDropdown.value === name) reopeningDropdown.value = null;
  });
}

function handleDropdownClick(name: DropdownName, event: MouseEvent): void {
  const target = event.target;
  if (!(target instanceof Element) || !target.closest('.q-field__control')) return;

  if (reopeningDropdown.value === name) {
    reopeningDropdown.value = null;
    return;
  }

  // Match legacy SpinnerTouchEvent: consume the initial touch so QSelect
  // cannot open an empty/stale menu, then reopen only after the API resolves.
  event.preventDefault();
  event.stopPropagation();

  if (name === 'facility') void initFacilitySpinner();
  else if (name === 'area') void initAreaSpinner();
  else void initBaySpinner();
}

async function initFacilitySpinner(): Promise<void> {
  if (loading.facility) return;
  form.area = '';
  form.bay = '';
  areaItems.value = [];
  bayItems.value = [];
  loading.facility = true;
  try {
    facilityItems.value = await api.getFacility();
    form.facility = '';
  } catch {
    /* Legacy keeps the current facility adapter and does not show a dialog. */
  } finally {
    loading.facility = false;
    await reopenDropdown('facility');
  }
}
async function initAreaSpinner(): Promise<void> {
  if (!form.facility) return warning('PLEASE FACILITY');
  if (loading.area) return;
  form.bay = '';
  bayItems.value = [];
  loading.area = true;
  try {
    areaItems.value = await api.getArea(form.facility);
  } catch {
    areaItems.value = [];
  } finally {
    form.area = '';
    loading.area = false;
    await reopenDropdown('area');
  }
}
async function initBaySpinner(): Promise<void> {
  if (!form.facility || !form.area) return warning('PLEASE AREA');
  if (loading.bay) return;
  loading.bay = true;
  try {
    bayItems.value = await api.getBay(form.area, form.facility);
  } catch {
    bayItems.value = [];
  } finally {
    form.bay = '';
    loading.bay = false;
    await reopenDropdown('bay');
  }
}

async function executeSetting(): Promise<void> {
  if (!form.facility) return warning('FACILITY를 선택해주세요');
  if (!form.area) return warning('AREA를 선택해주세요');
  if (!form.bay) return warning('BAY를 선택해주세요');
  if (!form.historyCount) return warning('History Count를 입력해주세요');
  if (!form.forwardCount) return warning('Forward Count를 입력해주세요');
  const runtimeCounts = { historyCount: form.historyCount, forwardCount: form.forwardCount };
  form.historyCount = capCount(form.historyCount);
  form.forwardCount = capCount(form.forwardCount);
  saving.value = true;
  try {
    await store.saveSettingInfo({ ...form }, runtimeCounts);
    store.setSettingResult(SETTING_RESULT.OK);
    openDialog('환경설정', '환경설정 정보가 저장 되었습니다', 'send-config');
  } finally {
    saving.value = false;
  }
}
async function handleDialog(): Promise<void> {
  const action = dialog.action;
  dialog.open = false;
  dialog.action = 'none';
  if (action === 'none') return;
  if (action === 'finish-ok') return finish(SETTING_RESULT.OK);
  const wifiIpAddress = await getWifiIpAddress();
  if (wifiIpAddress) {
    try {
      await api.sendConfig(wifiIpAddress);
    } catch (error) {
      return openDialog(
        '에  러',
        error instanceof Error ? error.message : String(error),
        'finish-ok',
      );
    }
  }
  await finish(SETTING_RESULT.OK);
}
async function finish(result: SettingResult): Promise<void> {
  store.setSettingResult(result);
  if (router.options.history.state.back) router.back();
  else await router.replace(`/${ROUTE.main}`);
}
onMounted(async () => {
  store.setSettingResult(null);
  // Setting is a standalone route, unlike the launcher route that initializes
  // the runtime server URL. Initialize here before issuing legacy messages.
  await store.initMain();
  const saved = await store.loadSettingInfo();
  if (!saved || !saved.facility || !saved.area || !saved.bay) return;
  Object.assign(form, saved);
  facilityItems.value = [form.facility];
  areaItems.value = [form.area];
  bayItems.value = [form.bay];
});
</script>

<style lang="scss">
.activity-setting {
  --setting-text: #030712;
  --setting-text-secondary: #364153;
  --setting-border: #d1d5dc;
  --setting-card: #f3f4f6;
  --setting-primary: #02b0a5;
  inline-size: 100%;
  min-block-size: max(720px, 100dvh);
  display: flex;
  flex-direction: column;
  margin: 0;
  color: var(--setting-text);
  font-family: var(--family-font-family-default, var(--ds-font-family-sans));
  font-synthesis: none;
  font-weight: var(--ds-font-weight-regular);
  letter-spacing: 0;
  background: linear-gradient(
    180deg,
    #1c493a 0%,
    rgb(150.33 176.86 168.02) 53.846%,
    rgb(236.3 248.2 241.4) 100%
  );
}
.page-header {
  min-block-size: 60px;
  padding: var(--ds-spacing-4) var(--ds-spacing-3);
}
.page-header h1 {
  margin: 0;
  color: #f9fafb;
  font-size: var(--ds-font-size-xl);
  font-weight: var(--ds-font-weight-bold);
  line-height: var(--ds-line-height-xl);
  letter-spacing: 0;
  text-align: center;
}
.settings-form,
.settings-content {
  display: flex;
  flex: 1;
  flex-direction: column;
}
.settings-content {
  align-items: stretch;
  gap: 16px;
  padding: var(--ds-spacing-3);
}
.settings-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: var(--ds-spacing-3);
  border-radius: 4px;
  background: var(--setting-card);
  box-shadow:
    inset 0 0 0 1px var(--setting-border),
    0 8px 24px rgb(13 20 31 / 6%);
}
.settings-card h2 {
  margin: 0;
  font-size: var(--ds-font-size-lg);
  font-weight: var(--ds-font-weight-bold);
  line-height: var(--ds-line-height-lg);
  letter-spacing: 0;
}
.setting-field {
  min-inline-size: 0;
}
.setting-select-field {
  --ds-input-min-height-md: 40px;
  display: flex;
  flex-direction: column;
  gap: var(--ds-spacing-2);
  min-inline-size: 0;
}
.activity-setting .ds-field__label {
  font-family: var(--family-font-family-default, var(--ds-font-family-sans));
  font-size: var(--ds-font-size-md);
  font-weight: var(--ds-font-weight-medium);
  line-height: var(--ds-line-height-md);
}
.setting-select-field .q-field__native,
.setting-select-field .q-field__input {
  font-family: var(--family-font-family-default, var(--ds-font-family-sans));
  font-size: var(--ds-font-size-lg);
  font-weight: var(--ds-font-weight-regular);
  line-height: var(--ds-line-height-lg);
  letter-spacing: 0;
}
.page-footer {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  padding: var(--ds-spacing-3);
}
.button.ds-btn {
  min-inline-size: 0;
  block-size: 44px;
  padding: var(--ds-spacing-2) var(--ds-spacing-4);
  border-radius: 4px;
  font-size: var(--ds-font-size-lg);
  font-weight: var(--ds-font-weight-bold);
  line-height: var(--ds-line-height-xl);
}
.button--primary.ds-btn {
  --ds-btn-bg: var(--setting-primary);
  --ds-btn-fg: #f0fdfc;
}
.button--secondary.ds-btn {
  --ds-btn-bg: #fff;
  --ds-btn-fg: #101828;
  --ds-btn-border-color: var(--setting-border);
}
.setting-dialog p {
  margin: 0;
}
</style>

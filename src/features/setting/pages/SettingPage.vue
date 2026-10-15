<template>
  <main class="activity-setting" aria-labelledby="page-title">
    <header class="page-header">
      <h1 id="page-title">환경설정 v{{ appVersion }}</h1>
    </header>
    <form class="settings-form" @submit.prevent="executeSetting">
      <div class="settings-content">
        <section class="settings-card" aria-labelledby="location-title">
          <h2 id="location-title">위치설정</h2>
          <BaseDropdownList
            ref="facilityDropdown"
            class="setting-field setting-field--dropdown"
            data-testid="facility"
            label="FACILITY"
            stack-label
            :model-value="form.facility || undefined"
            :options="facilityOptions"
            :loading="loading.facility"
            @click.capture="handleDropdownClick('facility', $event)"
            @update:model-value="selectFacility"
          />
          <BaseDropdownList
            ref="areaDropdown"
            class="setting-field setting-field--dropdown"
            data-testid="area"
            label="AREA"
            stack-label
            :model-value="form.area || undefined"
            :options="areaOptions"
            :loading="loading.area"
            @click.capture="handleDropdownClick('area', $event)"
            @update:model-value="selectArea"
          />
          <BaseDropdownList
            ref="bayDropdown"
            class="setting-field setting-field--dropdown"
            data-testid="bay"
            label="BAY"
            stack-label
            :model-value="form.bay || undefined"
            :options="bayOptions"
            :loading="loading.bay"
            @click.capture="handleDropdownClick('bay', $event)"
            @update:model-value="selectBay"
          />
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
  inline-size: min(100%, 350px);
  min-block-size: 720px;
  display: flex;
  flex-direction: column;
  margin: auto;
  color: var(--setting-text);
  background: linear-gradient(
    180deg,
    #1c493a 0%,
    rgb(150.33 176.86 168.02) 53.846%,
    rgb(236.3 248.2 241.4) 100%
  );
}
.page-header {
  min-block-size: 60px;
  padding: 16px;
}
.page-header h1 {
  margin: 0;
  color: #f9fafb;
  font-size: 18px;
  font-weight: 700;
  line-height: 28px;
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
  padding: 12px;
}
.settings-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 4px;
  background: var(--setting-card);
  box-shadow: inset 0 0 0 1px var(--setting-border);
}
.settings-card h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  line-height: 24px;
}
.setting-field {
  position: relative;
  min-inline-size: 0;
  block-size: 56px;
}
.setting-field .q-field__control {
  block-size: 56px;
  min-block-size: 56px;
  border-radius: 0;
  border: 0;
  background: #fff;
  box-shadow: 0 1px 0 var(--setting-border);
}
.setting-field .q-field__control::before,
.setting-field .q-field__control::after {
  display: none;
}
.setting-field .q-field__label {
  color: var(--setting-text-secondary);
  font-family: inherit;
  font-size: 12px;
  font-weight: 400;
  letter-spacing: normal;
  line-height: 16px;
  transform: none;
}
.setting-field .q-field__native,
.setting-field .q-field__input {
  color: var(--setting-text);
  font-family: inherit;
  font-size: 16px;
  font-weight: 400;
  letter-spacing: normal;
  line-height: 24px;
}
.setting-field--dropdown .q-field__control {
  padding: 8px 16px;
}
.setting-field--dropdown .q-field__label {
  top: 0;
}
.activity-setting .setting-field--dropdown .q-field__control-container {
  block-size: 40px;
  min-block-size: 40px;
  padding: 0;
}
.activity-setting .setting-field--dropdown .q-field__native,
.activity-setting .setting-field--dropdown .q-field__input {
  block-size: 40px;
  min-block-size: 40px;
  padding: 16px 0 0;
}
.setting-field--input .q-field__control {
  padding: 8px 16px;
}
.setting-field--input .q-field__label {
  top: 0;
  inline-size: 100%;
  max-inline-size: 100%;
}
.setting-field--input .q-field__native,
.setting-field--input .q-field__input {
  block-size: 40px;
  min-block-size: 40px;
  padding: 16px 0 0;
}
.setting-field:focus-within {
  outline: 2px solid var(--setting-primary);
  outline-offset: 2px;
}
.page-footer {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  padding: 12px;
}
.button.ds-btn {
  min-inline-size: 0;
  block-size: 44px;
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 16px;
  font-weight: 700;
  line-height: 28px;
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
@media (max-width: 350px) {
  .activity-setting {
    min-block-size: max(720px, 100dvh);
  }
}
</style>

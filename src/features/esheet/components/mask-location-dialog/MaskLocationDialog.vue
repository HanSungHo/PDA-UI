<script setup lang="ts">
import { computed, reactive, ref } from 'vue';

import { BaseButton, BaseInputField } from '@/components/base';

import { maskLocationDialogMock } from '../../mocks/mask-location-dialog.mock';
import { checkPhotoSample } from '../../services/mask-location-dialog.service';
import type { SampleResult } from '../../types/mask-location-dialog.types';
interface MaskLocationDialogProps {
  maskTag?: string;
  productName?: string;
  giben?: string;
  status?: string;
  isUse?: string;
  currentLocation?: string;
  subMachine?: string;
  testHour?: string;
  lotId?: string;
}

const props = withDefaults(defineProps<MaskLocationDialogProps>(), {
  currentLocation: maskLocationDialogMock.currentLocation,
  giben: maskLocationDialogMock.giben,
  isUse: maskLocationDialogMock.isUse,
  lotId: maskLocationDialogMock.lotId,
  maskTag: maskLocationDialogMock.maskTag,
  productName: maskLocationDialogMock.productName,
  status: maskLocationDialogMock.status,
  subMachine: maskLocationDialogMock.subMachine,
  testHour: maskLocationDialogMock.testHour,
});

const emit = defineEmits<{
  ok: [];
  close: [];
  sampleCheck: [payload: { lotId: string; location: string; result: SampleResult }];
}>();

const equipmentId = ref('');
const showStopDialog = ref(false);
const stopMessage = ref('');
const sampleResult = reactive<SampleResult>({
  align: '',
  etchRw: '',
  grade: '',
  ret: '',
  stop: '',
});

const infoRows = computed(() => [
  {
    label: 'MASK TAG',
    value: props.maskTag,
  },
  {
    label: '제품명',
    value: props.productName,
  },
  {
    label: '지번',
    value: props.giben,
  },
  {
    label: '상태',
    value: props.status,
  },
  {
    label: '사용여부',
    value: props.isUse,
  },
  {
    label: '현재위치',
    value: props.currentLocation,
  },
  {
    label: '서브장치',
    value: props.subMachine,
  },
  {
    label: '검사시간',
    value: props.testHour,
    hasClockIcon: true,
  },
]);

const sampleRows = computed(() => [
  {
    label: 'SAMPLE',
    value: sampleResult.ret,
  },
  {
    label: 'TREE',
    value: sampleResult.align,
  },
  {
    label: 'GRADE',
    value: sampleResult.grade,
  },
  {
    label: 'ETCH R/W ',
    value: sampleResult.etchRw,
  },
]);

function updateEquipmentId(value: string): void {
  equipmentId.value = value.toUpperCase();
}

function normalizeEquipmentInput(): void {
  let normalizedValue = equipmentId.value;
  const dashCount = normalizedValue.split('-').length - 1;

  if (dashCount === 2) {
    normalizedValue = normalizedValue.substring(0, normalizedValue.length - 2);
  }

  if (normalizedValue.includes('02-')) {
    normalizedValue = normalizedValue.replace('02-', '01-');
  }

  equipmentId.value = normalizedValue;
}

function resolveLocation(): string {
  const selectedEquipment = equipmentId.value.trim();

  if (selectedEquipment) {
    return selectedEquipment;
  }

  if (props.currentLocation.includes('투광기')) {
    return props.subMachine;
  }

  return props.currentLocation;
}

function applySampleResult(result: SampleResult): void {
  sampleResult.align = result.align;
  sampleResult.etchRw = result.etchRw;
  sampleResult.grade = result.grade;
  sampleResult.ret = result.ret;
  sampleResult.stop = result.stop;
}

async function checkSample(): Promise<void> {
  normalizeEquipmentInput();

  const location = resolveLocation();

  if (!props.lotId || !location) {
    return;
  }

  const result = await checkPhotoSample(location);

  applySampleResult(result);
  emit('sampleCheck', { location, lotId: props.lotId, result });

  if (result.stop) {
    stopMessage.value = result.stop;
    showStopDialog.value = true;
  }
}

function closeStopDialog(): void {
  showStopDialog.value = false;
}
defineExpose({
  updateEquipmentId,
  checkSample,
  closeStopDialog,
  equipmentId,
  showStopDialog,
  stopMessage,
});
</script>

<template>
  <section class="mask-location-dialog" aria-labelledby="mask-location-title">
    <header class="mask-location-dialog__header">
      <h2 id="mask-location-title" class="mask-location-dialog__title">마스크 위치정보</h2>
    </header>

    <div class="mask-location-dialog__body">
      <div class="info-list">
        <div v-for="item in infoRows" :key="item.label" class="info-item">
          <span class="info-item__label">
            {{ item.label }}
          </span>
          <div class="info-item__value" :class="{ 'is-placeholder': !item.value }">
            <span> {{ item.value || 'Null' }} </span>
          </div>
        </div>
      </div>

      <h3 class="sample-title">Sample 확인</h3>

      <div class="enter-equipment-title">
        <h4>장비입력</h4>
      </div>
      <div class="equipment-section">
        <BaseInputField
          class="equipment-input"
          :model-value="equipmentId"
          layout="vertical"
          :maxlength="20"
          @update:model-value="updateEquipmentId"
          @keyup.enter="checkSample"
        />

        <BaseButton
          class="sample-button"
          label="Sample"
          size="medium"
          variant="secondary"
          @click="checkSample"
        />
      </div>

      <div class="sample-list">
        <div v-for="item in sampleRows" :key="item.label" class="sample-item">
          <span class="sample-item__label">
            {{ item.label }}
          </span>

          <div class="sample-item__value" :class="{ 'is-placeholder': !item.value }">
            {{ item.value || 'Null' }}
          </div>
        </div>
      </div>

      <div class="mask-location-dialog__footer">
        <BaseButton
          class="ok-button"
          block
          label="OK"
          size="medium"
          variant="primary"
          @click="emit('ok')"
        />
      </div>
    </div>
  </section>
</template>
<style scoped src="../styles/mask-location-dialog.css"></style>

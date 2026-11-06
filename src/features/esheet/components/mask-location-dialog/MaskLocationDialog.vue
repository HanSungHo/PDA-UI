<script setup lang="ts">
import { computed, reactive, ref } from 'vue';

import { BaseButton, BaseInput, BaseModal } from '@/components/base';

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

  let result: SampleResult;
  try {
    result = await checkPhotoSample(props.lotId, location);
  } catch {
    return;
  }

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

function handleStopDialogOpenChange(open: boolean): void {
  if (!open) closeStopDialog();
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
  <BaseModal
    class="mask-location-dialog"
    :open="true"
    title="마스크 위치정보"
    width="100%"
    :closable="false"
    :overlay-closable="false"
  >
    <div class="info-list">
      <BaseInput
        v-for="item in infoRows"
        :key="item.label"
        layout="horizontal"
        :label="item.label"
        :model-value="item.value ?? ''"
        readonly
      />
    </div>

    <h3 class="sample-title">Sample 확인</h3>

    <div class="equipment-section">
      <BaseInput
        class="equipment-input"
        :model-value="equipmentId"
        label="장비입력"
        layout="horizontal"
        :maxlength="20"
        @update:model-value="updateEquipmentId(String($event ?? ''))"
        @keyup.enter="checkSample"
      />
      <BaseButton
        label="Sample"
        size="small"
        variant="secondary"
        @click="checkSample"
      />
    </div>

    <BaseInput
      v-for="item in sampleRows"
      :key="item.label"
      layout="horizontal"
      :label="item.label"
      :model-value="item.value ?? ''"
      readonly
    />

    <template #footer>
      <BaseButton
        label="OK"
        size="medium"
        variant="link"
        @click="emit('ok')"
      />
    </template>
  </BaseModal>

  <BaseModal
    :open="showStopDialog"
    title="공정 중단"
    :width="340"
    :closable="false"
    :overlay-closable="false"
    class="mask-location-stop-dialog"
    @update:open="handleStopDialogOpenChange"
  >
    <p class="mask-location-stop-dialog__message" role="alert">{{ stopMessage }}</p>
    <template #footer>
      <BaseButton variant="primary" @click="closeStopDialog">확인</BaseButton>
    </template>
  </BaseModal>
</template>
<style src="./mask-location-dialog.css"></style>

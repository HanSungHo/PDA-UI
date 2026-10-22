import { defineStore } from 'pinia';
import { COMMON_FIELD } from 'src/constants/common-strings';
import { computed, ref } from 'vue';

import { deviceNameCheckService } from '../services/device-name-check.service';
import type { DeviceNameValidationResult } from '../types/device-name-check.types';

export const useDeviceNameCheckStore = defineStore('deviceNameCheck', () => {
  const pdaIp = ref('');
  const currentPdaName = ref('');
  const newPdaDigits = ref('');
  const isLoading = ref(false);
  const isOpen = ref(false);

  const alertState = ref({
    isOpen: false,
    title: '',
    message: '',
  });

  const fullNewDeviceName = computed(() => `AR${newPdaDigits.value}`);

  async function initModal(params?: { ip?: string; deviceName?: string }): Promise<void> {
    if (params?.ip) {
      pdaIp.value = params.ip;
    } else {
      pdaIp.value = await deviceNameCheckService.getPdaIpAddress();
    }

    if (params?.deviceName) {
      currentPdaName.value = params.deviceName;
    } else {
      currentPdaName.value = await deviceNameCheckService.getCurrentDeviceName();
    }

    newPdaDigits.value = '';
    isOpen.value = true;
  }

  function setNewPdaDigits(value: string): void {
    newPdaDigits.value = value.replace(/\D/g, '').slice(0, 3);
  }

  function validateInput(): DeviceNameValidationResult {
    const trimmed = newPdaDigits.value.trim();

    if (trimmed.length === 0) {
      return {
        isValid: false,
        error: 'EMPTY',
        message: '새로운 PDA 명이 비어있습니다.',
      };
    }

    if (trimmed.length !== 3 || !/^\d{3}$/.test(trimmed)) {
      return {
        isValid: false,
        error: 'INVALID_LENGTH',
        message: '3자리 숫자를 입력해주세요.',
      };
    }

    return { isValid: true };
  }

  function showAlert(title: string, message: string): void {
    alertState.value = {
      isOpen: true,
      title,
      message,
    };
  }

  function dismissAlert(): void {
    alertState.value = {
      isOpen: false,
      title: '',
      message: '',
    };
  }

  function closeModal(): void {
    isOpen.value = false;
  }

  async function submitDeviceNameChange(): Promise<string | null> {
    const validation = validateInput();

    if (!validation.isValid) {
      showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, validation.message || '');
      return null;
    }

    try {
      isLoading.value = true;
      const updatedName = await deviceNameCheckService.updateDeviceName(newPdaDigits.value);
      currentPdaName.value = updatedName;
      isOpen.value = false;
      return updatedName;
    } finally {
      isLoading.value = false;
    }
  }

  function reset(): void {
    pdaIp.value = '';
    currentPdaName.value = '';
    newPdaDigits.value = '';
    isLoading.value = false;
    isOpen.value = false;
    dismissAlert();
  }

  return {
    pdaIp,
    currentPdaName,
    newPdaDigits,
    isLoading,
    isOpen,
    alertState,
    fullNewDeviceName,
    initModal,
    setNewPdaDigits,
    validateInput,
    showAlert,
    dismissAlert,
    closeModal,
    submitDeviceNameChange,
    reset,
  };
});

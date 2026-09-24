import { ref } from 'vue';

const modalOpen = ref(false);
const modalTitle = ref('');
const modalMessage = ref('');
const modalType = ref<'alert' | 'confirm'>('alert');

let modalResolver: ((result: boolean) => void) | null = null;

function showAlert(message: string, title = '알림'): Promise<boolean> {
  modalTitle.value = title;
  modalMessage.value = message;
  modalType.value = 'alert';
  modalOpen.value = true;

  return new Promise<boolean>((resolve) => {
    modalResolver = resolve;
  });
}

function showConfirm(message: string, title = '확인'): Promise<boolean> {
  modalTitle.value = title;
  modalMessage.value = message;
  modalType.value = 'confirm';
  modalOpen.value = true;

  return new Promise<boolean>((resolve) => {
    modalResolver = resolve;
  });
}

function resolveModal(result: boolean): void {
  modalOpen.value = false;

  if (modalResolver) {
    modalResolver(result);
    modalResolver = null;
  }
}

function handleModalCancel(): void {
  resolveModal(false);
}

export function useConfirmModal() {
  return {
    modalOpen,
    modalTitle,
    modalMessage,
    modalType,

    alert: showAlert,
    confirm: showConfirm,

    resolveModal,
    handleModalCancel,
  };
}

export default useConfirmModal;

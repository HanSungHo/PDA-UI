import { nextTick, ref } from 'vue';

const modalOpen = ref(false);
const modalTitle = ref('');
const modalMessage = ref('');
const modalType = ref<'alert' | 'confirm'>('alert');

interface ModalRequest {
  message: string;
  title: string;
  type: 'alert' | 'confirm';
  resolve: (result: boolean) => void;
}

const modalQueue: ModalRequest[] = [];
let modalResolver: ((result: boolean) => void) | null = null;

function showAlert(message: string, title = '알림'): Promise<boolean> {
  return enqueueModal({ message, title, type: 'alert' });
}

function showConfirm(message: string, title = '확인'): Promise<boolean> {
  return enqueueModal({ message, title, type: 'confirm' });
}

function enqueueModal(request: Omit<ModalRequest, 'resolve'>): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const queuedRequest = { ...request, resolve };

    if (modalOpen.value) {
      modalQueue.push(queuedRequest);
      return;
    }

    presentModal(queuedRequest);
  });
}

function presentModal(request: ModalRequest): void {
  modalTitle.value = request.title;
  modalMessage.value = request.message;
  modalType.value = request.type;
  modalResolver = request.resolve;
  modalOpen.value = true;
}

function resolveModal(result: boolean): void {
  if (!modalOpen.value) return;

  const resolve = modalResolver;
  modalResolver = null;
  modalOpen.value = false;
  resolve?.(result);

  const nextRequest = modalQueue.shift();
  if (nextRequest) {
    void nextTick(() => presentModal(nextRequest));
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

import { ref } from 'vue';

export const RETURN_CODE_OK = 1;

const isOpen = ref(false);
const title = ref('');
const message = ref('');
const confirmLabel = ref('');
let resolveResult: ((value: number) => void) | undefined;

function show(txtDialogTitle: string, txtDialogContent: string, btnOkStr: string): Promise<number> {
  if (resolveResult) {
    resolveResult(RETURN_CODE_OK);
  }

  title.value = txtDialogTitle;
  message.value = txtDialogContent;
  confirmLabel.value = btnOkStr;
  isOpen.value = true;

  return new Promise<number>((resolve) => {
    resolveResult = resolve;
  });
}

function confirm(): void {
  isOpen.value = false;
  resolveResult?.(RETURN_CODE_OK);
  resolveResult = undefined;
}

export const okDialog = {
  isOpen,
  title,
  message,
  confirmLabel,
  show,
  confirm,
};

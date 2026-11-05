import { ref } from 'vue';

export const RETURN_CODE_OK = 1;
export const RETURN_CODE_CANCEL = -1;

const isOpen = ref(false);
const title = ref('');
const message = ref('');
const okLabel = ref('');
const cancelLabel = ref('');
let resolveResult: ((value: number) => void) | undefined;

/** legacy OkCancelDialog.show: resolves RETURN_CODE_OK or RETURN_CODE_CANCEL. */
function show(
  txtDialogTitle: string,
  txtDialogContent: string,
  btnOkStr: string,
  btnCancelStr: string,
): Promise<number> {
  if (resolveResult) {
    resolveResult(RETURN_CODE_CANCEL);
  }

  title.value = txtDialogTitle;
  message.value = txtDialogContent;
  okLabel.value = btnOkStr;
  cancelLabel.value = btnCancelStr;
  isOpen.value = true;

  return new Promise<number>((resolve) => {
    resolveResult = resolve;
  });
}

function close(returnCode: number): void {
  isOpen.value = false;
  resolveResult?.(returnCode);
  resolveResult = undefined;
}

/** btnOk, and the back button (legacy onBackPressed returns RETURN_CODE_OK). */
function ok(): void {
  close(RETURN_CODE_OK);
}

function cancel(): void {
  close(RETURN_CODE_CANCEL);
}

export const okCancelDialog = {
  isOpen,
  title,
  message,
  okLabel,
  cancelLabel,
  show,
  ok,
  cancel,
};

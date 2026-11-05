import {
  okCancelDialog,
  RETURN_CODE_CANCEL,
  RETURN_CODE_OK,
} from 'src/services/ok-cancel-dialog.service';
import { describe, expect, it } from 'vitest';

describe('okCancelDialog', () => {
  it('opens with the given texts and resolves RETURN_CODE_OK on ok', async () => {
    const pending = okCancelDialog.show('확  인', '출고 하시겠습니까?', '확인', '취소');

    expect(okCancelDialog.isOpen.value).toBe(true);
    expect(okCancelDialog.title.value).toBe('확  인');
    expect(okCancelDialog.message.value).toBe('출고 하시겠습니까?');
    expect(okCancelDialog.okLabel.value).toBe('확인');
    expect(okCancelDialog.cancelLabel.value).toBe('취소');

    okCancelDialog.ok();

    await expect(pending).resolves.toBe(RETURN_CODE_OK);
    expect(okCancelDialog.isOpen.value).toBe(false);
  });

  it('resolves RETURN_CODE_CANCEL on cancel', async () => {
    const pending = okCancelDialog.show('확  인', '반송 하시겠습니까?', '확인', '취소');

    okCancelDialog.cancel();

    await expect(pending).resolves.toBe(RETURN_CODE_CANCEL);
  });

  it('cancels a pending dialog when a new one replaces it', async () => {
    const first = okCancelDialog.show('A', 'first', '확인', '취소');
    const second = okCancelDialog.show('B', 'second', '확인', '취소');

    await expect(first).resolves.toBe(RETURN_CODE_CANCEL);
    expect(okCancelDialog.message.value).toBe('second');

    okCancelDialog.ok();
    await expect(second).resolves.toBe(RETURN_CODE_OK);
  });
});

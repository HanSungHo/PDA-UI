import { okDialog, RETURN_CODE_OK } from 'src/services/ok-dialog.service';
import { afterEach, describe, expect, it } from 'vitest';

describe('okDialog', () => {
  afterEach(() => {
    okDialog.confirm();
  });

  it('preserves the Kotlin show parameters and resolves with RETURN_CODE_OK on confirmation', async () => {
    const result = okDialog.show('확  인', '수량 보정 사유를 선택 하세요.', '확인');

    expect(okDialog.isOpen.value).toBe(true);
    expect(okDialog.title.value).toBe('확  인');
    expect(okDialog.message.value).toBe('수량 보정 사유를 선택 하세요.');
    expect(okDialog.confirmLabel.value).toBe('확인');

    okDialog.confirm();

    await expect(result).resolves.toBe(RETURN_CODE_OK);
    expect(okDialog.isOpen.value).toBe(false);
  });
});

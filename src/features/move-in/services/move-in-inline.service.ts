import { useMainStore } from 'src/features/main/stores/main.store';
import {
  assertPass,
  body,
  firstList,
  type MessageBody,
  postJsonMessage,
  text,
} from 'src/services/json-message.service';

import type {
  IlStatus,
  InlineInfoResponse,
  InlineItem,
  InlineSetParams,
  InlineSetResponse,
  MaskLocationInfo,
} from '../types/move-in-inline.types';

// Lists arrive either wrapped in ITEM (Android) or flat.
function messageItems(source: MessageBody, key: string): MessageBody[] {
  const value = source[key];
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return firstList(value as MessageBody, ['ITEM']);
  }
  return firstList(source, [key]);
}

// Android concatenates one <ITEM> fragment per selected row into INLINEITEMS.
function inlineItemsPayload(items: InlineItem[]): string {
  return items
    .map(
      (item) => `<ITEM>
<SUBOPERATION>${item.subOperation}</SUBOPERATION>
<IDENTCODE>${item.identCode}</IDENTCODE>
</ITEM>
`,
    )
    .join('');
}

export const moveInInlineService = {
  /** Kotlin: MessageFactoryUtil.inlineInfo(lotId, FACILITY, operation) */
  async getInlineInfo(lotId: string, operation: string): Promise<InlineInfoResponse> {
    const parsed = await postJsonMessage('INLINEINFO', {
      LOTID: lotId,
      FACILITY: useMainStore().facility,
      OPERATION: operation,
    });
    assertPass(parsed, 'INLINEINFO');

    const messageBody = body(parsed);

    return {
      isSuccessful: true,
      info: {
        product: text(messageBody, 'PRODUCT'),
        operation: text(messageBody, 'OPERATION'),
        photoJobCode: text(messageBody, 'PHOTOJOBCODE'),
        maskTag: text(messageBody, 'MASKTAG'),
        changeMaskTag: text(messageBody, 'CHANGEMASKTAG'),
        inlineRecipe: text(messageBody, 'INLINERECIPE'),
        processStep: text(messageBody, 'PROCESSSTEP'),
        quantity: text(messageBody, 'QUANTITY'),
        criticalStepper: text(messageBody, 'CRITICAL_STEPPER'),
        criticalStepper2: text(messageBody, 'CRITICAL_STEPPER2'),
        criticalStepper3: text(messageBody, 'CRITICAL_STEPPER3'),
      },
      rows: messageItems(messageBody, 'INLINEITEMS').map((item) => ({
        processName: text(item, 'SUBPROCESSSTEP'),
        isComplete: text(item, 'ISCOMPLETE') as IlStatus,
        localRecipe: text(item, 'LOCALRECIPE'),
        workedEqp: text(item, 'WORKEDEQP'),
        identCode: text(item, 'IDENTCODE'),
        subOperation: text(item, 'SUBOPERATION'),
      })),
    };
  },

  /** Kotlin: MessageFactoryUtil.maskLocationInfo("T", reticleId, FACILITY) */
  async getMaskLocationInfo(maskTag: string): Promise<MaskLocationInfo> {
    const parsed = await postJsonMessage('MASKINFO', {
      ID_IDENT: 'T',
      RETICLEID: maskTag,
      FACILITY: useMainStore().facility,
    });
    assertPass(parsed, 'MASKINFO');

    const item = messageItems(body(parsed), 'ITEMS')[0];
    if (!item) throw new Error('Mask Location 정보를 찾을 수 없습니다.');

    return {
      maskTag: text(item, 'RETICLETAG'),
      product: text(item, 'PRODUCT'),
      giben: text(item, 'GIBEN'),
      status: text(item, 'STATUS'),
      isUse: text(item, 'ISUSE'),
      currentLoc: text(item, 'CURRLOC'),
      subLocation3: text(item, 'SUBLOCATION3'),
      afterInsp: text(item, 'AFTERINSP'),
    };
  },

  /** Kotlin: MessageFactoryUtil.inlineSet(...) */
  async inlineSet(params: InlineSetParams): Promise<InlineSetResponse> {
    const parsed = await postJsonMessage('INLINESET', {
      LOTID: params.lotId,
      FACILITY: useMainStore().facility,
      OPERATION: params.operation,
      REALMASKTAG: params.maskTag,
      QUANTITY: params.quantity,
      ISFULLINLINE: params.isFullInline,
      INLINEITEMS: inlineItemsPayload(params.items),
    });
    assertPass(parsed, 'INLINESET');

    const messageBody = body(parsed);

    return {
      isSuccessful: true,
      isExposure: text(messageBody, 'ISEXPOSURE'),
      eqpGroup: text(messageBody, 'EQPGROUP'),
      expEqpGroup: text(messageBody, 'EXPEQPGROUP'),
      subOperation: text(messageBody, 'SUBOPERATION'),
      commentQty: text(messageBody, 'COMMENTQTY'),
      nrwCommentQty: text(messageBody, 'NRWCOMMENTQTY'),
    };
  },
};

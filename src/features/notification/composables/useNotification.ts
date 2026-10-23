import { computed, onMounted, reactive, ref } from 'vue';

import { NotificationParserService } from '../services/notification.service';
import type {
  NotificationInboundParams,
  NotificationViewBinding,
  SingleClickListener,
} from '../types/notification.types';

export function useNotification(
  getInboundParams: () => NotificationInboundParams | undefined,
  onFinishCallback?: () => void,
) {
  // init { this.update = false }
  const update = ref<boolean>(false);

  // State Mapping 1:1 với NotificationActivity.kt
  const receiverMessage = ref<string | null>(null);
  const asmError = ref<boolean>(false); // var ASMLError : Boolean = false
  const parsedGroups = ref<string[]>([]); // val new_receiverMessage
  const parsedAlarm = ref<string[]>([]); // val arry_receiverMessage
  const time = ref<string>(''); // val Time
  const parsedDate = ref<Date | null>(null); // val parsed
  const eqpid = ref<string>(''); // val Eqpid
  const lotId = ref<string>(''); // val Lotid
  const description = ref<string>(''); // var desc
  const descriptionParts = ref<string[]>([]); // val parts
  const lastDescriptionPart = ref<string>(''); // val lastPart
  const descriptionValue = ref<string>(''); // val value
  const alarmLevel = ref<string>(''); // val Level

  // ViewBinding đồng bộ theo chuẩn của usePatch
  const viewBinding = reactive<NotificationViewBinding>({
    titleReceiverMessage: {
      text: '',
      textColor: '',
    },
    txtReceiverMessage: {
      text: '',
    },
    btnOk: {
      text: 'OK',
      isEnabled: true,
    },
  });

  const formattedTime = computed<string>(() =>
    NotificationParserService.formatDateTime(time.value, parsedDate.value),
  );

  function appendTxtReceiverMessage(content: string): void {
    viewBinding.txtReceiverMessage.text += content;
  }

  /**
   * Logical equivalent within onCreate(savedInstanceState: Bundle?)
   */
  function onCreate(): void {
    update.value = false;

    const params = getInboundParams();
    receiverMessage.value =
      params?.UDP_RECEIVER_MESSAGE !== undefined ? params.UDP_RECEIVER_MESSAGE : null;

    asmError.value = false;
    viewBinding.titleReceiverMessage.text = '';
    viewBinding.titleReceiverMessage.textColor = '';
    viewBinding.txtReceiverMessage.text = '';
    parsedGroups.value = [];
    parsedAlarm.value = [];
    alarmLevel.value = '';

    // if (receiverMessage != null) if(receiverMessage.contains("INTERLOCKMANAGER"))
    if (receiverMessage.value !== null) {
      if (receiverMessage.value.includes('INTERLOCKMANAGER')) {
        // if(receiverMessage.contains("ALARM_ID    : 1414725736"))
        if (receiverMessage.value.includes('ALARM_ID    : 1414725736')) {
          asmError.value = true;
        }

        // val new_receiverMessage = arrayOf(receiverMessage?.split("<Table diffgr:"))
        const new_receiverMessage = [receiverMessage.value.split('<Table diffgr:')];
        parsedGroups.value = new_receiverMessage[0];

        // for(data in 1 until new_receiverMessage[0].size)
        for (let data = 1; data < new_receiverMessage[0].length; data++) {
          // val arry_receiverMessage = arrayOf(new_receiverMessage[0][data]?.split("</"))
          const arry_receiverMessage = [new_receiverMessage[0][data].split('</')];
          parsedAlarm.value = arry_receiverMessage[0];

          const Time = NotificationParserService.substringAfterLastBracket(
            arry_receiverMessage[0][0],
          );
          time.value = Time;

          const parsed = NotificationParserService.parseDateTime(Time);
          parsedDate.value = parsed;

          const formatted = formattedTime.value;

          const Eqpid = NotificationParserService.substringAfterLastBracket(
            arry_receiverMessage[0][2],
          );
          eqpid.value = Eqpid;

          const Lotid = NotificationParserService.substringAfterLastBracket(
            arry_receiverMessage[0][3],
          );
          lotId.value = Lotid;

          let desc = NotificationParserService.substringAfterLastBracket(
            arry_receiverMessage[0][7],
          );
          desc = NotificationParserService.parseHtmlDescription(desc);
          description.value = desc;

          if (asmError.value) {
            appendTxtReceiverMessage('\n' + '[' + Eqpid + '] Mask 없음 \n');
            appendTxtReceiverMessage('\nTIME: ' + formatted);
          } else {
            viewBinding.titleReceiverMessage.text = '#ALARM#';

            if (Eqpid && Eqpid.length > 0) {
              appendTxtReceiverMessage('\nEQPID: ' + Eqpid);
            }
            if (Time && Time.length > 0) {
              appendTxtReceiverMessage('\n\nTIME: ' + formatted);
            }
            if (Lotid && Lotid.length > 0) {
              appendTxtReceiverMessage('\n\nLOTID: ' + Lotid);
            }

            const rawLevelCell = NotificationParserService.substringAfterLastBracket(
              arry_receiverMessage[0][6],
            );
            if (rawLevelCell.length > 0) {
              const Level = rawLevelCell;
              alarmLevel.value = Level;

              if (Level === '1') {
                viewBinding.titleReceiverMessage.textColor = 'rgb(239, 181, 81)';
              } else if (Level === '2') {
                viewBinding.titleReceiverMessage.textColor = '#0000FF';
              } else if (Level === '3') {
                viewBinding.titleReceiverMessage.textColor = '#FF0000';
              }
            }

            if (desc && desc.length > 0) {
              // 1. 세미콜론(;)으로 split
              const parts = desc.split(';');
              descriptionParts.value = parts;

              // 2. 마지막 요소 가져오기 (trim으로 앞뒤 공백 제거)
              const lastPart = (parts[parts.length - 1] ?? '').trim();
              lastDescriptionPart.value = lastPart;

              // 3. 콜론(:) 기준 split 후 마지막 값 가져오기
              const value = NotificationParserService.substringAfter(lastPart, ':').trim();
              descriptionValue.value = value;

              appendTxtReceiverMessage('\n\n DESC: ' + value + '\n\n' + '------------------------');
            }
          }
        }
      } else {
        viewBinding.txtReceiverMessage.text = receiverMessage.value.toString();
      }
    }
  }

  /**
   * Equivalent: finish()
   */
  function finish(): void {
    onFinishCallback?.();
  }

  /**
   * Equivalent: override fun onBackPressed() { finish() }
   * Return true to allow the BaseModal to close, following the same pattern as usePatch.
   */
  function onBackPressed(): boolean {
    return true;
  }

  /**
   * Equivalent:
   * viewBinding.btnOk.setOnClickListener(object : OnSingleClickListener() {
   *     override fun onSingleClick(it: View) { finish() }
   * })
   */
  let isClicking = false;
  const singleClickListener: SingleClickListener = {
    onSingleClick() {
      if (isClicking || !viewBinding.btnOk.isEnabled) return;
      isClicking = true;
      finish();
      setTimeout(() => {
        isClicking = false;
      }, 300);
    },
  };

  onMounted(() => {
    onCreate();
  });

  return {
    update,
    receiverMessage,
    asmError,
    parsedGroups,
    parsedAlarm,
    time,
    parsedDate,
    formattedTime,
    eqpid,
    lotId,
    description,
    descriptionParts,
    lastDescriptionPart,
    descriptionValue,
    alarmLevel,
    viewBinding,
    singleClickListener,
    onCreate,
    onBackPressed,
    finish,
  };
}

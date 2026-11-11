import { defineBoot } from '@quasar/app-vite';
import { initializeAlarmCommonUdpBridge } from 'src/features/alarm-common-popup/services/alarm-common-popup.service';
import { initializeEMaxUdpBridge } from 'src/features/emax/services/emax-udp.service';
import { initializeChatNotificationBridge } from 'src/services/chat-notification.service';
import { initializeNotificationUdpBridge } from 'src/services/notification-udp.service';

export default defineBoot(({ router }) => {
  void initializeEMaxUdpBridge(router);
  void initializeAlarmCommonUdpBridge();
  void initializeNotificationUdpBridge();
  void initializeChatNotificationBridge(router);
});

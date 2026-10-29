import { defineBoot } from '@quasar/app-vite';
import { initializeAlarmCommonUdpBridge } from 'src/features/alarm-common-popup/services/alarm-common-popup.service';
import { initializeEMaxUdpBridge } from 'src/features/emax/services/emax-udp.service';

export default defineBoot(({ router }) => {
  void initializeEMaxUdpBridge(router);
  void initializeAlarmCommonUdpBridge();
});

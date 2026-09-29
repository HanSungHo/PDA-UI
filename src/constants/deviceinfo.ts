export class DeviceInfo {
  // Mobile Server Name

  //static MOBILE_SERVER_NAME = ServerType.MOBILE_SERVER_NAME;

  // PDA name
  static DEVICE_NAME = 'ANDROID_000';

  // Environment settings
  static FACILITY = 'FACILITY';
  static AREA = 'AREA';
  static BAY = 'BAY';
  static HISTORY_COUNT = '0';
  static FORWARD_COUNT = '0';

  // Login information
  static OPERATOR_ID = 'OPERATOR_ID';
  static OPERATOR_NAME = 'OPERATOR_NAME';
  static PERMISSION = 'PERMISSION';
  static GASINPUT = 'N';

  // UDP notification
  static readonly UDP_SERVICE_PORT = 9999;
  static readonly UDP_RECEIVER_FILTER = 'UDP_RECEIVER_FILTER';
  static readonly UDP_RECEIVER_LEVEL = 'UDP_RECEIVER_LEVEL';
  static readonly UDP_RECEIVER_MESSAGE = 'UDP_RECEIVER_MESSAGE';

  static readonly UDP_SERVICE_CHANEL_ID = 'UDP_SERVICE_CHANEL';
  static readonly UDP_SERVICE_CHANEL_NAME = 'UDP Service';

  static readonly UDP_NOTI_CHANEL_ID = 'UDP_NOTI_CHANEL';
  static readonly UDP_NOTI_CHANEL_NAME = 'UDP Message';

  static readonly UDP_NOTI_CONTENT_TITLE = '알림';

  // Mobile server change password
  static readonly SystemSettingPW = 'hifos';
}

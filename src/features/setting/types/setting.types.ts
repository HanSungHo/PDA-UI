export interface SettingInfo {
  facility: string;
  area: string;
  bay: string;
  historyCount: string;
  forwardCount: string;
}

export interface SettingApi {
  getFacility(): Promise<string[]>;
  getArea(facility: string): Promise<string[]>;
  getBay(area: string, facility: string): Promise<string[]>;
  sendConfig(wifiIpAddress: string): Promise<void>;
}

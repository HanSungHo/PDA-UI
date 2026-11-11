import { pass } from '../utils/response.js';

// Android (ResponseDataToJsonUtil) needs every MSGBODY.<KEY> as an object holding an ITEM array
// (USERS holds USER). Android ChatListActivity: GETPDAMESSAGE (room ITEMS) and NEWPDALIST (selectable PDAS) are both
// posted to /hifos/NEWPDALIST; createPdaMessageRoom is a plain JSON POST that answers Void.
const rooms = [
  {
    ROOM_ID: 'MOCK-ROOM-001',
    ROOM_KEY: 'Message',
    LAST_MESSAGE: 'Description',
    LAST_MESSAGE_AT: 'hh/mm',
    UNREAD_COUNT: '1',
  },
  {
    ROOM_ID: 'MOCK-ROOM-002',
    ROOM_KEY: 'Message',
    LAST_MESSAGE: 'Description',
    LAST_MESSAGE_AT: 'hh/mm',
    UNREAD_COUNT: '2',
  },
];

const pdas = [
  { PDAID: 'PDA-03', IPADDRESS: '10.0.0.3', BAY: 'BAY-A02', AREA: 'ETCH', USERNAME: '장비담당' },
  { PDAID: 'PDA-04', IPADDRESS: '10.0.0.4', BAY: 'BAY-B01', AREA: 'CVD', USERNAME: '공정담당' },
  { PDAID: 'PDA-05', IPADDRESS: '10.0.0.5', BAY: 'BAY-B01', AREA: 'CVD', USERNAME: '품질담당' },
  { PDAID: 'PDA-06', IPADDRESS: '10.0.0.6', BAY: 'BAY-C01', AREA: 'DIFF', USERNAME: '계측담당' },
];

// Chat room (ChatRoomActivity): GETPDAROOMMESSAGEBYROOM is posted to /hifos/NEWPDALIST and answers
// ITEMS (newest first) plus USERS; sendPdaMessage is a plain JSON POST that answers Void.
const roomMessages = [
  {
    SENDER_IP: '10.0.0.3',
    ROOM_NAME: 'PDA-03',
    CONTENT: '설비 점검 완료했습니다.',
    CREATED_AT: '10:32',
    MESSAGE_LEVEL: 'NORMAL',
  },
  {
    SENDER_IP: '10.0.0.4',
    ROOM_NAME: 'PDA-04',
    CONTENT: '긴급: LOT 확인 부탁드립니다.',
    CREATED_AT: '10:31',
    MESSAGE_LEVEL: 'HIGH',
  },
  {
    SENDER_IP: '10.0.0.1',
    ROOM_NAME: 'PDA-01',
    CONTENT: '확인했습니다.',
    CREATED_AT: '10:30',
    MESSAGE_LEVEL: 'NORMAL',
  },
];

const roomUsers = [{ PDAID: 'PDA-01' }, { PDAID: 'PDA-03' }, { PDAID: 'PDA-04' }];

export function createChatListHandlers() {
  return {
    GETPDAMESSAGE: () => pass({ ITEMS: { ITEM: rooms } }),
    GETPDAROOMMESSAGEBYROOM: () =>
      pass({ ITEMS: { ITEM: roomMessages }, USERS: { USER: roomUsers } }),
    SENDPDAMESSAGE: () => pass(),
    NEWPDALIST: () => pass({ PDAS: { ITEM: pdas } }),
    CREATEPDAMESSAGEROOM: () => pass(),
  };
}

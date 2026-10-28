import { createServer } from 'node:http';

const host = '127.0.0.1';
const port = Number(process.env.CHAT_MOCK_PORT ?? 8080);

const rooms = [
  {
    ROOM_ID: 'ROOM-REVIEW',
    ROOM_KEY: '설계자 검토',
    LAST_MESSAGE: '검토 메시지입니다.',
    LAST_MESSAGE_AT: '10:30',
    UNREAD_COUNT: '1',
  },
  {
    ROOM_ID: 'ROOM-ETCH',
    ROOM_KEY: 'ETCH 공정 확인',
    LAST_MESSAGE: 'LOT 상태를 확인했습니다.',
    LAST_MESSAGE_AT: '09:42',
    UNREAD_COUNT: '0',
  },
  {
    ROOM_ID: 'ROOM-EQP',
    ROOM_KEY: '장비 이상 공유',
    LAST_MESSAGE: '점검 담당자에게 전달했습니다.',
    LAST_MESSAGE_AT: '어제',
    UNREAD_COUNT: '3',
  },
];
const pdas = [
  { PDAID: 'PDA-03', IPADDRESS: '10.0.0.26', BAY: 'BAY-A02', AREA: 'ETCH', USERNAME: '장비담당' },
  { PDAID: 'PDA-04', IPADDRESS: '10.0.0.31', BAY: 'BAY-B01', AREA: 'CVD', USERNAME: '공정담당' },
  { PDAID: 'PDA-05', IPADDRESS: '10.0.0.32', BAY: 'BAY-B01', AREA: 'CVD', USERNAME: '품질담당' },
  { PDAID: 'PDA-06', IPADDRESS: '10.0.0.41', BAY: 'BAY-C01', AREA: 'DIFF', USERNAME: '계측담당' },
  { PDAID: 'PDA-01', IPADDRESS: '10.0.0.24', BAY: 'BAY1', AREA: 'AREA1', USERNAME: '설계자' },
  { PDAID: 'PDA-02', IPADDRESS: '10.0.0.25', BAY: 'BAY1', AREA: 'AREA1', USERNAME: '검토자' },
];

const messagesByRoom = new Map([
  [
    'ROOM-REVIEW',
    [
      {
        ROOM_NAME: '설계자',
        CONTENT: '검토 메시지입니다.',
        CREATED_AT: '10:30',
        MESSAGE_LEVEL: 'NORMAL',
        SENDER_IP: '10.0.0.24',
      },
      {
        ROOM_NAME: 'user1',
        CONTENT: '확인했습니다.',
        CREATED_AT: '10:31',
        MESSAGE_LEVEL: 'NORMAL',
        SENDER_IP: '',
      },
    ],
  ],
  [
    'ROOM-ETCH',
    [
      {
        ROOM_NAME: '장비담당',
        CONTENT: 'ETCH-01 장비 상태는 정상입니다.',
        CREATED_AT: '09:38',
        MESSAGE_LEVEL: 'NORMAL',
        SENDER_IP: '10.0.0.26',
      },
      {
        ROOM_NAME: 'user1',
        CONTENT: '확인했습니다. 감사합니다.',
        CREATED_AT: '09:40',
        MESSAGE_LEVEL: 'NORMAL',
        SENDER_IP: '',
      },
      {
        ROOM_NAME: '장비담당',
        CONTENT: 'LOT 상태를 확인했습니다.',
        CREATED_AT: '09:42',
        MESSAGE_LEVEL: 'NORMAL',
        SENDER_IP: '10.0.0.26',
      },
    ],
  ],
  [
    'ROOM-EQP',
    [
      {
        ROOM_NAME: '공정담당',
        CONTENT: '장비 이상 알람이 발생했습니다.',
        CREATED_AT: '어제',
        MESSAGE_LEVEL: 'HIGH',
        SENDER_IP: '10.0.0.31',
      },
      {
        ROOM_NAME: '품질담당',
        CONTENT: '점검 담당자에게 전달했습니다.',
        CREATED_AT: '어제',
        MESSAGE_LEVEL: 'NORMAL',
        SENDER_IP: '10.0.0.32',
      },
    ],
  ],
]);

function writeJson(response, statusCode, data) {
  response.writeHead(statusCode, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json; charset=utf-8',
  });
  response.end(JSON.stringify(data));
}

function messageResponse(body) {
  return {
    statusCode: 200,
    result: JSON.stringify({ STATUS: 'PASS', MSGBODY: body }),
  };
}

function time() {
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

const server = createServer(async (request, response) => {
  if (request.method === 'OPTIONS') return writeJson(response, 204, {});
  if (request.method !== 'POST') return writeJson(response, 404, { error: 'Not found' });

  try {
    const body = await readJson(request);

    if (request.url === '/hifos/NEWPDALIST') {
      const message = body.sMsg ?? '';
      const roomId = message.match(/<ROOMID>(.*?)<\/ROOMID>/)?.[1];
      if (message.includes('<MSGNAME>GETPDAROOMMESSAGEBYROOM</MSGNAME>')) {
        const messages = messagesByRoom.get(roomId) ?? [];
        const users = [...new Set(messages.map((message) => message.ROOM_NAME))].map((PDAID) => ({
          PDAID,
        }));
        return writeJson(
          response,
          200,
          messageResponse({ ITEMS: { ITEM: messages }, USERS: { USER: users } }),
        );
      }

      if (message.includes('<MSGNAME>NEWPDALIST</MSGNAME>')) {
        return writeJson(response, 200, messageResponse({ PDAS: { ITEM: pdas } }));
      }

      return writeJson(response, 200, messageResponse({ ITEMS: { ITEM: rooms } }));
    }

    if (request.url === '/hifos/sendPdaMessage') {
      const messages = messagesByRoom.get(body.roomId) ?? [];
      const createdAt = time();
      messages.unshift({
        ROOM_NAME: body.senderId,
        CONTENT: body.sMsg,
        CREATED_AT: createdAt,
        MESSAGE_LEVEL: body.sLevel,
        SENDER_IP: body.senderIpAddress,
      });
      messagesByRoom.set(body.roomId, messages);

      const room = rooms.find((item) => item.ROOM_ID === body.roomId);
      if (room) {
        room.LAST_MESSAGE = body.sMsg;
        room.LAST_MESSAGE_AT = createdAt;
        room.UNREAD_COUNT = '0';
      }

      return writeJson(response, 200, {});
    }

    if (request.url === '/hifos/createPdaMessageRoom') {
      const roomId = `ROOM-${rooms.length + 1}`;
      rooms.unshift({
        ROOM_ID: roomId,
        ROOM_KEY: body.roomName,
        LAST_MESSAGE: '',
        LAST_MESSAGE_AT: time(),
        UNREAD_COUNT: '0',
      });
      messagesByRoom.set(roomId, []);
      return writeJson(response, 200, { ROOM_ID: roomId });
    }

    return writeJson(response, 404, { error: `No mock for ${request.url}` });
  } catch (error) {
    return writeJson(response, 400, {
      error: error instanceof Error ? error.message : 'Bad request',
    });
  }
});

server.listen(port, host, () => {
  console.log(`Chat mock server listening at http://${host}:${port}`);
});

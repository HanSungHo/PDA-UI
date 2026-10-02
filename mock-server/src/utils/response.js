export function pass(messageBody = {}) {
  return {
    statusCode: 200,
    result: JSON.stringify({
      STATUS: 'PASS',
      MSGBODY: messageBody,
    }),
  };
}

export function fail(errorMessage) {
  return {
    statusCode: 200,
    result: JSON.stringify({
      STATUS: 'FAIL',
      ERRMSG: errorMessage,
      MSGBODY: '',
    }),
  };
}

export function httpError(response, status, code, message, details) {
  return response.status(status).json({ code, message, details });
}

export interface ParsedResponse {
  isSuccess: boolean;
  messageBody: Record<string, string>;
  raw?: unknown;
}

function extractMsgBody(xml: string): string {
  const start = xml.indexOf('<MSGBODY>');
  const end = xml.indexOf('</MSGBODY>');
  if (start === -1 || end === -1) return '';

  return xml.substring(start + '<MSGBODY>'.length, end);
}

function parseXmlToObject(xmlFragment: string): Record<string, string> {
  const out: Record<string, string> = {};

  // Regex: match <TAG>value</TAG>
  const re = /<([A-Z0-9_-]+)>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xmlFragment)) !== null) {
    out[m[1]] = m[2];
  }

  return out;
}

export function parseResponseData(apiData: unknown): ParsedResponse {
  if (!apiData) {
    return { isSuccess: false, messageBody: {}, raw: apiData };
  }

  const asAny = apiData as Record<string, unknown>;
  const isSuccess = Boolean(asAny.isSuccessFul || asAny.isSuccess || asAny.success);
  const result = (asAny.result as string) ?? (asAny.data as string) ?? '';
  let messageBody: Record<string, string> = {};

  if (typeof result === 'string' && result.includes('<MSGBODY>')) {
    const bodyXml = extractMsgBody(result);
    messageBody = parseXmlToObject(bodyXml);
  }

  return { isSuccess, messageBody, raw: apiData };
}

export function getErrorMessage(apiData: unknown): string {
  if (!apiData) return 'Unknown error';

  const parsed = parseResponseData(apiData);
  // common legacy tags
  const msg =
    parsed.messageBody.ERRMSG ||
    parsed.messageBody.ERRORMSG ||
    parsed.messageBody.ERRORMESSAGE ||
    parsed.messageBody.MVERR ||
    '';
  if (msg) return msg;

  const asAny = apiData as Record<string, unknown>;
  if (typeof asAny.result === 'string') return asAny.result;
  if (typeof asAny.message === 'string') return asAny.message;

  return 'Unknown error';
}

export default {
  parseResponseData,
  getErrorMessage,
};

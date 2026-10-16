export function readXmlTag(xml, tagName) {
  const match = String(xml || '').match(new RegExp(`<${tagName}>(.*?)</${tagName}>`));
  return match ? decodeXmlEntities(match[1].trim()) : '';
}

function decodeXmlEntities(value) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

export function parseAifMessage(xml) {
  const source = String(xml || '');
  const messageName = readXmlTag(source, 'MSGNAME');
  const body = source.match(/<MSGBODY>([\s\S]*?)<\/MSGBODY>/i)?.[1];

  if (!messageName || body === undefined) return undefined;

  const payload = {};
  const tagPattern = /<([A-Z][A-Z0-9_]*)>([\s\S]*?)<\/\1>/gi;
  for (const match of body.matchAll(tagPattern)) {
    payload[match[1].toUpperCase()] = decodeXmlEntities(match[2].trim());
  }

  return { messageName, payload };
}

export function normalizeAifMessageName(value) {
  return String(value || '')
    .replace(/[^a-z0-9]/gi, '')
    .toUpperCase();
}

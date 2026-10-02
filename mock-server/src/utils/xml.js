export function readXmlTag(xml, tagName) {
  const match = String(xml || '').match(new RegExp(`<${tagName}>(.*?)</${tagName}>`));
  return match ? match[1].trim() : '';
}

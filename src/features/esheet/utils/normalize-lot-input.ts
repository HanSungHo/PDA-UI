export function normalizeLotInput(rawValue: string): string {
  const isScannerPayload = /^\s/.test(rawValue);
  let value = rawValue.trimStart();

  if (isScannerPayload && value.startsWith('$')) {
    value = value.slice(1).trimStart();
  }

  if (isScannerPayload && value.length > 0) {
    value = value.slice(0, -1);
  }

  return value.trim().toUpperCase();
}

export function formatDisplayDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);

  return new Intl.DateTimeFormat('en-CA').format(date);
}

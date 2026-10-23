export class NotificationParserService {
  /**
   * Similarly: OffsetDateTime.parse(Time)
   */
  static parseDateTime(timeStr: string): Date | null {
    if (!timeStr) return null;
    const parsed = new Date(timeStr.trim());
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  /**
   * Equivalent: parsed.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
   */
  static formatDateTime(timeStr: string, parsedDate: Date | null): string {
    if (!timeStr) return '';
    const trimmed = timeStr.trim();

    const isoMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})/);
    if (isoMatch) {
      return `${isoMatch[1]} ${isoMatch[2]}`;
    }

    if (!parsedDate) return trimmed;
    const pad = (n: number) => String(n).padStart(2, '0');
    return (
      `${parsedDate.getFullYear()}-${pad(parsedDate.getMonth() + 1)}-${pad(parsedDate.getDate())} ` +
      `${pad(parsedDate.getHours())}:${pad(parsedDate.getMinutes())}:${pad(parsedDate.getSeconds())}`
    );
  }

  /**
   * Equivalent: HtmlCompat.fromHtml(desc, HtmlCompat.FROM_HTML_MODE_LEGACY).toString()
   */
  static parseHtmlDescription(htmlStr: string): string {
    if (!htmlStr) return '';
    const normalized = htmlStr.replace(/<br\s*\/?>/gi, '\n');
    const parser = new DOMParser();
    const doc = parser.parseFromString(normalized, 'text/html');
    return doc.body.textContent || '';
  }

  /**
   * Equivalent: str.substring(str.lastIndexOf(">") + 1)
   */
  static substringAfterLastBracket(str: string | undefined): string {
    if (str === undefined || str === null) return '';
    const lastIdx = str.lastIndexOf('>');
    return str.substring(lastIdx + 1);
  }

  /**
   * Equivalent: lastPart.substringAfter(":")
   */
  static substringAfter(str: string, delimiter: string): string {
    const index = str.indexOf(delimiter);
    return index === -1 ? str : str.substring(index + delimiter.length);
  }
}

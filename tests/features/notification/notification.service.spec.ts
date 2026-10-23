import { describe, expect, it } from 'vitest';

import { NotificationParserService } from '~/features/notification/services/notification.service';

describe('NotificationParserService', () => {
  describe('parseDateTime', () => {
    it('returns null for empty string', () => {
      expect(NotificationParserService.parseDateTime('')).toBeNull();
    });

    it('parses a valid ISO string', () => {
      const result = NotificationParserService.parseDateTime('2024-01-05T10:20:30+09:00');
      expect(result).toBeInstanceOf(Date);
      expect(result?.toISOString()).toBe('2024-01-05T01:20:30.000Z');
    });

    it('trims surrounding whitespace before parsing', () => {
      const result = NotificationParserService.parseDateTime('  2024-01-05T10:20:30Z  ');
      expect(result).toBeInstanceOf(Date);
    });

    it('returns null for an invalid date string', () => {
      expect(NotificationParserService.parseDateTime('not-a-date')).toBeNull();
    });
  });

  describe('formatDateTime', () => {
    it('returns empty string when time string is empty', () => {
      expect(NotificationParserService.formatDateTime('', null)).toBe('');
    });

    it('formats ISO strings directly without timezone conversion', () => {
      expect(NotificationParserService.formatDateTime('2024-01-05T10:20:30+09:00', null)).toBe(
        '2024-01-05 10:20:30',
      );
    });

    it('trims the input before matching ISO', () => {
      expect(NotificationParserService.formatDateTime('  2024-01-05T10:20:30Z ', null)).toBe(
        '2024-01-05 10:20:30',
      );
    });

    it('falls back to parsedDate (local time, zero padded) for non ISO strings', () => {
      const date = new Date(2024, 0, 5, 3, 4, 5);
      expect(NotificationParserService.formatDateTime('Jan 5 2024', date)).toBe(
        '2024-01-05 03:04:05',
      );
    });

    it('returns the trimmed string when non ISO and parsedDate is null', () => {
      expect(NotificationParserService.formatDateTime('  garbage ', null)).toBe('garbage');
    });
  });

  describe('parseHtmlDescription', () => {
    it('returns empty string for empty input', () => {
      expect(NotificationParserService.parseHtmlDescription('')).toBe('');
    });

    it('converts <br> variants to new lines', () => {
      expect(NotificationParserService.parseHtmlDescription('a<br>b<br/>c<BR />d')).toBe(
        'a\nb\nc\nd',
      );
    });

    it('strips tags and decodes entities', () => {
      expect(
        NotificationParserService.parseHtmlDescription('<b>Temp</b> &gt; 100 &amp; high'),
      ).toBe('Temp > 100 & high');
    });

    it('returns plain text unchanged', () => {
      expect(NotificationParserService.parseHtmlDescription('plain text')).toBe('plain text');
    });
  });

  describe('substringAfterLastBracket', () => {
    it('returns empty string for undefined', () => {
      expect(NotificationParserService.substringAfterLastBracket(undefined)).toBe('');
    });

    it('returns empty string for null', () => {
      expect(
        NotificationParserService.substringAfterLastBracket(null as unknown as undefined),
      ).toBe('');
    });

    it('returns the whole string when there is no ">"', () => {
      expect(NotificationParserService.substringAfterLastBracket('abc')).toBe('abc');
    });

    it('returns the text after the last ">"', () => {
      expect(NotificationParserService.substringAfterLastBracket('<a><b>value')).toBe('value');
    });

    it('returns empty string when ">" is the last character', () => {
      expect(NotificationParserService.substringAfterLastBracket('<a>')).toBe('');
    });
  });

  describe('substringAfter', () => {
    it('returns the original string when the delimiter is missing', () => {
      expect(NotificationParserService.substringAfter('abc', ':')).toBe('abc');
    });

    it('returns the text after the first delimiter', () => {
      expect(NotificationParserService.substringAfter('key:val:ue', ':')).toBe('val:ue');
    });

    it('supports multi-character delimiters', () => {
      expect(NotificationParserService.substringAfter('a=>b', '=>')).toBe('b');
    });
  });
});

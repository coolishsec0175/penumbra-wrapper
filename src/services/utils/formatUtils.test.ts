import { describe, it, expect } from 'vitest';
import { formatBytes, formatHexSize, getTimestampString } from './formatUtils';

describe('formatBytes', () => {
  it('formats bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
  });

  it('formats kilobytes', () => {
    expect(formatBytes(1024)).toBe('1.00 KB');
    expect(formatBytes(1536)).toBe('1.50 KB');
  });

  it('formats megabytes', () => {
    expect(formatBytes(1024 * 1024)).toBe('1.00 MB');
    expect(formatBytes(1536000)).toBe('1.46 MB');
  });

  it('formats gigabytes', () => {
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1.00 GB');
  });
});

describe('formatHexSize', () => {
  it('converts hex size to human readable', () => {
    expect(formatHexSize('0x400000')).toBe('4.00 MB');
  });

  it('handles hex without prefix', () => {
    expect(formatHexSize('100000')).toBe('1.00 MB');
  });

  it('returns original string when parsing fails', () => {
    expect(formatHexSize('not-a-hex')).toBe('not-a-hex');
  });
});

describe('getTimestampString', () => {
  it('produces a filename-safe timestamp', () => {
    const result = getTimestampString();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/);
    expect(result).not.toContain(':');
    expect(result).not.toContain('.');
  });
});

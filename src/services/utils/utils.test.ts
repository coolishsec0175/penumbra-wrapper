import { describe, it, expect } from 'vitest';
import { formatBytes, formatHexSize } from './formatUtils';
import { getBasename, getDirname, generateTimestampedFilename, joinPath } from './pathUtils';

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
    expect(formatBytes(1536 * 1024)).toBe('1.50 MB');
  });

  it('formats gigabytes', () => {
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1.00 GB');
  });
});

describe('formatHexSize', () => {
  it('parses hex sizes with prefix', () => {
    expect(formatHexSize('0x400000')).toBe('4.00 MB');
  });

  it('parses hex sizes without prefix', () => {
    expect(formatHexSize('100000')).toBe('1.00 MB');
  });

  it('returns original string on invalid input', () => {
    expect(formatHexSize('not-hex')).toBe('not-hex');
  });
});

describe('getBasename', () => {
  it('handles unix separators', () => {
    expect(getBasename('/home/user/file.txt')).toBe('file.txt');
  });

  it('handles windows separators', () => {
    expect(getBasename('C:\\Users\\file.txt')).toBe('file.txt');
  });

  it('handles root paths', () => {
    expect(getBasename('file.txt')).toBe('file.txt');
  });
});

describe('getDirname', () => {
  it('extracts directory from unix path', () => {
    expect(getDirname('/home/user/file.txt')).toBe('/home/user');
  });

  it('extracts directory from windows path', () => {
    expect(getDirname('C:\\Users\\file.txt')).toBe('C:/Users');
  });
});

describe('generateTimestampedFilename', () => {
  it('generates a timestamped filename with default extension', () => {
    const name = generateTimestampedFilename('backup');
    expect(name).toMatch(/^backup_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.img$/);
  });

  it('uses custom extension', () => {
    const name = generateTimestampedFilename('backup', 'bin');
    expect(name).toMatch(/\.bin$/);
  });
});

describe('joinPath', () => {
  it('joins segments with forward slash', () => {
    expect(joinPath('home', 'user', 'file.txt')).toBe('home/user/file.txt');
  });

  it('joins segments with backslash for windows paths', () => {
    expect(joinPath('C:', 'Users', 'file.txt')).toBe('C:\\Users\\file.txt');
  });

  it('returns empty string for no segments', () => {
    expect(joinPath()).toBe('');
  });

  it('filters empty segments', () => {
    expect(joinPath('home', '', 'file.txt')).toBe('home/file.txt');
  });
});

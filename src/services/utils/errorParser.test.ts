import { describe, it, expect } from 'vitest';
import {
  parseTauriError,
  extractErrorMessage,
  getErrorSuggestion,
  isErrorCategory,
} from './errorParser';
import { ErrorCategory } from '../../types/errors';

describe('parseTauriError', () => {
  it('handles null and undefined', () => {
    expect(parseTauriError(null).category).toBe(ErrorCategory.Unknown);
    expect(parseTauriError(undefined).category).toBe(ErrorCategory.Unknown);
  });

  it('handles Error instances', () => {
    const err = new Error('something broke');
    expect(parseTauriError(err).message).toBe('something broke');
  });

  it('handles string errors', () => {
    expect(parseTauriError('raw string').message).toBe('raw string');
  });

  it('handles structured tauri errors with category', () => {
    const err = { type: 'io', message: 'disk error', category: 'filesystem' };
    const parsed = parseTauriError(err);
    expect(parsed.category).toBe(ErrorCategory.FileSystem);
    expect(parsed.message).toBe('disk error');
  });

  it('handles plain objects with message', () => {
    const parsed = parseTauriError({ message: 'generic error' });
    expect(parsed.message).toBe('generic error');
  });
});

describe('extractErrorMessage', () => {
  it('extracts message from various error types', () => {
    expect(extractErrorMessage('oops')).toBe('oops');
    expect(extractErrorMessage(new Error('boom'))).toBe('boom');
  });
});

describe('getErrorSuggestion', () => {
  it('returns network suggestion', () => {
    expect(getErrorSuggestion({ type: 'other', category: 'network' })).toContain('internet');
  });

  it('returns permission suggestion', () => {
    expect(getErrorSuggestion({ type: 'other', category: 'permission' })).toContain('Administrator');
  });

  it('returns undefined for unknown category', () => {
    expect(getErrorSuggestion({ type: 'other', category: 'unknown' })).toBeUndefined();
  });
});

describe('isErrorCategory', () => {
  it('checks error category', () => {
    expect(isErrorCategory({ type: 'other', category: 'update' }, ErrorCategory.Update)).toBe(true);
    expect(isErrorCategory({ type: 'other', category: 'update' }, ErrorCategory.Network)).toBe(false);
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useToast } from '../useToast';

describe('useToast', () => {
  let consoleLogSpy: any;
  let consoleErrorSpy: any;
  let consoleInfoSpy: any;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleInfoSpy.mockRestore();
  });

  it('should return toast functions', () => {
    const { result } = renderHook(() => useToast());

    expect(result.current).toHaveProperty('success');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('info');
    expect(typeof result.current.success).toBe('function');
    expect(typeof result.current.error).toBe('function');
    expect(typeof result.current.info).toBe('function');
  });

  describe('success', () => {
    it('should call console.log with success message', () => {
      const { result } = renderHook(() => useToast());

      result.current.success('Operation successful');

      expect(consoleLogSpy).toHaveBeenCalledWith('SUCCESS:', 'Operation successful');
    });

    it('should handle empty message', () => {
      const { result } = renderHook(() => useToast());

      result.current.success('');

      expect(consoleLogSpy).toHaveBeenCalledWith('SUCCESS:', '');
    });
  });

  describe('error', () => {
    it('should call console.error with error message', () => {
      const { result } = renderHook(() => useToast());

      result.current.error('Something went wrong');

      expect(consoleErrorSpy).toHaveBeenCalledWith('ERROR:', 'Something went wrong');
    });

    it('should handle long error messages', () => {
      const { result } = renderHook(() => useToast());
      const longMessage = 'A'.repeat(1000);

      result.current.error(longMessage);

      expect(consoleErrorSpy).toHaveBeenCalledWith('ERROR:', longMessage);
    });
  });

  describe('info', () => {
    it('should call console.info with info message', () => {
      const { result } = renderHook(() => useToast());

      result.current.info('Processing your request');

      expect(consoleInfoSpy).toHaveBeenCalledWith('INFO:', 'Processing your request');
    });

    it('should handle special characters', () => {
      const { result } = renderHook(() => useToast());
      const message = 'Test with special chars: @#$%^&*()';

      result.current.info(message);

      expect(consoleInfoSpy).toHaveBeenCalledWith('INFO:', message);
    });
  });

  describe('multiple calls', () => {
    it('should handle multiple success calls', () => {
      const { result } = renderHook(() => useToast());

      result.current.success('First success');
      result.current.success('Second success');
      result.current.success('Third success');

      expect(consoleLogSpy).toHaveBeenCalledTimes(3);
    });

    it('should handle mixed toast types', () => {
      const { result } = renderHook(() => useToast());

      result.current.success('Success message');
      result.current.error('Error message');
      result.current.info('Info message');

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('hook stability', () => {
    it('should return stable functions across re-renders', () => {
      const { result, rerender } = renderHook(() => useToast());

      const firstSuccess = result.current.success;
      const firstError = result.current.error;
      const firstInfo = result.current.info;

      rerender();

      expect(result.current.success).toBe(firstSuccess);
      expect(result.current.error).toBe(firstError);
      expect(result.current.info).toBe(firstInfo);
    });
  });
});

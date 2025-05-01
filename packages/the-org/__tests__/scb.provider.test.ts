import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scbProvider } from '../src/scb/provider';
import { type IAgentRuntime, type Memory, type State } from '@elizaos/core';

// Mock global fetch
global.fetch = vi.fn();

const mockRuntime = {} as IAgentRuntime;
const mockMessage = { content: { text: 'test' } } as Memory;
const mockState = {} as State;

describe('SCB Provider', () => {
  beforeEach(() => {
    // Reset mocks before each test
    (fetch as any).mockClear();
    delete process.env.NEUROSYNC_URL;
    delete process.env.SCB_TOKENS;
  });

  it('should fetch SCB slice and return data on success', async () => {
    const mockResponse = {
      summary: 'Test summary',
      window: [{ t: 1, type: 'event', actor: 'user', text: 'hi' }],
    };
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await scbProvider.get(mockRuntime, mockMessage, mockState);

    expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:5000/scb/slice?tokens=600');
    expect(result.text).toBe('Test summary');
    expect(result.data).toEqual(mockResponse);
  });

  it('should use environment variables for URL and token budget', async () => {
    process.env.NEUROSYNC_URL = 'http://test-neurosync:1234';
    process.env.SCB_TOKENS = '1000';
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ summary: '', window: [] }),
    });

    await scbProvider.get(mockRuntime, mockMessage, mockState);

    expect(fetch).toHaveBeenCalledWith('http://test-neurosync:1234/scb/slice?tokens=1000');
  });

  it('should handle fetch error gracefully', async () => {
    const mockError = new Error('Network Failed');
    (fetch as any).mockRejectedValueOnce(mockError);

    const result = await scbProvider.get(mockRuntime, mockMessage, mockState);

    expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:5000/scb/slice?tokens=600');
    expect(result.text).toBe('');
    expect(result.data).toEqual({ error: 'Network Failed' });
  });

  it('should handle non-OK response gracefully', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const result = await scbProvider.get(mockRuntime, mockMessage, mockState);

    expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:5000/scb/slice?tokens=600');
    expect(result.text).toBe('');
    expect(result.data).toEqual({ error: 'HTTP 500' }); // Error message includes status
  });

  it('should handle empty summary gracefully', async () => {
    const mockResponse = { summary: null, window: [] }; // Simulate null summary
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await scbProvider.get(mockRuntime, mockMessage, mockState);

    expect(result.text).toBe(''); // Should default to empty string
    expect(result.data).toEqual(mockResponse);
  });
});

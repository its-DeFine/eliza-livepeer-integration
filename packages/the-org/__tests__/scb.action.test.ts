import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scbDirectiveAction } from '../src/scb/action';
import { type IAgentRuntime, type Memory, type State } from '@elizaos/core';

// Mock global fetch
global.fetch = vi.fn();

const mockRuntime = {} as IAgentRuntime;
// Provide minimal required structure for Memory
const mockMessage = { content: { text: 'Test directive' } } as Memory;
const mockState = {} as State;

describe('SCB Directive Action', () => {
  beforeEach(() => {
    // Reset mocks before each test
    (fetch as any).mockClear();
    delete process.env.NEUROSYNC_URL;
  });

  it('should send directive POST request on success', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true, // Simulate successful response
    });

    await scbDirectiveAction.handler(mockRuntime, mockMessage, mockState);

    expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:5000/scb/directive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actor: 'planner', text: 'Test directive' }),
    });
  });

  it('should use environment variable for URL', async () => {
    process.env.NEUROSYNC_URL = 'http://test-neurosync:1234';
    (fetch as any).mockResolvedValueOnce({ ok: true });

    await scbDirectiveAction.handler(mockRuntime, mockMessage, mockState);

    expect(fetch).toHaveBeenCalledWith(
      'http://test-neurosync:1234/scb/directive',
      expect.anything()
    );
  });

  it('should handle fetch error gracefully', async () => {
    const mockError = new Error('Network Failed');
    (fetch as any).mockRejectedValueOnce(mockError);
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {}); // Suppress console output

    await scbDirectiveAction.handler(mockRuntime, mockMessage, mockState);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(consoleWarnSpy).toHaveBeenCalledWith('[SCBAction] Failed to send directive', mockError);
    consoleWarnSpy.mockRestore();
  });

  it('should handle non-OK response gracefully', async () => {
    // Note: The current handler doesn't check response.ok, so it won't throw/warn here.
    // This test confirms the current behavior but could be updated if error handling is added.
    (fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 400,
    });
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await scbDirectiveAction.handler(mockRuntime, mockMessage, mockState);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(consoleWarnSpy).not.toHaveBeenCalled(); // No warning expected based on current code
    consoleWarnSpy.mockRestore();
  });

  it('should not send request if message text is empty', async () => {
    const emptyMessage = { content: { text: '' } } as Memory;
    await scbDirectiveAction.handler(mockRuntime, emptyMessage, mockState);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('should always validate to true (MVP)', async () => {
    const isValid = await scbDirectiveAction.validate(mockRuntime, mockMessage, mockState);
    expect(isValid).toBe(true);
  });
});

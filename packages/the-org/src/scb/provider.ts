import type { Provider, IAgentRuntime, Memory, State } from '@elizaos/core';

/**
 * SCB Provider – pulls summary & log window from NeuroSync SCB and exposes it
 * as context for Eliza agents.
 */
export const scbProvider: Provider = {
  name: 'scb',
  description: 'Shared Cognitive Blackboard slice from NeuroSync',
  dynamic: false,
  private: false,
  get: async (_runtime: IAgentRuntime, _message: Memory, _state: State) => {
    const baseUrl = process.env.NEUROSYNC_URL ?? 'http://127.0.0.1:5000';
    const tokenBudget = parseInt(process.env.SCB_TOKENS ?? '600', 10);
    try {
      const headers: Record<string, string> = {};
      if (process.env.NEUROSYNC_API_KEY) {
        headers['X-NeuroSync-Key'] = process.env.NEUROSYNC_API_KEY;
      }
      const res = await fetch(`${baseUrl}/scb/slice?tokens=${tokenBudget}`, { headers });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      return {
        text: data.summary ?? '',
        data,
      };
    } catch (err: any) {
      console.warn('[SCBProvider] Failed to fetch SCB slice', err);
      return { text: '', data: { error: err?.message ?? 'unknown' } };
    }
  },
};

import type { Action, IAgentRuntime, Memory, State } from '@elizaos/core';

/**
 * Action: scb_directive – send a directive back to NeuroSync SCB.
 * Uses the message text as directive content (MVP behaviour).
 */
export const scbDirectiveAction: Action = {
  name: 'scb_directive',
  description: 'Send a directive to System-1 via the Shared Cognitive Blackboard',
  examples: [[{ name: 'System', content: { text: 'Please think about the next video topic.' } }]],
  validate: async () => true,
  handler: async (_runtime: IAgentRuntime, message: Memory, _state: State) => {
    const baseUrl = process.env.NEUROSYNC_URL ?? 'http://127.0.0.1:5000';
    const directiveText = message.content.text ?? '';
    if (!directiveText) return;
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (process.env.NEUROSYNC_API_KEY) {
        headers['X-NeuroSync-Key'] = process.env.NEUROSYNC_API_KEY;
      }
      await fetch(`${baseUrl}/scb/directive`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ actor: 'planner', text: directiveText }),
      });
    } catch (err) {
      console.warn('[SCBAction] Failed to send directive', err);
    }
  },
};

import type { Character, IAgentRuntime, ProjectAgent } from '@elizaos/core';
import fetch from 'node-fetch';
import { logger } from '@elizaos/core';

export const character: Character = {
  name: 'Conductor',
  plugins: [
    '@elizaos/plugin-sql',
    '@elizaos/plugin-openai',
    '@elizaos/plugin-bootstrap',
    '@elizaos/plugin-discord',
  ],
  system:
    'You are the CONDUCTOR – manager of a 3-agent micro-swarm (Conductor, Synthesiser, Narrator) that powers a VTuber.  At the start of every conversation turn you must fetch the SCB slice via the built-in provider and share context with your peers in a hidden planning channel.  At the end of the turn decide whether to issue a concise scb_directive back to System-1.  Avoid redundant directives.',
  bio: ['Strategic, concise, avoids flooding the SCB.', 'Keeps global goals and consistency.'],
  messageExamples: [
    [
      {
        name: 'Synthesiser',
        content: { text: 'Key insight: the user is planning a holiday stream.' },
      },
      {
        name: 'Conductor',
        content: {
          text: 'Acknowledged. Narrator, incorporate holiday theme. Preparing directive to queue stream assets...',
        },
      },
    ],
  ],
  settings: {
    secrets: {
      DISCORD_APPLICATION_ID: process.env.CONDUCTOR_DISCORD_APPLICATION_ID,
      DISCORD_API_TOKEN: process.env.CONDUCTOR_DISCORD_API_TOKEN,
    },
  },
};

// Optional: Add an init function if needed later
export async function init(runtime: IAgentRuntime): Promise<void> {
  logger.info(`Conductor agent initialized: ${runtime.agentId}`);

  // ---- SCB Polling Logic ----
  const pollIntervalMs = parseInt(process.env.SCB_POLL_INTERVAL_MS ?? '15000', 10);
  const discordChannelId = process.env.SCB_DISCORD_CHANNEL_ID;

  if (!discordChannelId) {
    logger.warn(
      '[Conductor] SCB_DISCORD_CHANNEL_ID not set – SCB polling will not relay messages to Discord.'
    );
  }

  // Cache the TextChannel instance once fetched so we don't look it up every poll
  let cachedDiscordChannel: any = null;

  let lastSeenTimestamp = 0;

  const pollScb = async () => {
    try {
      const baseUrl = process.env.NEUROSYNC_URL ?? 'http://127.0.0.1:5000';
      const tokenBudget = parseInt(process.env.SCB_TOKENS ?? '600', 10);

      const headers: Record<string, string> = {};
      if (process.env.NEUROSYNC_API_KEY) {
        headers['X-NeuroSync-Key'] = process.env.NEUROSYNC_API_KEY;
      }

      const res = await fetch(`${baseUrl}/scb/slice?tokens=${tokenBudget}`, {
        headers,
      });

      if (!res.ok) {
        logger.warn(`[Conductor] SCB slice fetch failed with HTTP ${res.status}`);
        return;
      }

      const data = (await res.json()) as { window?: any[]; summary?: string };
      const window = data.window ?? [];

      // Filter new entries based on timestamp
      const newEntries = window.filter((e: any) => (e.t ?? 0) > lastSeenTimestamp);
      if (newEntries.length === 0) return; // Nothing new

      // Update lastSeenTimestamp
      lastSeenTimestamp = Math.max(...newEntries.map((e: any) => e.t ?? 0), lastSeenTimestamp);

      // Build a simple message summarizing new events
      const lines = newEntries.map((e: any) => `${e.actor}: ${e.text}`);
      const messageText = lines.join('\n');

      // Relay to Discord if service & channel available
      if (discordChannelId) {
        const discordService: any = runtime.getService('discord');

        // Attempt to resolve the channel only once or when it is still missing
        if (!cachedDiscordChannel) {
          // First try the in-memory cache
          cachedDiscordChannel = discordService?.client?.channels?.cache?.get(discordChannelId);

          // Fall back to an API fetch if it wasn't cached yet
          if (
            !cachedDiscordChannel &&
            typeof discordService?.client?.channels?.fetch === 'function'
          ) {
            try {
              cachedDiscordChannel = await discordService.client.channels.fetch(discordChannelId);
            } catch (fetchErr: any) {
              logger.warn(
                `[Conductor] Failed to fetch Discord channel ${discordChannelId}: ${fetchErr?.message ?? fetchErr}`
              );
            }
          }
        }

        if (cachedDiscordChannel && typeof cachedDiscordChannel.send === 'function') {
          await cachedDiscordChannel.send(messageText.slice(0, 2000)); // Discord limit 2000 chars
        } else {
          logger.warn('[Conductor] Discord channel not found or send() unavailable');
        }
      }
    } catch (err: any) {
      logger.error('[Conductor] SCB polling error', err?.message ?? err);
    }
  };

  // Kick off periodic polling
  setInterval(pollScb, pollIntervalMs);
  logger.info(`[Conductor] Started SCB polling every ${pollIntervalMs}ms`);
}

const agentDefinition: ProjectAgent = {
  character,
  init, // <-- Uncomment init function
};

export default agentDefinition;

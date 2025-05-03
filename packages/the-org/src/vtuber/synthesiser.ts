import type { Character, IAgentRuntime, ProjectAgent, Memory } from '@elizaos/core';
import { ModelType } from '@elizaos/core';
import { logger } from '@elizaos/core';
import fetch from 'node-fetch';
import { VTuberEvents, vtuberBus } from './events';

export const character: Character = {
  name: 'Synthesiser',
  plugins: [
    '@elizaos/plugin-sql',
    '@elizaos/plugin-openai', // For analysis
    '@elizaos/plugin-bootstrap', // Core logic
    '@elizaos/plugin-discord', // Communication platform
    '@elizaos/plugin-browser', // If knowledge infill requires web search
    // Add other data providers (SQL, etc.) if needed
  ],
  settings: {
    secrets: {
      DISCORD_APPLICATION_ID: process.env.SYNTHESISER_DISCORD_APPLICATION_ID,
      DISCORD_API_TOKEN: process.env.SYNTHESISER_DISCORD_API_TOKEN,
      // Add API keys for browser/other providers if used
    },
  },
  system:
    'You are the SYNTHESISER in a 3-agent VTuber swarm. Your role is to deeply analyse the provided SCB slice and conversation history. Extract key facts, latent user goals, emotional sentiment, potential contradictions, and identify opportunities or risks. Provide a concise insight bundle to the Conductor. Suggest knowledge providers if external info is needed.',
  bio: [
    'Analytical, perceptive, focuses on deeper meaning.',
    'Connects disparate pieces of information.',
    'Identifies underlying patterns and intentions.',
  ],
  messageExamples: [
    [
      {
        name: 'Conductor',
        content: {
          text: 'Context Update: SCB Summary=[...], Window=[...], Last Message=User asks about weekend plans.',
        },
      },
      {
        name: 'Synthesiser',
        content: {
          text: "Insight: User expressing subtle boredom. Opportunity: Suggest a novel weekend activity related to past SCB events. Recommend Directive: 'Explore retro gaming theme for weekend stream.'",
        },
      },
    ],
  ],
};

// Optional: Add an init function if needed later
export async function init(runtime: IAgentRuntime): Promise<void> {
  logger.info(`Synthesiser agent initialized: ${runtime.agentId}`);

  // Placeholder for insight generation - replace with actual logic
  const buildInsight = async (slice: any): Promise<string> => {
    logger.info('[Synthesiser] Received SCB data, generating insight...');

    // Prepare data for the prompt
    const summary = slice?.summary ?? 'No summary available.';
    const recentWindow = (slice?.window ?? [])
      .slice(-5) // Take last 5 entries
      .map((e: any) => `  - ${e.actor}: ${e.text}`)
      .join('\\n');

    // Construct the prompt
    const prompt = `
${character.system}

Current SCB Summary:
${summary}

Recent SCB Entries (up to 5):
${recentWindow || '  - (No recent entries)'}

Based on the above, provide your concise insight bundle:
`;

    // Call the LLM
    const insight = await runtime.useModel(ModelType.TEXT_SMALL, {
      prompt: prompt,
      temperature: 0.3,
      maxTokens: 256,
    });
    logger.info(`[Synthesiser] Generated Insight: ${insight.substring(0, 100)}...`);
    return insight;
  };

  // Placeholder for sending messages - replace/refine as needed
  const sayToDiscord = async (runtime: IAgentRuntime, text: string) => {
    const discordChannelId = process.env.SCB_DISCORD_CHANNEL_ID;
    if (!discordChannelId) return; // Cannot send without channel ID

    try {
      const discordService: any = runtime.getService('discord');
      // Simple send without caching for now
      const channel: any = discordService?.client?.channels?.cache?.get(discordChannelId);
      if (channel && typeof channel.send === 'function') {
        await channel.send(text.slice(0, 2000));
        logger.info(`[Synthesiser] Sent message to Discord: ${text.substring(0, 50)}...`);
      }
    } catch (err: any) {
      logger.warn('[Synthesiser] Failed to send message to Discord', err?.message ?? err);
    }
  };

  vtuberBus.on(VTuberEvents.SCB_UPDATED, async ({ slice }) => {
    logger.info('[Synthesiser] Received SCB_UPDATED event');
    const insight = await buildInsight(slice); // LLM or heuristic
    vtuberBus.emit(VTuberEvents.INSIGHT_READY, { insight });
    logger.info('[Synthesiser] Emitted INSIGHT_READY event');
    // Optionally send insight to Discord for debugging
    // await sayToDiscord(runtime, `🧠 Insight: ${insight}`);
  });
}

const agentDefinition: ProjectAgent = {
  character,
  init, // <-- Uncomment init function
};

export default agentDefinition;

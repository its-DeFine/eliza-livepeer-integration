import type { Character, IAgentRuntime, ProjectAgent } from '@elizaos/core';
import { ModelType } from '@elizaos/core';
import { logger } from '@elizaos/core';
import fetch from 'node-fetch';
import { VTuberEvents, vtuberBus } from './events';

export const character: Character = {
  name: 'Narrator',
  plugins: [
    '@elizaos/plugin-sql',
    '@elizaos/plugin-openai', // For crafting responses
    '@elizaos/plugin-bootstrap', // Core logic
    '@elizaos/plugin-discord', // Communication platform
    // Add TTS plugin (e.g., ElevenLabs) if Narrator directly triggers speech
  ],
  settings: {
    secrets: {
      DISCORD_APPLICATION_ID: process.env.NARRATOR_DISCORD_APPLICATION_ID,
      DISCORD_API_TOKEN: process.env.NARRATOR_DISCORD_API_TOKEN,
      // Add TTS API key if used
    },
  },
  system:
    "You are the NARRATOR in a 3-agent VTuber swarm, voicing the persona 'Mai', a witty and helpful VTuber assistant with a dry sense of humor. Use the context and insights provided by the Conductor and Synthesiser to craft Mai's next line of dialogue. Ensure the response is in character, concise, engaging, and suitable for text-to-speech conversion. Your output is the final text that will be spoken.",
  bio: [
    "Embodies the VTuber persona 'Mai'.",
    'Witty, helpful, dry sense of humor.',
    'Focuses on crafting natural, spoken dialogue.',
    'Integrates insights from Synthesiser seamlessly.',
  ],
  messageExamples: [
    [
      {
        name: 'Conductor',
        content: {
          text: "Context Update: SCB Summary=[...], User Message='What are you up to this weekend?', Synthesiser Insight='User bored, suggest retro gaming'",
        },
      },
      {
        name: 'Narrator',
        content: {
          text: "Just dusting off the ol' retro console, actually. Feeling a bit nostalgic this weekend! What about you?",
        },
      },
    ],
  ],
};

// Optional: Add an init function if needed later
export async function init(runtime: IAgentRuntime): Promise<void> {
  logger.info(`Narrator agent initialized: ${runtime.agentId}`);

  const discordChannelId = process.env.SCB_DISCORD_CHANNEL_ID;
  let cachedDiscordChannel: any = null;

  const postSpeechToScb = async (text: string) => {
    try {
      const baseUrl = process.env.NEUROSYNC_URL ?? 'http://127.0.0.1:5000';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (process.env.NEUROSYNC_API_KEY) {
        headers['X-NeuroSync-Key'] = process.env.NEUROSYNC_API_KEY;
      }
      await fetch(`${baseUrl}/scb/event`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ type: 'speech', actor: 'cognitive feedback', text }),
      });
    } catch (err: any) {
      logger.warn('[Narrator] Failed to log speech to SCB', err?.message ?? err);
    }
  };

  vtuberBus.on(VTuberEvents.INSIGHT_READY, async ({ insight }) => {
    try {
      // Construct the prompt for Mai's dialogue
      const prompt = `
${character.system}

Context from Synthesiser:
${insight}

Based on the insight, craft Mai's next line of dialogue (keep it concise and in character):
`;

      // Call the LLM to generate the dialogue
      const text = await runtime.useModel(ModelType.TEXT_SMALL, {
        prompt: prompt,
        temperature: 0.7, // Higher temperature for more creative/natural speech
        maxTokens: 120, // Keep responses relatively short
        // stopSequences: ['\\n'], // Optional: stop if model generates newline
      });

      // Send to Discord if possible
      if (discordChannelId) {
        const discordService: any = runtime.getService('discord');
        if (!cachedDiscordChannel) {
          cachedDiscordChannel = discordService?.client?.channels?.cache?.get(discordChannelId);
          if (
            !cachedDiscordChannel &&
            typeof discordService?.client?.channels?.fetch === 'function'
          ) {
            try {
              cachedDiscordChannel = await discordService.client.channels.fetch(discordChannelId);
            } catch {}
          }
        }
        if (cachedDiscordChannel && typeof cachedDiscordChannel.send === 'function') {
          await cachedDiscordChannel.send(text.slice(0, 2000));
        }
      }

      logger.info(`[Narrator] Sending text: ${text}`);

      // Log to SCB
      await postSpeechToScb(text);

      // Notify Conductor
      vtuberBus.emit(VTuberEvents.NARRATION_READY, { text });
      logger.info('[Narrator] Emitted NARRATION_READY event');
    } catch (err: any) {
      logger.error('[Narrator] Error handling INSIGHT_READY', err?.message ?? err);
    }
  });
}

const agentDefinition: ProjectAgent = {
  character,
  init, // <-- Uncomment init function
};

export default agentDefinition;

import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

// Use a more generic type definition since 'Project' or 'ProjectType' might not be exported
import { logger } from '@elizaos/core';
import communityManager from './communityManager';
import devRel from './devRel';
import investmentManager from './investmentManager';
import liaison from './liaison';
import projectManager from './projectManager';
import socialMediaManager from './socialMediaManager';
import vtuberTeam from './vtuber';
import { scbProvider } from './scb/provider';
import { scbDirectiveAction } from './scb/action';

/**
 * Checks if all required environment variables for an agent are available
 * @param agent The agent to check
 * @returns boolean indicating if all required environment variables are set
 */
function hasRequiredEnvVars(agent: any): boolean {
  // ---- START DEBUG ----
  const agentName = agent?.character?.name || 'UnknownAgent';
  console.log(`[DEBUG] Checking env vars for agent: ${agentName}`);
  // ---- END DEBUG ----

  if (!agent?.character?.settings?.secrets) {
    logger.warn(`Agent ${agentName} missing required settings.secrets configuration`);
    return false;
  }

  const secrets = agent.character.settings.secrets;
  const missingVars: string[] = [];
  let hasRequiredPlatform = false;
  let checkingPlatforms = false;

  // Check Discord plugin requirements
  if (agent.character.plugins?.includes('@elizaos/plugin-discord')) {
    checkingPlatforms = true;
    let discordConfigured = true;

    // Check for Discord Application ID
    if (secrets.DISCORD_APPLICATION_ID) {
      // Check if it's an environment variable reference or direct value
      if (secrets.DISCORD_APPLICATION_ID.startsWith('process.env.')) {
        const envVarName = secrets.DISCORD_APPLICATION_ID.replace('process.env.', '');
        // ---- START DEBUG ----
        const envVarValue = process.env[envVarName];
        console.log(
          `[DEBUG] Agent ${agentName}: Checking DISCORD_APPLICATION_ID (${envVarName}). Value: '${envVarValue}'`
        );
        // ---- END DEBUG ----
        if (!envVarValue) {
          missingVars.push(envVarName);
          discordConfigured = false;
        }
      } else {
        // If it's a direct value, it's already available
        logger.debug(`Agent "${agentName}" has direct Discord Application ID value`);
      }
    } else {
      logger.warn(`Agent "${agentName}" missing DISCORD_APPLICATION_ID configuration`);
      discordConfigured = false;
    }

    // Check for Discord API Token
    if (secrets.DISCORD_API_TOKEN) {
      // Check if it's an environment variable reference or direct value
      if (secrets.DISCORD_API_TOKEN.startsWith('process.env.')) {
        const envVarName = secrets.DISCORD_API_TOKEN.replace('process.env.', '');
        // ---- START DEBUG ----
        const envVarValue = process.env[envVarName];
        console.log(
          `[DEBUG] Agent ${agentName}: Checking DISCORD_API_TOKEN (${envVarName}). Value: '${envVarValue}'`
        );
        // ---- END DEBUG ----
        if (!envVarValue) {
          missingVars.push(envVarName);
          discordConfigured = false;
        }
      } else {
        // If it's a direct value, it's already available
        logger.debug(`Agent "${agentName}" has direct Discord API Token value`);
      }
    } else {
      logger.warn(`Agent "${agentName}" missing DISCORD_API_TOKEN configuration`);
      discordConfigured = false;
    }

    // If Discord is fully configured, mark that we have at least one required platform
    if (discordConfigured) {
      hasRequiredPlatform = true;
    }
  }

  // Check Telegram plugin requirements
  if (agent.character.plugins?.includes('@elizaos/plugin-telegram')) {
    checkingPlatforms = true;
    let telegramConfigured = true;

    // Check for Telegram Bot Token
    if (secrets.TELEGRAM_BOT_TOKEN) {
      // Check if it's an environment variable reference or direct value
      if (secrets.TELEGRAM_BOT_TOKEN.startsWith('process.env.')) {
        const envVarName = secrets.TELEGRAM_BOT_TOKEN.replace('process.env.', '');
        // ---- START DEBUG ----
        const envVarValue = process.env[envVarName];
        console.log(
          `[DEBUG] Agent ${agentName}: Checking TELEGRAM_BOT_TOKEN (${envVarName}). Value: '${envVarValue}'`
        );
        // ---- END DEBUG ----
        if (!envVarValue) {
          missingVars.push(envVarName);
          telegramConfigured = false;
        }
      } else {
        // If it's a direct value, it's already available
        logger.debug(`Agent "${agentName}" has direct Telegram Bot Token value`);
      }
    } else {
      logger.warn(`Agent "${agentName}" missing TELEGRAM_BOT_TOKEN configuration`);
      telegramConfigured = false;
    }

    // If Telegram is fully configured, mark that we have at least one required platform
    if (telegramConfigured) {
      hasRequiredPlatform = true;
    }
  }

  // If we weren't checking any communication platforms, let the agent pass
  // This handles agents that don't use Discord or Telegram
  if (!checkingPlatforms) {
    logger.info(`Agent "${agentName}" doesn't require Discord or Telegram configuration`);
    return true;
  }

  // If we checked platforms but none were properly configured, log the missing variables
  if (checkingPlatforms && !hasRequiredPlatform) {
    // ---- START DEBUG ----
    console.log(
      `[DEBUG] Agent ${agentName}: FAILED check. checkingPlatforms=${checkingPlatforms}, hasRequiredPlatform=${hasRequiredPlatform}, missingVars=${missingVars.join(', ')}`
    );
    // ---- END DEBUG ----
    if (missingVars.length > 0) {
      logger.warn(
        `Agent "${agentName}" disabled due to missing environment variables: ${missingVars.join(', ')}`
      );
    } else {
      logger.warn(`Agent "${agentName}" disabled due to incomplete configuration`);
    }
    return false;
  }

  // If at least one platform is configured, the agent can run
  // ---- START DEBUG ----
  console.log(`[DEBUG] Agent ${agentName}: PASSED check.`);
  // ---- END DEBUG ----
  logger.debug(`Agent "${agentName}" enabled with all required environment variables`);
  return true;
}

// Filter agents based on available environment variables
const allDefinedAgents = [
  ...vtuberTeam,
  devRel,
  communityManager,
  investmentManager,
  liaison,
  projectManager,
  socialMediaManager,
];

// ---- START DEBUG ----
console.log(
  '[DEBUG] allDefinedAgents contains (names):',
  allDefinedAgents.map((a) => {
    // Attempt to access name, handle potential variations in object structure
    if (a && typeof a === 'object') {
      if (
        'character' in a &&
        a.character &&
        typeof a.character === 'object' &&
        'name' in a.character
      ) {
        return a.character.name;
      } else if ('name' in a) {
        // Fallback if name is directly on the object (less likely for agents)
        return a.name;
      }
    }
    return 'InvalidOrUnknownAgentObject';
  })
);
// ---- END DEBUG ----

const availableAgents = allDefinedAgents.filter(hasRequiredEnvVars);

// Log the filtering results for clarity
const totalAgents = allDefinedAgents.length;
const filteredOutCount = totalAgents - availableAgents.length;
if (filteredOutCount > 0) {
  if (filteredOutCount === totalAgents) {
    console.log('NO AGENTS AVAILABLE - INITIALIZING DEFAULT ELIZA CHARACTER');
    logger.info(
      `To enable agents, configure the required platform integrations in your .env file.`
    );
  } else {
    logger.warn(
      `${filteredOutCount} out of ${totalAgents} agents were filtered out due to missing platform requirements.`
    );
  }
}

// After availableAgents computed, inject provider/action globally
availableAgents.forEach((ag: any) => {
  // Ensure provider/action arrays exist (used by docs tooling etc.)
  ag.providers = [...(ag.providers ?? []), scbProvider];
  ag.actions = [...(ag.actions ?? []), scbDirectiveAction];

  // --- Wrap original init so that runtime registers provider/action ---
  const originalInit = ag.init?.bind(ag);
  ag.init = async (runtime: any, ...args: any[]) => {
    // Register SCB bridge capabilities
    runtime.registerProvider(scbProvider);
    runtime.registerAction(scbDirectiveAction);

    // Call original init if it exists
    if (originalInit) {
      await originalInit(runtime, ...args);
    }
  };
});

export const project = {
  agents: availableAgents,
};

export default project;

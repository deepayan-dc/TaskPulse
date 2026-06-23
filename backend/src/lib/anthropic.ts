import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';

// Single shared Claude client. Null when no API key is configured, so callers
// can degrade gracefully instead of crashing.
export const anthropic = config.anthropicApiKey
  ? new Anthropic({ apiKey: config.anthropicApiKey })
  : null;

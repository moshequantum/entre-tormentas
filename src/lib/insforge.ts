import { createClient, createAdminClient, type InsForgeClient } from '@insforge/sdk';

const baseUrl = process.env.INSFORGE_BASE_URL || '';
const apiKey = process.env.INSFORGE_API_KEY || '';
const serviceKey = process.env.INSFORGE_SERVICE_KEY || process.env.INSFORGE_SERVICE_ROLE_KEY || '';

export function getInsForgeClient(): InsForgeClient | null {
  if (!baseUrl || !apiKey) {
    return null;
  }
  return createClient({
    baseUrl,
    apiKey,
  });
}

export function getInsForgeAdminClient(): InsForgeClient | null {
  if (!baseUrl || !serviceKey) {
    return null;
  }
  return createAdminClient({
    baseUrl,
    serviceRoleKey: serviceKey,
  });
}

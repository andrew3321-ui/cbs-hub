import { env } from 'cloudflare:workers';
import { withApiTelemetry } from '../../../api-infrastructure';
import { receiveGitHubWebhook } from '../../../github-webhook-service';
import type { GitHubEnv } from '../../../github-client';
export const POST = withApiTelemetry('/api/github/webhook', request => receiveGitHubWebhook(env as unknown as GitHubEnv, request));

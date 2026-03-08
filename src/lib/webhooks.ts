import { createServiceRoleClient } from './supabase/server';

interface WebhookConfig {
  id: string;
  url: string;
  events: string[];
  active: boolean;
}

export async function fireWebhooks(
  organizationId: string,
  event: string,
  payload: Record<string, unknown>
) {
  try {
    const supabase = await createServiceRoleClient();
    const { data: org } = await supabase
      .from('organizations')
      .select('settings')
      .eq('id', organizationId)
      .single();

    const settings = (org?.settings || {}) as Record<string, unknown>;
    const webhooks = ((settings.webhooks || []) as WebhookConfig[])
      .filter((w) => w.active && w.events.includes(event));

    if (webhooks.length === 0) return;

    const promises = webhooks.map(async (webhook) => {
      try {
        await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Event': event,
            'X-Webhook-Id': webhook.id,
          },
          body: JSON.stringify({
            event,
            timestamp: new Date().toISOString(),
            data: payload,
          }),
          signal: AbortSignal.timeout(10000),
        });
      } catch (err) {
        console.error(`Webhook ${webhook.url} failed:`, err);
      }
    });

    await Promise.allSettled(promises);
  } catch (err) {
    console.error('Fire webhooks error:', err);
  }
}

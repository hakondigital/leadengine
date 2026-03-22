import { NextResponse, type NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { message_body, client_name, org_name, service_type, context } =
      await request.json();

    if (!message_body || !client_name || !org_name) {
      return NextResponse.json(
        { error: 'message_body, client_name, and org_name are required' },
        { status: 400 }
      );
    }

    const systemPrompt =
      'You are a professional business assistant. Draft a short, friendly reply to this customer message. Keep it under 3 sentences. Be helpful and professional. Sign off with the business name.';

    const userPrompt = [
      `Business name: ${org_name}`,
      `Customer name: ${client_name}`,
      service_type ? `Service type: ${service_type}` : null,
      context ? `Additional context: ${context}` : null,
      '',
      `Customer message:`,
      `"${message_body}"`,
      '',
      'Draft a reply:',
    ]
      .filter(Boolean)
      .join('\n');

    // Try Anthropic first
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (anthropicKey) {
      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 300,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }],
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const draft = data.content?.[0]?.text?.trim();
          if (draft) {
            return NextResponse.json({ draft });
          }
        }
      } catch (e) {
        console.warn('Anthropic draft-reply failed, falling back to OpenAI:', e);
      }
    }

    // Fallback to OpenAI
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            max_tokens: 300,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const draft = data.choices?.[0]?.message?.content?.trim();
          if (draft) {
            return NextResponse.json({ draft });
          }
        }
      } catch (e) {
        console.warn('OpenAI draft-reply failed:', e);
      }
    }

    return NextResponse.json(
      { error: 'No AI provider available' },
      { status: 503 }
    );
  } catch (err) {
    console.error('Draft reply error:', err);
    return NextResponse.json(
      { error: 'Failed to generate draft reply' },
      { status: 500 }
    );
  }
}

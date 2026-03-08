import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

// Called internally when a Telnyx call recording is ready.
// Downloads the recording, transcribes via Whisper, summarizes via GPT,
// and saves everything to the call_logs table.
export async function POST(request: NextRequest) {
  try {
    const { recording_url, call_log_id } = await request.json();

    if (!recording_url || !call_log_id) {
      return NextResponse.json({ error: 'Missing recording_url or call_log_id' }, { status: 400 });
    }

    const supabase = await createServiceRoleClient();

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      console.warn('OpenAI API key not configured — skipping transcription');
      return NextResponse.json({ status: 'skipped', reason: 'no_openai_key' });
    }

    // Download the recording (Telnyx recordings use signed URLs — no extra auth needed)
    const audioResponse = await fetch(recording_url);

    if (!audioResponse.ok) {
      console.error('Failed to download recording:', audioResponse.status);
      return NextResponse.json({ status: 'download_failed' });
    }

    const audioBuffer = await audioResponse.arrayBuffer();

    // Step 1: Transcribe with Whisper
    const whisperForm = new FormData();
    whisperForm.append('file', new Blob([audioBuffer], { type: 'audio/wav' }), 'recording.wav');
    whisperForm.append('model', 'whisper-1');
    whisperForm.append('language', 'en');

    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openaiKey}` },
      body: whisperForm,
    });

    if (!whisperResponse.ok) {
      console.error('Whisper transcription failed:', whisperResponse.status);
      return NextResponse.json({ status: 'whisper_failed' });
    }

    const whisperData = await whisperResponse.json();
    const transcript = whisperData.text || '';

    // Step 2: Summarize with GPT
    let summary = '';
    if (transcript.length > 20) {
      const summaryResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are an AI assistant for a service business. Summarize this phone call transcript into a structured brief. Include:
- **Caller Intent**: What the caller wants (1 sentence)
- **Key Details**: Address, service type, budget, timeline, specific requirements (bullet points)
- **Action Items**: What needs to happen next (bullet points)
- **Lead Quality**: Hot / Warm / Cold based on urgency and intent

Keep it concise and actionable. If the call is very short or unclear, note that.`,
            },
            {
              role: 'user',
              content: `Phone call transcript:\n\n${transcript}`,
            },
          ],
          max_tokens: 500,
          temperature: 0.3,
        }),
      });

      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        summary = summaryData.choices?.[0]?.message?.content || '';
      }
    }

    // Save transcript and summary to the call log
    await supabase
      .from('call_logs')
      .update({
        transcript,
        ai_summary: summary,
        transcribed_at: new Date().toISOString(),
      })
      .eq('id', call_log_id);

    return NextResponse.json({
      status: 'success',
      call_log_id,
      transcript_length: transcript.length,
      has_summary: !!summary,
    });
  } catch (error) {
    console.error('Recording callback error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

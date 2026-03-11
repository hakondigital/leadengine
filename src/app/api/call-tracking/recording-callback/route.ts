import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

// Called by Twilio when a call recording is ready, or internally.
// Downloads the recording, transcribes via Whisper, summarizes via GPT,
// and saves everything to the call_logs table.
export async function POST(request: NextRequest) {
  try {
    // Twilio sends form-encoded data; internal calls send JSON
    let recordingUrl = '';
    let callLogId = '';
    let callSid = '';

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('form')) {
      const formData = await request.formData();
      const recordingSid = formData.get('RecordingSid') as string;
      callSid = formData.get('CallSid') as string;
      recordingUrl = formData.get('RecordingUrl') as string;
      // Twilio RecordingUrl doesn't include format — append .wav
      if (recordingUrl && !recordingUrl.endsWith('.wav')) {
        recordingUrl += '.wav';
      }
    } else {
      const body = await request.json();
      recordingUrl = body.recording_url;
      callLogId = body.call_log_id;
    }

    if (!recordingUrl) {
      return NextResponse.json({ error: 'Missing recording URL' }, { status: 400 });
    }

    const supabase = await createServiceRoleClient();

    // If we got a CallSid from Twilio (not a direct call_log_id), look up the call log
    if (!callLogId && callSid) {
      const { data: log } = await supabase
        .from('call_logs')
        .select('id')
        .eq('provider_sid', callSid)
        .single();
      callLogId = log?.id || '';
    }

    if (!callLogId) {
      return NextResponse.json({ error: 'Could not find call log' }, { status: 404 });
    }

    // Update the call log with the recording URL immediately
    await supabase
      .from('call_logs')
      .update({ recording_url: recordingUrl })
      .eq('id', callLogId);

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      console.warn('OpenAI API key not configured — skipping transcription');
      return NextResponse.json({ status: 'skipped', reason: 'no_openai_key' });
    }

    // Download the recording (Twilio recordings need Basic Auth)
    const twilioAuth = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
      ? 'Basic ' + Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')
      : '';
    const audioResponse = await fetch(recordingUrl, {
      headers: twilioAuth ? { Authorization: twilioAuth } : {},
    });

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
      .eq('id', callLogId);

    return NextResponse.json({
      status: 'success',
      call_log_id: callLogId,
      transcript_length: transcript.length,
      has_summary: !!summary,
    });
  } catch (error) {
    console.error('Recording callback error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

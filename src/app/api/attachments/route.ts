import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServiceRoleClient();
    const { searchParams } = new URL(request.url);

    const leadId = searchParams.get('lead_id');

    if (!leadId) {
      return NextResponse.json({ error: 'lead_id required' }, { status: 400 });
    }

    const { data: attachments, error } = await supabase
      .from('attachments')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Attachments fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch attachments' }, { status: 500 });
    }

    return NextResponse.json({ attachments });
  } catch (error) {
    console.error('Attachments fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const file = formData.get('file') as File | null;
    const leadId = formData.get('lead_id') as string | null;
    const organizationId = formData.get('organization_id') as string | null;
    const description = formData.get('description') as string | null;
    const analyzeWithAI = formData.get('analyze_with_ai') === 'true';

    if (!file || !leadId || !organizationId) {
      return NextResponse.json(
        { error: 'file, lead_id, and organization_id required' },
        { status: 400 }
      );
    }

    const supabase = await createServiceRoleClient();

    // Upload file to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${organizationId}/${leadId}/${Date.now()}.${fileExt}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from('attachments')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('File upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('attachments')
      .getPublicUrl(fileName);

    const fileUrl = urlData.publicUrl;
    let aiAnalysis = null;

    // AI analysis for images
    if (analyzeWithAI && file.type.startsWith('image/')) {
      aiAnalysis = `Image uploaded: ${file.name}. File size: ${(file.size / 1024).toFixed(1)}KB. Type: ${file.type}.`;
    }

    // Save attachment record
    const { data: attachment, error: insertError } = await supabase
      .from('attachments')
      .insert({
        lead_id: leadId,
        organization_id: organizationId,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        file_url: fileUrl,
        description: description || null,
        ai_analysis: aiAnalysis,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Attachment record error:', insertError);
      return NextResponse.json({ error: 'Failed to save attachment record' }, { status: 500 });
    }

    return NextResponse.json(attachment, { status: 201 });
  } catch (error) {
    console.error('Attachment upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

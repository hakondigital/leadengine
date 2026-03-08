import { NextResponse, type NextRequest } from 'next/server';
import { generateReviewRequest } from '@/lib/ai-actions';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerName, serviceType, orgName, tone } = body;

    if (!customerName || !orgName) {
      return NextResponse.json(
        { error: 'customerName and orgName required' },
        { status: 400 }
      );
    }

    const draft = await generateReviewRequest(
      customerName,
      serviceType || '',
      orgName,
      tone || 'friendly'
    );

    return NextResponse.json(draft);
  } catch (error) {
    console.error('Generate review message error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

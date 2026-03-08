import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServiceRoleClient();
    const { searchParams } = new URL(request.url);

    const orgId = searchParams.get('organization_id');
    const serviceType = searchParams.get('service_type');

    if (!orgId) {
      return NextResponse.json({ error: 'organization_id required' }, { status: 400 });
    }

    // If service_type provided, calculate estimate
    if (serviceType) {
      const { data: config, error } = await supabase
        .from('estimator_configs')
        .select('*')
        .eq('organization_id', orgId)
        .eq('service_type', serviceType)
        .single();

      if (error || !config) {
        return NextResponse.json(
          { error: 'No estimator config found for this service type' },
          { status: 404 }
        );
      }

      // Parse query params for estimate calculation
      const quantity = parseFloat(searchParams.get('quantity') || '1');
      const complexity = searchParams.get('complexity') || 'standard'; // basic, standard, premium

      const complexityMultiplier: Record<string, number> = {
        basic: 0.8,
        standard: 1.0,
        premium: 1.5,
        complex: 2.0,
      };

      const multiplier = complexityMultiplier[complexity] || 1.0;
      const basePrice = config.base_price || 0;
      const perUnitPrice = config.per_unit_price || 0;

      const estimate = {
        service_type: serviceType,
        base_price: basePrice,
        per_unit_price: perUnitPrice,
        quantity,
        complexity,
        multiplier,
        subtotal: (basePrice + perUnitPrice * quantity) * multiplier,
        low_estimate: Math.round((basePrice + perUnitPrice * quantity) * multiplier * 0.85),
        high_estimate: Math.round((basePrice + perUnitPrice * quantity) * multiplier * 1.2),
        unit_label: config.unit_label || 'units',
        notes: config.notes || null,
        disclaimer: config.disclaimer || 'This is an estimate only. Final pricing may vary.',
      };

      return NextResponse.json(estimate);
    }

    // Otherwise, list all configs
    const { data: configs, error } = await supabase
      .from('estimator_configs')
      .select('*')
      .eq('organization_id', orgId)
      .order('service_type', { ascending: true });

    if (error) {
      console.error('Estimator configs fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch estimator configs' }, { status: 500 });
    }

    return NextResponse.json({ configs });
  } catch (error) {
    console.error('Estimator fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      organization_id,
      service_type,
      base_price,
      per_unit_price,
      unit_label,
      notes,
      disclaimer,
      options,
    } = body;

    if (!organization_id || !service_type) {
      return NextResponse.json(
        { error: 'organization_id and service_type required' },
        { status: 400 }
      );
    }

    const supabase = await createServiceRoleClient();

    const { data: config, error } = await supabase
      .from('estimator_configs')
      .upsert({
        organization_id,
        service_type,
        base_price: base_price || 0,
        per_unit_price: per_unit_price || 0,
        unit_label: unit_label || 'units',
        notes: notes || null,
        disclaimer: disclaimer || 'This is an estimate only. Final pricing may vary.',
        options: options || [],
      }, { onConflict: 'organization_id,service_type' })
      .select()
      .single();

    if (error) {
      console.error('Estimator config save error:', error);
      return NextResponse.json({ error: 'Failed to save estimator config' }, { status: 500 });
    }

    return NextResponse.json(config, { status: 201 });
  } catch (error) {
    console.error('Estimator config save error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

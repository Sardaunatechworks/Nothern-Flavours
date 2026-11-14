// Supabase Edge Function: generate-report
// Purpose: Authenticated financial and sales report aggregation

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const body = await req.json();
    const { start_date, end_date } = body;

    const [salesSummary, bestSellers, valuation] = await Promise.all([
      supabase.rpc('get_sales_summary', {
        p_start_date: start_date || new Date(Date.now() - 30 * 86400000).toISOString(),
        p_end_date: end_date || new Date().toISOString(),
      }),
      supabase.rpc('get_best_selling_products', { p_limit: 10 }),
      supabase.rpc('get_inventory_valuation'),
    ]);

    if (salesSummary.error) throw salesSummary.error;
    if (bestSellers.error) throw bestSellers.error;
    if (valuation.error) throw valuation.error;

    return new Response(
      JSON.stringify({
        success: true,
        sales_summary: salesSummary.data,
        best_sellers: bestSellers.data,
        valuation: valuation.data,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error generating report' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});


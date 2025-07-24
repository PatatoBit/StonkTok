// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from '../_shared/cors.ts'

console.info('Listening to investments!');

// Start Supabase Edge Function
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: {
        ...corsHeaders,
      },
    });
  }

  try {
    const { videoUrl, amount } = await req.json();
    console.log('Received investment request:');
    console.log('Video URL:', videoUrl);
    console.log('Amount:', amount);

    return new Response(JSON.stringify({
      message: 'Logged investment data',
      videoUrl,
      amount
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Origin': '*',
      }
    });
  } catch (err) {
    console.error('Error parsing request:', err);
    return new Response('Invalid JSON', {
      status: 400,
      headers: {
        ...corsHeaders,
      },
    });
  }
});

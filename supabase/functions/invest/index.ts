// Setup type definitions for built-in Supabase Runtime APIs
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
console.info('🧠 Listening to investments!');
Deno.serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
      }
    });
  }
  if (req.method !== 'POST') {
    console.error('Method Not Allowed:', req.method);
    return new Response('Method Not Allowed', {
      status: 405,
      headers: corsHeaders
    });
  }
  const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_ANON_KEY'), {
    global: {
      headers: {
        Authorization: req.headers.get('Authorization')
      }
    }
  });
  let videoUrl, amount;
  try {
    const body = await req.json();
    videoUrl = body.videoUrl;
    amount = body.amount;
  } catch (err) {
    console.error('Invalid JSON body:', err);
    return new Response('Invalid JSON body', {
      status: 400,
      headers: corsHeaders
    });
  }
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');
  const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !user) {
    console.error('Unauthorized access attempt:', userErr?.message || 'No user');
    return new Response('Unauthorized', {
      status: 401,
      headers: corsHeaders
    });
  }
  // Normalize URL
  let url;
  try {
    url = new URL(videoUrl);
    url.search = '';
  } catch (err) {
    console.error('Invalid videoUrl format:', videoUrl, err);
    return new Response('Invalid video URL format', {
      status: 400,
      headers: corsHeaders
    });
  }
  const cleanVideoUrl = url.toString();
  let platform = null;
  if (url.hostname.includes('tiktok.com')) platform = 'tiktok';
  else if (url.hostname.includes('instagram.com')) platform = 'instagram';
  else {
    console.error('Unsupported platform:', url.hostname);
    return new Response('Unsupported platform', {
      status: 400,
      headers: corsHeaders
    });
  }
  let video;
  let { data: lookupData, error: lookupErr } = await supabase.from('videos').select('*').eq('video_url', cleanVideoUrl).single();
  if (lookupErr?.code === 'PGRST116') {
    const createVideoCall = await supabase.functions.invoke('register-video', {
      body: {
        videoUrl: cleanVideoUrl,
        platform
      }
    });
    if (createVideoCall.error) {
      console.error('Video creation failed:', createVideoCall.error);
      return new Response(JSON.stringify({
        message: 'Video creation failed',
        error: createVideoCall.error
      }), {
        status: 500,
        headers: corsHeaders
      });
    }
    console.log('Raw createVideoCall.data:', createVideoCall.data);
    // Re-fetch the video (safe fallback)
    const refetch = await supabase.from('videos').select('*').eq('video_url', cleanVideoUrl).single();
    if (refetch.error) {
      console.error('Video re-fetch failed:', refetch.error);
      return new Response(JSON.stringify({
        message: 'Video re-fetch failed after creation',
        error: refetch.error
      }), {
        status: 500,
        headers: corsHeaders
      });
    }
    video = refetch.data;
  } else if (lookupErr) {
    console.error('Video lookup failed:', lookupErr.message);
    return new Response(JSON.stringify({
      message: 'Video lookup failed',
      error: lookupErr.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  } else {
    video = lookupData;
  }
  if (!video || typeof video.id !== 'string') {
    console.error('Video not available or id is invalid after creation.');
    return new Response(JSON.stringify({
      message: 'Video not available or id is invalid after creation.'
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
  const investRes = await supabase.from('investments').insert({
    user_id: user.id,
    video_id: video.id,
    amount,
    like_count_at_investment: video.current_likes,
    comment_count_at_investment: video.current_comments
  });
  if (investRes.error) {
    console.error('Investment insertion failed:', investRes.error);
    return new Response(JSON.stringify(investRes.error), {
      status: 500,
      headers: corsHeaders
    });
  }
  return new Response(JSON.stringify({
    message: 'Investment successful',
    videoId: video.id,
    userId: user.id,
    amount
  }), {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
});

// supabase/functions/tiktok-scraper/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
serve(async (req)=>{
  const { videoUrl } = await req.json();
  const apiToken = Deno.env.get('APIFY_TOKEN');
  if (!videoUrl || !apiToken) {
    return new Response(JSON.stringify({
      error: 'Missing videoUrl or API token'
    }), {
      status: 400
    });
  }
  // 1. Start the actor run
  const inputPayload = {
    postURLs: [
      videoUrl
    ],
    scrapeRelatedVideos: false,
    resultsPerPage: 100,
    shouldDownloadVideos: false,
    shouldDownloadCovers: false,
    shouldDownloadSubtitles: false,
    shouldDownloadSlideshowImages: false
  };
  const startRunRes = await fetch('https://api.apify.com/v2/acts/S5h7zRLfKFEr8pdj7/runs', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(inputPayload)
  });
  if (!startRunRes.ok) {
    const err = await startRunRes.text();
    return new Response(JSON.stringify({
      error: 'Failed to start Apify run',
      details: err
    }), {
      status: 500
    });
  }
  const run = await startRunRes.json();
  const runId = run.data.id;
  const datasetId = run.data.defaultDatasetId;
  // 2. Poll run status (up to 30s)
  let status = run.data.status;
  const maxTries = 15;
  let tries = 0;
  while((status === 'READY' || status === 'RUNNING') && tries < maxTries){
    await new Promise((res)=>setTimeout(res, 2000)); // 2 sec delay
    const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}`, {
      headers: {
        'Authorization': `Bearer ${apiToken}`
      }
    });
    const statusData = await statusRes.json();
    status = statusData.data.status;
    tries++;
  }
  if (status !== 'SUCCEEDED') {
    return new Response(JSON.stringify({
      error: 'Apify run did not complete in time',
      status
    }), {
      status: 504
    });
  }
  // 3. Fetch dataset results
  const datasetRes = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?format=json`, {
    headers: {
      'Authorization': `Bearer ${apiToken}`
    }
  });
  if (!datasetRes.ok) {
    const err = await datasetRes.text();
    return new Response(JSON.stringify({
      error: 'Failed to fetch Apify dataset',
      details: err
    }), {
      status: 500
    });
  }
  const items = await datasetRes.json();
  return new Response(JSON.stringify({
    items
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
});

#!/usr/bin/env node
/*
  Simple smoke test for deployed WhatsApp Scheduler Backend.
  Usage:
    node scripts/smoke-test.mjs https://your-service.onrender.com [API_KEY]
*/
import https from 'https';
import http from 'http';

const baseUrl = process.argv[2];
if(!baseUrl){
  console.error('Base URL required. Example: node scripts/smoke-test.mjs https://your-service.onrender.com MY_API_KEY');
  process.exit(1);
}
const apiKey = process.argv[3];

function request(method, path, {body, headers} = {}){
  return new Promise((resolve, reject)=>{
    const url = new URL(path, baseUrl);
    const lib = url.protocol === 'https:' ? https : http;
    const data = body ? JSON.stringify(body) : undefined;
    const req = lib.request(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? {'X-API-Key': apiKey}: {}),
        ...(data ? {'Content-Length': Buffer.byteLength(data)}: {}),
        ...headers
      }
    }, (res)=>{
      let chunks='';
      res.on('data', d=> chunks += d);
      res.on('end', ()=>{
        try {
          const json = JSON.parse(chunks || '{}');
          resolve({status: res.statusCode, json});
        } catch(e){
          resolve({status: res.statusCode, raw: chunks});
        }
      });
    });
    req.on('error', reject);
    if(data) req.write(data);
    req.end();
  });
}

const results = [];

async function run(){
  console.log('Running smoke tests against', baseUrl);
  // Public endpoints
  results.push(['GET /healthz', await request('GET','/healthz')]);
  results.push(['GET /health', await request('GET','/health')]);
  results.push(['GET /docs', await request('GET','/docs')]);
  results.push(['GET /webhook/health', await request('GET','/webhook/health')]);
  results.push(['GET /webhook/info', await request('GET','/webhook/info')]);

  // Private-ish endpoints (auth currently permissive). Include API key if provided
  results.push(['GET /api/v1/wasender/health', await request('GET','/api/v1/wasender/health')]);
  results.push(['GET /api/v1/wasender/validate-config', await request('GET','/api/v1/wasender/validate-config')]);
  results.push(['GET /api/v1/wasender/stats', await request('GET','/api/v1/wasender/stats')]);

  // Attempt listing schedules (will fail gracefully if Cronhooks disabled)
  results.push(['GET /api/v1/messages/schedules', await request('GET','/api/v1/messages/schedules?skip=0&limit=5')]);

  const table = results.map(([name,res])=>({
    endpoint: name,
    status: res.status,
    success: !!res.json?.success,
    message: res.json?.message || res.json?.error || '-'
  }));
  console.table(table);

  const failing = table.filter(r=> r.status >= 500);
  if(failing.length){
    console.error('Some endpoints failed with 5xx');
    process.exit(1);
  }
  console.log('Smoke test completed');
}

run().catch(err=>{ console.error('Smoke test error', err); process.exit(1); });

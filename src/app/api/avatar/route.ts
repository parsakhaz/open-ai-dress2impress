import { NextRequest } from 'next/server';
export const runtime = 'nodejs';
export const maxDuration = 600;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com';

const AVATAR_PROMPT = `ROLE
You are a photo-editing AI. Transform the provided face photo into a single, full-body fashion model avatar.

REQUIREMENTS
1) Preserve the person’s facial likeness.
2) Full-body, neutral forward-facing standing pose.
3) Background: plain white seamless studio (#FFFFFF).
4) Attire: simple, form-fitting, plain grey basics (tank top + leggings).
5) Photorealistic, well-lit, high-resolution output.`;

async function inputToBlob(imageInput: string): Promise<Blob> {
  if (imageInput.startsWith('data:')) {
    const match = imageInput.match(/^data:(.*?);base64,(.*)$/);
    if (!match) throw new Error('Invalid data URL');
    const mime = match[1];
    const b64 = match[2];
    const buffer = Buffer.from(b64, 'base64');
    return new Blob([buffer], { type: mime });
  }
  const res = await fetch(imageInput);
  const ab = await res.arrayBuffer();
  return new Blob([ab], { type: res.headers.get('content-type') || 'image/jpeg' });
}

async function callOpenAIWithBlob(imageBlob: Blob): Promise<string> {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set');
  const fd = new FormData();
  fd.append('model', 'gpt-image-1');
  fd.append('prompt', AVATAR_PROMPT);
  fd.append('size', '1024x1024');
  fd.append('n', '1');
  fd.append('response_format', 'b64_json');
  fd.append('image', imageBlob, 'input.jpg');
  const res = await fetch(`${OPENAI_BASE_URL}/v1/images/edits`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: fd,
    // don't set Content-Type; fetch sets it with boundary
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI error: ${res.status} ${text}`);
  }
  const data = (await res.json()) as { data?: { b64_json?: string }[] };
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) throw new Error('No image data returned');
  return `data:image/png;base64,${b64}`;
}

export async function POST(req: NextRequest) {
  console.log('🎯 AVATAR API: Starting avatar generation request');
  const startTime = performance.now();
  
  try {
    // Environment validation
    if (!OPENAI_API_KEY) {
      console.error('❌ AVATAR API: OPENAI_API_KEY not set');
      return new Response('OpenAI API key not configured', { status: 500 });
    }

    console.log('✅ AVATAR API: Environment validated');

    // Parse request
    const { imageDataUrl } = (await req.json()) as { imageDataUrl: string };
    console.log('📥 AVATAR API: Request parsed', { 
      hasImageData: !!imageDataUrl, 
      dataUrlLength: imageDataUrl?.length 
    });

    if (!imageDataUrl) {
      console.error('❌ AVATAR API: Missing imageDataUrl in request');
      return new Response('Missing imageDataUrl', { status: 400 });
    }

    // Convert image to blob
    console.log('🔄 AVATAR API: Converting image data to blob');
    const blobStartTime = performance.now();
    const blob = await inputToBlob(imageDataUrl);
    const blobDuration = performance.now() - blobStartTime;
    console.log('✅ AVATAR API: Blob conversion completed', { 
      blobSize: blob.size, 
      blobType: blob.type, 
      duration: `${blobDuration.toFixed(2)}ms` 
    });

    // Make parallel OpenAI calls
    console.log('🤖 AVATAR API: Starting 4 parallel OpenAI calls');
    const openaiStartTime = performance.now();
    const calls = [
      callOpenAIWithBlob(blob), 
      callOpenAIWithBlob(blob), 
      callOpenAIWithBlob(blob), 
      callOpenAIWithBlob(blob)
    ];
    
    const images = await Promise.all(calls);
    const openaiDuration = performance.now() - openaiStartTime;
    
    console.log('✅ AVATAR API: OpenAI calls completed', { 
      imageCount: images.length, 
      duration: `${openaiDuration.toFixed(2)}ms` 
    });

    const totalDuration = performance.now() - startTime;
    console.log('🎉 AVATAR API: Request completed successfully', { 
      totalDuration: `${totalDuration.toFixed(2)}ms`,
      imagesGenerated: images.length 
    });

    return Response.json({ images });
  } catch (e) {
    const totalDuration = performance.now() - startTime;
    const error = e instanceof Error ? e : new Error('Unknown error');
    
    console.error('💥 AVATAR API: Request failed', {
      error: error.message,
      stack: error.stack,
      duration: `${totalDuration.toFixed(2)}ms`
    });

    // More specific error handling
    if (error.message.includes('OpenAI error')) {
      console.error('🤖 AVATAR API: OpenAI API error', { 
        message: error.message,
        suggestion: 'Check API key validity and OpenAI service status' 
      });
    } else if (error.message.includes('Invalid data URL')) {
      console.error('📷 AVATAR API: Invalid image data', { 
        message: error.message,
        suggestion: 'Check webcam image format and data URL encoding' 
      });
    }

    const message = error.message;
    return new Response(message, { status: 500 });
  }
}



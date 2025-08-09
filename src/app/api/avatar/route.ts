import { NextRequest } from 'next/server';
export const runtime = 'nodejs';
export const maxDuration = 600;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com';

const AVATAR_PROMPT = `Transform this person as a character in the exact stylized 3D art style of The Sims 4 by Electronic Arts, amazing outfit, colorful, low-poly look with clean sharp edges and bright textures, highly detailed and well-defined facial features faithful to Sims 4 models, full body, standing pose, smiling facial expression, with his eyes seeing up, casual varied clothing, isolated on plain white background with soft shadows, clean render, perfect for Photoshop cutout and composition`;

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

async function callOpenAIWithBlob(imageBlob: Blob, variantIndex: number = 0): Promise<string> {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set');
  
  // Add variation to the prompt for different styles
  const styleVariations = [
    'with trendy casual clothing',
    'with stylish streetwear outfit', 
    'with colorful fashionable attire',
    'with modern chic clothing'
  ];
  
  const variantPrompt = `${AVATAR_PROMPT}, ${styleVariations[variantIndex % styleVariations.length]}`;
  
  const fd = new FormData();
  fd.append('model', 'gpt-image-1');
  fd.append('prompt', variantPrompt);
  fd.append('size', '1024x1024');
  fd.append('n', '1');
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
  const data = (await res.json()) as { data?: { b64_json?: string; url?: string }[] };
  const first = data?.data?.[0];
  const image = first?.b64_json ? `data:image/png;base64,${first.b64_json}` : first?.url;
  if (!image) throw new Error('No image data returned');
  return image;
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

    // Make parallel OpenAI calls with different style variations
    console.log('🤖 AVATAR API: Starting 4 parallel OpenAI calls with style variations');
    const openaiStartTime = performance.now();
    const calls = [
      callOpenAIWithBlob(blob, 0), 
      callOpenAIWithBlob(blob, 1), 
      callOpenAIWithBlob(blob, 2), 
      callOpenAIWithBlob(blob, 3)
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



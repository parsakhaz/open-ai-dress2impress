// OpenAI Images Edits adapter for avatar generation

export async function generateAvatarFromSelfie(selfieImageUrl: string): Promise<string[]> {
  console.log('👤 AVATAR ADAPTER: Starting avatar generation');
  console.log('📊 AVATAR ADAPTER: Input data', { 
    dataUrlLength: selfieImageUrl.length,
    dataUrlPrefix: selfieImageUrl.substring(0, 50) + '...' 
  });

  const startTime = performance.now();

  try {
    console.log('🌐 AVATAR ADAPTER: Sending request to /api/avatar');
    
    const res = await fetch('/api/avatar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageDataUrl: selfieImageUrl }),
    });

    const duration = performance.now() - startTime;
    console.log('📡 AVATAR ADAPTER: API response received', { 
      status: res.status, 
      statusText: res.statusText,
      duration: `${duration.toFixed(2)}ms`
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('❌ AVATAR ADAPTER: API request failed', {
        status: res.status,
        statusText: res.statusText,
        errorText,
        duration: `${duration.toFixed(2)}ms`
      });
      throw new Error(`Avatar API failed: ${res.status} ${errorText}`);
    }

    const data = (await res.json()) as { images: string[] };
    console.log('✅ AVATAR ADAPTER: Successfully generated avatars', { 
      imageCount: data.images.length,
      totalDuration: `${duration.toFixed(2)}ms`
    });

    // Log first few characters of each image for debugging
    data.images.forEach((img, index) => {
      console.log(`🖼️ AVATAR ADAPTER: Image ${index + 1} preview`, {
        length: img.length,
        prefix: img.substring(0, 50) + '...'
      });
    });

    return data.images;
  } catch (error) {
    const duration = performance.now() - startTime;
    const err = error instanceof Error ? error : new Error('Unknown error');
    
    console.error('💥 AVATAR ADAPTER: Avatar generation failed', {
      error: err.message,
      stack: err.stack,
      duration: `${duration.toFixed(2)}ms`
    });

    // Re-throw with additional context
    throw new Error(`Avatar generation failed: ${err.message}`);
  }
}



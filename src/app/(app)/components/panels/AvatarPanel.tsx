"use client";
import Webcam from 'react-webcam';
import { useCallback, useRef, useState } from 'react';
import { generateAvatarFromSelfie } from '@/lib/adapters/avatar';
import { useGameStore } from '@/lib/state/gameStore';
import { GlassPanel } from '@/components/GlassPanel';
import { GlassButton } from '@/components/GlassButton';
import type { Character } from '@/types';

export default function AvatarPanel() {
  const webcamRef = useRef<Webcam>(null);
  const [variants, setVariants] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setCharacter = useGameStore((s) => s.setCharacter);
  const setCurrentImage = useGameStore((s) => s.setCurrentImage);
  const setPhase = useGameStore((s) => s.setPhase);

  const capture = useCallback(async () => {
    console.log('📷 AVATAR PANEL: Capture button clicked');
    
    const imageSrc = webcamRef.current?.getScreenshot();
    if (!imageSrc) {
      console.error('❌ AVATAR PANEL: Failed to capture image from webcam');
      setError('Failed to capture image from webcam. Please ensure your camera is working.');
      return;
    }

    console.log('✅ AVATAR PANEL: Image captured from webcam', {
      dataLength: imageSrc.length,
      format: imageSrc.substring(0, imageSrc.indexOf(';'))
    });

    console.log('🔄 AVATAR PANEL: Starting avatar generation process');
    setLoading(true);
    setError(null);
    
    const startTime = performance.now();
    
    try {
      console.log('👤 AVATAR PANEL: Calling generateAvatarFromSelfie');
      const urls = await generateAvatarFromSelfie(imageSrc);
      
      const duration = performance.now() - startTime;
      console.log('🎉 AVATAR PANEL: Avatar generation completed successfully', {
        avatarCount: urls.length,
        duration: `${duration.toFixed(2)}ms`
      });
      
      setVariants(urls);
      
      // Log to AI console for user visibility
      // logAIEvent({ type: 'tool_call', content: `Generated ${urls.length} avatar variants`, timestamp: Date.now() });
      
    } catch (e: unknown) {
      const duration = performance.now() - startTime;
      const error = e instanceof Error ? e : new Error('Unknown error');
      
      console.error('💥 AVATAR PANEL: Avatar generation failed', {
        error: error.message,
        duration: `${duration.toFixed(2)}ms`
      });
      
      setError(error.message);
      
      // Log to AI console for user visibility
      // logAIEvent({ type: 'tool_call', content: `Avatar generation failed: ${error.message}`, timestamp: Date.now() });
    } finally {
      setLoading(false);
    }
  }, []);

  function choose(url: string) {
    console.log('✅ AVATAR PANEL: User selected avatar', { avatarUrl: url.substring(0, 50) + '...' });
    
    const c: Character = { id: `char-${Date.now()}`, avatarUrl: url };
    setCharacter(c);
    setCurrentImage(url);
    
    console.log('🔄 AVATAR PANEL: Transitioning to Shopping phase');
    setPhase('ShoppingSpree');
    
    console.log('🎯 PHASE TRANSITION: CharacterSelect → ShoppingSpree');
  }

  return (
    <GlassPanel>
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Create Your Avatar</h3>
        
        <div className="space-y-3">
          <div className="relative rounded-xl overflow-hidden bg-black/5 dark:bg-white/5">
            <Webcam 
              audio={false} 
              ref={webcamRef} 
              screenshotFormat="image/jpeg" 
              className="w-full aspect-[4/3] object-cover" 
            />
          </div>
          
          <GlassButton 
            variant="primary" 
            className="w-full"
            onClick={capture} 
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating Avatars…
              </span>
            ) : (
              'Capture & Generate Avatars'
            )}
          </GlassButton>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-sm">
            {error}
          </div>
        )}

        {variants.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-slate-900 dark:text-slate-100">Choose Your Avatar</h4>
            <div className="grid grid-cols-2 gap-3">
              {variants.map((u, i) => (
                <div key={i} className="group relative rounded-lg overflow-hidden bg-white/20 dark:bg-black/20 backdrop-blur-sm border border-white/30 dark:border-white/10 hover:border-accent/50 transition-colors">
                  <img src={u} alt={`Avatar option ${i + 1}`} className="w-full aspect-square object-cover" />
                  <div className="p-3">
                    <GlassButton 
                      size="sm" 
                      variant="secondary" 
                      className="w-full"
                      onClick={() => choose(u)}
                    >
                      Select Avatar
                    </GlassButton>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </GlassPanel>
  );
}



"use client";
import dynamic from 'next/dynamic';
import { useCallback, useRef, useState } from 'react';
import { generateAvatarFromSelfie } from '@/lib/adapters/avatar';
import { useGameStore } from '@/lib/state/gameStore';
import { GlassPanel } from '@/components/GlassPanel';
import { GlassButton } from '@/components/GlassButton';
import { CameraPermissionHelper } from '../CameraPermissionHelper';
import type { Character } from '@/types';

// Use any typing to avoid complex react-webcam TypeScript issues
// @ts-ignore TypeScript issues with react-webcam dynamic import
const Webcam = dynamic(() => import('react-webcam'), { ssr: false });

export default function AvatarPanel() {
  const webcamRef = useRef<any>(null);
  const [variants, setVariants] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [webcamReady, setWebcamReady] = useState(false);
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [capturedFrame, setCapturedFrame] = useState<string | null>(null);
  const [showFlash, setShowFlash] = useState(false);
  const setCharacter = useGameStore((s) => s.setCharacter);
  const setCurrentImage = useGameStore((s) => s.setCurrentImage);
  const setPhase = useGameStore((s) => s.setPhase);
  
  const videoConstraints: MediaTrackConstraints = {
    facingMode: 'user',
    width: { ideal: 1280 },
    height: { ideal: 720 },
  };
  
  // Removed debug logging for cleaner production experience

  const processImage = useCallback(async (imageSrc: string) => {
    console.log('🖼️ AVATAR PANEL: Processing image');
    // imageSrc is provided as parameter

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

  const capture = useCallback(async () => {
    console.log('📷 AVATAR PANEL: Capture button clicked');
    if (webcamError) {
      console.warn('⚠️ AVATAR PANEL: Capture blocked due to webcam error');
      setError(`Camera error: ${webcamError}`);
      return;
    }
    if (!isWebcamActive) {
      console.warn('⚠️ AVATAR PANEL: Capture attempted while webcam inactive');
      setError('Please activate the camera first.');
      return;
    }
    if (!webcamReady) {
      console.warn('⌛ AVATAR PANEL: Capture attempted before webcam ready');
      setError('Camera not ready yet. Please allow access or wait a moment.');
      return;
    }
    
    const imageSrc = webcamRef.current?.getScreenshot();
    if (!imageSrc) {
      console.error('❌ AVATAR PANEL: Failed to capture image from webcam');
      setError('Failed to capture image from webcam. Please ensure your camera is working.');
      return;
    }
    
    // Visual feedback: flash and freeze on the captured frame
    setCapturedFrame(imageSrc);
    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 150);

    await processImage(imageSrc);
  }, [webcamError, isWebcamActive, webcamReady, processImage]);

  const handleUpload = useCallback(async (dataUrl: string) => {
    console.log('📤 AVATAR PANEL: Processing uploaded image');
    await processImage(dataUrl);
  }, [processImage]);

  function choose(url: string) {
    console.log('✅ AVATAR PANEL: User selected avatar', { avatarUrl: url.substring(0, 50) + '...' });
    
    const c: Character = { id: `char-${Date.now()}`, avatarUrl: url };
    setCharacter(c);
    setCurrentImage(url);
    
    console.log('🔄 AVATAR PANEL: Transitioning to Shopping phase');
    setPhase('ShoppingSpree');
    
    console.log('🎯 PHASE TRANSITION: CharacterSelect → ShoppingSpree');
  }

  const handleWebcamError = (error: string | DOMException) => {
    console.error('❌ AVATAR PANEL: Webcam error', error);
    setWebcamError(typeof error === 'string' ? error : error.message);
  };
  
  const handleWebcamReady = () => {
    console.log('✅ AVATAR PANEL: Webcam is ready');
    setWebcamReady(true);
  };

  const retryCamera = async () => {
    try {
      console.log('🔁 AVATAR PANEL: Retrying camera access');
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      // Immediately stop to release camera; react-webcam will re-request as needed
      stream.getTracks().forEach((t) => t.stop());
      setWebcamError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('💥 AVATAR PANEL: Retry camera failed', msg);
      setWebcamError(msg);
    }
  };

  return (
    <div className="w-full max-w-lg">
      <GlassPanel variant="modal" className="overflow-hidden">
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              Create Your Avatar
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Capture a selfie or upload a photo to generate your personalized avatar
            </p>
          </div>
          
          {/* Status indicator */}
          <div className="flex items-center justify-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${
              webcamError ? 'bg-red-500' : 
              webcamReady ? 'bg-green-500' : 
              'bg-yellow-500'
            }`} />
            <span className="text-slate-600 dark:text-slate-400">
              {webcamError ? 'Camera unavailable' : 
               webcamReady ? 'Camera ready' : 
               'Initializing camera...'}
            </span>
          </div>
        
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
              {webcamError ? (
                <div className="p-6">
                  <CameraPermissionHelper onUpload={handleUpload} />
                </div>
            ) : (
              <>
                  {!isWebcamActive ? (
                    <div className="w-full aspect-[4/3] bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center">
                      <div className="text-center p-6">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center">
                          <svg className="w-8 h-8 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Ready to begin?</h3>
                        <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">Activate your camera to capture your selfie</p>
                        <GlassButton onClick={() => setIsWebcamActive(true)}>Activate Camera</GlassButton>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      {capturedFrame ? (
                        <>
                          <img
                            src={capturedFrame}
                            alt="Captured frame"
                            className="w-full aspect-[4/3] object-cover"
                          />
                          <div className="absolute top-2 left-2 px-2 py-1 text-xs rounded bg-black/60 text-white">Using this photo</div>
                        </>
                      ) : (
                        <Webcam 
                          audio={false} 
                          ref={webcamRef} 
                          screenshotFormat="image/jpeg" 
                          className="w-full aspect-[4/3] object-cover" 
                          onUserMedia={handleWebcamReady}
                          onUserMediaError={handleWebcamError}
                          mirrored={true}
                          videoConstraints={videoConstraints}
                          playsInline
                        />
                      )}
                      {/* Flash overlay */}
                      {showFlash && (
                        <div className="pointer-events-none absolute inset-0 bg-white animate-pulse opacity-80" />
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          
          <div className="flex gap-3">
            {isWebcamActive && webcamReady && !webcamError && (
              <>
                <GlassButton 
                  variant="primary" 
                  className="flex-1"
                  onClick={capture} 
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating...
                    </span>
                  ) : (
                    <>{capturedFrame ? 'Create' : 'Capture & Create'}</>
                  )}
                </GlassButton>
                {capturedFrame && !loading && (
                  <GlassButton 
                    variant="secondary"
                    onClick={() => setCapturedFrame(null)}
                  >
                    Retake
                  </GlassButton>
                )}
              </>
            )}
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            </div>
          )}

          {variants.length > 0 && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Choose Your Avatar</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm">Select the avatar that best represents you</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {variants.map((u, i) => (
                  <div key={i} className="group relative">
                    <div className="relative rounded-xl overflow-hidden bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 transition-all duration-200 hover:scale-[1.02]">
                      <img src={u} alt={`Avatar option ${i + 1}`} className="w-full aspect-square object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <GlassButton 
                          size="sm" 
                          variant="secondary" 
                          className="w-full"
                          onClick={() => choose(u)}
                        >
                          Select
                        </GlassButton>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </GlassPanel>
    </div>
  );
}



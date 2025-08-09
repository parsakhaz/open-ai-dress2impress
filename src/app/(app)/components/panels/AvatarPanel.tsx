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
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [selectedAvatarIndex, setSelectedAvatarIndex] = useState<number | null>(null);
  const setCharacter = useGameStore((s) => s.setCharacter);
  const setCurrentImage = useGameStore((s) => s.setCurrentImage);
  const setPhase = useGameStore((s) => s.setPhase);
  
  const videoConstraints: MediaTrackConstraints = {
    facingMode: 'user',
    width: { ideal: 1920 },
    height: { ideal: 1080 },
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
      setSelectedAvatarIndex(null); // Reset selection
      setShowAvatarSelector(true); // Show fullscreen selector
      
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

    // Log captured image details for debugging
    const img = new Image();
    img.onload = () => {
      console.log('📊 AVATAR PANEL: Captured image details', {
        width: img.width,
        height: img.height,
        dataUrlLength: imageSrc.length,
        format: imageSrc.substring(0, imageSrc.indexOf(';'))
      });
    };
    img.src = imageSrc;
    
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
    setShowAvatarSelector(false); // Close fullscreen selector
    setSelectedAvatarIndex(null); // Reset selection
    
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
    <>
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
                          // @ts-ignore
                          audio={false} 
                          // @ts-ignore
                          ref={webcamRef} 
                          // @ts-ignore
                          screenshotFormat="image/png" 
                          // @ts-ignore
                          screenshotQuality={1.0}
                          className="w-full aspect-[4/3] object-cover" 
                          // @ts-ignore
                          onUserMedia={handleWebcamReady}
                          // @ts-ignore
                          onUserMediaError={handleWebcamError}
                          // @ts-ignore
                          mirrored={true}
                          // @ts-ignore
                          videoConstraints={videoConstraints}
                          // @ts-ignore
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

          {variants.length > 0 && !showAvatarSelector && (
            <div className="text-center space-y-4">
              <div className="text-center">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Avatars Generated!</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm">Click below to view and select your avatar</p>
              </div>
              <GlassButton 
                variant="primary" 
                className="w-full"
                onClick={() => setShowAvatarSelector(true)}
              >
                View & Select Avatar
              </GlassButton>
            </div>
          )}
        </div>
      </GlassPanel>
    </div>

    {/* Fullscreen Avatar Selector Modal */}
    {showAvatarSelector && (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-full h-full max-w-6xl mx-auto flex flex-col">
          {/* Header */}
          <div className="text-center text-white mb-6">
            <h2 className="text-3xl font-bold mb-2">Choose Your Avatar</h2>
            <p className="text-white/80">Select the avatar that best represents you</p>
          </div>

          {/* Avatar Grid */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6 max-h-[70vh] overflow-y-auto">
            {variants.map((url, index) => (
              <div key={index} className="group relative">
                <div className={`relative rounded-2xl overflow-hidden bg-white shadow-2xl hover:shadow-3xl transition-all duration-300 cursor-pointer ${
                  selectedAvatarIndex === index ? 'ring-4 ring-blue-500 scale-105' : 'hover:scale-105'
                }`}>
                  <img 
                    src={url} 
                    alt={`Avatar option ${index + 1}`} 
                    className="w-full aspect-[3/4] object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {/* Select Button - only show when this avatar is selected */}
                  {selectedAvatarIndex === index && (
                    <div className="absolute bottom-4 left-4 right-4">
                      <GlassButton 
                        variant="primary" 
                        className="w-full text-white bg-blue-500 hover:bg-blue-600 backdrop-blur-sm border-blue-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          choose(url);
                        }}
                      >
                        ✓ Select This Avatar
                      </GlassButton>
                    </div>
                  )}

                  {/* Preview indicator when selected */}
                  {selectedAvatarIndex === index && (
                    <div className="absolute top-3 right-3 bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
                      PREVIEWING
                    </div>
                  )}

                  {/* Click to preview */}
                  <div 
                    className="absolute inset-0 cursor-pointer"
                    onClick={() => setSelectedAvatarIndex(selectedAvatarIndex === index ? null : index)}
                  />
                </div>
                
                {/* Avatar Number */}
                <div className="absolute top-3 left-3 w-8 h-8 bg-black/60 backdrop-blur-sm text-white rounded-full flex items-center justify-center text-sm font-semibold">
                  {index + 1}
                </div>
              </div>
            ))}
          </div>

          {/* Footer Actions */}
          <div className="mt-6 flex justify-center gap-4">
            <GlassButton 
              variant="secondary" 
              className="px-6 py-3 text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm border-white/30"
              onClick={() => {
                setShowAvatarSelector(false);
                setSelectedAvatarIndex(null);
              }}
            >
              ← Back to Capture
            </GlassButton>
            {selectedAvatarIndex !== null && (
              <GlassButton 
                variant="secondary" 
                className="px-6 py-3 text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm border-white/30"
                onClick={() => setSelectedAvatarIndex(null)}
              >
                Clear Selection
              </GlassButton>
            )}
            <GlassButton 
              variant="secondary" 
              className="px-6 py-3 text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm border-white/30"
              onClick={() => {
                setShowAvatarSelector(false);
                setSelectedAvatarIndex(null);
                setVariants([]);
                setCapturedFrame(null);
              }}
            >
              🔄 Generate New
            </GlassButton>
          </div>
        </div>
      </div>
    )}
    </>
  );
}



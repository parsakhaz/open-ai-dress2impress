"use client";
import dynamic from 'next/dynamic';
import { useCallback, useRef, useState } from 'react';
import type React from 'react';
import { generateAvatarFromSelfie } from '@/lib/adapters/avatar';
import { useGameStore } from '@/lib/state/gameStore';
import { GlassButton } from '@/components/GlassButton';
import { CameraPermissionHelper } from '../CameraPermissionHelper';
import { Confetti } from '@/components/Confetti';
import type { Character } from '@/types';
import { selectImage } from '@/lib/services/stateActions';
import { saveFaceImage } from '@/lib/services/faceActions';
import { getOrGenerateForFace } from '@/lib/services/avatarCache';

// Use any typing to avoid complex react-webcam TypeScript issues
// @ts-ignore TypeScript issues with react-webcam dynamic import
const Webcam = dynamic(() => import('react-webcam'), { ssr: false });

export default function AvatarPanel() {
  const webcamRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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
  const [showFullscreenPreview, setShowFullscreenPreview] = useState(false);
  const [previewAvatarIndex, setPreviewAvatarIndex] = useState(0);
  const [showShoppingConfirmation, setShowShoppingConfirmation] = useState(false);
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const setCharacter = useGameStore((s) => s.setCharacter);
  const character = useGameStore((s) => s.character);
  const setCurrentImage = useGameStore((s) => s.setCurrentImage);
  const setPhase = useGameStore((s) => s.setPhase);
  const addToHistory = useGameStore((s) => s.addToHistory);
  
  const videoConstraints: MediaTrackConstraints = {
    facingMode: 'user',
    width: { ideal: 1920 },
    height: { ideal: 1080 },
  };
  
  // Preset characters from public assets (can be expanded by adding files under /public/character)
  const presetCharacters: Array<{ id: string; name: string; url: string }> = [
    { id: 'trevor', name: 'Trevor', url: '/character/trevor.webp' },
    { id: 'tina', name: 'Tina', url: '/character/tina.webp' },
    { id: 'tim', name: 'Tim', url: '/character/tim.webp' },
  ];
  
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

  const processFace = useCallback(async (args: { imageId: string; dataUrl: string }) => {
    console.log('🧠 AVATAR PANEL: processFace start');
    setLoading(true);
    setError(null);
    try {
      const { urls, fromCache } = await getOrGenerateForFace(args.imageId, args.dataUrl);
      setVariants(urls);
      setSelectedAvatarIndex(null);
      setShowAvatarSelector(true);
      if (fromCache) {
        console.log('✅ AVATAR PANEL: Loaded variants from cache');
      }
    } catch (e) {
      const error = e instanceof Error ? e : new Error('Unknown error');
      setError(error.message);
      console.error('💥 AVATAR PANEL: processFace error', error.message);
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
    
    // Save face for reuse, then visual feedback: flash and freeze on the captured frame
    let imageId: string | null = null;
    try {
      const res = await saveFaceImage(imageSrc);
      imageId = res.imageId;
    } catch (e) {
      console.warn('⚠️ AVATAR PANEL: Failed to save face image', e);
    }
    setCapturedFrame(imageSrc);
    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 150);

    if (imageId) {
      await processFace({ imageId, dataUrl: imageSrc });
    } else {
      await processImage(imageSrc);
    }
  }, [webcamError, isWebcamActive, webcamReady, processImage]);

  const handleUpload = useCallback(async (dataUrl: string) => {
    console.log('📤 AVATAR PANEL: Processing uploaded image');
    try {
      const res = await saveFaceImage(dataUrl);
      await processFace({ imageId: res.imageId, dataUrl });
    } catch (e) {
      console.warn('⚠️ AVATAR PANEL: Failed to save uploaded face image', e);
      await processImage(dataUrl);
    }
  }, [processFace, processImage]);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === 'string' ? reader.result : '';
        if (result) void handleUpload(result);
      };
      reader.readAsDataURL(file);
      // reset value so selecting the same file again retriggers change
      e.target.value = '';
    },
    [handleUpload]
  );

  function choose(url: string) {
    console.log('✅ AVATAR PANEL: User chose avatar for selection', { avatarUrl: url.substring(0, 50) + '...' });
    setSelectedAvatarUrl(url);
    setShowAvatarSelector(false);
    setShowFullscreenPreview(false);
    setSelectedAvatarIndex(null);
  }

  function proceedNext() {
    if (!selectedAvatarUrl) return;
    const c: Character = { id: `char-${Date.now()}`, avatarUrl: selectedAvatarUrl };
    setCharacter(c);
    void selectImage(selectedAvatarUrl, { type: 'avatar', description: 'Selected avatar', addToHistory: true });
    setPhase('ThemeSelect');
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
    <div className="w-full max-w-6xl mx-auto py-8 text-foreground">
      <div className="grid grid-cols-1 gap-6 min-h-0">
        <div className="space-y-6">
          {/* Brand */}
          <div className="text-left">
            <img
              src="/FASHN%20ASSETS/Logos/Logo%20Text%20Light.svg"
              alt="FASHN AI"
              className="h-10 sm:h-10 w-auto"
            />
          </div>
            {/* Main content area, vertically centered */}
            <div className="min-h-[75svh] flex items-center">
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_60px_1.4fr] gap-6 w-full">
              {/* Style yourself */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">Style yourself</h3>
                <div className="relative rounded-2xl border-2 border-dashed border-border p-6 min-h-[440px] flex flex-col justify-center bg-muted">
                  {/* Hidden file input */}
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

                  {webcamError && !capturedFrame ? (
                    <div className="p-4">
                      <CameraPermissionHelper onUpload={handleUpload} />
                    </div>
                  ) : capturedFrame || isWebcamActive ? (
                    <>
                      <div className="relative w-full aspect-[4/3] max-h-[60svh] sm:max-h-[70svh] bg-muted overflow-hidden rounded-xl">
                        {capturedFrame ? (
                          <>
                            <img src={capturedFrame} alt="Captured frame" className="w-full h-full object-contain" />
                            <div className="absolute inset-0 -z-10">
                              <img src={capturedFrame} alt="" className="w-full h-full object-cover blur-2xl opacity-50" />
                            </div>
                          </>
                        ) : (
                          <>
                            <Webcam 
                              // @ts-ignore
                              audio={false}
                              // @ts-ignore
                              ref={webcamRef}
                              // @ts-ignore
                              screenshotFormat="image/png"
                              // @ts-ignore
                              screenshotQuality={1.0}
                              className="w-full h-full object-cover"
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
                            {showFlash && <div className="pointer-events-none absolute inset-0 bg-foreground animate-pulse opacity-20" />}
                          </>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="mt-4 flex flex-wrap gap-3">
                        <GlassButton
                          variant="primary"
                          className="flex-1"
                          onClick={() => {
                            if (capturedFrame) {
                              void processImage(capturedFrame);
                            } else {
                              void capture();
                            }
                          }}
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
                        <GlassButton variant="primary" onClick={() => setCapturedFrame(null)}>
                            Retake
                          </GlassButton>
                        )}
                        <GlassButton variant="primary" onClick={() => fileInputRef.current?.click()}>
                          Upload a photo
                        </GlassButton>
                      </div>

                      {/* Status indicator */}
                       <div className="mt-2 flex items-center gap-2 text-sm">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            webcamError ? 'bg-foreground' : webcamReady ? 'bg-foreground' : 'bg-foreground/50'
                          }`}
                        />
                          <span className="text-foreground/70">
                          {webcamError ? 'Camera unavailable' : webcamReady ? 'Camera ready' : 'Initializing camera...'}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="text-center">
                      <div className="mx-auto mb-5 flex items-center justify-center">
                        <img src="/FASHN%20ASSETS/Icons/camera.svg" alt="Camera" className="w-16 h-16 opacity-90" />
                      </div>
                      <div className="flex flex-col items-center gap-3">
                        <GlassButton variant="primary" onClick={() => setIsWebcamActive(true)}>Take a photo</GlassButton>
                        <GlassButton variant="primary" onClick={() => fileInputRef.current?.click()}>Upload a photo</GlassButton>
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{error}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* OR divider */}
              <div className="hidden lg:flex items-center justify-center text-foreground/60 font-semibold select-none text-xl">or</div>

              {/* Style a character */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">Style a character</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                  {presetCharacters.map((p) => {
                    const isSelected = selectedAvatarUrl === p.url;
                    return (
                      <button
                        key={p.id}
                        className={`group relative transition-all ${isSelected ? 'ring-4 ring-foreground rounded-2xl' : ''}`}
                        onClick={() => {
                          setSelectedAvatarUrl(p.url);
                          setSelectedAvatarIndex(null);
                        }}
                        title={`Choose ${p.name}`}
                      >
                        <div className="relative w-full h-[400px] rounded-2xl overflow-hidden">
                          <div className="absolute inset-0 rounded-2xl bg-foreground/5 opacity-0 group-hover:opacity-100 transition-opacity z-0" />
                          <img src={p.url} alt={p.name} className="absolute inset-0 w-full h-full object-contain z-10" />
                        </div>
                        <div className="mt-3 text-center text-foreground text-base font-medium">{p.name}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
              </div>
            </div>

            {/* If variants exist after generating from selfie, allow opening selector */}
            {variants.length > 0 && !showAvatarSelector && (
              <div className="text-center space-y-4">
                <div className="text-center">
                  <h3 className="font-semibold text-foreground mb-1">Avatars Generated!</h3>
                  <p className="text-foreground/70 text-sm">Click below to view and select your avatar</p>
                </div>
                <GlassButton variant="primary" className="w-full" onClick={() => setShowAvatarSelector(true)}>
                  View & Select Avatar
                </GlassButton>
              </div>
            )}
        </div>
      </div>
      {/* Next button bottom-right */}
      {!(showAvatarSelector || showFullscreenPreview || showShoppingConfirmation) && (
        <div className="fixed bottom-12 right-20 z-[60]">
          <GlassButton
            variant="primary"
            className="px-16 py-4 text-lg rounded-xl shadow-lg"
            disabled={!character && !selectedAvatarUrl}
            onClick={() => {
              if (selectedAvatarUrl || character) {
                proceedNext();
              }
            }}
          >
            Next →
          </GlassButton>
        </div>
      )}
    </div>

    {/* Fullscreen Avatar Selector Modal */}
      {showAvatarSelector && (
      <div className="fixed inset-0 z-50 bg-[var(--color-overlay)] overflow-y-auto">
        <div className="min-h-[100svh] flex items-start justify-center p-4">
          <div className="w-full max-w-6xl mx-auto my-6 flex flex-col max-h-[90svh]">
          {/* Header */}
            {/* Header */}
            <div className="text-center text-foreground mb-6">
              <h2 className="text-3xl font-bold mb-2">Choose Your Avatar</h2>
              <p className="text-foreground/80">Select the avatar that best represents you</p>
            </div>

            {/* Avatar Grid - selection only (no extra CTA), with black Back/Next */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6 max-h-[70vh] overflow-y-auto">
              {variants.map((url, index) => (
                <div key={index} className="group relative">
                  <div className={`relative rounded-2xl overflow-hidden bg-background border border-border shadow-2xl hover:shadow-3xl transition-all duration-300 cursor-pointer ${
                    selectedAvatarIndex === index ? 'ring-4 ring-foreground scale-105' : 'hover:scale-105'
                  }`}>
                    {/* Avatar with blurred background */}
                    <div className="relative w-full aspect-[3/4] bg-gradient-to-br from-slate-100 to-slate-200">
                      {/* Blurred background */}
                      <img 
                        src={url} 
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover blur-xl opacity-60"
                      />
                      {/* Main avatar */}
                      <img 
                        src={url} 
                        alt={`Avatar option ${index + 1}`} 
                        className="relative w-full h-full object-contain"
                      />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    {/* Click selects; no inline button */}

                    {/* Preview indicator when selected */}
                    {selectedAvatarIndex === index && (
                      <div className="absolute top-3 right-3 bg-foreground text-background px-2 py-1 rounded-full text-xs font-semibold">
                        PREVIEWING
                      </div>
                    )}

                    {/* Click to open fullscreen preview */}
                    <div 
                      className="absolute inset-0 cursor-pointer"
                      onClick={() => {
                        setSelectedAvatarIndex(index);
                        setSelectedAvatarUrl(url);
                      }}
                    />
                  </div>
                  
                  {/* Avatar Number */}
                  <div className="absolute top-3 left-3 w-8 h-8 bg-foreground/60 text-background rounded-full flex items-center justify-center text-sm font-semibold">
                    {index + 1}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Actions: Black Back/Next */}
            <div className="mt-6 flex justify-center gap-4">
              <button 
                className="px-6 py-3 rounded-xl bg-foreground text-background hover:opacity-90"
                onClick={() => {
                  setShowAvatarSelector(false);
                  setSelectedAvatarIndex(null);
                }}
              >
                Back to capture
              </button>
              <button 
                className="px-6 py-3 rounded-xl bg-foreground text-background hover:opacity-90 disabled:opacity-40"
                disabled={selectedAvatarUrl == null}
                onClick={() => {
                  if (selectedAvatarUrl) proceedNext();
                }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Fullscreen Avatar Preview Modal */}
    {showFullscreenPreview && variants.length > 0 && (
      <div className="fixed inset-0 z-50 bg-[var(--color-overlay)] overflow-y-auto">
        <div className="min-h-[100svh] flex items-start justify-center p-4">
          <div className="w-full max-w-5xl mx-auto my-6 flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center p-4 md:p-6">
              <div className="text-foreground">
                <h3 className="text-xl md:text-2xl font-bold">Avatar Preview</h3>
                <p className="text-foreground/80 text-sm md:text-base">
                  {previewAvatarIndex + 1} of {variants.length}
                </p>
              </div>
              <button
                onClick={() => setShowFullscreenPreview(false)}
                className="w-10 h-10 md:w-12 md:h-12 bg-foreground/10 hover:bg-foreground/20 rounded-full flex items-center justify-center text-foreground text-xl md:text-2xl transition-colors"
              >
                ×
              </button>
            </div>

            {/* Avatar Image - Responsive */}
            <div className="flex-1 flex items-center justify-center p-4 md:p-6">
              <div className="relative max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl w-full">
                <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-slate-100 to-slate-200">
                  {/* Blurred background for elegant display */}
                  <img
                    src={variants[previewAvatarIndex]}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-40"
                  />
                  {/* Main avatar image */}
                  <img
                    src={variants[previewAvatarIndex]}
                    alt={`Avatar option ${previewAvatarIndex + 1}`}
                    className="relative w-full h-auto max-h-[60vh] md:max-h-[70vh] object-contain"
                  />
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center p-4 md:p-6">
              {/* Previous Button */}
              <button
                onClick={() => setPreviewAvatarIndex(previewAvatarIndex > 0 ? previewAvatarIndex - 1 : variants.length - 1)}
                className="flex items-center gap-2 px-4 py-2 md:px-6 md:py-3 bg-foreground/10 hover:bg-foreground/20 text-foreground rounded-xl transition-colors"
              >
                ← Previous
              </button>

              {/* Select Button */}
              <GlassButton
                variant="primary"
                className="px-6 py-3 md:px-8 md:py-4"
                onClick={() => choose(variants[previewAvatarIndex])}
              >
                ✓ Select This Avatar
              </GlassButton>

              {/* Next Button */}
              <button
                onClick={() => setPreviewAvatarIndex(previewAvatarIndex < variants.length - 1 ? previewAvatarIndex + 1 : 0)}
                className="flex items-center gap-2 px-4 py-2 md:px-6 md:py-3 bg-foreground/10 hover:bg-foreground/20 text-foreground rounded-xl transition-colors"
              >
                Next →
              </button>
            </div>

            {/* Avatar Thumbnails */}
            <div className="flex justify-center gap-2 md:gap-4 p-4 md:p-6">
              {variants.map((url, index) => (
                <button
                  key={index}
                  onClick={() => setPreviewAvatarIndex(index)}
                  className={`w-12 h-12 md:w-16 md:h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                    index === previewAvatarIndex 
                      ? 'border-foreground' 
                      : 'border-border hover:border-foreground/60'
                  }`}
                >
                  <div className="relative w-full h-full bg-muted">
                    <img
                      src={url}
                      alt={`Avatar ${index + 1}`}
                      className="w-full h-full object-contain p-1"
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Shopping Confirmation Modal */}
    {showShoppingConfirmation && selectedAvatarUrl && (
      <div className="fixed inset-0 z-50 bg-[var(--color-overlay)] overflow-y-auto">
        <div className="min-h-[100svh] flex items-start justify-center p-4">
          <div className="bg-background rounded-3xl p-6 md:p-8 max-w-md w-full mx-4 my-6 border border-border">
            <div className="text-center space-y-6">
              {/* Selected Avatar Preview */}
              <div className="flex justify-center">
                <div className="relative w-32 h-40 md:w-40 md:h-48 rounded-2xl overflow-hidden shadow-xl bg-muted">
                  {/* Blurred background */}
                  <img
                    src={selectedAvatarUrl ?? ''}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover blur-xl opacity-50"
                  />
                  {/* Main avatar */}
                  <img
                    src={selectedAvatarUrl ?? ''}
                    alt="Selected avatar"
                    className="relative w-full h-full object-contain p-2"
                  />
                </div>
              </div>

              {/* Title */}
              <div className="text-foreground">
                <h2 className="text-2xl md:text-3xl font-bold mb-2">Ready to Start Shopping?</h2>
                <p className="text-foreground/80 text-sm md:text-base">
                  You'll have <strong>3 minutes</strong> to create the perfect outfit for your avatar!
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <GlassButton
                  variant="primary"
                  className="w-full py-3 md:py-4 text-lg"
                  onClick={proceedNext}
                >
                  🛍️ Start Shopping Spree!
                </GlassButton>
                
                <div className="flex gap-3">
                  <GlassButton
                    variant="secondary"
                    className="flex-1 py-2"
                    onClick={() => {
                      setShowShoppingConfirmation(false);
                      setShowAvatarSelector(true);
                    }}
                  >
                    Change Avatar
                  </GlassButton>
                  <GlassButton
                    variant="secondary"
                    className="flex-1 py-2"
                    onClick={() => {
                      setShowShoppingConfirmation(false);
                      setSelectedAvatarUrl(null);
                      setVariants([]);
                      setCapturedFrame(null);
                    }}
                  >
                    Start Over
                  </GlassButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Confetti celebration */}
    <Confetti trigger={showConfetti} />
    </>
  );
}



"use client";
import { useState } from 'react';
import { GlassButton } from '@/components/GlassButton';

export function CameraPermissionHelper({ onUpload }: { onUpload: (dataUrl: string) => void }) {
  const [diagnostics, setDiagnostics] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);

  const runDiagnostics = async () => {
    setTesting(true);
    const results: string[] = [];
    
    // 1. Check if we're on HTTPS/localhost
    const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
    results.push(`✅ Secure context: ${isSecure ? 'Yes' : 'No'} (${window.location.protocol}//${window.location.hostname})`);
    
    // 2. Check if mediaDevices API exists
    const hasAPI = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    results.push(`${hasAPI ? '✅' : '❌'} MediaDevices API: ${hasAPI ? 'Available' : 'Not available'}`);
    
    // 3. Try to enumerate devices (doesn't require permission)
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter(d => d.kind === 'videoinput');
      results.push(`✅ Found ${cameras.length} camera(s)`);
      cameras.forEach((cam, i) => {
        results.push(`  📷 Camera ${i + 1}: ${cam.label || 'Unnamed'}`);
      });
    } catch (e) {
      results.push(`❌ Can't enumerate devices: ${e}`);
    }
    
    // 4. Check permission state if available
    if ('permissions' in navigator) {
      try {
        const perm = await navigator.permissions.query({ name: 'camera' as PermissionName });
        results.push(`📋 Permission state: ${perm.state}`);
        if (perm.state === 'denied') {
          results.push('⚠️ Camera is BLOCKED in browser settings!');
        }
      } catch (e) {
        results.push(`ℹ️ Can't query permissions (normal in some browsers)`);
      }
    }
    
    // 5. Actually try getUserMedia
    try {
      results.push('🔄 Attempting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      results.push('✅ Camera access SUCCESSFUL!');
    } catch (e: any) {
      results.push(`❌ Camera access FAILED: ${e.name} - ${e.message}`);
      
      // Specific error guidance
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        results.push('\n🔧 FIX: Camera blocked. Try these:');
        results.push('1. Click the camera icon in the address bar → Allow');
        results.push('2. Or go to chrome://settings/content/camera');
        results.push('3. Find localhost and set to "Allow"');
        results.push('4. Refresh the page');
      } else if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
        results.push('\n🔧 FIX: No camera found. Check:');
        results.push('1. Camera is connected/built-in');
        results.push('2. Camera drivers are installed');
        results.push('3. No other app is using the camera');
      }
    }
    
    setDiagnostics(results);
    setTesting(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        onUpload(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-red-50 dark:bg-red-950/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Camera Access Required</h4>
        <p className="text-slate-600 dark:text-slate-400 text-sm">We need camera permission to capture your selfie</p>
      </div>
      
      <div className="space-y-4">
        <GlassButton 
          onClick={runDiagnostics} 
          disabled={testing}
          className="w-full"
          variant="secondary"
        >
          {testing ? 'Running diagnostics...' : 'Diagnose Camera Issues'}
        </GlassButton>
        
        {diagnostics.length > 0 && (
          <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <pre className="text-xs text-slate-700 dark:text-slate-300 overflow-x-auto whitespace-pre-wrap">
              {diagnostics.join('\n')}
            </pre>
          </div>
        )}
      </div>
      
      <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
        <div className="text-center mb-3">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
            Can't access camera?
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-500">
            Upload a selfie instead
          </p>
        </div>
        <label className="block">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="block w-full text-sm text-slate-600 dark:text-slate-400
              file:mr-4 file:py-2 file:px-4
              file:rounded-xl file:border-0
              file:text-sm file:font-medium
              file:bg-slate-100 file:text-slate-700
              file:dark:bg-slate-800 file:dark:text-slate-300
              hover:file:bg-slate-200 hover:file:dark:bg-slate-700
              file:transition-colors file:cursor-pointer"
          />
        </label>
      </div>
    </div>
  );
}

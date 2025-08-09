import { GlassPanel } from '@/components/GlassPanel';

export default function HistoryStrip() {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20">
      <GlassPanel className="p-2">
        <div className="flex items-center gap-3 overflow-x-auto max-w-[80vw]">
          {/* Placeholder for future history thumbnails */}
          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-white/20 dark:bg-black/20 border border-white/30 dark:border-white/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-slate-400 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/5 flex items-center justify-center">
            <svg className="w-4 h-4 text-slate-400 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/5 flex items-center justify-center">
            <svg className="w-4 h-4 text-slate-400 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}



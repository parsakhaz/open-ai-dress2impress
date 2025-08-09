import { GlassPanel } from '@/components/GlassPanel';

export default function HistoryStrip() {
  return (
    <GlassPanel className="p-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">Style History</h3>
        <span className="text-xs text-slate-500 dark:text-slate-400">Coming soon</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {/* Placeholder for future history items */}
        <div className="text-center text-slate-500 dark:text-slate-400 py-8 px-12">
          <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm">Your styling history will appear here</p>
          <p className="text-xs mt-1 opacity-75">Create looks to build your timeline</p>
        </div>
      </div>
    </GlassPanel>
  );
}



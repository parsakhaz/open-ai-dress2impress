"use client";

import TopBar from '@/app/(app)/components/game/TopBar';
import CenterStage from '@/app/(app)/components/game/CenterStage';
import HistoryStrip from '@/app/(app)/components/game/HistoryStrip';
import ToolsIsland from '@/app/(app)/components/ui/ToolsIsland';
import AIConsole from '@/app/(app)/components/ai/AIConsole';

export default function GameClient() {
  return (
    <main className="container mx-auto p-6">
      <div className="space-y-6">
        <TopBar />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[60vh]">
          <div className="lg:col-span-2 space-y-6">
            <CenterStage />
            <HistoryStrip />
          </div>
          <div className="space-y-6">
            <ToolsIsland />
            <AIConsole />
          </div>
        </div>
      </div>
    </main>
  );
}

import TopBar from '@/app/(app)/components/game/TopBar';
import CenterStage from '@/app/(app)/components/game/CenterStage';
import HistoryStrip from '@/app/(app)/components/game/HistoryStrip';
import ToolsIsland from '@/app/(app)/components/ui/ToolsIsland';
import AIConsole from '@/app/(app)/components/ai/AIConsole';

export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <div className="p-4 space-y-3">
      <TopBar />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 min-h-[60vh]">
        <div className="lg:col-span-2 space-y-3">
          <CenterStage />
          <HistoryStrip />
        </div>
        <div className="space-y-3">
          <ToolsIsland />
          <AIConsole />
        </div>
      </div>
    </div>
  );
}

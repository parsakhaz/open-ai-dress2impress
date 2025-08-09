import AmazonPanel from '@/app/(app)/components/panels/AmazonPanel';
import EditWithAIPanel from '@/app/(app)/components/panels/EditWithAIPanel';
import Wardrobe from '@/app/(app)/components/ui/Wardrobe';

export default function ToolsIsland() {
  return (
    <div className="space-y-4">
      <AmazonPanel />
      <EditWithAIPanel />
      <Wardrobe />
    </div>
  );
}



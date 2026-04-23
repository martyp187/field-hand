import { Link } from 'react-router-dom';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { SidebarSection } from './SidebarSection';
import { NavItem } from './SidebarNav';
import { ConnectionStatus } from './ConnectionStatus';
import { FarmColourDot } from '@/components/FarmColourDot';
import { usePlayer } from '@/contexts/PlayerContext';
import { useFarm } from '@/contexts/FarmContext';
import type { SseStatus } from '@/hooks/useSseEvents';

interface SidebarProps {
  sseStatus: SseStatus;
  onSettingsClick: () => void;
}

export function Sidebar({ sseStatus, onSettingsClick }: SidebarProps) {
  const { nickname } = usePlayer();
  const { activeFarm, activeFarmId } = useFarm();

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-border bg-card">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <span className="text-xl">🌾</span>
        <span className="font-semibold text-sm tracking-tight">Farm Companion</span>
      </div>

      {/* Active farm + connection status */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        {activeFarm ? (
          <span className="flex items-center gap-1.5 text-sm font-medium truncate">
            <FarmColourDot colour={activeFarm.colour_hex} />
            <span className="truncate">{activeFarm.name}</span>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">No farm set</span>
        )}
        <ConnectionStatus status={sseStatus} />
      </div>

      {/* Nav */}
      <ScrollArea className="flex-1 py-2">
        <div className="space-y-4 px-2">
          <SidebarSection title="Server">
            <NavItem to="/" label="Overview" icon="🖥️" />
          </SidebarSection>

          {activeFarmId !== null && (
            <SidebarSection title="My Farm">
              <NavItem to={`/farm/${activeFarmId}`} label="Dashboard" icon="🏡" />
              <NavItem to={`/farm/${activeFarmId}?tab=finances`} label="Finances" icon="💰" />
              <NavItem to={`/farm/${activeFarmId}?tab=vehicles`} label="Vehicles" icon="🚜" />
              <NavItem to={`/farm/${activeFarmId}?tab=fields`} label="Fields" icon="🌱" />
            </SidebarSection>
          )}

          <SidebarSection title="Tasks">
            <NavItem to="/tasks" label="Task Board" icon="📋" />
            <NavItem to="/tasks/my" label="My Tasks" icon="👤" />
            <NavItem to="/goals" label="Goals" icon="🎯" />
            <NavItem to="/tasks/templates" label="Templates" icon="🔄" />
          </SidebarSection>

          <Collapsible defaultOpen={false}>
            <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
              <span>Planning</span>
              <span className="text-xs">▾</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-0.5">
              <NavItem to="/planning/market" label="Market" icon="📈" />
              <NavItem to="/planning/crops" label="Crop Rotation" icon="🌾" />
              <NavItem to="/planning/profit" label="Profit Calc" icon="🧮" />
              <NavItem to="/planning/livestock" label="Livestock" icon="🐄" />
              <NavItem to="/planning/vehicles" label="Used Vehicles" icon="🚗" />
            </CollapsibleContent>
          </Collapsible>

          <SidebarSection title="">
            <NavItem to="/map" label="Map" icon="🗺️" />
            <NavItem to="/leaderboard" label="Leaderboard" icon="🏆" />
          </SidebarSection>
        </div>
      </ScrollArea>

      <Separator />

      {/* Bottom: nickname + settings */}
      <div className="flex items-center justify-between px-4 py-3">
        {nickname ? (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>👤</span>
            <span className="font-medium text-foreground truncate max-w-[7rem]">{nickname}</span>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Not set</span>
        )}
        <button
          onClick={onSettingsClick}
          className="text-muted-foreground hover:text-foreground transition-colors text-sm"
          title="Settings"
        >
          ⚙
        </button>
      </div>

      {/* All farms list (quick access when no active farm) */}
      {!activeFarmId && (
        <div className="border-t border-border px-2 py-2">
          <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            All Farms
          </p>
          <Link
            to="/farms"
            className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
          >
            Browse farms →
          </Link>
        </div>
      )}
    </aside>
  );
}

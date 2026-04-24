import { useState, Component, type ReactNode, type ErrorInfo } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { WelcomeDialog } from '@/components/WelcomeDialog';
import { SettingsDialog } from '@/components/SettingsDialog';
import { NotificationPanel } from '@/components/NotificationPanel';
import { Toaster } from '@/components/ui/sonner';
import { useSseEvents } from '@/hooks/useSseEvents';
import { useNotifications } from '@/api/hooks/useNotifications';
import { ServerOverview } from '@/pages/ServerOverview';
import { FarmDashboard } from '@/pages/FarmDashboard';
import { TaskBoard } from '@/pages/TaskBoard';
import { MyTasks } from '@/pages/MyTasks';
import { TaskTemplates } from '@/pages/TaskTemplates';
import { Goals } from '@/pages/Goals';
import { MapPage } from '@/pages/Map';
import { Leaderboard } from '@/pages/Leaderboard';
import { MarketPrices } from '@/pages/planning/MarketPrices';
import { CropRotation } from '@/pages/planning/CropRotation';
import { ProfitCalc } from '@/pages/planning/ProfitCalc';
import { Livestock } from '@/pages/planning/Livestock';
import { UsedVehicles } from '@/pages/planning/UsedVehicles';

class RouteErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(_error: Error, info: ErrorInfo) { console.error('[ErrorBoundary]', info); }
  render() {
    if (this.state.error) {
      return (
        <div className="p-8 space-y-2">
          <p className="text-destructive font-semibold">Something went wrong on this page.</p>
          <p className="text-sm text-muted-foreground font-mono">{(this.state.error as Error).message}</p>
          <button className="text-xs underline text-muted-foreground" onClick={() => this.setState({ error: null })}>
            Try again
          </button>
        </div>
      );
    }
    return this.state.error === null ? this.props.children : null;
  }
}

function AppShell() {
  const sseStatus = useSseEvents();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { unreadCount } = useNotifications();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        sseStatus={sseStatus}
        onSettingsClick={() => setSettingsOpen(true)}
        onNotificationsClick={() => setNotificationsOpen(true)}
        notificationCount={unreadCount}
      />
      <main className="flex-1 overflow-y-auto">
        <RouteErrorBoundary>
        <Routes>
          <Route path="/" element={<ServerOverview />} />
          <Route path="/farm/:id" element={<FarmDashboard />} />
          <Route path="/tasks" element={<TaskBoard />} />
          <Route path="/tasks/my" element={<MyTasks />} />
          <Route path="/tasks/templates" element={<TaskTemplates />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/planning/market" element={<MarketPrices />} />
          <Route path="/planning/crops" element={<CropRotation />} />
          <Route path="/planning/profit" element={<ProfitCalc />} />
          <Route path="/planning/livestock" element={<Livestock />} />
          <Route path="/planning/vehicles" element={<UsedVehicles />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
        </Routes>
        </RouteErrorBoundary>
      </main>
      <WelcomeDialog />
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <NotificationPanel open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
      <Toaster richColors position="bottom-right" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}

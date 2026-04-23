import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PlayerProvider } from '@/contexts/PlayerContext';
import { FarmProvider } from '@/contexts/FarmContext';
import './index.css';
import App from './App';

// Dark mode by default — apply class to <html>
document.documentElement.classList.add('dark');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <PlayerProvider>
        <FarmProvider>
          <App />
        </FarmProvider>
      </PlayerProvider>
    </QueryClientProvider>
  </StrictMode>,
);

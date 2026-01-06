import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import '@rainbow-me/rainbowkit/styles.css';
import App from './App.jsx';
import { VoltProvider } from './context/VoltContext';
import ErrorBoundary from './components/Shared/ErrorBoundary';
import { initErrorTracking } from './utils/errorTracking';
import { getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

// Initialize error tracking
initErrorTracking();

// Arc Testnet configuration
const arcTestnet = {
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Arc',
    symbol: 'ARC',
  },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.arc.network'] },
    public: { http: ['https://rpc.testnet.arc.network'] },
  },
  blockExplorers: {
    default: { name: 'ArcScan', url: 'https://testnet.arcscan.net' },
  },
  testnet: true,
};

const config = getDefaultConfig({
  appName: 'Volt Protocol',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
  chains: [arcTestnet],
  ssr: false,
});

const queryClient = new QueryClient();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <ErrorBoundary>
            <VoltProvider>
              <App />
            </VoltProvider>
          </ErrorBoundary>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
);
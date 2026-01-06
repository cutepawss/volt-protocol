import React, { Suspense, lazy } from 'react';
import { useVolt } from './context/VoltContext';
import ToastContainer from './components/Shared/ToastContainer';
import LoadingSpinner from './components/Shared/LoadingSpinner';
import './App.css';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';

// Lazy load faucet component
const VUSDCFaucet = lazy(() => import('./components/Faucet/vUSDCFaucet'));

// Lazy load components for code splitting
const StreamList = lazy(() => import('./components/Dashboard/StreamList'));
const CreateStreamForm = lazy(() => import('./components/Dashboard/CreateStreamForm'));
const OrderBook = lazy(() => import('./components/Marketplace/OrderBook'));
const SniperBotPanel = lazy(() => import('./components/SniperBot/SniperBotPanel'));
const OrderHistory = lazy(() => import('./components/History/OrderHistory'));
const TradeHistory = lazy(() => import('./components/History/TradeHistory'));
const UserProfile = lazy(() => import('./components/Profile/UserProfile'));
const StreamAnalytics = lazy(() => import('./components/Analytics/StreamAnalytics'));

function App() {
  const { connectWallet, disconnectWallet, user, toast } = useVolt();
  const [activeTab, setActiveTab] = React.useState('dashboard');
  const { address, isConnected } = useAccount();

// Sync RainbowKit with VoltContext
React.useEffect(() => {
  if (isConnected && address && address !== user.address) {
    connectWallet();
  } else if (!isConnected && user.address) {
    disconnectWallet();
  }
}, [isConnected, address, user.address]);

  return (
    <div className="app-container">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <svg className="volt-logo" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path 
                d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" 
                fill="currentColor"
                stroke="none"
              />
            </svg>
          </div>
          <div className="brand-text">
            <span className="brand-name">VOLT</span>
            <span className="brand-tagline">Protocol</span>
          </div>
        </div>
       
        <nav className="nav-menu">
          {/* Main Section */}
          <div className="nav-category">
            <div className="nav-category-label">Main</div>
            <div 
              className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} 
              onClick={() => setActiveTab('dashboard')}
            >
            Dashboard
          </div>
            <div 
              className={`nav-item ${activeTab === 'create-stream' ? 'active' : ''}`} 
              onClick={() => setActiveTab('create-stream')}
            >
            Create Stream
          </div>
          </div>

          {/* Trading Section */}
          <div className="nav-category">
            <div className="nav-category-label">Trading</div>
            <div 
              className={`nav-item ${activeTab === 'marketplace' ? 'active' : ''}`} 
              onClick={() => setActiveTab('marketplace')}
            >
              Marketplace
                </div>
            <div 
  className={`nav-item disabled`}
>
  Sniper Bot
  <span className="soon-badge">SOON</span>
</div>
            <div 
              className={`nav-item ${activeTab === 'history' ? 'active' : ''}`} 
              onClick={() => setActiveTab('history')}
            >
              History
                        </div>
                      </div>
                      
          {/* Analytics Section */}
          <div className="nav-category">
            <div className="nav-category-label">Analytics</div>
            <div 
              className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`} 
              onClick={() => setActiveTab('analytics')}
            >
              Stream Analytics
                      </div>
                      </div>
                      
          {/* Account Section */}
          <div className="nav-category">
            <div className="nav-category-label">Account</div>
            <div 
              className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`} 
              onClick={() => setActiveTab('profile')}
            >
              Profile
            </div>
            <div 
              className={`nav-item ${activeTab === 'faucet' ? 'active' : ''}`} 
              onClick={() => setActiveTab('faucet')}
            >
              vUSDC Faucet
            </div>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="network-status">
            {user.address ? (
              <span className="status-online">Arc Testnet</span>
            ) : (
              <span className="status-offline">Offline</span>
                          )}
                        </div>
                      </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">
        <div className="top-bar">
                        <div>
            <h1 className="page-title">
              {activeTab === 'dashboard' ? 'Streaming Dashboard' : 
               activeTab === 'create-stream' ? 'Create New Stream' :
               activeTab === 'marketplace' ? 'Stream Marketplace' : 
               activeTab === 'sniper' ? 'Sniper Bot' :
               activeTab === 'history' ? 'History' :
               activeTab === 'profile' ? 'User Profile' :
               activeTab === 'faucet' ? 'vUSDC Faucet' :
               'Stream Analytics'}
            </h1>
            <p className="page-subtitle">
               Volt Protocol v1.2 • Powered by Arc Network
                </p>
              </div>
          <div className="wallet-section">
  <ConnectButton.Custom>
    {({
      account,
      chain,
      openAccountModal,
      openChainModal,
      openConnectModal,
      mounted,
    }) => {
      const ready = mounted;
      const connected = ready && account && chain;

      return (
        <div
          {...(!ready && {
            'aria-hidden': true,
            style: {
              opacity: 0,
              pointerEvents: 'none',
              userSelect: 'none',
            },
          })}
        >
          {(() => {
            if (!connected) {
              return (
                <button className="connect-btn" onClick={openConnectModal}>
                  CONNECT WALLET
                </button>
              );
            }

            if (chain.unsupported) {
              return (
                <button className="connect-btn" onClick={openChainModal}>
                  Wrong Network
                </button>
              );
            }

            return (
              <div className="wallet-connected">
                <div className="wallet-address" onClick={openAccountModal} style={{ cursor: 'pointer' }}>
                  {account.displayName}
                </div>
                {user.balanceVUSDC !== undefined && (
                  <div className="wallet-balance">
                    <span className="balance-label">vUSDC:</span>
                    <span className="balance-value">{user.balanceVUSDC.toFixed(2)}</span>
                  </div>
                )}
                <button className="connect-btn disconnect" onClick={openAccountModal}>
                  Disconnect
                </button>
              </div>
            );
          })()}
        </div>
      );
    }}
  </ConnectButton.Custom>
</div>
                            </div>

        {/* CONTENT AREA */}
        <div className="content-area">
          <Suspense fallback={<LoadingSpinner fullScreen />}>
            {activeTab === 'dashboard' && <StreamList onNavigateToCreateStream={() => setActiveTab('create-stream')} />}
            {activeTab === 'create-stream' && <CreateStreamForm />}
            {activeTab === 'marketplace' && <OrderBook />}
            {activeTab === 'sniper' && <SniperBotPanel />}
            {activeTab === 'history' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <OrderHistory />
                <TradeHistory />
              </div>
            )}
            {activeTab === 'profile' && <UserProfile />}
            {activeTab === 'analytics' && <StreamAnalytics />}
            {activeTab === 'faucet' && <VUSDCFaucet />}
          </Suspense>
        </div>
      </main>

      {/* Toast Notifications */}
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
                          </div>
                        );
}

export default App;

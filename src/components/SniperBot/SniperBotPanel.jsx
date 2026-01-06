import React, { useState } from 'react';
import { useSniperBot } from '../../hooks/useSniperBot';
import { useVolt } from '../../context/VoltContext';
import InfoBox from '../Shared/InfoBox';
import styles from './SniperBotPanel.module.css';

/**
 * SniperBotPanel Component
 * 
 * Control panel for the automated trading agent
 */

const SniperBotPanel = () => {
  const [maxRisk, setMaxRisk] = useState(40);
  const [minDiscount, setMinDiscount] = useState(10);
  const [maxDuration, setMaxDuration] = useState(30);

  const { orderBook, activeStreams } = useVolt();
  const sniperBot = useSniperBot({
    maxRisk,
    minDiscount,
    maxDuration,
  });

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          Arc Agentic Commerce
        </h2>
        <p className={styles.subtitle}>
          Automated trading agent for stream marketplace
        </p>
      </div>

      {/* Info Box */}
      <InfoBox title="🤖 Sniper Bot - Automated Trading" type="info">
        <p>
          The <strong>Sniper Bot</strong> is an automated trading agent that monitors the marketplace 
          and executes trades based on your configured criteria.
        </p>
        <p><strong>How it works:</strong></p>
        <ul>
          <li><strong>Configure Settings:</strong> Set your risk tolerance, minimum discount, and maximum duration.</li>
          <li><strong>Start Bot:</strong> The bot scans the marketplace every 3 seconds for matching opportunities.</li>
          <li><strong>Auto-Execute:</strong> When a stream matches your criteria, the bot automatically purchases it.</li>
          <li><strong>Monitor Activity:</strong> View execution history and statistics in real-time.</li>
        </ul>
        <p>
          ⚠️ <strong>Warning:</strong> The bot will automatically spend your vUSDC when conditions are met. 
          Make sure you have sufficient balance and are comfortable with your settings.
        </p>
      </InfoBox>

      {/* Status */}
      <div className={styles.statusSection}>
        <div className={styles.statusIndicator}>
          <div className={`${styles.statusDot} ${sniperBot.isActive ? styles.active : styles.inactive}`} />
          <span className={styles.statusText}>
            {sniperBot.isActive ? 'ACTIVE' : 'INACTIVE'}
          </span>
        </div>
        <div className={styles.statusActions}>
          <button
            onClick={sniperBot.start}
            disabled={sniperBot.isActive}
            className={`${styles.btn} ${styles.btnStart}`}
          >
            START
          </button>
          <button
            onClick={sniperBot.stop}
            disabled={!sniperBot.isActive}
            className={`${styles.btn} ${styles.btnStop}`}
          >
            STOP
          </button>
        </div>
      </div>

      {/* Marketplace Status */}
      <div className={styles.marketplaceStatusSection}>
        <h3 className={styles.sectionTitle}>Marketplace Status</h3>
        <div className={styles.marketplaceStatusGrid}>
          <div className={styles.marketplaceStatusCard}>
            <div className={styles.marketplaceStatusLabel}>Active Orders</div>
            <div className={styles.marketplaceStatusValue}>{orderBook.length}</div>
          </div>
          <div className={styles.marketplaceStatusCard}>
            <div className={styles.marketplaceStatusLabel}>Active Streams</div>
            <div className={styles.marketplaceStatusValue}>{activeStreams.length}</div>
          </div>
        </div>
        {orderBook.length === 0 && (
          <div className={styles.marketplaceStatusWarning}>
            No orders available in marketplace. Create an order in the Marketplace tab to test the sniper bot.
          </div>
        )}
      </div>

      {/* Configuration */}
      <div className={styles.configSection}>
        <h3 className={styles.sectionTitle}>Configuration</h3>
        
        <div className={styles.configGroup}>
          <label className={styles.configLabel}>
            Max Risk Score (0-100)
            <span className={styles.configHint}>
              Lower = less risk (e.g., 40 = A or B rating only)
            </span>
          </label>
          <input
            type="number"
            value={maxRisk}
            onChange={(e) => setMaxRisk(parseInt(e.target.value) || 0)}
            min="0"
            max="100"
            className={styles.configInput}
            disabled={sniperBot.isActive}
          />
          <div className={styles.configValue}>
            Current: {maxRisk}/100
          </div>
        </div>

        <div className={styles.configGroup}>
          <label className={styles.configLabel}>
            Min Discount (%)
            <span className={styles.configHint}>
              Minimum discount required (e.g., 10 = 10% off)
            </span>
          </label>
          <input
            type="number"
            value={minDiscount}
            onChange={(e) => setMinDiscount(parseInt(e.target.value) || 0)}
            min="0"
            max="100"
            className={styles.configInput}
            disabled={sniperBot.isActive}
          />
          <div className={styles.configValue}>
            Current: {minDiscount}%
          </div>
        </div>

        <div className={styles.configGroup}>
          <label className={styles.configLabel}>
            Max Duration (days)
            <span className={styles.configHint}>
              Maximum stream duration in days
            </span>
          </label>
          <input
            type="number"
            value={maxDuration}
            onChange={(e) => setMaxDuration(parseInt(e.target.value) || 0)}
            min="1"
            className={styles.configInput}
            disabled={sniperBot.isActive}
          />
          <div className={styles.configValue}>
            Current: {maxDuration} days
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className={styles.statsSection}>
        <h3 className={styles.sectionTitle}>Statistics</h3>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total Scans</div>
            <div className={styles.statValue}>{sniperBot.stats.totalScans}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Matches Found</div>
            <div className={styles.statValue}>{sniperBot.stats.totalMatches}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Executions</div>
            <div className={styles.statValue}>{sniperBot.stats.totalExecutions}</div>
          </div>
          {sniperBot.stats.lastScanTime && (
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Last Scan</div>
              <div className={styles.statValue} style={{ fontSize: '0.85rem' }}>
                {new Date(sniperBot.stats.lastScanTime).toLocaleTimeString()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Execution History */}
      {sniperBot.executionHistory.length > 0 && (
        <div className={styles.historySection}>
          <h3 className={styles.sectionTitle}>Execution History</h3>
          <div className={styles.historyList}>
            {sniperBot.executionHistory.slice(0, 10).map((exec) => (
              <div key={exec.id} className={styles.historyItem}>
                <div className={styles.historyHeader}>
                  <span className={styles.historyOrderId}>
                    Order #{exec.orderId.slice(-8)}
                  </span>
                  <span className={styles.historyTime}>
                    {new Date(exec.executedAt).toLocaleString()}
                  </span>
                </div>
                <div className={styles.historyDetails}>
                  <span>Price: {exec.price.toFixed(6)} USDC</span>
                  <span>Risk: {exec.riskScore}/100</span>
                  <span>Discount: {exec.discount.toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SniperBotPanel;


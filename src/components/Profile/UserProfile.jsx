import React, { useMemo } from 'react';
import { useVolt } from '../../context/VoltContext';
import { calculateReputation, getReputationLevel, calculateUserStats } from '../../utils/reputationEngine';
import InfoBox from '../Shared/InfoBox';
import styles from './UserProfile.module.css';

/**
 * UserProfile Component
 * 
 * Displays user profile with:
 * - Reputation score and level
 * - Transaction statistics
 * - Trading history summary
 */

const UserProfile = () => {
  const { user, tradeHistory, orderHistory, activeStreams } = useVolt();

  if (!user.address) {
    return (
      <div className={styles.emptyState}>
        <p>Please connect your wallet to view your profile</p>
      </div>
    );
  }

  // Memoize user statistics calculations
  const stats = useMemo(
    () => calculateUserStats(user.address, tradeHistory, orderHistory, activeStreams),
    [user.address, tradeHistory, orderHistory, activeStreams]
  );

  // Memoize reputation calculations
  const reputationScore = useMemo(() => calculateReputation(stats), [stats]);
  const reputationLevel = useMemo(() => getReputationLevel(reputationScore), [reputationScore]);

  // Memoize trade counts
  const { buyerTrades, sellerTrades, recentTrades } = useMemo(() => {
    const buyer = tradeHistory.filter(
      (t) => t.buyer.toLowerCase() === user.address.toLowerCase()
    ).length;
    const seller = tradeHistory.filter(
      (t) => t.seller.toLowerCase() === user.address.toLowerCase()
    ).length;
    
    // Get recent trades (last 10)
    const recent = [...tradeHistory]
      .filter(
        (t) =>
          t.buyer.toLowerCase() === user.address.toLowerCase() ||
          t.seller.toLowerCase() === user.address.toLowerCase()
      )
      .sort((a, b) => b.executedAt - a.executedAt)
      .slice(0, 10);

    return { buyerTrades: buyer, sellerTrades: seller, recentTrades: recent };
  }, [tradeHistory, user.address]);

  return (
    <div className={styles.userProfile}>
      <InfoBox title="👤 User Profile" type="info">
        <p>
          Your <strong>Profile</strong> displays your reputation score, trading statistics, and activity history. 
          Reputation is calculated based on on-chain activity, trading volume, and account longevity.
        </p>
        <p><strong>Reputation Factors:</strong></p>
        <ul>
          <li><strong>On-Chain Activity (25%):</strong> Number of blockchain transactions</li>
          <li><strong>Trading Volume (25%):</strong> Total value of all trades</li>
          <li><strong>Account Longevity (20%):</strong> How long you've been active</li>
          <li><strong>Trade Frequency (15%):</strong> Regular trading activity</li>
          <li><strong>Average Trade Size (10%):</strong> Size of typical trades</li>
          <li><strong>Protocol Engagement (5%):</strong> Streams and orders created</li>
        </ul>
        <p>Higher reputation scores unlock better trading opportunities and lower risk premiums.</p>
      </InfoBox>

      {/* Profile Header */}
      <div className={styles.profileHeader}>
        <div className={styles.addressSection}>
          <div className={styles.addressLabel}>Wallet Address</div>
          <div className={styles.addressValue}>
            {user.address}
          </div>
        </div>

        <div className={styles.reputationSection}>
          <div className={styles.reputationScore}>
            <div className={styles.scoreValue}>{reputationScore}</div>
            <div className={styles.scoreLabel}>Reputation Score</div>
          </div>
          <div
            className={styles.reputationLevel}
            style={{
              color: reputationLevel.color,
              borderColor: reputationLevel.color,
              backgroundColor: `${reputationLevel.color}20`,
            }}
          >
            <span className={styles.levelLetter}>{reputationLevel.level}</span>
            <span className={styles.levelLabel}>{reputationLevel.label}</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Trades</div>
          <div className={styles.statValue}>{stats.totalTrades}</div>
          <div className={styles.statSubtext}>
            {buyerTrades} as buyer, {sellerTrades} as seller
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Volume</div>
          <div className={styles.statValue}>
            {stats.totalVolume.toFixed(2)} USDC
          </div>
          <div className={styles.statSubtext}>
            All-time trading volume
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>Average Trade Size</div>
          <div className={styles.statValue}>
            {stats.averageTradeSize.toFixed(2)} USDC
          </div>
          <div className={styles.statSubtext}>
            Per transaction
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>Trade Frequency</div>
          <div className={styles.statValue}>
            {stats.tradesPerMonth.toFixed(1)}
          </div>
          <div className={styles.statSubtext}>
            Trades per month
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>On-Chain Activity</div>
          <div className={styles.statValue}>
            {stats.onChainTxCount}
          </div>
          <div className={styles.statSubtext}>
            Total transactions
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>Account Age</div>
          <div className={styles.statValue}>
            {stats.accountAge > 0 ? `${stats.accountAge} days` : 'New'}
          </div>
          <div className={styles.statSubtext}>
            {stats.firstTxDate ? `Since ${stats.firstTxDate.toLocaleDateString()}` : 'No activity yet'}
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>Protocol Engagement</div>
          <div className={styles.statValue}>
            {stats.totalStreams + stats.totalOrders}
          </div>
          <div className={styles.statSubtext}>
            {stats.totalStreams} streams, {stats.totalOrders} orders
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>Order Completion Rate</div>
          <div className={styles.statValue}>
            {(stats.completionRate * 100).toFixed(1)}%
          </div>
          <div className={styles.statSubtext}>
            {stats.soldOrders} sold / {stats.totalOrders} total
          </div>
        </div>
      </div>

      {/* Trading Activity */}
      <div className={styles.activitySection}>
        <h3 className={styles.sectionTitle}>Trading Activity</h3>
        <div className={styles.activityGrid}>
          <div className={styles.activityItem}>
            <div className={styles.activityLabel}>Total Trades</div>
            <div className={styles.activityValue} style={{ color: 'var(--success)' }}>
              {stats.totalTrades}
            </div>
          </div>
          <div className={styles.activityItem}>
            <div className={styles.activityLabel}>Cancelled Orders</div>
            <div className={styles.activityValue} style={{ color: 'var(--error, #ff4444)' }}>
              {stats.cancelledOrders}
            </div>
          </div>
          <div className={styles.activityItem}>
            <div className={styles.activityLabel}>Sold Orders</div>
            <div className={styles.activityValue} style={{ color: 'var(--success)' }}>
              {stats.soldOrders}
            </div>
          </div>
        </div>
      </div>

      {/* Reputation Breakdown */}
      <div className={styles.breakdownSection}>
        <h3 className={styles.sectionTitle}>Reputation Breakdown</h3>
        <div className={styles.breakdownList}>
          <div className={styles.breakdownItem}>
            <div className={styles.breakdownLabel}>
              On-Chain Activity
              <span className={styles.breakdownWeight}>(25%)</span>
            </div>
            <div className={styles.breakdownBar}>
              <div
                className={styles.breakdownFill}
                style={{
                  width: `${Math.min((stats.onChainTxCount / 100) * 100, 100)}%`,
                  backgroundColor: 'var(--accent)',
                }}
              />
            </div>
            <div className={styles.breakdownValue}>
              {stats.onChainTxCount} transactions
            </div>
          </div>

          <div className={styles.breakdownItem}>
            <div className={styles.breakdownLabel}>
              Trading Volume
              <span className={styles.breakdownWeight}>(25%)</span>
            </div>
            <div className={styles.breakdownBar}>
              <div
                className={styles.breakdownFill}
                style={{
                  width: `${Math.min((Math.log10(stats.totalVolume + 1) / 5) * 100, 100)}%`,
                  backgroundColor: 'var(--success)',
                }}
              />
            </div>
            <div className={styles.breakdownValue}>
              {stats.totalVolume.toFixed(2)} USDC
            </div>
          </div>

          <div className={styles.breakdownItem}>
            <div className={styles.breakdownLabel}>
              Account Longevity
              <span className={styles.breakdownWeight}>(20%)</span>
            </div>
            <div className={styles.breakdownBar}>
              <div
                className={styles.breakdownFill}
                style={{
                  width: `${Math.min((stats.accountAge / 730) * 100, 100)}%`,
                  backgroundColor: 'var(--warning, #ffaa00)',
                }}
              />
            </div>
            <div className={styles.breakdownValue}>
              {stats.accountAge > 0 ? `${stats.accountAge} days` : 'New'}
            </div>
          </div>

          <div className={styles.breakdownItem}>
            <div className={styles.breakdownLabel}>
              Trade Frequency
              <span className={styles.breakdownWeight}>(15%)</span>
            </div>
            <div className={styles.breakdownBar}>
              <div
                className={styles.breakdownFill}
                style={{
                  width: `${Math.min((stats.tradesPerMonth / 10) * 100, 100)}%`,
                  backgroundColor: '#00e5ff',
                }}
              />
            </div>
            <div className={styles.breakdownValue}>
              {stats.tradesPerMonth.toFixed(1)} trades/month
            </div>
          </div>

          <div className={styles.breakdownItem}>
            <div className={styles.breakdownLabel}>
              Average Trade Size
              <span className={styles.breakdownWeight}>(10%)</span>
            </div>
            <div className={styles.breakdownBar}>
              <div
                className={styles.breakdownFill}
                style={{
                  width: `${Math.min((stats.averageTradeSize / 5000) * 100, 100)}%`,
                  backgroundColor: '#ff00ff',
                }}
              />
            </div>
            <div className={styles.breakdownValue}>
              {stats.averageTradeSize.toFixed(2)} USDC
            </div>
          </div>

          <div className={styles.breakdownItem}>
            <div className={styles.breakdownLabel}>
              Protocol Engagement
              <span className={styles.breakdownWeight}>(5%)</span>
            </div>
            <div className={styles.breakdownBar}>
              <div
                className={styles.breakdownFill}
                style={{
                  width: `${Math.min(((stats.totalStreams + stats.totalOrders) / 20) * 100, 100)}%`,
                  backgroundColor: '#00ff88',
                }}
              />
            </div>
            <div className={styles.breakdownValue}>
              {stats.totalStreams + stats.totalOrders} activities
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      {recentTrades.length > 0 && (
        <div className={styles.recentTransactions}>
          <h3 className={styles.sectionTitle}>Recent Transactions</h3>
          <div className={styles.transactionsList}>
            {recentTrades.map((trade) => {
              const isBuyer = trade.buyer.toLowerCase() === user.address.toLowerCase();
              const counterparty = isBuyer ? trade.seller : trade.buyer;
              
              return (
                <div key={trade.id} className={styles.transactionItem}>
                  <div className={styles.transactionType}>
                    <span className={isBuyer ? styles.buyBadge : styles.sellBadge}>
                      {isBuyer ? 'BUY' : 'SELL'}
                    </span>
                  </div>
                  <div className={styles.transactionDetails}>
                    <div className={styles.transactionAmount}>
                      {trade.price.toFixed(6)} USDC
                    </div>
                    <div className={styles.transactionInfo}>
                      {isBuyer ? 'Bought from' : 'Sold to'} {counterparty.slice(0, 6)}...{counterparty.slice(-4)}
                    </div>
                    <div className={styles.transactionDate}>
                      {new Date(trade.executedAt * 1000).toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;

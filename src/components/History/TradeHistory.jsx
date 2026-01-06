import React from 'react';
import { useVolt } from '../../context/VoltContext';
import InfoBox from '../Shared/InfoBox';
import styles from './TradeHistory.module.css';

/**
 * TradeHistory Component
 * 
 * Displays all completed trades (both as buyer and seller)
 */

const TradeHistory = () => {
  const { tradeHistory, user, activeStreams } = useVolt();

  if (!user.address) {
    return (
      <div className={styles.emptyState}>
        <p>Please connect your wallet to view your trade history</p>
      </div>
    );
  }

  // Filter user's trades (as buyer or seller)
  const userTrades = tradeHistory.filter(
    (trade) =>
      trade.buyer.toLowerCase() === user.address.toLowerCase() ||
      trade.seller.toLowerCase() === user.address.toLowerCase()
  );

  if (userTrades.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>No trade history</p>
        <p className={styles.emptySubtext}>
          Your completed trades will appear here
        </p>
      </div>
    );
  }

  return (
    <div className={styles.tradeHistory}>
      <InfoBox title="💱 Trade History" type="info">
        <p>
          View all your completed <strong>trades</strong> - both as a buyer and seller. 
          This shows every stream purchase and sale you've made on the marketplace.
        </p>
        <p><strong>Trade Types:</strong></p>
        <ul>
          <li><strong>As Buyer:</strong> Streams you purchased from other sellers</li>
          <li><strong>As Seller:</strong> Streams you sold to other buyers</li>
          <li><strong>Via Bid:</strong> Trades that were completed through the bid system</li>
        </ul>
        <p>Each trade shows the price, amount, counterparty, and execution time.</p>
      </InfoBox>

      <div className={styles.header}>
        <h2 className={styles.title}>Trade History</h2>
        <div className={styles.stats}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Total Trades:</span>
            <span className={styles.statValue}>{userTrades.length}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>As Buyer:</span>
            <span className={styles.statValue}>
              {userTrades.filter((t) => t.buyer.toLowerCase() === user.address.toLowerCase()).length}
            </span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>As Seller:</span>
            <span className={styles.statValue}>
              {userTrades.filter((t) => t.seller.toLowerCase() === user.address.toLowerCase()).length}
            </span>
          </div>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.tradeTable}>
          <thead>
            <tr>
              <th>Trade ID</th>
              <th>Stream ID</th>
              <th>Role</th>
              <th>Counterparty</th>
              <th>Amount</th>
              <th>Price</th>
              <th>Percentage</th>
              <th>Executed At</th>
            </tr>
          </thead>
          <tbody>
            {userTrades.map((trade) => {
              const stream = activeStreams.find((s) => s.id === trade.streamId);
              const isBuyer = trade.buyer.toLowerCase() === user.address.toLowerCase();
              const role = isBuyer ? 'Buyer' : 'Seller';
              const counterparty = isBuyer ? trade.seller : trade.buyer;

              return (
                <tr key={trade.id} className={styles.tradeRow}>
                  <td className={styles.tradeId}>#{trade.id.slice(-8)}</td>
                  <td className={styles.streamId}>
                    {stream ? `#${stream.id.slice(-8)}` : 'N/A'}
                  </td>
                  <td>
                    <span
                      className={styles.roleBadge}
                      style={{
                        color: isBuyer ? 'var(--success)' : 'var(--accent)',
                        borderColor: isBuyer ? 'var(--success)' : 'var(--accent)',
                        backgroundColor: isBuyer
                          ? 'rgba(0, 255, 0, 0.2)'
                          : 'rgba(0, 229, 255, 0.2)',
                      }}
                    >
                      {role}
                    </span>
                  </td>
                  <td className={styles.counterparty}>
                    {counterparty.slice(0, 6)}...{counterparty.slice(-4)}
                  </td>
                  <td className={styles.amount}>{trade.amount.toFixed(6)} USDC</td>
                  <td className={styles.price}>{trade.price.toFixed(6)} USDC</td>
                  <td>{trade.percentage}%</td>
                  <td className={styles.date}>
                    {new Date(trade.executedAt * 1000).toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TradeHistory;


import React, { useState } from 'react';
import { useVolt } from '../../context/VoltContext';
import InfoBox from '../Shared/InfoBox';
import styles from './OrderHistory.module.css';

/**
 * OrderHistory Component
 * 
 * Displays user's order history (listed, sold, cancelled)
 */

const OrderHistory = () => {
  const { orderHistory, user, activeStreams } = useVolt();
  const [filter, setFilter] = useState('all'); // 'all', 'listed', 'sold', 'cancelled'

  if (!user.address) {
    return (
      <div className={styles.emptyState}>
        <p>Please connect your wallet to view your order history</p>
      </div>
    );
  }

  // Filter user's orders
  const userOrders = orderHistory.filter(
    (order) => order.seller.toLowerCase() === user.address.toLowerCase()
  );

  // Apply status filter
  const filteredOrders = filter === 'all'
    ? userOrders
    : userOrders.filter((o) => o.status === filter);

  const getStatusColor = (status) => {
    switch (status) {
      case 'listed': return '#00e5ff';
      case 'sold': return '#00ff00';
      case 'cancelled': return '#ff4444';
      default: return '#888';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'listed': return 'Listed';
      case 'sold': return 'Sold';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  if (userOrders.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>No order history</p>
        <p className={styles.emptySubtext}>
          Your past orders will appear here
        </p>
      </div>
    );
  }

  return (
    <div className={styles.orderHistory}>
      <InfoBox title="📋 Order History" type="info">
        <p>
          View all your past <strong>sell orders</strong> and their status. 
          Track which orders were sold, cancelled, or are still listed.
        </p>
        <p><strong>Order Status:</strong></p>
        <ul>
          <li><strong>Listed:</strong> Order is currently active on the marketplace</li>
          <li><strong>Sold:</strong> Order was successfully purchased by a buyer</li>
          <li><strong>Cancelled:</strong> You cancelled the order before it was sold</li>
        </ul>
        <p>Use the filter to view orders by status, or see all orders at once.</p>
      </InfoBox>

      <div className={styles.header}>
        <h2 className={styles.title}>Order History</h2>
        <div className={styles.filters}>
          <button
            className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({userOrders.length})
          </button>
          <button
            className={`${styles.filterBtn} ${filter === 'listed' ? styles.active : ''}`}
            onClick={() => setFilter('listed')}
          >
            Listed ({userOrders.filter((o) => o.status === 'listed').length})
          </button>
          <button
            className={`${styles.filterBtn} ${filter === 'sold' ? styles.active : ''}`}
            onClick={() => setFilter('sold')}
          >
            Sold ({userOrders.filter((o) => o.status === 'sold').length})
          </button>
          <button
            className={`${styles.filterBtn} ${filter === 'cancelled' ? styles.active : ''}`}
            onClick={() => setFilter('cancelled')}
          >
            Cancelled ({userOrders.filter((o) => o.status === 'cancelled').length})
          </button>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.historyTable}>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Stream ID</th>
              <th>Percentage</th>
              <th>Price Ratio</th>
              <th>Risk Score</th>
              <th>Status</th>
              <th>Listed At</th>
              <th>Completed At</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order) => {
              const stream = activeStreams.find((s) => s.id === order.streamId);
              const statusColor = getStatusColor(order.status);

              return (
                <tr key={order.id} className={styles.historyRow}>
                  <td className={styles.orderId}>#{order.id.slice(-8)}</td>
                  <td className={styles.streamId}>
                    {stream ? `#${stream.id.slice(-8)}` : 'N/A'}
                  </td>
                  <td>{order.percentage}%</td>
                  <td>{(order.priceRatio * 100).toFixed(1)}%</td>
                  <td>
                    <span className={styles.riskScore}>
                      {order.riskScore}/100 ({order.riskLevel})
                    </span>
                  </td>
                  <td>
                    <span
                      className={styles.statusBadge}
                      style={{
                        color: statusColor,
                        borderColor: statusColor,
                        backgroundColor: `${statusColor}20`,
                      }}
                    >
                      {getStatusLabel(order.status)}
                    </span>
                  </td>
                  <td className={styles.date}>
                    {new Date(order.listedAt * 1000).toLocaleString()}
                  </td>
                  <td className={styles.date}>
                    {order.soldAt
                      ? new Date(order.soldAt * 1000).toLocaleString()
                      : order.cancelledAt
                      ? new Date(order.cancelledAt * 1000).toLocaleString()
                      : '-'}
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

export default OrderHistory;


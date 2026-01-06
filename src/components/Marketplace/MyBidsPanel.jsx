import React from 'react';
import { useVolt } from '../../context/VoltContext';
import styles from './MyBidsPanel.module.css';

/**
 * MyBidsPanel Component
 * 
 * Displays user's bids (pending, accepted, rejected, cancelled)
 */

const MyBidsPanel = () => {
  const { bids, orderBook, activeStreams, user, cancelBid, toast } = useVolt();

  if (!user.address) {
    return (
      <div className={styles.emptyState}>
        <p>Please connect your wallet to view your bids</p>
      </div>
    );
  }

  // Filter user's bids
  const userBids = bids.filter(
    (bid) => bid.bidder.toLowerCase() === user.address.toLowerCase()
  );

  // Filter by status
  const pendingBids = userBids.filter((b) => b.status === 'pending');
  const acceptedBids = userBids.filter((b) => b.status === 'accepted');
  const rejectedBids = userBids.filter((b) => b.status === 'rejected');
  const cancelledBids = userBids.filter((b) => b.status === 'cancelled');

  const handleCancelBid = (bidId) => {
    if (!window.confirm('Are you sure you want to cancel this bid?')) {
      return;
    }

    try {
      cancelBid(bidId);
      toast.success('Bid cancelled successfully');
    } catch (error) {
      console.error('Cancel bid error:', error);
      toast.error(`Error: ${error.message}`);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#ffaa00';
      case 'accepted': return '#00ff00';
      case 'rejected': return '#ff4444';
      case 'cancelled': return '#888';
      default: return '#888';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'accepted': return 'Accepted';
      case 'rejected': return 'Rejected';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const renderBidRow = (bid) => {
    const order = orderBook.find((o) => o.id === bid.orderId);
    const stream = order ? activeStreams.find((s) => s.id === order.streamId) : null;

    return (
      <tr key={bid.id} className={styles.bidRow}>
        <td className={styles.bidId}>#{bid.id.slice(-8)}</td>
        <td className={styles.orderId}>
          {order ? `#${order.id.slice(-8)}` : 'Order not found'}
        </td>
        <td className={styles.streamId}>
          {stream ? `#${stream.id.slice(-8)}` : 'N/A'}
        </td>
        <td className={styles.amount}>{bid.amount.toFixed(6)} USDC</td>
        <td className={styles.discount}>{bid.discount.toFixed(1)}%</td>
        <td className={styles.status}>
          <span
            className={styles.statusBadge}
            style={{
              color: getStatusColor(bid.status),
              borderColor: getStatusColor(bid.status),
              backgroundColor: `${getStatusColor(bid.status)}20`,
            }}
          >
            {getStatusLabel(bid.status)}
          </span>
        </td>
        <td className={styles.createdAt}>
          {new Date(bid.createdAt * 1000).toLocaleString()}
        </td>
        <td className={styles.actions}>
          {bid.status === 'pending' && (
            <button
              className={styles.cancelButton}
              onClick={() => handleCancelBid(bid.id)}
            >
              Cancel
            </button>
          )}
        </td>
      </tr>
    );
  };

  if (userBids.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>You haven't placed any bids yet</p>
        <p className={styles.emptySubtext}>
          Place a bid on an order to get started
        </p>
      </div>
    );
  }

  return (
    <div className={styles.myBidsPanel}>
      <div className={styles.header}>
        <h2 className={styles.title}>My Bids</h2>
        <div className={styles.stats}>
          <span className={styles.statItem}>
            <span className={styles.statLabel}>Pending:</span>
            <span className={styles.statValue}>{pendingBids.length}</span>
          </span>
          <span className={styles.statItem}>
            <span className={styles.statLabel}>Accepted:</span>
            <span className={styles.statValue}>{acceptedBids.length}</span>
          </span>
          <span className={styles.statItem}>
            <span className={styles.statLabel}>Rejected:</span>
            <span className={styles.statValue}>{rejectedBids.length}</span>
          </span>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.bidsTable}>
          <thead>
            <tr>
              <th>Bid ID</th>
              <th>Order ID</th>
              <th>Stream ID</th>
              <th>Amount</th>
              <th>Discount</th>
              <th>Status</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {userBids.map(renderBidRow)}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MyBidsPanel;


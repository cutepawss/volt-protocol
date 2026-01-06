import React from 'react';
import { useVolt } from '../../context/VoltContext';
import styles from './OrderBidsPanel.module.css';

/**
 * OrderBidsPanel Component
 * 
 * Displays bids on a specific order (for sellers to view and accept/reject)
 */

const OrderBidsPanel = ({ orderId, onClose }) => {
  const { bids, orderBook, activeStreams, user, acceptBid, rejectBid, toast } = useVolt();

  if (!orderId) return null;

  const order = orderBook.find((o) => o.id === orderId);
  if (!order) return null;

  // Check if user is the seller
  const isSeller = user.address && order.seller.toLowerCase() === user.address.toLowerCase();

  // Get all pending bids for this order
  const orderBids = bids.filter(
    (bid) => bid.orderId === orderId && bid.status === 'pending'
  );

  const handleAcceptBid = (bidId) => {
    if (!window.confirm('Are you sure you want to accept this bid?')) {
      return;
    }

    try {
      acceptBid(bidId);
      toast.success('Bid accepted! Trade executed successfully.');
      if (onClose) onClose();
    } catch (error) {
      console.error('Accept bid error:', error);
      toast.error(`Error: ${error.message}`);
    }
  };

  const handleRejectBid = (bidId) => {
    if (!window.confirm('Are you sure you want to reject this bid?')) {
      return;
    }

    try {
      rejectBid(bidId);
      toast.success('Bid rejected');
    } catch (error) {
      console.error('Reject bid error:', error);
      toast.error(`Error: ${error.message}`);
    }
  };

  if (!isSeller) {
    return (
      <div className={styles.emptyState}>
        <p>Only the seller can view bids on this order</p>
      </div>
    );
  }

  if (orderBids.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>No pending bids on this order</p>
      </div>
    );
  }

  return (
    <div className={styles.orderBidsPanel}>
      <div className={styles.header}>
        <h3 className={styles.title}>Pending Bids on Order #{order.id.slice(-8)}</h3>
        <button className={styles.closeButton} onClick={onClose}>
          ×
        </button>
      </div>

      <div className={styles.bidsList}>
        {orderBids.map((bid) => (
          <div key={bid.id} className={styles.bidCard}>
            <div className={styles.bidHeader}>
              <div className={styles.bidId}>Bid #{bid.id.slice(-8)}</div>
              <div className={styles.bidDate}>
                {new Date(bid.createdAt * 1000).toLocaleString()}
              </div>
            </div>

            <div className={styles.bidDetails}>
              <div className={styles.bidDetailRow}>
                <span className={styles.label}>Bidder:</span>
                <span className={styles.value} style={{ fontFamily: 'JetBrains Mono' }}>
                  {bid.bidder.slice(0, 6)}...{bid.bidder.slice(-4)}
                </span>
              </div>
              <div className={styles.bidDetailRow}>
                <span className={styles.label}>Amount:</span>
                <span className={styles.value} style={{ fontWeight: 600 }}>
                  {bid.amount.toFixed(6)} USDC
                </span>
              </div>
              <div className={styles.bidDetailRow}>
                <span className={styles.label}>Discount:</span>
                <span className={styles.value} style={{ color: 'var(--success)' }}>
                  {bid.discount.toFixed(1)}%
                </span>
              </div>
              <div className={styles.bidDetailRow}>
                <span className={styles.label}>Price Ratio:</span>
                <span className={styles.value}>
                  {(bid.priceRatio * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            <div className={styles.bidActions}>
              <button
                className={styles.acceptButton}
                onClick={() => handleAcceptBid(bid.id)}
              >
                Accept Bid
              </button>
              <button
                className={styles.rejectButton}
                onClick={() => handleRejectBid(bid.id)}
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrderBidsPanel;


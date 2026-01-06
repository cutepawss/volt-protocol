import React from 'react';
import { useLiveStreamPrice } from '../../hooks/useLiveStreamPrice';
import styles from './OrderDetailModal.module.css';

/**
 * OrderDetailModal Component
 * 
 * Displays detailed information about a marketplace order
 */

const OrderDetailModal = ({ order, stream, onClose, onBuyNow, onPlaceBid, onCancelOrder, isOwnOrder }) => {
  if (!order || !stream) return null;

  const { remainingBalance, timeRemaining, formattedBalance } = 
    useLiveStreamPrice(stream, 0, true);

  // Calculate progress
  const now = Math.floor(Date.now() / 1000);
  const elapsed = Math.max(0, now - stream.startTime);
  const progress = stream.duration > 0 ? (elapsed / stream.duration) * 100 : 0;
  const progressPercent = Math.min(100, Math.max(0, progress));

  // Calculate time remaining
  const daysRemaining = Math.floor(timeRemaining / (60 * 60 * 24));
  const hoursRemaining = Math.floor((timeRemaining % (60 * 60 * 24)) / (60 * 60));
  const minutesRemaining = Math.floor((timeRemaining % (60 * 60)) / 60);
  const totalDurationDays = Math.floor(stream.duration / (60 * 60 * 24));

  // Calculate rates
  const ratePerSecond = stream.duration > 0 ? stream.totalDeposit / stream.duration : 0;
  const ratePerDay = ratePerSecond * 60 * 60 * 24;

  // Calculate order values
  const orderValue = (remainingBalance * order.percentage) / 100;
  const orderPrice = orderValue * order.priceRatio;
  const discount = ((1 - order.priceRatio) * 100).toFixed(1);

  // Risk score styling
  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
      case 'A': return '#00ff00';
      case 'B': return '#00e5ff';
      case 'C': return '#ffaa00';
      case 'D': return '#ff4444';
      default: return '#888';
    }
  };

  const riskColor = getRiskColor(order.riskLevel);

  // Format dates
  const startDate = new Date(stream.startTime * 1000);
  const endDate = new Date((stream.startTime + stream.duration) * 1000);
  const listedDate = new Date(order.listedAt * 1000);

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>
          ×
        </button>

        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Order Details</h2>
          <div className={styles.orderId}>Order #{order.id.slice(-8)}</div>
        </div>

        <div className={styles.modalBody}>
          {/* Order Summary */}
          <div className={styles.summarySection}>
            <div className={styles.summaryGrid}>
              <div className={styles.summaryCard}>
                <div className={styles.summaryLabel}>Order Amount</div>
                <div className={styles.summaryValue}>
                  {orderValue.toFixed(6)} USDC
                </div>
                <div className={styles.summarySubtext}>{order.percentage}% of stream</div>
              </div>

              <div className={styles.summaryCard}>
                <div className={styles.summaryLabel}>Price</div>
                <div className={styles.summaryValue} style={{ color: 'var(--accent)' }}>
                  {orderPrice.toFixed(6)} USDC
                </div>
                <div className={styles.summarySubtext}>{(parseFloat(order.priceRatio) * 100).toFixed(1)}% of face value</div>
              </div>

              <div className={styles.summaryCard}>
                <div className={styles.summaryLabel}>Discount</div>
                <div className={styles.summaryValue} style={{ color: 'var(--success)' }}>
                  {discount}%
                </div>
              </div>

              <div className={styles.summaryCard}>
                <div className={styles.summaryLabel}>Risk Score</div>
                <div 
                  className={styles.summaryValue}
                  style={{ color: riskColor }}
                >
                  {order.riskScore}/100 ({order.riskLevel})
                </div>
                {order.confidence && (
                  <div className={styles.summarySubtext}>Confidence: {order.confidence}</div>
                )}
              </div>
            </div>
          </div>

          {/* Stream Information */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Stream Information</h3>
            <div className={styles.infoGrid}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Stream ID</span>
                <span className={styles.infoValue} style={{ fontFamily: 'JetBrains Mono' }}>
                  #{stream.id.slice(-8)}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Total Deposit</span>
                <span className={styles.infoValue}>
                  {stream.totalDeposit.toFixed(6)} USDC
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Remaining Balance</span>
                <span className={styles.infoValue} style={{ color: 'var(--accent)' }}>
                  {formattedBalance} USDC
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Flowed Amount</span>
                <span className={styles.infoValue} style={{ color: 'var(--success)' }}>
                  {stream.flowedAmount.toFixed(6)} USDC
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Progress</span>
                <span className={styles.infoValue}>
                  {progressPercent.toFixed(2)}%
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Total Duration</span>
                <span className={styles.infoValue}>
                  {totalDurationDays} days
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Time Remaining</span>
                <span className={styles.infoValue}>
                  {daysRemaining > 0 && `${daysRemaining}d `}
                  {hoursRemaining > 0 && `${hoursRemaining}h `}
                  {minutesRemaining > 0 && `${minutesRemaining}m`}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Rate per Day</span>
                <span className={styles.infoValue} style={{ fontFamily: 'JetBrains Mono' }}>
                  {ratePerDay.toFixed(6)} USDC/day
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Start Date</span>
                <span className={styles.infoValue}>
                  {startDate.toLocaleString()}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>End Date</span>
                <span className={styles.infoValue}>
                  {endDate.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Seller Information */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Seller Information</h3>
            <div className={styles.infoGrid}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Seller Address</span>
                <span className={styles.infoValue} style={{ fontFamily: 'JetBrains Mono', fontSize: '0.85rem' }}>
                  {order.seller}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Listed At</span>
                <span className={styles.infoValue}>
                  {listedDate.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          {isOwnOrder ? (
            <div className={styles.actionsSection}>
              <button
                className={styles.actionButtonCancel}
                onClick={() => {
                  if (window.confirm('Are you sure you want to cancel this order?')) {
                    onCancelOrder();
                    onClose();
                  }
                }}
              >
                Cancel Order
              </button>
            </div>
          ) : (
            <div className={styles.actionsSection}>
              <button
                className={styles.actionButtonPrimary}
                onClick={() => {
                  onBuyNow();
                  onClose();
                }}
              >
                Buy Now
              </button>
              <button
                className={styles.actionButtonSecondary}
                onClick={() => {
                  onPlaceBid();
                  onClose();
                }}
              >
                Place Bid
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderDetailModal;


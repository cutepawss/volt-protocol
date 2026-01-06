import React, { useState, useEffect } from 'react';
import { useLiveStreamPrice } from '../../hooks/useLiveStreamPrice';
import styles from './OrderBookRow.module.css';

/**
 * OrderBookRow Component
 * 
 * Displays a single order row with:
 * - Real-time stream progress bar
 * - AI risk score badge
 * - Live price updates (every second)
 * - Buy Now and Place Bid buttons
 */

const OrderBookRow = ({ order, stream, onBuyNow, onPlaceBid, onViewDetails, onCancelOrder, onViewBids, isOwnOrder }) => {
  // Calculate real-time price using custom hook
  const { currentPrice, remainingBalance, timeRemaining, formattedPrice, formattedBalance } = 
    useLiveStreamPrice(stream, order.priceRatio, true);

  // Calculate stream progress
  const progress = stream.duration > 0 
    ? ((Date.now() / 1000 - stream.startTime) / stream.duration) * 100 
    : 0;
  const progressPercent = Math.min(100, Math.max(0, progress));

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
  const discount = ((1 - order.priceRatio) * 100).toFixed(1);

  // Calculate order value based on percentage
  const orderValue = (remainingBalance * order.percentage) / 100;
  const orderPrice = orderValue * order.priceRatio;

  // Calculate duration
  const totalDurationDays = Math.floor(stream.duration / (60 * 60 * 24));
  const daysRemaining = Math.floor(timeRemaining / (60 * 60 * 24));
  const hoursRemaining = Math.floor((timeRemaining % (60 * 60 * 24)) / (60 * 60));

  return (
    <tr 
      className={styles.orderRow}
      onClick={() => onViewDetails && onViewDetails()}
      style={{ cursor: 'pointer' }}
    >
      <td className={styles.sellerCell}>
        <div className={styles.address}>
          {order.seller.slice(0, 6)}...{order.seller.slice(-4)}
        </div>
      </td>
      
      <td className={styles.progressCell}>
        <div className={styles.progressContainer}>
          <div className={styles.progressBarWrapper}>
            <div 
              className={styles.progressBar}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className={styles.progressText}>
            {progressPercent.toFixed(1)}%
          </div>
        </div>
      </td>

      <td className={styles.riskCell}>
        <div 
          className={styles.riskBadge}
          style={{
            backgroundColor: `${riskColor}20`,
            color: riskColor,
            borderColor: riskColor,
          }}
        >
          {order.riskScore}/100 ({order.riskLevel})
        </div>
      </td>

      <td className={styles.amountCell}>
        <div className={styles.amountValue}>
          {formattedBalance} USDC
        </div>
        <div className={styles.amountSubtext}>
          {order.percentage}% of stream
        </div>
      </td>

      <td className={styles.priceCell}>
        <div className={styles.priceValue}>
          {formattedPrice} USDC
        </div>
        <div className={styles.priceSubtext}>
          Updates every second
        </div>
      </td>

      <td className={styles.orderPriceCell}>
        <div className={styles.orderPriceValue}>
          {orderPrice.toFixed(6)} USDC
        </div>
      </td>

      <td className={styles.discountCell}>
        <div className={styles.discountValue}>
          {discount}%
        </div>
      </td>

      <td className={styles.durationCell}>
        <div className={styles.durationValue}>
          {daysRemaining > 0 ? `${daysRemaining}d` : `${hoursRemaining}h`}
        </div>
        <div className={styles.durationSubtext}>
          of {totalDurationDays}d
        </div>
      </td>

      <td className={styles.actionsCell}>
        {isOwnOrder ? (
          <div className={styles.ownOrderActions} onClick={(e) => e.stopPropagation()}>
            <button
              className={styles['btn-view-bids']}
              onClick={(e) => {
                e.stopPropagation();
                if (onViewBids) onViewBids();
              }}
            >
              View Bids
            </button>
            <button
              className={styles['btn-cancel']}
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm('Are you sure you want to cancel this order?')) {
                  onCancelOrder();
                }
              }}
            >
              Cancel Order
            </button>
          </div>
        ) : (
          <div className={styles.actionButtons} onClick={(e) => e.stopPropagation()}>
            <button
              className={styles['btn-buy-now']}
              onClick={(e) => {
                e.stopPropagation();
                onBuyNow();
              }}
            >
              Buy Now
            </button>
            <button
              className={styles['btn-bid']}
              onClick={(e) => {
                e.stopPropagation();
                onPlaceBid();
              }}
            >
              <span>Place Bid</span>
            </button>
          </div>
        )}
      </td>
    </tr>
  );
};

export default OrderBookRow;


import React from 'react';
import { useVolt } from '../../context/VoltContext';
import styles from './MyOrdersPanel.module.css';

/**
 * MyOrdersPanel Component
 * Shows user's active sell orders
 */

const MyOrdersPanel = ({ onViewBids, onCancelOrder }) => {
  const { orderBook, user, activeStreams, bids } = useVolt();

  // Filter user's own orders
  const myOrders = orderBook.filter(
    (order) => order.isActive && user.address && 
    order.seller.toLowerCase() === user.address.toLowerCase()
  );

  if (myOrders.length === 0) {
    return (
      <div className={styles.panel}>
        <h3 className={styles.panelTitle}>My Sell Orders</h3>
        <div className={styles.emptyState}>
          <p>You don't have any active sell orders</p>
          <p className={styles.emptySubtext}>
            Create a sell order to start trading
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <h3 className={styles.panelTitle}>
        My Sell Orders ({myOrders.length})
      </h3>
      <div className={styles.ordersList}>
        {myOrders.map((order) => {
          const stream = activeStreams.find((s) => s.id === order.streamId);
          const orderBids = bids.filter((bid) => bid.orderId === order.id);
          
          return (
            <div key={order.id} className={styles.orderCard}>
              <div className={styles.orderHeader}>
                <div className={styles.orderInfo}>
                  <span className={styles.orderId}>Order #{order.id}</span>
                  <span className={styles.streamId}>Stream #{order.streamId}</span>
                </div>
                <div className={styles.riskBadge} data-risk={order.riskLevel}>
                  {order.riskLevel}
                </div>
              </div>

              <div className={styles.orderStats}>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>Price</span>
                  <span className={styles.statValue}>
                    {order.price.toFixed(6)} vUSDC
                  </span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>Discount</span>
                  <span className={styles.statValue}>
                    {((1 - order.priceRatio) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>Amount</span>
                  <span className={styles.statValue}>
                    {order.amountRemaining.toFixed(6)} vUSDC
                  </span>
                </div>
                {stream && (
                  <div className={styles.stat}>
                    <span className={styles.statLabel}>Stream Value</span>
                    <span className={styles.statValue}>
                      {stream.remainingBalance.toFixed(6)} vUSDC
                    </span>
                  </div>
                )}
              </div>

              {orderBids.length > 0 && (
                <div className={styles.bidsInfo}>
                  <span className={styles.bidsCount}>
                    🎯 {orderBids.length} bid{orderBids.length > 1 ? 's' : ''} received
                  </span>
                  <button
                    className={styles.viewBidsBtn}
                    onClick={() => onViewBids(order.id)}
                  >
                    View Bids
                  </button>
                </div>
              )}

              <div className={styles.orderActions}>
                <button
                  className={styles.btnCancel}
                  onClick={() => onCancelOrder(order.id)}
                >
                  Cancel Order
                </button>
                <button
                  className={styles.btnDetails}
                  onClick={() => onViewBids(order.id)}
                >
                  Manage
                </button>
              </div>

              <div className={styles.orderFooter}>
                <span className={styles.listedTime}>
                  Listed {new Date(order.listedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MyOrdersPanel;
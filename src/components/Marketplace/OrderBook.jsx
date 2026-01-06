import React, { useState, useEffect, useMemo } from 'react';
import { useVolt } from '../../context/VoltContext';
import { useDebounce } from '../../hooks/useDebounce';
import OrderBookRow from './OrderBookRow';
import CreateOrderForm from './CreateOrderForm';
import OrderDetailModal from './OrderDetailModal';
import MyBidsPanel from './MyBidsPanel';
import OrderBidsPanel from './OrderBidsPanel';
import InfoBox from '../Shared/InfoBox';
import styles from './OrderBook.module.css';

/**
 * OrderBook Component - Main Marketplace View
 * 
 * Displays:
 * - Table of all active sell orders
 * - Real-time price updates (every second)
 * - Buy Now and Place Bid actions
 * - Create new sell order form
 */

const OrderBook = () => {
  const { orderBook, activeStreams, user, buyStream, cancelOrder, placeBid, bids, toast } = useVolt();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState(null);
  const [selectedOrderForBids, setSelectedOrderForBids] = useState(null);
  const [bidModalOpen, setBidModalOpen] = useState(false);
  const [bidAmount, setBidAmount] = useState('');
  const [bidPrice, setBidPrice] = useState('');
  
  // Filter and search state
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('all'); // 'all' | 'A' | 'B' | 'C' | 'D'
  const [sortBy, setSortBy] = useState('price'); // 'price' | 'risk' | 'time' | 'value'

  // Debounce search query to avoid excessive filtering
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Memoize filtered and sorted orders for performance
  const activeOrders = useMemo(() => {
  
  // Filter active orders
  let filtered = orderBook.filter((order) => {
    const stream = activeStreams.find((s) => s.id === order.streamId);
    return stream && stream.remainingBalance > 0;
  });

    // Apply search filter
    if (debouncedSearchQuery) {
      filtered = filtered.filter((order) => {
        const stream = activeStreams.find((s) => s.id === order.streamId);
        const searchLower = debouncedSearchQuery.toLowerCase();
        return (
          order.id.toLowerCase().includes(searchLower) ||
          order.seller.toLowerCase().includes(searchLower) ||
          (stream && stream.id.toLowerCase().includes(searchLower))
        );
      });
    }

    // Apply risk filter
    if (riskFilter !== 'all') {
      filtered = filtered.filter((order) => order.riskLevel === riskFilter);
    }

    // Apply sorting
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return (b.impliedValue || 0) - (a.impliedValue || 0); // Highest price first
        case 'risk':
          return a.riskScore - b.riskScore; // Lowest risk first
        case 'time':
          return b.listedAt - a.listedAt; // Newest first
        case 'value':
          return (b.impliedValue || 0) - (a.impliedValue || 0); // Highest value first
        default:
          return 0;
      }
    });
  }, [orderBook, activeStreams, debouncedSearchQuery, riskFilter, sortBy]);

  // Handle Buy Now
  const handleBuyNow = async (orderId) => {
    if (!user.address) {
      toast.error('Please connect your wallet first');
      return;
    }

    try {
      toast.info('Processing purchase...');
      const result = await buyStream(orderId);
      
      toast.success(`Stream purchased successfully! Price: ${result.purchasePrice.toFixed(6)} vUSDC`);
    } catch (error) {
      console.error('Buy error:', error);
      toast.error(`Error: ${error.message}`);
    }
  };

  // Handle Place Bid
  const handlePlaceBid = (order) => {
    setSelectedOrder(order);
    setBidPrice(((1 - order.priceRatio) * 100).toFixed(1)); // Pre-fill with current discount
    setBidModalOpen(true);
  };

  // Handle View Details
  const handleViewDetails = (order) => {
    setSelectedOrderForDetail(order);
  };

  // Handle Cancel Order
  const handleCancelOrder = (orderId) => {
    try {
      cancelOrder(orderId);
      toast.success('Order cancelled successfully');
    } catch (error) {
      console.error('Cancel error:', error);
      toast.error(`Error: ${error.message}`);
    }
  };

  // Handle View Bids
  const handleViewBids = (orderId) => {
    setSelectedOrderForBids(orderId);
  };

  const handleBidSubmit = () => {
    if (!bidAmount || !bidPrice) {
      toast.error('Please fill in all fields');
      return;
    }

    if (!selectedOrder) {
      toast.error('No order selected');
      return;
    }

    try {
      placeBid(selectedOrder.id, bidAmount, bidPrice);
      toast.success(`Bid placed successfully! Amount: ${bidAmount} vUSDC, Discount: ${bidPrice}%`);
      setBidModalOpen(false);
      setSelectedOrder(null);
      setBidAmount('');
      setBidPrice('');
    } catch (error) {
      console.error('Bid error:', error);
      toast.error(`Error: ${error.message}`);
    }
  };

  return (
    <div className={styles.orderBookContainer}>
      {/* Info Box */}
      <InfoBox title="🏪 Stream Marketplace" type="info">
        <p>
          The <strong>Marketplace</strong> is where you can buy and sell stream shares. 
          Stream owners can list their streams for sale, and buyers can purchase them at discounted prices.
        </p>
        <p><strong>How to use:</strong></p>
        <ul>
          <li><strong>Create Sell Order:</strong> List your stream shares with a price and percentage. The AI risk engine automatically calculates risk scores.</li>
          <li><strong>Buy Now:</strong> Purchase streams instantly at the listed price.</li>
          <li><strong>Place Bid:</strong> Make an offer below the asking price. Sellers can accept or reject your bid.</li>
          <li><strong>Filter & Search:</strong> Use filters to find streams by risk level, price, or search by order ID.</li>
        </ul>
        <p>
          💡 <strong>Tip:</strong> Lower risk scores (A/B) indicate safer investments. Higher discounts may come with higher risk.
        </p>
      </InfoBox>

      {/* Create Order Form */}
      <div className={styles.createOrderSection}>
        <CreateOrderForm />
      </div>

      {/* Order Book Table */}
      <div className={styles.tableSection}>
        <div className={styles.tableHeader}>
          <h2 className={styles.tableTitle}>
            Active Sell Orders ({activeOrders.length})
          </h2>
          <div className={styles.liveIndicator}>
            <span className={styles.liveDot}></span>
            Live Updates
          </div>
        </div>

        {/* Filters and Search */}
        <div className={styles.filtersSection}>
          <div className={styles.searchBox}>
            <input
              type="text"
              placeholder="Search by order ID, seller, or stream..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
              aria-label="Search orders"
            />
          </div>
          
          <div className={styles.filtersRow}>
            <div className={styles.filterGroup}>
              <label htmlFor="riskFilter" className={styles.filterLabel}>Risk Level:</label>
              <select
                id="riskFilter"
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className={styles.filterSelect}
                aria-label="Filter by risk level"
              >
                <option value="all">All Levels</option>
                <option value="A">A (Low Risk)</option>
                <option value="B">B (Medium-Low Risk)</option>
                <option value="C">C (Medium-High Risk)</option>
                <option value="D">D (High Risk)</option>
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label htmlFor="sortBy" className={styles.filterLabel}>Sort By:</label>
              <select
                id="sortBy"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className={styles.filterSelect}
                aria-label="Sort orders"
              >
                <option value="price">Price (High to Low)</option>
                <option value="risk">Risk (Low to High)</option>
                <option value="time">Time (Newest First)</option>
                <option value="value">Value (High to Low)</option>
              </select>
            </div>

            {(searchQuery || riskFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setRiskFilter('all');
                }}
                className={styles.clearFilters}
                aria-label="Clear all filters"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {activeOrders.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No active sell orders available</p>
            <p className={styles.emptySubtext}>
              Create a sell order to get started
            </p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.orderTable}>
              <thead>
                <tr>
                  <th>Seller</th>
                  <th>Stream Progress</th>
                  <th>AI Risk Score</th>
                  <th>Amount Remaining</th>
                  <th>Real-Time Value</th>
                  <th>Price (vUSDC)</th>
                  <th>Discount %</th>
                  <th>Time Remaining</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeOrders.map((order) => {
                  const stream = activeStreams.find((s) => s.id === order.streamId);
                  if (!stream) return null;

                  return (
                    <OrderBookRow
                      key={order.id}
                      order={order}
                      stream={stream}
                      onBuyNow={() => handleBuyNow(order.id)}
                      onPlaceBid={() => handlePlaceBid(order)}
                      onViewDetails={() => handleViewDetails(order)}
                      onCancelOrder={() => handleCancelOrder(order.id)}
                      onViewBids={() => handleViewBids(order.id)}
                      isOwnOrder={user.address && order.seller.toLowerCase() === user.address.toLowerCase()}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* My Bids Panel */}
      <MyBidsPanel />

      {/* Order Bids Panel (for sellers) */}
      {selectedOrderForBids && (
        <OrderBidsPanel
          orderId={selectedOrderForBids}
          onClose={() => setSelectedOrderForBids(null)}
        />
      )}

      {/* Order Detail Modal */}
      {selectedOrderForDetail && (
        <OrderDetailModal
          order={selectedOrderForDetail}
          stream={activeStreams.find((s) => s.id === selectedOrderForDetail.streamId)}
          onClose={() => setSelectedOrderForDetail(null)}
          onBuyNow={() => {
            handleBuyNow(selectedOrderForDetail.id);
            setSelectedOrderForDetail(null);
          }}
          onPlaceBid={() => {
            handlePlaceBid(selectedOrderForDetail);
            setSelectedOrderForDetail(null);
          }}
          onCancelOrder={() => {
            handleCancelOrder(selectedOrderForDetail.id);
            setSelectedOrderForDetail(null);
          }}
          isOwnOrder={user.address && selectedOrderForDetail.seller.toLowerCase() === user.address.toLowerCase()}
        />
      )}

      {/* Bid Modal */}
      {bidModalOpen && selectedOrder && (
        <div className={styles.modalOverlay} onClick={() => setBidModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button
              className={styles.modalClose}
              onClick={() => setBidModalOpen(false)}
            >
              ×
            </button>
            <h3 className={styles.modalTitle}>Place Bid</h3>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>Amount (vUSDC)</label>
                <input
                  type="number"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.000001"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Discount (%)</label>
                <input
                  type="number"
                  value={bidPrice}
                  onChange={(e) => setBidPrice(e.target.value)}
                  placeholder="10.0"
                  step="0.1"
                  min="0"
                  max="100"
                />
                <small>Current: {((1 - selectedOrder.priceRatio) * 100).toFixed(1)}%</small>
              </div>
              <div className={styles.modalActions}>
                <button
                  className={styles.btnSecondary}
                  onClick={() => setBidModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className={styles.btnPrimary}
                  onClick={handleBidSubmit}
                >
                  Place Bid
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderBook;


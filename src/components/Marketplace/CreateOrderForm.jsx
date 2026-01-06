import React, { useState } from 'react';
import { useVolt } from '../../context/VoltContext';
import styles from './CreateOrderForm.module.css';

/**
 * CreateOrderForm Component
 * 
 * Allows users to create new sell orders for their streams
 */

const CreateOrderForm = () => {
  const { activeStreams, user, listStreamForSale, toast } = useVolt();
  const [selectedStreamId, setSelectedStreamId] = useState('');
  const [percentage, setPercentage] = useState('');
  const [priceRatio, setPriceRatio] = useState('0.95');
  const [loading, setLoading] = useState(false);

  // Filter streams owned by user
  const userStreams = activeStreams.filter(
    (stream) => user.address && stream.receiver.toLowerCase() === user.address.toLowerCase()
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user.address) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!selectedStreamId || !percentage || !priceRatio) {
      toast.error('Please fill in all fields');
      return;
    }

    const percentageNum = parseFloat(percentage);
    const priceRatioNum = parseFloat(priceRatio);

    // Validate that values are numbers
    if (isNaN(percentageNum) || isNaN(priceRatioNum)) {
      toast.error('Please enter valid numbers');
      return;
    }

    if (percentageNum <= 0 || percentageNum > 100) {
      toast.error('Percentage must be between 0 and 100');
      return;
    }

    if (priceRatioNum <= 0 || priceRatioNum > 1) {
      toast.error('Price ratio must be between 0 and 1 (e.g., 0.95 = 95%)');
      return;
    }

    // Validate that selected stream has enough balance
    const selectedStream = activeStreams.find((s) => s.id === selectedStreamId);
    if (selectedStream) {
      const orderAmount = (selectedStream.remainingBalance * percentageNum) / 100;
      if (orderAmount > selectedStream.remainingBalance) {
        toast.error('Order amount exceeds available stream balance');
        return;
      }
    }

    setLoading(true);
    try {
      // Mock seller history (in production, fetch from blockchain)
      const sellerHistory = [];
      
      const order = listStreamForSale(selectedStreamId, percentageNum, priceRatioNum, sellerHistory);
      
      toast.success(`Order created! Risk Score: ${order.riskScore}/100 (${order.riskLevel}), Discount: ${(order.recommendedDiscount * 100).toFixed(1)}%`);
      
      // Reset form
      setSelectedStreamId('');
      setPercentage('');
      setPriceRatio('0.95');
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const selectedStream = activeStreams.find((s) => s.id === selectedStreamId);
  const discount = priceRatio ? ((1 - parseFloat(priceRatio)) * 100).toFixed(1) : '0';
  const orderAmount = selectedStream && percentage ? (selectedStream.remainingBalance * parseFloat(percentage || 0) / 100) : 0;
  const orderPrice = orderAmount * parseFloat(priceRatio || 0);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Create Sell Order</h3>
        <p className={styles.subtitle}>List your stream shares on the marketplace</p>
      </div>
      
      {!user.address ? (
        <div className={styles.emptyState}>
          <p>Please connect your wallet to create an order</p>
        </div>
      ) : userStreams.length === 0 ? (
        <div className={styles.emptyState}>
          <p>You don't have any streams to sell</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.fieldGroup}>
            <label htmlFor="selectedStream" className={styles.label}>Stream</label>
            <select
              id="selectedStream"
              className={styles.select}
              value={selectedStreamId}
              onChange={(e) => setSelectedStreamId(e.target.value)}
              required
              aria-label="Select stream to sell"
              aria-describedby="streamHelp"
            >
              <option value="">Select a stream</option>
              {userStreams.map((stream) => (
                <option key={stream.id} value={stream.id}>
                  Stream {stream.id.slice(-8)} • {stream.remainingBalance.toFixed(6)} vUSDC
                </option>
              ))}
            </select>
            <span id="streamHelp" className={styles.hint}>Choose which stream to sell</span>
          </div>

          <div className={styles.row}>
            <div className={styles.fieldGroup}>
              <label htmlFor="percentage" className={styles.label}>Percentage</label>
              <input
                id="percentage"
                className={styles.input}
                type="number"
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
                placeholder="50"
                min="0"
                max="100"
                step="0.1"
                required
                aria-label="Percentage of stream to sell"
                aria-describedby="percentageHelp"
              />
              <span id="percentageHelp" className={styles.hint}>0-100%</span>
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="priceRatio" className={styles.label}>Price Ratio</label>
              <input
                id="priceRatio"
                className={styles.input}
                type="number"
                value={priceRatio}
                onChange={(e) => setPriceRatio(e.target.value)}
                placeholder="0.95"
                min="0"
                max="1"
                step="0.01"
                required
                aria-label="Price ratio (0-1, where 0.95 = 95% of face value)"
                aria-describedby="priceRatioHelp"
              />
              <span id="priceRatioHelp" className={styles.hint}>0-1 (e.g., 0.95 = 95%)</span>
            </div>
          </div>

          {selectedStream && percentage && priceRatio && (
            <div className={styles.preview}>
              <div className={styles.previewHeader}>Order Summary</div>
              <div className={styles.previewContent}>
                <div className={styles.previewItem}>
                  <span className={styles.previewLabel}>Amount</span>
                  <span className={styles.previewValue}>{orderAmount.toFixed(6)} vUSDC</span>
                </div>
                <div className={styles.previewItem}>
                  <span className={styles.previewLabel}>Price</span>
                  <span className={styles.previewValue}>{(parseFloat(priceRatio) * 100).toFixed(1)}%</span>
                </div>
                <div className={styles.previewItem}>
                  <span className={styles.previewLabel}>Discount</span>
                  <span className={`${styles.previewValue} ${styles.highlight}`}>{discount}%</span>
                </div>
                <div className={styles.previewItem}>
                  <span className={styles.previewLabel}>You Receive</span>
                  <span className={`${styles.previewValue} ${styles.primary}`}>{orderPrice.toFixed(6)} vUSDC</span>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !selectedStreamId || !percentage || !priceRatio}
            className={styles.submitButton}
            aria-busy={loading}
            aria-label={loading ? 'Creating sell order, please wait' : 'Create sell order'}
          >
            {loading ? 'Creating...' : 'Create Sell Order'}
          </button>
        </form>
      )}
    </div>
  );
};

export default CreateOrderForm;

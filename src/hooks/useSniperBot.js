import { useEffect, useRef, useState, useCallback } from 'react';
import { useVolt } from '../context/VoltContext';
import { calculateStreamRisk } from './useRiskEngine';

/**
 * useSniperBot - Automated Agentic Commerce Agent
 * 
 * Monitors orderBook in real-time and automatically executes trades
 * when orders match user-defined criteria.
 * 
 * User Preferences:
 * - maxRisk: Maximum risk score (0-100, lower = less risk)
 * - minDiscount: Minimum discount percentage (e.g., 10 = 10%)
 * - maxDuration: Maximum stream duration in days
 * 
 * Logic:
 * - Polls orderBook every 3 seconds
 * - Checks if order.riskScore <= maxRisk
 * - Checks if order discount >= minDiscount
 * - Checks if stream duration <= maxDuration
 * - Automatically calls buyStream() if criteria match
 * - Fires Toast notification on execution
 */

/**
 * Calculate discount from price ratio
 * 
 * @param {number} priceRatio - Price as ratio of face value (0-1)
 * @returns {number} Discount percentage (0-100)
 */
const calculateDiscount = (priceRatio) => {
  return (1 - priceRatio) * 100;
};

/**
 * Calculate stream duration in days
 * 
 * @param {Object} stream - Stream object
 * @returns {number} Duration in days
 */
const getStreamDurationDays = (stream) => {
  if (!stream || !stream.duration) return 0;
  return stream.duration / (60 * 60 * 24); // Convert seconds to days
};

export const useSniperBot = (preferences = {}) => {
  const {
    orderBook,
    activeStreams,
    buyStream,
    user,
  } = useVolt();

  const [isActive, setIsActive] = useState(false);
  const [executionHistory, setExecutionHistory] = useState([]);
  const [stats, setStats] = useState({
    totalScans: 0,
    totalMatches: 0,
    totalExecutions: 0,
    lastScanTime: null,
  });

  const intervalRef = useRef(null);
  const isMountedRef = useRef(true);

  // Default preferences
  const {
    maxRisk = 40, // Default: Only buy streams with risk score <= 40 (A or B rating)
    minDiscount = 10, // Default: Must be at least 10% discount
    maxDuration = 30, // Default: Maximum 30 days duration
  } = preferences;

  /**
   * Check if an order matches sniper bot criteria
   * 
   * @param {Object} order - Order from orderBook
   * @param {Object} stream - Stream object from activeStreams
   * @returns {boolean} True if order matches criteria
   */
  const orderMatchesCriteria = useCallback(
    (order, stream) => {
      // 1. Check risk score (lower is better, so <= maxRisk)
      if (order.riskScore > maxRisk) {
        checks.riskScore = false;
        console.log(`❌ [Criteria Check] Order ${order.id}: Risk score ${order.riskScore} > maxRisk ${maxRisk}`);
        return false;
      }

      // 2. Check discount (must be >= minDiscount)
      const discount = calculateDiscount(order.priceRatio);
      if (discount < minDiscount) {
        checks.discount = false;
        console.log(`❌ [Criteria Check] Order ${order.id}: Discount ${discount.toFixed(2)}% < minDiscount ${minDiscount}%`);
        return false;
      }

      // 3. Check duration (must be <= maxDuration days)
      const durationDays = getStreamDurationDays(stream);
      if (durationDays > maxDuration) {
        checks.duration = false;
        console.log(`❌ [Criteria Check] Order ${order.id}: Duration ${durationDays.toFixed(2)} days > maxDuration ${maxDuration} days`);
        return false;
      }

      // 4. Check if user has enough vUSDC balance
      const requiredBalance = order.impliedValue || 0;
      if (user.balanceVUSDC < requiredBalance) {
        checks.balance = false;
        console.log(`❌ [Criteria Check] Order ${order.id}: User balance ${user.balanceVUSDC} < required ${requiredBalance}`);
        return false;
      }

      // 5. Don't buy your own orders
      if (user.address && order.seller.toLowerCase() === user.address.toLowerCase()) {
        checks.ownOrder = false;
        console.log(`❌ [Criteria Check] Order ${order.id}: User is the seller`);
        return false;
      }

      console.log(`✅ [Criteria Check] Order ${order.id} PASSES all criteria:`, {
        riskScore: `${order.riskScore} <= ${maxRisk}`,
        discount: `${discount.toFixed(2)}% >= ${minDiscount}%`,
        duration: `${durationDays.toFixed(2)} days <= ${maxDuration} days`,
        balance: `${user.balanceVUSDC} >= ${requiredBalance}`,
        notOwnOrder: true,
      });

      return true;
    },
    [maxRisk, minDiscount, maxDuration, user.balanceVUSDC, user.address]
  );

  /**
   * Execute trade for a matching order
   * 
   * @param {Object} order - Order to execute
   */
  const executeTrade = useCallback(
    async (order) => {
      if (!isMountedRef.current) return;

      try {
        // Call buyStream from VoltContext
        const result = buyStream(order.id);

        // Record execution
        const execution = {
          id: `exec_${Date.now()}`,
          orderId: order.id,
          streamId: order.streamId,
          executedAt: Date.now(),
          price: order.impliedValue || 0,
          riskScore: order.riskScore,
          discount: calculateDiscount(order.priceRatio),
        };

        setExecutionHistory((prev) => [execution, ...prev].slice(0, 50)); // Keep last 50
        setStats((prev) => ({
          ...prev,
          totalExecutions: prev.totalExecutions + 1,
        }));

        // Fire notification (in production, use a toast system)
        console.log(`🤖 SNIPER AGENT EXECUTED TRADE: Bought Stream #${order.streamId.slice(-8)}`);
        console.log(`   Order ID: ${order.id}`);
        console.log(`   Price: ${execution.price.toFixed(6)} vUSDC`);
        console.log(`   Risk Score: ${order.riskScore}/100 (${order.riskLevel || 'N/A'})`);
        console.log(`   Discount: ${execution.discount.toFixed(1)}%`);

        // In production, trigger a toast notification here
        // toast.success(`🤖 SNIPER AGENT: Bought Stream #${order.streamId.slice(-8)}`);

        return result;
      } catch (error) {
        console.error('Sniper Bot execution error:', error);
        // In production, show error toast
        // toast.error(`Sniper Bot failed: ${error.message}`);
      }
    },
    [buyStream]
  );

  /**
   * Main polling loop - scans orderBook every 3 seconds
   */
  useEffect(() => {
    if (!isActive || !isMountedRef.current) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const scanOrderBook = () => {
      if (!isMountedRef.current) return;

      setStats((prev) => ({
        ...prev,
        totalScans: prev.totalScans + 1,
        lastScanTime: Date.now(),
      }));

      // Debug: Log orderBook status
      console.log('🤖 [Sniper Bot] Scanning orderBook:', {
        orderBookLength: orderBook.length,
        activeStreamsLength: activeStreams.length,
        orderBook: orderBook,
        activeStreams: activeStreams.map(s => ({ id: s.id, remainingBalance: s.remainingBalance })),
      });

      if (orderBook.length === 0) {
        console.warn('⚠️ [Sniper Bot] orderBook is empty. No orders to scan.');
        return;
      }

      // Scan all active orders
      let scannedCount = 0;
      let matchedCount = 0;
      let streamNotFoundCount = 0;

      orderBook.forEach((order) => {
        scannedCount++;
        console.log(`\n🔍 [Sniper Bot] Scanning order ${order.id}:`, {
          orderId: order.id,
          streamId: order.streamId,
          seller: order.seller,
          riskScore: order.riskScore,
          riskLevel: order.riskLevel,
          priceRatio: order.priceRatio,
          percentage: order.percentage,
          impliedValue: order.impliedValue,
          userAddress: user.address,
          userBalance: user.balanceVUSDC,
        });

        const stream = activeStreams.find((s) => s.id === order.streamId);
        
        if (!stream) {
          streamNotFoundCount++;
          console.warn(`⚠️ [Sniper Bot] Stream not found for order ${order.id}, streamId: ${order.streamId}`);
          console.warn(`   Available stream IDs:`, activeStreams.map(s => s.id));
          return;
        }

        console.log(`   Found stream:`, {
          streamId: stream.id,
          remainingBalance: stream.remainingBalance,
          duration: stream.duration,
          durationDays: getStreamDurationDays(stream),
        });

        // Check if order matches criteria
        if (orderMatchesCriteria(order, stream)) {
          matchedCount++;
          setStats((prev) => ({
            ...prev,
            totalMatches: prev.totalMatches + 1,
          }));

          console.log('✅ [Sniper Bot] Order matches criteria - EXECUTING TRADE:', {
            orderId: order.id,
            streamId: order.streamId,
            riskScore: order.riskScore,
            discount: calculateDiscount(order.priceRatio),
            durationDays: getStreamDurationDays(stream),
            price: order.impliedValue,
          });

          // Execute trade
          executeTrade(order);
        }
      });

      console.log(`📊 [Sniper Bot] Scan complete: ${scannedCount} orders scanned, ${matchedCount} matched, ${streamNotFoundCount} streams not found`);
    };

    // Initial scan
    scanOrderBook();

    // Set up interval: every 3 seconds (3000ms)
    intervalRef.current = setInterval(scanOrderBook, 3000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, orderBook, activeStreams, orderMatchesCriteria, executeTrade]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  /**
   * Start sniper bot
   */
  const start = useCallback(() => {
    setIsActive(true);
    console.log('🤖 Sniper Bot ACTIVATED');
    console.log(`   Max Risk: ${maxRisk}/100`);
    console.log(`   Min Discount: ${minDiscount}%`);
    console.log(`   Max Duration: ${maxDuration} days`);
  }, [maxRisk, minDiscount, maxDuration]);

  /**
   * Stop sniper bot
   */
  const stop = useCallback(() => {
    setIsActive(false);
    console.log('🤖 Sniper Bot DEACTIVATED');
  }, []);

  return {
    isActive,
    start,
    stop,
    stats,
    executionHistory,
    preferences: {
      maxRisk,
      minDiscount,
      maxDuration,
    },
  };
};

export default useSniperBot;


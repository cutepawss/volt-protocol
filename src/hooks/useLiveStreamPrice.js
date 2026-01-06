import { useState, useEffect, useRef } from 'react';

/**
 * useLiveStreamPrice - Real-time price calculation hook
 * 
 * Calculates current price every second based on:
 * - Remaining balance (decreases as stream flows)
 * - Discount rate (price ratio)
 * 
 * Formula: Current_Price = (Remaining_Balance * (1 - Discount_Rate))
 * 
 * @param {Object} stream - Stream object from VoltContext
 * @param {number} discountRate - Discount rate (0-1, e.g., 0.1 = 10% discount)
 * @param {boolean} isActive - Whether to actively update prices
 * @returns {Object} Price data with real-time updates
 */

export const useLiveStreamPrice = (stream, discountRate = 0.1, isActive = true) => {
  const [currentPrice, setCurrentPrice] = useState(0);
  const [remainingBalance, setRemainingBalance] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [pricePerSecond, setPricePerSecond] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!stream || !isActive || !stream.totalDeposit || !stream.duration) {
      // Handle invalid or inactive stream gracefully
      setCurrentPrice(0);
      setRemainingBalance(0);
      setTimeRemaining(0);
      setPricePerSecond(0);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      return;
    }

    const calculatePrice = () => {
      const now = Math.floor(Date.now() / 1000);
      const elapsed = Math.max(0, now - stream.startTime);
      const totalDuration = stream.duration;
      
      // Calculate remaining balance
      const ratePerSecond = totalDuration > 0 ? stream.totalDeposit / totalDuration : 0;
      const flowedAmount = Math.min(elapsed * ratePerSecond, stream.totalDeposit);
      const remaining = Math.max(0, stream.totalDeposit - flowedAmount);
      
      // Calculate remaining time
      const remainingTime = Math.max(0, totalDuration - elapsed);
      
      // Calculate current price with discount
      // priceRatio = 1 - discountRate (e.g., 0.95 = 5% discount)
      const priceRatio = 1 - discountRate;
      const price = remaining * priceRatio;
      
      // Calculate price decay per second
      const priceDecayPerSecond = ratePerSecond * priceRatio;

      setRemainingBalance(remaining);
      setTimeRemaining(remainingTime);
      setCurrentPrice(price);
      setPricePerSecond(priceDecayPerSecond);
    };

    // Initial calculation
    calculatePrice();

    // Update every 1 second (1000ms)
    intervalRef.current = setInterval(calculatePrice, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [stream, discountRate, isActive]);

  return {
    currentPrice: Math.max(0, currentPrice),
    remainingBalance: Math.max(0, remainingBalance),
    timeRemaining: Math.max(0, timeRemaining),
    pricePerSecond,
    formattedPrice: currentPrice.toFixed(6),
    formattedBalance: remainingBalance.toFixed(6),
  };
};

export default useLiveStreamPrice;


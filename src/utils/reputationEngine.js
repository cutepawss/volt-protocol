/**
 * Reputation Engine
 * 
 * Calculates user reputation based on blockchain-native factors:
 * - On-chain activity (transaction count, frequency)
 * - Trading volume (total volume, average trade size)
 * - Account longevity (wallet age, first transaction date)
 * - Trade frequency (trades per month, consistency)
 * - Protocol engagement (streams created, orders placed)
 * - Network participation (time-weighted activity)
 */

/**
 * Calculate user reputation score (0-1000)
 * Based on blockchain-native reputation factors
 */
export const calculateReputation = (userData) => {
  const {
    totalTrades = 0,
    totalVolume = 0,
    accountAge = 0, // in days
    averageTradeSize = 0,
    tradesPerMonth = 0,
    totalStreams = 0,
    totalOrders = 0,
    onChainTxCount = 0,
    firstTxDate = null,
  } = userData;

  let score = 300; // Base score (lower for new users)

  // 1. On-Chain Activity Score (25% weight)
  // More transactions = higher reputation (indicates active user)
  const activityScore = Math.min(onChainTxCount / 100, 1) * 150; // Normalize to 100 txs
  score += activityScore;

  // 2. Trading Volume Score (25% weight)
  // Higher volume = higher reputation (indicates serious trader)
  if (totalVolume > 0) {
    const volumeScore = Math.min(Math.log10(totalVolume + 1) / 5, 1) * 150; // Logarithmic scale
    score += volumeScore;
  }

  // 3. Account Longevity (20% weight)
  // Older accounts = higher reputation (time-weighted trust)
  const ageScore = Math.min(accountAge / 730, 1) * 120; // Normalize to 2 years
  score += ageScore;

  // 4. Trade Frequency & Consistency (15% weight)
  // Regular trading = higher reputation (active participation)
  const frequencyScore = Math.min(tradesPerMonth / 10, 1) * 90; // Normalize to 10 trades/month
  score += frequencyScore;

  // 5. Average Trade Size (10% weight)
  // Larger average trades = higher reputation (serious capital)
  if (averageTradeSize > 0) {
    const sizeScore = Math.min(averageTradeSize / 5000, 1) * 60; // Normalize to 5k USDC
    score += sizeScore;
  }

  // 6. Protocol Engagement (5% weight)
  // More streams/orders = higher engagement
  const engagementScore = Math.min((totalStreams + totalOrders) / 20, 1) * 30;
  score += engagementScore;

  // Clamp to 0-1000
  return Math.max(0, Math.min(1000, Math.round(score)));
};

/**
 * Get reputation level from score
 */
export const getReputationLevel = (score) => {
  if (score >= 900) return { level: 'S', label: 'Elite', color: '#ff00ff' };
  if (score >= 750) return { level: 'A', label: 'Excellent', color: '#00ff00' };
  if (score >= 600) return { level: 'B', label: 'Good', color: '#00e5ff' };
  if (score >= 400) return { level: 'C', label: 'Fair', color: '#ffaa00' };
  if (score >= 200) return { level: 'D', label: 'Poor', color: '#ff6666' };
  return { level: 'F', label: 'New', color: '#888' };
};

/**
 * Calculate user statistics from trade and order history
 * Includes blockchain-native metrics
 */
export const calculateUserStats = (userAddress, tradeHistory, orderHistory, activeStreams) => {
  const userTrades = tradeHistory.filter(
    (trade) =>
      trade.buyer.toLowerCase() === userAddress.toLowerCase() ||
      trade.seller.toLowerCase() === userAddress.toLowerCase()
  );

  const userOrders = orderHistory.filter(
    (order) => order.seller.toLowerCase() === userAddress.toLowerCase()
  );

  const userStreams = activeStreams.filter(
    (stream) =>
      stream.receiver.toLowerCase() === userAddress.toLowerCase() ||
      stream.sender.toLowerCase() === userAddress.toLowerCase()
  );

  const totalTrades = userTrades.length;
  const totalVolume = userTrades.reduce((sum, trade) => sum + trade.price, 0);
  const averageTradeSize = totalTrades > 0 ? totalVolume / totalTrades : 0;

  // Calculate account age from first trade
  const firstTrade = userTrades.length > 0
    ? userTrades.sort((a, b) => a.executedAt - b.executedAt)[0]
    : null;
  const accountAge = firstTrade
    ? Math.floor((Date.now() / 1000 - firstTrade.executedAt) / (60 * 60 * 24))
    : 0;

  // Calculate trades per month
  const monthsActive = accountAge > 0 ? Math.max(1, accountAge / 30) : 1;
  const tradesPerMonth = totalTrades / monthsActive;

  // On-chain transaction count (estimate: trades + orders + streams)
  const onChainTxCount = totalTrades + userOrders.length + userStreams.length;

  // First transaction date
  const firstTxDate = firstTrade ? new Date(firstTrade.executedAt * 1000) : null;

  const soldOrders = userOrders.filter((o) => o.status === 'sold').length;
  const cancelledOrders = userOrders.filter((o) => o.status === 'cancelled').length;
  const totalOrders = userOrders.length;
  const completionRate = totalOrders > 0 ? soldOrders / totalOrders : 0;

  return {
    totalTrades,
    totalVolume,
    accountAge,
    averageTradeSize,
    tradesPerMonth,
    totalStreams: userStreams.length,
    totalOrders,
    onChainTxCount,
    firstTxDate,
    soldOrders,
    cancelledOrders,
    completionRate,
  };
};


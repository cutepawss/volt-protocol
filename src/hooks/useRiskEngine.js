import { useCallback } from 'react';

/**
 * useRiskEngine - AI Risk Scoring Engine
 * 
 * Calculates risk score (0-100) using weighted formula:
 * 1. Time Decay (40%): Progress-based risk assessment
 * 2. Sender Reputation (30%): Transaction history analysis
 * 3. Liquidity Depth (20%): Total deposit size
 * 4. External Signal (10%): Mock "Arc Trust ID" check
 * 
 * Returns: { score: 0-100, riskLevel: "A/B/C/D", recommendedDiscount: 0.05 }
 */

/**
 * Calculate stream risk score
 * 
 * @param {Object} stream - Stream object from VoltContext
 * @param {Array} sellerHistory - Array of transaction history objects
 * @returns {Object} Risk assessment with score, level, and discount
 */
export const calculateStreamRisk = (stream, sellerHistory = []) => {
  if (!stream || !stream.startTime || !stream.duration || !stream.totalDeposit) {
    return {
      score: 100, // Maximum risk if data is invalid
      riskLevel: 'D',
      recommendedDiscount: 0.20,
      breakdown: {
        timeDecay: 0,
        senderReputation: 0,
        liquidityDepth: 0,
        externalSignal: 0,
      },
    };
  }

  const now = Math.floor(Date.now() / 1000);
  const elapsed = now - stream.startTime;
  const progress = stream.duration > 0 ? elapsed / stream.duration : 0;

  // 1. TIME DECAY (40% weight)
  // If progress > 80%, risk is LOW (Score +30)
  // If progress < 10%, risk is HIGH (Score +0)
  // Linear interpolation between 10% and 80%
  let timeDecayScore = 0;
  if (progress >= 0.8) {
    timeDecayScore = 30; // Low risk
  } else if (progress <= 0.1) {
    timeDecayScore = 0; // High risk
  } else {
    // Linear interpolation: 0.1 -> 0, 0.8 -> 30
    const normalizedProgress = (progress - 0.1) / (0.8 - 0.1);
    timeDecayScore = normalizedProgress * 30;
  }
  const timeDecayContribution = (timeDecayScore / 30) * 40; // 40% weight

  // 2. SENDER REPUTATION (30% weight)
  // If 0 failed txs → Score +30
  // If >1 failed tx → Score -50 (penalty)
  // If 1 failed tx → Score +15 (moderate)
  const failedTransactions = sellerHistory.filter((tx) => tx.status === 'failed' || tx.status === 'error').length;
  let senderReputationScore = 0;
  if (failedTransactions === 0) {
    senderReputationScore = 30; // Perfect reputation
  } else if (failedTransactions === 1) {
    senderReputationScore = 15; // Moderate risk
  } else {
    senderReputationScore = -50; // High risk penalty
  }
  // Normalize to 0-30 scale, then apply 30% weight
  const normalizedReputation = Math.max(0, Math.min(30, senderReputationScore));
  const senderReputationContribution = (normalizedReputation / 30) * 30; // 30% weight

  // 3. LIQUIDITY DEPTH (20% weight)
  // If totalDeposit > $10,000 → Score +20
  // Linear scale: $0 -> 0, $10,000 -> 20
  const liquidityThreshold = 10000;
  let liquidityDepthScore = 0;
  if (stream.totalDeposit >= liquidityThreshold) {
    liquidityDepthScore = 20; // Full points
  } else {
    liquidityDepthScore = (stream.totalDeposit / liquidityThreshold) * 20;
  }
  const liquidityDepthContribution = liquidityDepthScore; // 20% weight (already scaled)

  // 4. EXTERNAL SIGNAL (10% weight)
  // Mock "Arc Trust ID" check
  // For now, we'll use a simple heuristic based on sender address
  // In production, this would query an external service
  const hasArcTrustID = mockArcTrustIDCheck(stream.sender);
  const externalSignalScore = hasArcTrustID ? 10 : 5; // 10 if verified, 5 if not
  const externalSignalContribution = externalSignalScore; // 10% weight (already scaled)

  // Calculate total score (0-100)
  // Lower score = Lower risk, Higher score = Higher risk
  // We invert the logic: contributions are "risk points", so we subtract from 100
  const totalRiskPoints = 
    (40 - timeDecayContribution) + // Inverted: more progress = less risk points
    (30 - senderReputationContribution) + // Inverted: better rep = less risk points
    (20 - liquidityDepthContribution) + // Inverted: more liquidity = less risk points
    (10 - externalSignalContribution); // Inverted: verified = less risk points

  // Clamp to 0-100 range
  const riskScore = Math.max(0, Math.min(100, Math.round(totalRiskPoints)));

  // Determine risk level
  let riskLevel = 'D';
  let recommendedDiscount = 0.20;
  if (riskScore <= 20) {
    riskLevel = 'A';
    recommendedDiscount = 0.02; // 2% discount for lowest risk
  } else if (riskScore <= 40) {
    riskLevel = 'B';
    recommendedDiscount = 0.05; // 5% discount
  } else if (riskScore <= 70) {
    riskLevel = 'C';
    recommendedDiscount = 0.10; // 10% discount
  } else {
    riskLevel = 'D';
    recommendedDiscount = 0.20; // 20% discount for highest risk
  }

  return {
    score: riskScore,
    riskLevel,
    recommendedDiscount,
    breakdown: {
      timeDecay: Math.round(timeDecayContribution * 100) / 100,
      senderReputation: Math.round(senderReputationContribution * 100) / 100,
      liquidityDepth: Math.round(liquidityDepthContribution * 100) / 100,
      externalSignal: Math.round(externalSignalContribution * 100) / 100,
      totalRiskPoints: Math.round(totalRiskPoints * 100) / 100,
    },
  };
};

/**
 * Mock Arc Trust ID check
 * In production, this would query an external API or on-chain registry
 * 
 * @param {string} address - Wallet address
 * @returns {boolean} True if address has Arc Trust ID
 */
const mockArcTrustIDCheck = (address) => {
  // Mock logic: addresses ending in even numbers are "verified"
  // In production, replace with actual API call
  const lastChar = address.slice(-1);
  return /[02468a-f]/.test(lastChar.toLowerCase());
};

/**
 * Hook to use risk engine
 * 
 * @param {Array} streams - Array of streams from VoltContext
 * @param {Object} sellerHistories - Map of seller address -> transaction history
 * @returns {Function} calculateRisk function
 */
export const useRiskEngine = (streams = [], sellerHistories = {}) => {
  const calculateRisk = useCallback(
    (stream, sellerAddress) => {
      const sellerHistory = sellerHistories[sellerAddress] || [];
      return calculateStreamRisk(stream, sellerHistory);
    },
    [sellerHistories]
  );

  return { calculateRisk };
};

export default useRiskEngine;


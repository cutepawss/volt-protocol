import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { calculateStreamRisk } from '../hooks/useRiskEngine';
import { useVoltContract } from '../hooks/useVoltContract';

/**
 * VoltContext - Global State Management for Volt Protocol
 * 
 * Manages:
 * - User state (address, creditScore, balanceUSDC)
 * - Active streams with real-time balance updates
 * - Order book (sell orders) with implied value calculations
 * 
 * CRITICAL: Updates stream balances every 1 second (1000ms)
 */

const VoltContext = createContext(undefined);

/**
 * Stream object structure:
 * {
 *   id: string (unique identifier)
 *   sender: string (wallet address)
 *   receiver: string (wallet address - can change on ownership transfer)
 *   totalDeposit: number (USDC amount)
 *   startTime: number (Unix timestamp in seconds)
 *   duration: number (duration in seconds)
 *   flowedAmount: number (USDC already flowed - updates every second)
 *   remainingBalance: number (USDC remaining - updates every second)
 * }
 */

/**
 * Order object structure:
 * {
 *   id: string (unique identifier)
 *   streamId: string (references activeStreams[].id)
 *   seller: string (wallet address)
 *   percentage: number (0-100, percentage of stream being sold)
 *   priceRatio: number (0-1, price as ratio of face value)
 *   riskScore: number (0-100, from AI risk engine)
 *   listedAt: number (Unix timestamp in seconds)
 *   impliedValue?: number (calculated real-time based on remainingBalance)
 * }
 */

import { sanitizeInput } from '../utils/sanitize';
export const VoltProvider = ({ children }) => {
  // Toast state (managed internally, not using hook to avoid issues)
  const [toasts, setToasts] = useState([]);
  const showToast = useCallback((message, type = 'info', duration = 3000) => {
  const safeMessage = sanitizeInput(message);
    const id = Date.now() + Math.random();
    const toast = {
      id,
      message: safeMessage,
      type,
      duration,
    };

    setToasts((prev) => [...prev, toast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    toasts,
    showToast,
    removeToast,
    success: (message, duration) => showToast(message, 'success', duration),
    error: (message, duration) => showToast(message, 'error', duration),
    warning: (message, duration) => showToast(message, 'warning', duration),
    info: (message, duration) => showToast(message, 'info', duration),
  };

  // Use real contract hook
  const {
    provider,
    signer,
    contract,
    account,
    network,
    isConnecting,
    error: contractError,
    connectWallet: connectWalletContract,
    disconnectWallet: disconnectWalletContract,
    getUSDCBalance,
    getVUSDCBalance,
    getFaucetBalance,
    requestVUSDCFromFaucet,
    fetchStream: fetchStreamFromContract,
    fetchUserStreams,
    createStream: createStreamContract,
    sellShare,
    withdrawFromStream,
    setupEventListeners,
  } = useVoltContract();

  // User state
  const [user, setUser] = useState({
    address: null,
    creditScore: 750, // Default credit score
    balanceUSDC: 10000.0, // Mock starting balance (will be fetched from contract)
    balanceVUSDC: 0, // vUSDC token balance (fetched from blockchain)
  });

  // Transaction status tracking
  const [txStatus, setTxStatus] = useState({
    pending: false,
    hash: null,
    success: false,
    error: null,
  });

  // Active streams - Start with empty array, will be populated from contract
const [activeStreams, setActiveStreams] = useState([]);

  // Order book - Load from localStorage or initialize empty
  const [orderBook, setOrderBook] = useState(() => {
    try {
      const saved = localStorage.getItem('volt_order_book');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Order book - Load from localStorage or initialize empty
  // TODO: In production, this will be synced from on-chain or IPFS

  // Bids - Store all bids (pending, accepted, rejected, cancelled)
  const [bids, setBids] = useState(() => {
    // Load from localStorage if available
    try {
      const saved = localStorage.getItem('volt_bids');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Order History - Track all past orders and trades
  const [orderHistory, setOrderHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('volt_order_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Trade History - Track all completed trades
  const [tradeHistory, setTradeHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('volt_trade_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Ref to track if component is mounted (prevent memory leaks)
  const isMountedRef = useRef(true);

  // Initialize mock orderBook with risk scores after streams are available
  // NOTE: Disabled - using real contract data now
  // useEffect(() => {
  //   if (orderBook.length === 0 && activeStreams.length > 0) {
  //     const stream1 = activeStreams.find((s) => s.id === 'stream_001');
  //     const stream2 = activeStreams.find((s) => s.id === 'stream_002');
  //     
  //     const mockOrders = [];
      
  // Mock order book initialization removed - using real contract data

  /**
   * CRITICAL: Real-time stream balance updates
   * Runs every 1 second (1000ms)
   * 
   * For each active stream:
   * 1. Calculate elapsed time: (now - startTime)
   * 2. Calculate rate per second: totalDeposit / duration
   * 3. Update flowedAmount: elapsedTime * ratePerSecond
   * 4. Update remainingBalance: totalDeposit - flowedAmount
   * 5. If stream is in orderBook, recalculate impliedValue
   */
  useEffect(() => {
    isMountedRef.current = true;

    const updateStreamBalances = () => {
      if (!isMountedRef.current) return;

      const now = Math.floor(Date.now() / 1000);

      setActiveStreams((prevStreams) => {
        return prevStreams.map((stream) => {
          // Calculate elapsed time in seconds
          const elapsedTime = Math.max(0, now - stream.startTime);
          
          // Calculate rate per second
          const ratePerSecond = stream.duration > 0 
            ? stream.totalDeposit / stream.duration 
            : 0;

          // Calculate flowed amount (capped at totalDeposit)
          const flowedAmount = Math.min(
            elapsedTime * ratePerSecond,
            stream.totalDeposit
          );

          // Calculate remaining balance
          const remainingBalance = Math.max(
            0,
            stream.totalDeposit - flowedAmount
          );

          return {
            ...stream,
            flowedAmount: Math.round(flowedAmount * 1000000) / 1000000, // 6 decimal precision
            remainingBalance: Math.round(remainingBalance * 1000000) / 1000000,
          };
        });
      });
    };

    // Initial update
    updateStreamBalances();

    // Set up interval: every 1 second (1000ms)
    const intervalId = setInterval(updateStreamBalances, 1000);

    return () => {
      isMountedRef.current = false;
      clearInterval(intervalId);
    };
  }, []); // Empty deps - runs once on mount

  /**
   * CRITICAL: Recalculate implied values for orders in orderBook
   * This runs after stream balances are updated
   * 
   * Implied Value = (remainingBalance * percentage / 100) * priceRatio
   */
  useEffect(() => {
    if (!isMountedRef.current) return;

    setOrderBook((prevOrders) => {
      return prevOrders.map((order) => {
        // Find the stream this order references
        const stream = activeStreams.find((s) => s.id === order.streamId);
        
        if (!stream) {
          return { ...order, impliedValue: 0 };
        }

        // Calculate implied value based on current remaining balance
        const streamValueAtPercentage = (stream.remainingBalance * order.percentage) / 100;
        const impliedValue = streamValueAtPercentage * order.priceRatio;

        return {
          ...order,
          impliedValue: Math.round(impliedValue * 1000000) / 1000000, // 6 decimal precision
        };
      });
    });
  }, [activeStreams]); // Recalculate when streams update

  /**
   * Connect wallet function (uses real contract)
   */
  const connectWallet = useCallback(async () => {
    try {
      const address = await connectWalletContract();
      
      // Update user state
      setUser((prev) => ({
        ...prev,
        address,
      }));

      // Fetch USDC and vUSDC balances
      const [balance, vusdcBalance] = await Promise.all([
        getUSDCBalance(address),
        getVUSDCBalance ? getVUSDCBalance(address) : Promise.resolve(0),
      ]);
      setUser((prev) => ({
        ...prev,
        balanceUSDC: balance || prev.balanceUSDC,
        balanceVUSDC: vusdcBalance || 0,
      }));

      // Fetch user's streams from contract (multiple streams supported)
      console.log('🔍 [connectWallet] Fetching user streams for address:', address);
      console.log('🔍 [connectWallet] Contract available:', !!contract);
      console.log('🔍 [connectWallet] fetchUserStreams function available:', !!fetchUserStreams);
      
      const streamsData = await fetchUserStreams(address);
      console.log('📋 [connectWallet] Streams data from contract:', streamsData);
      console.log('📋 [connectWallet] Streams count:', streamsData?.length || 0);
      
      if (streamsData && streamsData.length > 0) {
        // Update activeStreams with real data
        const newStreams = streamsData.map((streamData) => ({
          id: streamData.id,
          sender: address,
          receiver: address, // Contract doesn't track receiver separately
          totalDeposit: parseFloat(streamData.totalDeposit),
          startTime: streamData.startTime,
          duration: streamData.duration,
          claimedAmount: parseFloat(streamData.claimedAmount),
          flowedAmount: parseFloat(streamData.claimedAmount),
          remainingBalance: parseFloat(streamData.totalDeposit) - parseFloat(streamData.claimedAmount) - parseFloat(streamData.soldAmount),
        }));

        console.log('✅ [connectWallet] Mapped streams:', newStreams);
        console.log('📊 [connectWallet] Setting activeStreams to:', newStreams);
        console.log('📊 [connectWallet] ActiveStreams will have', newStreams.length, 'streams');
        
        // COMPLETELY REPLACE activeStreams with fetched streams (no filtering, just replace)
        setActiveStreams(newStreams);
        
        // Verify state was updated
        setTimeout(() => {
          console.log('🔍 [connectWallet] State update verification - activeStreams should now have', newStreams.length, 'streams');
        }, 100);
      } else {
        // No active streams for this user - clear all streams
        console.log('⚠️ [connectWallet] No streams found for user, clearing activeStreams');
        setActiveStreams([]);
      }

      return address;
    } catch (error) {
      console.error('Error connecting wallet:', error);
      throw error;
    }
  }, [connectWalletContract, getUSDCBalance, fetchUserStreams]);

  /**
   * Disconnect wallet function
   */
  const disconnectWallet = useCallback(() => {
    disconnectWalletContract();
    setUser((prev) => ({
      ...prev,
      address: null,
    }));
  }, [disconnectWalletContract]);

  /**
   * Buy stream function (ownership transfer)
   * 
   * NOTE: Currently uses mock transaction. In production, this would:
   * 1. Call contract function to transfer stream ownership
   * 2. Handle payment through contract
   * 3. Update on-chain state
   * 
   * For now, order book is stored off-chain, so this is a local state update.
   * When order book moves on-chain, this will call the appropriate contract function.
   */
  const buyStream = useCallback(async (orderId) => {
    if (!user.address) {
      throw new Error('Please connect your wallet first');
    }

    const order = orderBook.find((o) => o.id === orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    const stream = activeStreams.find((s) => s.id === order.streamId);
    if (!stream) {
      throw new Error('Stream not found');
    }

    // Calculate purchase price
    const purchasePrice = order.impliedValue || 0;
    const orderValue = (stream.remainingBalance * order.percentage) / 100;

    if (purchasePrice <= 0) {
      throw new Error('Invalid purchase price');
    }

    if (user.balanceVUSDC < purchasePrice) {
      throw new Error(`Insufficient vUSDC balance. You have ${user.balanceVUSDC.toFixed(2)} vUSDC, but need ${purchasePrice.toFixed(2)} vUSDC.`);
    }

    setTxStatus({ pending: true, hash: null, success: false, error: null });

    try {
      // TODO: In production, call contract function here
      // For now, simulate transaction delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 1. Deduct from buyer
      setUser((prev) => ({
        ...prev,
        balanceVUSDC: prev.balanceVUSDC - purchasePrice,
      }));

      // 2. Add to seller (mock - in production, this would be a transaction)
      // Note: In real implementation, seller's balance would be updated via blockchain

      // 3. Update stream receiver
      setActiveStreams((prevStreams) =>
        prevStreams.map((s) =>
          s.id === order.streamId
            ? { ...s, receiver: user.address }
            : s
        )
      );

      // 4. Remove order from orderBook
      setOrderBook((prevOrders) => prevOrders.filter((o) => o.id !== orderId));

      // 5. Add to trade history
      const tradeEntry = {
        id: `trade_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        orderId,
        streamId: stream.id,
        seller: order.seller,
        buyer: user.address,
        amount: orderValue,
        price: purchasePrice,
        percentage: order.percentage,
        executedAt: Math.floor(Date.now() / 1000),
        txHash: null, // Will be filled when real blockchain integration is complete
      };
      setTradeHistory((prev) => {
        const updated = [...prev, tradeEntry];
        localStorage.setItem('volt_trade_history', JSON.stringify(updated));
        return updated;
      });

      // 6. Add order to history
      const historyEntry = {
        ...order,
        status: 'sold',
        soldAt: Math.floor(Date.now() / 1000),
      };
      setOrderHistory((prev) => {
        const updated = [...prev, historyEntry];
        localStorage.setItem('volt_order_history', JSON.stringify(updated));
        return updated;
      });

      setTxStatus({ pending: false, hash: null, success: true, error: null });

      // Return event for animation trigger
      return {
        type: 'STREAM_REDIRECTED',
        streamId: stream.id,
        newReceiver: user.address,
        purchasePrice,
      };
    } catch (error) {
      console.error('Error buying stream:', error);
      setTxStatus({ pending: false, hash: null, success: false, error: error.message });
      throw error;
    }
  }, [orderBook, activeStreams, user.address, user.balanceVUSDC]);

  /**
   * Create a new stream (real contract call)
   * Deducts balance from user
   * 
   * @param {string} receiver - Receiver address (not used in contract, stream is for msg.sender)
   * @param {number} totalDeposit - Amount of vUSDC to deposit
   * @param {number} duration - Duration in seconds
   */
const createStream = useCallback(async (receiver, totalDeposit, duration) => {
  if (!contract || !account) {
    throw new Error('Wallet not connected');
  }

  setTxStatus({ pending: true, hash: null, success: false, error: null });

  try {
    // Call real contract - NOTE: receiver parameter is ignored, contract uses msg.sender
    // Parameters: (durationInSeconds, depositAmount)
    console.log('Creating stream with params:', { duration, totalDeposit });
    const result = await createStreamContract(duration, totalDeposit);

    setTxStatus({
      pending: false,
      hash: result.txHash,
      success: result.success,
      error: null,
    });

    // Update vUSDC balance immediately
    const vusdcBalance = await getVUSDCBalance(account);
    setUser((prev) => ({
      ...prev,
      balanceVUSDC: vusdcBalance || prev.balanceVUSDC - totalDeposit,
    }));

    // Event listener will handle the stream data update and notification
    // Just return a basic object for now
    const streamId = result.streamId || `stream_${Date.now()}`;
    return {
      id: streamId,
      sender: account,
      receiver: account,
      totalDeposit,
      startTime: Math.floor(Date.now() / 1000),
      duration,
      flowedAmount: 0,
      remainingBalance: totalDeposit,
    };
  } catch (error) {
    console.error('Error creating stream:', error);
    setTxStatus({
      pending: false,
      hash: null,
      success: false,
      error: error.message,
    });
    throw error;
  }
}, [contract, account, createStreamContract, getVUSDCBalance]);

  /**
   * List a stream for sale (add to orderBook)
   * Automatically calculates risk score using AI risk engine
   * 
   * @param {string} streamId - ID of stream to list
   * @param {number} percentage - Percentage of stream (0-100)
   * @param {number} priceRatio - Price as ratio of face value (0-1)
   * @param {Array} sellerHistory - Optional transaction history for risk calculation
   */
  const listStreamForSale = useCallback((streamId, percentage, priceRatio, sellerHistory = []) => {
    const stream = activeStreams.find((s) => s.id === streamId);
    if (!stream) {
      throw new Error('Stream not found');
    }

    // Calculate risk score using AI risk engine
    const riskAssessment = calculateStreamRisk(stream, sellerHistory);

    const newOrder = {
      id: `order_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      streamId,
      seller: stream.receiver,
      percentage,
      priceRatio,
      riskScore: riskAssessment.score, // AI-calculated risk score
      riskLevel: riskAssessment.riskLevel, // A, B, C, or D
      recommendedDiscount: riskAssessment.recommendedDiscount,
      listedAt: Math.floor(Date.now() / 1000),
      impliedValue: 0, // Will be calculated by useEffect
    };

    setOrderBook((prev) => [...prev, newOrder]);

    // Add to order history
    const historyEntry = {
      ...newOrder,
      status: 'listed',
    };
    setOrderHistory((prev) => {
      const updated = [...prev, historyEntry];
      localStorage.setItem('volt_order_history', JSON.stringify(updated));
      return updated;
    });

    return newOrder;
  }, [activeStreams]);

  /**
   * Cancel order function
   * Removes order from orderBook and adds to history
   */
  const cancelOrder = useCallback((orderId) => {
    const order = orderBook.find((o) => o.id === orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    // Add to history
    const historyEntry = {
      ...order,
      status: 'cancelled',
      cancelledAt: Math.floor(Date.now() / 1000),
    };
    setOrderHistory((prev) => {
      const updated = [...prev, historyEntry];
      localStorage.setItem('volt_order_history', JSON.stringify(updated));
      return updated;
    });

    // Remove order from orderBook
    setOrderBook((prevOrders) => prevOrders.filter((o) => o.id !== orderId));
    return true;
  }, [orderBook]);

  /**
   * Place bid function
   * Creates a new bid on an order
   */
  const placeBid = useCallback((orderId, amount, discount) => {
    const order = orderBook.find((o) => o.id === orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    if (!user.address) {
      throw new Error('Please connect your wallet first');
    }

    const priceRatio = 1 - (discount / 100);
    const newBid = {
      id: `bid_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      orderId,
      bidder: user.address,
      amount: parseFloat(amount),
      discount: parseFloat(discount),
      priceRatio,
      status: 'pending', // 'pending' | 'accepted' | 'rejected' | 'cancelled'
      createdAt: Math.floor(Date.now() / 1000),
    };

    setBids((prev) => {
      const updated = [...prev, newBid];
      localStorage.setItem('volt_bids', JSON.stringify(updated));
      return updated;
    });

    return newBid;
  }, [orderBook, user.address]);

  /**
   * Cancel bid function
   * Updates bid status to 'cancelled'
   */
  const cancelBid = useCallback((bidId) => {
    const bid = bids.find((b) => b.id === bidId);
    if (!bid) {
      throw new Error('Bid not found');
    }

    if (bid.bidder.toLowerCase() !== user.address?.toLowerCase()) {
      throw new Error('You can only cancel your own bids');
    }

    if (bid.status !== 'pending') {
      throw new Error('Only pending bids can be cancelled');
    }

    setBids((prev) => {
      const updated = prev.map((b) =>
        b.id === bidId ? { ...b, status: 'cancelled' } : b
      );
      localStorage.setItem('volt_bids', JSON.stringify(updated));
      return updated;
    });

    return true;
  }, [bids, user.address]);

  /**
   * Accept bid function (for sellers)
   * Accepts a bid and executes the trade
   */
  const acceptBid = useCallback((bidId) => {
    const bid = bids.find((b) => b.id === bidId);
    if (!bid) {
      throw new Error('Bid not found');
    }

    const order = orderBook.find((o) => o.id === bid.orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    if (order.seller.toLowerCase() !== user.address?.toLowerCase()) {
      throw new Error('Only the seller can accept bids');
    }

    if (bid.status !== 'pending') {
      throw new Error('Only pending bids can be accepted');
    }

    // Execute the trade (similar to buyStream)
    const stream = activeStreams.find((s) => s.id === order.streamId);
    if (!stream) {
      throw new Error('Stream not found');
    }

    // Update bid status
    setBids((prev) => {
      const updated = prev.map((b) =>
        b.id === bidId ? { ...b, status: 'accepted' } : b
      );
      localStorage.setItem('volt_bids', JSON.stringify(updated));
      return updated;
    });

    // Remove order from orderBook
    setOrderBook((prevOrders) => prevOrders.filter((o) => o.id !== order.id));

    // Update stream receiver
    setActiveStreams((prevStreams) =>
      prevStreams.map((s) =>
        s.id === order.streamId
          ? { ...s, receiver: bid.bidder }
          : s
      )
    );

    // Deduct from bidder's balance (mock - in production this would be a transaction)
    setUser((prev) => ({
      ...prev,
      balanceVUSDC: prev.balanceVUSDC - bid.amount,
    }));

    // Add to trade history
    const tradeEntry = {
      id: `trade_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      orderId: order.id,
      streamId: stream.id,
      seller: order.seller,
      buyer: bid.bidder,
      amount: (stream.remainingBalance * order.percentage) / 100,
      price: bid.amount,
      percentage: order.percentage,
      executedAt: Math.floor(Date.now() / 1000),
      txHash: null,
      viaBid: true,
      bidId,
    };
    setTradeHistory((prev) => {
      const updated = [...prev, tradeEntry];
      localStorage.setItem('volt_trade_history', JSON.stringify(updated));
      return updated;
    });

    // Add order to history
    const historyEntry = {
      ...order,
      status: 'sold',
      soldAt: Math.floor(Date.now() / 1000),
    };
    setOrderHistory((prev) => {
      const updated = [...prev, historyEntry];
      localStorage.setItem('volt_order_history', JSON.stringify(updated));
      return updated;
    });

    return {
      type: 'BID_ACCEPTED',
      bidId,
      orderId: order.id,
      streamId: stream.id,
      purchasePrice: bid.amount,
    };
  }, [bids, orderBook, activeStreams, user.address]);

  /**
   * Reject bid function (for sellers)
   */
  const rejectBid = useCallback((bidId) => {
    const bid = bids.find((b) => b.id === bidId);
    if (!bid) {
      throw new Error('Bid not found');
    }

    const order = orderBook.find((o) => o.id === bid.orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    if (order.seller.toLowerCase() !== user.address?.toLowerCase()) {
      throw new Error('Only the seller can reject bids');
    }

    if (bid.status !== 'pending') {
      throw new Error('Only pending bids can be rejected');
    }

    setBids((prev) => {
      const updated = prev.map((b) =>
        b.id === bidId ? { ...b, status: 'rejected' } : b
      );
      localStorage.setItem('volt_bids', JSON.stringify(updated));
      return updated;
    });

    return true;
  }, [bids, orderBook, user.address]);

  // Save order book to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('volt_order_book', JSON.stringify(orderBook));
    } catch (e) {
      console.error('Error saving order book to localStorage:', e);
    }
  }, [orderBook]);

  // Save bids to localStorage whenever bids change
  useEffect(() => {
    localStorage.setItem('volt_bids', JSON.stringify(bids));
  }, [bids]);

  // Save order history to localStorage
  useEffect(() => {
    localStorage.setItem('volt_order_history', JSON.stringify(orderHistory));
  }, [orderHistory]);

  // Save trade history to localStorage
  useEffect(() => {
    localStorage.setItem('volt_trade_history', JSON.stringify(tradeHistory));
  }, [tradeHistory]);

  // Sync account from contract hook
  useEffect(() => {
    if (account && account !== user.address) {
      setUser((prev) => ({
        ...prev,
        address: account,
      }));
    } else if (!account && user.address) {
      setUser((prev) => ({
        ...prev,
        address: null,
      }));
    }
  }, [account, user.address]);

  // Fetch stream data periodically when connected
  useEffect(() => {
    if (!account || !contract) return;

    const fetchUserStreamsData = async () => {
      try {
        console.log('🔄 [Periodic] Fetching streams for account:', account);
        const streamsData = await fetchUserStreams(account);
        console.log('🔄 [Periodic] Streams data:', streamsData);
        console.log('🔄 [Periodic] Streams count:', streamsData?.length || 0);
        
        if (streamsData && streamsData.length > 0) {
          const newStreams = streamsData.map((streamData) => ({
            id: streamData.id,
            sender: account,
            receiver: account,
            totalDeposit: parseFloat(streamData.totalDeposit),
            startTime: streamData.startTime,
            duration: streamData.duration,
            claimedAmount: parseFloat(streamData.claimedAmount),
            flowedAmount: parseFloat(streamData.claimedAmount),
            remainingBalance: parseFloat(streamData.totalDeposit) - parseFloat(streamData.claimedAmount) - parseFloat(streamData.soldAmount),
          }));

          console.log('🔄 [Periodic] Mapped streams:', newStreams);
          console.log('🔄 [Periodic] Setting activeStreams to:', newStreams);
          // COMPLETELY REPLACE activeStreams with fetched streams
setActiveStreams(newStreams);
} else {
  // No active streams for this user - clear all
  console.log('🔄 [Periodic] No streams found, clearing activeStreams');
  setActiveStreams([]);
}
      } catch (error) {
        console.error('❌ [Periodic] Error fetching streams:', error);
      }
    };

    // Fetch immediately
    fetchUserStreamsData();

    // Then fetch every 10 seconds
    const interval = setInterval(fetchUserStreamsData, 10000);

    return () => clearInterval(interval);
  }, [account, contract, fetchUserStreams]);

  // Fetch balance periodically
  useEffect(() => {
    if (!account || !contract) return;

    const fetchBalance = async () => {
      try {
        const [balance, vusdcBalance] = await Promise.all([
          getUSDCBalance(account),
          getVUSDCBalance ? getVUSDCBalance(account) : Promise.resolve(0),
        ]);
        setUser((prev) => ({
          ...prev,
          balanceUSDC: balance !== null && balance !== undefined ? balance : prev.balanceUSDC,
          balanceVUSDC: vusdcBalance !== null && vusdcBalance !== undefined ? vusdcBalance : prev.balanceVUSDC,
        }));
      } catch (error) {
        console.error('Error fetching balance:', error);
      }
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [account, contract, getUSDCBalance, getVUSDCBalance]);

  // Toast ref to avoid dependency issues
  const toastRef = useRef(toast);
  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

   // Setup contract event listeners
  useEffect(() => {
    if (!contract || !setupEventListeners) return;
    console.log('🎧 [Event Listener] Registering event listeners');

    const cleanup = setupEventListeners(
      // StreamCreated event handler
      (event) => {
        console.log('🔔 [StreamCreated] Event fired!');
       // toastRef.current.success(`Stream created! ID: ${event.streamId}, Amount: ${event.amount} vUSDC`);
        
        // Refresh stream data - fetch the new stream by ID
        if (account && event.streamId) {
          fetchStreamFromContract(event.streamId).then((streamData) => {
            if (streamData && streamData.isActive) {
              const stream = {
                id: streamData.id,
                sender: account,
                receiver: account,
                totalDeposit: parseFloat(streamData.totalDeposit),
                startTime: streamData.startTime,
                duration: streamData.duration,
                claimedAmount: parseFloat(streamData.claimedAmount),
                remainingBalance: parseFloat(streamData.totalDeposit) - parseFloat(streamData.claimedAmount) - parseFloat(streamData.soldAmount),
              };

              setActiveStreams((prev) => {
                const existingIndex = prev.findIndex((s) => s.id === streamData.id);
                if (existingIndex >= 0) {
                  const updated = [...prev];
                  updated[existingIndex] = stream;
                  return updated;
                } else {
                  return [...prev, stream];
                }
              });
            }
          });
        } else if (account) {
          // Fallback: fetch all streams
          fetchUserStreams(account).then((streamsData) => {
            if (streamsData && streamsData.length > 0) {
              const newStreams = streamsData.map((streamData) => ({
                id: streamData.id,
                sender: account,
                receiver: account,
                totalDeposit: parseFloat(streamData.totalDeposit),
                startTime: streamData.startTime,
                duration: streamData.duration,
                claimedAmount: parseFloat(streamData.claimedAmount),
                remainingBalance: parseFloat(streamData.totalDeposit) - parseFloat(streamData.claimedAmount) - parseFloat(streamData.soldAmount),
              }));

              setActiveStreams((prev) => {
                const filtered = prev.filter((s) => s.sender.toLowerCase() !== account.toLowerCase());
                return [...filtered, ...newStreams];
              });
            }
          });
        }
      },
      // StreamSold event handler
      (event) => {
        toastRef.current.success(`Stream sold! Stream ID: ${event.streamId}, Amount: ${event.amountSold} vUSDC, Received: ${event.cashReceived} vUSDC`);
        
        // Refresh stream data - fetch the stream by ID
        if (account && event.streamId) {
          fetchStreamFromContract(event.streamId).then((streamData) => {
            if (streamData) {
              const stream = {
                id: streamData.id,
                sender: account,
                receiver: account,
                totalDeposit: parseFloat(streamData.totalDeposit),
                startTime: streamData.startTime,
                duration: streamData.duration,
                claimedAmount: parseFloat(streamData.claimedAmount),
                remainingBalance: parseFloat(streamData.totalDeposit) - parseFloat(streamData.claimedAmount) - parseFloat(streamData.soldAmount),
              };

              setActiveStreams((prev) => {
                const existingIndex = prev.findIndex((s) => s.id === streamData.id);
                if (existingIndex >= 0) {
                  const updated = [...prev];
                  updated[existingIndex] = stream;
                  return updated;
                } else {
                  return [...prev, stream];
                }
              });
            }
          });
        }
      },
      // Withdraw event handler
      (event) => {
        //toastRef.current.success(`Withdrawn from stream ${event.streamId}: ${event.amount} vUSDC`);
        
        // Refresh stream data and balance
        if (account && event.streamId) {
          Promise.all([
            fetchStreamFromContract(event.streamId),
            getUSDCBalance(account),
            getVUSDCBalance ? getVUSDCBalance(account) : Promise.resolve(0),
          ]).then(([streamData, balance, vusdcBalance]) => {
            if (streamData) {
              const stream = {
                id: streamData.id,
                sender: account,
                receiver: account,
                totalDeposit: parseFloat(streamData.totalDeposit),
                startTime: streamData.startTime,
                duration: streamData.duration,
                claimedAmount: parseFloat(streamData.claimedAmount),
                remainingBalance: parseFloat(streamData.totalDeposit) - parseFloat(streamData.claimedAmount) - parseFloat(streamData.soldAmount),
              };

              setActiveStreams((prev) => {
                const existingIndex = prev.findIndex((s) => s.id === streamData.id);
                if (existingIndex >= 0) {
                  const updated = [...prev];
                  updated[existingIndex] = stream;
                  return updated;
                } else {
                  return [...prev, stream];
                }
              });
            }

            setUser((prev) => ({
              ...prev,
              balanceUSDC: balance !== null && balance !== undefined ? balance : prev.balanceUSDC,
              balanceVUSDC: vusdcBalance !== null && vusdcBalance !== undefined ? vusdcBalance : prev.balanceVUSDC,
            }));
          });
        }
      }
    );

  return () => {
      console.log('🧹 [Cleanup] Called:', Math.random());
      console.log('🧹 Cleaning up event listeners');
      if (cleanup) cleanup();
    };
  }, [contract]);

  const value = {
    // State
    user,
    activeStreams,
    orderBook,
    bids,
    orderHistory,
    tradeHistory,
    txStatus,

    // Contract state
    provider,
    signer,
    contract,
    network,
    isConnecting,
    contractError,

    // Toast notifications
    toast,

    // Actions
    connectWallet,
    disconnectWallet,
    buyStream,
    createStream,
    listStreamForSale,
    cancelOrder,
    placeBid,
    cancelBid,
    acceptBid,
    rejectBid,
    withdrawFromStream,
    sellShare,
    
    // vUSDC functions
    getVUSDCBalance,
    getFaucetBalance,
    requestVUSDCFromFaucet,

    // Setters (for advanced use cases)
    setUser,
    setActiveStreams,
    setOrderBook,
    setBids,
    setTxStatus,
  };

  // Ensure value is always defined
  if (!value) {
    console.error('VoltProvider: value is undefined!');
    return <div>Error: VoltProvider failed to initialize</div>;
  }

  return <VoltContext.Provider value={value}>{children}</VoltContext.Provider>;
};

/**
 * Hook to use VoltContext
 */
export const useVolt = () => {
  const context = useContext(VoltContext);
  if (context === undefined) {
    throw new Error('useVolt must be used within a VoltProvider');
  }
  return context;
};
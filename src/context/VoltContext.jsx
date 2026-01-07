import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ethers } from 'ethers';
import { calculateStreamRisk } from '../hooks/useRiskEngine';
import { useVoltContract } from '../hooks/useVoltContract';
import { CONTRACT_ADDRESSES } from '../config';

const VoltContext = createContext(undefined);

import { sanitizeInput } from '../utils/sanitize';

export const VoltProvider = ({ children }) => {
  // Toast state
  const [toasts, setToasts] = useState([]);
  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    const safeMessage = sanitizeInput(message);
    const id = Date.now() + Math.random();
    const toast = { id, message: safeMessage, type, duration };
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
    creditScore: 750,
    balanceUSDC: 10000.0,
    balanceVUSDC: 0,
  });

  const [txStatus, setTxStatus] = useState({
    pending: false,
    hash: null,
    success: false,
    error: null,
  });

  const [activeStreams, setActiveStreams] = useState([]);

  // NEW: OrderBook from contract (no localStorage)
  const [orderBook, setOrderBook] = useState([]);

  // Bids - Keep localStorage for now (can be moved to contract later)
  const [bids, setBids] = useState(() => {
    try {
      const saved = localStorage.getItem('volt_bids');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [orderHistory, setOrderHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('volt_order_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [tradeHistory, setTradeHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('volt_trade_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const isMountedRef = useRef(true);

  // Real-time stream balance updates
  useEffect(() => {
    isMountedRef.current = true;

    const updateStreamBalances = () => {
      if (!isMountedRef.current) return;
      const now = Math.floor(Date.now() / 1000);

      setActiveStreams((prevStreams) => {
        return prevStreams.map((stream) => {
          const elapsedTime = Math.max(0, now - stream.startTime);
          const ratePerSecond = stream.duration > 0 ? stream.totalDeposit / stream.duration : 0;
          const flowedAmount = Math.min(elapsedTime * ratePerSecond, stream.totalDeposit);
          const remainingBalance = Math.max(0, stream.totalDeposit - flowedAmount);

          return {
            ...stream,
            flowedAmount: Math.round(flowedAmount * 1000000) / 1000000,
            remainingBalance: Math.round(remainingBalance * 1000000) / 1000000,
          };
        });
      });
    };

    updateStreamBalances();
    const intervalId = setInterval(updateStreamBalances, 1000);

    return () => {
      isMountedRef.current = false;
      clearInterval(intervalId);
    };
  }, []);

  // Recalculate implied values for orders
  useEffect(() => {
    if (!isMountedRef.current) return;

    setOrderBook((prevOrders) => {
      return prevOrders.map((order) => {
        const stream = activeStreams.find((s) => s.id === order.streamId);
        
        if (!stream) {
          return { ...order, impliedValue: 0 };
        }

        const streamValueAtPercentage = (stream.remainingBalance * order.percentage) / 100;
        const impliedValue = streamValueAtPercentage * order.priceRatio;

        return {
          ...order,
          impliedValue: Math.round(impliedValue * 1000000) / 1000000,
        };
      });
    });
  }, [activeStreams]);

  // NEW: Fetch orders from contract
  const fetchOrdersFromContract = useCallback(async () => {
    if (!contract) return;
    
    try {
      console.log('📋 Fetching orders from contract...');
      const ordersData = await contract.getAllOrders();
      
      const mappedOrders = ordersData.map((order) => ({
        id: order.orderId.toString(),
        streamId: order.streamId.toString(),
        seller: order.seller,
        price: parseFloat(ethers.formatEther(order.price)),
        percentage: Number(order.percentage),
        priceRatio: 0.9, // Default - calculate from price if needed
        listedAt: Number(order.listedAt),
        isActive: order.isActive,
        riskScore: 50, // Default - can calculate
        riskLevel: 'B', // Default
        impliedValue: 0, // Will be calculated by useEffect
      }));
      
      console.log('✅ Fetched orders:', mappedOrders);
      setOrderBook(mappedOrders);
    } catch (error) {
      console.error('❌ Error fetching orders:', error);
    }
  }, [contract]);

  // Fetch orders periodically
  useEffect(() => {
    if (!contract) return;
    
    fetchOrdersFromContract();
    
    const interval = setInterval(fetchOrdersFromContract, 15000); // Every 15 seconds
    
    return () => clearInterval(interval);
  }, [contract, fetchOrdersFromContract]);

  const connectWallet = useCallback(async () => {
    try {
      const address = await connectWalletContract();
      
      setUser((prev) => ({
        ...prev,
        address,
      }));

      const [balance, vusdcBalance] = await Promise.all([
        getUSDCBalance(address),
        getVUSDCBalance ? getVUSDCBalance(address) : Promise.resolve(0),
      ]);
      setUser((prev) => ({
        ...prev,
        balanceUSDC: balance || prev.balanceUSDC,
        balanceVUSDC: vusdcBalance || 0,
      }));

      console.log('🔍 Fetching user streams...');
      const streamsData = await fetchUserStreams(address);
      
      if (streamsData && streamsData.length > 0) {
        const newStreams = streamsData.map((streamData) => ({
          id: streamData.id,
          sender: address,
          receiver: address,
          totalDeposit: parseFloat(streamData.totalDeposit),
          startTime: streamData.startTime,
          duration: streamData.duration,
          claimedAmount: parseFloat(streamData.claimedAmount),
          flowedAmount: parseFloat(streamData.claimedAmount),
          remainingBalance: parseFloat(streamData.totalDeposit) - parseFloat(streamData.claimedAmount) - parseFloat(streamData.soldAmount),
        }));

        setActiveStreams(newStreams);
      } else {
        setActiveStreams([]);
      }

      // Fetch orders after connecting
      await fetchOrdersFromContract();

      return address;
    } catch (error) {
      console.error('Error connecting wallet:', error);
      throw error;
    }
  }, [connectWalletContract, getUSDCBalance, getVUSDCBalance, fetchUserStreams, fetchOrdersFromContract]);

  const disconnectWallet = useCallback(() => {
    disconnectWalletContract();
    setUser((prev) => ({
      ...prev,
      address: null,
    }));
  }, [disconnectWalletContract]);

  // NEW: Buy stream via contract
  const buyStream = useCallback(async (orderId) => {
    if (!contract || !account) {
      throw new Error('Wallet not connected');
    }

    const order = orderBook.find((o) => o.id === orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    const priceWei = ethers.parseEther(order.price.toString());

    try {
      // Check vUSDC balance
      const balance = await getVUSDCBalance(account);
      if (balance < order.price) {
        throw new Error(`Insufficient vUSDC balance. Need ${order.price.toFixed(6)} vUSDC`);
      }

      // Check and approve vUSDC
      const vusdcAddress = CONTRACT_ADDRESSES.vusdcToken;
      const vusdcContract = new ethers.Contract(
        vusdcAddress,
        ['function allowance(address owner, address spender) view returns (uint256)', 'function approve(address spender, uint256 amount) returns (bool)'],
        signer
      );
      
      const contractAddress = await contract.getAddress();
      const allowance = await vusdcContract.allowance(account, contractAddress);
      
      if (allowance < priceWei) {
        toast.info('Approving vUSDC...');
        const approveTx = await vusdcContract.approve(contractAddress, priceWei * BigInt(2));
        await approveTx.wait();
      }

      toast.info('Buying stream...');
      
      const tx = await contract.buyOrder(orderId);
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        toast.success('Stream purchased successfully!');
        
        // Refresh orders and streams
        await Promise.all([
          fetchOrdersFromContract(),
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
                flowedAmount: parseFloat(streamData.claimedAmount),
                remainingBalance: parseFloat(streamData.totalDeposit) - parseFloat(streamData.claimedAmount) - parseFloat(streamData.soldAmount),
              }));
              setActiveStreams(newStreams);
            }
          })
        ]);

        // Update balance
        const vusdcBalance = await getVUSDCBalance(account);
        setUser((prev) => ({ ...prev, balanceVUSDC: vusdcBalance }));
        
        return {
          type: 'STREAM_REDIRECTED',
          purchasePrice: order.price,
        };
      } else {
        throw new Error('Transaction failed');
      }
    } catch (error) {
      console.error('Error buying stream:', error);
      toast.error(error.message || 'Failed to purchase stream');
      throw error;
    }
  }, [contract, account, orderBook, getVUSDCBalance, signer, toast, fetchOrdersFromContract, fetchUserStreams]);

  const createStream = useCallback(async (receiver, totalDeposit, duration) => {
    if (!contract || !account) {
      throw new Error('Wallet not connected');
    }

    setTxStatus({ pending: true, hash: null, success: false, error: null });

    try {
      const result = await createStreamContract(duration, totalDeposit);

      setTxStatus({
        pending: false,
        hash: result.txHash,
        success: result.success,
        error: null,
      });

      const vusdcBalance = await getVUSDCBalance(account);
      setUser((prev) => ({
        ...prev,
        balanceVUSDC: vusdcBalance || prev.balanceVUSDC - totalDeposit,
      }));

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

  // NEW: List stream for sale via contract
  const listStreamForSale = useCallback(async (streamId, percentage, priceRatio, sellerHistory = []) => {
    if (!contract || !account) {
      throw new Error('Wallet not connected');
    }

    const stream = activeStreams.find((s) => s.id === streamId);
    if (!stream) {
      throw new Error('Stream not found');
    }

    // Calculate risk score
    const riskAssessment = calculateStreamRisk(stream, sellerHistory);

    // Calculate price
    const streamValue = stream.remainingBalance * (percentage / 100);
    const price = streamValue * priceRatio;
    const priceWei = ethers.parseEther(price.toString());

    try {
      toast.info('Creating sell order...');
      
      const tx = await contract.createOrder(streamId, priceWei, percentage);
      
      // Wait for transaction confirmation FIRST
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        // Show success AFTER confirmation
        toast.success('Order created successfully!');
        
        // Refresh orders
        await fetchOrdersFromContract();
        
        return {
          success: true,
          txHash: receipt.hash,
        };
      } else {
        throw new Error('Transaction failed');
      }
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error(error.message || 'Failed to create order');
      throw error;
    }
  }, [contract, account, activeStreams, toast, fetchOrdersFromContract]);

  // NEW: Cancel order via contract
  const cancelOrder = useCallback(async (orderId) => {
    if (!contract || !account) {
      throw new Error('Wallet not connected');
    }

    try {
      toast.info('Cancelling order...');
      
      const tx = await contract.cancelOrder(orderId);
      
      // Wait for transaction confirmation FIRST
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        // Show success AFTER confirmation
        toast.success('Order cancelled successfully!');
        
        // Refresh orders
        await fetchOrdersFromContract();
        
        return true;
      } else {
        throw new Error('Transaction failed');
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast.error(error.message || 'Failed to cancel order');
      throw error;
    }
  }, [contract, account, toast, fetchOrdersFromContract]);

  // Bids - Keep existing functionality (localStorage based)
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
      status: 'pending',
      createdAt: Math.floor(Date.now() / 1000),
    };

    setBids((prev) => {
      const updated = [...prev, newBid];
      localStorage.setItem('volt_bids', JSON.stringify(updated));
      return updated;
    });

    return newBid;
  }, [orderBook, user.address]);

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

  const acceptBid = useCallback((bidId) => {
    // Keep existing bid acceptance logic (not on contract yet)
    const bid = bids.find((b) => b.id === bidId);
    if (!bid) throw new Error('Bid not found');
    
    const order = orderBook.find((o) => o.id === bid.orderId);
    if (!order) throw new Error('Order not found');
    
    if (order.seller.toLowerCase() !== user.address?.toLowerCase()) {
      throw new Error('Only the seller can accept bids');
    }
    
    if (bid.status !== 'pending') {
      throw new Error('Only pending bids can be accepted');
    }

    const stream = activeStreams.find((s) => s.id === order.streamId);
    if (!stream) throw new Error('Stream not found');

    setBids((prev) => {
      const updated = prev.map((b) =>
        b.id === bidId ? { ...b, status: 'accepted' } : b
      );
      localStorage.setItem('volt_bids', JSON.stringify(updated));
      return updated;
    });

    setOrderBook((prevOrders) => prevOrders.filter((o) => o.id !== order.id));
    setActiveStreams((prevStreams) =>
      prevStreams.map((s) =>
        s.id === order.streamId ? { ...s, receiver: bid.bidder } : s
      )
    );

    setUser((prev) => ({
      ...prev,
      balanceVUSDC: prev.balanceVUSDC - bid.amount,
    }));

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

    return {
      type: 'BID_ACCEPTED',
      bidId,
      orderId: order.id,
      streamId: stream.id,
      purchasePrice: bid.amount,
    };
  }, [bids, orderBook, activeStreams, user.address]);

  const rejectBid = useCallback((bidId) => {
    const bid = bids.find((b) => b.id === bidId);
    if (!bid) throw new Error('Bid not found');

    const order = orderBook.find((o) => o.id === bid.orderId);
    if (!order) throw new Error('Order not found');

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

  useEffect(() => {
    localStorage.setItem('volt_bids', JSON.stringify(bids));
  }, [bids]);

  useEffect(() => {
    localStorage.setItem('volt_order_history', JSON.stringify(orderHistory));
  }, [orderHistory]);

  useEffect(() => {
    localStorage.setItem('volt_trade_history', JSON.stringify(tradeHistory));
  }, [tradeHistory]);

  useEffect(() => {
    if (account && account !== user.address) {
      setUser((prev) => ({ ...prev, address: account }));
    } else if (!account && user.address) {
      setUser((prev) => ({ ...prev, address: null }));
    }
  }, [account, user.address]);

  useEffect(() => {
    if (!account || !contract) return;

    const fetchUserStreamsData = async () => {
      try {
        const streamsData = await fetchUserStreams(account);
        
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

          setActiveStreams(newStreams);
        } else {
          setActiveStreams([]);
        }
      } catch (error) {
        console.error('Error fetching streams:', error);
      }
    };

    fetchUserStreamsData();
    const interval = setInterval(fetchUserStreamsData, 10000);

    return () => clearInterval(interval);
  }, [account, contract, fetchUserStreams]);

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
    const interval = setInterval(fetchBalance, 30000);

    return () => clearInterval(interval);
  }, [account, contract, getUSDCBalance, getVUSDCBalance]);

  const toastRef = useRef(toast);
  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  useEffect(() => {
    if (!contract || !setupEventListeners) return;

    const cleanup = setupEventListeners(
      (event) => {
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
        }
      },
      (event) => {
        toastRef.current.success(`Stream sold! Amount: ${event.amountSold} vUSDC`);
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
      (event) => {
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
      if (cleanup) cleanup();
    };
  }, [contract]);

  const value = {
    user,
    activeStreams,
    orderBook,
    bids,
    orderHistory,
    tradeHistory,
    txStatus,
    provider,
    signer,
    contract,
    network,
    isConnecting,
    contractError,
    toast,
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
    getVUSDCBalance,
    getFaucetBalance,
    requestVUSDCFromFaucet,
    fetchOrdersFromContract, // NEW
    setUser,
    setActiveStreams,
    setOrderBook,
    setBids,
    setTxStatus,
  };

  if (!value) {
    console.error('VoltProvider: value is undefined!');
    return <div>Error: VoltProvider failed to initialize</div>;
  }

  return <VoltContext.Provider value={value}>{children}</VoltContext.Provider>;
};

export const useVolt = () => {
  const context = useContext(VoltContext);
  if (context === undefined) {
    throw new Error('useVolt must be used within a VoltProvider');
  }
  return context;
};
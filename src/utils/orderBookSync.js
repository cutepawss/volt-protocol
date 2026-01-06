/**
 * Order Book Sync Utility
 * 
 * Provides utilities for syncing order book data:
 * - localStorage persistence (current)
 * - On-chain sync (future)
 * - IPFS sync (future)
 * 
 * This module provides a unified interface for order book storage
 * that can be easily migrated to on-chain or IPFS in the future.
 */

/**
 * Save order book to storage
 * Currently uses localStorage, but can be extended to use on-chain or IPFS
 */
export const saveOrderBook = async (orderBook) => {
  try {
    // Current implementation: localStorage
    localStorage.setItem('volt_order_book', JSON.stringify(orderBook));
    
    // TODO: Future implementation
    // - Option A: Save to smart contract events
    // - Option B: Save to IPFS and index with The Graph
    // - Option C: Save to centralized backend API
    
    return { success: true };
  } catch (error) {
    console.error('Error saving order book:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Load order book from storage
 */
export const loadOrderBook = async () => {
  try {
    // Current implementation: localStorage
    const saved = localStorage.getItem('volt_order_book');
    return saved ? JSON.parse(saved) : [];
    
    // TODO: Future implementation
    // - Option A: Fetch from smart contract events
    // - Option B: Fetch from IPFS via The Graph
    // - Option C: Fetch from centralized backend API
  } catch (error) {
    console.error('Error loading order book:', error);
    return [];
  }
};

/**
 * Sync order book with remote source
 * This will be used when migrating to on-chain or IPFS
 */
export const syncOrderBook = async (localOrderBook, options = {}) => {
  const { 
    source = 'localStorage', // 'localStorage' | 'onchain' | 'ipfs' | 'api'
    contract = null,
    ipfsClient = null,
    apiEndpoint = null,
  } = options;

  try {
    switch (source) {
      case 'localStorage':
        // Current implementation - no sync needed
        return { success: true, data: localOrderBook };
        
      case 'onchain':
        // TODO: Fetch orders from smart contract events
        // const events = await contract.queryFilter(contract.filters.OrderCreated());
        // return { success: true, data: parseOrderEvents(events) };
        throw new Error('On-chain sync not yet implemented');
        
      case 'ipfs':
        // TODO: Fetch from IPFS via The Graph
        // const query = buildGraphQLQuery();
        // const result = await theGraphClient.query({ query });
        // return { success: true, data: parseGraphQLResult(result) };
        throw new Error('IPFS sync not yet implemented');
        
      case 'api':
        // TODO: Fetch from centralized API
        // const response = await fetch(apiEndpoint);
        // const data = await response.json();
        // return { success: true, data: data.orders };
        throw new Error('API sync not yet implemented');
        
      default:
        throw new Error(`Unknown sync source: ${source}`);
    }
  } catch (error) {
    console.error('Error syncing order book:', error);
    return { success: false, error: error.message, data: localOrderBook };
  }
};

/**
 * Merge local and remote order books
 * Handles conflicts and deduplication
 */
export const mergeOrderBooks = (localOrders, remoteOrders) => {
  // Create a map of orders by ID for quick lookup
  const orderMap = new Map();
  
  // Add local orders first
  localOrders.forEach(order => {
    orderMap.set(order.id, order);
  });
  
  // Merge remote orders (remote takes precedence for conflicts)
  remoteOrders.forEach(order => {
    orderMap.set(order.id, order);
  });
  
  // Convert back to array and sort by listedAt (newest first)
  return Array.from(orderMap.values()).sort((a, b) => b.listedAt - a.listedAt);
};

/**
 * Filter active orders (orders with valid streams)
 */
export const filterActiveOrders = (orders, streams) => {
  return orders.filter(order => {
    const stream = streams.find(s => s.id === order.streamId);
    return stream && stream.remainingBalance > 0;
  });
};

/**
 * Validate order structure
 */
export const validateOrder = (order) => {
  const requiredFields = ['id', 'streamId', 'seller', 'percentage', 'priceRatio', 'listedAt'];
  const missingFields = requiredFields.filter(field => !(field in order));
  
  if (missingFields.length > 0) {
    return {
      valid: false,
      errors: [`Missing required fields: ${missingFields.join(', ')}`],
    };
  }
  
  // Validate field types and ranges
  const errors = [];
  
  if (typeof order.percentage !== 'number' || order.percentage <= 0 || order.percentage > 100) {
    errors.push('Percentage must be a number between 0 and 100');
  }
  
  if (typeof order.priceRatio !== 'number' || order.priceRatio <= 0 || order.priceRatio > 1) {
    errors.push('Price ratio must be a number between 0 and 1');
  }
  
  if (typeof order.listedAt !== 'number' || order.listedAt <= 0) {
    errors.push('ListedAt must be a valid Unix timestamp');
  }
  
  if (order.riskScore !== undefined && (order.riskScore < 0 || order.riskScore > 100)) {
    errors.push('Risk score must be between 0 and 100');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Generate unique order ID
 */
export const generateOrderId = () => {
  return `order_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};


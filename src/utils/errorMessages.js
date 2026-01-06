/**
 * Error Message Utilities
 * 
 * Provides user-friendly error messages for common blockchain/transaction errors
 */

/**
 * Get user-friendly error message from error object
 * 
 * @param {Error|Object} error - Error object from catch block
 * @returns {string} User-friendly error message
 */
export const getErrorMessage = (error) => {
  if (!error) {
    return 'An unknown error occurred. Please try again.';
  }

  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }

  // Handle Error objects
  const errorMessage = error.message || error.toString();
  const errorCode = error.code;
  const errorReason = error.reason;

  // MetaMask/Provider errors
  if (errorCode === 4001) {
    return 'Transaction was rejected. Please approve the transaction in your wallet to continue.';
  }

  if (errorCode === 4902) {
    return 'Network not found. Please add Arc Testnet to your wallet.';
  }

  if (errorCode === -32002) {
    return 'A request is already pending. Please check your wallet and try again.';
  }

  // Transaction errors
  if (errorMessage.includes('insufficient funds') || errorMessage.includes('insufficient balance')) {
    return 'Insufficient balance. Please ensure you have enough USDC to complete this transaction.';
  }

  if (errorMessage.includes('user rejected') || errorMessage.includes('User denied')) {
    return 'Transaction was cancelled. Please try again when ready.';
  }

  if (errorMessage.includes('network') && errorMessage.includes('mismatch')) {
    return 'Network mismatch. Please switch to Arc Testnet in your wallet.';
  }

  if (errorMessage.includes('cooldown') || errorMessage.includes('Cooldown')) {
    return 'You are currently in cooldown. Please wait before requesting tokens again.';
  }

  if (errorMessage.includes('revert') || errorMessage.includes('execution reverted')) {
    // Try to extract revert reason
    const revertMatch = errorMessage.match(/revert\s+(.+)/i);
    if (revertMatch) {
      return `Transaction failed: ${revertMatch[1]}`;
    }
    return 'Transaction failed. Please check your inputs and try again.';
  }

  if (errorMessage.includes('nonce') || errorMessage.includes('replacement transaction')) {
    return 'Transaction conflict. Please wait a moment and try again.';
  }

  if (errorMessage.includes('gas') || errorMessage.includes('out of gas')) {
    return 'Transaction failed due to gas issues. Please try again with a higher gas limit.';
  }

  // Contract-specific errors
  if (errorReason) {
    return `Transaction failed: ${errorReason}`;
  }

  // Network errors
  if (errorMessage.includes('network') || errorMessage.includes('connection')) {
    return 'Network error. Please check your internet connection and try again.';
  }

  // Rate limiting
  if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
    return 'Too many requests. Please wait a moment and try again.';
  }

  // Default: return original message if it's user-friendly, otherwise generic message
  if (errorMessage.length < 100 && !errorMessage.includes('0x')) {
    return errorMessage;
  }

  return 'An error occurred. Please try again or contact support if the problem persists.';
};

/**
 * Check if error is a user rejection (should not show as error)
 * 
 * @param {Error|Object} error - Error object
 * @returns {boolean} True if user rejected the action
 */
export const isUserRejection = (error) => {
  if (!error) return false;
  
  const errorCode = error.code;
  const errorMessage = (error.message || error.toString()).toLowerCase();
  
  return (
    errorCode === 4001 ||
    errorMessage.includes('user rejected') ||
    errorMessage.includes('user denied') ||
    errorMessage.includes('user cancelled')
  );
};

/**
 * Check if error is a network error
 * 
 * @param {Error|Object} error - Error object
 * @returns {boolean} True if it's a network-related error
 */
export const isNetworkError = (error) => {
  if (!error) return false;
  
  const errorMessage = (error.message || error.toString()).toLowerCase();
  
  return (
    errorMessage.includes('network') ||
    errorMessage.includes('connection') ||
    errorMessage.includes('fetch') ||
    errorMessage.includes('timeout')
  );
};

/**
 * Get error severity level
 * 
 * @param {Error|Object} error - Error object
 * @returns {'error'|'warning'|'info'} Severity level
 */
export const getErrorSeverity = (error) => {
  if (isUserRejection(error)) {
    return 'info'; // User rejection is not really an error
  }
  
  if (isNetworkError(error)) {
    return 'warning'; // Network errors are usually temporary
  }
  
  return 'error'; // Default to error
};


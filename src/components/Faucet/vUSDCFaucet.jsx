import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from '../../config';
import { useVolt } from '../../context/VoltContext';
import InfoBox from '../Shared/InfoBox';
import styles from './vUSDCFaucet.module.css';

/**
 * vUSDC Faucet Component
 * 
 * Allows users to request test vUSDC tokens for testing the Volt Protocol
 */

const vUSDCFaucet = () => {
  const { user, toast, getVUSDCBalance, getFaucetBalance, requestVUSDCFromFaucet, provider } = useVolt();
  const [isRequesting, setIsRequesting] = useState(false);
  const [faucetBalance, setFaucetBalance] = useState(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  
  const [lastRequestTime, setLastRequestTime] = useState(() => {
    const saved = localStorage.getItem('volt_faucet_last_request');
    return saved ? parseInt(saved) : 0;
  });

  // Update current time every second for countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Check blockchain cooldown
  useEffect(() => {
    const checkBlockchainCooldown = async () => {
      if (!user.address || !provider) return;
      
      try {
        const FAUCET_ABI = [
          {
            inputs: [{ name: 'user', type: 'address' }],
            name: 'lastRequestTime',
            outputs: [{ name: '', type: 'uint256' }],
            stateMutability: 'view',
            type: 'function',
          },
        ];
        
        const faucetContract = new ethers.Contract(
          CONTRACT_ADDRESSES.faucet,
          FAUCET_ABI,
          provider
        );
        
        const lastRequest = await faucetContract.lastRequestTime(user.address);
        const lastRequestTimestamp = Number(lastRequest) * 1000;
        
        if (lastRequestTimestamp > 0 && lastRequestTimestamp !== lastRequestTime) {
          localStorage.setItem('volt_faucet_last_request', lastRequestTimestamp.toString());
          setLastRequestTime(lastRequestTimestamp);
        }
      } catch (error) {
        console.error('Error checking blockchain cooldown:', error);
      }
    };
    
    checkBlockchainCooldown();
    const interval = setInterval(checkBlockchainCooldown, 5000);
    
    return () => clearInterval(interval);
  }, [user.address, provider, lastRequestTime]);

  // Refresh vUSDC balance when component mounts or user changes
  useEffect(() => {
    if (user.address && getVUSDCBalance) {
      getVUSDCBalance(user.address).then((balance) => {
        // Balance will be updated via context
      });
    }
  }, [user.address, getVUSDCBalance]);

  // Check faucet balance
  useEffect(() => {
    const checkFaucetBalance = async () => {
      if (getFaucetBalance) {
        const balance = await getFaucetBalance();
        setFaucetBalance(balance);
      }
    };
    checkFaucetBalance();
    const interval = setInterval(checkFaucetBalance, 30000);
    return () => clearInterval(interval);
  }, [getFaucetBalance]);

  const COOLDOWN_PERIOD = 24 * 60 * 60 * 1000;
  const FAUCET_AMOUNT = 1000;

  const canRequest = () => {
    if (!user.address) return false;
    const timeSinceLastRequest = currentTime - lastRequestTime;
    return timeSinceLastRequest >= COOLDOWN_PERIOD;
  };

  const getTimeUntilNextRequest = () => {
    if (!lastRequestTime) return null;
    const remaining = COOLDOWN_PERIOD - (currentTime - lastRequestTime);
    
    if (remaining <= 0) return null;
    
    const hours = Math.floor(remaining / (60 * 60 * 1000));
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
    const seconds = Math.floor((remaining % (60 * 1000)) / 1000);
    
    return { hours, minutes, seconds };
  };

  const handleRequest = async () => {
    if (!user.address) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!canRequest()) {
      const timeLeft = getTimeUntilNextRequest();
      if (timeLeft) {
        toast.warning(`Please wait ${timeLeft.hours}h ${timeLeft.minutes}m before requesting again`);
      }
      return;
    }

    setIsRequesting(true);

    try {
      if (!requestVUSDCFromFaucet) {
        console.error('requestVUSDCFromFaucet is not available');
        throw new Error('Faucet function not available. Please refresh the page and make sure wallet is connected.');
      }

      console.log('Calling faucet contract...', { 
        hasFunction: !!requestVUSDCFromFaucet,
        userAddress: user.address 
      });
      
      const result = await requestVUSDCFromFaucet();
      
      if (!result) {
        throw new Error('No result from faucet contract');
      }

      if (!result.success) {
        throw new Error('Transaction failed');
      }

      const now = Date.now();
      setLastRequestTime(now);
      localStorage.setItem('volt_faucet_last_request', now.toString());

      if (getVUSDCBalance) {
        await getVUSDCBalance(user.address);
      }

      toast.success(`Successfully received ${FAUCET_AMOUNT} vUSDC! Transaction: ${result.txHash.slice(0, 10)}...`);
    } catch (error) {
      console.error('Faucet request error:', error);
      const errorMessage = error.message || 'Failed to request tokens';
      toast.error(`Error: ${errorMessage}`);
    } finally {
      setIsRequesting(false);
    }
  };

  const timeLeft = getTimeUntilNextRequest();
  const canRequestNow = canRequest();

  return (
    <div className={styles.faucetContainer}>
      <InfoBox title="💧 vUSDC Faucet" type="success">
        <p>
          <strong>vUSDC (Volt USDC)</strong> is the test token for the Volt Protocol on Arc Network. 
          Use this faucet to get test tokens for free and try out the platform.
        </p>
        <p><strong>How it works:</strong></p>
        <ul>
          <li>Each wallet can request <strong>{FAUCET_AMOUNT} vUSDC</strong> once every 24 hours</li>
          <li>Tokens are sent directly to your connected wallet</li>
          <li>Use these tokens to create streams, buy stream shares, and test all features</li>
          <li>vUSDC is only for testing on Arc Testnet</li>
        </ul>
      </InfoBox>

      <div className={styles.faucetCard}>
        <div className={styles.faucetHeader}>
          <h3 className={styles.faucetTitle}>Request Test Tokens</h3>
          <div className={styles.faucetAmount}>
            {FAUCET_AMOUNT} vUSDC
          </div>
          {faucetBalance !== null && (
            <div className={styles.faucetBalance}>
              Faucet Balance: {faucetBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })} vUSDC
            </div>
          )}
        </div>

        {!user.address ? (
          <div className={styles.faucetMessage}>
            <p>Please connect your wallet to request test tokens</p>
          </div>
        ) : (
          <>
            {timeLeft ? (
              <div className={styles.cooldownInfo}>
                <div className={styles.cooldownLabel}>Next request available in:</div>
                <div className={styles.cooldownTime}>
                  {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
                </div>
              </div>
            ) : (
              <div className={styles.readyInfo}>
                <div className={styles.readyLabel}>✓ Ready to request</div>
                <div className={styles.readySubtext}>You can request {FAUCET_AMOUNT} vUSDC now</div>
              </div>
            )}

            <button
              onClick={handleRequest}
              disabled={isRequesting || !canRequestNow}
              className={styles.faucetButton}
            >
              {isRequesting ? (
                <>
                  <span className={styles.spinner}></span>
                  Requesting...
                </>
              ) : (
                <>
                  <span>💧</span>
                  Request {FAUCET_AMOUNT} vUSDC
                </>
              )}
            </button>

            <div className={styles.faucetNote}>
              <p>
                <strong>Note:</strong> This faucet is connected to a smart contract on Arc Network. 
                The 24-hour cooldown is enforced on the blockchain, not just in the frontend. 
                Make sure you're connected to Arc Testnet.
              </p>
              {faucetBalance !== null && faucetBalance < FAUCET_AMOUNT && (
                <p style={{ marginTop: '8px', fontSize: '0.8rem', color: '#ff6b6b' }}>
                  ⚠️ Warning: Faucet balance is low ({faucetBalance.toFixed(2)} vUSDC). 
                  Please contact the contract owner to refill the faucet.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default vUSDCFaucet;
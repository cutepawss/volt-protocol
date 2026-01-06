import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import VoltProtocolABI from '../VoltProtocol.json';
import { CONTRACT_ADDRESSES, NETWORK_CONFIG } from '../config';
import { getErrorMessage } from '../utils/errorMessages';

// Ensure ABI is in correct format (handle both {abi: [...]} and [...] formats)
const getABI = () => {
  if (Array.isArray(VoltProtocolABI)) {
    return VoltProtocolABI;
  }
  if (VoltProtocolABI && Array.isArray(VoltProtocolABI.abi)) {
    return VoltProtocolABI.abi;
  }
  console.error('❌ Invalid ABI format:', VoltProtocolABI);
  throw new Error('Invalid contract ABI format. Expected array or {abi: array}');
};

/**
 * useVoltContract Hook
 * 
 * Handles:
 * - Real wallet connection (MetaMask/Injected Provider)
 * - Contract instantiation
 * - Transaction execution
 * - Data fetching from blockchain
 * 
 * Contract Address: Configured via environment variables
 * Network: Configured via environment variables
 */

const CONTRACT_ADDRESS = CONTRACT_ADDRESSES.voltProtocol;
const USDC_TOKEN_ADDRESS = CONTRACT_ADDRESSES.usdcToken;
const VUSDC_TOKEN_ADDRESS = CONTRACT_ADDRESSES.vusdcToken;
const FAUCET_ADDRESS = CONTRACT_ADDRESSES.faucet;

// #region agent log - Contract address verification
console.log('🔍 Contract Address Check:', {
  configValue: CONTRACT_ADDRESSES.voltProtocol,
  envValue: import.meta.env.VITE_CONTRACT_ADDRESS,
  finalAddress: CONTRACT_ADDRESS,
  expectedNewAddress: '0x416B58ab512DFA5D44aa918aC817B9B17Dfd350a',
  isNewContract: CONTRACT_ADDRESS.toLowerCase() === '0x416b58ab512dfa5d44aa918ac817b9b17dfd350a'.toLowerCase()
});
fetch('http://127.0.0.1:7242/ingest/0036c2e9-2943-4b5d-9692-984770d55e8c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVoltContract.js:24',message:'Contract address verification',data:{configValue:CONTRACT_ADDRESSES.voltProtocol,envValue:import.meta.env.VITE_CONTRACT_ADDRESS,finalAddress:CONTRACT_ADDRESS,expectedNewAddress:'0x416B58ab512DFA5D44aa918aC817B9B17Dfd350a',isNewContract:CONTRACT_ADDRESS.toLowerCase()==='0x416b58ab512dfa5d44aa918ac817b9b17dfd350a'.toLowerCase()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'contract-address'})}).catch(()=>{});
// #endregion

// Standard ERC20 ABI - Using standard format to ensure MetaMask recognizes it correctly
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
];

export const useVoltContract = () => {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState(null);
  const [network, setNetwork] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Disconnect wallet
   */
  const disconnectWallet = useCallback(() => {
    setProvider(null);
    setSigner(null);
    setContract(null);
    setAccount(null);
    setNetwork(null);
    setError(null);
  }, []);

  /**
   * Switch to Arc Testnet or add it if not present
   */
  const switchToArcTestnet = useCallback(async () => {
    const chainId = `0x${NETWORK_CONFIG.chainId.toString(16)}`;
    
    try {
      // Try to switch to Arc Testnet (if already added)
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId }],
      });
      // If successful, network is already added and we've switched to it
      return;
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          // Add Arc Testnet to MetaMask
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: chainId,
                chainName: NETWORK_CONFIG.name,
                nativeCurrency: {
                  name: 'USDC',
                  symbol: 'USDC',
                  decimals: 18,
                },
                rpcUrls: [NETWORK_CONFIG.rpcUrl],
                blockExplorerUrls: null, // Arc Testnet might not have a block explorer
              },
            ],
          });
          
          // After adding, MetaMask usually switches automatically, but let's verify
          // Wait a bit for the network to be added and switched
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Try to switch again to ensure we're on the correct network
          try {
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId }],
            });
          } catch (retryError) {
            // If switch fails after adding, user might have rejected or there's an issue
            console.warn('Network added but switch failed:', retryError);
            // Continue anyway - the network was added, user can switch manually if needed
          }
        } catch (addError) {
          console.error('Error adding Arc Testnet:', addError);
          // If user rejected adding the network, throw error
          if (addError.code === 4001) {
            throw new Error('Network addition was rejected. Please add Arc Testnet manually.');
          }
          throw new Error(
            `Failed to add ${NETWORK_CONFIG.name} to your wallet. Please add it manually.`
          );
        }
      } else if (switchError.code === 4001) {
        // User rejected the switch
        throw new Error('Network switch was rejected. Please switch to Arc Testnet manually.');
      } else {
        // Other error
        console.error('Error switching network:', switchError);
        throw new Error(
          `Failed to switch to ${NETWORK_CONFIG.name}. Please switch manually in your wallet.`
        );
      }
    }
  }, []);

  /**
   * Connect wallet (MetaMask or Injected Provider)
   */
  const connectWallet = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      // Check if MetaMask is installed
      if (!window.ethereum) {
        const error = new Error('MetaMask is not installed. Please install MetaMask to continue.');
        setError(error.message);
        throw error;
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found. Please unlock MetaMask.');
      }

      const accountAddress = accounts[0];

      // Switch to Arc Testnet (or add it if not present)
      await switchToArcTestnet();

      // Create provider and signer
      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      const web3Signer = await web3Provider.getSigner();

      // Get network info
      const networkInfo = await web3Provider.getNetwork();
      setNetwork(networkInfo);

      // Verify we're on the correct network
      if (networkInfo.chainId !== NETWORK_CONFIG.chainId) {
        throw new Error(
          `Please switch to ${NETWORK_CONFIG.name} (Chain ID: ${NETWORK_CONFIG.chainId.toString()}) in your wallet.`
        );
      }

      // Instantiate contract
      const abi = getABI();
      const contractInstance = new ethers.Contract(
        CONTRACT_ADDRESS,
        abi,
        web3Signer
      );

      setProvider(web3Provider);
      setSigner(web3Signer);
      setContract(contractInstance);
      setAccount(accountAddress);

      // Listen for account changes
      window.ethereum.on('accountsChanged', (newAccounts) => {
        if (newAccounts.length === 0) {
          // User disconnected
          disconnectWallet();
        } else {
          setAccount(newAccounts[0]);
        }
      });

      // Listen for network changes
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });

      return accountAddress;
    } catch (err) {
      console.error('Wallet connection error:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, [disconnectWallet, switchToArcTestnet]);

  /**
   * Get user's USDC balance
   * 
   * Priority:
   * 1. If USDC_TOKEN_ADDRESS is set, fetch from ERC20 token contract
   * 2. Otherwise, fetch native token balance (ETH) as fallback
   * 3. If provider is not available, return 0
   */
  const getUSDCBalance = useCallback(async (address) => {
    if (!address) return 0;

    try {
      // If USDC token contract address is configured, fetch from token contract
      if (USDC_TOKEN_ADDRESS && provider) {
        try {
          const tokenContract = new ethers.Contract(
            USDC_TOKEN_ADDRESS,
            ERC20_ABI,
            provider
          );
          
          // Get balance and decimals
          const [balance, decimals] = await Promise.all([
            tokenContract.balanceOf(address),
            tokenContract.decimals().catch(() => 6), // Default to 6 decimals for USDC
          ]);
          
          return parseFloat(ethers.formatUnits(balance, decimals));
        } catch (tokenErr) {
          console.warn('Error fetching USDC token balance, falling back to native balance:', tokenErr);
          // Fall through to native balance
        }
      }

      // Fallback: Get native token balance (ETH)
      if (provider) {
        const balance = await provider.getBalance(address);
        // Convert to USDC equivalent (assuming 1:1 for now, or adjust based on actual rate)
        // In production, you might want to use a price oracle
        return parseFloat(ethers.formatEther(balance));
      }

      return 0;
    } catch (err) {
      console.error('Error fetching balance:', err);
      return 0;
    }
  }, [provider]);

  /**
   * Get faucet contract balance (how many vUSDC tokens are available in the faucet)
   */
  const getFaucetBalance = useCallback(async () => {
    if (!VUSDC_TOKEN_ADDRESS || !FAUCET_ADDRESS || !provider) {
      return 0;
    }

    try {
      const tokenContract = new ethers.Contract(
        VUSDC_TOKEN_ADDRESS,
        ERC20_ABI,
        provider
      );
      
      const balance = await tokenContract.balanceOf(FAUCET_ADDRESS);
      return parseFloat(ethers.formatEther(balance));
    } catch (err) {
      console.error('Error fetching faucet balance:', err);
      return 0;
    }
  }, [provider]);

  /**
   * Get vUSDC (Volt USDC) token balance for an address
   * Fetches from vUSDC ERC20 token contract
   */
  const getVUSDCBalance = useCallback(async (address) => {
    if (!provider || !address) {
      return 0;
    }

    try {
      if (!VUSDC_TOKEN_ADDRESS) {
        console.warn('vUSDC token address not configured');
        return 0;
      }

      const tokenContract = new ethers.Contract(
        VUSDC_TOKEN_ADDRESS,
        ERC20_ABI,
        provider
      );
      const balance = await tokenContract.balanceOf(address);
      // vUSDC uses 18 decimals (standard ERC20)
      return parseFloat(ethers.formatEther(balance));
    } catch (err) {
      console.error('Error fetching vUSDC balance:', err);
      return 0;
    }
  }, [provider]);

  /**
   * Request vUSDC from faucet contract
   * Calls the faucet contract's requestTokens function
   */
  const requestVUSDCFromFaucet = useCallback(async () => {
    if (!signer) {
      throw new Error('Wallet not connected');
    }
    
    if (!FAUCET_ADDRESS) {
      console.error('FAUCET_ADDRESS is not configured:', FAUCET_ADDRESS);
      throw new Error('Faucet contract address not configured. Please check VITE_FAUCET_ADDRESS in .env file.');
    }
    
    console.log('Requesting tokens from faucet:', FAUCET_ADDRESS);

    try {
      // Full faucet ABI with canRequest function
      const FAUCET_ABI = [
        {
          inputs: [],
          name: 'requestTokens',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [{ name: 'user', type: 'address' }],
          name: 'canRequest',
          outputs: [
            { name: 'canRequestTokens', type: 'bool' },
            { name: 'timeUntilNextRequest', type: 'uint256' }
          ],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [{ name: 'user', type: 'address' }],
          name: 'getTimeUntilNextRequest',
          outputs: [{ name: '', type: 'uint256' }],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [{ name: '', type: 'address' }],
          name: 'lastRequestTime',
          outputs: [{ name: '', type: 'uint256' }],
          stateMutability: 'view',
          type: 'function',
        },
      ];

      const faucetContract = new ethers.Contract(
        FAUCET_ADDRESS,
        FAUCET_ABI,
        signer
      );

      // Check if user can request (read from blockchain) - optional check
      const userAddress = await signer.getAddress();
      
      // Try to check cooldown status using lastRequestTime (more reliable than canRequest)
      try {
        // Get provider from signer
        let provider;
        if (signer.provider) {
          provider = signer.provider;
        } else {
          provider = await signer.getProvider();
        }
        
        if (provider) {
          const readOnlyContract = new ethers.Contract(
            FAUCET_ADDRESS,
            FAUCET_ABI,
            provider
          );
          
          const lastRequest = await readOnlyContract.lastRequestTime(userAddress);
          const lastRequestNum = Number(lastRequest);
          
          // If lastRequest is > 0, check if cooldown has expired
          if (lastRequestNum > 0) {
            const COOLDOWN_PERIOD = 24 * 60 * 60; // 24 hours in seconds
            const nextRequestTime = lastRequestNum + COOLDOWN_PERIOD;
            const now = Math.floor(Date.now() / 1000);
            
            if (now < nextRequestTime) {
              const remaining = nextRequestTime - now;
              const hours = Math.floor(remaining / 3600);
              const minutes = Math.floor((remaining % 3600) / 60);
              throw new Error(
                `Cooldown period not expired. Please wait ${hours}h ${minutes}m before requesting again. ` +
                `(This is enforced on the blockchain, not just in the frontend)`
              );
            }
          }
        }
      } catch (checkError) {
        // If check fails with our formatted error, re-throw it
        if (checkError.message && checkError.message.includes('Cooldown period not expired')) {
          throw checkError;
        }
        // Otherwise, log warning and proceed - transaction will fail naturally if cooldown is active
        console.warn('Could not check cooldown status, proceeding with transaction:', checkError.message);
      }

      // Estimate gas
      const gasEstimate = await faucetContract.requestTokens.estimateGas();

      // Execute transaction
      const tx = await faucetContract.requestTokens({
        gasLimit: gasEstimate * BigInt(120) / BigInt(100), // Add 20% buffer
      });

      // Wait for transaction
      const receipt = await tx.wait();

      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        success: receipt.status === 1,
      };
    } catch (err) {
      console.error('Error requesting vUSDC from faucet:', err);
      
      // Provide more helpful error messages
      if (err.message && err.message.includes('Cooldown period not expired')) {
        throw err; // Already formatted
      } else if (err.message && err.message.includes('revert')) {
        throw new Error('Transaction failed. You may still be in cooldown period on the blockchain. Please wait 24 hours from your last request.');
      } else if (err.code === 'CALL_EXCEPTION' || err.reason === 'missing revert data') {
        throw new Error('Transaction would fail. You may still be in cooldown period on the blockchain. Please wait 24 hours from your last request.');
      }
      
      throw err;
    }
  }, [signer]);

  /**
   * Fetch all streams for a user from contract
   * Contract function: getUserStreams(address) view returns (uint256[])
   * Then fetches each stream: streams(uint256) view returns (totalDeposit, startTime, duration, claimedAmount, soldAmount, isActive, owner)
   */
  const fetchUserStreams = useCallback(async (userAddress) => {
    if (!contract || !userAddress) {
      // #region agent log - fetchUserStreams early return
      fetch('http://127.0.0.1:7242/ingest/0036c2e9-2943-4b5d-9692-984770d55e8c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVoltContract.js:469',message:'fetchUserStreams early return',data:{hasContract:!!contract,hasUserAddress:!!userAddress},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'stream-fetch'})}).catch(()=>{});
      // #endregion
      return [];
    }

    try {
      // #region agent log - fetchUserStreams start
      fetch('http://127.0.0.1:7242/ingest/0036c2e9-2943-4b5d-9692-984770d55e8c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVoltContract.js:473',message:'fetchUserStreams start',data:{userAddress,contractAddress:CONTRACT_ADDRESS},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'stream-fetch'})}).catch(()=>{});
      // #endregion
      
      // Get all stream IDs for the user
      // Use getUserStreams function (returns uint256[])
      const streamIds = await contract.getUserStreams(userAddress);
      
      // #region agent log - streamIds fetched
      const streamIdsStr = streamIds ? streamIds.map(id => id.toString()) : [];
      fetch('http://127.0.0.1:7242/ingest/0036c2e9-2943-4b5d-9692-984770d55e8c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVoltContract.js:477',message:'Stream IDs fetched',data:{userAddress,streamIdsCount:streamIds?.length || 0,streamIds:streamIdsStr},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'stream-fetch'})}).catch(()=>{});
      // #endregion
      
      if (!streamIds || streamIds.length === 0) {
        return [];
      }

      // Fetch each stream's data
      const streamsData = await Promise.all(
        streamIds.map(async (streamId) => {
          try {
            const streamData = await contract.streams(streamId);
            const streamObj = {
              id: streamId.toString(),
        totalDeposit: ethers.formatEther(streamData.totalDeposit),
        startTime: Number(streamData.startTime),
        duration: Number(streamData.duration),
        claimedAmount: ethers.formatEther(streamData.claimedAmount),
        soldAmount: ethers.formatEther(streamData.soldAmount),
        isActive: streamData.isActive,
              owner: streamData.owner,
            };
            
            // #region agent log - stream data fetched
            fetch('http://127.0.0.1:7242/ingest/0036c2e9-2943-4b5d-9692-984770d55e8c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVoltContract.js:495',message:'Stream data fetched',data:{streamId:streamId.toString(),isActive:streamData.isActive,totalDeposit:ethers.formatEther(streamData.totalDeposit)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'stream-fetch'})}).catch(()=>{});
            // #endregion
            
            return streamObj;
          } catch (err) {
            console.error(`Error fetching stream ${streamId}:`, err);
            // #region agent log - stream fetch error
            fetch('http://127.0.0.1:7242/ingest/0036c2e9-2943-4b5d-9692-984770d55e8c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVoltContract.js:502',message:'Stream fetch error',data:{streamId:streamId?.toString(),error:err.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'stream-fetch'})}).catch(()=>{});
            // #endregion
            return null;
          }
        })
      );

      // Filter out null results and return active streams
      const activeStreams = streamsData.filter(stream => stream !== null && stream.isActive);
      
      // #region agent log - fetchUserStreams result
      fetch('http://127.0.0.1:7242/ingest/0036c2e9-2943-4b5d-9692-984770d55e8c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVoltContract.js:510',message:'fetchUserStreams result',data:{userAddress,totalStreams:streamsData.length,activeStreamsCount:activeStreams.length,activeStreamIds:activeStreams.map(s => s.id)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'stream-fetch'})}).catch(()=>{});
      // #endregion
      
      return activeStreams;
    } catch (err) {
      console.error('Error fetching user streams:', err);
      // #region agent log - fetchUserStreams error
      fetch('http://127.0.0.1:7242/ingest/0036c2e9-2943-4b5d-9692-984770d55e8c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVoltContract.js:515',message:'fetchUserStreams error',data:{userAddress,error:err.message,errorCode:err.code},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'stream-fetch'})}).catch(()=>{});
      // #endregion
      return [];
    }
  }, [contract]);

  /**
   * Fetch a single stream by ID (for backward compatibility)
   */
  const fetchStream = useCallback(async (streamId) => {
    if (!contract || !streamId) {
      // #region agent log - fetchStream early return
      fetch('http://127.0.0.1:7242/ingest/0036c2e9-2943-4b5d-9692-984770d55e8c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVoltContract.js:545',message:'fetchStream early return',data:{hasContract:!!contract,hasStreamId:!!streamId,streamId:streamId?.toString()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'stream-fetch'})}).catch(()=>{});
      // #endregion
      return null;
    }

    try {
      // #region agent log - fetchStream start
      fetch('http://127.0.0.1:7242/ingest/0036c2e9-2943-4b5d-9692-984770d55e8c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVoltContract.js:549',message:'fetchStream start',data:{streamId:streamId.toString(),contractAddress:CONTRACT_ADDRESS},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'stream-fetch'})}).catch(()=>{});
      // #endregion
      
      const streamData = await contract.streams(streamId);
      
      const result = {
        id: streamId.toString(),
        totalDeposit: ethers.formatEther(streamData.totalDeposit),
        startTime: Number(streamData.startTime),
        duration: Number(streamData.duration),
        claimedAmount: ethers.formatEther(streamData.claimedAmount),
        soldAmount: ethers.formatEther(streamData.soldAmount),
        isActive: streamData.isActive,
        owner: streamData.owner,
      };
      
      // #region agent log - fetchStream result
      fetch('http://127.0.0.1:7242/ingest/0036c2e9-2943-4b5d-9692-984770d55e8c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVoltContract.js:562',message:'fetchStream result',data:{streamId:streamId.toString(),isActive:streamData.isActive,totalDeposit:ethers.formatEther(streamData.totalDeposit)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'stream-fetch'})}).catch(()=>{});
      // #endregion
      
      return result;
    } catch (err) {
      console.error('Error fetching stream:', err);
      // #region agent log - fetchStream error
      fetch('http://127.0.0.1:7242/ingest/0036c2e9-2943-4b5d-9692-984770d55e8c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVoltContract.js:568',message:'fetchStream error',data:{streamId:streamId?.toString(),error:err.message,errorCode:err.code},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'stream-fetch'})}).catch(()=>{});
      // #endregion
      return null;
    }
  }, [contract]);

  /**
   * Create a new stream using vUSDC token
   * 1. Approve vUSDC token transfer to contract
   * 2. Call contract's createStream function (contract will transfer vUSDC from user)
   * 
   * Note: Contract must support vUSDC token transfers. If contract expects native token,
   * this will need to be updated in the contract itself.
   */
  const createStream = useCallback(async (durationInSeconds, depositAmount) => {
    if (!contract || !signer) {
      throw new Error('Wallet not connected');
    }

    if (!VUSDC_TOKEN_ADDRESS) {
      throw new Error('vUSDC token address not configured');
    }

    try {
      const userAddress = await signer.getAddress();
      
      // Create vUSDC token contract instance
      const vusdcTokenContract = new ethers.Contract(
        VUSDC_TOKEN_ADDRESS,
        ERC20_ABI,
        signer
      );

      // Convert deposit amount to token units (vUSDC uses 18 decimals)
      const depositAmountWei = ethers.parseEther(depositAmount.toString());

      // Check user's vUSDC balance
      const userBalance = await vusdcTokenContract.balanceOf(userAddress);
      if (userBalance < depositAmountWei) {
        throw new Error(`Insufficient vUSDC balance. You have ${ethers.formatEther(userBalance)} vUSDC, but need ${depositAmount} vUSDC.`);
      }

      // Check current allowance - CRITICAL: Must check before proceeding
      let currentAllowance = await vusdcTokenContract.allowance(userAddress, CONTRACT_ADDRESS);
      console.log('Current allowance:', ethers.formatEther(currentAllowance), 'vUSDC');
      console.log('Required amount:', ethers.formatEther(depositAmountWei), 'vUSDC');
      
      // If allowance is insufficient, approve - DO NOT PROCEED WITHOUT APPROVAL
      if (currentAllowance < depositAmountWei) {
        console.log('Insufficient allowance detected. Requesting approval...');
        const approveAmount = depositAmountWei * BigInt(2); // Approve 2x to avoid frequent approvals
        
        try {
          // Request approval transaction using standard ERC20 format
          // This ensures MetaMask recognizes it as a token approval, not NFT
          console.log('Requesting ERC20 token approval (vUSDC)...');
          
          // Check user's native token balance for gas fees
          const userAddress = await signer.getAddress();
          const nativeBalance = await provider.getBalance(userAddress);
          console.log('Native token balance (for gas):', ethers.formatEther(nativeBalance), 'USDC');
          
          if (nativeBalance < ethers.parseEther('0.001')) {
            throw new Error(
              'Insufficient native token (USDC) for gas fees. ' +
              `You have ${ethers.formatEther(nativeBalance)} USDC, but need at least 0.001 USDC for transaction gas fees. ` +
              'Please add USDC to your wallet for gas fees.'
            );
          }
          
          // Use the existing vusdcTokenContract but ensure it's using standard ERC20 ABI
          // The contract instance is already created with ERC20_ABI above
          console.log('Sending ERC20 token approval transaction...');
          console.log('Token Contract:', VUSDC_TOKEN_ADDRESS);
          console.log('Spender (VoltProtocol):', CONTRACT_ADDRESS);
          console.log('Approval Amount:', ethers.formatEther(approveAmount), 'vUSDC');
          console.log('This is a standard ERC20 approve() call.');
          
          // #region agent log - H2, H4: Check transaction encoding and format
          const iface = vusdcTokenContract.interface;
          const encodedApprove = iface.encodeFunctionData('approve', [CONTRACT_ADDRESS, approveAmount]);
          fetch('http://127.0.0.1:7242/ingest/0036c2e9-2943-4b5d-9692-984770d55e8c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVoltContract.js:597',message:'Approve transaction encoding',data:{tokenAddress:VUSDC_TOKEN_ADDRESS,spender:CONTRACT_ADDRESS,amount:approveAmount.toString(),encodedData:encodedApprove,functionSig:iface.getFunction('approve').format('full')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2,H4'})}).catch(()=>{});
          // #endregion
          
          // #region agent log - H1, H5: Check token contract interfaces
          try {
            const ERC165_ABI = ['function supportsInterface(bytes4 interfaceId) view returns (bool)'];
            const ERC20_INTERFACE_ID = '0x36372b07';
            const ERC721_INTERFACE_ID = '0x80ac58cd';
            const tokenCheckContract = new ethers.Contract(VUSDC_TOKEN_ADDRESS, ERC165_ABI, provider);
            const [isERC20, isERC721] = await Promise.all([
              tokenCheckContract.supportsInterface(ERC20_INTERFACE_ID).catch(() => false),
              tokenCheckContract.supportsInterface(ERC721_INTERFACE_ID).catch(() => false)
            ]);
            fetch('http://127.0.0.1:7242/ingest/0036c2e9-2943-4b5d-9692-984770d55e8c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVoltContract.js:610',message:'Token interface check',data:{tokenAddress:VUSDC_TOKEN_ADDRESS,isERC20,isERC721,hasERC721:isERC721},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1,H5'})}).catch(()=>{});
          } catch (interfaceErr) {
            fetch('http://127.0.0.1:7242/ingest/0036c2e9-2943-4b5d-9692-984770d55e8c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVoltContract.js:615',message:'Interface check failed',data:{error:interfaceErr.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1,H5'})}).catch(()=>{});
          }
          // #endregion
          
          // #region agent log - H3: Check token metadata
          try {
            const [decimals, symbol, name] = await Promise.all([
              vusdcTokenContract.decimals().catch(() => null),
              vusdcTokenContract.symbol().catch(() => null),
              vusdcTokenContract.name ? vusdcTokenContract.name().catch(() => null) : Promise.resolve(null)
            ]);
            fetch('http://127.0.0.1:7242/ingest/0036c2e9-2943-4b5d-9692-984770d55e8c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVoltContract.js:625',message:'Token metadata',data:{tokenAddress:VUSDC_TOKEN_ADDRESS,decimals,symbol,name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
          } catch (metadataErr) {
            fetch('http://127.0.0.1:7242/ingest/0036c2e9-2943-4b5d-9692-984770d55e8c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVoltContract.js:630',message:'Metadata check failed',data:{error:metadataErr.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
          }
          // #endregion
          
          // Send approve transaction - MetaMask should recognize this as ERC20
          // If MetaMask shows "NFT withdrawal", it's a MetaMask bug, not our code
          const approveTx = await vusdcTokenContract.approve(
            CONTRACT_ADDRESS,
            approveAmount,
            {
              gasLimit: 100000,
            }
          );
          
          // #region agent log - H2, H4: Transaction object details
          fetch('http://127.0.0.1:7242/ingest/0036c2e9-2943-4b5d-9692-984770d55e8c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVoltContract.js:640',message:'Approve transaction sent',data:{txHash:approveTx.hash,to:approveTx.to,from:approveTx.from,value:approveTx.value?.toString(),data:approveTx.data,gasLimit:approveTx.gasLimit?.toString()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2,H4'})}).catch(()=>{});
          // #endregion
          
          console.log('Approval transaction sent:', approveTx.hash);
          console.log('Waiting for approval transaction to be mined...');
          
          // Wait for approval transaction to be confirmed
          const approveReceipt = await approveTx.wait();
          console.log('vUSDC approval confirmed in block:', approveReceipt.blockNumber);
          
          // Check if approval transaction was successful
          if (approveReceipt.status !== 1) {
            throw new Error('Approval transaction failed. Please try again.');
          }
          
          // Wait for state to update (some networks need time)
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Verify allowance after approval (check multiple times if needed)
          let newAllowance = await vusdcTokenContract.allowance(userAddress, CONTRACT_ADDRESS);
          console.log('New allowance (first check):', ethers.formatEther(newAllowance), 'vUSDC');
          
          // If still insufficient, wait and check again (up to 5 times with longer waits)
          let retries = 0;
          const maxRetries = 5;
          while (newAllowance < depositAmountWei && retries < maxRetries) {
            console.log(`Allowance still insufficient, waiting... (retry ${retries + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
            newAllowance = await vusdcTokenContract.allowance(userAddress, CONTRACT_ADDRESS);
            console.log(`New allowance (check ${retries + 2}):`, ethers.formatEther(newAllowance), 'vUSDC');
            retries++;
          }
          
          // Final check - DO NOT PROCEED if allowance is still insufficient
          if (newAllowance < depositAmountWei) {
            throw new Error(
              `Approval transaction completed but allowance is still insufficient. ` +
              `Current: ${ethers.formatEther(newAllowance)} vUSDC, Required: ${ethers.formatEther(depositAmountWei)} vUSDC. ` +
              `Please refresh the page and try again, or manually approve the contract to spend your vUSDC tokens.`
            );
          }
          
          currentAllowance = newAllowance; // Update current allowance
        } catch (approveError) {
          console.error('Approval error:', approveError);
          // If user rejected the transaction
          if (approveError.code === 4001 || approveError.message?.includes('user rejected') || approveError.message?.includes('User denied')) {
            throw new Error('Approval was cancelled. You must approve the contract to spend your vUSDC tokens before creating a stream. Please try again and approve the transaction.');
          }
          // If transaction failed
          if (approveError.receipt && approveError.receipt.status === 0) {
            throw new Error('Approval transaction failed on the blockchain. Please try again.');
          }
          throw new Error(`Approval failed: ${approveError.message || 'Unknown error'}. Please approve the contract to spend your vUSDC tokens.`);
        }
      }

      // FINAL VERIFICATION: Check allowance one more time before proceeding
      // This is critical to prevent transaction failures
      console.log('Final allowance verification before creating stream...');
      let finalAllowance = await vusdcTokenContract.allowance(userAddress, CONTRACT_ADDRESS);
      console.log('Final allowance check:', ethers.formatEther(finalAllowance), 'vUSDC');
      
      // If allowance is still insufficient, this is a critical error - DO NOT PROCEED
      if (finalAllowance < depositAmountWei) {
        console.error('CRITICAL: Allowance is insufficient even after approval attempts!');
        throw new Error(
          `Insufficient token allowance. Current: ${ethers.formatEther(finalAllowance)} vUSDC, Required: ${ethers.formatEther(depositAmountWei)} vUSDC. ` +
          `Please approve the contract to spend your vUSDC tokens. You can do this by trying to create a stream again - the approval transaction will be requested automatically.`
        );
      }
      
      console.log('✓ Allowance verified. Proceeding with stream creation...');
      
      // Double-check balance before proceeding
      const finalBalance = await vusdcTokenContract.balanceOf(userAddress);
      console.log('Final balance:', ethers.formatEther(finalBalance));
      if (finalBalance < depositAmountWei) {
        throw new Error(`Insufficient vUSDC balance. Current: ${ethers.formatEther(finalBalance)} vUSDC, Required: ${ethers.formatEther(depositAmountWei)} vUSDC.`);
      }
      
      // CRITICAL: Pre-flight checks before attempting transaction
      console.log('=== PRE-FLIGHT CHECKS ===');
      
      // Note: Users can now create multiple streams, so we don't check for existing streams
      console.log('1. Multiple streams are allowed - no active stream check needed');
      
      // 2. Check vUSDC token address in contract (optional - if it fails, we'll catch it in static call)
      console.log('2. Checking vUSDC token address in contract...');
      let contractVusdcAddress = null;
      try {
        contractVusdcAddress = await contract.vusdcTokenAddress();
        // #region agent log - Address comparison debug
        const contractAddrStr = typeof contractVusdcAddress === 'string' ? contractVusdcAddress : String(contractVusdcAddress);
        const expectedAddrStr = typeof VUSDC_TOKEN_ADDRESS === 'string' ? VUSDC_TOKEN_ADDRESS : String(VUSDC_TOKEN_ADDRESS);
        const contractLower = contractAddrStr.toLowerCase();
        const expectedLower = expectedAddrStr.toLowerCase();
        const addressesMatch = contractLower === expectedLower;
        fetch('http://127.0.0.1:7242/ingest/0036c2e9-2943-4b5d-9692-984770d55e8c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVoltContract.js:733',message:'Address comparison',data:{contractAddress:contractAddrStr,expectedAddress:expectedAddrStr,contractLower,expectedLower,addressesMatch,contractType:typeof contractVusdcAddress,expectedType:typeof VUSDC_TOKEN_ADDRESS},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'address-bug'})}).catch(()=>{});
        // #endregion
        console.log('   Contract vUSDC address:', contractVusdcAddress);
        
        if (!contractVusdcAddress || contractVusdcAddress === '0x0000000000000000000000000000000000000000') {
          console.warn('   ⚠️ vUSDC token address is not set in contract (will be caught in static call)');
        } else if (contractLower !== expectedLower) {
          console.warn(
            `   ⚠️ WARNING: Contract vUSDC address (${contractAddrStr}) ` +
            `does not match configured address (${expectedAddrStr})`
          );
        } else {
          console.log('   ✓ vUSDC token address is correctly set');
        }
      } catch (vusdcCheckError) {
        console.warn('   ⚠️ Could not read vUSDC token address from contract:', vusdcCheckError.message);
        console.warn('   Will check via static call instead...');
        // Don't throw - let static call catch the actual error
      }
      
      // 3. Try static call to see what would fail
      console.log('3. Testing transaction with static call...');
      try {
        await contract.createStreamWithVUSDC.staticCall(
          durationInSeconds,
          depositAmountWei
        );
        console.log('   ✓ Static call succeeded - transaction should work');
      } catch (staticCallError) {
        console.error('   ❌ Static call failed:', staticCallError);
        const errorMessage = staticCallError.message || staticCallError.reason || '';
        const errorData = staticCallError.data || staticCallError.error?.data;
        
        console.error('   Error message:', errorMessage);
        console.error('   Error data:', errorData);
        
        // Try to decode the error
        if (errorData && typeof errorData === 'string' && errorData.startsWith('0x')) {
          try {
            const decoded = contract.interface.parseError(errorData);
            if (decoded) {
              throw new Error(`Transaction would fail: ${decoded.name}(${decoded.args.join(', ')})`);
            }
          } catch (decodeErr) {
            // If decoding fails, continue with message parsing
          }
        }
        
        // Parse common error messages
        // Note: Multiple streams are now allowed, so we don't check for existing streams
        
        // #region agent log - Static call error analysis
        const contractAddrStr = contractVusdcAddress ? (typeof contractVusdcAddress === 'string' ? contractVusdcAddress : String(contractVusdcAddress)) : null;
        const expectedAddrStr = typeof VUSDC_TOKEN_ADDRESS === 'string' ? VUSDC_TOKEN_ADDRESS : String(VUSDC_TOKEN_ADDRESS);
        const addressesMatch = contractAddrStr && contractAddrStr.toLowerCase() === expectedAddrStr.toLowerCase();
        fetch('http://127.0.0.1:7242/ingest/0036c2e9-2943-4b5d-9692-984770d55e8c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVoltContract.js:787',message:'Static call error analysis',data:{errorMessage,errorData,contractVusdcAddress:contractAddrStr,expectedAddress:expectedAddrStr,addressesMatch,hasVusdcAddress:!!contractVusdcAddress},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'static-call-error'})}).catch(()=>{});
        // #endregion
        
        // Check for "Stream already exists" - this means old contract is being used
        if (errorMessage.includes('Stream already exists') || errorMessage.includes('stream already exists')) {
          throw new Error(
            '❌ Old Contract Detected: The contract at this address does not support multiple streams. ' +
            `You already have an active stream. ` +
            `Please use the new contract that supports multiple streams, or complete/cancel your existing stream first.`
          );
        }
        
        // Only throw vUSDC token error if address is actually not set or doesn't match
        if (errorMessage.includes('vUSDC token not set') || errorMessage.includes('vusdcTokenAddress')) {
          if (contractVusdcAddress === null || contractVusdcAddress === '0x0000000000000000000000000000000000000000') {
            throw new Error(
              '❌ Contract configuration error: vUSDC token address is not set in the contract. ' +
              `Contract address: ${CONTRACT_ADDRESS}. ` +
              `Expected vUSDC address: ${VUSDC_TOKEN_ADDRESS}. ` +
              'The contract owner must call setVusdcTokenAddress() to configure the vUSDC token. ' +
              'This is a contract-level configuration issue that affects all users.'
            );
          } else if (!addressesMatch) {
            throw new Error(
              `❌ Contract configuration error: vUSDC token address mismatch. ` +
              `Contract has: ${contractAddrStr}, Expected: ${expectedAddrStr}. ` +
              'The contract owner must update the vUSDC token address.'
            );
          }
          // If addresses match, this is not a vUSDC token error - continue to other error checks
        }
        
        // Check for "execution reverted" or "missing revert data" - these could be other issues
        // IMPORTANT: Only throw vUSDC token error if addresses DON'T match
        if ((errorMessage.includes('execution reverted') || errorMessage.includes('missing revert data')) && addressesMatch) {
          // Addresses match, so this is NOT a vUSDC token error - continue to other checks
          // Don't throw error here, let it fall through to allowance/balance checks
        } else if ((errorMessage.includes('execution reverted') || errorMessage.includes('missing revert data')) && !addressesMatch) {
          // Addresses don't match, might be vUSDC token error
          if (!contractVusdcAddress || contractVusdcAddress === '0x0000000000000000000000000000000000000000') {
            throw new Error(
              '❌ Contract Configuration Error: The contract is not properly configured. ' +
              `The vUSDC token address is likely not set in the contract. ` +
              `\n\n` +
              `Contract Address: ${CONTRACT_ADDRESS}\n` +
              `Expected vUSDC Address: ${VUSDC_TOKEN_ADDRESS}\n` +
              `\n` +
              `SOLUTION: The contract owner must call the setVusdcTokenAddress() function ` +
              `with the vUSDC token address (${VUSDC_TOKEN_ADDRESS}) to configure the contract. ` +
              `\n\n` +
              `This is a contract-level issue that affects all users. ` +
              `Please contact the contract owner or deployer to fix this.`
            );
          }
        }
        if (errorMessage.includes('insufficient allowance') || errorMessage.includes('allowance')) {
          throw new Error('Insufficient token allowance. Please approve the contract to spend your vUSDC tokens.');
        }
        if (errorMessage.includes('insufficient balance') || errorMessage.includes('balance')) {
          throw new Error('Insufficient vUSDC balance in your wallet.');
        }
        if (errorMessage.includes('Duration must be greater than 0')) {
          throw new Error('Duration must be greater than 0.');
        }
        if (errorMessage.includes('Amount must be greater than 0')) {
          throw new Error('Amount must be greater than 0.');
        }
        
        // "missing revert data" usually means a require() failed but reason wasn't returned
        // This is most likely because vUSDC token address is not set in contract
        if (errorMessage.includes('missing revert data') || errorMessage.includes('execution reverted')) {
          throw new Error(
            `❌ Contract Configuration Error: The contract is not properly configured. ` +
            `\n\n` +
            `The vUSDC token address is likely not set in the contract. ` +
            `\n\n` +
            `Contract Address: ${CONTRACT_ADDRESS}\n` +
            `Expected vUSDC Address: ${VUSDC_TOKEN_ADDRESS}\n` +
            `\n` +
            `SOLUTION: The contract owner must call the setVusdcTokenAddress() function ` +
            `with the vUSDC token address (${VUSDC_TOKEN_ADDRESS}) to configure the contract. ` +
            `\n\n` +
            `This is a contract-level issue that affects all users. ` +
            `Please contact the contract owner or deployer to fix this.`
          );
        }
        
        // Generic error with more context
        throw new Error(
          `Transaction would fail: ${errorMessage}. ` +
          `This is a contract-level error. Please check: ` +
          `1) vUSDC token address is set in contract (${contractVusdcAddress || 'NOT SET'}), ` +
          `2) You don't have an active stream, ` +
          `3) You have sufficient allowance and balance.`
        );
      }
      
      // Estimate gas for createStreamWithVUSDC
      console.log('Estimating gas for createStreamWithVUSDC...');
      let gasEstimate;
      let gasEstimationFailed = false;
      let gasEstimationError = null;
      
      try {
        gasEstimate = await contract.createStreamWithVUSDC.estimateGas(
        durationInSeconds,
        depositAmountWei
        );
        console.log('Gas estimate:', gasEstimate.toString());
      } catch (err) {
        console.error('Gas estimation failed:', err);
        console.error('Error details:', JSON.stringify(err, null, 2));
        gasEstimationFailed = true;
        gasEstimationError = err;
        
        // Check for common revert reasons and provide helpful error messages
        const errorMessage = err.message || err.reason || '';
        const errorData = err.data || err.error?.data || '';
        const errorString = JSON.stringify(err).toLowerCase();
        
        // Note: Multiple streams are now allowed
        if (errorMessage.includes('vUSDC token not set') || errorString.includes('vusdc token not set')) {
          throw new Error('Contract configuration error: vUSDC token address not set in contract.');
        }
        if (errorMessage.includes('insufficient allowance') || errorMessage.includes('allowance') || 
            errorString.includes('insufficient allowance') || errorString.includes('allowance')) {
          throw new Error('Insufficient token allowance. Please approve the contract to spend your vUSDC tokens.');
        }
        if (errorMessage.includes('insufficient balance') || errorMessage.includes('balance') ||
            errorString.includes('insufficient balance')) {
          throw new Error('Insufficient vUSDC balance in your wallet.');
        }
        if (errorMessage.includes('Duration must be greater than 0') || errorString.includes('duration must be greater')) {
          throw new Error('Duration must be greater than 0.');
        }
        if (errorMessage.includes('Amount must be greater than 0') || errorString.includes('amount must be greater')) {
          throw new Error('Amount must be greater than 0.');
        }
        
        // If function doesn't exist, provide helpful error
        if (errorMessage.includes('createStreamWithVUSDC') || errorMessage.includes('function') ||
            errorString.includes('createStreamWithVUSDC') || errorString.includes('function')) {
          throw new Error('Contract does not have createStreamWithVUSDC function. Please deploy the updated contract with vUSDC support.');
        }
        
        // Try to decode revert reason if available
        if (errorData && typeof errorData === 'string' && errorData.startsWith('0x')) {
          try {
            // Try to decode the revert reason
            const decoded = contract.interface.parseError(errorData);
            if (decoded) {
              throw new Error(`Transaction would fail: ${decoded.name} - ${decoded.args.join(', ')}`);
            }
          } catch (decodeErr) {
            // If decoding fails, continue with generic error
          }
        }
        
        // If gas estimation fails, we've already done static call in pre-flight checks
        // So we know what the error is - it should have been thrown already
        // But if we get here, use default gas limit and let transaction fail with proper error
        console.warn('Gas estimation failed, using default gas limit. Transaction may still fail if there are other issues.');
        gasEstimate = BigInt(500000); // Default gas limit for createStreamWithVUSDC
      }

      // ONE MORE FINAL CHECK before sending transaction
      // This prevents sending a transaction that will definitely fail
      console.log('=== FINAL PRE-TRANSACTION CHECKS ===');
      const preTxAllowance = await vusdcTokenContract.allowance(userAddress, CONTRACT_ADDRESS);
      const preTxBalance = await vusdcTokenContract.balanceOf(userAddress);
      
      console.log('Pre-transaction checks:');
      console.log('  User Address:', userAddress);
      console.log('  Contract Address:', CONTRACT_ADDRESS);
      console.log('  vUSDC Token Address:', VUSDC_TOKEN_ADDRESS);
      console.log('  Allowance:', ethers.formatEther(preTxAllowance), 'vUSDC');
      console.log('  Balance:', ethers.formatEther(preTxBalance), 'vUSDC');
      console.log('  Required:', ethers.formatEther(depositAmountWei), 'vUSDC');
      console.log('  Duration:', durationInSeconds, 'seconds');
      
      // CRITICAL: Check allowance - if insufficient, throw error immediately
      if (preTxAllowance < depositAmountWei) {
        const errorMsg = `❌ CRITICAL: Insufficient allowance! ` +
          `Current: ${ethers.formatEther(preTxAllowance)} vUSDC, Required: ${ethers.formatEther(depositAmountWei)} vUSDC. ` +
          `Please approve the contract (${CONTRACT_ADDRESS}) to spend your vUSDC tokens first. ` +
          `The approval transaction should have been requested automatically.`;
        console.error(errorMsg);
        throw new Error(errorMsg);
      }
      
      // CRITICAL: Check balance
      if (preTxBalance < depositAmountWei) {
        const errorMsg = `❌ CRITICAL: Insufficient balance! ` +
          `Current: ${ethers.formatEther(preTxBalance)} vUSDC, Required: ${ethers.formatEther(depositAmountWei)} vUSDC.`;
        console.error(errorMsg);
        throw new Error(errorMsg);
      }
      
      console.log('✓ All pre-transaction checks passed');

      // Execute createStreamWithVUSDC transaction
      const gasLimit = gasEstimationFailed 
        ? gasEstimate // Use default if estimation failed
        : gasEstimate * BigInt(120) / BigInt(100); // Add 20% buffer if estimation succeeded
      
      console.log('=== SENDING TRANSACTION ===');
      console.log('Transaction parameters:');
      console.log('  Function: createStreamWithVUSDC');
      console.log('  Duration:', durationInSeconds);
      console.log('  Amount:', depositAmountWei.toString(), 'wei (', ethers.formatEther(depositAmountWei), 'vUSDC)');
      console.log('  Gas Limit:', gasLimit.toString());
      console.log('  Contract Address:', CONTRACT_ADDRESS);
      
      // Verify contract has the function
      if (!contract || !contract.createStreamWithVUSDC) {
        console.error('Contract instance:', contract);
        console.error('Contract address:', CONTRACT_ADDRESS);
        console.error('Contract ABI:', getABI());
        throw new Error('Contract does not have createStreamWithVUSDC function. Please check the contract ABI and address.');
      }
      
      // Verify contract address is set
      if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
        throw new Error('Contract address is not configured. Please set VITE_VOLT_PROTOCOL_ADDRESS in environment variables.');
      }
      
      let tx;
      try {
        // Encode the transaction manually to verify it's correct
        const iface = contract.interface;
        const encodedData = iface.encodeFunctionData('createStreamWithVUSDC', [durationInSeconds, depositAmountWei]);
        console.log('Encoded transaction data:', encodedData);
        console.log('Transaction data length:', encodedData.length, 'characters');
        console.log('Function signature:', iface.getFunction('createStreamWithVUSDC').format('full'));
        
        // Verify the encoded data is not empty
        if (!encodedData || encodedData === '0x' || encodedData.length < 10) {
          throw new Error('Failed to encode transaction data. Contract function may not exist in ABI.');
        }
        
        // CRITICAL: Always use manual transaction creation to ensure data is set
        // The contract method call might not be encoding the data correctly
        console.log('=== CREATING TRANSACTION ===');
        console.log('Contract address:', CONTRACT_ADDRESS);
        console.log('Signer address:', await signer.getAddress());
        console.log('Encoded data:', encodedData);
        console.log('Encoded data length:', encodedData.length);
        
        // Verify encoded data is valid
        if (!encodedData || encodedData === '0x' || encodedData.length < 10) {
          throw new Error(
            `Failed to encode transaction data. ` +
            `Encoded data: ${encodedData}. ` +
            `Please verify the contract ABI contains createStreamWithVUSDC function.`
          );
        }
        
        // Create transaction manually to ensure data is always set
        const transactionRequest = {
          to: CONTRACT_ADDRESS,
          data: encodedData, // CRITICAL: Set data explicitly
          gasLimit: gasLimit,
          value: 0, // No ETH value needed
        };
        
        console.log('Transaction request:', {
          to: transactionRequest.to,
          data: transactionRequest.data,
          gasLimit: transactionRequest.gasLimit.toString(),
          value: transactionRequest.value.toString(),
        });
        
        // Verify transaction request has data
        if (!transactionRequest.data || transactionRequest.data === '0x' || transactionRequest.data.length < 10) {
          throw new Error(
            `Transaction request data is empty! ` +
            `This should not happen. Encoded data: ${encodedData}`
          );
        }
        
        // Send transaction using signer
        console.log('Sending transaction via signer.sendTransaction...');
        tx = await signer.sendTransaction(transactionRequest);
        
        console.log('✓ Transaction sent successfully!');
        console.log('  Transaction Hash:', tx.hash);
        
        // Verify the transaction object has data
        // Note: The transaction object might not have data immediately, but it will be in the receipt
        console.log('  Transaction Object:', {
          hash: tx.hash,
          to: tx.to,
          from: tx.from,
          // data might not be available immediately in tx object
        });
      } catch (txError) {
        console.error('❌ Transaction send error:', txError);
        console.error('Error details:', {
          message: txError.message,
          code: txError.code,
          reason: txError.reason,
          data: txError.data,
          error: txError.error,
        });
        
        // Check if it's an allowance/balance issue
        if (txError.message?.includes('allowance') || txError.message?.includes('insufficient')) {
          throw new Error(
            `Transaction failed: Insufficient allowance or balance. ` +
            `Please ensure you have approved the contract to spend your vUSDC tokens and have sufficient balance.`
          );
        }
        
        // Check if it's a contract function issue
        if (txError.message?.includes('function') || txError.message?.includes('ABI')) {
          throw new Error(
            `Contract function error: ${txError.message}. ` +
            `Please verify the contract address (${CONTRACT_ADDRESS}) and ABI are correct.`
          );
        }
        
        throw txError;
      }

      // Wait for transaction with retry mechanism for rate limiting
      let receipt;
      const maxRetries = 5;
      let retryCount = 0;
      let lastError = null;
      
      while (retryCount < maxRetries) {
        try {
          console.log(`Waiting for transaction receipt (attempt ${retryCount + 1}/${maxRetries})...`);
          
          // Wait for transaction with timeout
          receipt = await Promise.race([
            tx.wait(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Transaction wait timeout')), 60000) // 60 second timeout
            )
          ]);
          
          console.log('✓ Transaction confirmed in block:', receipt.blockNumber);
          break; // Success, exit retry loop
        } catch (receiptError) {
          lastError = receiptError;
          console.error(`Transaction receipt error (attempt ${retryCount + 1}):`, receiptError);
          
          // Check if it's a rate limit error
          const isRateLimitError = 
            receiptError.message?.includes('rate limited') ||
            receiptError.message?.includes('rate limit') ||
            receiptError.code === -32005 ||
            (receiptError.error && receiptError.error.code === -32005);
          
          if (isRateLimitError && retryCount < maxRetries - 1) {
            // Rate limit error - wait and retry
            const waitTime = (retryCount + 1) * 2000; // Exponential backoff: 2s, 4s, 6s, 8s
            console.log(`Rate limit error detected. Waiting ${waitTime}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            retryCount++;
            continue;
          }
          
          // If transaction reverted, try to get more details
          if (receiptError.receipt && receiptError.receipt.status === 0) {
            // Transaction was mined but reverted
            const errorMessage = receiptError.reason || receiptError.message || 'Transaction reverted';
            
            // Check common revert reasons
            if (errorMessage.includes('allowance') || errorMessage.includes('insufficient allowance')) {
              throw new Error(
                `Transaction reverted: Insufficient token allowance. ` +
                `Please approve the contract to spend your vUSDC tokens. ` +
                `Transaction hash: ${receiptError.receipt.hash}`
              );
            }
            if (errorMessage.includes('balance') || errorMessage.includes('insufficient balance')) {
              throw new Error(
                `Transaction reverted: Insufficient vUSDC balance. ` +
                `Transaction hash: ${receiptError.receipt.hash}`
              );
            }
            // Note: Multiple streams are now allowed
            
            throw new Error(
              `Transaction reverted: ${errorMessage}. ` +
              `Transaction hash: ${receiptError.receipt.hash}. ` +
              `Please check your allowance and balance.`
            );
          }
          
          // If it's a rate limit error and we've exhausted retries, try to get receipt manually
          if (isRateLimitError && retryCount >= maxRetries - 1) {
            console.log('Rate limit error after all retries. Trying to get receipt manually...');
            try {
              // Try to get receipt directly from provider
              const txHash = tx.hash;
              let attempts = 0;
              while (attempts < 10) {
                await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
                try {
                  receipt = await provider.getTransactionReceipt(txHash);
                  if (receipt) {
                    console.log('✓ Got receipt manually:', receipt.blockNumber);
                    break;
                  }
                } catch (e) {
                  console.log(`Receipt not ready yet (attempt ${attempts + 1}/10)...`);
                }
                attempts++;
              }
              
              if (receipt) {
                break; // Success, exit retry loop
              }
            } catch (manualError) {
              console.error('Failed to get receipt manually:', manualError);
              // Continue to throw original error
            }
          }
          
          // If we've exhausted retries or it's not a rate limit error, throw
          if (retryCount >= maxRetries - 1 || !isRateLimitError) {
            throw receiptError;
          }
        }
      }
      
      // If we still don't have a receipt after all retries, but transaction was sent
      if (!receipt && lastError) {
        console.warn('⚠️ Could not get transaction receipt, but transaction was sent.');
        console.warn('Transaction hash:', tx.hash);
        console.warn('You can check the transaction status on a block explorer.');
        
        // Return success with transaction hash even if we couldn't get receipt
        // The transaction might still be processing
        return {
          txHash: tx.hash,
          blockNumber: null,
          success: null, // Unknown status
          note: 'Transaction sent but receipt not available due to RPC rate limiting. Please check transaction status manually.',
        };
      }

      // Check transaction status (if we have a receipt)
      if (receipt) {
        if (receipt.status !== 1) {
          // Transaction was mined but reverted
          const errorMessage = 'Transaction reverted';
          
          // Try to decode revert reason if available
          if (receipt.status === 0) {
            throw new Error(
              `Transaction reverted with status 0. ` +
              `Transaction hash: ${receipt.hash}. ` +
              `Please check your allowance and balance.`
            );
          }
          
          throw new Error(
            `Transaction failed with status ${receipt.status}. ` +
            `Transaction hash: ${receipt.hash}. ` +
            `Please check your allowance and balance, and ensure you don't already have an active stream.`
          );
        }

        // Parse streamId from event logs
        let streamId = null;
        try {
          // #region agent log - parse streamId start
          fetch('http://127.0.0.1:7242/ingest/0036c2e9-2943-4b5d-9692-984770d55e8c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVoltContract.js:1307',message:'Parsing streamId from event logs',data:{logsCount:receipt.logs?.length || 0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'stream-parse'})}).catch(()=>{});
          // #endregion
          
          if (receipt.logs && receipt.logs.length > 0) {
            for (const log of receipt.logs) {
              try {
                const parsed = contract.interface.parseLog(log);
                if (parsed && parsed.name === 'StreamCreated') {
                  streamId = parsed.args.streamId.toString();
                  console.log('  Stream ID:', streamId);
                  
                  // #region agent log - streamId parsed
                  fetch('http://127.0.0.1:7242/ingest/0036c2e9-2943-4b5d-9692-984770d55e8c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVoltContract.js:1315',message:'StreamId parsed from event',data:{streamId,eventName:parsed.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'stream-parse'})}).catch(()=>{});
                  // #endregion
                  
                  break;
                }
              } catch (parseError) {
                // Not a StreamCreated event, continue
                continue;
              }
            }
          }
          
          // #region agent log - streamId parse result
          fetch('http://127.0.0.1:7242/ingest/0036c2e9-2943-4b5d-9692-984770d55e8c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVoltContract.js:1326',message:'StreamId parse result',data:{streamId,hasStreamId:!!streamId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'stream-parse'})}).catch(()=>{});
          // #endregion
        } catch (err) {
          console.warn('Could not parse streamId from event logs:', err);
          // #region agent log - streamId parse error
          fetch('http://127.0.0.1:7242/ingest/0036c2e9-2943-4b5d-9692-984770d55e8c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVoltContract.js:1329',message:'StreamId parse error',data:{error:err.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'stream-parse'})}).catch(()=>{});
          // #endregion
        }

      return {
        txHash: receipt.hash,
          streamId: streamId,
        blockNumber: receipt.blockNumber,
        success: receipt.status === 1,
      };
      } else {
        // No receipt available (rate limit issue)
        return {
          txHash: tx.hash,
          blockNumber: null,
          success: null,
          note: 'Transaction sent but receipt not available due to RPC rate limiting. Please check transaction status manually.',
        };
      }
    } catch (err) {
      console.error('Error creating stream:', err);
      
      // If error message already contains helpful information, re-throw as is
      if (err.message && (
        err.message.includes('allowance') || 
        err.message.includes('balance') || 
        err.message.includes('reverted') ||
        false // Multiple streams are now allowed
      )) {
      throw err;
      }
      
      // Otherwise, provide a generic error with guidance
      throw new Error(
        `Failed to create stream: ${err.message || 'Unknown error'}. ` +
        `Please ensure: 1) You have approved the contract to spend your vUSDC tokens, ` +
        `2) You have sufficient vUSDC balance.`
      );
    }
  }, [contract, signer]);

  /**
   * Sell share of stream
   * Contract function: sellShare(uint256 streamId, uint256 amountToSell)
   */
  const sellShare = useCallback(async (streamId, amountToSell) => {
    if (!contract || !signer) {
      throw new Error('Wallet not connected');
    }

    if (!streamId) {
      throw new Error('Stream ID is required');
    }

    try {
      // Convert amount to wei
      const amount = ethers.parseEther(amountToSell.toString());
      const streamIdBigInt = BigInt(streamId);

      // Estimate gas
      const gasEstimate = await contract.sellShare.estimateGas(streamIdBigInt, amount);

      // Execute transaction
      const tx = await contract.sellShare(streamIdBigInt, amount, {
        gasLimit: gasEstimate * BigInt(120) / BigInt(100), // Add 20% buffer
      });

      // Wait for transaction
      const receipt = await tx.wait();

      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        success: receipt.status === 1,
      };
    } catch (err) {
      console.error('Error selling share:', err);
      throw err;
    }
  }, [contract, signer]);

  /**
 * Withdraw from stream
 * Contract function: withdraw(uint256 streamId, uint256 amount)
 */
  const withdrawFromStream = useCallback(async (streamId) => {
  if (!contract || !signer) {
    throw new Error('Wallet not connected');
  }

  if (!streamId) {
    throw new Error('Stream ID is required');
  }

  try {
    const streamIdBigInt = BigInt(streamId);

    // Estimate gas
    const gasEstimate = await contract.withdraw.estimateGas(streamIdBigInt);

    // Execute transaction
    const tx = await contract.withdraw(streamIdBigInt, {
      gasLimit: gasEstimate * BigInt(120) / BigInt(100),
    });

    // Wait for transaction
    const receipt = await tx.wait();

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      success: receipt.status === 1,
    };
  } catch (err) {
    console.error('Error withdrawing from stream:', err);
    throw err;
  }
}, [contract, signer]);

  /**
   * Listen to contract events
   * Returns cleanup function to remove listeners
   */
  const setupEventListeners = useCallback((onStreamCreated, onStreamSold, onWithdraw) => {
  if (!contract) return () => {};

  console.log('🎧 [setupEventListeners] Registering event listeners');

  // StreamCreated event handler
  const streamCreatedHandler = (user, streamId, amount, duration, event) => {
    onStreamCreated({
      user,
      streamId: streamId.toString(),
      amount: ethers.formatEther(amount),
      duration: Number(duration),
      txHash: event.transactionHash,
      blockNumber: event.blockNumber,
    });
  };

  // StreamSold event handler
  const streamSoldHandler = (user, streamId, amountSold, cashReceived, event) => {
    onStreamSold({
      user,
      streamId: streamId.toString(),
      amountSold: ethers.formatEther(amountSold),
      cashReceived: ethers.formatEther(cashReceived),
      txHash: event.transactionHash,
      blockNumber: event.blockNumber,
    });
  };

  // Withdraw event handler
  const withdrawHandler = (user, streamId, amount, event) => {
    onWithdraw({
      user,
      streamId: streamId.toString(),
      amount: ethers.formatEther(amount),
      txHash: event.transactionHash,
      blockNumber: event.blockNumber,
    });
  };

  // Register listeners
  if (onStreamCreated) {
    contract.on('StreamCreated', streamCreatedHandler);
  }
  if (onStreamSold) {
    contract.on('StreamSold', streamSoldHandler);
  }
  if (onWithdraw) {
    contract.on('Withdraw', withdrawHandler);
  }

  // Return cleanup function
  return () => {
    console.log('🧹 [setupEventListeners] Cleaning up event listeners');
    if (onStreamCreated) {
      contract.off('StreamCreated', streamCreatedHandler);
    }
    if (onStreamSold) {
      contract.off('StreamSold', streamSoldHandler);
    }
    if (onWithdraw) {
      contract.off('Withdraw', withdrawHandler);
    }
  };
}, [contract]);

  return {
    // State
    provider,
    signer,
    contract,
    account,
    network,
    isConnecting,
    error,

    // Actions
    connectWallet,
    disconnectWallet,
    getUSDCBalance,
    getVUSDCBalance,
    getFaucetBalance,
    requestVUSDCFromFaucet,
    fetchStream,
    fetchUserStreams,
    createStream,
    sellShare,
    withdrawFromStream,
    setupEventListeners,
  };
};

export default useVoltContract;


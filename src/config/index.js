/**
 * Application Configuration
 * 
 * Centralized configuration management using environment variables
 * All VITE_ prefixed variables are exposed to the client
 */

/**
 * Network Configuration
 */
export const NETWORK_CONFIG = {
  name: import.meta.env.VITE_NETWORK_NAME || 'Arc Testnet',
  chainId: import.meta.env.VITE_CHAIN_ID ? BigInt(import.meta.env.VITE_CHAIN_ID) : BigInt(5042002),
  rpcUrl: import.meta.env.VITE_RPC_URL || 'https://rpc.testnet.arc.network',
};

/**
 * Contract Addresses
 */
export const CONTRACT_ADDRESSES = {
  voltProtocol: import.meta.env.VITE_CONTRACT_ADDRESS || '0x416B58ab512DFA5D44aa918aC817B9B17Dfd350a',
  usdcToken: import.meta.env.VITE_USDC_TOKEN_ADDRESS || null,
  vusdcToken: import.meta.env.VITE_VUSDC_TOKEN_ADDRESS || '0xe4987ACA7b7fAB6f4291b33E24873A79E721e9c2', // Volt USDC Token
  faucet: import.meta.env.VITE_FAUCET_ADDRESS || null, // vUSDC Faucet Contract
};

/**
 * Environment
 */
export const APP_ENV = import.meta.env.VITE_APP_ENV || import.meta.env.MODE || 'development';
export const IS_PRODUCTION = APP_ENV === 'production';
export const IS_DEVELOPMENT = APP_ENV === 'development';
export const IS_STAGING = APP_ENV === 'staging';

/**
 * Error Tracking (Sentry)
 */
export const SENTRY_CONFIG = {
  dsn: import.meta.env.VITE_SENTRY_DSN || null,
  environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || APP_ENV,
  enabled: !!import.meta.env.VITE_SENTRY_DSN && IS_PRODUCTION,
};

/**
 * Analytics
 */
export const ANALYTICS_CONFIG = {
  id: import.meta.env.VITE_ANALYTICS_ID || null,
  enabled: !!import.meta.env.VITE_ANALYTICS_ID && IS_PRODUCTION,
};

/**
 * Feature Flags
 */
export const FEATURE_FLAGS = {
  sniperBot: import.meta.env.VITE_ENABLE_SNIPER_BOT !== 'false',
  analytics: import.meta.env.VITE_ENABLE_ANALYTICS !== 'false',
};

/**
 * App Metadata
 */
export const APP_CONFIG = {
  name: 'Volt Protocol',
  version: '1.2.0',
  description: 'Real-World Asset Streaming Marketplace',
  poweredBy: 'Arc Network',
};

/**
 * Logging Configuration
 */
export const LOG_CONFIG = {
  level: IS_PRODUCTION ? 'error' : 'debug',
  enableConsole: !IS_PRODUCTION,
};

/**
 * Get full configuration object
 */
export const getConfig = () => ({
  network: NETWORK_CONFIG,
  contracts: CONTRACT_ADDRESSES,
  environment: APP_ENV,
  sentry: SENTRY_CONFIG,
  analytics: ANALYTICS_CONFIG,
  features: FEATURE_FLAGS,
  app: APP_CONFIG,
  logging: LOG_CONFIG,
});

export default getConfig();


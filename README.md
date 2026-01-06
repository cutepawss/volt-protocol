# Volt Protocol

Decentralized P2P streaming payment platform built on Arc

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Built on Arc](https://img.shields.io/badge/Built%20on-Arc-blue)](https://www.circle.com/arc)

---

## Overview

Volt Protocol enables continuous cryptocurrency payment streams with real-time P2P order matching. Built on Arc's Layer-1 infrastructure, leveraging USDC native gas and sub-second deterministic finality for institutional-grade performance.

**Live Demo**: [volt-protocol.xyz](https://www.volt-protocol.xyz/)

---

## Key Features

**Payment Streaming**
- Create continuous payment flows with configurable rates
- Real-time stream monitoring and management

**P2P Marketplace**
- Sell order creation with custom pricing
- Competitive bidding system
- Direct purchase option
- Transparent order book

### Coming Soon
- **Sniper Bot**: Automated order execution with risk management
- Enhanced analytics with historical charts
- Mobile wallet integration
- Multi-token support

**Analytics Dashboard**
- Live transaction monitoring
- Trading volume metrics
- Historical data visualization

**Test Environment**
- vUSDC test token with daily faucet

---

## Built With Arc

Volt Protocol leverages Arc's unique capabilities:

- **USDC Native Gas**: Predictable transaction costs with stable fees
- **Sub-second Finality**: Instant settlement certainty for trades
- **High Performance**: Supports high-frequency trading operations
- **EVM Compatible**: Familiar development environment with Solidity

---

## Technology Stack

**Blockchain**
- Arc Layer-1 (Malachite consensus)
- Solidity 0.8.20
- Hardhat development environment

**Frontend**
- React 18.3.1
- Vite 6.0.5
- Ethers.js 6.13.4

**Smart Contracts**
- OpenZeppelin security libraries
- Custom streaming protocol
- Automated market matching

---

## Architecture
```
┌──────────────────────────────┐
│      React Frontend          │
│   (Dashboard, Marketplace)   │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│        Ethers.js             │
│    (Web3 Integration)        │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│         Arc Network          │
│   ┌──────────────────────┐   │
│   │  vUSDC Contract      │   │
│   │  Faucet Contract     │   │
│   │  Streaming Logic     │   │
│   └──────────────────────┘   │
└──────────────────────────────┘
```

---

## Smart Contracts

**vUSDC Token**
- ERC20-compliant test token
- Integrated with faucet system
- 6 decimal precision

**vUSDC Faucet**
- 1000 vUSDC daily allocation
- 24-hour cooldown mechanism
- Anti-abuse protection

---


## Use Cases

- **Cross-border Payments**: Continuous payment streams for international transactions
- **Subscription Services**: Automated recurring payments
- **Payroll Systems**: Real-time salary streaming
- **Marketplace Trading**: List, bid, and trade vUSDC
- **Treasury Management**: Automated capital allocation

---

## Performance Metrics

- Sub-second transaction finality via Arc
- Gas-efficient smart contract design
- Support for high-frequency operations

---

## Security

- Comprehensive smart contract testing
- OpenZeppelin security standards
- No private key storage

---


**Built for the Arc ecosystem**

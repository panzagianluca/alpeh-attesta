'use client'

import { createConfig, http } from 'wagmi'
import { mainnet, sepolia, hardhat } from 'wagmi/chains'
import { metaMask, walletConnect, injected } from 'wagmi/connectors'

// Lisk Sepolia Testnet chain definition
export const liskSepolia = {
  id: 4202,
  name: 'Lisk Sepolia Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Lisk',
    symbol: 'LSK',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.sepolia-api.lisk.com'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Lisk Sepolia Explorer',
      url: 'https://sepolia-blockscout.lisk.com',
    },
  },
  testnet: true,
} as const

// Project ID for WalletConnect
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'a9a91102daad7a2bf42889d1b8ad8d00'

export const config = createConfig({
  chains: [liskSepolia, mainnet, sepolia, hardhat],
  connectors: [
    metaMask(),
    walletConnect({ projectId }),
    injected(),
  ],
  transports: {
    [liskSepolia.id]: http('https://rpc.sepolia-api.lisk.com'),
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [hardhat.id]: http('http://127.0.0.1:8545'),
  },
})

// Contract addresses for different networks
export const CONTRACT_ADDRESSES = {
  [liskSepolia.id]: {
    attestaCore: '0x4fCD15b71119B2F1c18944F9D1e6Ac8D5eE0024a', // Deployed on Lisk Sepolia
    token: '0x...', // Token contract address (if needed)
  },
  [mainnet.id]: {
    attestaCore: '0x...', // Deploy address on mainnet
    token: '0x...', // Token contract address
  },
  [sepolia.id]: {
    attestaCore: '0x...', // Deploy address on sepolia
    token: '0x...', // Token contract address
  },
  [hardhat.id]: {
    attestaCore: '0x5FbDB2315678afecb367f032d93F642f64180aa3', // Default hardhat address
    token: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  },
} as const

export type SupportedChainId = keyof typeof CONTRACT_ADDRESSES

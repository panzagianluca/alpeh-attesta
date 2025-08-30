import { createPublicClient, http } from 'viem';

const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 0);
const rpc = process.env.NEXT_PUBLIC_LISK_RPC_URL || process.env.LISK_RPC_URL || '';

export const publicClient = createPublicClient({
  chain: {
    id: chainId,
    name: 'Lisk Testnet',
    nativeCurrency: { name: 'tLisk', symbol: 'tLISK', decimals: 18 },
    rpcUrls: { default: { http: [rpc] } }
  },
  transport: http(rpc)
});

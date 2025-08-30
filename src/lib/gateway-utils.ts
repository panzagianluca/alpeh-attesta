/**
 * Gateway Display Utilities
 * Provides friendly names and metadata for IPFS gateways
 */

export interface GatewayInfo {
  url: string;
  name: string;
  provider: string;
  type: 'public' | 'premium' | 'specialized';
  description: string;
}

/**
 * Get friendly name for a gateway URL
 */
export function getGatewayDisplayName(gatewayUrl: string): string {
  const url = gatewayUrl.toLowerCase();
  
  if (url.includes('ipfs.io')) return 'IPFS.io';
  if (url.includes('dweb.link')) return 'Protocol Labs';
  if (url.includes('cloudflare-ipfs.com')) return 'Cloudflare';
  if (url.includes('w3s.link')) return 'Web3.Storage';
  if (url.includes('pinata.cloud')) return 'Pinata';
  if (url.includes('4everland.io')) return '4everland';
  if (url.includes('gateway.ipfs.io')) return 'IPFS Gateway';
  
  // Extract domain name as fallback
  try {
    const domain = new URL(gatewayUrl).hostname;
    return domain.replace('gateway.', '').replace('.com', '').replace('.io', '');
  } catch {
    return 'Unknown Gateway';
  }
}

/**
 * Get detailed gateway information
 */
export function getGatewayInfo(gatewayUrl: string): GatewayInfo {
  const url = gatewayUrl.toLowerCase();
  
  if (url.includes('ipfs.io')) {
    return {
      url: gatewayUrl,
      name: 'IPFS.io',
      provider: 'Protocol Labs',
      type: 'public',
      description: 'Official IPFS gateway'
    };
  }
  
  if (url.includes('dweb.link')) {
    return {
      url: gatewayUrl,
      name: 'dweb.link',
      provider: 'Protocol Labs',
      type: 'public',
      description: 'Distributed web gateway'
    };
  }
  
  if (url.includes('cloudflare-ipfs.com')) {
    return {
      url: gatewayUrl,
      name: 'Cloudflare IPFS',
      provider: 'Cloudflare',
      type: 'premium',
      description: 'Global CDN-backed gateway'
    };
  }
  
  if (url.includes('w3s.link')) {
    return {
      url: gatewayUrl,
      name: 'Web3.Storage',
      provider: 'Protocol Labs',
      type: 'specialized',
      description: 'Web3 storage service gateway'
    };
  }
  
  if (url.includes('pinata.cloud')) {
    return {
      url: gatewayUrl,
      name: 'Pinata',
      provider: 'Pinata',
      type: 'premium',
      description: 'IPFS pinning service gateway'
    };
  }
  
  if (url.includes('4everland.io')) {
    return {
      url: gatewayUrl,
      name: '4everland',
      provider: '4everland',
      type: 'premium',
      description: 'Web3 infrastructure gateway'
    };
  }
  
  // Fallback
  return {
    url: gatewayUrl,
    name: getGatewayDisplayName(gatewayUrl),
    provider: 'Unknown',
    type: 'public',
    description: 'IPFS gateway'
  };
}

/**
 * Get gateway status icon/emoji
 */
export function getGatewayStatusIcon(success: boolean, responseTime?: number): string {
  if (!success) return '❌';
  if (!responseTime) return '✅';
  if (responseTime < 1000) return '🚀'; // Fast
  if (responseTime < 3000) return '✅'; // Good
  return '🐌'; // Slow but working
}

/**
 * Get performance description
 */
export function getPerformanceDescription(responseTime: number): string {
  if (responseTime < 500) return 'Excellent';
  if (responseTime < 1000) return 'Very Good';
  if (responseTime < 2000) return 'Good';
  if (responseTime < 3000) return 'Fair';
  return 'Slow';
}

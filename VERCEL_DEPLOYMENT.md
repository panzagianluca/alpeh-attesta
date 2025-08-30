# Vercel Production Environment Variables

## Required for Production Deployment

### IPFS Configuration
IPFS_GATEWAYS=https://ipfs.io/ipfs,https://dweb.link/ipfs,https://cloudflare-ipfs.com/ipfs
WEB3_STORAGE_TOKEN=your_web3_storage_token_here

### Demo CIDs (for testing)
DEMO_CIDS=bafybeihkoviema7g3gxyt6la7b7kbbv2dzx3cgwnp2fvq5mw6u7pjzjwm4,bafybeidj6idz6p5vgjo5bqqzipbdf5q5a6pqm4nww3kfbmntplm5v3lx7a

### Blockchain Configuration (when ready)
NEXT_PUBLIC_LISK_RPC_URL=https://rpc.api.lisk.com
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...

### Performance Tuning
PROBE_TIMEOUT=3000
PROBE_CONCURRENCY=3
MAX_CIDS_PER_EXECUTION=3

### Monitoring (optional)
SENTRY_DSN=your_sentry_dsn_here
WEBHOOK_URL=your_monitoring_webhook_here

## Vercel Deployment Notes

1. **Plan Requirements:**
   - Hobby Plan: 30s function timeout (sufficient for our optimized cron)
   - Pro Plan: 900s timeout (overkill but provides margin)

2. **Regional Deployment:**
   - Default: iad1 (Washington D.C.)
   - EU: fra1 (Frankfurt) for EU compliance
   - Asia: sin1 (Singapore) for Asia-Pacific

3. **Monitoring:**
   - Vercel Analytics: Monitor function execution times
   - Vercel Logs: Real-time execution monitoring
   - Custom webhooks: External alerting

4. **Testing:**
   - Preview deployments: Test cron with preview URLs
   - Production: Verify with Vercel cron logs
   - Manual trigger: Use POST /api/cron/probe for testing

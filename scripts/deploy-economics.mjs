#!/usr/bin/env node

import { ethers } from 'ethers'
import { readFileSync, writeFileSync } from 'fs'
import dotenv from 'dotenv'

dotenv.config()

async function deployAttestaEconomics() {
  console.log('🚀 Deploying AttestaEconomics sidecar contract...')
  
  // Setup provider and wallet
  const provider = new ethers.JsonRpcProvider(process.env.LISK_SEPOLIA_RPC)
  const deployer = new ethers.Wallet(process.env.POLICY_PRIVATE_KEY, provider)
  
  console.log('📍 Deployer address:', deployer.address)
  console.log('💰 Deployer balance:', ethers.formatEther(await provider.getBalance(deployer.address)), 'ETH')
  
  // Contract addresses for constructor
  const treasury = process.env.TREASURY_ADDRESS || deployer.address
  const validatorBeneficiary = process.env.ATTESTA_VALIDATOR_ADDRESS || deployer.address
  const policyRole = process.env.POLICY_ADDRESS || deployer.address
  
  console.log('🏦 Treasury:', treasury)
  console.log('👥 Validator Beneficiary:', validatorBeneficiary)
  console.log('🔐 Policy Role:', policyRole)
  
  try {
    // Load contract artifacts
    const contractPath = './out/AttestaEconomics.sol/AttestaEconomics.json'
    const artifact = JSON.parse(readFileSync(contractPath, 'utf8'))
    
    // Create contract factory
    const AttestaEconomics = new ethers.ContractFactory(
      artifact.abi,
      artifact.bytecode,
      deployer
    )
    
    // Deploy contract
    console.log('📦 Deploying contract...')
    const economics = await AttestaEconomics.deploy(treasury, validatorBeneficiary, policyRole)
    
    console.log('⏳ Waiting for deployment...')
    await economics.waitForDeployment()
    
    const contractAddress = await economics.getAddress()
    console.log('✅ AttestaEconomics deployed to:', contractAddress)
    
    // Verify deployment
    const deployedCode = await provider.getCode(contractAddress)
    if (deployedCode === '0x') {
      throw new Error('Contract deployment failed - no code at address')
    }
    
    // Update deployments.json
    const deploymentsPath = './deployments.json'
    let deployments = {}
    
    try {
      deployments = JSON.parse(readFileSync(deploymentsPath, 'utf8'))
    } catch (error) {
      console.log('📄 Creating new deployments.json')
    }
    
    if (!deployments.liskSepolia) {
      deployments.liskSepolia = {}
    }
    
    deployments.liskSepolia.attestaEconomics = contractAddress
    deployments.liskSepolia.attestaEconomicsDeployedAt = new Date().toISOString()
    
    writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2))
    console.log('📝 Updated deployments.json')
    
    // Test contract interaction
    console.log('🧪 Testing contract functions...')
    
    // Check initial parameters
    const platformFeeBps = await economics.platformFeeBps()
    const okRewardWei = await economics.okRewardWei()
    const breachThreshold = await economics.breachThreshold()
    
    console.log('📊 Contract Parameters:')
    console.log('  Platform Fee:', platformFeeBps.toString(), 'bps (2.5%)')
    console.log('  OK Reward:', ethers.formatEther(okRewardWei), 'ETH per cycle')
    console.log('  Breach Threshold:', breachThreshold.toString(), 'consecutive')
    
    // Test deposit split calculation
    const testDeposit = ethers.parseEther('0.02')
    const [platformFee, insurancePool, rewardPool] = await economics.getDepositSplit(testDeposit)
    
    console.log('💰 Test Deposit Split (0.02 ETH):')
    console.log('  Platform Fee:', ethers.formatEther(platformFee), 'ETH')
    console.log('  Insurance Pool:', ethers.formatEther(insurancePool), 'ETH')
    console.log('  Reward Pool:', ethers.formatEther(rewardPool), 'ETH')
    
    console.log('\n🎉 Deployment successful!')
    console.log('📋 Next steps:')
    console.log('  1. Update frontend contract addresses')
    console.log('  2. Integrate with evidence workflow')
    console.log('  3. Test publisher staking flow')
    
    return {
      address: contractAddress,
      deployer: deployer.address,
      treasury,
      validatorBeneficiary,
      policyRole
    }
    
  } catch (error) {
    console.error('❌ Deployment failed:', error)
    throw error
  }
}

// Run deployment
if (import.meta.url === `file://${process.argv[1]}`) {
  deployAttestaEconomics()
    .then((result) => {
      console.log('\n✅ Deployment completed:', result)
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Deployment failed:', error)
      process.exit(1)
    })
}

export default deployAttestaEconomics

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/EvidenceRegistry.sol";

contract Deploy is Script {
    function run() external {
        // Use DEPLOYER_PRIVATE_KEY from .env.local
        uint256 deployerPk = uint256(vm.envBytes32("DEPLOYER_PRIVATE_KEY"));
        address policy  = vm.envAddress("POLICY_ADDRESS");
        address watcher = vm.envAddress("WATCHER_ADDRESS");

        console2.log("=== CID Sentinel Contract Deployment ===");
        console2.log("Network: Lisk Sepolia Testnet");
        console2.log("Deployer:", vm.addr(deployerPk));
        console2.log("Policy Address:", policy);
        console2.log("Watcher Address:", watcher);
        
        vm.startBroadcast(deployerPk);
        EvidenceRegistry registry = new EvidenceRegistry(policy, watcher);
        vm.stopBroadcast();

        console2.log("\n=== Deployment Successful ===");
        console2.log("EvidenceRegistry Address:", address(registry));
        console2.log("Transaction Hash: [will be shown in broadcast log]");
        
        // Verify initial state
        console2.log("\n=== Verification ===");
        console2.log("Contract Address:", address(registry));
        console2.log("Policy Role Assigned:", registry.hasRole(registry.POLICY_ROLE(), policy));
        console2.log("Watcher Role Assigned:", registry.hasRole(registry.WATCHER_ROLE(), watcher));
        console2.log("Admin Role (Deployer):", registry.hasRole(registry.DEFAULT_ADMIN_ROLE(), vm.addr(deployerPk)));
        
        console2.log("\n=== Next Steps ===");
        console2.log("1. Update NEXT_PUBLIC_CONTRACT_ADDRESS in .env.local");
        console2.log("2. Update deployments.json with contract address");
        console2.log("3. Verify contract on Lisk explorer if needed");
        console2.log("4. Fund POLICY and WATCHER accounts for testing");
    }
}

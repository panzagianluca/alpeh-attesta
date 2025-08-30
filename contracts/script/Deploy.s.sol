// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/EvidenceRegistry.sol";

contract Deploy is Script {
    function run() external {
        // PRIVATE_KEY: hex en .env (0x...)
        uint256 pk = uint256(vm.envBytes32("PRIVATE_KEY"));
        address policy  = vm.envAddress("POLICY_ADDRESS");
        address watcher = vm.envAddress("WATCHER_ADDRESS");

        vm.startBroadcast(pk);
        EvidenceRegistry reg = new EvidenceRegistry(policy, watcher);
        vm.stopBroadcast();

        console2.log("EvidenceRegistry:", address(reg));
        console2.log("POLICY_ROLE:", policy);
        console2.log("WATCHER_ROLE:", watcher);
    }
}

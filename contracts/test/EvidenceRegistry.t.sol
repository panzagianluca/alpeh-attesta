// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/EvidenceRegistry.sol";

contract EvidenceRegistryTest is Test {
    EvidenceRegistry reg;

    address admin     = address(this);
    address policy    = address(0xBEEF);
    address watcher   = address(0xCAFE);
    address publisher = address(0xA11CE);
    address staker    = address(0xD00D);

    bytes32 cid = keccak256(abi.encodePacked("cid1"));

    function setUp() public {
        vm.prank(admin);
        reg = new EvidenceRegistry(policy, watcher);
        vm.deal(staker, 100 ether);
    }

    function _slo() internal pure returns (EvidenceRegistry.SLO memory) {
        return EvidenceRegistry.SLO({ k: 2, n: 3, timeout: 2000, window: 5 });
    }

    // --- registerCID ---
    function testRegisterCID_OK() public {
        vm.prank(publisher);
        reg.registerCID(cid, _slo(), true);

        (
            address pub,
            EvidenceRegistry.SLO memory slo,
            uint256 totalStake,
            , , , bool slashingEnabled, 
            uint64 nonce
        ) = reg.cids(cid);

        assertEq(pub, publisher);
        assertEq(slo.k, 2);
        assertEq(slo.n, 3);
        assertEq(totalStake, 0);
        assertTrue(slashingEnabled);
        assertEq(nonce, 0);
    }

    function testRegisterCID_RevertBadSLO() public {
        EvidenceRegistry.SLO memory bad = EvidenceRegistry.SLO({ k: 0, n: 3, timeout: 2000, window: 5 });
        vm.prank(publisher);
        vm.expectRevert("bad SLO");
        reg.registerCID(cid, bad, true);
    }

    function testRegisterCID_RevertExists() public {
        vm.startPrank(publisher);
        reg.registerCID(cid, _slo(), true);
        vm.expectRevert("exists");
        reg.registerCID(cid, _slo(), true);
        vm.stopPrank();
    }

    // --- bondStake ---
    function testBondStake_OK() public {
        vm.prank(publisher);
        reg.registerCID(cid, _slo(), true);

        vm.prank(staker);
        reg.bondStake{value: 1 ether}(cid);

        (, , uint256 totalStake, , , , , ) = reg.cids(cid);
        assertEq(totalStake, 1 ether);
    }

    function testBondStake_RevertUnknownCID() public {
        vm.prank(staker);
        vm.expectRevert("unknown cid");
        reg.bondStake{value: 1 ether}(cid);
    }

    function testBondStake_RevertZero() public {
        vm.prank(publisher);
        reg.registerCID(cid, _slo(), true);

        vm.prank(staker);
        vm.expectRevert("no value");
        reg.bondStake{value: 0}(cid);
    }

    // --- reportPack ---
    function testReportPack_OK_StatusFlow() public {
        vm.prank(publisher);
        reg.registerCID(cid, _slo(), true);

        // Test single BREACH
        EvidenceRegistry.PackRef memory p1 = EvidenceRegistry.PackRef({
            cidDigest: cid,
            packCIDDigest: keccak256("pack1"),
            ts: uint64(block.timestamp),
            status: 2, // BREACH
            nonce: 1
        });

        vm.prank(watcher);
        reg.reportPack(p1);

        (, , , , uint64 lastBreachAt, uint8 consecutiveFails, , uint64 nonce) = reg.cids(cid);
        assertEq(consecutiveFails, 1); // Should be 1 after one BREACH
        assertEq(nonce, 1); // This should be the nonce, which is 1
        assertEq(lastBreachAt, uint64(block.timestamp));
    }

    function testReportPack_RevertNonce() public {
        vm.prank(publisher);
        reg.registerCID(cid, _slo(), true);

        EvidenceRegistry.PackRef memory p = EvidenceRegistry.PackRef({
            cidDigest: cid,
            packCIDDigest: keccak256("pack"),
            ts: uint64(block.timestamp),
            status: 0,
            nonce: 2 // debe ser 1
        });

        vm.prank(watcher);
        vm.expectRevert("nonce");
        reg.reportPack(p);
    }

    function testReportPack_RevertOnlyWatcher() public {
        vm.prank(publisher);
        reg.registerCID(cid, _slo(), true);

        EvidenceRegistry.PackRef memory p = EvidenceRegistry.PackRef({
            cidDigest: cid,
            packCIDDigest: keccak256("pack"),
            ts: uint64(block.timestamp),
            status: 0,
            nonce: 1
        });

        // caller NO watcher -> AccessControl revert
        vm.expectRevert();
        reg.reportPack(p);
    }

    // --- slash ---
    function testSlash_OK() public {
        vm.prank(publisher);
        reg.registerCID(cid, _slo(), true);

        vm.prank(staker);
        reg.bondStake{value: 2 ether}(cid);

        uint256 before = publisher.balance;

        vm.prank(policy);
        reg.slash(cid, 1 ether);

        (, , uint256 totalStake, , , , , ) = reg.cids(cid);
        assertEq(totalStake, 1 ether);
        assertEq(publisher.balance, before + 1 ether);
    }

    function testSlash_RevertDisabled() public {
        vm.prank(publisher);
        reg.registerCID(cid, _slo(), false);

        vm.prank(staker);
        reg.bondStake{value: 1 ether}(cid);

        vm.prank(policy);
        vm.expectRevert("disabled");
        reg.slash(cid, 0.5 ether);
    }

    function testSlash_RevertAmount() public {
        vm.prank(publisher);
        reg.registerCID(cid, _slo(), true);

        vm.prank(staker);
        reg.bondStake{value: 1 ether}(cid);

        vm.prank(policy);
        vm.expectRevert("amount");
        reg.slash(cid, 2 ether);
    }

    // --- pause ---
    function testPauseBlocksFunctions() public {
        // admin == address(this)
        reg.pause();

        vm.prank(publisher);
        vm.expectRevert(); // Using generic revert expectation for custom errors
        reg.registerCID(cid, _slo(), true);
    }
}

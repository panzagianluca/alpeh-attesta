// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl}   from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable}        from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title EvidenceRegistry (MVP)
/// @notice Ancla packs de evidencia para CIDs y habilita slashing bajo SLO roto.
contract EvidenceRegistry is AccessControl, Pausable, ReentrancyGuard {
    // --- Roles ---
    bytes32 public constant POLICY_ROLE  = keccak256("POLICY_ROLE");   // puede ejecutar slash
    bytes32 public constant WATCHER_ROLE = keccak256("WATCHER_ROLE");  // puede reportar packs

    // --- Tipos ---
    struct SLO { 
        uint8  k;        // éxitos mínimos
        uint8  n;        // vantage totales
        uint16 timeout;  // ms
        uint16 window;   // minutos
    }

    struct CIDState {
        address publisher;          // dueño del CID
        SLO     slo;                
        uint256 totalStake;         // stake acumulado (MVP local)
        bytes32 lastPackCIDDigest;  // keccak(packCIDv1)
        uint64  lastBreachAt;       // timestamp último breach
        uint8   consecutiveFails;   // contador de fallos consecutivos
        bool    slashingEnabled;    // si permite slash
        uint64  nonce;              // anti-replay por CID (monotónico)
    }

    struct PackRef {
        bytes32 cidDigest;     // keccak(CIDv1 string)
        bytes32 packCIDDigest; // keccak(pack CIDv1)
        uint64  ts;            // epoch seconds del pack
        uint8   status;        // 0 OK, 1 DEGRADED, 2 BREACH
        uint64  nonce;         // debe ser = s.nonce + 1
    }

    // --- Storage ---
    mapping(bytes32 => CIDState) public cids;

    // --- Eventos ---
    event CIDRegistered(bytes32 indexed cid, address indexed publisher, SLO slo, bool slashing);
    event StakeBonded(bytes32 indexed cid, address indexed staker, uint256 amount);
    event EvidenceAnchored(bytes32 indexed cid, bytes32 indexed packCID, uint8 status, uint64 nonce);
    event BreachDetected(bytes32 indexed cid, uint64 at);
    event Slashed(bytes32 indexed cid, uint256 amount, address by);

    // --- Constructor ---
    constructor(address policy, address watcher) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(POLICY_ROLE,  policy);
        _grantRole(WATCHER_ROLE, watcher);
    }

    // --- Funciones núcleo ---
    function registerCID(bytes32 cid, SLO calldata slo, bool slashingEnabled)
        external
        whenNotPaused
    {
        require(slo.k > 0 && slo.k <= slo.n && slo.n <= 5, "bad SLO");
        require(slo.timeout > 0 && slo.timeout <= 60000, "bad timeout");
        require(slo.window > 0 && slo.window <= 1440, "bad window");

        CIDState storage s = cids[cid];
        require(s.publisher == address(0), "exists");

        s.publisher = msg.sender;
        s.slo = slo;
        s.slashingEnabled = slashingEnabled;

        emit CIDRegistered(cid, msg.sender, slo, slashingEnabled);
    }

    /// @notice MVP: stake nativo (ETH-like) para demo; puede migrar a Symbiotic en Plan A.
    function bondStake(bytes32 cid)
        external
        payable
        nonReentrant
        whenNotPaused
    {
        require(msg.value > 0, "no value");
        CIDState storage s = cids[cid];
        require(s.publisher != address(0), "unknown cid");

        s.totalStake += msg.value;
        emit StakeBonded(cid, msg.sender, msg.value);
    }

    /// @notice Reporta un pack de evidencia; sólo el watcher.
    function reportPack(PackRef calldata p)
        external
        whenNotPaused
        onlyRole(WATCHER_ROLE)
    {
        CIDState storage s = cids[p.cidDigest];
        require(s.publisher != address(0), "unknown cid");
        require(p.nonce == s.nonce + 1, "nonce");
        // Evita anclar packs "viejos" después de un breach
        require(p.ts >= s.lastBreachAt, "ts");

        s.nonce = p.nonce;
        s.lastPackCIDDigest = p.packCIDDigest;

        if (p.status == 2) { // BREACH
            unchecked { s.consecutiveFails += 1; }
            s.lastBreachAt = uint64(block.timestamp);
            emit BreachDetected(p.cidDigest, s.lastBreachAt);
        } else if (p.status == 0) { // OK
            s.consecutiveFails = 0;
        }

        emit EvidenceAnchored(p.cidDigest, p.packCIDDigest, p.status, p.nonce);
    }

    /// @notice Ejecuta slashing del stake local (MVP). Plan A: redirigir a Symbiotic.
    function slash(bytes32 cid, uint256 amount)
        external
        onlyRole(POLICY_ROLE)
        whenNotPaused
        nonReentrant
    {
        CIDState storage s = cids[cid];
        require(s.publisher != address(0), "unknown cid");
        require(s.slashingEnabled, "disabled");
        require(amount > 0 && amount <= s.totalStake, "amount");

        s.totalStake -= amount;

        // MVP: paga al publisher (compensación). Alternativa: vault/pool.
        (bool ok, ) = s.publisher.call{value: amount}("");
        require(ok, "transfer");

        emit Slashed(cid, amount, msg.sender);
    }

    // --- Emergencias ---
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) { _unpause(); }

    // --- Fallback ---
    receive() external payable {}
}

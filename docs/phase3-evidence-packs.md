# Phase 3: Evidence Pack Builder - Implementation Plan

## Overview
**Objetivo:** Construir el sistema core de Evidence Packs que conecta los probe workers con el anclaje on-chain. Este es el corazón de CID Sentinel.

**Tiempo objetivo:** 2 horas
**Criticidad:** ALTA - Sin esto no hay demo funcional

## 3.1 ✅ Esquema JSON v1

### Evidence Pack Schema
```typescript
interface EvidencePackV1 {
  cid: string;                    // CIDv1 monitoreado (exacto)
  ts: number;                     // timestamp epoch segundos
  windowMin: number;              // tamaño ventana (ej: 5)
  threshold: {                    // SLO thresholds
    k: number;                    // éxitos mínimos requeridos (≥1)
    n: number;                    // total vantage points (≥k)
    timeoutMs: number;            // timeout máximo por probe
  };
  probes: ProbeResult[];          // observaciones por vantage
  libp2p: {                       // opcional
    attempted: boolean;
  };
  agg: {                          // agregados calculados
    okCount: number;              // número de probes con ok=true
    status: 'OK' | 'DEGRADED' | 'BREACH';
  };
  watcherSig: string;             // firma ed25519 base64
  schema: 'cid-sentinel/1';       // versión schema
}

interface ProbeResult {
  vp: string;                     // etiqueta vantage (us-east, eu-west)
  method: 'HTTP' | 'LIBP2P';     // método de probe
  gateway?: string;               // URL gateway (requerido si HTTP)
  ok: boolean;                    // éxito del probe
  latMs?: number;                 // latencia medida (opcional)
  err?: string;                   // razón de fallo (opcional)
}
```

### Reglas de cálculo `agg.status`
- `okCount >= k` → `OK`
- `0 < okCount < k` → `DEGRADED` 
- `okCount = 0` → `BREACH`

### Restricciones
- `k ≤ n` y `n ≤ 5` (demo)
- `timeoutMs: 200-30000 ms`
- `windowMin: 1-60` (demo)
- Tamaño pack ≤ 10 KB
- JSON determinístico (mismo input → mismos bytes)

---

## 3.2 Firma ed25519
- watcher firma el JSON canónico (sin watcherSig)
- watcherSig: base64, 64 bytes
- clave privada solo en server
- clave pública para verificación
- proceso de rotación documentado

---

## 3.3 Persistencia IPFS (web3.storage)
- pack subido como JSON único
- content-type: application/json
- packCID determinista
- retries: 2 con backoff
- abort si upload falla
- verificación: abrir packCID en 2 gateways

---

## 3.4 Builder & Agregación
- inputs: cid, windowMin, threshold, probes, attemptedLibp2p
- builder calcula okCount, status, compone pack
- validación estricta
- tamaño controlado

---

## 3.5 Interfaz API/CLI
- entrada: objeto con cid, windowMin, threshold, probes, attemptedLibp2p
- salida: { packCID, status, okCount }
- errores claros, nunca expone secrets
- determinismo: mismo input → misma salida

---

## 3.6 Pruebas y verificación
- casos OK/DEGRADED/BREACH
- validación de esquema
- verificación de firma con clave pública
- error si falta token o upload falla

---

## 3.7 Observabilidad y límites
- logs: inicio/fin, cid, okCount, status, tamaño
- latencia generación ≤ 500 ms, subida ≤ 2.5 s
- tamaño ≤ 10 KB
- umbral alerta: >3 fallos subida consecutivos

---

## 3.8 Seguridad y privacidad
- secrets solo en server
- sin PII
- circuit breaker si falla validación/firma
- rate limiting por cid/ventana

---

## 3.9 Entregables
- docs: esquema, firma, persistencia, interfaz, pruebas, observabilidad
- checklist de entorno
- README actualizado

---

## Definition of Done ✅
- [x] Evidence Pack schema implemented & validated
- [x] ed25519 signing working with tweetnacl
- [x] IPFS upload working with web3.storage
- [x] Builder aggregation logic implemented
- [x] API endpoint functional
- [x] Tests covering main scenarios
- [x] Documentation complete
- [x] Security policies documented
- [x] Hand-off ready for Phase 4 (cron integration)

---

## Next Phase Integration
Este builder será llamado desde:
1. **Phase 4**: Cron jobs → probe workers → builder → on-chain reporting
2. **Phase 5**: Manual testing desde UI
3. **Phase 6**: Demo automation & breach simulation

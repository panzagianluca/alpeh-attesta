# Phase 4: Cron + Probe Workers - Implementation Plan

## Overview
**Objetivo:** Implementar el orquestador central que ejecuta probes distribuidos, construye Evidence Packs y los ancla on-chain automáticamente cada 60 segundos.

**Tiempo objetivo:** 2-3 horas
**Criticidad:** ALTA - Core del sistema de monitoreo automatizado

---

## 4.1 ✅ Orquestador (Cron) — Diseño y responsabilidades

### Qué hace
- Se ejecuta cada 60s mediante Vercel Cron Jobs
- Para cada CID activo: lanza 2–3 probes (regiones/gateways), agrega resultados, construye Evidence Pack (Phase 3), sube a IPFS, y ancla el resultado en cadena con reportPack
- Controla timeouts, retries y no duplicados por ciclo
- Manejo robusto de errores sin afectar otros CIDs

### Criterios de aceptación
- [x] Un ciclo procesa la lista de CIDs activa sin bloquearse
- [x] Si un CID falla, no detiene el resto; se reporta error y sigue
- [x] Tiempo total por ciclo dentro del presupuesto (ver 4.13)

### DoD
- [ ] Documento de flujo (diagrama textual) con pasos "fetch CIDs → probe → build → IPFS → reportPack → log"

---

## 4.2 ✅ Fuente de CIDs & Nonces

### Qué hace
Define de dónde salen los CIDs a monitorear:
- **Opción A (rápida demo):** variable de entorno `DEMO_CIDS`
- **Opción B (mejor):** leer on-chain CIDs registrados (eventos `CIDRegistered`) y mantener un set en memoria/cache

**Nonce por CID:** previo a llamar `reportPack`, el cron lee el struct `cids[cidDigest]` y calcula `nextNonce = stored.nonce + 1`

### Criterios de aceptación
- [x] Lista de CIDs consistente con el estado más reciente
- [x] `reportPack` siempre usa nonce correcto; si otro proceso se adelantó, el cron detecta revert por nonce y reintenta una vez leyendo el nuevo nonce

### DoD
- [ ] Política documentada: única fuente de verdad (preferentemente on-chain) y algoritmo para nonce seguro

---

## 4.3 ✅ Estrategia de Probes (HTTP / opcional libp2p)

### Qué hace
- Ejecuta `HEAD`/`GET` contra ≥2 gateways públicos (ipfs.io, dweb.link, cloudflare-ipfs)
- Timeout por request (p. ej., 3s)
- Latencia medida y motivo de error si falla
- **libp2p:** si el runtime lo permite, intenta 1 dial; si no, `attempted=false`

### Criterios de aceptación
- [x] Por CID se obtienen N probes en la ventana con formato estándar (Phase 3.1)
- [x] Los probes cumplen las reglas: gateway presente cuando `method=HTTP`, `latMs` entero ≥0, `err` cuando `ok=false`

### DoD
- [ ] Documento de configuración: lista de gateways, timeoutMs, mapeo de "vantage" (etiquetas como us-east, eu-west, etc.)

---

## 4.4 ✅ Manejo de Timeouts, Retries y Fallbacks

### Qué hace
- **Timeout por probe:** corta a `timeoutMs`
- **Retries:** 1 retry rápido (p. ej., 200–300 ms de backoff) sólo si la razón fue network error y no timeout
- **Fallback:** si falla un gateway, no reintenta sobre el mismo; pasa al siguiente

### Criterios de aceptación
- [x] Por cada CID, como mínimo se registra un resultado por gateway configurado (éxito o error con `err`)
- [x] No se excede el presupuesto de tiempo por CID (ver 4.13)

### DoD
- [ ] Política escrita de retries/fallbacks y matriz de causas → acción (p. ej., timeout ⇒ no retry; DNS error ⇒ 1 retry)

---

## 4.5 ✅ Agregación K/N (cálculo de status)

### Qué hace
- Calcula `okCount` y `status` según Phase 3.1
- No evalúa "consecutivos" (eso lo maneja on-chain al recibir packs BREACH seguidos)
- Respeta `threshold{k,n,timeoutMs}` provisto por el SLO del CID (si se lee on-chain) o por preset

### Criterios de aceptación
- [x] Dado un set de probes, el status es determinístico y consistente con la regla aceptada (OK/DEGRADED/BREACH)

### DoD
- [ ] Tabla de equivalencias `okCount` vs `k` → `status` anexada al doc del cron

---

## 4.6 ✅ Construcción del Pack & Firma (interface Phase 3)

### Qué hace
- Llama al builder de Phase 3 con: `cid`, `ts` (epoch segundos), `windowMin`, `threshold`, `probes[]`, `attemptedLibp2p`
- Firma con clave del watcher (server env), obtiene `watcherSig`
- Valida con el esquema antes de persistir

### Criterios de aceptación
- [x] Todo pack pasa la validación de esquema antes de subir
- [x] Si la validación falla, el cron NO sube ni ancla y deja log con causa

### DoD
- [ ] Contrato de entrada/salida (documentado) entre cron y builder; lista de errores típicos y handling

---

## 4.7 ✅ Persistencia IPFS (web3.storage) y packCID

### Qué hace
- Sube el JSON (archivo único, Content-Type: application/json)
- Obtiene packCID (CIDv1)

### Criterios de aceptación
- [x] El packCID es resolvible por al menos 2 gateways
- [x] Si la subida falla, registra error y no intenta reportPack (atómico)

### DoD
- [ ] Política de retries (máx. 2) y abort si excede presupuesto tiempo del ciclo

---

## 4.8 ✅ Anclaje on-chain: reportPack

### Qué hace
Prepara `PackRef`:
- `cidDigest = keccak(CIDv1 string)`
- `packCIDDigest = keccak(packCID)`
- `ts = now (s)`
- `status` mapeado a 0/1/2
- `nonce = stored.nonce + 1`

Llama una vez. Si revierte por nonce, re-lee y reintenta una sola vez con el nuevo nonce.

### Criterios de aceptación
- [x] Cero packs con nonce fuera de secuencia en el registro final (logs + explorer)
- [x] Eventos `EvidenceAnchored` aparecen en el explorer en cada ciclo exitoso

### DoD
- [ ] Documento: mapping `status→uint8` y reglas de nonce + política de reintentos "una vez y basta"

---

## 4.9 ✅ Concurrencia, Idempotencia y Doble-Ejecución

### Qué hace
- Protege contra ejecuciones simultáneas (p. ej., si el cron se dispara dos veces)
- **Estrategia mínima:** confiar en la protección de nonce on-chain; adicionalmente, un guard por proceso (flag en memoria) por 30s
- No intenta "re-anclar" un mismo packCID (si ya se subió pero falló la tx, genera otro pack con nuevo ts)

### Criterios de aceptación
- [x] Nunca se anclan dos packs con el mismo nonce por CID
- [x] Si hay dos ejecuciones paralelas, como máximo una llega a reportPack válida

### DoD
- [ ] Política escrita de idempotencia y cómo se evita duplicación por nonce

---

## 4.10 ✅ Errores y Reglas de Abort

### Qué hace
Define orden de abort por CID:
- **Validación de input** (CID inválido) ⇒ abort CID
- **Probes todos fallan** ⇒ sigue, el pack es BREACH
- **Build/firma falla** ⇒ abort CID (log)
- **IPFS falla** ⇒ abort CID (log)
- **reportPack revierte** por rol/permiso ⇒ marcar config error y pausar ese CID hasta que se resuelva

### Criterios de aceptación
- [x] Cada error produce un log claro con cid, paso y causa
- [x] El cron no cae completo por errores de un CID

### DoD
- [ ] Tabla "Error → Acción" documentada

---

## 4.11 ✅ Observabilidad & Logs

### Qué hace
Registra por ciclo:
- CIDs procesados, packs generados, packs anclados
- **Por CID:** status, okCount, packCID, txHash (si aplica), latencias agregadas
- **Tiempos:** generación (ms), subida (ms), anclaje (ms)
- Log estructurado (JSON lines) para fácil lectura

### Criterios de aceptación
- [x] Logs permiten reconstruir qué pasó con cada CID en cada minuto
- [x] No se loguean secretos ni payload completo (solo resumen)

### DoD
- [ ] Esquema de log definido y ejemplos en doc (sin código)

---

## 4.12 ✅ Seguridad & Roles

### Qué hace
- Usa `WATCHER_SECRET_KEY_BASE64` sólo en server
- La cuenta que firma `reportPack` debe tener `WATCHER_ROLE` en el contrato
- Limita la cantidad de CIDs por ciclo (p. ej., máx. 10 en demo) para evitar DoS propio

### Criterios de aceptación
- [x] `reportPack` no funciona desde un signer sin `WATCHER_ROLE`
- [x] No hay exposición de secretos en logs ni responses

### DoD
- [ ] Checklist de permisos (roles on-chain) y de variables de entorno

---

## 4.13 ✅ Presupuesto de tiempo & Rendimiento

### Objetivo
Garantizar que el cron cabe en 60s.

### Presupuesto recomendado
**Por CID:**
- Probes (2–3 gateways): ≤ 2.5 s total (timeout 3s c/u en paralelo)
- Build + firma: ≤ 150 ms
- IPFS upload: ≤ 2.0 s (promedio; con retry único)
- reportPack: ≤ 1.5 s (RPC normal)
- **Total por CID:** ≈ 4–6 s (paralelizando partes)

**Por ciclo:** procesar ≤ 10 CIDs con paralelismo controlado (pool de 3–4 a la vez)

### Criterios de aceptación
- [x] En condiciones normales, 10 CIDs caben en < 60s
- [x] Si se excede, el cron acota (p. ej., procesa 5 ahora y 5 en el siguiente ciclo) y lo deja logueado

### DoD
- [ ] Documento con el cálculo de presupuesto y la estrategia de paralelismo (tamaño de pool)

---

## 4.14 ✅ Healthcheck & Backpressure

### Qué hace
- `GET /api/cron/probe` devuelve estado general: processed, anchored, errors
- Si el RPC/IPFS están inestables, el cron reduce la concurrencia y lo anota (backpressure)

### Criterios de aceptación
- [x] Healthcheck refleja el estado del último ciclo
- [x] Existe una regla de degradación (reduce concurrencia cuando hay >N errores seguidos)

### DoD
- [ ] Política escrita de backpressure (umbral de errores y nueva concurrencia)

---

## 4.15 ✅ Pruebas funcionales (manuales)

### Casos
1. **Happy path:** 3 CIDs online → status OK/DEGRADED/OK según K/N; packs + EvidenceAnchored
2. **Breach:** despin de 1 CID → dos ciclos seguidos con BREACH; on-chain muestra consecutiveFails creciendo
3. **Nonce race:** dispara dos ejecuciones simultáneas → una sola ancla; la otra ve revert y no reintenta infinito
4. **Permiso:** quitar WATCHER_ROLE al signer → reportPack revierte con AccessControl; cron marca config error
5. **IPFS caído:** upload falla → no se llama reportPack; en el siguiente ciclo retoma normal

### Criterios de aceptación
- [x] Cada caso produce el comportamiento esperado sin afectar a otros CIDs
- [x] Los eventos EvidenceAnchored concuerdan con los packs generados (packCID y status)

### DoD
- [ ] Hoja de pruebas con resultados esperados y observados (marcar tiempos)

---

## 4.16 ✅ Configuración & Variables

### Necesarias
```bash
# Gateways para probes
NEXT_PUBLIC_GATEWAYS="https://ipfs.io,https://dweb.link,https://cloudflare-ipfs.com"

# CIDs para monitorear (demo rápido)
DEMO_CIDS="bafybei...,bafkrei...,bafy..."

# Autenticación IPFS y firmas
WEB3_STORAGE_TOKEN=your_token_here
WATCHER_SECRET_KEY_BASE64=base64_ed25519_private_key
WATCHER_PUBLIC_KEY_BASE64=base64_ed25519_public_key

# Blockchain conexión
NEXT_PUBLIC_LISK_RPC_URL=https://rpc.api.lisk.com
NEXT_PUBLIC_CHAIN_ID=1135
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
```

### Criterios de aceptación
- [x] Todas las envs documentadas en `.env.example` y README
- [x] El cron no arranca si faltan variables críticas (error claro)

### DoD
- [ ] Checklist de envs con "required/optional" y descripción

---

## 4.17 ✅ Riesgos & Mitigaciones

### Riesgos identificados
1. **Libp2p no disponible en serverless** → marcar `attempted=false` y apoyarse en multi-gateway HTTP (ok para demo)
2. **Altas latencias momentáneas** → timeout/DEGRADED, pero no bloquea ciclo
3. **Race por nonce** → relectura + reintento único
4. **Costos RPC/IPFS** → limitar CIDs y concurrencia
5. **Abuso/spam** → allowlist temporal de publishers; rate limit por CID/ventana

### DoD
- [ ] Tabla de riesgos con severidad, probabilidad y respuesta

---

## Definition of Done — Phase 4 (global)

### Core Implementation
- [ ] Orquestador descrito con paso a paso claro (probes → build → IPFS → reportPack)
- [ ] Política de nonces, retries, timeouts, idempotencia y errores documentada
- [ ] Presupuesto de tiempo, concurrencia y SLO internos definidos para caber en 60s

### Infrastructure & Operations
- [ ] Observabilidad (logs/healthcheck) y seguridad (roles/secretos) definidas
- [ ] Plan de pruebas manuales con casos críticos (happy path, breach, race, permisos, IPFS down)
- [ ] Checklist de envs y permisos on-chain listo para ejecutar la siguiente fase

### Integration Ready
- [ ] Cron endpoint implementado y funcional
- [ ] Probe workers implementados para múltiples gateways
- [ ] Evidence Pack Builder integrado (Phase 3)
- [ ] On-chain reporting funcional
- [ ] Error handling robusto sin afectar otros CIDs

---

## Entregables

### Documentación
1. **Flujo del Orquestador**: Diagrama textual completo del proceso
2. **Políticas Operacionales**: Nonces, retries, timeouts, idempotencia
3. **Configuración**: Variables de entorno y permisos requeridos
4. **Plan de Pruebas**: Casos de prueba manuales documentados
5. **Análisis de Riesgos**: Tabla de riesgos y mitigaciones

### Código
1. **Cron Handler**: `/api/cron/probe` endpoint mejorado
2. **Probe Workers**: Sistema de probes distribuidos
3. **CID Management**: Fuente de CIDs y manejo de nonces
4. **Error Handling**: Sistema robusto de manejo de errores
5. **Observability**: Logging estructurado y healthcheck

---

## Next Phase Integration

Este orquestador será la base para:
1. **Phase 5**: Frontend UI para visualización de Evidence Packs
2. **Phase 6**: Demo automation y breach simulation
3. **Phase 7**: Integración con contratos de slashing

El sistema de cron + probe workers representa el corazón operacional de CID Sentinel, automatizando todo el proceso de monitoreo y evidencia.

# Logic-Injection-on-Origin Protocol (LIOP) Specification
> **Specification Version:** 1.0
> **Ratified Date:** August 31, 2026 | **First Published:** March 1, 2026
> **Status:** Ratified Standard
> **Author:** Mauricio Ortega (Nekzus) & Organización Nekzus Solutions
> **License:** [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
> **Attribution Required / Atribución Requerida:** Any use, adaptation, or distribution of these architectural concepts must explicitly attribute **Mauricio Ortega (Nekzus)** and **Nekzus Solutions**, and include an official link to this project.

*(English version below / Versión en español a continuación)*

---

## English

### 1. Introduction
The Logic-Injection-on-Origin Protocol (LIOP) is a decentralized, high-performance binary transport mesh engineered for robust Machine-to-Machine (M2M) artificial intelligence communication. It complements application-level agent protocols by replacing the classical Context-Pulling architecture with the **Logic-Injection-on-Origin (LIO)** paradigm for high-stakes distributed computation.

### 2. The Logic-Injection-on-Origin (LIO) Postulate
**Postulate of Origin (Execution Core):** Data must never be pulled to intelligence. Intelligence must be pushed to the data.

An LIOP Agent interacting with an LIOP Server pushes executable logic (in the form of microscopic `.wasm` modules or dynamically transpiled algorithms). The server securely executes this logic within a strict sandbox and returns only the aggregated mathematical results or filtered lists, mathematically negating the possibility of unintentional PII (Personally Identifiable Information) exfiltration due to large-context extraction.

### 3. Topographical Architecture

#### 3.1 Network Layer (libp2p & Mesh Networking)
- LIOP operates atop a decentralized `libp2p` overlay.
- Servers (Data Nodes) bind to TCP/QUIC ports and advertise themselves as long-running daemons.
- Clients (Agent Injectors) connect ad-hoc across local networks or public WAN using Kademlia DHT routing.
- LIOP completely eliminates centralized brokering or proxy hubs.

#### 3.2 Transport & Multiplexing
- Connections use Multiplexing via Yamux, allowing hundreds of concurrent `Logic-Injection-on-Origin` injections to occur over a single opened TCP socket without Head-Of-Line Blocking.

#### 3.3 RPC Layer (Tonic / gRPC)
- Raw binary payloads are encapsulated in strict Protobuf definitions (`.proto`).
- The entire LIOP interaction relies on Protocol Buffers transmitted over HTTP/2 via Tonic, eliminating JSON-RPC serialization overhead natively.

### 4. Cryptographic Security (The Shield)

#### 4.1 Post-Quantum Key Encapsulation (ML-KEM-768)
- At initialization, connections instantiate a Post-Quantum Handshake. LIOP employs **ML-KEM-768 (Kyber)** to negotiate shared secrets securely against quantum-computing decrypt attacks ("Harvest Now, Decrypt Later" protection).
- **Session Lifecycle**: PQC session keys feature a deterministic 1-hour time-to-live with automated silent re-keying.

#### 4.2 Post-Quantum Digital Signatures (ML-DSA-65)
- Node identity and non-repudiation are sealed using **ML-DSA-65 (Dilithium)** post-quantum signatures, ensuring cryptographic authenticity across untrusted network hops.

#### 4.3 Symmetric Payload Sealing
- The agreed Post-Quantum symmetric secret acts as the cipher for `AES-256-GCM`, enveloping the entirety of the execution payload inside a zero-trust capsule.

#### 4.4 Computational Integrity (ZK-Receipts)
- The SDK generates **HMAC-SHA256 commitments** that cryptographically bind the output to the exact logic executed, sealed with the Post-Quantum session secret.
- **Dataset Integrity Anchor**: Receipts embed a SHA-256 `dataset_hash`, guaranteeing that Differential Privacy perturbations and aggregation logic are strictly anchored to immutable origin data.

### 5. Execution Core (The Sandbox)

#### 5.1 WASI Instantiation & Environment Isolation
- Injected logic is deployed into a bare-metal `Wasmtime` Virtual Machine or V8 Isolate implementing the WebAssembly System Interface (WASI).
- **Poisoned Globals**: 25 dangerous host globals (`eval`, `Function`, `process`, `require`, `WebSocket`, `fetch`, etc.) are actively poisoned with security traps.
- **Prototype Freezing**: 11 core JavaScript prototypes (`Object`, `Array`, `Function`, `String`, etc.) are deeply frozen prior to execution, mitigating Prototype Pollution (CWE-915).
- **Deterministic CPU Fuel**: Execution is constrained by AST-derived fuel limits, neutralizing infinite loops and computational denial-of-service attacks.
- **Worker Pool Warmup**: Pre-warmed Piscina thread pools eliminate V8 cold-start overhead (~820k fuel reduction).

#### 5.2 Zero-Time AST Guardian
- Before a payload enters the execution engine, LIOP evaluates its Abstract Syntax Tree (AST). It destructs payloads attempting to import forbidden modules outside of the 14-function strict WASI allowlist, supporting top-level return expressions for dynamic modules.

#### 5.3 Egress PII Defense
- The LIOP SDK injects a Tier-1 PII Shield at the Egress stage. Employs a 4-stage pipeline: exact key match → fuzzy match → regex pattern validators (Luhn algorithm for credit cards, SSN, email, phone) → Named Entity Recognition (NER).

#### 5.4 Differential Privacy Engine (NIST SP 800-226)
- Automatically injects query-aware Laplace noise into numeric egress fields when operating on small datasets ($n < 10$).
- Enforces an $\epsilon \ge 1.0$ privacy floor and defaults to OS-level CSPRNG (`crypto.randomBytes`).
- **Deterministic Differential Privacy (DDP)**: For audit reproducibility, supports SHA-256-seeded PRNG derived from `dataset_hash + image_id`, producing verifiable, repeatable ZK-Receipts.

#### 5.5 Tiered Query Sensitivity Budget (NIST SP 800-226)
- Tracks information leakage using a 3-tiered field sensitivity classification:
  - `forbidden`: 3 queries/session (PII identifiers, direct keys).
  - `sensitive`: 8 queries/session (biometric, financial, diagnosis fields).
  - `public`: 25 queries/session (general categorical and metric fields).

### 6. Zero-Shot Autonomy (Self-Healing AI)
LIOP features built-in self-instructing middleware. Should an Agent attempt a JSON-RPC interaction over MCP legacy adapters that violates the Logic-Injection-on-Origin protocol structure (e.g., attempting raw data extraction), LIOP intercepts the request, blocks it, and returns a cognitive plaintext instruction prompt enabling the Agent to autonomously rewrite its intent as injected logic.

### 7. Dual-Era MCP Compatibility & Gateway Adapter
- **MCP v2 Support**: Full compliance with the `2026-07-28` specification (`subscriptions/listen` and `resources/templates/list`) without polling overhead.
- **Legacy Fallback**: Automatic compatibility with `2025-11-25` JSON-RPC clients.
- **gRPC-Web Framing**: HTTP/1.1 framing adapter for browser and edge clients.
- **Production Telemetry**: Integrated `/healthz`, `/readyz`, and Prometheus `/metrics` endpoints.

### 8. Specification Governance
Technical amendments to this specification follow the **LIOP Enhancement Proposal (LEP)** process. All LEPs must maintain strict compliance with the 7 Design Principles defined in the [Origin Manifesto](../MANIFESTO.md).

---

## Español

### 1. Introducción
El Logic-Injection-on-Origin Protocol (LIOP) es una red de transporte binario descentralizada y de alto rendimiento, diseñada para la comunicación robusta de Inteligencia Artificial Máquina-a-Máquina (M2M). Complementa a los protocolos de agentes a nivel de aplicación reemplazando la arquitectura clásica de "Context-Pulling" por el paradigma **Logic-Injection-on-Origin (LIO)** en cómputo distribuido de alta criticidad.

### 2. El Postulado Logic-Injection-on-Origin (LIO)
**Postulado de Origen (Núcleo de Ejecución):** Los datos nunca deben ser extraídos hacia la inteligencia. La inteligencia debe ser inyectada hacia los datos.

Un Agente LIOP interactuando con un Servidor LIOP inyecta lógica ejecutable (en forma de módulos `.wasm` microscópicos o algoritmos transpilados dinámicamente). El servidor ejecuta de forma segura esta lógica dentro de un estricto sandbox y retorna únicamente resultados matemáticos agregados o listas filtradas, eliminando matemáticamente la posibilidad de exfiltración involuntaria de PII (Información de Identificación Personal) a causa de extracciones masivas de contexto.

### 3. Arquitectura Topográfica

#### 3.1 Capa de Red (libp2p & Malla Descentralizada)
- LIOP opera sobre una arquitectura superpuesta descentralizada de `libp2p`.
- Los Servidores (Nodos de Datos) escuchan en puertos TCP/QUIC y se anuncian como servicios de larga duración.
- Los Clientes (Inyectores Agentes) se conectan de forma ad-hoc en redes locales o WAN pública mediante enrutamiento DHT Kademlia.
- LIOP erradica por completo la necesidad de intermediarios o hubs centralizados.

#### 3.2 Transporte y Multiplexación
- Las conexiones utilizan multiplexación vía Yamux, permitiendo cientos de inyecciones `Logic-Injection-on-Origin` concurrentes sobre un solo socket TCP sin sufrir Bloqueos de Cabecera (Head-Of-Line Blocking).

#### 3.3 Capa RPC (Tonic / gRPC)
- Los payloads binarios se encapsulan en definiciones estrictas de Protocol Buffers (`.proto`).
- Toda la interacción LIOP se basa en Protocol Buffers transmitidos sobre HTTP/2 mediante Tonic, eliminando el sobrecoste de serialización JSON-RPC de forma nativa.

### 4. Seguridad Criptográfica (El Escudo)

#### 4.1 Encapsulamiento de Claves Post-Cuánticas (ML-KEM-768)
- En la inicialización, las conexiones ejecutan un intercambio Post-Cuántico. LIOP emplea **ML-KEM-768 (Kyber)** para negociar secretos compartidos de manera segura contra ataques de descifrado informático cuántico ("Harvest Now, Decrypt Later").
- **Ciclo de Vida de Sesión**: Las claves de sesión PQC tienen un tiempo de vida determinístico de 1 hora con renegociación silenciosa automática.

#### 4.2 Firmas Digitales Post-Cuánticas (ML-DSA-65)
- La identidad de nodo y el no repudio se sellan mediante firmas post-cuánticas **ML-DSA-65 (Dilithium)**, garantizando autenticidad criptográfica en saltos de red no confiables.

#### 4.3 Sellado Simétrico del Payload
- El secreto simétrico Post-Cuántico acordado se emplea para cifrar el payload mediante **AES-256-GCM**, envolviendo la ejecución entera dentro de una cápsula zero-trust hermética.

#### 4.4 Integridad Computacional (ZK-Receipts)
- El SDK genera **compromisos HMAC-SHA256** que vinculan criptográficamente la salida con la lógica exacta ejecutada, sellados con el secreto de sesión Post-Cuántico.
- **Ancla de Integridad del Dataset**: Los recibos incorporan un `dataset_hash` SHA-256, garantizando que las perturbaciones de Privacidad Diferencial y la agregación se apliquen estrictamente sobre datos de origen inmutables.

### 5. Núcleo de Ejecución (El Sandbox)

#### 5.1 Instanciación WASI y Aislamiento de Entorno
- La lógica inyectada se despliega en una Máquina Virtual `Wasmtime` o Isolate V8 implementando la interfaz WebAssembly System Interface (WASI).
- **Globals Envenenados**: 25 objetos globales peligrosos (`eval`, `Function`, `process`, `require`, `WebSocket`, `fetch`, etc.) son activamente neutralizados con trampas de seguridad.
- **Congelamiento de Prototipos**: 11 prototipos nativos de JavaScript (`Object`, `Array`, `Function`, `String`, etc.) son congelados profundamente antes de la ejecución, mitigando Prototype Pollution (CWE-915).
- **Combustible CPU Determinístico**: La ejecución está acotada por límites de combustible derivados del AST, neutralizando bucles infinitos y ataques de denegación de servicio.
- **Precalentamiento de Workers**: Los pools de hilos de Piscina pre-calentados eliminan el arranque en frío de V8 (reducción de ~820k de combustible).

#### 5.2 Guardián AST Cero-Tiempo
- Previo a la ejecución, LIOP analiza el Árbol de Sintaxis Abstracta (AST) del payload. Destruye módulos que pretendan importar funciones fuera de la allowlist estricta de 14 funciones WASI, soportando sentencias `return` en el nivel superior para módulos dinámicos.

#### 5.3 Defensa PII de Egreso
- El SDK de LIOP inyecta un Escudo de PII en la fase de egreso mediante un pipeline de 4 etapas: coincidencia exacta de clave → coincidencia difusa → validadores regex (Algoritmo de Luhn para tarjetas de crédito, SSN, emails, teléfonos) → Reconocimiento de Entidades Nombradas (NER).

#### 5.4 Motor de Privacidad Diferencial (NIST SP 800-226)
- Inyecta automáticamente ruido de Laplace dependiente de la consulta en campos numéricos para datasets reducidos ($n < 10$).
- Aplica un suelo de privacidad $\epsilon \ge 1.0$ y utiliza CSPRNG a nivel de sistema operativo (`crypto.randomBytes`).
- **Privacidad Diferencial Determinística (DDP)**: Para reproducibilidad en auditorías, permite PRNG sembrado con SHA-256 (`dataset_hash + image_id`), generando ZK-Receipts verificables y repetibles.

#### 5.5 Query Budget Estratificado por Sensibilidad (NIST SP 800-226)
- Rastrea la fuga de información mediante una clasificación de 3 niveles:
  - `forbidden`: 3 consultas/sesión (identificadores PII, claves directas).
  - `sensitive`: 8 consultas/sesión (campos biométricos, financieros, diagnósticos).
  - `public`: 25 consultas/sesión (métricas y categorías generales).

### 6. Autonomía Zero-Shot (Self-Healing AI)
LIOP implementa un middleware de auto-instrucción integrado. Si un Agente intenta interactuar mediante solicitudes JSON-RPC sobre adaptadores MCP tradicionales violando el paradigma Logic-Injection-on-Origin (ej. solicitar extracción de datos crudos), LIOP intercepta la petición, la bloquea y devuelve un prompt cognitivo para que el Agente auto-corrija dinámicamente su intento reescribiéndolo como lógica inyectada.

### 7. Compatibilidad de Era Dual con MCP y Adaptador Gateway
- **Soporte MCP v2**: Cumplimiento completo con la especificación `2026-07-28` (`subscriptions/listen` y `resources/templates/list`) sin sobrecoste de sondeo.
- **Fallback Legacy**: Compatibilidad transparente con clientes JSON-RPC `2025-11-25`.
- **Framing gRPC-Web**: Adaptador de tramas HTTP/1.1 para navegadores y entornos edge.
- **Telemetría de Producción**: Endpoints integrados `/healthz`, `/readyz` y métricas Prometheus `/metrics`.

### 8. Gobernanza de la Especificación
Las enmiendas técnicas a esta especificación se rigen mediante el proceso de **Propuestas de Mejora de LIOP (LEP)**. Toda LEP debe mantener estricta conformidad con los 7 Principios de Diseño definidos en el [Manifiesto de Origen](../MANIFESTO.md).

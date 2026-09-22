# Protocolo Logic-Injection-on-Origin (LIOP) — Especificación Técnica

> **Estado:** Estándar Ratificado  
> **Versión:** 1.0.0  
> **Fecha de Ratificación:** 31 de agosto de 2026 | **Primera Publicación:** 1 de marzo de 2026  
> **Autores:** Mauricio Ortega (Nekzus) y Equipo de Arquitectura de Nekzus Solutions  
> **Licencia:** [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)  
> **Lenguaje Normativo:** RFC 2119 (`DEBE`, `NO DEBE`, `REQUERIDO`, `DEBERÁ`, `NO DEBERÁ`, `DEBERÍA`, `NO DEBERÍA`, `RECOMENDADO`, `PUEDE`, `OPCIONAL`)  
> **Aviso de Atribución:** Cualquier reproducción, adaptación o uso derivado de esta especificación de protocolo debe citar explícitamente a **Mauricio Ortega (Nekzus)** y **Nekzus Solutions**, e incluir un enlace de referencia oficial a este repositorio.  
> **Versión en Inglés:** Consulte [SPECIFICATION.md](./SPECIFICATION.md) para el texto normativo en inglés.

---

## 📚 Documentación Oficial

Las guías interactivas, arquitecturas de referencia y entornos de pruebas residen en el portal oficial de Mintlify:

| Sección de Documentación | Alcance | Guía Canónica |
|---|---|---|
| **Visión General del Protocolo** | Postulados base, modelo de amenazas y fundamentos Zero-Trust | [Conceptos del Protocolo](https://nekzus-32.mintlify.app/es/concepts/specification) |
| **SDK de TypeScript** | Implementación de referencia, pasarela MCP e interfaces de ejecución | [Referencia TypeScript](https://nekzus-32.mintlify.app/es/typescript-sdk/overview) |
| **Nodo Mesh en Rust** | Host Wasmtime WASI v29, medición de combustible y servidor gRPC | [Visión General de Mesh Node](https://nekzus-32.mintlify.app/es/mesh-node/overview) |
| **Operaciones Soberanas** | Topología Docker tricapa, clave Swarm PSK y malla mTLS | [Manual de Operaciones](https://nekzus-32.mintlify.app/es/operations/sovereign-deployment) |

---

## 1. Resumen y Planteamiento del Problema

Las arquitecturas de agentes de inteligencia artificial contemporáneas dependen predominantemente de la **Extracción de Contexto** (*Context-Pulling*): los agentes remotos emiten consultas masivas a los almacenes de datos, extraen megabytes o gigabytes de registros crudos a través de redes de área amplia (WAN) e inyectan dichos registros en la ventana de contexto del Modelo de Lenguaje (LLM).

Este paradigma introduce tres fallas sistémicas críticas:
1. **Pérdida de Soberanía**: La Información de Identificación Personal (PII), los historiales clínicos confidenciales (HIPAA) o los libros contables financieros (PCI-DSS) abandonan los enclaves corporativos seguros para ingresar en tuberías de inferencia de terceros.
2. **Saturación de la Ventana de Contexto**: El ancho de banda, la serialización y el consumo de tokens de entrada crecen de forma lineal ($O(N)$) respecto al volumen de la base de datos, lo que ocasiona latencias severas y costos de tokens prohibitivos.
3. **Ausencia de Integridad**: El agente carece de garantías criptográficas de que los datos recibidos mediante repetidores intermedios no sufrieron alteraciones, truncamientos o ataques de repetición.

El **Protocolo Logic-Injection-on-Origin (LIOP)** invierte este paradigma mediante la **Inyección de Lógica en Origen** (*Logic-Injection-on-Origin*, LIO):

$$\text{Inteligencia} \xrightarrow{\text{Inyectar Micro-Módulo}} \text{Origen del Dato} \xrightarrow{\text{Ejecutar In-Situ}} \text{Agregación Sanitizada} + \text{Recibo ZK}$$

Los datos permanecen inmóviles dentro de su enclave soberano. El cliente transmite un micro-módulo analítico autónomo y firmado criptográficamente. El nodo de origen compila, inspecciona, aísla y ejecuta dicho módulo de manera directa contra el almacenamiento físico, y devuelve únicamente la agregación matemática compacta junto con un Recibo Computacional de Conocimiento Cero (*ZK-Receipt*) infalsificable.

---

## 2. Terminología y Convenciones Normativas

Los términos clave "DEBE", "NO DEBE", "REQUERIDO", "DEBERÁ", "NO DEBERÁ", "DEBERÍA", "NO DEBERÍA", "RECOMENDADO", "PUEDE" y "OPCIONAL" en este documento se interpretan conforme a las directivas de [RFC 2119](https://datatracker.ietf.org/doc/html/rfc2119).

- **Nodo de Datos (Enclave de Origen)**: Demonio servidor que custodia conjuntos de datos crudos, aísla ejecuciones invitadas dentro de un sandbox WebAssembly (WASI) o V8 y aplica el escudo de defensa de 6 capas.
- **Inyector Agente (Cliente)**: Entorno de ejecución de agentes o pasarela que elabora sobres de lógica, negocia claves de sesión post-cuánticas, envía solicitudes de ejecución y verifica pruebas computacionales.
- **Sobre de Lógica (Logic Envelope)**: Contenedor de transporte estandarizado (`@LIOP{...}...@END`) que encapsula metadatos de ejecución, instrucciones AST y aserciones criptográficas.
- **Combustible de Instrucción AST (Fuel)**: Métrica computacional determinística calculada a partir de los nodos del Árbol de Sintaxis Abstracta, cuantizada en bloques de 100 unidades para neutralizar canales laterales de temporización conforme a NIST SP 800-53.
- **Recibo ZK (ZK-Receipt)**: Constancia criptográfica compuesta por el resumen SHA-256 de la lógica (`image_id`), el compromiso del dataset de origen (`dataset_hash`), el hash del resultado (`output_hash`) y una firma HMAC-SHA256 sellada con el secreto de sesión post-cuántico efímero.

---

## 3. Arquitectura del Protocolo y Secuencia de Interacción

```
  Agente IA / Cliente              Pasarela Perimetral (BLG)           Enclave de Origen Soberano
┌──────────────────┐               ┌──────────────────┐             ┌────────────────────────┐
│  LiopClient /    │               │  mTLS / OAuth    │             │  Runtime WASI          │
│  Claude Desktop  │               │  Rate Limiter    │             │  Isolate V8 / Wasmtime │
└────────┬─────────┘               └────────┬─────────┘             └───────────┬────────────┘
         │                                  │                                   │
         │ 1. Descubrir Capacidades         │                                   │
         │─────────────────────────────────>│                                   │
         │    GET /oidc/metadata            │                                   │
         │<─────────────────────────────────│                                   │
         │                                  │                                   │
         │ 2. Negociar Clave Post-Cuántica  │                                   │
         │    Encapsulamiento ML-KEM-768    │                                   │
         │─────────────────────────────────>│                                   │
         │    Secreto Compartido (K_sess)   │                                   │
         │<─────────────────────────────────│                                   │
         │                                  │                                   │
         │ 3. Enviar Sobre de Lógica        │                                   │
         │    @LIOP{...} Código @END        │                                   │
         │─────────────────────────────────>│ 4. Reenviar por Malla PSK Swarm  │
         │                                  │──────────────────────────────────>│
         │                                  │                                   │ 5. Escaneo Guardian AST
         │                                  │                                   │ 6. Ejecución en Sandbox
         │                                  │                                   │ 7. Análisis de Mancha IFC
         │                                  │                                   │ 8. Escudo PII de Egreso
         │                                  │                                   │ 9. Sellar Recibo ZK
         │                                  │ 10. Devolver Resultado Cifrado    │
         │                                  │<──────────────────────────────────│
         │ 11. Retornar Agregación Verificada                                  │
         │<─────────────────────────────────│                                   │
         │                                  │                                   │
         │ 12. Cliente Verifica Recibo ZK   │                                   │
         │     assert(HMAC == Sello)        │                                   │
```

---

## 4. Especificación del Sobre de Lógica (Envelope)

Los clientes que inyectan lógica analítica DEBEN encapsular su carga útil dentro de la sintaxis normativa de LIOP:

```
@LIOP{"version":"1.0","runtime":"wasi-js","fuel_limit":500000,"timeout_ms":5000}
// El código analítico invitado inicia aquí
const records = env.records;
let total = 0;
for (let i = 0; i < records.length; i++) {
  total += records[i].amount;
}
return { count: records.length, sum: total, mean: total / records.length };
@END
```

### 4.1 Reglas de Análisis y Gramática del Sobre

1. **Delimitadores de Frontera**:
   - La cabecera de apertura DEBE comenzar con `@LIOP{`.
   - El delimitador de cierre de cabecera DEBE ser `}` seguido inmediatamente por saltos de línea.
   - El pie de cierre del sobre DEBE ser `@END` en su propia línea.
2. **Expresiones Regulares Multiplataforma**:
   - Los analizadores DEBEN procesar tanto saltos de línea POSIX (`\n`) como secuencias de Windows (`\r\n`).
   - La expresión regular canónica DEBE coincidir con:
     ```javascript
     /@LIOP(\{[^}]+\})[\r\n]+([\s\S]*?)[\r\n]+@END/
     ```
3. **Esquema de Metadatos JSON**:
   - `version` (cadena, REQUERIDO): Versión del sobre de protocolo (ej. `"1.0"`).
   - `runtime` (cadena, REQUERIDO): Entorno de destino de la ejecución (`"wasi-js"` o `"wasi-wasm32"`).
   - `fuel_limit` (entero, OPCIONAL): Límite máximo de combustible virtual de CPU (predeterminado: `1,000,000`).
   - `timeout_ms` (entero, OPCIONAL): Tiempo límite estricto de ejecución en milisegundos (predeterminado: `5,000`).
4. **Sentencias Return en Nivel Superior de AST**:
   - Los módulos invitados de JavaScript se ejecutan como bloques de evaluación autónomos. Todos los analizadores sintácticos de ECMAScript (como Acorn) DEBEN configurar `{ allowReturnOutsideFunction: true }`. Omitir esta directiva provoca el rechazo inmediato del código durante el análisis sintáctico.

---

## 5. Capa de Transporte y Administración de Canales

LIOP admite dos modalidades de transporte:
1. **Transporte Nativo de Malla (gRPC / HTTP/2)**: Serialización binaria de Protocol Buffers sobre HTTP/2 con transmisión bidireccional, mTLS y señales de mantenimiento activas (*keepalives*).
2. **Pasarela de Flujo HTTP**: Autenticación con tokens Bearer conforme a RFC 9728 sobre TLS 1.3, con reenvío hacia enclaves soberanos mediante Pasarelas L7 de Frontera (*Border LIO Gateways*, `blg`).

### 5.1 Definiciones de Protocol Buffers (`liop_core.v1`)

```protobuf
syntax = "proto3";
package liop_core.v1;

service LogicMeshService {
  rpc NegotiateIntent (IntentRequest) returns (IntentResponse);
  rpc ExecuteLogic (LogicRequest) returns (LogicResponse);
  rpc StreamTelemetry (TelemetryRequest) returns (stream TelemetryChunk);
}

message IntentRequest {
  string agent_did = 1;
  bytes client_kem_public_key = 2; // Clave Pública ML-KEM-768 (1184 bytes)
  int64 timestamp = 3;
}

message IntentResponse {
  bytes server_kem_ciphertext = 1; // Texto Cifrado ML-KEM-768 (1088 bytes)
  bytes server_signature = 2;      // Firma ML-DSA-65 (3309 bytes)
  string session_token = 3;
  int64 expires_at = 4;
}

message LogicRequest {
  string session_token = 1;
  bytes encrypted_payload = 2;     // Cifrado AES-256-GCM
  bytes nonce = 3;                 // Vector de inicialización único de 96 bits
  bytes tag = 4;                   // Etiqueta de autenticación de 128 bits
}

message LogicResponse {
  bytes encrypted_result = 1;      // Cifrado AES-256-GCM
  bytes nonce = 2;
  bytes tag = 3;
  ZkReceipt receipt = 4;
}

message ZkReceipt {
  string image_id = 1;             // Resumen SHA-256 de la lógica ejecutada
  string dataset_hash = 2;         // Ancla SHA-256 del almacenamiento de origen
  string output_hash = 3;          // Resumen SHA-256 de la salida sanitizada
  bytes seal = 4;                  // Sello criptográfico HMAC-SHA256
}
```

### 5.2 Invariantes Simétricas del Canal gRPC

Para superar cortafuegos corporativos con inspección de estado y tiempos de espera de NAT, tanto `LiopRpcClient` como `LiopRpcServer` DEBEN configurar opciones simétricas de canal:

```typescript
export const GRPC_CHANNEL_OPTIONS = {
  "grpc.keepalive_time_ms": 30000,
  "grpc.keepalive_timeout_ms": 10000,
  "grpc.keepalive_permit_without_calls": 1,
  "grpc.http2.max_pings_without_data": 0,
  "grpc.http2.min_time_between_pings_ms": 10000,
  "grpc.http2.min_ping_interval_without_data_ms": 5000,
};
```

---

## 6. Arquitectura de Seguridad Criptográfica (The Shield)

Los Nodos de Datos DEBEN aplicar seis capas defensivas discretas e inviolables:

```
┌────────────────────────────────────────────────────────────────────────┐
│ Capa 1: Análisis Estático Previo Guardian AST                          │
│ - Inspección contra allowlist estricta de 14 funciones WASI            │
│ - Bloqueo de eval, Function, process, require, import(), fetch, proto  │
├────────────────────────────────────────────────────────────────────────┤
│ Capa 2: Sandbox WASI y Runtime Aislado                                 │
│ - Isolate V8 / VM Wasmtime con 25 globales envenenados                 │
│ - Congelamiento profundo de 11 prototipos de ECMAScript                │
│ - Límites de combustible de CPU con trampas OutOfFuel                  │
├────────────────────────────────────────────────────────────────────────┤
│ Capa 3: Control Estático de Flujo de Información (Analizador IFC)      │
│ - Recorrido de 5 pasadas sobre AST Acorn rastreando alias de variables │
│ - Bloqueo de derivación por canal lateral: charCodeAt, inferencia      │
├────────────────────────────────────────────────────────────────────────┤
│ Capa 4: Escudo de Defensa PII de Egreso                                │
│ - Canal de 4 etapas: clave exacta → clave difusa → regex → NER         │
│ - Sanitización numérica recursiva en memoria (redondeo a 4 decimales)  │
├────────────────────────────────────────────────────────────────────────┤
│ Capa 5: Política de Agregación Primero y K-Anonimato                   │
│ - Rechazo de extracción de filas crudas; salida escalar obligatoria    │
│ - En datasets con n < 10: impone K-anonimato (máximo 3 claves escalares│
│ - Privacidad Diferencial de Laplace según NIST SP 800-226 (eps >= 1.0) │
├────────────────────────────────────────────────────────────────────────┤
│ Capa 6: Recibo Computacional de Conocimiento Cero (ZK-Receipt)         │
│ - Sella output_hash + image_id + dataset_hash con clave de sesión      │
│ - Autentica el cómputo sin exponer los registros subyacentes           │
└────────────────────────────────────────────────────────────────────────┘
```

### 6.1 Capa 1: Allowlist de Guardian AST

Antes de compilar la lógica invitada, el host examina el AST frente a una lista blanca de 14 funciones seguras de WASI Preview 1:
- `fd_read`, `fd_write`, `fd_close`, `fd_seek`, `fd_fdstat_get`, `fd_fdstat_set_flags`, `fd_prestat_get`, `fd_prestat_dir_name`, `environ_sizes_get`, `environ_get`, `clock_time_get`, `proc_exit`, `random_get`, `sched_yield`.

Cualquier módulo que intente invocar `proc_spawn`, `sock_open`, `path_create_directory` o funciones de evaluación dinámica (`eval`) DEBE ser rechazado de inmediato con `ErrorCode.SECURITY_VIOLATION`.

### 6.2 Capa 2: Sandbox WASI y Congelamiento de Prototipos

1. **Globales Envenenados**: El host inyecta trampas proxy en 25 identificadores globales peligrosos: `eval`, `Function`, `process`, `require`, `WebSocket`, `fetch`, `XMLHttpRequest`, `Buffer`, `ArrayBuffer`, `SharedArrayBuffer`, `DataView`, `Int8Array`, `Uint8Array`, `Uint8ClampedArray`, `Int16Array`, `Uint16Array`, `Int32Array`, `Uint32Array`, `Float32Array`, `Float64Array`, `BigInt64Array`, `BigUint64Array`, `Date`, `setTimeout`, `setInterval`.
2. **Congelamiento de Prototipos**: Antes de la ejecución, el host congela 11 prototipos centrales mediante `Object.freeze`: `Object.prototype`, `Function.prototype`, `Array.prototype`, `String.prototype`, `Number.prototype`, `Boolean.prototype`, `RegExp.prototype`, `Error.prototype`, `Promise.prototype`, `Map.prototype`, `Set.prototype`.
3. **Medición Determinística de Combustible**: Cada instrucción de AST consume unidades de combustible. El consumo total se cuantiza en bloques de 100 unidades ($F_{\text{reportado}} = \lceil F_{\text{bruto}} / 100 \rceil \times 100$), lo que elimina variaciones temporales aprovechables en ataques de canal lateral.

### 6.3 Capa 3: Analizador de Mancha (IFC)

El analizador efectúa 5 pasadas sobre el AST invitado para detectar violaciones al flujo de información:
- **Resolución de Alias**: Rastrea variables derivadas a partir de `env.records`.
- **Protección de Métodos**: Detecta exfiltración de caracteres por inspección (`charCodeAt`, `charAt`, `codePointAt`).
- **Protección contra Inferencia**: Bloquea bucles de búsqueda binaria o ramificaciones condicionales condicionadas directamente sobre valores crudos no sanitizados.

### 6.4 Capa 4: Escudo PII de Egreso

Toda respuesta devuelta atraviesa un filtro de 4 etapas:
1. **Coincidencia de Claves**: Búsqueda exacta frente a `forbiddenKeys` (`id`, `ssn`, `password`, `email`, `name`).
2. **Distancia Difusa**: Comprobación Levenshtein ($D \le 2$) para identificar variantes ofuscadas (ej. `user_mail`, `p_word`).
3. **Validadores Regex y Algorítmicos**:
   - Tarjetas de Crédito: Expresión regular verificada mediante el Algoritmo de Luhn (Módulo 10).
   - Cuentas Bancarias: Verificación según ISO 7064 Módulo 97-10 para códigos IBAN.
   - Identificadores: SSN estadounidense (bloqueando área `000` o grupo `00`), teléfonos internacionales y correos RFC 5322.
4. **Reconocimiento de Entidades Nombradas (NER)**: Extracción lingüística basada en compromiso que detecta nombres humanos no formateados dentro de cadenas de texto.

### 6.5 Capa 5: Agregación Primero y Privacidad Diferencial

1. **Barrera de Extracción de Filas**: Se rechazan cargas útiles que retornen arreglos de objetos semejantes a registros crudos de base de datos. La salida DEBE constituir un objeto escalar agregado (ej. recuentos, sumatorias, percentiles).
2. **K-Anonimato en Datasets Reducidos**: Cuando el dataset de origen contiene $n < 10$ registros, el objeto de respuesta DEBE contener un máximo de 3 claves escalares y NO DEBE incorporar arreglos u objetos anidados.
3. **Privacidad Diferencial (Mecanismo de Laplace)**:
   Al activarse, las magnitudes numéricas $x$ reciben perturbación mediante ruido de Laplace $Y \sim \text{Laplace}(0, \Delta f / \epsilon)$:

   $$x_{\text{privado}} = x + \text{Laplace}\left(0, \frac{\Delta f}{\epsilon}\right), \quad \text{donde } \epsilon \ge 1.0$$

### 6.6 Capa 6: Recibo Computacional de Conocimiento Cero

El nodo genera un compromiso criptográfico que demuestra que la salida $O$ proviene de la lógica $L$ aplicada sobre el conjunto de datos $D$:

$$\text{ImageID} = \text{SHA256}(L)$$
$$\text{DatasetHash} = \text{SHA256}(D)$$
$$\text{OutputHash} = \text{SHA256}(O)$$
$$\text{Sello} = \text{HMAC-SHA256}\left(K_{\text{sesion}}, \text{ImageID} \parallel \text{DatasetHash} \parallel \text{OutputHash}\right)$$

Al recibir el paquete, el cliente calcula $\text{OutputHash} = \text{SHA256}(O)$ y valida que $\text{Sello}$ coincida exactamente con la firma esperada utilizando el secreto de sesión post-cuántico $K_{\text{sesion}}$.

---

## 7. Topología Canónica y Matriz de Puertos

| Servicio / Nodo | Puerto | Protocolo | Propósito | Perímetro de Red |
|---|---|---|---|---|
| **Nexus Descubrimiento y OIDC** | `15000` | HTTP / SSE | Descubrimiento, metadatos RFC 9728, tokens Bearer OIDC, métricas `/metrics` | Perímetro Público (DMZ) |
| **Nexus Malla P2P** | `15001` | TCP / Noise | Bootstrap de DHT Kademlia en libp2p (`/ipfs/kad/1.0.0`) | Malla entre Nodos |
| **Pasarela LIO de Frontera (BLG)** | `15018` | HTTP / Streamable | Pasarela L7 perimetral, puente mTLS, GatewayInterceptor | Ingreso Público / DMZ |
| **Enclave Banco (Tier 1)** | `15021` | gRPC / HTTP/2 | Analítica financiera, sandbox PCI-DSS, recibos ZK | Enclave Privado Aislado |
| **Enclave Vault (Tier 1)** | `15022` | gRPC / HTTP/2 | Analítica clínica médica, sandbox HIPAA, motor DP Laplace | Enclave Privado Aislado |
| **Consorcio Oracle (Tier 2)**| `15011` | gRPC / HTTP/2 | Libros de órdenes HFT, fuentes sintéticas de mercado | Red de Consorcio |
| **Nodo Remoto Edge (Tier 2)**| `15012` | gRPC / HTTP/2 | Telemetría IoT industrial, sensores de vibración y presión | Enclave en el Borde |
| **Circuit Relay v2** | `15007` | TCP / Noise | Atravesamiento de NAT y retransmisión de paquetes libp2p | Troncal de la Malla |
| **Consola Web LIOP Studio** | `16000` | HTTP / React 19 | Estudio de desarrollo, entorno de pruebas, escáner de red | Estación de Trabajo |
| **Telemetría Prometheus** | `15090` | HTTP | Recolección de series temporales (raspado de `/metrics`) | Subred de Observabilidad |
| **Consola Maestra Grafana** | `15091` | HTTP | Tablero de producción de 26 paneles, ratio de soberanía | Subred de Operaciones |

---

## 8. Compatibilidad de Era Dual con MCP

Las pasarelas de LIOP (`LiopMcpBridge`) aseguran interoperabilidad hacia atrás y hacia adelante con diversas generaciones de modelos:

1. **MCP v2 (Era 2026-07-28)**:
   - Soporte completo de primitivas `subscriptions/listen` y `resources/templates/list`.
   - Entrega de eventos en flujo continuo sin sobrecoste de sondeo periódico.
2. **MCP v1 (Era 2025-11-25)**:
   - Traducción transparente de mensajes (`adaptResponseForLegacyClient`).
   - Remueve estructuras de sobres modernas antes de enviar tramas JSON-RPC 2.0 a clientes legacy como Claude Desktop.
3. **Degradación Cognitiva Asistida**:
   Si un agente emite una solicitud tradicional intentando extraer registros crudos, el servidor devuelve un prompt explicativo que detalla el Diccionario de Datos y enseña al modelo a formular un sobre inyectado `@LIOP`.

---

## 9. Consideraciones de Seguridad y Modelo de Amenazas

1. **Denegación de Servicio por Agotamiento de CPU**: Queda neutralizada mediante límites estrictos de combustible virtual a nivel de instrucción. Superar la cuota detona una trampa irreversible del host.
2. **Contaminación de Prototipos (CWE-915)**: Queda prevenida mediante la congelación recursiva de prototipos nativos (`Object.freeze`) antes de ejecutar el código invitado.
3. **Extracción por Canales Laterales**: Queda neutralizada mediante la cuantización de combustible en bloques de 100 unidades, el envenenamiento de `Date` y el análisis de mancha que impide exfiltraciones iterativas byte a byte.
4. **Intercepción y Repetición (MITM)**: Queda mitigada por el cifrado de sesión ML-KEM-768 y la validación obligatoria de `output_hash` en el Recibo ZK.

---

## 10. Gobernanza y Enmiendas

Toda enmienda técnica a esta especificación requiere la presentación de una **Propuesta de Mejora de LIOP (LEP)**. Las propuestas DEBEN respetar los 7 Principios Innegociables definidos en el [Manifiesto de LIOP](../MANIFESTO_ES.md).

---

## 11. Referencias Normativas

- [RFC 2119: Key words for use in RFCs to Indicate Requirement Levels](https://datatracker.ietf.org/doc/html/rfc2119)
- [RFC 9728: Protected Resource Metadata](https://datatracker.ietf.org/doc/html/rfc9728)
- [NIST FIPS 203: Module-Lattice-Based Key-Encapsulation Mechanism (ML-KEM)](https://csrc.nist.gov/pubs/fips/203/final)
- [NIST FIPS 204: Module-Lattice-Based Digital Signature Algorithm (ML-DSA)](https://csrc.nist.gov/pubs/fips/204/final)
- [NIST SP 800-226: Guidelines for Evaluating Differential Privacy Guarantees](https://csrc.nist.gov/pubs/sp/800/226/final)
- [WASI: WebAssembly System Interface Preview 1](https://wasi.dev/)

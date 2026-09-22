<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/logo/dark.svg">
    <img alt="Logo del Logic-Injection-on-Origin Protocol" src="docs/logo/light.svg" width="600">
  </picture>

  <h1>Logic-Injection-on-Origin Protocol (LIOP)</h1>
  <p><strong>Malla de transporte binario descentralizada para la ejecución in-situ de agentes de IA y la soberanía de datos Zero-Trust.</strong></p>

  <p align="center">
    <a href="https://github.com/Nekzus/LIOP/actions/workflows/ci.yml"><img src="https://github.com/Nekzus/LIOP/actions/workflows/ci.yml/badge.svg?event=push" alt="Estado del CI"></a>
    <a href="https://www.npmjs.com/package/@nekzus/liop"><img src="https://img.shields.io/npm/v/@nekzus/liop.svg" alt="Versión de NPM"></a>
    <a href="https://github.com/Nekzus/LIOP/blob/main/LICENSE"><img src="https://img.shields.io/badge/Licencia-Apache_2.0-blue.svg" alt="Licencia"></a>
    <a href="https://nekzus-32.mintlify.app/es/"><img src="https://img.shields.io/badge/Docs-Mintlify-0D9373.svg" alt="Documentación Oficial"></a>
    <a href="https://deepwiki.com/Nekzus/LIOP"><img src="https://deepwiki.com/badge.svg" alt="Consultar DeepWiki"></a>
    <a href="./README.md"><img src="https://img.shields.io/badge/Language-English-informational.svg" alt="English Version"></a>
  </p>
</div>

---

## 📚 Documentación Oficial

Para acceder a guías interactivas, recetas de producción y especificaciones completas de APIs, consulte nuestro portal oficial de documentación:

| Sección | Descripción | Enlace Canónico |
|---|---|---|
| **Primeros Pasos** | Introducción rápida, arquitectura conceptual y modelo de llamada a tres vías | [Ver Guía de Inicio](https://nekzus-32.mintlify.app/es/getting-started/quickstart) |
| **SDK de TypeScript** | Referencia técnica de `LiopClient`, `LiopServer` y `LiopMcpBridge` | [Explorar SDK TypeScript](https://nekzus-32.mintlify.app/es/typescript-sdk/overview) |
| **Cookbook y Recetas** | Guías prácticas para migración de MCP, análisis de logs, HIPAA y auditorías ZK | [Consultar Cookbook](https://nekzus-32.mintlify.app/es/cookbook/mcp-migration) |
| **Operaciones y SRE** | Despliegue soberano con Docker, métricas de Prometheus y cumplimiento SOC 2 | [Revisar Operaciones](https://nekzus-32.mintlify.app/es/operations/sovereign-deployment) |
| **Backend en Rust** | Motor de ejecución Wasmtime y nodo P2P nativo con `rust-libp2p` | [Inspeccionar Core en Rust](https://nekzus-32.mintlify.app/es/mesh-node/overview) |

---

## El Paradigma: Lógica Inyectada en el Origen (LIO)

Las arquitecturas habituales del Model Context Protocol (MCP) operan bajo el principio de **Extracción de Contexto (Context-Pulling)**: para analizar información, el cliente debe descargar registros crudos por la red mediante JSON-RPC hacia la ventana de contexto del LLM. Este modelo congestiona el ancho de banda, agota los límites de tokens y expone datos personales sensibles (PII).

**LIOP invierte esta arquitectura**: en lugar de trasladar los datos hacia la inteligencia artificial, la inteligencia despacha un micro-módulo de cómputo aislado (WebAssembly o JavaScript verificado por AST) directamente hacia el servidor donde residen los datos.

```
Arquitectura Tradicional MCP (Extracción de Contexto):
┌────────────┐   JSON-RPC (tools/call)   ┌──────────────────┐
│ Cliente IA │ ────────────────────────► │   Servidor MCP   │
│  (Claude)  │ ◄──────────────────────── │ (Devuelve 50MB   │
└────────────┘    50 MB por la red       │  de datos crudos)│
                                         └──────────────────┘

Arquitectura Soberana de LIOP (Logic-on-Origin):
┌────────────┐   gRPC + Kyber768 (PQC)   ┌────────────────────────────────┐
│ Cliente IA │ ────────────────────────► │      Nodo de Datos LIOP        │
│  (Claude)  │ ◄──────────────────────── │  ┌────────────┐ ┌────────────┐ │
└────────────┘    Recibo ZK (300 bytes)  │  │ GuardianAST│ │ Escudo PII │ │
                                         │  └────────────┘ └────────────┘ │
                                         │  [Ejecución WASI In-Situ]      │
                                         └────────────────────────────────┘
```

### Comparativa: Extracción de Contexto vs. Lógica en el Origen

Mediciones empíricas obtenidas al evaluar 520 MB de registros de acceso de servidor (350.000 líneas en formato JSON):

| Dimensión | Extracción de Contexto (MCP) | Lógica en el Origen (LIOP) | Diferencial de Eficiencia |
|---|---|---|---|
| **Tráfico WAN Emitido** | `520.140.820 bytes` (520 MB) | `412 bytes` | **1.262.477x menor salida de red** |
| **Consumo de Tokens (`o200k_base`)** | `38.400 tokens` (truncado) | `168 tokens` | **99.56% de ahorro en tokens** |
| **Tiempo de Respuesta Total** | `42.4s` (serialización y red) | `1.82s` (flujo local) | **23.2x mayor rapidez analítica** |
| **Prueba Criptográfica** | Ninguna (Datos sin firmar) | Recibo ZK (Sello HMAC-SHA256) | **Integridad Matemática Verificada** |
| **Riesgo de Fuga de PII** | Alto (IPs enviadas al LLM) | Nulo (IPs descartadas in-situ) | **Soberanía Absoluta Garantizada** |

---

## Arquitectura del Monorepo

Este monorepo poliglot está organizado en espacios de trabajo modulares administrados con **pnpm** y **Cargo**:

```
LIOP-Protocol/
├── docs/                    # Portal de documentación bilingüe (EN/ES) en Mintlify
├── sdks/
│   ├── typescript/          # @nekzus/liop — SDK oficial de TypeScript y Puente MCP
│   └── rust/                # Crates nativos en Rust liop-core y liop-client
├── servers/
│   └── liop-node/           # Nodo de Datos de alto rendimiento (Wasmtime + Tonic gRPC + libp2p)
├── tools/
│   ├── liop-studio/         # @nekzus/liop-studio — Interfaz Web (:16000) y escáner de red CLI
│   └── liop-cli/            # Utilidad CLI en Rust para diagnóstico de nodos
├── protocol/
│   ├── proto/               # Definiciones de servicio Protobuf v3 (liop_core.proto)
│   ├── SPECIFICATION.md     # Especificación técnica formal RFC (Inglés)
│   └── SPECIFICATION_ES.md  # Especificación técnica formal (Español)
└── examples/
    ├── observability/       # Pila de observabilidad (Prometheus + panel maestro de Grafana)
    └── demos/               # Entornos de prueba didácticos y auditorías de producción
```

---

## Paquetes Principales y Componentes del Ecosistema

| Componente | Entorno de Destino | Paquete / Crate | Propósito |
|---|---|---|---|
| **SDK de TypeScript** | Node.js 20+ LTS | [`@nekzus/liop`](https://www.npmjs.com/package/@nekzus/liop) | SDK principal: `LiopClient`, `LiopServer` y `LiopMcpBridge` para migración directa de MCP. |
| **LIOP Studio** | Node.js / Navegador | [`@nekzus/liop-studio`](https://www.npmjs.com/package/@nekzus/liop-studio) | Banco de pruebas interactivo Web (`:16000`) y escáner de red sin interfaz (`scan <url>`). |
| **Nodo de Datos en Rust** | Nativo / WASI | `servers/liop-node` | Enclave soberano con control de instrucciones en Wasmtime, Tonic gRPC y Kademlia DHT. |
| **SDK de Rust** | Rust Nativo | `sdks/rust/` | Abstracciones de coste cero para agentes nativos con cifrado post-cuántico ML-KEM-768. |
| **Pila de Observabilidad** | Docker | `examples/observability` | Recopilación de Prometheus y panel maestro de Grafana de 26 componentes. |

---

## Guía Rápida de Uso

### 1. Instalación del SDK de TypeScript

```bash
pnpm add @nekzus/liop
```

### 2. Envolver un Servidor MCP Existente con Aislamiento Zero-Trust

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { LiopMcpBridge, PII_PRESETS } from "@nekzus/liop/bridge";
import { z } from "zod";

const mcpServer = new McpServer({ name: "SupportEnclave", version: "1.0.0" });

mcpServer.tool("get_customer_orders", { customerId: z.string() }, async ({ customerId }) => {
  const orders = await fetchCustomerOrders(customerId);
  return { content: [{ type: "text", text: JSON.stringify(orders) }] };
});

// Envolver con filtros de seguridad y publicar en la malla P2P
const bridge = new LiopMcpBridge(mcpServer, {
  publishToMesh: true,
  security: {
    forbiddenKeys: ["internal_token", "credit_card_cvv"],
    piiPatterns: PII_PRESETS.US_COMPLIANT,
    enableNerScanning: true,
  },
});

await bridge.connect();
```

### 3. Iniciar el Estudio Interactivo y el Escáner de Red

```bash
# Iniciar la interfaz Web en http://localhost:16000
npx @nekzus/liop-studio

# O escanear un endpoint activo desde la terminal
npx @nekzus/liop-studio scan http://localhost:15018/mcp
```

### 4. Compilar y Ejecutar el Nodo de Red en Rust

```bash
# Agregar el target de compilación WASI
rustup target add wasm32-wasip1

# Compilar y probar el espacio de trabajo de Rust
cargo build --workspace --release
cargo test --workspace
```

---

## Defensa en Profundidad (The Shield)

LIOP impone seis capas de seguridad programática antes de que cualquier dato o resultado abandone el nodo anfitrión:

1. **Capa 1: Guardian AST**: El análisis estático previo rechaza llamadas no autorizadas. Solo permite 14 funciones de WASI Preview 1.
2. **Capa 2: Aislamiento en Sandbox V8**: Sustituye 25 variables globales sensibles por trampas de seguridad y aplica `Object.freeze` sobre 11 prototipos nativos para cumplir con las normas de PCI-DSS.
3. **Capa 3: Analizador de Flujo Taint (IFC)**: El control estático de flujo bloquea la inferencia indirecta de datos confidenciales por canales laterales.
4. **Capa 4: Escudo PII de Salida**: Un filtro en múltiples etapas (expresiones regulares, validadores de Luhn/IBAN y modelos de lenguaje NER) censura tokens confidenciales.
5. **Capa 5: Política de Agregación**: Prohíbe la exportación de listas de registros individuales, exigiendo resultados estadísticos o resúmenes.
6. **Capa 6: Generación de Recibos ZK**: Sella los resultados mediante resúmenes HMAC-SHA256 vinculados matemáticamente al código exacto ejecutado y a la clave efímera de sesión post-cuántica.

---

## 🤖 Preparación para Agentes de IA y LLMs

LIOP implementa la pila estándar para agentes autónomos de codificación:
- **[`AGENTS.md`](./AGENTS.md)**: Instrucciones universales, invariantes arquitectónicos y reglas de seguridad.
- **[`CLAUDE.md`](./CLAUDE.md)**: Puntero directo para herramientas de Anthropic y Claude Code.
- **[`llms.txt`](./llms.txt)** y **[`llms-full.txt`](./llms-full.txt)**: Documentación estructurada conforme al estándar [llmstxt.org](https://llmstxt.org).

---

## Licencia y Atribución

Distribuido bajo la [Licencia Apache 2.0](./LICENSE). Consulte [NOTICE](./NOTICE) y [TRADEMARKS.md](./TRADEMARKS.md) para las directrices de marcas registradas y atribución.

Copyright 2026 [Nekzus Solutions](https://github.com/Nekzus) y colaboradores.

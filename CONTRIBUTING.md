# Contributing to Logic-Injection-on-Origin Protocol (LIOP)
*Para la versión en Español, ver la sección más abajo.*

Thank you for your interest in contributing to the Logic-Injection-on-Origin Protocol (LIOP). We are building the high-performance sovereign compute mesh that complements application-level agent protocols (such as MCP) by shifting distributed data computation from Context-Pulling to **Logic-Injection-on-Origin (LIO)**.

To ensure architectural consistency, defense-in-depth Zero-Trust security, and a predictable open-source lifecycle, please adhere to the following contribution guidelines.

---

## 1. Code of Conduct
By participating in this project, you agree to abide by our Code of Conduct (`CODE_OF_CONDUCT.md`). All contributors are expected to maintain a professional, technical, respectful, and inclusive environment.

## 2. Constitutional Foundation & The LEP Process
LIOP is governed by the [Origin Manifesto](MANIFESTO.md) and its 7 immutable Design Principles:
- **Constitutional Supremacy**: All contributions, features, and protocol extensions must strictly adhere to the 7 Design Principles (Data Sovereignty, Zero-Trust by Default, Aggregation-First, Cryptographic Verifiability, Quantum Resilience, Minimal Footprint, and Ecosystem Coexistence). Proposals that violate data sovereignty or aggregation guarantees are rejected by design.
- **LIOP Enhancement Proposals (LEPs)**: Protocol enhancements, new gRPC services, cryptographic primitives, or transport extensions are proposed as LEPs submitted via Pull Request targeting the `protocol/` directory to update the [Protocol Specification](protocol/SPECIFICATION.md).

## 3. Core Philosophy: Logic-Injection-on-Origin (LIO)
LIOP is built on the **Postulate of Origin (LIO)**. All contributions must respect the Zero-Trust architecture:
- Agents send logic (WASM/JS); data never leaves the Origin Server without explicit, cryptographically verifiable aggregation.
- Ensure any new feature adheres to the Sandboxing (WASI/V8 Guardian AST) and Cryptographic validation (ZK-Receipts, ML-KEM-768, ML-DSA-65) principles.

## 4. Language Policy
- **Codebase (Strictly English)**: All source code (variable names, functions, architectures), internal code comments, and technical specifications must be written in **English**.
- **Community & Planning (Bilingual)**: High-level architectural documents (`GEMINI.md`, internal planning), Issues, and Discussions may be conducted in **Spanish** or **English**.

## 5. Canonical 3-Channel Branching Strategy
We maintain a strict 3-channel release topology:
- `main`: Stable, production-ready Tier-0 state (`latest` on npm).
- `beta`: Staging and feature-freeze channel (`@beta` on npm).
- `alpha`: Active development channel (`@alpha` on npm).

### Branching Rules:
1. All new feature branches must branch off `alpha` using the format `feature/<descriptive-name>`.
2. Bug fix branches should be named `fix/<bug-name>`.
3. Submit Pull Requests targeting the **`alpha`** branch for active development, or **`beta`** for stabilization fixes. Direct commits to `main` are strictly prohibited.

## 6. Developer Certificate of Origin (DCO 1.1) & Mandatory GPG Commit Signing
To ensure full compliance with Section 5 of the Apache License 2.0 and establish clear intellectual property provenance, LIOP requires all contributions to be certified under the **Developer Certificate of Origin (DCO), Version 1.1**, and cryptographically signed with GPG:

```bash
git commit -s -S -m "feat(scope): descriptive commit message"
```

The `-s` flag automatically appends the required `Signed-off-by: Your Name <your.email@example.com>` trailer. Commits without GPG signatures (`-S`) and valid DCO sign-offs (`-s`) will be rejected by CI security checks.

## 7. Pre-Submission Quality Gates
Before submitting a Pull Request, verify that all local checks pass with zero errors:

```bash
# 1. Verify clean dependencies without lockfile drifts
pnpm install --frozen-lockfile

# 2. BiomeJS formatting and static analysis (0 errors, 0 warnings)
pnpm run check

# 3. Diagram health, parity, and SVG viewer compatibility
pnpm run diagrams:check

# 4. Apache-2.0 legal license header compliance
pnpm run license:check

# 5. Full test suite execution
pnpm test
cargo test --workspace
```

## 8. Security (PII & Zero-Trust)
- LIOP enforces a **Zero-Tolerance** policy for Personal Identifiable Information (PII) leakage.
- Never hardcode credentials, secrets, or absolute local paths.
- For security vulnerabilities, sandbox escapes, or cryptographic weaknesses, use [Private Security Advisories](https://github.com/Nekzus/LIOP/security/advisories/new) instead of public issues.

---

# Contribuir a Logic-Injection-on-Origin Protocol (LIOP)

Gracias por tu interés en contribuir al Logic-Injection-on-Origin Protocol (LIOP). Construimos la malla de cómputo soberano de alto rendimiento que complementa a los protocolos de agentes a nivel de aplicación (como MCP), transformando el cómputo de datos distribuidos desde la Extracción de Contexto hacia **Logic-Injection-on-Origin (LIO)**.

Para garantizar la máxima calidad arquitectónica, seguridad Zero-Trust de defensa en profundidad y un ciclo de vida predecible, agradecemos el cumplimiento de las siguientes directrices.

---

## 1. Código de Conducta
Al participar en este proyecto, aceptas cumplir con nuestro Código de Conducta (`CODE_OF_CONDUCT.md`). Todos los colaboradores mantienen un entorno profesional, técnico, respetuoso e inclusivo.

## 2. Base Constitucional y Proceso LEP
LIOP se rige por el [Manifiesto de Origen](MANIFESTO_ES.md) y sus 7 Principios de Diseño inmutables:
- **Supremacía Constitucional**: Toda contribución, característica o extensión debe adherirse estrictamente a los 7 Principios de Diseño (Soberanía de Datos, Zero-Trust por Defecto, Agregación Primero, Verificabilidad Criptográfica, Resiliencia Cuántica, Huella Mínima y Convivencia de Ecosistema). Las propuestas que vulneren la soberanía o la agregación son rechazadas por diseño.
- **Propuestas de Mejora de LIOP (LEPs)**: Las mejoras arquitectónicas, nuevos servicios gRPC, primitivas criptográficas o extensiones de transporte se proponen mediante LEPs enviadas por Pull Request al directorio `protocol/` para actualizar la [Especificación del Protocolo](protocol/SPECIFICATION_ES.md).

## 3. Filosofía Central: Logic-Injection-on-Origin (LIO)
LIOP está construido sobre el **Postulado de Origen (LIO)**. Todas las contribuciones deben respetar la arquitectura Zero-Trust:
- Los agentes envían lógica (WASM/JS); los datos nunca abandonan el Servidor de Origen sin una agregación explícita y criptográficamente verificable.
- Toda nueva característica debe cumplir con los principios de aislamiento en sandbox (WASI/V8 Guardian AST) y validación criptográfica (ZK-Receipts, ML-KEM-768, ML-DSA-65).

## 4. Política de Idioma
- **Código Fuente (Estrictamente Inglés)**: Todo el código fuente (variables, funciones, arquitecturas), comentarios internos en el código y especificaciones técnicas deben escribirse en **Inglés**.
- **Comunidad y Planificación (Bilingüe)**: Los documentos arquitectónicos de alto nivel (`GEMINI.md`, planificación interna), Issues y Discusiones pueden realizarse en **Español** o **Inglés**.

## 5. Estrategia Canónica de 3 Ramas
Mantenemos una topología estricta de 3 canales de release:
- `main`: Representa el estado estable de producción (`latest` en npm).
- `beta`: Representa el canal de staging y congelamiento de características (`@beta` en npm).
- `alpha`: Representa el canal de desarrollo activo (`@alpha` en npm).

### Reglas de Ramificación:
1. Toda nueva rama de funcionalidad debe partir de `alpha` con el formato `feature/<nombre-descriptivo>`.
2. Las ramas de corrección de errores deben nombrarse `fix/<nombre-del-bug>`.
3. Envía tus Pull Requests con destino a la rama **`alpha`** para desarrollo activo, o a **`beta`** para tareas de estabilización. Los commits directos sobre `main` están estrictamente prohibidos.

## 6. Certificado de Origen del Desarrollador (DCO 1.1) y Firma GPG Obligatoria
Para asegurar el pleno cumplimiento con la Sección 5 de la Licencia Apache 2.0 y garantizar la titularidad legítima de la propiedad intelectual aportada, LIOP exige que todas las contribuciones sean certificadas bajo el **Developer Certificate of Origin (DCO), Versión 1.1**, y firmadas criptográficamente con GPG:

```bash
git commit -s -S -m "feat(scope): mensaje descriptivo del commit"
```

El parámetro `-s` añade automáticamente la línea `Signed-off-by: Tu Nombre <tu.email@ejemplo.com>`. Los commits que carezcan de firma criptográfica GPG (`-S`) o del sign-off DCO (`-s`) serán rechazados de forma automática por los controles de seguridad en CI.

## 7. Controles Locales de Calidad Previos al Envío
Antes de presentar un Pull Request, confirma que todas las verificaciones locales aprueben con éxito:

```bash
# 1. Verificar dependencias limpias y consistencia del lockfile
pnpm install --frozen-lockfile

# 2. Análisis estático y formateo con BiomeJS (0 errores, 0 advertencias)
pnpm run check

# 3. Salud, paridad y compatibilidad de diagramas SVG
pnpm run diagrams:check

# 4. Conformidad con cabeceras legales de licencia Apache-2.0
pnpm run license:check

# 5. Ejecución completa de suites de prueba
pnpm test
cargo test --workspace
```

## 8. Seguridad (PII y Zero-Trust)
- LIOP opera con una política de **Cero Tolerancia** para fugas de Información Personal Identificable (PII).
- Nunca incluyas credenciales, secretos o rutas locales absolutas.
- Para vulnerabilidades de seguridad, escapes de sandbox o debilidades criptográficas, utiliza las [Asesorías Privadas de Seguridad](https://github.com/Nekzus/LIOP/security/advisories/new) en lugar de issues públicos.

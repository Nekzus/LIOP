# Contributing to Logic-Injection-on-Origin Protocol (LIOP)
*Para la versión en Español, ver la sección más abajo.*

Thank you for your interest in contributing to the Logic-Injection-on-Origin Protocol (LIOP). We are building the high-performance successor to the Model Context Protocol (MCP) by shifting the paradigm from Context-Pulling to **Logic-on-Origin (LoO)**.

To ensure the highest architectural quality, military-grade Zero-Trust security, and a predictable open-source lifecycle, please adhere to the following contribution guidelines.

---

## 1. Code of Conduct
By participating in this project, you agree to abide by our Code of Conduct. All contributors are expected to maintain a professional, technical, respectful, and inclusive environment.

## 2. Core Philosophy: Logic-on-Origin (LoO)
LIOP is built on the **Postulate of Origin (Logic-on-Origin)**. All contributions must respect the Zero-Trust architecture:
- Agents send logic (WASM/JS); data never leaves the Origin Server without explicit, cryptographically verifiable intent.
- Ensure any new feature adheres to the Sandboxing (WASI/V8 Guardian AST) and Cryptographic validation (ZK-Receipts, ML-KEM-768, ML-DSA-65) principles.

## 3. Language Policy
- **Codebase (Strictly English)**: All source code (variable names, functions, architectures), internal code comments, and technical specifications must be written in **English**.
- **Community & Planning (Bilingual)**: High-level architectural documents (`GEMINI.md`, internal planning), Issues, and Discussions may be conducted in **Spanish** or **English**.

## 4. Canonical 3-Channel Branching Strategy
We maintain a strict 3-channel release topology:
- `main`: Represents the stable, production-ready Tier-0 state (`latest` on npm).
- `beta`: Represents the staging and feature-freeze channel (`@beta` on npm).
- `alpha`: Represents the active development channel (`@alpha` on npm).

### Branching Rules:
1. All new feature branches must branch off `alpha` using the format `feature/<descriptive-name>`.
2. Bug fix branches should be named `fix/<bug-name>`.
3. Submit Pull Requests targeting the **`alpha`** branch for active development, or **`beta`** for stabilization fixes.

## 5. Mandatory GPG Commit Signing
All git commits must be cryptographically signed with GPG (`git commit -S`). Unsigned commits will not pass automated security checks.

## 6. Pull Request Requirements
- Use the official Pull Request template (`.github/pull_request_template.md`).
- Ensure all automated checks pass locally before submission:
  - `pnpm install --frozen-lockfile` (0 lockfile errors).
  - `pnpm run check` (BiomeJS formatting and linting).
  - `pnpm test` / `cargo test` (100% test pass rate).
- All new functionality must include corresponding unit and/or integration tests.

## 7. Security (PII & Zero-Trust)
- LIOP enforces a **Zero-Tolerance** policy for Personal Identifiable Information (PII) leakage.
- Never hardcode credentials, secrets, or absolute local paths.
- For security vulnerabilities, sandbox escapes, or cryptographic weaknesses, use [Private Security Advisories](https://github.com/Nekzus/LIOP/security/advisories/new) instead of public issues.

---

# Contribuir a Logic-Injection-on-Origin Protocol (LIOP)

Gracias por tu interés en contribuir al Logic-Injection-on-Origin Protocol (LIOP). Estamos construyendo el sucesor de alto rendimiento del Model Context Protocol (MCP) cambiando el paradigma de la Extracción de Contexto hacia el núcleo de **Logic-on-Origin (LoO)**.

Para garantizar la más alta calidad arquitectónica, seguridad Zero-Trust de grado militar y un ciclo de vida predecible, por favor adhiérete a las siguientes directrices.

---

## 1. Código de Conducta
Al participar en este proyecto, aceptas cumplir con nuestro Código de Conducta. Esperamos que todos los contribuidores mantengan un ambiente profesional, técnico, respetuoso e inclusivo.

## 2. Filosofía Central: Logic-on-Origin (LoO)
LIOP está construido sobre el **Postulado de Origen (Logic-on-Origin)**. Todas las contribuciones deben respetar la arquitectura Zero-Trust:
- Los agentes envían lógica (WASM/JS); los datos nunca abandonan el Servidor de Origen sin una intención explícita y criptográficamente verificable.
- Asegúrate de que cualquier nueva característica se adhiera a los principios de Sandboxing (WASI/V8 Guardian AST) y validación criptográfica (ZK-Receipts, ML-KEM-768, ML-DSA-65).

## 3. Política de Idioma
- **Código Fuente (Estrictamente Inglés)**: Todo el código fuente (variables, funciones, arquitecturas), comentarios internos en el código y especificaciones técnicas deben escribirse en **Inglés**.
- **Comunidad y Planificación (Bilingüe)**: Los documentos arquitectónicos de alto nivel (`GEMINI.md`, planificación interna), Issues y Discusiones pueden realizarse en **Español** o **Inglés**.

## 4. Estrategia Canónica de 3 Ramas
Mantenemos una topología estricta de 3 canales de release:
- `main`: Representa el estado estable de producción (`latest` en npm).
- `beta`: Representa el canal de staging y congelamiento de características (`@beta` en npm).
- `alpha`: Representa el canal de desarrollo activo (`@alpha` en npm).

### Reglas de Ramificación:
1. Toda nueva rama de característica debe partir de `alpha` con el formato `feature/<nombre-descriptivo>`.
2. Las ramas de corrección de errores deben nombrarse `fix/<nombre-del-bug>`.
3. Envía tus Pull Requests apuntando a la rama **`alpha`** para desarrollo activo, o a **`beta`** para estabilización.

## 5. Firma GPG Obligatoria en Commits
Todos los commits deben estar firmados criptográficamente con GPG (`git commit -S`). Los commits sin firma no superarán las comprobaciones de seguridad.

## 6. Requisitos de Pull Requests
- Utiliza la plantilla oficial de Pull Request (`.github/pull_request_template.md`).
- Asegúrate de que todas las pruebas y validaciones pasen localmente antes de enviar:
  - `pnpm install --frozen-lockfile` (0 errores de lockfile).
  - `pnpm run check` (BiomeJS linting y formateo).
  - `pnpm test` / `cargo test` (100% de tests aprobados).
- Toda nueva funcionalidad debe incluir sus pruebas unitarias y/o de integración correspondientes.

## 7. Seguridad (PII y Zero-Trust)
- LIOP opera con una política de **Cero Tolerancia** para fugas de Información Personal Identificable (PII).
- Nunca incluyas credenciales, secretos o rutas locales absolutas.
- Para vulnerabilidades de seguridad, escapes de sandbox o debilidades criptográficas, utiliza las [Asesorías Privadas de Seguridad](https://github.com/Nekzus/LIOP/security/advisories/new) en lugar de issues públicos.

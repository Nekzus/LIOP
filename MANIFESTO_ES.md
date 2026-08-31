# Logic-Injection-on-Origin Protocol (LIOP): El Manifiesto de Origen

## Resumen

Una malla de transporte binario descentralizada que invierte el paradigma dominante de integración de IA: en lugar de extraer datos sensibles hacia un modelo remoto, LIOP inyecta lógica WebAssembly aislada en el origen de los datos. Los datos nunca abandonan su frontera física. Los módulos inyectados se ejecutan dentro de sandboxes WASI estrictos, pasan por análisis estático de contaminación de datos (taint analysis), y operan bajo sellado criptográfico post-cuántico (ML-KEM-768). Solo resultados matemáticamente agregados — vinculados a pruebas de integridad criptográfica (ZK-Receipts) — cruzan la red. Esta arquitectura elimina las fallas de privacidad, ancho de banda y cumplimiento normativo inherentes a los protocolos de Context-Pulling. LIOP está diseñado para comunicación Máquina-a-Máquina a escala: analítica sanitaria, telemetría financiera, procesamiento IoT en el borde, y cualquier dominio donde la soberanía de datos no es negociable.

---

## 1. La Crisis del Context-Pulling

> **Definición 1 (Context-Pulling).** Patrón arquitectónico en el cual un agente de IA extrae datos crudos y sin procesar desde su nodo de origen, cruzando una frontera de red hacia un entorno de ejecución remoto para su análisis. Este patrón requiere que el propietario de los datos renuncie a la custodia física de los mismos antes de que ocurra cualquier cómputo.

La generación actual de protocolos de integración de IA — incluyendo el Model Context Protocol (MCP) — estandariza esta extracción. Si bien resulta altamente efectiva para la ergonomía de herramientas de agentes locales, extensiones de IDEs y utilidades de escritorio para desarrolladores, aplicar Context-Pulling sobre datos empresariales distribuidos transfiere megabytes o gigabytes de registros sensibles a través de internet para que un modelo centralizado pueda analizar, razonar y resumir en un servidor remoto.

Este enfoque falla de tres formas medibles:

1. **La Paradoja de la Privacidad.** No puedes pedirle a una IA que encuentre una correlación estadística en la base de datos de 10,000 pacientes de un hospital sin primero extraer esos 10,000 registros — incluyendo su información personal (PII) — fuera del perímetro seguro del hospital y hacia una nube de terceros. El cómputo requiere que los datos salgan. El cumplimiento normativo (HIPAA, GDPR, CCPA) exige que se queden. La arquitectura hace ambas cosas imposibles simultáneamente.

2. **El Colapso del Ancho de Banda y Económico.** Flujos de telemetría, registros de sensores IoT y libros mayores de trading de alta frecuencia generan gigabytes de datos por segundo. Transmitir ese volumen sobre HTTP hacia la ventana de contexto de un LLM no es lento — es un desperdicio arquitectónico. En Context-Pulling, la transferencia de red y los costos de tokenización escalan linealmente con el tamaño del dataset $O(N)$. En Logic-Injection, transferir la lógica al origen escala a costo de red constante $O(1)$. El resultado útil suele ser un único porcentaje o una lista ordenada; extraer datos crudos desperdicia cómputo, energía y ancho de banda.

3. **La Ilusión Zero-Trust.** Cuando extraes datos, pierdes la custodia física. Debes confiar en las políticas de retención del proveedor remoto, en sus controles de acceso internos, y en su postura regulatoria. Para instituciones de defensa, salud y finanzas, este requisito de confianza genera barreras de adopción que ninguna API key ni cifrado en tránsito puede resolver. Los datos abandonaron el edificio.

---

## 2. El Postulado LIO

> **Postulado de Origen (LIO).** Los datos son soberanos. Nunca deben cruzar su frontera física de confianza a menos que el resultado esté matemáticamente agregado o criptográficamente atestiguado. La inteligencia viaja hacia los datos; los datos permanecen en reposo.

El Logic-Injection-on-Origin Protocol nace de este postulado:

***Debemos dejar de mover los datos hacia la matemática. Debemos mover la matemática hacia los datos.***

Un Agente LIOP no solicita registros a un servidor. Inyecta lógica ejecutable — en forma de micro-módulos WebAssembly o algoritmos transpilados dinámicamente — hacia el servidor. El servidor ejecuta esta lógica dentro de un entorno aislado contra sus datos locales y retorna únicamente el resultado agregado, sellado con una prueba criptográfica que vincula la salida con la lógica exacta que la produjo.

En lugar de que un Agente pregunte: *"Dame todos los registros de tu base de datos para filtrarlos,"*
un Agente LIOP dice: *"Aquí está mi lógica. Ejecútala localmente. Devuélveme solo el resultado computado."*

---

## 3. Principios de Diseño

Estos siete principios gobiernan cada decisión arquitectónica del protocolo. No son aspiracionales — son restricciones. Una contribución que viole cualquiera de ellos se rechaza.

1. **Soberanía de Datos** — Los datos nunca abandonan su origen a menos que la salida satisfaga restricciones de agregación o atestación criptográfica. Sin excepciones.
2. **Zero-Trust por Defecto** — Todo módulo inyectado es no confiable. Las capacidades deben otorgarse explícitamente mediante una allowlist estática, nunca heredarse del entorno host.
3. **Agregación Primero** — La exportación de datos a nivel de registro individual está arquitectónicamente prohibida. Solo resultados matemáticamente reducidos cruzan la frontera de red.
4. **Verificabilidad Criptográfica** — Cada cómputo produce un ZK-Receipt que vincula el hash de salida con la lógica exacta ejecutada y el secreto de sesión. Terceros pueden auditar resultados sin re-ejecutar la lógica.
5. **Resiliencia Cuántica** — Todos los intercambios de claves y sellos de sesión utilizan algoritmos post-cuánticos (ML-KEM-768) desde el primer día. No es un camino de actualización futura — es un requisito de lanzamiento, diseñado contra estrategias de cosecha-ahora-descifra-después.
6. **Huella Mínima** — El protocolo debe operar en dispositivos de borde con recursos limitados. La eficiencia es una restricción dura, no un objetivo de optimización. Los límites de combustible de CPU son determinísticos y derivados del AST.
7. **Convivencia de Ecosistema y Compatibilidad Retroactiva** — LIOP opera en la capa de cómputo soberano y malla distribuida mientras convive con protocolos de agentes a nivel de aplicación. Mediante un adaptador de gateway de era dual, los clientes MCP consumen servicios LIOP de forma transparente sin fragmentación del ecosistema.

---

## 4. Los Seis Escudos — Modelo de Amenazas y Capas de Defensa

LIOP implementa seis defensas en capas. Cada capa aborda una clase de ataque específica. Juntas forman una arquitectura de defensa en profundidad donde comprometer una capa individual no compromete el sistema.

| Escudo | Amenaza Neutralizada | Mecanismo |
|---|---|---|
| **Guardian AST** | Escape del sandbox vía imports prohibidos | Inspección estática de imports WASM contra una allowlist de 14 funciones WASI antes de iniciar ejecución |
| **Sandbox WASI** | Acceso arbitrario al host, bucles infinitos, fugas de variables de entorno | Isolate V8 con 25 globals envenenados, aislamiento de objetos con prototipo nulo, deep freeze recursivo, y límites determinísticos de combustible CPU |
| **Analizador de Contaminación** | Derivación lateral de PII (`charCodeAt`, inferencia booleana, agregaciones correlacionadas) | Control de Flujo de Información (IFC) estático basado en Acorn que rastrea el flujo de datos desde la fuente hasta el retorno |
| **Escudo de Egreso PII** | Exfiltración directa de PII (emails, tarjetas de crédito, SSN, teléfonos) | Pipeline de salida en 4 etapas: coincidencia de nombre de clave → coincidencia difusa → validadores regex → Reconocimiento de Entidades Nombradas (NER) |
| **Política de Agregación** | Exportación de datos a nivel de registro | Bloquea respuestas a nivel de registro; aplica umbrales de K-Anonimidad en datasets pequeños; aplica ruido Laplace (Privacidad Diferencial) |
| **ZK-Receipt** | Manipulación de resultados, ataques man-in-the-middle | Prueba HMAC-SHA256 vinculando hash de salida con digest de imagen de lógica, sellada con secreto de sesión PQC |

**Fuera de alcance.** LIOP no defiende contra sistemas operativos host comprometidos, ataques de canal lateral a nivel de hardware (Spectre/Meltdown), ni propietarios de datos coaccionados. La atestación TEE (AWS Nitro Enclaves, Intel SGX) está planificada para la fase Release Candidate para extender la frontera de confianza al nivel de hardware.

---

## 5. Garantías Formales

Estas garantías no son claims de marketing. Cada una se mapea directamente a un mecanismo implementado en el SDK. Si LIOP no puede entregar una garantía, no aparece aquí.

> **G1 — Residencia de Datos.** Ningún byte de datos de usuario crudos y sin agregar cruza la frontera de red del nodo de origen durante un ciclo estándar de ejecución LIOP.

> **G2 — Integridad Computacional.** Cada ejecución produce un ZK-Receipt que contiene el hash de salida, el digest de imagen de lógica, y el sello de sesión PQC. Cualquier modificación a la salida, la lógica o la sesión invalida el recibo.

> **G3 — Aislamiento del Sandbox.** Los módulos inyectados no pueden acceder al sistema de archivos del host, la pila de red ni las variables de entorno más allá de la allowlist estricta WASI. Las violaciones se detectan en tiempo de inspección AST (pre-ejecución) o se terminan en runtime vía agotamiento de combustible.

> **G4 — Sesiones Quantum-Safe.** Todas las claves de sesión se negocian vía ML-KEM-768. Los textos cifrados interceptados proveen cero ventaja computacional a adversarios con acceso a hardware cuántico.

> **G5 — Auto-Corrección Autónoma.** Un agente que viola el paradigma LIO (ej: intenta solicitar datos crudos) recibe un prompt de corrección cognitiva estructurado y puede auto-corregirse sin intervención humana.

---

## 6. Horizontes de Aplicación

**Analítica Sanitaria.** Un investigador farmacéutico inyecta un módulo de detección de correlaciones en el nodo de base de datos de pacientes de un hospital. El módulo se ejecuta localmente, retorna solo correlaciones estadísticas agregadas con ruido de Privacidad Diferencial aplicado, y los registros de pacientes del hospital nunca abandonan las instalaciones. El cumplimiento HIPAA es arquitectónico, no contractual.

**Telemetría Financiera.** Una firma de trading cuantitativo inyecta un algoritmo de escaneo de volatilidad en el nodo del libro de órdenes de un exchange. El algoritmo procesa datos de ticks localmente a granularidad de microsegundos y retorna solo métricas de riesgo computadas — spread, volatilidad implícita, Greeks. Cero datos de trading crudos cruzan el cable.

**Procesamiento IoT en el Borde.** Un sistema de gestión de flotas inyecta lógica de detección de anomalías en 50,000 nodos de telemetría vehicular. Cada nodo procesa sus propios datos de sensores localmente y reporta solo puntajes de salud agregados. El consumo de ancho de banda cae en órdenes de magnitud comparado con la ingestión centralizada.

**IA Soberana para Industrias Reguladas.** Un organismo regulador inyecta lógica de auditoría en instituciones financieras a través de jurisdicciones. Cada institución ejecuta la auditoría localmente contra su propio libro mayor y retorna solo el resultado de cumplimiento con un ZK-Receipt probando la lógica exacta ejecutada. Ningún dato financiero propietario cruza fronteras organizacionales.

---

## 7. El Contraste

```
    CONTEXT-PULLING (Status Quo)
    ─────────────────────────────────────────────────

    ┌──────────────┐                     ┌──────────────┐
    │              │ GB de datos crudos  │              │
    │  Nodo Datos  │ ──────────────────▶ │  LLM Remoto  │
    │              │                     │              │
    └──────────────┘ PII en tránsito     └──────────────┘


    LOGIC-INJECTION-ON-ORIGIN (LIOP)
    ─────────────────────────────────────────────────

    ┌──────────────┐                     ┌──────────────┐
    │              │ KB de lógica WASM   │              │
    │  Nodo Datos  │ ◀────────────────── │ Agente (LLM) │
    │              │                     │              │
    └──────────────┘                     └──────────────┘
           │                                    ▲
           │ Resultado agregado + ZK-Receipt    │
           └────────────────────────────────────┘

       Los datos nunca salen. La prueba viaja.
```

---

## 8. Gobernanza y Evolución del Protocolo

Este manifiesto constituye la base constitucional inmutable del Logic-Injection-on-Origin Protocol. El Postulado LIO y los Principios de Diseño (Sección 3) representan invariantes no negociables establecidas en el génesis del protocolo.

La implementación técnica, las primitivas criptográficas y las capacidades de transporte evolucionan mediante el proceso de **Propuestas de Mejora de LIOP (LEP)** que rige la [Especificación del Protocolo](./protocol/SPECIFICATION.md):

1. **Presentación de LEP** — Los contribuidores presentan mejoras arquitectónicas o criptográficas mediante Pull Request al directorio `protocol/`.
2. **Alineación Constitucional** — Toda propuesta debe demostrar adhesión estricta a los 7 Principios de Diseño. Aquellas que vulneren la soberanía de datos o las garantías de agregación son rechazadas por diseño.
3. **Revisión por Pares y Verificación** — Periodo mínimo de 14 días de auditoría técnica con vectores de prueba empíricos en el SDK de referencia.
4. **Ratificación en la Especificación** — Las LEPs aprobadas se incorporan a la siguiente versión fechada de la [Especificación del Protocolo](./protocol/SPECIFICATION.md).

---

## 9. Únete a la Malla

- **Deja de Extraer.**
- **Comienza a Inyectar.**
- **LIO es el futuro de la IA Autónoma.**

Lee la [Especificación del Protocolo](./protocol/SPECIFICATION.md). Ejecuta el [Playground Interactivo](http://localhost:14000). Construye tu primer Servidor LIOP con `npm install @nekzus/liop`. Únete a la malla.

---

**Primera Publicación:** 1 de Marzo de 2026 | **Versión:** 1.0 (Ratificado: 31 de Agosto de 2026)
**Autor:** Mauricio Ortega (Nekzus) — [Nekzus Solutions](https://nekzus.com)
**Licencia:** [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) — Este documento puede compartirse y adaptarse con atribución.
**Licencia del Protocolo:** [Apache 2.0](./LICENSE)

# Guía de Enriquecimiento de LIOP y Creación de Nekzus Solutions en Wikidata

Este documento proporciona los datos estructurados, identificadores unívocos y bloques de importación para enriquecer la entidad existente de **LIOP ([Q141600820](https://www.wikidata.org/wiki/Q141600820))** y dar de alta a **Nekzus Solutions** como organización desarrolladora oficial en Wikidata.

---

## 1. Fase 1: Creación de la Entidad de Nekzus Solutions

Para vincular formalmente a la organización como desarrollador en Wikidata (propiedad `P178`), se recomienda registrar primero la entidad propia de la organización.

### Opción A: Importación con QuickStatements (1 clic)

1. Acceda a la herramienta oficial [QuickStatements](https://quickstatements.toolforge.org/).
2. Inicie sesión con su cuenta Wikimedia.
3. Copie y pegue el siguiente bloque de comandos:

```text
CREATE
LAST|Len|"Nekzus Solutions"
LAST|Les|"Nekzus Solutions"
LAST|Den|"Open-source software organization and developer of the Logic-Injection-on-Origin Protocol"
LAST|Des|"Organización de software de código abierto y desarrolladora del protocolo LIOP"
LAST|Aen|"Nekzus"
LAST|Aes|"Nekzus"
LAST|P31|Q43229
LAST|P31|Q1058914
LAST|P856|"https://nekzus-32.mintlify.app/"
LAST|P1324|"https://github.com/Nekzus"
LAST|P571|+2026-00-00T00:00:00Z/9
LAST|P1056|Q141600820
```

4. Haga clic en **Import V1 commands** y luego en **Run**.
5. Wikidata creará el elemento y le asignará un identificador (anote este código, por ejemplo `Q1416XXXXX`).

### Opción B: Carga Manual en la Interfaz Web de Wikidata

1. Inicie sesión en [Wikidata.org](https://www.wikidata.org/).
2. En la barra lateral izquierda, seleccione **Crear un nuevo elemento** (*Create a new Item*).
3. Complete los metadatos principales:
   - **Etiqueta (en)**: `Nekzus Solutions`
   - **Etiqueta (es)**: `Nekzus Solutions`
   - **Descripción (en)**: `Open-source software organization and developer of the Logic-Injection-on-Origin Protocol`
   - **Descripción (es)**: `Organización de software de código abierto y desarrolladora del protocolo LIOP`
   - **Alias (en)**: `Nekzus`
   - **Alias (es)**: `Nekzus`
4. Guarde el elemento inicial y agregue las siguientes declaraciones (*Statements*):
   - **instancia de (`P31`)**: `organización` (`Q43229`)
   - **instancia de (`P31`)**: `empresa de software` (`Q1058914`)
   - **sitio web oficial (`P856`)**: `https://nekzus-32.mintlify.app/`
   - **repositorio de código (`P1324`)**: `https://github.com/Nekzus`
   - **fecha de fundación o creación (`P571`)**: `2026`
   - **producto (`P1056`)**: `Logic-Injection-on-Origin Protocol` (`Q141600820`)

---

## 2. Fase 2: Enriquecimiento de LIOP (Q141600820)

Una vez disponible la entidad de la organización (o de forma independiente), agregue las propiedades técnicas para el protocolo y el SDK.

### Opción A: Importación con QuickStatements (1 clic)

1. En [QuickStatements](https://quickstatements.toolforge.org/), pegue el siguiente bloque:

```text
Q141600820|P277|Q978185
Q141600820|P277|Q575650
Q141600820|P8262|"@nekzus/liop"
Q141600820|P973|"https://www.npmjs.com/package/@nekzus/liop"
Q141600820|P571|+2026-00-00T00:00:00Z/9
Q141600820|P306|Q174666
Q141600820|P1072|Q20155677
Q141600820|P1072|Q1645574
Q141600820|P1073|Q1645574
Q141600820|P361|Q1142726
```

*(Si ya creó la entidad de Nekzus Solutions en el paso anterior, agregue también la línea: `Q141600820|P178|Q_DE_NEKZUS` reemplazando `Q_DE_NEKZUS` por el identificador obtenido).*

2. Haga clic en **Import V1 commands** y luego en **Run**.

### Opción B: Carga Manual en la Interfaz Web de Wikidata

Visite directamente la página de la entidad: [https://www.wikidata.org/wiki/Q141600820](https://www.wikidata.org/wiki/Q141600820).

Haga clic en **+ añadir declaración** (*+ add statement*) para cada uno de los siguientes campos:

| Campo en Wikidata | ID Propiedad | Valor / Nombre del Ítem | ID Valor Wikidata |
|---|---|---|---|
| **desarrollador** | `P178` | Nekzus Solutions | *(El Q-ID creado en Fase 1)* |
| **lenguaje de programación** | `P277` | TypeScript | `Q978185` |
| **lenguaje de programación** | `P277` | Rust | `Q575650` |
| **paquete npm** | `P8262` | `@nekzus/liop` | *(Texto plano literal)* |
| **descrito en la URL** | `P973` | `https://www.npmjs.com/package/@nekzus/liop` | *(URL literal)* |
| **fecha de creación** | `P571` | 2026 | `2026` |
| **sistema operativo** | `P306` | multiplataforma | `Q174666` |
| **formatos de archivo legibles** | `P1072` | WebAssembly | `Q20155677` |
| **formatos de archivo legibles** | `P1072` | Protocol Buffers | `Q1645574` |
| **formatos de archivo editables** | `P1073` | Protocol Buffers | `Q1645574` |
| **forma parte de** | `P361` | agente inteligente | `Q1142726` |

---

## 3. Impacto en Motores de Búsqueda y Modelos de Lenguaje

Al consolidar estas tripletas semánticas:
- **Indexación NPM**: Los rastreadores de IA reconocen que `@nekzus/liop` es la implementación de referencia del protocolo en el registro público oficial.
- **Diferenciación de Sintaxis**: Al declarar TypeScript (`Q978185`) y Rust (`Q575650`), los modelos asocian los ejemplos de código y SDKs con sus respectivos entornos de compilación.
- **Topología de Agentes**: La relación bidireccional con *agente inteligente* (`Q1142726`) y *empresa de software* (`Q1058914`) asegura que las respuestas a consultas sobre arquitecturas de agentes sitúen a LIOP en la categoría de transporte y ejecución descentralizada.

# Guía de Edición y Enriquecimiento Manual en Wikidata.org

Esta guía detalla el procedimiento directo a través de la interfaz visual de **Wikidata.org** para dar de alta la entidad de **Nekzus Solutions** y enriquecer la entidad oficial de **LIOP ([Q141600820](https://www.wikidata.org/wiki/Q141600820))**.

> [!NOTE]
> Wikimedia exige que una cuenta sea autoconfirmada (mínimo 4 días de antigüedad y 50 ediciones previas) para utilizar herramientas de procesamiento por lotes como QuickStatements. La edición manual en la web oficial no tiene esta restricción y surte efecto de forma inmediata.

---

## Paso 1: Creación de la Entidad de Nekzus Solutions

1. Abra su navegador en [Wikidata.org](https://www.wikidata.org/) con su sesión iniciada (`NekzusDev`).
2. En el menú lateral izquierdo, pulse en **Crear un nuevo elemento** (*Create a new Item*).
3. Rellene los campos iniciales de identificación:
   - **Idioma**: `es` | **Etiqueta**: `Nekzus Solutions`
   - **Descripción**: `Organización de software de código abierto y desarrolladora del protocolo LIOP`
   - **Alias**: `Nekzus`
4. En la sección en inglés:
   - **Language**: `en` | **Label**: `Nekzus Solutions`
   - **Description**: `Open-source software organization and developer of the Logic-Injection-on-Origin Protocol`
   - **Aliases**: `Nekzus`
5. Pulse el botón **Crear** (*Create*).
6. Una vez creado el elemento, anote el código `Q` asignado en la parte superior (por ejemplo `Q1416XXXXX`).
7. En la página recién creada, pulse en **+ añadir declaración** (*+ add statement*) para cada uno de los siguientes datos:

| Propiedad (escribir en el campo izquierdo) | Valor (seleccionar o escribir en el campo derecho) |
|---|---|
| `instancia de` (o `P31`) | `organización` (`Q43229`) |
| `instancia de` (o `P31`) | `empresa de software` (`Q1058914`) |
| `sitio web oficial` (o `P856`) | `https://nekzus-32.mintlify.app/` |
| `nombre de usuario en GitHub` (o `P2037`) | `Nekzus` |
| `fecha de fundación o creación` (o `P571`) | `2023` |
| `producto` (o `P1056`) | `Logic-Injection-on-Origin Protocol` (`Q141600820`) |

Pulse **publicar** (*publish*) tras añadir cada declaración. El elemento oficial asignado es [Q141610167](https://www.wikidata.org/wiki/Q141610167).

---

## Paso 2: Enriquecimiento de la Entidad de LIOP (Q141600820)

1. Diríjase directamente a [https://www.wikidata.org/wiki/Q141600820](https://www.wikidata.org/wiki/Q141600820).
2. Desplácese hasta la sección de **Declaraciones** (*Statements*).
3. Para cada fila de la siguiente tabla, pulse en **+ añadir declaración** (*+ add statement*) al final de la página o debajo de la categoría correspondiente:

| Propiedad a buscar (campo izquierdo) | Valor a seleccionar o pegar (campo derecho) | Tipo de dato / Resultado |
|---|---|---|
| `desarrollador` (o `P178`) | `Nekzus Solutions` (`Q141610167`) | Entidad oficial vinculada |
| `lenguaje de programación` (o `P277`) | `TypeScript` (`Q978185`) | Entidad existente |
| `lenguaje de programación` (o `P277`) | `Rust` (`Q575650`) | Entidad existente |
| `paquete npm` (o `P8262`) | `@nekzus/liop` | Identificador externo (Wikidata enlaza a npm) |
| `descrito en la URL` (o `P973`) | `https://www.npmjs.com/package/@nekzus/liop` | Enlace web directo |
| `fecha de fundación o creación` (o `P571`) | `2026` | Fecha (año) |
| `sistema operativo` (o `P306`) | `multiplataforma` (`Q174666`) | Entidad existente |
| `formatos de archivo legibles` (o `P1072`) | `WebAssembly` (`Q20155677`) | Entidad existente |
| `formatos de archivo legibles` (o `P1072`) | `Protocol Buffers` (`Q1645574`) | Entidad existente |
| `formatos de archivo editables` (o `P1073`) | `Protocol Buffers` (`Q1645574`) | Entidad existente |
| `forma parte de` (o `P361`) | `agente inteligente` (`Q1142726`) | Entidad existente |

4. Tras guardar cada declaración con el botón **publicar** (*publish*), la entidad quedará completamente interconectada en el Knowledge Graph de Wikidata.

---

## Paso 3: Resolución de Advertencias en LIOP (Q141600820)

Las advertencias iniciales en `Q141600820` quedaron 100% resueltas mediante:

1. **Añadir "software" a "instancia de"**: Al incluir `software` (`Q7397`) en `instancia de` (`P31`), se satisfacen las restricciones ontológicas de las propiedades de ingeniería de software.
2. **Calificador de idioma en "descrito en la URL"**: Al añadir el calificador `idioma de la obra o del nombre` (`P407`) con valor `inglés` (`Q1860`) en la declaración `P973`, se elimina la advertencia de idioma.

---

## Paso 4: Resolución de Advertencias en Nekzus Solutions (Q141610167)

En la entidad `Nekzus Solutions` ([Q141610167](https://www.wikidata.org/wiki/Q141610167)), la declaración `URL del repositorio de código fuente` (`P1324`) presenta advertencias de validación debido a dos causas concretas del modelo de datos de Wikidata:

1. **Restricción de tipo de sujeto en P1324**: La propiedad `P1324` solo es válida para software o repositorios individuales, no para organizaciones o empresas. Una organización no es un repositorio de código.
2. **Uso de referencias en lugar de calificadores**: Los metadatos de Git (`P8423`) y GitHub (`P10627`) fueron agregados como fuentes de referencia en lugar de calificadores de la declaración.

### Solución Canónica en Wikidata

Para organizaciones y empresas, Wikidata dispone de la propiedad nativa de identificador externo **`nombre de usuario en GitHub`** (`P2037`), la cual enlaza automáticamente a `https://github.com/Nekzus` sin exigir licencias de código ni calificadores de software.

Procedimiento de corrección en la web:

1. Ingrese a [https://www.wikidata.org/wiki/Q141610167](https://www.wikidata.org/wiki/Q141610167).
2. Localice la declaración **URL del repositorio de código fuente** (`P1324`).
3. Pulse en **editar** (*edit*) y luego en el icono de papelera / **eliminar** (*remove*) para suprimir dicha declaración con advertencias.
4. Pulse en **+ añadir declaración** (*+ add statement*).
5. En el campo de propiedad (izquierda) escriba: `nombre de usuario en GitHub` (o `P2037`).
6. En el campo de valor (derecha) escriba: `Nekzus`.
7. Pulse **publicar** (*publish*). Todas las advertencias desaparecerán y Wikidata renderizará el enlace oficial con el icono de GitHub.

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
| `repositorio de código` (o `P1324`) | `https://github.com/Nekzus` |
| `fecha de fundación o creación` (o `P571`) | `2026` |
| `producto` (o `P1056`) | `Logic-Injection-on-Origin Protocol` (`Q141600820`) |

Pulse **publicar** (*publish*) tras añadir cada declaración.

---

## Paso 2: Enriquecimiento de la Entidad de LIOP (Q141600820)

1. Diríjase directamente a [https://www.wikidata.org/wiki/Q141600820](https://www.wikidata.org/wiki/Q141600820).
2. Desplácese hasta la sección de **Declaraciones** (*Statements*).
3. Para cada fila de la siguiente tabla, pulse en **+ añadir declaración** (*+ add statement*) al final de la página o debajo de la categoría correspondiente:

| Propiedad a buscar (campo izquierdo) | Valor a seleccionar o pegar (campo derecho) | Tipo de dato / Resultado |
|---|---|---|
| `desarrollador` (o `P178`) | `Nekzus Solutions` | Ítem creado en el Paso 1 (`Q...`) |
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

## Paso 3: Resolución de Advertencias de Validación (Constraint Violations)

Si aparecen iconos de exclamación `(!)` junto a `operating system`, `programmed in`, `npm package` o `readable file format`, se debe a la restricción de tipo de Wikidata:

### 1. Añadir "software" a "instancia de" (Resuelve todos los signos de advertencia)
Las propiedades de software exigen que el elemento pertenezca a la clase software. Para resolver todas las advertencias en un solo paso:
1. Vaya a la primera declaración en la parte superior: **instancia de** (`P31`).
2. Pulse en **+ añadir valor** (*+ add value*) dentro de `instancia de`.
3. Busque y seleccione: `software` (`Q7397`).
4. Pulse **publicar**. Todos los signos de exclamación desaparecerán inmediatamente al satisfacerse la restricción de tipo ontológico.

### 2. Calificador de idioma en "descrito en la URL" (Resuelve el icono de bandera)
1. En la declaración **descrito en la URL** (`P973`), pulse en **editar** (*edit*).
2. Pulse en **+ añadir calificador** (*+ add qualifier*).
3. En propiedad escriba: `idioma de la obra o del nombre` (`P407`).
4. En valor escriba: `inglés` (`Q1860`).
5. Pulse **publicar**.

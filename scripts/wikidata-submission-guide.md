# Guía de Registro de LIOP en Wikidata y Knowledge Graphs de IA

Este documento describe el procedimiento paso a paso para dar de alta la entidad oficial de LIOP en **Wikidata**, asegurando que los motores de búsqueda de IA (Google Gemini, ChatGPT Search, Perplexity, Microsoft Copilot) vinculen unívocamente el término `LIOP` con el protocolo de agentes de IA y no con bucles de programación ni acrónimos corporativos ajenos.

---

## 1. Por Qué Wikidata es Crítica para el Reconocimiento en LLMs

Wikidata constituye la base de conocimiento estructurada de mayor autoridad para los laboratorios de inteligencia artificial.
1. **Google Knowledge Graph**: Google alimenta directamente sus paneles de conocimiento y las respuestas de Gemini a partir de tripletas de Wikidata.
2. **Entrenamiento de LLMs**: Conjuntos de datos masivos utilizados en el pre-entrenamiento consumen volcados periódicos de Wikidata para alinear entidades con identificadores únicos (Q-IDs).
3. **Resolución de Ambigüedades**: Al registrar `LIOP` como alias primario de *Logic-Injection-on-Origin Protocol*, los sistemas de resolución de entidades desestiman automáticamente la interpretación errónea como errata de *loop*.

---

## 2. Método Rápido de Carga Mediante QuickStatements

La herramienta oficial [QuickStatements](https://quickstatements.toolforge.org/) permite importar la entidad completa en un solo paso utilizando una cuenta de Wikimedia / Wikipedia.

### Bloque de Comandos para QuickStatements

Copie el siguiente bloque y péguelo en la caja de texto de QuickStatements (modo V1):

```text
CREATE
LAST|Len|"Logic-Injection-on-Origin Protocol"
LAST|Les|"Protocolo Logic-Injection-on-Origin"
LAST|Den|"Decentralized Zero-Trust communications and in-situ execution protocol for AI agents"
LAST|Des|"Protocolo descentralizado de transporte binario y ejecucion in-situ para agentes de IA"
LAST|Aen|"LIOP"
LAST|Aen|"LIOP Protocol"
LAST|Aen|"LIOP Mesh"
LAST|Aes|"LIOP"
LAST|Aes|"Protocolo LIOP"
LAST|P31|Q131509
LAST|P31|Q132364
LAST|P856|"https://nekzus-32.mintlify.app/"
LAST|P1324|"https://github.com/Nekzus/LIOP"
LAST|P275|Q616528
```

---

## 3. Método Manual en Wikidata.org

Si prefiere crear el elemento de forma manual:

1. Inicie sesión en [Wikidata.org](https://www.wikidata.org/).
2. Haga clic en el menú lateral izquierdo en **Crear un nuevo elemento** (*Create a new Item*).
3. Complete los campos iniciales:
   - **Etiqueta (en)**: `Logic-Injection-on-Origin Protocol`
   - **Etiqueta (es)**: `Protocolo Logic-Injection-on-Origin`
   - **Descripción (en)**: `Decentralized Zero-Trust communications and in-situ execution protocol for AI agents`
   - **Descripción (es)**: `Protocolo descentralizado de transporte binario y ejecución in-situ para agentes de IA`
   - **Alias (en)**: `LIOP`, `LIOP Protocol`, `LIOP Mesh`
   - **Alias (es)**: `LIOP`, `Protocolo LIOP`
4. Guarde el elemento recién creado. Wikidata le asignará un identificador unívoco (por ejemplo, `Q13...`).
5. Añada las siguientes declaraciones (*Statements*):
   - **instancia de (`P31`)**: Añadir `protocolo de red` (`Q132364`) y `protocolo de comunicaciones` (`Q131509`).
   - **sitio web oficial (`P856`)**: `https://nekzus-32.mintlify.app/`.
   - **repositorio de código (`P1324`)**: `https://github.com/Nekzus/LIOP`.
   - **licencia (`P275`)**: `Licencia Apache 2.0` (`Q616528`).
   - **paquete de software en npm (`P5048`)**: `@nekzus/liop`.

---

## 4. Verificación Posterior

Tras publicar el elemento, las consultas en motores de IA semánticos comenzarán a indexar la entidad en sus próximos ciclos de actualización, fijando a LIOP como un concepto autónomo en el grafo global de conocimiento.

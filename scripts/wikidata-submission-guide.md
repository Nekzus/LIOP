# Manual Wikidata.org Entity Management and Enrichment Guide

This guide details the direct procedure for maintaining the official Wikidata entity for **Nekzus Solutions ([Q141610167](https://www.wikidata.org/wiki/Q141610167))** and enriching the canonical entity for **Logic-Injection-on-Origin Protocol (LIOP, [Q141600820](https://www.wikidata.org/wiki/Q141600820))**.

> [!NOTE]
> Wikimedia requires accounts to be autoconfirmed (minimum 4 days old with 50 edits) to use batch API tooling such as QuickStatements. Direct web interface editing on Wikidata.org has no such restriction and takes effect immediately.

---

## Step 1: Entity Configuration for Nekzus Solutions (Q141610167)

The official organization item is registered at [https://www.wikidata.org/wiki/Q141610167](https://www.wikidata.org/wiki/Q141610167).

### Base Labels and Descriptions
- **English**:
  - Label: `Nekzus Solutions`
  - Description: `Open-source software organization and developer of the Logic-Injection-on-Origin Protocol`
  - Aliases: `Nekzus`, `Nekzus Dev`, `Nekzus Solutions Inc`
- **Spanish**:
  - Label: `Nekzus Solutions`
  - Description: `Organización de software de código abierto y desarrolladora del protocolo Logic-Injection-on-Origin`
  - Aliases: `Nekzus`, `Nekzus Dev`

### Statements (Claims)

| Property (left field) | Value (right field) | Ontology / Data Type |
|---|---|---|
| `instance of` (`P31`) | `organization` (`Q43229`) | Existing class |
| `instance of` (`P31`) | `software company` (`Q1058914`) | Existing class |
| `official website` (`P856`) | `https://nekzus-32.mintlify.app/` | Direct URL |
| `GitHub account` (`P2037`) | `Nekzus` | External identifier |
| `inception` (`P571`) | `2023` | Year |
| `product or material produced` (`P1056`) | `Logic-Injection-on-Origin Protocol` (`Q141600820`) | Entity link |

---

## Step 2: Protocol Claims Enrichment for LIOP (Q141600820)

Navigate to [https://www.wikidata.org/wiki/Q141600820](https://www.wikidata.org/wiki/Q141600820) to maintain or verify the protocol statements:

| Property (left field) | Value (right field) | Ontology / Data Type |
|---|---|---|
| `instance of` (`P31`) | `communication protocol` (`Q132364`) | Existing class |
| `instance of` (`P31`) | `software` (`Q7397`) | Existing class (satisfies tooling constraints) |
| `developer` (`P178`) | `Nekzus Solutions` (`Q141610167`) | Official linked organization |
| `programmed in` (`P277`) | `TypeScript` (`Q978185`) | Existing entity |
| `programmed in` (`P277`) | `Rust` (`Q575650`) | Existing entity |
| `npm package` (`P8262`) | `@nekzus/liop` | External identifier |
| `described at URL` (`P973`) | `https://www.npmjs.com/package/@nekzus/liop` | Direct URL (qualifier: `P407` = English `Q1860`) |
| `inception` (`P571`) | `2026` | Year |
| `operating system` (`P306`) | `cross-platform` (`Q174666`) | Existing entity |
| `readable file format` (`P1072`) | `WebAssembly` (`Q20155677`) | Existing entity |
| `readable file format` (`P1072`) | `Protocol Buffers` (`Q1645574`) | Existing entity |
| `writable file format` (`P1073`) | `Protocol Buffers` (`Q1645574`) | Existing entity |
| `part of` (`P361`) | `intelligent agent` (`Q1142726`) | Existing entity |
| `source code repository URL` (`P1324`) | `https://github.com/Nekzus/LIOP` | Direct repository URL |
| `copyright license` (`P275`) | `Apache License 2.0` (`Q13785927`) | Existing entity |
| `copyright status` (`P6216`) | `copyrighted` (`Q50423863`) | Existing entity |

---

## Step 3: Constraint Resolution in LIOP (Q141600820)

Initial constraint warnings on `Q141600820` were resolved through two adjustments:

1. **Adding "software" (`Q7397`) to "instance of" (`P31`)**: Software properties require the entity to belong to the software ontology class.
2. **Language qualifier on "described at URL" (`P973`)**: Adding qualifier `language of work or name` (`P407`) set to `English` (`Q1860`) satisfies documentation requirements.

---

## Step 4: Constraint Resolution in Nekzus Solutions (Q141610167)

In `Nekzus Solutions` ([Q141610167](https://www.wikidata.org/wiki/Q141610167)), using property `source code repository URL` (`P1324`) triggers validation warnings due to two Wikidata schema rules:

1. **Subject type constraint on P1324**: Property `P1324` applies strictly to software items or code repositories, not to legal entities, organizations, or software companies.
2. **Scope constraint on references vs qualifiers**: Version control tools such as Git (`P8423`) and GitHub (`P10627`) must not be placed inside citation references. They are valid only as qualifiers on repository statements.

### Canonical Wikidata Solution

Organizations and companies use the dedicated external identifier property **`GitHub account` (`P2037`)**. This property automatically generates the link to `https://github.com/Nekzus` with the GitHub brand icon and requires no code license or repository qualifiers.

Web interface steps:

1. Open [https://www.wikidata.org/wiki/Q141610167](https://www.wikidata.org/wiki/Q141610167).
2. Locate the **source code repository URL** (`P1324`) statement.
3. Click **edit**, then click the trash icon / **remove** to delete this invalid statement.
4. Click **+ add statement**.
5. In the property field (left), enter `GitHub account` (or `P2037`).
6. In the value field (right), enter `Nekzus`.
7. Click **publish**. All warnings will clear immediately.

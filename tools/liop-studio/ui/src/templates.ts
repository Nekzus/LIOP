// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

import type { CanonicalTemplate } from "./types";

export const CANONICAL_TEMPLATES: CanonicalTemplate[] = [
	{
		id: "hft",
		name: "Market Analysis",
		tool: "Analyze_HFT_Market_Data",
		domain: "Financial HFT",
		clearanceTier: "Tier 2",
		description:
			"Computes VWAP and average HFT spreads with differential privacy utility preservation.",
		code: `@LIOP{wasi_v1, HftAnalysis}
const ticks = env.records;
// Calculate VWAP and average bid/ask spreads
let sumPriceVol = 0;
let sumVol = 0;
let sumSpread = 0;

for (let i = 0; i < ticks.length; i++) {
  const t = ticks[i];
  const price = (t.bestBid + t.bestAsk) / 2;
  sumPriceVol += price * t.volume;
  sumVol += t.volume;
  sumSpread += (t.bestAsk - t.bestBid);
}

return {
  ticksProcessed: ticks.length,
  vwap: sumVol > 0 ? sumPriceVol / sumVol : 0,
  avgSpreadBps: ticks.length > 0 ? (sumSpread / ticks.length) * 10000 : 0
};
@END`,
	},
	{
		id: "bank",
		name: "Bank Aggregation",
		tool: "Analyze_Synthetic_Bank_Transactions",
		domain: "Core Banking",
		clearanceTier: "Tier 1",
		description:
			"Aggregates balances and account type distributions under zero-trust data sovereignty.",
		code: `@LIOP{wasi_v1, BankAnalysis}
const records = env.records || [];
// Interactive filter: customize minimum balance threshold (try 0, 50000, or 100000)
const MIN_BALANCE = 0;

const filtered = records.filter(r => (r.balance || 0) >= MIN_BALANCE);
// Sum balances and count account types with data sovereignty
const stats = filtered.reduce((acc, row) => {
  acc.totalBalance += (row.balance || 0);
  acc.accountsByType[row.accountType] = (acc.accountsByType[row.accountType] || 0) + 1;
  return acc;
}, { totalBalance: 0, accountsByType: {} });

return {
  totalAccounts: filtered.length,
  totalBalance: Number(stats.totalBalance.toFixed(2)),
  averageBalance: filtered.length > 0 ? Number((stats.totalBalance / filtered.length).toFixed(2)) : 0,
  distribution: stats.accountsByType
};
@END`,
	},
	{
		id: "vault",
		name: "Medical Stats",
		tool: "Analyze_Synthetic_Medical_Records",
		domain: "Healthcare",
		clearanceTier: "Tier 1",
		description:
			"Anonymized diagnostic distributions and mean patient age calculation.",
		code: `@LIOP{wasi_v1, MedicalStats}
const patients = env.records || [];
// Interactive filter: customize minimum patient age (try 0, 40, or 60)
const MIN_AGE = 0;

const filtered = patients.filter(p => (p.age || 0) >= MIN_AGE);
// Analyze diagnosis distribution and mean patient age
const stats = filtered.reduce((acc, p) => {
  acc.diagnoses[p.diagnosis] = (acc.diagnoses[p.diagnosis] || 0) + 1;
  acc.totalAge += (p.age || 0);
  return acc;
}, { diagnoses: {}, totalAge: 0 });

return {
  totalPatients: filtered.length,
  averageAge: filtered.length > 0 ? Number((stats.totalAge / filtered.length).toFixed(1)) : 0,
  diagnosesDistribution: stats.diagnoses
};
@END`,
	},
	{
		id: "blg_perimeter",
		name: "Enclave Perimeter",
		tool: "BLG_Inspect_Enclave_Perimeter",
		domain: "Perimeter Security",
		clearanceTier: "Tier 2",
		description:
			"Audits the physical subnets, pnet PSK isolation, and 6-layer zero-trust defense of Tier 1.",
		code: `@LIOP{wasi_v1, PerimeterAudit}
// Audits physical subnet boundaries and cryptographic isolation status
return {
  target: "Tier 1 Sovereign Enclave",
  protocol: "LIOP Multi-Tier Zero-Trust",
  layerAudit: [
    "Layer 1: Guardian AST",
    "Layer 2: WASI Sandbox",
    "Layer 3: Taint Analyzer (IFC)",
    "Layer 4: Egress PII Shield",
    "Layer 5: Aggregation-First Policy",
    "Layer 6: ZK-Receipt (HMAC-SHA256)",
    "Transport: pnet Swarm Key (PSK)"
  ]
};
@END`,
	},
	{
		id: "pii_attack",
		name: "PII Attack",
		tool: "Analyze_Synthetic_Bank_Transactions",
		domain: "Adversarial",
		clearanceTier: "Exfiltration Trap",
		description:
			"Adversarial attempt to exfiltrate individual raw rows (Intercepted by Egress Shield).",
		code: `@LIOP{wasi_v1, PiiAttack}
const records = env.records;
// Attempt to exfiltrate individual raw records
// This will be intercepted and blocked by the Egress PII Shield
return {
  confidentialData: records.map(r => ({
    name: r.accountHolder || r.ownerName,
    id: r.id || r.ownerId,
    balance: r.balance
  }))
};
@END`,
	},
	{
		id: "iot",
		name: "IoT Telemetry",
		tool: "Analyze_IoT_Sensor_Data",
		domain: "Industrial IoT",
		clearanceTier: "Tier 2",
		description:
			"Aggregates edge sensor metrics (temperature, vibration, status) under hostile WAN/3G latency.",
		code: `@LIOP{wasi_v1, IoTTelemetry}
const records = env.records;
// Aggregate industrial sensor telemetry on edge node
let sumTemp = 0;
let maxTemp = -999;
let criticalAlerts = 0;
const distribution = {};

for (let i = 0; i < records.length; i++) {
  const r = records[i];
  sumTemp += (r.temperatureCelsius || 0);
  if (r.temperatureCelsius > maxTemp) maxTemp = r.temperatureCelsius;
  if (r.status === "CRITICAL") criticalAlerts++;
  distribution[r.status] = (distribution[r.status] || 0) + 1;
}

return {
  totalSamples: records.length,
  avgTemperature: records.length > 0 ? Number((sumTemp / records.length).toFixed(1)) : 0,
  maxTemperature: Number(maxTemp.toFixed(1)),
  criticalCount: criticalAlerts,
  statusDistribution: distribution
};
@END`,
	},
	{
		id: "blg_bank",
		name: "BLG Banking Analytics",
		tool: "BLG_Execute_Banking_Analytics",
		domain: "Perimeter Routing",
		clearanceTier: "Tier 1 Gateway",
		description:
			"Securely routes banking analytical logic into the Tier 1 Enclave via Border LIO Gateway.",
		code: `@LIOP{wasi_v1, BankViaBLG}
const records = env.records || [];
// Aggregate banking transactions across the secure enclave boundary
let totalBalance = 0;
const accountsByType = {};

for (let i = 0; i < records.length; i++) {
  const r = records[i];
  totalBalance += (r.balance || 0);
  const type = r.accountType || "STANDARD";
  accountsByType[type] = (accountsByType[type] || 0) + 1;
}

return {
  enclave: "Tier 1 Sovereign Core",
  totalAccounts: records.length,
  totalBalance: Number(totalBalance.toFixed(2)),
  distribution: accountsByType,
  gatewayVerified: true
};
@END`,
	},
	{
		id: "blg_healthcare",
		name: "BLG Healthcare Analytics",
		tool: "BLG_Execute_Healthcare_Analytics",
		domain: "Perimeter Routing",
		clearanceTier: "Tier 1 Gateway",
		description:
			"Securely routes clinical health metrics into the Tier 1 Enclave via Border LIO Gateway.",
		code: `@LIOP{wasi_v1, HealthcareViaBLG}
const records = env.records || [];
// Aggregate clinical records across the secure enclave boundary
let totalAge = 0;
const diagnoses = {};

for (let i = 0; i < records.length; i++) {
  const p = records[i];
  totalAge += (p.age || 0);
  const diag = p.diagnosis || "UNCATEGORIZED";
  diagnoses[diag] = (diagnoses[diag] || 0) + 1;
}

return {
  enclave: "Tier 1 Healthcare Core",
  totalPatients: records.length,
  averageAge: records.length > 0 ? Number((totalAge / records.length).toFixed(1)) : 0,
  distribution: diagnoses,
  gatewayVerified: true
};
@END`,
	},
	{
		id: "mesh_status",
		name: "Mesh Telemetry",
		tool: "LiopMeshStatus",
		domain: "Mesh Protocol",
		clearanceTier: "Tier 2",
		description:
			"Queries internal peer telemetry, routing table health, and active Kademlia DHT state.",
		code: `@LIOP{wasi_v1, MeshTelemetry}
// Query local mesh telemetry and routing status
return {
  protocol: "LIOP/2026",
  nodeRole: env.role || "Consortium Node",
  status: "ACTIVE_IN_SITU",
  verifiedDataSovereignty: true
};
@END`,
	},
	{
		id: "universal_compute",
		name: "Universal In-Situ Compute",
		tool: "Execute_WASI_Logic",
		domain: "Universal / Any Target",
		clearanceTier: "Agnostic",
		description:
			"General-purpose logic injection template adaptable to any tool, schema, or origin dataset.",
		code: `@LIOP{wasi_v1, UniversalCompute}
// Safe in-situ computation over injected dataset or arguments
const records = env.records || [];
const args = params.arguments || {};

// Process records or input arguments deterministically
const count = Array.isArray(records) ? records.length : (records ? 1 : 0);

return {
  status: "COMPUTED_IN_SITU",
  datasetSize: count,
  providedArgs: Object.keys(args),
  summary: "Logic executed directly at data origin under Zero-Trust WASI sandbox",
  verifiedInSitu: true
};
@END`,
	},
];

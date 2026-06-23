import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestClient, waitForDiscovery, buildEnvelope, extractText } from "./_client-helpers.js";
import { LiopClient } from "../../src/client/index.js";
import { log } from "../../src/utils/logger.js";

describe("12-client-sdk-e2e: Native Client SDK P2P Mesh Execution", () => {
  let client: LiopClient;

  beforeAll(async () => {
    client = await createTestClient();
    // Esperar a que la DHT de Kademlia descubra al menos 3 herramientas (Bank, Vault, Oracle)
    await waitForDiscovery(client, 3, 60000);
  }, 70000);

  afterAll(async () => {
    if (client) {
      log.info("[E2E-Test] Cerrando el cliente de pruebas...");
      await client.close();
    }
  });

  it("should list discovered tools through the native client", async () => {
    const tools = await client.discoverTools();
    expect(tools.length).toBeGreaterThanOrEqual(3);
    const names = tools.map(t => t.name);
    expect(names).toContain("Analyze_Synthetic_Bank_Transactions");
    expect(names).toContain("Analyze_Synthetic_Medical_Records");
    expect(names).toContain("Analyze_HFT_Market_Data");
  });

  it("should execute bank aggregation through direct PQC gRPC client path", async () => {
    const logic = `
const records = env.records;
return {
  total: records.length,
  hasBalances: records.some(r => r.balance > 0)
};
    `;
    const envelope = buildEnvelope(logic, "DirectBankAggregation");
    
    log.info("[E2E-Test] Invocando Bank con LiopClient...");
    const result = await client.callTool(
      { name: "Analyze_Synthetic_Bank_Transactions", arguments: {} },
      Buffer.from(envelope)
    );

    expect(result).toBeDefined();
    expect(result.isError).not.toBe(true);
    const text = extractText(result);
    expect(text).toContain("computation_result");
    expect(text).toContain("total");
    expect(text).toContain("hasBalances");
  });

  it("should execute oracle HFT market data average calculation", async () => {
    const logic = `
const ticks = env.records;
return {
  ticksCount: ticks.length,
  hasValidPrices: ticks.every(t => t.bestBid > 0 && t.bestAsk > t.bestBid)
};
    `;
    const envelope = buildEnvelope(logic, "DirectHftAnalysis");

    log.info("[E2E-Test] Invocando Oracle con LiopClient...");
    const result = await client.callTool(
      { name: "Analyze_HFT_Market_Data", arguments: {} },
      Buffer.from(envelope)
    );

    expect(result).toBeDefined();
    expect(result.isError).not.toBe(true);
    const text = extractText(result);
    expect(text).toContain("computation_result");
    expect(text).toContain("ticksCount");
    expect(text).toContain("hasValidPrices");
  });

  it("should execute vault patient diagnosis stats mapping", async () => {
    const logic = `
const patients = env.records;
return {
  patientsCount: patients.length,
  diagnoses: patients.map(p => p.diagnosis)
};
    `;
    const envelope = buildEnvelope(logic, "DirectMedicalStats");

    log.info("[E2E-Test] Invocando Vault con LiopClient...");
    const result = await client.callTool(
      { name: "Analyze_Synthetic_Medical_Records", arguments: {} },
      Buffer.from(envelope)
    );

    expect(result).toBeDefined();
    expect(result.isError).not.toBe(true);
    const text = extractText(result);
    expect(text).toContain("computation_result");
    expect(text).toContain("patientsCount");
    expect(text).toContain("diagnoses");
  });

  it("should block PII data exfiltration with Egress Shield", async () => {
    const logic = `
const records = env.records;
// Intento de exfiltrar informacion de dueños de cuenta (PII)
return {
  leak: records.map(r => ({ owner: r.ownerName, token: r.ownerId }))
};
    `;
    const envelope = buildEnvelope(logic, "AdversarialPiiExfiltration");

    log.info("[E2E-Test] Invocando Bank adversarial con LiopClient...");
    const result = await client.callTool(
      { name: "Analyze_Synthetic_Bank_Transactions", arguments: {} },
      Buffer.from(envelope)
    );

    expect(result).toBeDefined();
    // Debe reportarse como error debido al bloqueo del Egress Shield (Differential Privacy / PiiShield)
    expect(result.isError).toBe(true);
    const text = extractText(result);
    expect(text).toContain("BLOCK");
  });
});

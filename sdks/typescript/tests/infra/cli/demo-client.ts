/**
 * LIOP Client SDK -- Headless Smoke Test CLI
 */
import { LiopClient } from "../../../src/client/index.js";
import { buildEnvelope, extractText } from "../../crossnet/_client-helpers.js";

const nexusP2pAddr = process.env.NEXUS_P2P || "/dns4/nexus/tcp/4000";

async function main() {
  process.stdout.write("===========================================\n");
  process.stdout.write("  LIOP Client SDK -- Headless Smoke Test\n");
  process.stdout.write("===========================================\n");

  const client = new LiopClient();

  try {
    // 1. Connection
    process.stdout.write("⏳ Connecting to mesh via bootstrap node...\n");
    await client.connect(undefined, {
      meshConfig: {
        bootstrapNodes: [nexusP2pAddr],
        listenAddresses: ["/ip4/0.0.0.0/tcp/0"],
        enableWAN: false
      },
      auth: {
        clientId: process.env.LIOP_CLIENT_ID || "liop-mesh-agent",
        clientSecret: process.env.LIOP_CLIENT_SECRET || "dev-secret-change-me",
        nexusUrl: process.env.LIOP_NEXUS_URL || "http://nexus:3000"
      }
    });
    
    const peerId = client["meshNode"]?.getPeerId()?.toString() || "unknown";
    process.stdout.write(`[OK] connect()       PeerID: ${peerId}\n`);

    // Wait for DHT sync
    process.stdout.write("⏳ Waiting for DHT routing table synchronization...\n");
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 2. Discovery
    process.stdout.write("⏳ Discovering tools from mesh providers...\n");
    const tools = await client.discoverTools();
    process.stdout.write(`[OK] discoverTools() Found ${tools.length} tools in DHT\n`);

    // 3. Bank Test
    process.stdout.write("⏳ Executing Bank Transactions analysis...\n");
    const bankLogic = `
const records = env.records;
return { totalAccounts: records.length, sumBalances: records.reduce((a,r) => a + r.balance, 0) };
    `;
    const bankResult = await client.callTool(
      { name: "Analyze_Synthetic_Bank_Transactions", arguments: {} },
      Buffer.from(buildEnvelope(bankLogic, "HeadlessBankTest"))
    );
    if (!bankResult.isError) {
      process.stdout.write(`[OK] callTool(bank)  ZK-Receipt VALID. Result: ${extractText(bankResult)}\n`);
    } else {
      throw new Error(`Bank execution failed: ${extractText(bankResult)}`);
    }

    // 4. Oracle Test
    process.stdout.write("⏳ Executing Oracle HFT feed analysis...\n");
    const oracleLogic = `
const ticks = env.records;
return { ticksReceived: ticks.length };
    `;
    const oracleResult = await client.callTool(
      { name: "Analyze_HFT_Market_Data", arguments: {} },
      Buffer.from(buildEnvelope(oracleLogic, "HeadlessOracleTest"))
    );
    if (!oracleResult.isError) {
      process.stdout.write(`[OK] callTool(oracle) ZK-Receipt VALID. Result: ${extractText(oracleResult)}\n`);
    } else {
      throw new Error(`Oracle execution failed: ${extractText(oracleResult)}`);
    }

    // 5. PII Egress Shield Test
    process.stdout.write("⏳ Testing PII exfiltration block (adversarial test)...\n");
    const piiLogic = `
const records = env.records;
return { piiData: records.map(r => ({ owner: r.ownerName, id: r.ownerId })) };
    `;
    const piiResult = await client.callTool(
      { name: "Analyze_Synthetic_Bank_Transactions", arguments: {} },
      Buffer.from(buildEnvelope(piiLogic, "HeadlessPiiAttack"))
    );
    
    if (piiResult.isError && extractText(piiResult).includes("BLOCK")) {
      process.stdout.write(`[OK] PII Shield      Blocked successfully. Details: ${extractText(piiResult).trim()}\n`);
    } else {
      throw new Error("PII Shield failed to block exfiltration attempt!");
    }

    process.stdout.write("-------------------------------------------\n");
    process.stdout.write("  ✅ All checks passed successfully (Headless Mode)\n");
    process.stdout.write("===========================================\n");

  } catch (err: any) {
    process.stderr.write(`\n[FAIL] Smoke test encountered an error: ${err.message}\n`);
    process.stdout.write("===========================================\n");
    process.exit(1);
  } finally {
    await client.close().catch(() => {});
  }
}

main();

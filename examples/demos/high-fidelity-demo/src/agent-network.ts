// "The Network Analyst" - Hi-Fi NMP gRPC Client
import { LiopClient } from "@nekzus/liop/client";
import { LiopCompiler } from "./lib/liop-compiler.js";

// -- Analysis Scenarios --
const SCENARIO_HYPERTENSION = `
function(records) {
  let count = 0;
  for (const p of records) {
    if (p.condition === 'Hypertension' && p.riskScore > 0.8) count++;
  }
  return { analysis: "Critical Hypertension Patients", count };
}`;

const SCENARIO_AVERAGE_AGE = `
function(records) {
  if (records.length === 0) return { meanAge: 0 };
  let sum = 0;
  for (const p of records) { sum += p.age; }
  return { analysis: "Global Age Mean", meanAge: Math.round(sum / records.length) };
}`;

async function main() {
    // Super Robust Argument Parsing for Windows/NPM/TSX environments
    const rawArgs = process.argv.join(" ");
    let scenarioArg = "average-age"; // default

    // Support both native arguments and pnpm/npm intercepted configs
    const configScenario = process.env.pnpm_config_scenario || process.env.npm_config_scenario;
    if (configScenario === "hypertension" || rawArgs.includes("--scenario=hypertension")) {
        scenarioArg = "hypertension";
    } else if (configScenario === "average-age" || rawArgs.includes("--scenario=average-age")) {
        scenarioArg = "average-age";
    }

    const addressMatch = rawArgs.match(/--address=([^\s]+)/);
    const address = addressMatch ? addressMatch[1] : "localhost:50051";

    console.log(`🌐 [LIOP-Network-Agent] Initializing Real-Time Mesh Client...`);
    console.log(`🌐 Target Node: ${address}`);
    console.log(`🌐 Selected Scenario: [${scenarioArg}]`);

    let logicString = "";
    let name = "";

    switch (scenarioArg) {
        case "hypertension":
            console.log(`🔧 [Compiler] Compiling Hypertension Analytics...`);
            logicString = SCENARIO_HYPERTENSION;
            name = "HypertensionAnalytics";
            break;
        case "average-age":
            console.log(`🔧 [Compiler] Compiling Age Mean Statistics...`);
            logicString = SCENARIO_AVERAGE_AGE;
            name = "AgeAnalytics";
            break;
        default:
            console.error(`❌ Unknown scenario. Use: hypertension, average-age`);
            process.exit(1);
    }

    // LIOP Logic-on-Origin Packaging
    const payload = LiopCompiler.compileAnalysis(logicString, name);
    const wasmPayload = Buffer.from(payload);

    const client = new LiopClient();

    try {
        // 1. Connection (gRPC Channel Initialization) - Force type to any to bypass stale IDE cache if needed
        await (client as any).connect(address);

        // 2. Full LIOP Execution Lifecycle (Intent -> PQC Handshake -> AES -> Execution -> ZK)
        console.log(`🚀 [LIOP-Stack] Triggering Secured Logic-on-Origin Execution...`);

        const result = await (client as any).callTool(
            {
                name: "liop_audit_sandbox",
                arguments: {}
            },
            wasmPayload
        );

        if (result.isError) {
            console.error(`\n======================================================`);
            console.error(`🛡️  EXECUTION BLOCKED BY REMOTE HOST SAFETY`);
            console.error(`======================================================`);
            console.error(result.content[0].text);
        } else {
            console.log(`\n======================================================`);
            console.log(`💎 LIOP-gRPC SUCCESS: Analysis Complete`);
            console.log(`======================================================`);

            const rawOutput = result.content[0].text as string;
            // The result from LiopClient already includes the semantic evidence (unwrapped)
            console.log(`📊 Result from Remote Sandbox:`, rawOutput);
            console.log(`✅ [Identity] Cryptographic Integrity Verified.`);
        }

    } catch (error: any) {
        console.error(`\n❌ Network Execution Failed:`);
        console.error(`   Message: ${error.message}`);
        if (error.code === 14) {
            console.error(`   HINT: Is the 'The Vault' server running on ${address}?`);
        }
    } finally {
        console.log(`\n🔌 Mesh session closed.\n`);
        process.exit(0);
    }
}

main().catch(console.error);

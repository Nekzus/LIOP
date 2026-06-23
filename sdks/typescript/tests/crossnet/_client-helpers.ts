import { LiopClient } from "../../src/client/index.js";
import { log } from "../../src/utils/logger.js";
import { expect } from "vitest";

const nexusP2pAddr = process.env.NEXUS_P2P || "/dns4/nexus/tcp/4000";

export async function createTestClient(): Promise<LiopClient> {
  const client = new LiopClient();
  
  log.info(`[TestClient] Conectando a la malla mediante Bootstrap Node: ${nexusP2pAddr}`);
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

  return client;
}

export async function waitForDiscovery(
  client: LiopClient,
  minTools = 3,
  timeoutMs = 60000
): Promise<{ name: string; description?: string }[]> {
  const deadline = Date.now() + timeoutMs;
  log.info(`[TestClient] Esperando descubrimiento en DHT (min: ${minTools})...`);

  while (Date.now() < deadline) {
    try {
      const tools = await client.discoverTools();
      log.info(`[TestClient] Descubiertas ${tools.length} herramientas en esta iteracion.`);
      if (tools.length >= minTools) {
        return tools;
      }
    } catch (err) {
      log.warn(`[TestClient] Error en iteracion de descubrimiento: ${err}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`Excedido tiempo de espera para el descubrimiento de ${minTools} herramientas.`);
}

export function buildEnvelope(logic: string, moduleName = "ClientE2ELogic"): string {
  return [
    `@LIOP{wasi_v1,${moduleName}}`,
    logic.trim(),
    "@END",
  ].join("\n");
}

export function extractText(result: any): string {
  const content = result?.content;
  if (!Array.isArray(content) || content.length === 0) return "";
  const text = content[0]?.text;
  return typeof text === "string" ? text : "";
}

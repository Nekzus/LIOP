import { MeshNode } from "@nekzus/liop/mesh";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const identityPath = path.resolve(__dirname, "..", "data", "liop-identity.json");

console.log("Checking identity persistence...");
console.log(`Target path: ${identityPath}`);

const node = new MeshNode({
    identityPath: identityPath
});

try {
    console.log("Starting node...");
    await node.start();
    console.log("Node started successfully.");

    // Check if file exists
    try {
        console.log(`Checking for file: ${identityPath}`);
        await fs.access(identityPath);
        const data = await fs.readFile(identityPath, "utf-8");
        console.log("SUCCESS: Identity file found!");
        console.log("Content:", data);
    } catch (e: any) {
        console.error(`FAIL: Identity file NOT FOUND after start. Error: ${e.message}`);
    }

    await node.stop();
} catch (err) {
    console.error("Node start failed:", err);
} finally {
    process.exit(0);
}

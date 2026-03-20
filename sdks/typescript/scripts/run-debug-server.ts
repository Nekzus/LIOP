import { NmpServer } from "../src/index.js";
import { z } from "zod";

async function main() {
    const server = new NmpServer({
        name: "NmpServer-Debug",
        version: "1.1.0"
    });

    server.tool(
        "read_logs",
        "Read system logs",
        { path: z.string().optional() },
        async () => {
            return { content: [{ type: "text", text: "Log entry retrieved." }] };
        }
    );

    await server.connectToMesh({ port: 50051 });
    console.log("[DEBUG-SERVER] NMP gRPC Server running on port 50051");
}

main().catch(console.error);

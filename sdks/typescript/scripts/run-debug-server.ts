import { z } from "zod";
import { LiopServer } from "../src/index.js";

async function main() {
	const server = new LiopServer({
		name: "LiopServer-Debug",
		version: "1.1.0",
	});

	server.tool(
		"read_logs",
		"Read system logs",
		{ path: z.string().optional() },
		async () => {
			return { content: [{ type: "text", text: "Log entry retrieved." }] };
		},
	);

	await server.connectToMesh({ port: 50051 });
	console.log("[DEBUG-SERVER] LIOP gRPC Server running on port 50051");
}

main().catch(console.error);

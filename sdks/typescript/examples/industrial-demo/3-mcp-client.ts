export {};

async function main() {
	console.log("==================================================");
	console.log("👤 CLAUDE DESKTOP (Legacy MCP Client)");
	console.log("==================================================");

	console.log(
		"[Claude] 📡 Enviando petición JSON-RPC 'tools/call' a The Sentinel...",
	);

	// Un comando MCP puro y transparente (sin saber nada de P2P o ZK)
	const request = {
		jsonrpc: "2.0",
		id: 1,
		method: "tools/call",
		params: {
			name: "ProcessMedicalRecord",
			arguments: {
				patientId: "PATIENT-X-99882",
			},
		},
	};

	try {
		const t0 = Date.now();
		const response = await fetch("http://localhost:3000/mcp", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(request),
		});

		const result = await response.json();
		const t1 = Date.now();

		console.log(`\n[Claude] ✅ Respuesta recibida en ${t1 - t0}ms`);
		console.log("[Claude] -> Contenido:");
		console.log(JSON.stringify(result, null, 2));
	} catch (e: unknown) {
		const errorMessage = e instanceof Error ? e.message : String(e);
		console.error(`[Claude] ❌ Fallo la conexión: ${errorMessage}`);
	}
}

main().catch(console.error);

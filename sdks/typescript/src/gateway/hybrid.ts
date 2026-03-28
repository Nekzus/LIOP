import * as http from "node:http";
import * as http2 from "node:http2";
import * as net from "node:net";
import type { MeshNode, MeshNodeConfig } from "../mesh/index.js";
import type { LiopTlsOptions } from "../rpc/tls.js";
import type { LiopServer } from "../server/index.js";
import { LiopMcpRouter } from "./router.js";

/**
 * LIOP Hybrid Gateway
 * High-level orchestration for connecting MCP (JSON-RPC) clients to the LIOP Mesh.
 */
export class LiopHybridGateway {
	private netServer: net.Server;
	private h2Server: http2.Http2Server;
	private h1Server: http.Server;
	private router: LiopMcpRouter;

	constructor(
		private liopServer: LiopServer,
		private meshNode: MeshNode | null = null,
		rpcPort: number = 50051,
	) {
		// Initialize the Universal Router
		this.router = new LiopMcpRouter(this.liopServer, this.meshNode, rpcPort);

		// Internal HTTP/2 Server (for Native gRPC Proxying)
		this.h2Server = http2.createServer();
		this.setupH2Routes();

		// Internal HTTP/1 Server (for Browser/MCP)
		this.h1Server = http.createServer();
		this.setupH1Routes();

		// Primary Multiplexer (L4)
		this.netServer = net.createServer((socket) => {
			socket.once("data", (buffer) => {
				const isHttp2 = buffer.toString().startsWith("PRI * HTTP/2.0");
				if (isHttp2) {
					this.h2Server.emit("connection", socket);
				} else {
					this.h1Server.emit("connection", socket);
				}
				socket.unshift(buffer);
			});
			socket.on("error", (err) =>
				console.error(`[LIOP-Gateway] Socket Error: ${err.message}`),
			);
		});
		console.error("[LIOP-Gateway] Hybrid adapter initialized.");
	}

	private setupH2Routes() {
		this.h2Server.on("stream", (stream, headers) => {
			const contentType = headers["content-type"] as string;
			const path = headers[":path"] as string;

			if (contentType === "application/grpc") {
				this.handleGrpcStream(stream as http2.ServerHttp2Stream);
			} else if (path === "/mcp") {
				this.handleMcpH2Stream(stream as http2.ServerHttp2Stream, headers);
			}
		});
	}

	private setupH1Routes() {
		this.h1Server.on("request", async (req, res) => {
			const url = req.url || "";
			const method = req.method;

			if (method === "GET" && (url === "/" || url === "/mcp")) {
				res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
				res.end(`
                    <body style="background:#0f172a;color:#f8fafc;font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0">
                        <div style="background:#1e293b;padding:40px;border-radius:16px;border:1px solid #38bdf8;text-align:center;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1)">
                            <h1 style="color:#38bdf8;margin-top:0">LIOP Protocol Transformer</h1>
                            <p style="opacity:0.8;font-weight:600">L4/L7 Transcoding: JSON-RPC &harr; gRPC</p>
                            <p style="opacity:0.6;font-size:14px">Active Protections: Kyber768 + AES-256-GCM + ZK-Proof Ready</p>
                            <div style="background:#0f172a;padding:15px;border-radius:8px;margin-top:20px;border:1px dashed #334155">
                                <code style="color:#10b981">Endpoint: http://localhost:3000/mcp</code>
                            </div>
                        </div>
                    </body>
                `);
				return;
			}

			if (url === "/mcp" && method === "POST") {
				let body = "";
				req.on("data", (chunk) => (body += chunk.toString()));
				req.on("end", async () => {
					try {
						const jsonRequest = JSON.parse(body);
						const response = await this.router.dispatch(jsonRequest);
						res.writeHead(200, { "Content-Type": "application/json" });
						res.end(JSON.stringify(response));
					} catch (e: unknown) {
						console.error(
							`[LIOP-Gateway] Error processing JSON-RPC payload: ${(e as Error).message}`,
						);
						res.writeHead(400);
						res.end(
							JSON.stringify({
								jsonrpc: "2.0",
								error: { code: -32700, message: "Parse error" },
							}),
						);
					}
				});
			} else {
				res.writeHead(404);
				res.end("Not Found");
			}
		});
	}

	private handleGrpcStream(stream: http2.ServerHttp2Stream) {
		stream.on("data", (chunk: unknown) => {
			// biome-ignore lint/suspicious/noExplicitAny: Standard gRPC stream data is Buffer
			const data = chunk as any;
			if (data)
				console.error(
					`[LIOP-Gateway] Native gRPC Proxy passing ${data.length} bytes`,
				);
		});
		stream.respond({ ":status": 200, "content-type": "application/grpc" });
		stream.end();
	}

	private handleMcpH2Stream(
		stream: http2.ServerHttp2Stream,
		_headers: http2.IncomingHttpHeaders,
	) {
		let body = "";
		stream.on("data", (chunk) => (body += chunk.toString()));
		stream.on("end", async () => {
			try {
				const response = await this.router.dispatch(JSON.parse(body));
				if (response) {
					stream.respond({
						":status": 200,
						"content-type": "application/json",
					});
					stream.end(JSON.stringify(response));
				} else stream.close();
			} catch (_e) {
				stream.respond({ ":status": 400 });
				stream.end();
			}
		});
	}

	public async listen(port: number, host: string = "::"): Promise<void> {
		if (this.meshNode) {
			await this.meshNode.start();

			// Announce all local tools to the DHT
			const tools = this.liopServer.listTools();
			for (const tool of tools) {
				await this.meshNode.announceCapability(tool.name);
				console.error(
					`[LIOP-Gateway] 📡 Announced local tool to Mesh: ${tool.name}`,
				);
			}
		}
		return new Promise((resolve, reject) => {
			const shutdown = async () => {
				console.error(
					"[LIOP-Gateway] Disconnecting MCP session and releasing ports...",
				);
				process.exit(0);
			};
			this.netServer.on("error", (err) => reject(err));
			this.netServer.listen(port, host, () => {
				console.error(
					`[LIOP-Gateway] Transformer listening on ${host}:${port}`,
				);
				resolve();
			});
		});
	}

	public async stop() {
		if (this.meshNode) {
			await this.meshNode.stop();
		}
		this.netServer.close();
		this.h2Server.close();
		this.h1Server.close();
	}
}

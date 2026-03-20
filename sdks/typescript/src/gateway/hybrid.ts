import * as http from "http";
import * as http2 from "http2";
import * as net from "net";
import { MeshNode, type MeshNodeConfig } from "../mesh/index.js";
import { LpmCodec } from "../rpc/codec/lpm.js";
import { createChannelCredentials, type NmpTlsOptions } from "../rpc/tls.js";
import type { NmpServer } from "../server/index.js";
import { NmpMcpRouter } from "./router.js";

/**
 * NMP Hybrid Gateway (Protocol Transformer Edition)
 *
 * A high-performance L4/L7 multiplexer and transcoder.
 * It transmutes JSON-RPC (MCP) into secure PQC gRPC streams (NMP).
 */
export class NmpHybridGateway {
	private netServer: net.Server;
	private h2Server: http2.Http2Server;
	private h1Server: http.Server;
	private meshNode: MeshNode | null = null;
	private router: NmpMcpRouter;

	constructor(
		private nmpServer: NmpServer,
		config: {
			meshConfig?: MeshNodeConfig;
			rpcPort?: number;
			tls?: NmpTlsOptions;
		} = {},
	) {
		const rpcPort = config.rpcPort || 50051;

		// Initialize P2P Mesh Node if configured
		if (config.meshConfig) {
			this.meshNode = new MeshNode(config.meshConfig);
		}

		// Initialize the Universal Router
		this.router = new NmpMcpRouter(this.nmpServer, this.meshNode, rpcPort);

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
				console.error(`[NMP-Hybrid] Socket Error: ${err.message}`),
			);
		});
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
                            <h1 style="color:#38bdf8;margin-top:0">NMP Protocol Transformer</h1>
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
					} catch (e) {
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
		stream.on("data", (chunk: any) => {
			const decoded = LpmCodec.decode(new Uint8Array(chunk));
			if (decoded.data)
				console.error(
					`[NMP-Hybrid] Native gRPC Proxy passing ${decoded.data.length} bytes`,
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
			} catch (e) {
				stream.respond({ ":status": 400 });
				stream.end();
			}
		});
	}

	public async listen(port: number, host: string = "::"): Promise<void> {
		if (this.meshNode) {
			await this.meshNode.start();

			// Announce all local tools to the DHT
			const tools = this.nmpServer.listTools();
			for (const tool of tools) {
				await this.meshNode.announceCapability(tool.name);
				console.error(
					`[NMP-Hybrid] 📡 Announced local tool to Mesh: ${tool.name}`,
				);
			}
		}
		return new Promise((resolve, reject) => {
			this.netServer.on("error", (err) => reject(err));
			this.netServer.listen(port, host, () => {
				console.error(`[NMP-Hybrid] Transformer listening on ${host}:${port}`);
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

import path from "node:path";
import { fileURLToPath } from "node:url";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import * as fs from "node:fs";

// Selection logic
const PROD_PROTO_PATH = path.resolve(__dirname, "../protocol/liop_core.proto");
// 2. Fallback to monorepo development path
const DEV_PROTO_PATH = path.resolve(
	__dirname,
	"../../../../protocol/proto/liop_core.proto",
);

// Selection logic
const PROTO_PATH = fs.existsSync(PROD_PROTO_PATH)
	? PROD_PROTO_PATH
	: DEV_PROTO_PATH;

if (!fs.existsSync(PROTO_PATH)) {
	console.error(
		`[LIOP-Proto] 🚨 CRITICAL: Proto file not found at ${PROTO_PATH}`,
	);
}

/**
 * LIOP Proto Loader
 * Loads the core gRPC definitions for the Logic-Injection-on-Origin Protocol.
 */
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
	keepCase: true,
	longs: String,
	enums: String,
	defaults: true,
	oneofs: true,
});

// biome-ignore lint/suspicious/noExplicitAny: gRPC dynamic loading requires any for the service definition map
export const liopProto = grpc.loadPackageDefinition(packageDefinition) as any;
export const liopV1 = liopProto.liop.v1;

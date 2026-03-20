export {};

async function main() {
	const keys = (await import("@libp2p/crypto/keys")) as Record<string, unknown>;
	console.log("Available exports from @libp2p/crypto/keys:");
	console.log(Object.keys(keys));

	// Check for common reconstruction functions
	for (const fn of [
		"privateKeyFromRaw",
		"privateKeyFromProtobuf",
		"privateKeyFromBytes",
		"unmarshalPrivateKey",
		"keysPBM",
		"supportedKeys",
		"privateKeyFromEd25519",
		"generateKeyPairFromSeed",
		"privateKeyFromSeed",
		"Ed25519PrivateKey",
	]) {
		console.log(`  ${fn}: ${typeof keys[fn]}`);
	}
}

main();

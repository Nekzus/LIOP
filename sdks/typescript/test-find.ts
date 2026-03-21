import { MeshNode } from "./src/mesh/node.js";
import { sha256 } from "multiformats/hashes/sha2";
import { CID } from "multiformats/cid";

async function testDiscovery() {
	console.log("Starting diagnostic node...");
	const agentNode = new MeshNode({
        bootstrapNodes: ["/ip4/127.0.0.1/tcp/4000/p2p/12D3KooWJuxmCiAtYQwteHnSSGne6i85KwCN1Wdb7UVbzNYKeADZ"],
    });
	await agentNode.start();
	
	console.log("Agent started, peerId:", agentNode.getPeerId());
	console.log("Waiting 3 seconds for DHT warmup...");
	await new Promise(r => setTimeout(r, 3000));
	
	const NMP_MANIFEST_CAPABILITY = "nmp:manifest";
	const hash = await sha256.digest(new TextEncoder().encode(NMP_MANIFEST_CAPABILITY));
	const cid = CID.create(1, 0x55, hash);

	console.log(`Checking providers for capability ${NMP_MANIFEST_CAPABILITY} (CID: ${cid.toString()})...`);
	
	let count = 0;
    // @ts-ignore
	for await (const provider of agentNode.node.contentRouting.findProviders(cid)) {
		console.log(`FOUND PROVIDER: ${provider.id.toString()}`);
		count++;
	}

	console.log(`Total providers found: ${count}`);
	await agentNode.stop();
    process.exit(0);
}

testDiscovery().catch(console.error);

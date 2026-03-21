import { createLibp2p } from "libp2p";
import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import { tcp } from "@libp2p/tcp";
import { webSockets } from "@libp2p/websockets";
import { identify } from "@libp2p/identify";
import { kadDHT } from "@libp2p/kad-dht";
import { mplex } from "@libp2p/mplex";
import { bootstrap } from "@libp2p/bootstrap";
import { ping } from "@libp2p/ping";
import { multiaddr } from "@multiformats/multiaddr";
import { sha256 } from "multiformats/hashes/sha2";
import { CID } from "multiformats/cid";

async function run() {
    const node = await createLibp2p({
        transports: [webSockets(), tcp()],
        connectionEncrypters: [noise()],
        streamMuxers: [yamux(), mplex()],
        services: {
            identify: identify(),
            dht: kadDHT({
                protocol: "/ipfs/kad/1.0.0",
                clientMode: false,
                allowQueryWithZeroPeers: true,
            }),
            ping: ping()
        },
        peerDiscovery: [
            bootstrap({
                list: ["/ip4/127.0.0.1/tcp/4001/p2p/12D3KooWJuxmCiAtYQwteHnSSGne6i85KwCN1Wdb7UVbzNYKeADZ"]
            })
        ]
    });

    await node.start();
    console.log("Diagnostic Node Started:", node.peerId.toString());
    
    // Connect explicitly
    await node.dial(multiaddr("/ip4/127.0.0.1/tcp/4001/p2p/12D3KooWJuxmCiAtYQwteHnSSGne6i85KwCN1Wdb7UVbzNYKeADZ"));
    console.log("Connected to Nexus!");

    // Wait for identify
    await new Promise(r => setTimeout(r, 2000));

    const hash = await sha256.digest(new TextEncoder().encode("nmp:manifest"));
    const cid = CID.create(1, 0x55, hash);

    console.log("Finding providers for:", cid.toString());
    // @ts-ignore
    for await (const peer of node.services.dht.findProviders(cid)) {
        console.log("Found provider:", peer.id.toString());
    }

    console.log("Done.");
    await node.stop();
}
run().catch(console.error);

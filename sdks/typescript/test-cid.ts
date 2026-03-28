
import { CID } from "multiformats/cid";
import { sha256 } from "multiformats/hashes/sha2";

async function testCID() {
    const hash = "LIOP:manifest";
    const bytes = new TextEncoder().encode(hash);
    const hashBytes = await sha256.digest(bytes);
    const cid = CID.createV1(0x55, hashBytes);
    console.log(`Capability: ${hash}`);
    console.log(`CID: ${cid.toString()}`);
}

testCID();

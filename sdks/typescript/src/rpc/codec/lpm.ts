/**
 * NMP gRPC Length-Prefixed Message (LPM) Codec
 *
 * Implements the standard gRPC-over-HTTP2 framing:
 * [1 byte: Compressed Flag] [4 bytes: Message Length] [Data]
 */

// biome-ignore lint/complexity/noStaticOnlyClass: organizational class pattern
export class LpmCodec {
	/**
	 * Encodes a data buffer into a gRPC Length-Prefixed Message
	 */
	static encode(data: Uint8Array): Uint8Array {
		const result = new Uint8Array(5 + data.length);
		result[0] = 0; // Compressed flag

		const dv = new DataView(result.buffer);
		dv.setUint32(1, data.length); // Big-endian by default

		result.set(data, 5);
		return result;
	}

	/**
	 * Decodes a gRPC Length-Prefixed Message from a buffer
	 * Returns the data and the remaining buffer
	 */
	static decode(buffer: Uint8Array): {
		data: Uint8Array | null;
		remaining: Uint8Array;
	} {
		if (buffer.length < 5) return { data: null, remaining: buffer };

		const dv = new DataView(
			buffer.buffer,
			buffer.byteOffset,
			buffer.byteLength,
		);
		const length = dv.getUint32(1);

		if (buffer.length < 5 + length) {
			return { data: null, remaining: buffer };
		}

		const data = buffer.slice(5, 5 + length);
		const remaining = buffer.slice(5 + length);

		return { data, remaining };
	}
}

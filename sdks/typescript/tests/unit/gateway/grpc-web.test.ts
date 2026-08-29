import { EventEmitter } from "node:events";
import type * as http from "node:http";
import { describe, expect, it } from "vitest";
import {
	GRPC_WEB_CONSTANTS,
	decodeFrames,
	dispatchGrpcWebRequest,
	encodeDataFrame,
	encodeTrailerFrame,
	isGrpcWebRequest,
} from "../../../src/gateway/grpc-web.js";

describe("gRPC-Web Framing Adapter (HTTP/1.1 Fallback)", () => {
	it("should correctly identify gRPC-Web content types", () => {
		expect(isGrpcWebRequest("application/grpc-web")).toBe(true);
		expect(isGrpcWebRequest("application/grpc-web+proto")).toBe(true);
		expect(isGrpcWebRequest("application/grpc-web+json")).toBe(true);
		expect(isGrpcWebRequest("application/json")).toBe(false);
		expect(isGrpcWebRequest("text/plain")).toBe(false);
		expect(isGrpcWebRequest(undefined)).toBe(false);
	});

	it("should encode a data frame with standard 5-byte prefix (Flag 0x00)", () => {
		const payload = Buffer.from("test payload", "utf-8");
		const framed = encodeDataFrame(payload);

		expect(framed.length).toBe(5 + payload.length);
		expect(framed.readUInt8(0)).toBe(GRPC_WEB_CONSTANTS.FLAG_DATA); // 0x00
		expect(framed.readUInt32BE(1)).toBe(payload.length);
		expect(framed.subarray(5).toString("utf-8")).toBe("test payload");
	});

	it("should encode a trailer frame with standard 5-byte prefix (Flag 0x80)", () => {
		const framed = encodeTrailerFrame(
			GRPC_WEB_CONSTANTS.STATUS_OK,
			"Success",
			{ "x-custom-trailer": "liop-mesh" },
		);

		expect(framed.readUInt8(0)).toBe(GRPC_WEB_CONSTANTS.FLAG_TRAILERS); // 0x80
		const trailerLength = framed.readUInt32BE(1);
		const trailerText = framed.subarray(5, 5 + trailerLength).toString("utf-8");

		expect(trailerText).toContain("grpc-status:0");
		expect(trailerText).toContain("grpc-message:Success");
		expect(trailerText).toContain("x-custom-trailer:liop-mesh");
	});

	it("should round-trip encode and decode data and trailer frames", () => {
		const data1 = encodeDataFrame(Buffer.from("message 1"));
		const data2 = encodeDataFrame(Buffer.from("message 2"));
		const trailers = encodeTrailerFrame(
			GRPC_WEB_CONSTANTS.STATUS_OK,
			"Completed",
		);

		const stream = Buffer.concat([data1, data2, trailers]);
		const frames = decodeFrames(stream);

		expect(frames.length).toBe(3);
		expect(frames[0].isTrailer).toBe(false);
		expect(frames[0].payload.toString("utf-8")).toBe("message 1");

		expect(frames[1].isTrailer).toBe(false);
		expect(frames[1].payload.toString("utf-8")).toBe("message 2");

		expect(frames[2].isTrailer).toBe(true);
		expect(frames[2].payload.toString("utf-8")).toContain("grpc-status:0");
	});

	it("should dispatch gRPC-Web request and write framed response", async () => {
		const requestPayload = encodeDataFrame(Buffer.from("client request"));

		const mockReq = new EventEmitter() as http.IncomingMessage;
		mockReq.url = "/liop.LiopService/Intent";

		const writtenChunks: Buffer[] = [];
		const headers: Record<string, string> = {};
		let finished = false;

		const mockRes = {
			statusCode: 0,
			setHeader: (name: string, value: string) => {
				headers[name.toLowerCase()] = value;
			},
			write: (chunk: Buffer) => {
				writtenChunks.push(chunk);
			},
			end: () => {
				finished = true;
			},
		} as unknown as http.ServerResponse;

		const dispatchPromise = dispatchGrpcWebRequest(
			mockReq,
			mockRes,
			async (path, payload) => {
				expect(path).toBe("/liop.LiopService/Intent");
				expect(payload.toString("utf-8")).toBe("client request");
				return {
					status: GRPC_WEB_CONSTANTS.STATUS_OK,
					message: "OK",
					data: Buffer.from("response data"),
				};
			},
		);

		// Emit request chunks
		mockReq.emit("data", requestPayload);
		mockReq.emit("end");

		await dispatchPromise;

		expect(mockRes.statusCode).toBe(200);
		expect(headers["content-type"]).toBe("application/grpc-web+proto");
		expect(finished).toBe(true);

		const fullResponse = Buffer.concat(writtenChunks);
		const responseFrames = decodeFrames(fullResponse);

		expect(responseFrames.length).toBe(2);
		expect(responseFrames[0].isTrailer).toBe(false);
		expect(responseFrames[0].payload.toString("utf-8")).toBe("response data");

		expect(responseFrames[1].isTrailer).toBe(true);
		expect(responseFrames[1].payload.toString("utf-8")).toContain("grpc-status:0");
	});
});

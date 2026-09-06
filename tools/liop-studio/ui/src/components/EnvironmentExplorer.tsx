import {
	AlertTriangle,
	CheckCircle2,
	Code2,
	Copy,
	Database,
	Layers,
	ShieldAlert,
	ShieldCheck,
	X,
} from "lucide-react";
import type React from "react";
import { useState } from "react";

export interface EnvironmentExplorerProps {
	isOpen: boolean;
	onClose: () => void;
	toolName: string;
}

interface FieldDefinition {
	name: string;
	type: string;
	description: string;
	example: string | number | boolean;
}

const TOOL_SCHEMAS: Record<
	string,
	{
		recordType: string;
		fields: FieldDefinition[];
		sampleRecord: Record<string, unknown>;
	}
> = {
	get_account_balances: {
		recordType: "BankAccountRecord",
		fields: [
			{
				name: "id",
				type: "string",
				description: "Unique account identifier",
				example: "ACC-90412",
			},
			{
				name: "accountType",
				type: "'checking' | 'savings' | 'investment'",
				description: "Classification of deposit account",
				example: "checking",
			},
			{
				name: "balance",
				type: "number",
				description: "Current cleared balance in account currency",
				example: 148500.5,
			},
			{
				name: "currency",
				type: "string",
				description: "ISO 4217 three-letter currency code",
				example: "USD",
			},
			{
				name: "status",
				type: "'ACTIVE' | 'FROZEN' | 'DORMANT'",
				description: "Operational status of account ledger",
				example: "ACTIVE",
			},
		],
		sampleRecord: {
			id: "ACC-90412",
			accountType: "checking",
			balance: 148500.5,
			currency: "USD",
			status: "ACTIVE",
		},
	},
	get_patient_records: {
		recordType: "ClinicalPatientRecord",
		fields: [
			{
				name: "id",
				type: "string",
				description: "Confidential patient identifier (Protected Health Info)",
				example: "PT-77120",
			},
			{
				name: "diagnosis",
				type: "string",
				description: "Clinical ICD-10 pathology description",
				example: "Type 2 Diabetes Mellitus",
			},
			{
				name: "riskLevel",
				type: "'LOW' | 'MED' | 'HIGH' | 'CRITICAL'",
				description: "Triage risk assessment score",
				example: "HIGH",
			},
			{
				name: "systolicBp",
				type: "number",
				description: "Systolic blood pressure (mmHg)",
				example: 142,
			},
			{
				name: "diastolicBp",
				type: "number",
				description: "Diastolic blood pressure (mmHg)",
				example: 88,
			},
		],
		sampleRecord: {
			id: "PT-77120",
			diagnosis: "Type 2 Diabetes Mellitus",
			riskLevel: "HIGH",
			systolicBp: 142,
			diastolicBp: 88,
		},
	},
	get_market_depth: {
		recordType: "MarketDepthTick",
		fields: [
			{
				name: "symbol",
				type: "string",
				description: "Ticker trading instrument",
				example: "BTC-USDT",
			},
			{
				name: "timestamp",
				type: "number",
				description: "Epoch millisecond of tick",
				example: 1788700800000,
			},
			{
				name: "bestBid",
				type: "number",
				description: "Highest current buy order price",
				example: 64250.0,
			},
			{
				name: "bestAsk",
				type: "number",
				description: "Lowest current sell order price",
				example: 64251.5,
			},
			{
				name: "spreadBps",
				type: "number",
				description: "Calculated spread in basis points",
				example: 2.33,
			},
			{
				name: "volume",
				type: "number",
				description: "Aggregated book volume in contracts",
				example: 14.82,
			},
		],
		sampleRecord: {
			symbol: "BTC-USDT",
			timestamp: 1788700800000,
			bestBid: 64250.0,
			bestAsk: 64251.5,
			spreadBps: 2.33,
			volume: 14.82,
		},
	},
	read_telemetry_stream: {
		recordType: "IndustrialTelemetryRecord",
		fields: [
			{
				name: "sensorId",
				type: "string",
				description: "Industrial IoT edge transducer ID",
				example: "SENS-Turbine-04",
			},
			{
				name: "temperatureCelsius",
				type: "number",
				description: "Thermal reading in Celsius",
				example: 84.6,
			},
			{
				name: "pressureHpa",
				type: "number",
				description: "Barometric chamber pressure",
				example: 1013.2,
			},
			{
				name: "vibrationRms",
				type: "number",
				description: "RMS acceleration in mm/s",
				example: 4.8,
			},
			{
				name: "alertStatus",
				type: "boolean",
				description: "Hardware trip latch boolean",
				example: false,
			},
		],
		sampleRecord: {
			sensorId: "SENS-Turbine-04",
			temperatureCelsius: 84.6,
			pressureHpa: 1013.2,
			vibrationRms: 4.8,
			alertStatus: false,
		},
	},
};

const ALLOWED_APIS = [
	{
		category: "Array Transformations",
		methods: "map, filter, reduce, forEach, find, some, every, slice, length",
	},
	{
		category: "Mathematical Primitives",
		methods:
			"Math.max, Math.min, Math.round, Math.floor, Math.ceil, Math.abs, Math.sqrt",
	},
	{
		category: "Object Manipulation",
		methods: "Object.keys, Object.values, Object.entries, Object.assign",
	},
	{
		category: "Serialization",
		methods: "JSON.stringify, JSON.parse",
	},
	{
		category: "String & Numerical Primitives",
		methods: "Number.isFinite, String.slice, String.includes, Number.toFixed",
	},
];

const BLOCKED_APIS = [
	{
		category: "Network Egress",
		items: "fetch(), XMLHttpRequest, WebSocket, dgram, net",
		reason: "Prevents exfiltration of confidential origin data",
	},
	{
		category: "Filesystem & OS",
		items: "fs, process, child_process, __dirname, Deno, Bun",
		reason: "Enforces V8 Isolate sandboxing with zero host access",
	},
	{
		category: "Dynamic Execution",
		items: "eval(), Function(), WebAssembly.compileStreaming",
		reason: "Guarantees deterministic AST compilation and fuel limits",
	},
	{
		category: "Timing & Asynchrony",
		items: "setTimeout, setInterval, queueMicrotask",
		reason: "Mitigates timing side-channel attacks and race conditions",
	},
];

export const EnvironmentExplorer: React.FC<EnvironmentExplorerProps> = ({
	isOpen,
	onClose,
	toolName,
}) => {
	const [activeTab, setActiveTab] = useState<"fields" | "sample" | "sandbox">(
		"fields",
	);
	const [copied, setCopied] = useState(false);

	if (!isOpen) return null;

	const schema = TOOL_SCHEMAS[toolName] ?? {
		recordType: "DynamicOriginRecord",
		fields: [
			{
				name: "id",
				type: "string",
				description: "Unique entity record identifier",
				example: "REC-001",
			},
			{
				name: "value",
				type: "number | string | object",
				description: "Payload data attribute",
				example: 100,
			},
		],
		sampleRecord: {
			id: "REC-001",
			value: 100,
			timestamp: Date.now(),
		},
	};

	const copySample = async () => {
		const text = JSON.stringify(schema.sampleRecord, null, 2);
		try {
			await navigator.clipboard.writeText(text);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch (_e) {
			// Fallback
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
			<div className="w-full max-w-3xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
				{/* Modal Header */}
				<div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-surface1">
					<div className="flex items-center gap-2">
						<div className="p-1.5 rounded-md bg-secondary text-primary">
							<Layers className="h-4 w-4" />
						</div>
						<div>
							<h3 className="text-xs font-bold text-white tracking-wide uppercase font-mono">
								Runtime Environment & Schema Inspector
							</h3>
							<p className="text-[11px] text-zinc-400">
								Confidential dataset shape and WASI sandbox constraints for{" "}
								<span className="font-mono text-cyan-300">{toolName}</span>
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="text-zinc-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
						title="Close Inspector"
					>
						<X className="h-4 w-4" />
					</button>
				</div>

				{/* Tabs Navigation */}
				<div className="flex items-center justify-between px-5 py-2.5 bg-background border-b border-border/60">
					<div className="flex items-center gap-1.5 p-0.5 bg-surface1 border border-border/80 rounded-lg">
						<button
							type="button"
							onClick={() => setActiveTab("fields")}
							className={`text-xs px-3 py-1 rounded-md font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
								activeTab === "fields"
									? "bg-primary text-black font-semibold shadow-sm"
									: "text-zinc-400 hover:text-white"
							}`}
						>
							<Database className="h-3.5 w-3.5" />
							<span>Record Schema</span>
						</button>
						<button
							type="button"
							onClick={() => setActiveTab("sample")}
							className={`text-xs px-3 py-1 rounded-md font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
								activeTab === "sample"
									? "bg-primary text-black font-semibold shadow-sm"
									: "text-zinc-400 hover:text-white"
							}`}
						>
							<Code2 className="h-3.5 w-3.5" />
							<span>Sample JSON Record</span>
						</button>
						<button
							type="button"
							onClick={() => setActiveTab("sandbox")}
							className={`text-xs px-3 py-1 rounded-md font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
								activeTab === "sandbox"
									? "bg-primary text-black font-semibold shadow-sm"
									: "text-zinc-400 hover:text-white"
							}`}
						>
							<ShieldCheck className="h-3.5 w-3.5" />
							<span>WASI Sandbox Rules</span>
						</button>
					</div>

					{activeTab === "sample" && (
						<button
							type="button"
							onClick={copySample}
							className="text-xs flex items-center gap-1.5 px-3 py-1 rounded-md font-medium border border-border bg-surface1 text-zinc-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
						>
							<Copy className="h-3.5 w-3.5" />
							<span>{copied ? "Copied" : "Copy Sample"}</span>
						</button>
					)}
				</div>

				{/* Content Body */}
				<div className="flex-1 min-h-[320px] overflow-auto p-5 bg-card">
					{activeTab === "fields" && (
						<div className="space-y-4">
							<div className="flex items-center justify-between pb-2 border-b border-border/50 text-xs">
								<span className="text-zinc-400">
									Variable Injected in Sandbox:{" "}
									<code className="text-primary font-mono font-semibold">
										env.records: {schema.recordType}[]
									</code>
								</span>
								<span className="text-zinc-500 font-mono">
									{schema.fields.length} Available Properties
								</span>
							</div>

							<div className="border border-border rounded-lg overflow-hidden">
								<table className="w-full text-left text-xs font-mono">
									<thead className="bg-surface1 text-zinc-400 border-b border-border text-[11px] uppercase tracking-wider">
										<tr>
											<th className="px-3.5 py-2">Field</th>
											<th className="px-3.5 py-2">Type</th>
											<th className="px-3.5 py-2">Description</th>
											<th className="px-3.5 py-2">Sample</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-border/60 bg-background/50">
										{schema.fields.map((field) => (
											<tr
												key={field.name}
												className="hover:bg-white/5 transition-colors"
											>
												<td className="px-3.5 py-2 font-bold text-white">
													{field.name}
												</td>
												<td className="px-3.5 py-2 text-cyan-300">
													{field.type}
												</td>
												<td className="px-3.5 py-2 text-zinc-300 font-sans text-xs">
													{field.description}
												</td>
												<td className="px-3.5 py-2 text-amber-300">
													{JSON.stringify(field.example)}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>

							<div className="p-3 rounded-lg bg-surface1 border border-border flex items-start gap-2.5 text-xs text-zinc-300">
								<CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
								<div>
									<span className="font-semibold text-white">
										Aggregated Execution Tip:
									</span>{" "}
									Compute your statistical aggregates inside your logic module
									using{" "}
									<code className="text-primary font-mono">
										env.records.reduce(...)
									</code>
									. Avoid returning raw row collections to comply with the
									Egress PII Shield.
								</div>
							</div>
						</div>
					)}

					{activeTab === "sample" && (
						<div className="space-y-3">
							<div className="text-xs text-zinc-400">
								Simulated single record payload injected into origin memory:
							</div>
							<div className="bg-editor border border-border rounded-lg p-4 font-mono text-xs text-[#7dd3fc] overflow-auto">
								<pre>{JSON.stringify(schema.sampleRecord, null, 2)}</pre>
							</div>
						</div>
					)}

					{activeTab === "sandbox" && (
						<div className="space-y-4">
							{/* Allowed APIs */}
							<div>
								<h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wide font-mono flex items-center gap-1.5 mb-2">
									<ShieldCheck className="h-4 w-4" />
									<span>Authorized APIs (Layer 1 Guardian Allowlist)</span>
								</h4>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
									{ALLOWED_APIS.map((api) => (
										<div
											key={api.category}
											className="p-2.5 rounded-md bg-surface1 border border-border/80 text-xs"
										>
											<div className="font-semibold text-white mb-1">
												{api.category}
											</div>
											<div className="font-mono text-[11px] text-zinc-400">
												{api.methods}
											</div>
										</div>
									))}
								</div>
							</div>

							{/* Blocked APIs */}
							<div>
								<h4 className="text-xs font-bold text-rose-400 uppercase tracking-wide font-mono flex items-center gap-1.5 mb-2">
									<ShieldAlert className="h-4 w-4" />
									<span>Blocked Primitives (Enforced V8 Sandbox)</span>
								</h4>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
									{BLOCKED_APIS.map((api) => (
										<div
											key={api.category}
											className="p-2.5 rounded-md bg-rose-500/5 border border-rose-500/20 text-xs"
										>
											<div className="font-semibold text-rose-200 mb-0.5 flex items-center justify-between">
												<span>{api.category}</span>
												<AlertTriangle className="h-3 w-3 text-rose-400" />
											</div>
											<div className="font-mono text-[11px] text-rose-300/80 mb-1">
												{api.items}
											</div>
											<div className="text-[10px] text-zinc-400 font-sans">
												{api.reason}
											</div>
										</div>
									))}
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Modal Footer Note */}
				<div className="px-5 py-2.5 bg-surface1 border-t border-border flex items-center justify-between text-[11px] text-zinc-400 font-mono">
					<span>PCI-DSS & HIPAA Enclave Isolation</span>
					<span className="text-primary">WASI Runtime: wasi_v1</span>
				</div>
			</div>
		</div>
	);
};

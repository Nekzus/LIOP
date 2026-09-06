import { motion } from "framer-motion";
import {
	Activity,
	AlertTriangle,
	Bug,
	Check,
	CheckCircle2,
	Code,
	Copy,
	Cpu,
	Database,
	FileCode,
	Fingerprint,
	Fuel,
	Globe,
	Layers,
	Loader2,
	Moon,
	Play,
	RefreshCw,
	RotateCcw,
	Search,
	Server,
	ShieldBan,
	ShieldCheck,
	Terminal,
	Waypoints,
	X,
	XCircle,
	Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CodeExportModal } from "./components/CodeExportModal";
import { DynamicToolForm } from "./components/DynamicToolForm";
import { EnvironmentExplorer } from "./components/EnvironmentExplorer";
import { TargetConnectionBar } from "./components/TargetConnectionBar";
import { Alert, AlertDescription, AlertTitle } from "./components/ui/alert";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
} from "./components/ui/card";
import { ScrollArea } from "./components/ui/scroll-area";
import { Tabs, TabsContent } from "./components/ui/tabs";

// Official LIOP Protocol Vector Mark (Regular Octagon with core origin node and 8 logic injection waves)
function LiopLogo({
	className = "h-8 w-8 text-primary",
}: {
	className?: string;
}) {
	return (
		<svg
			className={className}
			viewBox="0 0 120 120"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<title>LIOP Protocol Logo</title>
			<g
				stroke="currentColor"
				strokeWidth="6"
				strokeLinecap="round"
				strokeLinejoin="round"
				fill="none"
			>
				<polygon points="100,76.57 76.57,100 43.43,100 20,76.57 20,43.43 43.43,20 76.57,20 100,43.43" />
				<circle cx="60" cy="60" r="10" fill="currentColor" stroke="none" />
				<path d="M 60 60 C 60 45, 100 75, 100 60" />
				<path
					d="M 60 60 C 60 45, 100 75, 100 60"
					transform="rotate(45 60 60)"
				/>
				<path
					d="M 60 60 C 60 45, 100 75, 100 60"
					transform="rotate(90 60 60)"
				/>
				<path
					d="M 60 60 C 60 45, 100 75, 100 60"
					transform="rotate(135 60 60)"
				/>
				<path
					d="M 60 60 C 60 45, 100 75, 100 60"
					transform="rotate(180 60 60)"
				/>
				<path
					d="M 60 60 C 60 45, 100 75, 100 60"
					transform="rotate(225 60 60)"
				/>
				<path
					d="M 60 60 C 60 45, 100 75, 100 60"
					transform="rotate(270 60 60)"
				/>
				<path
					d="M 60 60 C 60 45, 100 75, 100 60"
					transform="rotate(315 60 60)"
				/>
			</g>
		</svg>
	);
}

interface Tool {
	name: string;
	description?: string;
	providerNode?: string;
	tier?: 1 | 2 | 3;
	domain?: string;
	taxonomy?: {
		domain?: string;
		clearanceTier?: string | number;
		executionTypes?: string[];
	};
	inputSchema?: unknown;
}

interface NetworkInfo {
	status: string;
	peerId: string;
	peersCount: number;
	role: string;
	address: string;
	version?: string;
	toolsCount?: number;
	nodesOnline?: number;
	totalNodes?: number;
}

interface ScannedNode {
	id: string;
	name: string;
	tier: 1 | 2 | 3;
	tierLabel: string;
	host: string;
	ports: { http: number; p2p?: number; grpc?: number };
	role: string;
	isolation: string;
	dataset?: string;
	status: "online" | "offline" | "degraded";
	rttMs: number;
	peerId: string;
	multiaddrs: string[];
	tools: string[];
	version: string;
	error?: string;
}

interface ScanSummary {
	totalNodes: number;
	onlineNodes: number;
	offlineNodes: number;
	byTier: {
		tier1: number;
		tier2: number;
		tier3: number;
	};
	avgLatencyMs: number;
	lastScanTime: string;
}

interface TimelineStep {
	phase: string;
	label: string;
	detail: string;
	status: "pending" | "running" | "success" | "failed";
	durationMs?: number;
}

interface ExecutionMeta {
	latencyMs?: number;
	tool?: string;
	verifiedZk?: boolean;
	zkHash?: string;
	shieldBlocked?: boolean;
	telemetry?: {
		fuel?: {
			consumed: number;
			maxLimit: number;
			percentUsed: number;
			deterministicAst: boolean;
		};
		tokens?: {
			inputTokens: number;
			outputTokens: number;
			totalTokens: number;
			traditionalContextTokens: number;
			savingsPercent: number;
			estimatorName: string;
			otelEmitted: boolean;
		};
		bandwidth?: {
			payloadBytes: number;
			rawDatasetProtectedBytes: number;
			egressReductionPercent: number;
		};
		proof?: {
			zkReceiptHash: string;
			pqcSuite: string;
			sealingCipher: string;
			wasiSandboxIsolation: string;
			timingSideChannelProtection: string;
		};
		phases?: {
			discoveryMs?: number;
			pqcMs?: number;
			sealingMs?: number;
			wasiSandboxMs?: number;
			zkVerificationMs?: number;
			totalLatencyMs: number;
		};
	};
}

// Canonical Reference Logic Templates
const CANONICAL_TEMPLATES = [
	{
		id: "hft",
		name: "Market Analysis",
		tool: "Analyze_HFT_Market_Data",
		domain: "Financial HFT",
		clearanceTier: "Tier 2",
		description:
			"Computes VWAP and average HFT spreads with differential privacy utility preservation.",
		code: `@LIOP{wasi_v1, HftAnalysis}
const ticks = env.records;
// Calculate VWAP and average bid/ask spreads
let sumPriceVol = 0;
let sumVol = 0;
let sumSpread = 0;

for (let i = 0; i < ticks.length; i++) {
  const t = ticks[i];
  const price = (t.bestBid + t.bestAsk) / 2;
  sumPriceVol += price * t.volume;
  sumVol += t.volume;
  sumSpread += (t.bestAsk - t.bestBid);
}

return {
  ticksProcessed: ticks.length,
  vwap: sumVol > 0 ? sumPriceVol / sumVol : 0,
  avgSpreadBps: ticks.length > 0 ? (sumSpread / ticks.length) * 10000 : 0
};
@END`,
	},
	{
		id: "bank",
		name: "Bank Aggregation",
		tool: "Analyze_Synthetic_Bank_Transactions",
		domain: "Core Banking",
		clearanceTier: "Tier 1",
		description:
			"Aggregates balances and account type distributions under zero-trust data sovereignty.",
		code: `@LIOP{wasi_v1, BankAnalysis}
const records = env.records;
// Sum balances and count account types with data sovereignty
const stats = records.reduce((acc, row) => {
  acc.totalBalance += (row.balance || 0);
  acc.accountsByType[row.accountType] = (acc.accountsByType[row.accountType] || 0) + 1;
  return acc;
}, { totalBalance: 0, accountsByType: {} });

return {
  totalAccounts: records.length,
  totalBalance: Number(stats.totalBalance.toFixed(2)),
  averageBalance: records.length > 0 ? Number((stats.totalBalance / records.length).toFixed(2)) : 0,
  distribution: stats.accountsByType
};
@END`,
	},
	{
		id: "vault",
		name: "Medical Stats",
		tool: "Analyze_Synthetic_Medical_Records",
		domain: "Healthcare",
		clearanceTier: "Tier 1",
		description:
			"Anonymized diagnostic distributions and mean patient age calculation.",
		code: `@LIOP{wasi_v1, MedicalStats}
const patients = env.records;
// Analyze diagnosis distribution and mean patient age
const stats = patients.reduce((acc, p) => {
  acc.diagnoses[p.diagnosis] = (acc.diagnoses[p.diagnosis] || 0) + 1;
  acc.totalAge += (p.age || 0);
  return acc;
}, { diagnoses: {}, totalAge: 0 });

return {
  totalPatients: patients.length,
  averageAge: patients.length > 0 ? Number((stats.totalAge / patients.length).toFixed(1)) : 0,
  diagnosesDistribution: stats.diagnoses
};
@END`,
	},
	{
		id: "blg_perimeter",
		name: "Enclave Perimeter",
		tool: "BLG_Inspect_Enclave_Perimeter",
		domain: "Perimeter Security",
		clearanceTier: "Tier 2",
		description:
			"Audits the physical subnets, pnet PSK isolation, and 6-layer zero-trust defense of Tier 1.",
		code: `@LIOP{wasi_v1, PerimeterAudit}
// Audits physical subnet boundaries and cryptographic isolation status
return {
  target: "Tier 1 Sovereign Enclave",
  protocol: "LIOP Multi-Tier Zero-Trust",
  layerAudit: [
    "Layer 1: Guardian AST",
    "Layer 2: WASI Sandbox",
    "Layer 3: Taint Analyzer (IFC)",
    "Layer 4: Egress PII Shield",
    "Layer 5: Aggregation-First Policy",
    "Layer 6: ZK-Receipt (HMAC-SHA256)",
    "Transport: pnet Swarm Key (PSK)"
  ]
};
@END`,
	},
	{
		id: "pii_attack",
		name: "PII Attack",
		tool: "Analyze_Synthetic_Bank_Transactions",
		domain: "Adversarial",
		clearanceTier: "Exfiltration Trap",
		description:
			"Adversarial attempt to exfiltrate individual raw rows (Intercepted by Egress Shield).",
		code: `@LIOP{wasi_v1, PiiAttack}
const records = env.records;
// Attempt to exfiltrate individual raw records
// This will be intercepted and blocked by the Egress PII Shield
return {
  confidentialData: records.map(r => ({
    name: r.accountHolder || r.ownerName,
    id: r.id || r.ownerId,
    balance: r.balance
  }))
};
@END`,
	},
	{
		id: "iot",
		name: "IoT Telemetry",
		tool: "Analyze_IoT_Sensor_Data",
		domain: "Industrial IoT",
		clearanceTier: "Tier 2",
		description:
			"Aggregates edge sensor metrics (temperature, vibration, status) under hostile WAN/3G latency.",
		code: `@LIOP{wasi_v1, IoTTelemetry}
const records = env.records;
// Aggregate industrial sensor telemetry on edge node
let sumTemp = 0;
let maxTemp = -999;
let criticalAlerts = 0;
const distribution = {};

for (let i = 0; i < records.length; i++) {
  const r = records[i];
  sumTemp += (r.temperatureCelsius || 0);
  if (r.temperatureCelsius > maxTemp) maxTemp = r.temperatureCelsius;
  if (r.status === "CRITICAL") criticalAlerts++;
  distribution[r.status] = (distribution[r.status] || 0) + 1;
}

return {
  totalSamples: records.length,
  avgTemperature: records.length > 0 ? Number((sumTemp / records.length).toFixed(1)) : 0,
  maxTemperature: Number(maxTemp.toFixed(1)),
  criticalCount: criticalAlerts,
  statusDistribution: distribution
};
@END`,
	},
];

export default function App() {
	// Theme state
	const [theme, setTheme] = useState<"obsidian" | "slate">(() => {
		return (
			(localStorage.getItem("liop_playground_theme") as "obsidian" | "slate") ||
			"obsidian"
		);
	});

	useEffect(() => {
		document.documentElement.setAttribute("data-theme", theme);
		document.documentElement.classList.remove("theme-obsidian", "theme-slate");
		document.documentElement.classList.add(`theme-${theme}`);
		localStorage.setItem("liop_playground_theme", theme);
	}, [theme]);

	// Network & tools state
	const [network, setNetwork] = useState<NetworkInfo | null>(null);
	const [tools, setTools] = useState<Tool[]>([]);
	const [nodes, setNodes] = useState<ScannedNode[]>([]);
	const [scanSummary, setScanSummary] = useState<ScanSummary | null>(null);

	// Dynamic topology stats (derived from live scan, fallback to health, zero hardcoding)
	const totalNodes =
		scanSummary?.totalNodes ?? network?.totalNodes ?? nodes.length;
	const onlineNodes =
		scanSummary?.onlineNodes ??
		network?.nodesOnline ??
		nodes.filter((n) => n.status === "online").length;
	const hasNodeStats = totalNodes > 0;

	const [searchQuery, setSearchQuery] = useState("");
	const [selectedTemplateId, setSelectedTemplateId] = useState(
		CANONICAL_TEMPLATES[0].id,
	);
	const [selectedToolName, setSelectedToolName] = useState(
		CANONICAL_TEMPLATES[0].tool,
	);
	const [activeResultsTab, setActiveResultsTab] = useState<
		"output" | "debug" | "export" | "telemetry"
	>("output");
	const [isExportModalOpen, setIsExportModalOpen] = useState(false);
	const [isEnvModalOpen, setIsEnvModalOpen] = useState(false);
	const [exportTabLang, setExportTabLang] = useState<
		"typescript" | "python" | "curl" | "grpc"
	>("typescript");
	const [exportTabCopied, setExportTabCopied] = useState(false);
	const [activeLeftTab, setActiveLeftTab] = useState<"capabilities" | "nodes">(
		"nodes",
	);
	const [filterTier, setFilterTier] = useState<"all" | 1 | 2 | 3>("all");
	const [code, setCode] = useState(CANONICAL_TEMPLATES[0].code);
	const [isRunning, setIsRunning] = useState(false);
	const [isScanning, setIsScanning] = useState(false);
	const [result, setResult] = useState<Record<string, unknown> | null>(null);
	const [meta, setMeta] = useState<ExecutionMeta | null>(null);
	const [errorAlert, setErrorAlert] = useState<{
		title: string;
		desc: string;
	} | null>(null);
	const [loadingTools, setLoadingTools] = useState(false);
	const [copiedKey, setCopiedKey] = useState<string | null>(null);
	const [isReset, setIsReset] = useState(false);
	const [lastScanTimestamp, setLastScanTimestamp] = useState<number>(
		Date.now(),
	);
	const [secondsAgo, setSecondsAgo] = useState(0);

	// Target Connection State
	const [targetType, setTargetType] = useState<
		"stdio" | "http" | "grpc" | "mesh"
	>("http");
	const [stdioCmd, setStdioCmd] = useState(
		"npx -y @modelcontextprotocol/server-filesystem /tmp",
	);
	const [httpUrl, setHttpUrl] = useState("http://127.0.0.1:15000/mcp");
	const [grpcTarget, setGrpcTarget] = useState("127.0.0.1:13011");
	const [isConnecting, setIsConnecting] = useState(false);
	const [activeConnectedTarget, setActiveConnectedTarget] = useState<string>(
		"http://127.0.0.1:15000/mcp",
	);

	// Execution Mode State: "logic" (LIOP WASI code) vs "form" (MCP Inspector Form)
	const [executionMode, setExecutionMode] = useState<"logic" | "form">("logic");
	// biome-ignore lint/suspicious/noExplicitAny: Form arguments map
	const [formArgs, setFormArgs] = useState<Record<string, any>>({});

	// Bulletproof copy helper with fallback
	const handleCopy = async (text: string, key: string) => {
		try {
			if (navigator.clipboard?.writeText) {
				await navigator.clipboard.writeText(text);
			} else {
				throw new Error("Clipboard API unavailable");
			}
		} catch (_err) {
			const textArea = document.createElement("textarea");
			textArea.value = text;
			textArea.style.position = "fixed";
			textArea.style.left = "-999999px";
			textArea.style.top = "-999999px";
			document.body.appendChild(textArea);
			textArea.focus();
			textArea.select();
			try {
				document.execCommand("copy");
			} catch (e) {
				console.error("Fallback copy failed", e);
			}
			document.body.removeChild(textArea);
		}
		setCopiedKey(key);
		setTimeout(() => setCopiedKey(null), 1500);
	};

	// SSE steps state
	const [timeline, setTimeline] = useState<TimelineStep[]>([
		{
			phase: "bootstrap",
			label: "P2P Mesh Bootstrap",
			detail: "Node synchronized",
			status: "pending",
		},
		{
			phase: "discovery",
			label: "Resource Discovery",
			detail: "Multi-tier route resolution",
			status: "pending",
		},
		{
			phase: "pqc",
			label: "Kyber-768 Handshake",
			detail: "ML-KEM key exchange",
			status: "pending",
		},
		{
			phase: "sealing",
			label: "AES-256-GCM Sealing",
			detail: "Envelope cipher & sign",
			status: "pending",
		},
		{
			phase: "execution",
			label: "WASI Sandbox Run",
			detail: "Logic injection on origin",
			status: "pending",
		},
		{
			phase: "zk_verify",
			label: "ZK-Receipt HMAC Seal",
			detail: "Computational integrity proof",
			status: "pending",
		},
	]);

	const fetchHealth = async () => {
		try {
			const res = await fetch("/api/health");
			if (res.ok) {
				const data = await res.json();
				setNetwork(data);
			}
		} catch (err) {
			console.error("Error fetching network health:", err);
		}
	};

	const fetchTools = async () => {
		setLoadingTools(true);
		try {
			const res = await fetch("/api/discover");
			if (res.ok) {
				const data = await res.json();
				const fetchedTools: Tool[] = data.tools || [];
				setTools(fetchedTools);
				setSelectedToolName((prev) => {
					if (
						prev &&
						(fetchedTools.some((t: Tool) => t.name === prev) ||
							availableTemplates.some((t) => t.tool === prev))
					) {
						return prev;
					}
					const currentT = availableTemplates.find(
						(t) => t.id === selectedTemplateId,
					);
					return (
						currentT?.tool ||
						fetchedTools[0]?.name ||
						availableTemplates[0]?.tool ||
						""
					);
				});
			}
		} catch (err) {
			console.error("Error fetching tools:", err);
		} finally {
			setLoadingTools(false);
		}
	};

	const fetchNodes = async (force = false, silent = false) => {
		if (!silent) setIsScanning(true);
		try {
			const res = await fetch(`/api/nodes?force=${force}`);
			if (res.ok) {
				const data = await res.json();
				setNodes(data.nodes || []);
				setScanSummary(data.summary || null);
				setLastScanTimestamp(Date.now());
				setSecondsAgo(0);
			}
		} catch (err) {
			console.error("Error scanning mesh nodes:", err);
		} finally {
			if (!silent) setIsScanning(false);
		}
	};

	// Initial load
	// biome-ignore lint/correctness/useExhaustiveDependencies: Initial mount data fetching is intentional
	useEffect(() => {
		fetchHealth();
		fetchTools();
		fetchNodes(true);
	}, []);

	// Dynamic live auto-polling every 5 seconds
	// biome-ignore lint/correctness/useExhaustiveDependencies: Background interval polling is intentional
	useEffect(() => {
		const interval = setInterval(() => {
			fetchHealth();
			fetchTools();
			fetchNodes(false, true);
		}, 5000);
		return () => clearInterval(interval);
	}, []);

	// Seconds counter tick
	useEffect(() => {
		const timer = setInterval(() => {
			setSecondsAgo(Math.floor((Date.now() - lastScanTimestamp) / 1000));
		}, 1000);
		return () => clearInterval(timer);
	}, [lastScanTimestamp]);

	// Dynamic available templates: strictly matching tools exposed on the active target
	const availableTemplates = useMemo(() => {
		if (tools.length === 0) return [];

		const matched: Array<{
			id: string;
			name: string;
			tool: string;
			domain: string;
			clearanceTier: string;
			description: string;
			code: string;
		}> = [];

		// 1. Check canonical templates matching exposed tools on the target
		for (const t of CANONICAL_TEMPLATES) {
			const cleanTTool = t.tool.toLowerCase().replace(/_/g, "");
			const toolExists = tools.some(
				(avail) =>
					avail.name.toLowerCase() === t.tool.toLowerCase() ||
					avail.name.toLowerCase().replace(/_/g, "") === cleanTTool,
			);
			if (toolExists) {
				matched.push(t);
			}
		}

		// 2. For exposed tools without a canonical template, create an in-situ dynamic template
		for (const avail of tools) {
			const alreadyHasTemplate = matched.some(
				(m) => m.tool.toLowerCase() === avail.name.toLowerCase(),
			);
			if (!alreadyHasTemplate) {
				const safeIdentifier =
					avail.name.replace(/[^a-zA-Z0-9]/g, "") || "OriginAnalysis";
				matched.push({
					id: `dyn-${avail.name}`,
					name: avail.name.replace(/_/g, " "),
					tool: avail.name,
					domain: avail.domain || "Dynamic Origin Capability",
					clearanceTier: `Tier ${avail.tier || 1}`,
					description:
						avail.description ||
						`Dynamic Logic-on-Origin capability discovered on target node.`,
					code: `@LIOP{wasi_v1, ${safeIdentifier}}
const records = env.records || [];
// Return aggregated telemetry under zero-trust privacy
return {
  totalRecords: Array.isArray(records) ? records.length : 1,
  executionStatus: "PROCESSED_ON_ORIGIN",
  timestamp: new Date().toISOString()
};
@END`,
				});
			}
		}

		return matched;
	}, [tools]);

	// Auto-align selected template and code when availableTemplates changes
	useEffect(() => {
		if (availableTemplates.length > 0) {
			const currentExists = availableTemplates.find(
				(t) => t.id === selectedTemplateId,
			);
			if (!currentExists) {
				const first = availableTemplates[0];
				setSelectedTemplateId(first.id);
				setSelectedToolName(first.tool);
				setCode(first.code);
			}
		}
	}, [availableTemplates, selectedTemplateId]);

	const handleSelectTemplate = (templateId: string) => {
		const t = availableTemplates.find((x) => x.id === templateId);
		if (t) {
			setSelectedTemplateId(templateId);
			setCode(t.code);
			setSelectedToolName(t.tool);
		}
	};

	// Interactively select a tool and automatically load matching template
	const handleSelectTool = (toolName: string) => {
		setSelectedToolName(toolName);
		const matchingTemplate = availableTemplates.find(
			(t) => t.tool === toolName,
		);
		if (matchingTemplate) {
			setSelectedTemplateId(matchingTemplate.id);
			setCode(matchingTemplate.code);
		}
	};

	const handleResetTemplate = () => {
		const t = availableTemplates.find((x) => x.id === selectedTemplateId);
		if (t) {
			setCode(t.code);
			setIsReset(true);
			setTimeout(() => setIsReset(false), 1500);
		}
	};

	// Switch active connection target dynamically from UI actions
	const handleSwitchTarget = async (
		newTarget: string,
		type: "grpc" | "http" = targetType as "grpc" | "http",
		toolToSelect?: string,
	) => {
		setIsConnecting(true);
		setErrorAlert(null);
		try {
			if (type === "grpc") {
				setGrpcTarget(newTarget);
				setTargetType("grpc");
				const res = await fetch("/api/connect", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ type: "grpc", grpc: { target: newTarget } }),
				});
				if (!res.ok) {
					const data = await res.json();
					throw new Error(data.error || "Failed to connect to target");
				}
				setActiveConnectedTarget(newTarget);
			} else if (type === "http") {
				setHttpUrl(newTarget);
				setTargetType("http");
				const res = await fetch("/api/connect", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ type: "http", http: { url: newTarget } }),
				});
				if (!res.ok) {
					const data = await res.json();
					throw new Error(data.error || "Failed to connect to target");
				}
				setActiveConnectedTarget(newTarget);
			}
			await fetchHealth();
			await fetchTools();
			await fetchNodes(false, true);

			if (toolToSelect) {
				handleSelectTool(toolToSelect);
			}
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			setErrorAlert({ title: "Target Switch Failed", desc: msg });
		} finally {
			setIsConnecting(false);
		}
	};

	// Filter tools based on query
	const filteredTools = useMemo(() => {
		if (!searchQuery.trim()) return tools;
		const q = searchQuery.toLowerCase();
		return tools.filter(
			(t) =>
				t.name.toLowerCase().includes(q) ||
				t.description?.toLowerCase().includes(q) ||
				t.domain?.toLowerCase().includes(q) ||
				t.taxonomy?.domain?.toLowerCase().includes(q),
		);
	}, [tools, searchQuery]);

	// Filter nodes based on tier
	const filteredNodes = useMemo(() => {
		if (filterTier === "all") return nodes;
		return nodes.filter((n) => n.tier === filterTier);
	}, [nodes, filterTier]);

	// Capability support verification against current target
	const isToolSupported = useCallback(
		(toolName?: string): boolean => {
			if (!toolName || tools.length === 0) return false;
			const cleanTarget = toolName.toLowerCase().replace(/_/g, "");
			return tools.some(
				(t) =>
					t.name.toLowerCase() === toolName.toLowerCase() ||
					t.name.toLowerCase().replace(/_/g, "") === cleanTarget,
			);
		},
		[tools],
	);

	const currentTemplate = useMemo(() => {
		return availableTemplates.find((t) => t.id === selectedTemplateId);
	}, [availableTemplates, selectedTemplateId]);

	const isCurrentToolSupported = useMemo(() => {
		const toolToTest =
			executionMode === "form"
				? selectedToolName
				: currentTemplate?.tool || selectedToolName;
		return isToolSupported(toolToTest);
	}, [executionMode, selectedToolName, currentTemplate, isToolSupported]);

	const isConnectedToNode = (n: ScannedNode): boolean => {
		if (targetType === "grpc") {
			const targetPort = grpcTarget.split(":")[1] || "";
			const activePort = activeConnectedTarget.split(":")[1] || "";
			return Boolean(
				(n.ports?.grpc &&
					(String(n.ports.grpc) === targetPort ||
						String(n.ports.grpc) === activePort)) ||
					(n.host &&
						(grpcTarget.includes(n.host) ||
							activeConnectedTarget.includes(n.host)) &&
						targetPort === String(n.ports?.grpc)) ||
					grpcTarget.toLowerCase().includes(n.id.toLowerCase()) ||
					activeConnectedTarget.toLowerCase().includes(n.id.toLowerCase()),
			);
		}
		if (targetType === "http") {
			const portMatch =
				httpUrl.match(/:(\d+)/)?.[1] ||
				activeConnectedTarget.match(/:(\d+)/)?.[1] ||
				"";
			return Boolean(
				(n.ports?.http && String(n.ports.http) === portMatch) ||
					httpUrl.toLowerCase().includes(n.id.toLowerCase()) ||
					activeConnectedTarget.toLowerCase().includes(n.id.toLowerCase()),
			);
		}
		return n.id === "bank" || n.status === "online";
	};

	// Code editor metadata
	const editorStats = useMemo(() => {
		const lines = code.split("\n").length;
		const bytes = new TextEncoder().encode(code).length;
		const estTokens = Math.max(1, Math.ceil(code.trim().length / 3.8));
		return { lines, bytes, estTokens };
	}, [code]);

	// Real-time AST syntax validator for @LIOP envelopes and pure JavaScript
	const astValidation = useMemo(() => {
		const trimmed = code.trim();
		const envelopeMatch = trimmed.match(
			/^@LIOP\{([^}]+)\}\s*([\s\S]*?)\s*(?:@END)?$/,
		);

		let rawJs = trimmed;
		let runtime = "wasi_v1";
		let hasEnvelope = false;

		if (envelopeMatch) {
			hasEnvelope = true;
			runtime = envelopeMatch[1].split(",")[0]?.trim() || "wasi_v1";
			rawJs = envelopeMatch[2];
		}

		try {
			// Validate JavaScript syntax safely in isolated function constructor without executing
			// Note: "env" is the injected runtime global containing records
			new Function("env", rawJs);
			return {
				valid: true,
				error: null as string | null,
				runtime,
				hasEnvelope,
			};
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : String(err);
			return {
				valid: false,
				error: message,
				runtime,
				hasEnvelope,
			};
		}
	}, [code]);

	// Generate export code snippets for live tab
	const getExportCode = useCallback(
		(lang: "typescript" | "python" | "curl" | "grpc") => {
			const tool = selectedToolName || "Analyze_Synthetic_Bank_Transactions";
			const escapedCode = code.trim();
			if (lang === "typescript") {
				if (targetType === "grpc") {
					return `import { LiopClient } from "@nekzus/liop";

async function main() {
  const client = new LiopClient({
    target: "${grpcTarget || "127.0.0.1:13011"}",
    timeoutMs: 10000,
  });

  await client.connect();

  const response = await client.injectLogic({
    tool: "${tool}",
    logic: \`${escapedCode}\`,
  });

  console.log("Result:", response.result);
  console.log("ZK Proof:", response.meta?.zkHash);

  await client.close();
}

main().catch(console.error);`;
				}
				return `import { LiopClient } from "@nekzus/liop";

async function main() {
  const client = new LiopClient({
    httpUrl: "${httpUrl || "http://127.0.0.1:15000/mcp"}",
  });

  await client.connect();

  const response = await client.injectLogic({
    tool: "${tool}",
    logic: \`${escapedCode}\`,
  });

  console.log("Result:", response.result);
  console.log("ZK Proof:", response.meta?.zkHash);

  await client.close();
}

main().catch(console.error);`;
			}
			if (lang === "python") {
				return `import json
import requests

url = "http://127.0.0.1:16001/api/execute"
payload = {
    "tool": "${tool}",
    "logic": """${escapedCode}"""
}

response = requests.post(url, json=payload, stream=True)
for line in response.iter_lines():
    if line:
        decoded = line.decode("utf-8")
        if decoded.startswith("data: "):
            event = json.loads(decoded[6:])
            if event.get("type") == "result":
                print("Result:", json.dumps(event.get("payload"), indent=2))
                print("ZK-Receipt HMAC:", event.get("meta", {}).get("zkHash"))`;
			}
			if (lang === "curl") {
				const jsonBody = JSON.stringify({ tool, logic: escapedCode }, null, 2);
				return `curl -X POST http://127.0.0.1:16001/api/execute \\
  -H "Content-Type: application/json" \\
  -d '${jsonBody.replace(/'/g, "'\\''")}'`;
			}
			// grpc JSON
			let base64Payload = "";
			try {
				base64Payload = btoa(unescape(encodeURIComponent(escapedCode)));
			} catch (_e) {
				base64Payload = "<base64_encoded_logic>";
			}
			return `// gRPC Payload for liop.protocol.v1.MeshExecutionService/ExecuteLogic
// Target: ${grpcTarget || "127.0.0.1:13011"}
{
  "header": {
    "protocol_version": "2026-07-28",
    "clearance_tier": 1,
    "pqc_suite": "ML-KEM-768",
    "sealing_cipher": "AES-256-GCM"
  },
  "tool_name": "${tool}",
  "logic_envelope": {
    "runtime": "wasi_v1",
    "script_payload": "${base64Payload}"
  }
}`;
		},
		[selectedToolName, code, targetType, grpcTarget, httpUrl],
	);

	const currentToolObj = useMemo(() => {
		return tools.find((t) => t.name === selectedToolName);
	}, [tools, selectedToolName]);

	// Connect / Probe Target
	const handleConnectTarget = async () => {
		setIsConnecting(true);
		setErrorAlert(null);
		try {
			// biome-ignore lint/suspicious/noExplicitAny: target body
			const body: any = { type: targetType };
			if (targetType === "stdio") {
				const parts = stdioCmd.trim().split(/\s+/);
				body.stdio = { command: parts[0], args: parts.slice(1) };
			} else if (targetType === "http") {
				body.http = { url: httpUrl.trim() };
			} else if (targetType === "grpc") {
				body.grpc = { target: grpcTarget.trim() };
			} else if (targetType === "mesh") {
				body.mesh = {};
			}

			const res = await fetch("/api/connect", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
			const data = await res.json();
			if (!res.ok) {
				throw new Error(data.error || "Failed to connect to target");
			}

			setActiveConnectedTarget(
				targetType === "stdio"
					? stdioCmd
					: targetType === "http"
						? httpUrl
						: targetType === "grpc"
							? grpcTarget
							: "Audit Mesh (8 Nodes Swarm)",
			);

			await fetchHealth();
			await fetchTools();
			await fetchNodes(true);
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			setErrorAlert({ title: "Connection Failed", desc: msg });
		} finally {
			setIsConnecting(false);
		}
	};

	// Execute Logic or MCP Tool
	const handleExecute = async () => {
		const activeT = availableTemplates.find((t) => t.id === selectedTemplateId);
		const targetTool =
			selectedToolName || activeT?.tool || availableTemplates[0]?.tool || "";
		if (!targetTool || isRunning) return;

		setIsRunning(true);
		setResult(null);
		setMeta(null);
		setErrorAlert(null);

		// Reset timeline status
		setTimeline([
			{
				phase: "bootstrap",
				label: "Channel Bootstrap",
				detail: `Target transport: ${targetType.toUpperCase()}`,
				status: "running",
			},
			{
				phase: "discovery",
				label: "Resource Discovery",
				detail: `Targeting tool ${targetTool}...`,
				status: "pending",
			},
			{
				phase: "pqc",
				label: "Kyber-768 / Channel Security",
				detail: "Securing transport session...",
				status: "pending",
			},
			{
				phase: "sealing",
				label: "Payload Sealing",
				detail: "Encrypting parameters & payload...",
				status: "pending",
			},
			{
				phase: "execution",
				label: "Origin / Sandbox Execution",
				detail: "Executing inside target environment...",
				status: "pending",
			},
			{
				phase: "zk_verify",
				label: "ZK-Receipt HMAC Seal",
				detail: "Cryptographic proof validation...",
				status: "pending",
			},
		]);

		try {
			const reqBody =
				executionMode === "form"
					? { tool: targetTool, args: formArgs }
					: { tool: targetTool, logic: code };

			const response = await fetch("/api/execute", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(reqBody),
			});

			if (!response.ok) {
				throw new Error(`Gateway error: ${response.statusText}`);
			}

			const reader = response.body?.getReader();
			if (!reader) {
				throw new Error("Unable to initialize SSE stream reader");
			}

			const decoder = new TextDecoder();
			let buffer = "";

			while (true) {
				const { value, done } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split("\n");
				buffer = lines.pop() || "";

				for (const line of lines) {
					if (!line.trim()) continue;

					if (line.startsWith("data: ")) {
						const dataStr = line.slice(6);
						try {
							const event = JSON.parse(dataStr);

							if (event.type === "step") {
								updateTimelineStep(
									event.phase,
									event.detail,
									event.status,
									event.durationMs,
								);
							} else if (event.type === "result") {
								setResult(event.payload);
								setMeta(event.meta || null);
								setIsRunning(false);
							} else if (event.type === "error") {
								setErrorAlert({
									title: event.payload.title || "Execution Error",
									desc:
										event.payload.desc ||
										"A sandbox failure occurred on origin node",
								});
								setMeta(event.meta || null);
								setIsRunning(false);
							}
						} catch (e) {
							console.error("Error parsing SSE line:", e, line);
						}
					}
				}
			}
		} catch (err: unknown) {
			const errMsg = err instanceof Error ? err.message : String(err);
			setErrorAlert({
				title: "Connection Error",
				desc: errMsg || "Failed to communicate with Playground Gateway",
			});
			setIsRunning(false);
			setTimeline((prev) =>
				prev.map((step) =>
					step.status === "running"
						? { ...step, status: "failed", detail: "Connection interrupted" }
						: step,
				),
			);
		}
	};

	const updateTimelineStep = (
		phase: string,
		detail: string,
		status: "pending" | "running" | "success" | "failed",
		durationMs?: number,
	) => {
		setTimeline((prev) => {
			let phaseFound = false;
			return prev.map((step) => {
				if (step.phase === phase) {
					phaseFound = true;
					return {
						...step,
						status,
						detail,
						durationMs: durationMs ?? step.durationMs,
					};
				}
				if (
					phaseFound &&
					step.status !== "success" &&
					step.status !== "failed"
				) {
					return { ...step, status: "pending" };
				}
				if (
					!phaseFound &&
					(step.status === "pending" || step.status === "running")
				) {
					return { ...step, status: "success" };
				}
				return step;
			});
		});
	};

	const tier1Nodes = useMemo(
		() => filteredNodes.filter((n) => n.tier === 1),
		[filteredNodes],
	);
	const tier2Nodes = useMemo(
		() => filteredNodes.filter((n) => n.tier === 2),
		[filteredNodes],
	);
	const tier3Nodes = useMemo(
		() => filteredNodes.filter((n) => n.tier === 3),
		[filteredNodes],
	);

	return (
		<div className="min-h-screen bg-background flex flex-col font-sans antialiased text-foreground selection:bg-primary/20 selection:text-primary">
			{/* Header */}
			<header className="border-b border-border bg-card/90 backdrop-blur-sm sticky top-0 z-50 transition-colors">
				<div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
					<div className="flex items-center space-x-3">
						{/* LIOP Official Logo */}
						<LiopLogo className="h-8 w-8 text-primary shrink-0 transition-transform duration-200 hover:scale-105" />

						<div className="flex items-center gap-2">
							<div>
								<h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
									<span>LIOP Studio</span>
									<span className="text-[10px] font-mono font-medium px-1.5 py-0.2 text-cyan-300 border border-cyan-500/30 rounded bg-cyan-500/10">
										v1.0.0-alpha.0
									</span>
								</h1>
								<p className="text-[10px] text-zinc-400 -mt-0.5 hidden sm:block">
									Sovereign Logic & MCP Multi-Transport Inspector
								</p>
							</div>
						</div>
					</div>

					<div className="flex items-center space-x-2.5">
						{/* Live Mesh Status Badge */}
						<div className="flex items-center space-x-2 bg-secondary/80 border border-white/10 px-3 py-1 rounded-md text-xs">
							<span className="relative flex h-2 w-2">
								{onlineNodes > 0 ? (
									<>
										<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
										<span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
									</>
								) : (
									<span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
								)}
							</span>
							<span
								className={`font-medium ${
									onlineNodes > 0 ? "text-white" : "text-rose-400"
								}`}
							>
								{hasNodeStats
									? onlineNodes > 0
										? `${onlineNodes}/${totalNodes} Nodes Online`
										: "0 Nodes Online (Offline)"
									: isScanning
										? "Scanning Mesh Nodes..."
										: "Topology Offline"}
							</span>
							<span className="text-cyan-400 font-mono text-[10px] hidden sm:inline">
								(3 Tiers)
							</span>
							<span className="text-zinc-400 font-mono text-[10px] border-l border-white/15 pl-1.5 hidden md:inline">
								{secondsAgo === 0 ? "live" : `${secondsAgo}s ago`}
							</span>
						</div>

						{/* Scan Mesh Button */}
						<Button
							size="sm"
							variant="outline"
							onClick={() => {
								fetchNodes(true, false);
								fetchTools();
								fetchHealth();
							}}
							disabled={isScanning}
							className="h-8 px-2.5 border-white/15 bg-surface1 text-zinc-300 hover:text-white hover:bg-white/5 flex items-center gap-1.5 text-xs"
							title="Re-scan mesh topology across all layers"
						>
							<RefreshCw
								className={`h-3.5 w-3.5 text-cyan-400 ${isScanning ? "animate-spin" : ""}`}
							/>
							<span className="hidden md:inline font-mono text-[11px]">
								Scan
							</span>
						</Button>

						{/* Sliding Pill Theme Switcher */}
						<div className="relative flex items-center bg-surface1 border border-white/15 p-0.5 rounded-md">
							<button
								type="button"
								onClick={() => setTheme("obsidian")}
								className="relative z-10 text-[11px] px-2.5 py-1 font-medium flex items-center gap-1.5 transition-colors duration-200"
								title="OLED Obsidian Theme"
							>
								{theme === "obsidian" && (
									<motion.div
										layoutId="themeActivePill"
										className="absolute inset-0 bg-primary rounded shadow-sm"
										transition={{ type: "spring", stiffness: 450, damping: 35 }}
									/>
								)}
								<Moon
									className={`relative z-20 h-3.5 w-3.5 transition-colors duration-200 ${
										theme === "obsidian" ? "text-black" : "text-zinc-400"
									}`}
								/>
								<span
									className={`relative z-20 font-medium transition-colors duration-200 ${
										theme === "obsidian"
											? "text-black"
											: "text-zinc-300 hover:text-white"
									}`}
								>
									Obsidian
								</span>
							</button>
							<button
								type="button"
								onClick={() => setTheme("slate")}
								className="relative z-10 text-[11px] px-2.5 py-1 font-medium flex items-center gap-1.5 transition-colors duration-200"
								title="Slate Dark Theme"
							>
								{theme === "slate" && (
									<motion.div
										layoutId="themeActivePill"
										className="absolute inset-0 bg-primary rounded shadow-sm"
										transition={{ type: "spring", stiffness: 450, damping: 35 }}
									/>
								)}
								<Layers
									className={`relative z-20 h-3.5 w-3.5 transition-colors duration-200 ${
										theme === "slate" ? "text-black" : "text-zinc-400"
									}`}
								/>
								<span
									className={`relative z-20 font-medium transition-colors duration-200 ${
										theme === "slate"
											? "text-black"
											: "text-zinc-300 hover:text-white"
									}`}
								>
									Slate
								</span>
							</button>
						</div>
					</div>
				</div>
			</header>

			{/* Target Transport Selector & Probe Bar */}
			<TargetConnectionBar
				targetType={targetType}
				onTargetTypeChange={setTargetType}
				stdioCmd={stdioCmd}
				onStdioCmdChange={setStdioCmd}
				httpUrl={httpUrl}
				onHttpUrlChange={setHttpUrl}
				grpcTarget={grpcTarget}
				onGrpcTargetChange={setGrpcTarget}
				onConnect={handleConnectTarget}
				isConnecting={isConnecting}
				activeConnectedTarget={activeConnectedTarget}
				connected={network?.status === "healthy"}
			/>

			{/* Main Workstation Layout */}
			<main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col gap-6">
				<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
					{/* Left Panel: Capabilities and Multi-Layer Server Scan (4 cols) */}
					<section className="lg:col-span-4 flex flex-col space-y-6">
						{/* Main Card: Tabbed Switcher between Mesh Capabilities & Multi-Layer Server Scan */}
						<Card className="flex flex-col h-[560px] overflow-hidden bg-card border-border shadow-card">
							<CardHeader className="pb-2.5 shrink-0 border-b border-border/40">
								<div className="flex items-center justify-between mb-2">
									<div className="flex items-center gap-1.5 p-0.5 bg-surface1 border border-white/10 rounded-lg">
										<button
											type="button"
											onClick={() => setActiveLeftTab("nodes")}
											className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 ${
												activeLeftTab === "nodes"
													? "bg-primary text-black font-semibold shadow-sm"
													: "text-zinc-400 hover:text-white"
											}`}
										>
											<Server className="h-3.5 w-3.5" />
											Server Scan{" "}
											{hasNodeStats ? `(${onlineNodes}/${totalNodes})` : ""}
										</button>
										<button
											type="button"
											onClick={() => setActiveLeftTab("capabilities")}
											className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 ${
												activeLeftTab === "capabilities"
													? "bg-primary text-black font-semibold shadow-sm"
													: "text-zinc-400 hover:text-white"
											}`}
										>
											<Waypoints className="h-3.5 w-3.5" />
											Capabilities ({tools.length})
										</button>
									</div>

									<Badge
										variant="outline"
										className="text-[10px] font-mono border-white/15 text-zinc-300"
									>
										{activeLeftTab === "capabilities"
											? `${tools.length} tools`
											: "3 Tiers"}
									</Badge>
								</div>

								{activeLeftTab === "capabilities" ? (
									<>
										<CardDescription className="text-xs text-zinc-400">
											Capabilities across all layers (Tier 1 Enclaves, Tier 2
											Consortium, Tier 3 Backbone).
										</CardDescription>
										{/* Search / Filter bar */}
										<div className="relative mt-2">
											<Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-zinc-400" />
											<input
												type="text"
												value={searchQuery}
												onChange={(e) => setSearchQuery(e.target.value)}
												placeholder="Filter by capability or domain..."
												spellCheck={false}
												autoComplete="off"
												autoCorrect="off"
												className="w-full h-8 pl-8 pr-7 bg-surface1 border border-white/15 rounded text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition-all"
											/>
											{searchQuery && (
												<button
													type="button"
													onClick={() => setSearchQuery("")}
													className="absolute right-2 top-2 text-zinc-400 hover:text-white p-0.5 rounded transition-colors"
													title="Clear filter"
												>
													<X className="h-3.5 w-3.5" />
												</button>
											)}
										</div>
									</>
								) : (
									<div className="flex items-center justify-between mt-1">
										<span className="text-[11px] text-zinc-400">
											Live scan across all architectural layers:
										</span>
										<div className="flex items-center gap-1">
											{(["all", 1, 2, 3] as const).map((tierVal) => (
												<button
													key={tierVal}
													type="button"
													onClick={() => setFilterTier(tierVal)}
													className={`text-[10px] px-1.5 py-0.5 rounded font-mono transition-colors ${
														filterTier === tierVal
															? "bg-primary/20 text-cyan-400 border border-cyan-500/40"
															: "text-zinc-400 hover:text-zinc-200 border border-transparent"
													}`}
												>
													{tierVal === "all" ? "All" : `T${tierVal}`}
												</button>
											))}
										</div>
									</div>
								)}
							</CardHeader>

							<CardContent className="flex-1 min-h-0 overflow-hidden p-0">
								<ScrollArea className="h-full px-4 py-2">
									{activeLeftTab === "capabilities" ? (
										/* Capabilities List */
										loadingTools ? (
											<div className="flex flex-col items-center justify-center py-12 text-zinc-400 space-y-2">
												<Loader2 className="h-5 w-5 animate-spin text-primary" />
												<span className="text-xs text-zinc-300">
													Discovering capabilities across tiers...
												</span>
											</div>
										) : filteredTools.length === 0 ? (
											<div className="text-center py-12 text-zinc-400 space-y-2">
												<AlertTriangle className="h-6 w-6 mx-auto text-warning" />
												<p className="text-xs font-medium text-zinc-200">
													No capabilities found
												</p>
												<p className="text-[11px] text-zinc-400 max-w-[200px] mx-auto">
													Try adjusting your search query.
												</p>
											</div>
										) : (
											<div className="space-y-2.5 pb-4">
												{filteredTools.map((t) => {
													const isSelected = selectedToolName === t.name;
													const tier =
														t.tier ||
														(t.taxonomy?.clearanceTier === 1
															? 1
															: t.taxonomy?.clearanceTier === 3
																? 3
																: 2);

													return (
														<button
															type="button"
															key={t.name}
															onClick={() => handleSelectTool(t.name)}
															className={`w-full text-left p-3 rounded-md border transition-all cursor-pointer ${
																isSelected
																	? "bg-primary/10 border-primary/60 text-white shadow-sm ring-1 ring-primary/30"
																	: "bg-secondary/40 border-border/70 hover:bg-secondary/80 hover:border-border"
															}`}
														>
															<div className="flex items-center justify-between mb-1">
																<span className="font-semibold text-xs text-zinc-100 truncate max-w-[190px]">
																	{t.name}
																</span>
																<Badge
																	variant={
																		tier === 1
																			? "success"
																			: tier === 2
																				? "warning"
																				: "default"
																	}
																	className="text-[10px] py-0 px-1.5 font-normal"
																>
																	Tier {tier}
																</Badge>
															</div>
															<p className="text-[11px] text-zinc-300 line-clamp-2 leading-relaxed">
																{t.description || "No description available."}
															</p>
															<div className="mt-1.5 flex items-center justify-between text-[10px] text-zinc-400">
																<span className="flex items-center gap-1 truncate max-w-[180px]">
																	<span
																		className={`w-1.5 h-1.5 rounded-full ${tier === 1 ? "bg-emerald-400" : tier === 2 ? "bg-cyan-400" : "bg-purple-400"}`}
																	></span>
																	{t.providerNode ||
																		t.taxonomy?.domain ||
																		"Mesh Node"}
																</span>
																<span className="font-mono text-[9px] opacity-75 shrink-0">
																	WASI In-situ
																</span>
															</div>
														</button>
													);
												})}
											</div>
										)
									) : (
										/* Multi-Layer Server Scan View */
										<div className="space-y-4 pb-4">
											{nodes.length === 0 ? (
												<div className="text-center py-10 px-4 bg-surface1/20 rounded-lg border border-white/5 space-y-2">
													<Server className="h-7 w-7 text-cyan-400 mx-auto opacity-70 animate-pulse" />
													<p className="text-xs font-semibold text-zinc-200">
														Scanning Network Nodes...
													</p>
													<p className="text-[11px] text-zinc-400 font-mono">
														Querying {activeConnectedTarget}
													</p>
												</div>
											) : null}

											{/* Tier 1 Group: Sovereign Enclaves */}
											{(filterTier === "all" || filterTier === 1) && (
												<div className="space-y-2">
													<div className="flex items-center justify-between text-[11px] font-semibold text-emerald-400 border-b border-emerald-500/20 pb-1">
														<span className="flex items-center gap-1.5">
															<ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
															Tier 1: Sovereign Enclaves (In-Situ Origin)
														</span>
														<span className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
															pnet PSK
														</span>
													</div>

													{tier1Nodes.length === 0 ? (
														<div className="text-[10px] text-zinc-500 italic py-2 px-2.5 bg-surface1/30 rounded border border-white/5 flex items-center gap-1.5">
															<AlertTriangle className="h-3 w-3 text-zinc-500" />
															No Tier 1 enclaves active on scanned target
														</div>
													) : (
														tier1Nodes.map((n) => {
															const isConnected =
																isConnectedToNode(n) && n.status === "online";
															const isOffline = n.status === "offline";
															return (
																<div
																	key={n.id}
																	className={`p-2.5 rounded-md border transition-all ${
																		isOffline
																			? "border-border/40 bg-surface1/20 opacity-60"
																			: isConnected
																				? "border-cyan-500/60 bg-tier1 ring-1 ring-cyan-500/30 shadow-sm"
																				: "border-emerald-500/30 bg-tier1 hover:brightness-110"
																	}`}
																>
																	<div className="flex items-center justify-between mb-1">
																		<div className="flex items-center gap-1.5">
																			<Database
																				className={`h-3 w-3 ${
																					isOffline
																						? "text-zinc-500"
																						: "text-emerald-400"
																				}`}
																			/>
																			<span
																				className={`text-xs font-semibold ${
																					isOffline
																						? "text-zinc-400"
																						: "text-zinc-100"
																				}`}
																			>
																				{n.name}
																			</span>
																			{isConnected && (
																				<span className="text-[8px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/25 border border-cyan-500/40 text-cyan-200 font-bold flex items-center gap-1">
																					<span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping"></span>
																					ACTIVE TARGET
																				</span>
																			)}
																		</div>
																		<div className="flex items-center gap-1.5">
																			{!isConnected && !isOffline && (
																				<button
																					type="button"
																					onClick={() => {
																						const port =
																							n.ports?.grpc ?? n.ports?.http;
																						const type = n.ports?.grpc
																							? "grpc"
																							: "http";
																						const targetStr =
																							type === "grpc"
																								? `${n.host}:${port}`
																								: `http://${n.host}:${port}/mcp`;
																						handleSwitchTarget(targetStr, type);
																					}}
																					className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-surface1 hover:bg-primary hover:text-black border border-white/10 text-zinc-300 transition-colors flex items-center gap-1 cursor-pointer"
																					title={`Connect to ${n.name}`}
																				>
																					<Zap className="h-2.5 w-2.5 text-cyan-400" />
																					<span>Connect</span>
																				</button>
																			)}
																			<span
																				className={`inline-block h-1.5 w-1.5 rounded-full ${
																					isOffline
																						? "bg-rose-500"
																						: "bg-emerald-400"
																				}`}
																			></span>
																			<span
																				className={`text-[10px] font-mono ${
																					isOffline
																						? "text-zinc-500 font-medium"
																						: "text-emerald-400"
																				}`}
																			>
																				{isOffline ? "OFFLINE" : `${n.rttMs}ms`}
																			</span>
																		</div>
																	</div>
																	<p className="text-[10px] text-zinc-400 mb-1">
																		{n.role}
																	</p>
																	<div className="text-[10px] font-mono text-zinc-400 flex items-center justify-between">
																		<span>
																			{n.host}:
																			{n.ports?.grpc ??
																				n.ports?.http ??
																				(targetType === "grpc"
																					? grpcTarget.split(":")[1] || "15021"
																					: "3000")}
																		</span>
																		{n.dataset && (
																			<span
																				className={`text-[9px] truncate max-w-[180px] ${
																					isOffline
																						? "text-zinc-500"
																						: "text-emerald-300"
																				}`}
																			>
																				{n.dataset}
																			</span>
																		)}
																	</div>
																	{!isOffline && n.tools.length > 0 && (
																		<div className="mt-1.5 flex flex-wrap gap-1">
																			{n.tools.map((tool) => (
																				<button
																					key={tool}
																					type="button"
																					onClick={() => {
																						if (!isConnected) {
																							const port =
																								n.ports?.grpc ?? n.ports?.http;
																							const type = n.ports?.grpc
																								? "grpc"
																								: "http";
																							const targetStr =
																								type === "grpc"
																									? `${n.host}:${port}`
																									: `http://${n.host}:${port}/mcp`;
																							handleSwitchTarget(
																								targetStr,
																								type,
																								tool,
																							);
																						} else {
																							handleSelectTool(tool);
																						}
																					}}
																					className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-200 transition-colors cursor-pointer"
																					title={
																						isConnected
																							? `Load ${tool} in Logic Studio`
																							: `Connect to ${n.name} and load ${tool}`
																					}
																				>
																					+ {tool}
																				</button>
																			))}
																		</div>
																	)}
																</div>
															);
														})
													)}
												</div>
											)}

											{/* Tier 2 Group: Consortium & Boundary Gateways */}
											{(filterTier === "all" || filterTier === 2) && (
												<div className="space-y-2">
													<div className="flex items-center justify-between text-[11px] font-semibold text-cyan-400 border-b border-cyan-500/20 pb-1">
														<span className="flex items-center gap-1.5">
															<Layers className="h-3.5 w-3.5 text-cyan-400" />
															Tier 2: Consortium Routing & Gateways
														</span>
														<span className="text-[9px] font-mono px-1 py-0.2 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
															Dual-NIC / DHT
														</span>
													</div>

													{tier2Nodes.length === 0 ? (
														<div className="text-[10px] text-zinc-500 italic py-2 px-2.5 bg-surface1/30 rounded border border-white/5 flex items-center gap-1.5">
															<AlertTriangle className="h-3 w-3 text-zinc-500" />
															No Tier 2 gateways active on scanned target
														</div>
													) : (
														tier2Nodes.map((n) => {
															const isConnected =
																isConnectedToNode(n) && n.status === "online";
															const isOffline = n.status === "offline";
															return (
																<div
																	key={n.id}
																	className={`p-2.5 rounded-md border transition-all ${
																		isOffline
																			? "border-border/40 bg-surface1/20 opacity-60"
																			: isConnected
																				? "border-cyan-500/60 bg-tier2 ring-1 ring-cyan-500/30 shadow-sm"
																				: "border-cyan-500/30 bg-tier2 hover:brightness-110"
																	}`}
																>
																	<div className="flex items-center justify-between mb-1">
																		<div className="flex items-center gap-1.5">
																			<Globe
																				className={`h-3 w-3 ${
																					isOffline
																						? "text-zinc-500"
																						: "text-cyan-400"
																				}`}
																			/>
																			<span
																				className={`text-xs font-semibold ${
																					isOffline
																						? "text-zinc-400"
																						: "text-zinc-100"
																				}`}
																			>
																				{n.name}
																			</span>
																			{isConnected && (
																				<span className="text-[8px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/25 border border-cyan-500/40 text-cyan-200 font-bold flex items-center gap-1">
																					<span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping"></span>
																					ACTIVE TARGET
																				</span>
																			)}
																		</div>
																		<div className="flex items-center gap-1.5">
																			{!isConnected && !isOffline && (
																				<button
																					type="button"
																					onClick={() => {
																						const port =
																							n.ports?.grpc ?? n.ports?.http;
																						const type = n.ports?.grpc
																							? "grpc"
																							: "http";
																						const targetStr =
																							type === "grpc"
																								? `${n.host}:${port}`
																								: `http://${n.host}:${port}/mcp`;
																						handleSwitchTarget(targetStr, type);
																					}}
																					className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-surface1 hover:bg-primary hover:text-black border border-white/10 text-zinc-300 transition-colors flex items-center gap-1 cursor-pointer"
																					title={`Connect to ${n.name}`}
																				>
																					<Zap className="h-2.5 w-2.5 text-cyan-400" />
																					<span>Connect</span>
																				</button>
																			)}
																			<span
																				className={`inline-block h-1.5 w-1.5 rounded-full ${
																					isOffline
																						? "bg-rose-500"
																						: "bg-cyan-400"
																				}`}
																			></span>
																			<span
																				className={`text-[10px] font-mono ${
																					isOffline
																						? "text-zinc-500 font-medium"
																						: "text-cyan-400"
																				}`}
																			>
																				{isOffline ? "OFFLINE" : `${n.rttMs}ms`}
																			</span>
																		</div>
																	</div>
																	<p className="text-[10px] text-zinc-400 mb-1">
																		{n.role}
																	</p>
																	<div className="text-[10px] font-mono text-zinc-400 flex items-center justify-between">
																		<span>
																			{n.host}:
																			{n.ports?.grpc ??
																				n.ports?.http ??
																				(targetType === "grpc"
																					? grpcTarget.split(":")[1] || "15031"
																					: "3000")}
																		</span>
																		<span
																			className={`text-[9px] ${
																				isOffline
																					? "text-zinc-500"
																					: "text-cyan-300"
																			}`}
																		>
																			{n.isolation?.split("+")[0] ||
																				"Consortium Node"}
																		</span>
																	</div>
																	{!isOffline && n.tools.length > 0 && (
																		<div className="mt-1.5 flex flex-wrap gap-1">
																			{n.tools.map((tool) => (
																				<button
																					key={tool}
																					type="button"
																					onClick={() => {
																						if (!isConnected) {
																							const port =
																								n.ports?.grpc ?? n.ports?.http;
																							const type = n.ports?.grpc
																								? "grpc"
																								: "http";
																							const targetStr =
																								type === "grpc"
																									? `${n.host}:${port}`
																									: `http://${n.host}:${port}/mcp`;
																							handleSwitchTarget(
																								targetStr,
																								type,
																								tool,
																							);
																						} else {
																							handleSelectTool(tool);
																						}
																					}}
																					className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/15 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-200 transition-colors cursor-pointer"
																					title={
																						isConnected
																							? `Load ${tool} in Logic Studio`
																							: `Connect to ${n.name} and load ${tool}`
																					}
																				>
																					+ {tool}
																				</button>
																			))}
																		</div>
																	)}
																</div>
															);
														})
													)}
												</div>
											)}

											{/* Tier 3 Group: Public Backbone & Client Edge */}
											{(filterTier === "all" || filterTier === 3) && (
												<div className="space-y-2">
													<div className="flex items-center justify-between text-[11px] font-semibold text-purple-400 border-b border-purple-500/20 pb-1">
														<span className="flex items-center gap-1.5">
															<Globe className="h-3.5 w-3.5 text-purple-400" />
															Tier 3: Public Backbone & Client Edge
														</span>
														<span className="text-[9px] font-mono px-1 py-0.2 rounded bg-purple-500/10 border border-purple-500/30 text-purple-300">
															AutoNAT / WAN
														</span>
													</div>

													{tier3Nodes.length === 0 ? (
														<div className="text-[10px] text-zinc-500 italic py-2 px-2.5 bg-surface1/30 rounded border border-white/5 flex items-center gap-1.5">
															<AlertTriangle className="h-3 w-3 text-zinc-500" />
															No Tier 3 edge nodes active on scanned target
														</div>
													) : (
														tier3Nodes.map((n) => {
															const isConnected =
																isConnectedToNode(n) && n.status === "online";
															const isOffline = n.status === "offline";
															return (
																<div
																	key={n.id}
																	className={`p-2.5 rounded-md border transition-all ${
																		isOffline
																			? "border-border/40 bg-surface1/20 opacity-60"
																			: isConnected
																				? "border-cyan-500/60 bg-tier3 ring-1 ring-cyan-500/30 shadow-sm"
																				: "border-purple-500/30 bg-tier3 hover:brightness-110"
																	}`}
																>
																	<div className="flex items-center justify-between mb-1">
																		<div className="flex items-center gap-1.5">
																			<Cpu
																				className={`h-3 w-3 ${
																					isOffline
																						? "text-zinc-500"
																						: "text-purple-400"
																				}`}
																			/>
																			<span
																				className={`text-xs font-semibold ${
																					isOffline
																						? "text-zinc-400"
																						: "text-zinc-100"
																				}`}
																			>
																				{n.name}
																			</span>
																			{isConnected && (
																				<span className="text-[8px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/25 border border-cyan-500/40 text-cyan-200 font-bold flex items-center gap-1">
																					<span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping"></span>
																					ACTIVE TARGET
																				</span>
																			)}
																		</div>
																		<div className="flex items-center gap-1.5">
																			{!isConnected && !isOffline && (
																				<button
																					type="button"
																					onClick={() => {
																						const port =
																							n.ports?.grpc ?? n.ports?.http;
																						const type = n.ports?.grpc
																							? "grpc"
																							: "http";
																						const targetStr =
																							type === "grpc"
																								? `${n.host}:${port}`
																								: `http://${n.host}:${port}/mcp`;
																						handleSwitchTarget(targetStr, type);
																					}}
																					className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-surface1 hover:bg-primary hover:text-black border border-white/10 text-zinc-300 transition-colors flex items-center gap-1 cursor-pointer"
																					title={`Connect to ${n.name}`}
																				>
																					<Zap className="h-2.5 w-2.5 text-cyan-400" />
																					<span>Connect</span>
																				</button>
																			)}
																			<span
																				className={`inline-block h-1.5 w-1.5 rounded-full ${
																					isOffline
																						? "bg-rose-500"
																						: "bg-purple-400"
																				}`}
																			></span>
																			<span
																				className={`text-[10px] font-mono ${
																					isOffline
																						? "text-zinc-500 font-medium"
																						: "text-purple-400"
																				}`}
																			>
																				{isOffline ? "OFFLINE" : `${n.rttMs}ms`}
																			</span>
																		</div>
																	</div>
																	<p className="text-[10px] text-zinc-400 mb-1">
																		{n.role}
																	</p>
																	<div className="text-[10px] font-mono text-zinc-400 flex items-center justify-between">
																		<span>
																			{n.host}:
																			{n.ports?.grpc ??
																				n.ports?.http ??
																				(targetType === "grpc"
																					? grpcTarget.split(":")[1] || "15041"
																					: "3000")}
																		</span>
																		<span
																			className={`text-[9px] ${
																				isOffline
																					? "text-zinc-500"
																					: "text-purple-300"
																			}`}
																		>
																			{n.id === "playground"
																				? "Client Runner"
																				: "IoT / WAN"}
																		</span>
																	</div>
																	{!isOffline && n.tools.length > 0 && (
																		<div className="mt-1.5 flex flex-wrap gap-1">
																			{n.tools.map((tool) => (
																				<button
																					key={tool}
																					type="button"
																					onClick={() => {
																						if (!isConnected) {
																							const port =
																								n.ports?.grpc ?? n.ports?.http;
																							const type = n.ports?.grpc
																								? "grpc"
																								: "http";
																							const targetStr =
																								type === "grpc"
																									? `${n.host}:${port}`
																									: `http://${n.host}:${port}/mcp`;
																							handleSwitchTarget(
																								targetStr,
																								type,
																								tool,
																							);
																						} else {
																							handleSelectTool(tool);
																						}
																					}}
																					className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/15 hover:bg-purple-500/30 border border-purple-500/30 text-purple-200 transition-colors cursor-pointer"
																					title={
																						isConnected
																							? `Load ${tool} in Logic Studio`
																							: `Connect to ${n.name} and load ${tool}`
																					}
																				>
																					+ {tool}
																				</button>
																			))}
																		</div>
																	)}
																</div>
															);
														})
													)}
												</div>
											)}
										</div>
									)}
								</ScrollArea>
							</CardContent>
						</Card>

						{/* Card: Local Mesh Node Info */}
						<Card className="p-4 bg-card border-border shadow-card shrink-0">
							<h3 className="text-xs font-semibold text-white mb-3 flex items-center justify-between">
								<span>Local Mesh Client</span>
								<span className="font-mono text-[10px] text-zinc-400 font-normal">
									WASI v29+
								</span>
							</h3>
							{network ? (
								<div className="space-y-2.5 text-xs">
									<div className="flex items-center justify-between border-b border-border/50 pb-2">
										<span className="text-zinc-400">Peer ID:</span>
										<div className="flex items-center gap-1.5">
											<span
												className={`font-mono text-[11px] truncate max-w-[140px] ${
													onlineNodes > 0 ? "text-white" : "text-zinc-500"
												}`}
												title={network.peerId}
											>
												{onlineNodes > 0 ? network.peerId : "Disconnected"}
											</span>
											{onlineNodes > 0 && (
												<button
													type="button"
													onClick={() => handleCopy(network.peerId, "peerId")}
													className="text-zinc-400 hover:text-white transition-colors p-0.5 rounded"
													title="Copy PeerID"
												>
													{copiedKey === "peerId" ? (
														<Check className="h-3 w-3 text-success" />
													) : (
														<Copy className="h-3 w-3" />
													)}
												</button>
											)}
										</div>
									</div>

									<div className="flex items-center justify-between border-b border-border/50 pb-2">
										<span className="text-zinc-400">Host Address:</span>
										<div className="flex items-center gap-1.5">
											<span
												className={`font-mono text-[11px] ${
													onlineNodes > 0 ? "text-white" : "text-zinc-500"
												}`}
											>
												{onlineNodes > 0 ? network.address : "Disconnected"}
											</span>
											{onlineNodes > 0 && (
												<button
													type="button"
													onClick={() => handleCopy(network.address, "address")}
													className="text-zinc-400 hover:text-white transition-colors p-0.5 rounded"
													title="Copy Host Address"
												>
													{copiedKey === "address" ? (
														<Check className="h-3 w-3 text-success" />
													) : (
														<Copy className="h-3 w-3" />
													)}
												</button>
											)}
										</div>
									</div>

									<div className="flex items-center justify-between border-b border-border/50 pb-2">
										<span className="text-zinc-400">Mesh Topology:</span>
										<span
											className={`font-mono text-[11px] ${
												onlineNodes > 0 ? "text-cyan-400" : "text-rose-400"
											}`}
										>
											{hasNodeStats
												? onlineNodes > 0
													? `${onlineNodes}/${totalNodes} Nodes (3 Tiers)`
													: "0 Nodes Online (Offline)"
												: isScanning
													? "Discovering Topology..."
													: "Synchronizing Mesh..."}
										</span>
									</div>

									<div className="flex items-center justify-between border-b border-border/50 pb-2">
										<span className="text-zinc-400">Avg Mesh Latency:</span>
										<span
											className={`font-mono text-[11px] ${
												onlineNodes > 0 ? "text-emerald-400" : "text-zinc-500"
											}`}
										>
											{onlineNodes > 0
												? scanSummary?.avgLatencyMs !== undefined &&
													scanSummary.avgLatencyMs > 0
													? `${scanSummary.avgLatencyMs} ms`
													: nodes.some(
																(n) => n.rttMs > 0 && n.status === "online",
															)
														? `${Math.round(
																nodes
																	.filter(
																		(n) => n.status === "online" && n.rttMs > 0,
																	)
																	.reduce((acc, curr) => acc + curr.rttMs, 0) /
																	Math.max(
																		1,
																		nodes.filter(
																			(n) =>
																				n.status === "online" && n.rttMs > 0,
																		).length,
																	),
															)} ms`
														: "—"
												: "—"}
										</span>
									</div>

									<div className="flex items-center justify-between border-b border-border/50 pb-2">
										<span className="text-zinc-400">Crypto Suite:</span>
										<span className="text-primary font-mono text-[11px]">
											ML-KEM-768
										</span>
									</div>

									<div className="flex items-center justify-between pt-0.5">
										<span className="text-zinc-400">Sandbox Isolation:</span>
										<span className="text-success font-medium flex items-center gap-1 text-[11px]">
											<CheckCircle2 className="h-3.5 w-3.5" /> WASI-Isolate Safe
										</span>
									</div>
								</div>
							) : (
								<p className="text-xs text-zinc-400">Synchronizing state...</p>
							)}
						</Card>
					</section>

					{/* Right Panel: Editor, Timeline and Results (8 cols) */}
					<section className="lg:col-span-8 flex flex-col space-y-6">
						{/* Card: Logic Editor */}
						<Card className="flex flex-col bg-card border-border shadow-card shrink-0">
							<CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
								<div className="flex items-center gap-2">
									<div className="flex items-center gap-1 p-0.5 bg-surface1 border border-white/10 rounded-lg">
										<button
											type="button"
											onClick={() => setExecutionMode("logic")}
											className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 ${
												executionMode === "logic"
													? "bg-primary text-black font-semibold shadow-sm"
													: "text-zinc-400 hover:text-white"
											}`}
										>
											<Code className="h-3.5 w-3.5" />
											<span>Logic Studio (@LIOP)</span>
										</button>

										<button
											type="button"
											onClick={() => setExecutionMode("form")}
											className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 ${
												executionMode === "form"
													? "bg-primary text-black font-semibold shadow-sm"
													: "text-zinc-400 hover:text-white"
											}`}
										>
											<Terminal className="h-3.5 w-3.5" />
											<span>MCP Tool Form</span>
										</button>
									</div>
								</div>

								{/* Dynamic Template Switcher (Strictly matching exposed capabilities on active target) */}
								{executionMode === "logic" && availableTemplates.length > 0 && (
									<div className="relative flex items-center bg-surface1 border border-white/15 p-0.5 rounded-lg flex-wrap gap-0.5">
										{availableTemplates.map((t) => {
											const isSelected = selectedTemplateId === t.id;
											return (
												<button
													key={t.id}
													type="button"
													onClick={() => handleSelectTemplate(t.id)}
													className="relative z-10 text-[11px] px-2.5 py-1 font-medium transition-colors duration-200 flex items-center gap-1.5"
													title={t.description}
												>
													{isSelected && (
														<motion.div
															layoutId="templateActivePill"
															className="absolute inset-0 rounded-md shadow-sm bg-primary"
															transition={{
																type: "spring",
																stiffness: 450,
																damping: 35,
															}}
														/>
													)}
													<span
														className={`relative z-20 font-medium transition-colors duration-200 flex items-center gap-1 ${
															isSelected
																? "text-black font-semibold"
																: "text-zinc-300 hover:text-white"
														}`}
													>
														<span>{t.name}</span>
													</span>
												</button>
											);
										})}
									</div>
								)}
								{executionMode === "logic" &&
									availableTemplates.length === 0 && (
										<div className="text-[11px] text-zinc-400 font-mono px-2 py-1 bg-surface1/60 rounded border border-white/10">
											{network?.status === "healthy"
												? "Scanning target capabilities..."
												: "Target Offline (0 Capabilities)"}
										</div>
									)}
							</CardHeader>

							<CardContent className="space-y-3">
								{/* Target Offline Notice */}
								{executionMode === "logic" && tools.length === 0 && (
									<div className="p-3 rounded-lg bg-rose-950/20 border border-rose-500/30 text-rose-200 flex items-start gap-3 animate-in fade-in duration-200">
										<ShieldBan className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
										<div className="space-y-1">
											<div className="flex items-center gap-2">
												<h4 className="text-xs font-semibold text-rose-300">
													Target Offline
												</h4>
												<span className="text-[9px] px-1 py-0.2 rounded bg-rose-500/20 font-mono text-rose-200 border border-rose-500/30">
													ZERO-TRUST
												</span>
											</div>
											<p className="text-[11px] text-zinc-300 leading-relaxed">
												Target endpoint{" "}
												<span className="font-mono text-white font-medium">
													{activeConnectedTarget}
												</span>{" "}
												is unreachable. Zero computational enclaves detected.
												Connect to an active node or start your local mesh to
												dispatch logic.
											</p>
										</div>
									</div>
								)}

								{/* Capability Mismatch Notice (Displayed only when target is online but capability is missing) */}
								{executionMode === "logic" &&
									tools.length > 0 &&
									!isCurrentToolSupported && (
										<div className="p-3 rounded-lg bg-red-950/30 border border-red-500/40 text-red-200 flex items-start gap-3 animate-in fade-in duration-200">
											<ShieldBan className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
											<div className="space-y-1">
												<div className="flex items-center gap-2">
													<h4 className="text-xs font-semibold text-red-300">
														Target Mismatch
													</h4>
													<span className="text-[9px] px-1 py-0.2 rounded bg-red-500/20 font-mono text-red-200 border border-red-500/30">
														ZERO-TRUST
													</span>
												</div>
												<p className="text-[11px] text-zinc-300 leading-relaxed">
													Active logic targets capability{" "}
													<span className="font-mono text-cyan-300 font-semibold">
														{currentTemplate?.tool || selectedToolName}
													</span>
													, not exposed by target{" "}
													<span className="font-mono text-white">
														{activeConnectedTarget}
													</span>
													. Execution paused to protect origin runtime.
												</p>
												<div className="text-[10px] text-zinc-400 font-mono pt-0.5 flex items-center gap-1.5 flex-wrap">
													<span>Available on target:</span>
													{tools.map((avail) => (
														<button
															key={avail.name}
															type="button"
															onClick={() => handleSelectTool(avail.name)}
															className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30 transition-colors cursor-pointer"
														>
															+ Switch to {avail.name}
														</button>
													))}
												</div>
											</div>
										</div>
									)}
								{executionMode === "form" ? (
									<DynamicToolForm
										toolName={selectedToolName}
										schema={currentToolObj?.inputSchema}
										values={formArgs}
										onChange={(field, val) =>
											setFormArgs((prev) => ({ ...prev, [field]: val }))
										}
										disabled={isRunning}
									/>
								) : (
									/* Code Editor Frame with Action Bar */
									<div className="relative border border-border rounded-lg bg-editor overflow-hidden">
										{/* Editor Header Bar */}
										<div className="flex items-center justify-between px-3 py-1.5 bg-secondary/40 border-b border-border/60 text-xs">
											<div className="flex items-center gap-2">
												<span className="text-[10px] font-mono text-primary font-semibold">
													@LIOP
												</span>
												<span className="text-border-muted">•</span>
												<span className="text-[11px] text-zinc-400 font-mono">
													wasi_v1 sandbox
												</span>
											</div>

											<div className="flex items-center space-x-1.5">
												<button
													type="button"
													onClick={() => setIsEnvModalOpen(true)}
													className="text-[11px] flex items-center gap-1.5 transition-colors px-2.5 py-0.5 rounded shrink-0 font-medium border text-cyan-300 hover:text-white bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/30 cursor-pointer"
													title="Inspect confidential dataset schema and sandbox constraints"
												>
													<Layers className="h-3 w-3" />
													<span>Env Schema</span>
												</button>

												<button
													type="button"
													onClick={() => setIsExportModalOpen(true)}
													className="text-[11px] flex items-center gap-1.5 transition-colors px-2.5 py-0.5 rounded shrink-0 font-medium border text-primary hover:text-white bg-secondary/80 hover:bg-white/10 border-border cursor-pointer"
													title="Export execution snippet to TypeScript, Python, or cURL"
												>
													<FileCode className="h-3 w-3" />
													<span>Export Code</span>
												</button>

												<button
													type="button"
													onClick={handleResetTemplate}
													className={`text-[11px] flex items-center gap-1.5 transition-colors px-2.5 py-0.5 rounded shrink-0 font-medium border cursor-pointer ${
														isReset
															? "text-emerald-400 bg-emerald-500/15 border-emerald-500/30"
															: "text-zinc-300 hover:text-white bg-surface1/60 hover:bg-white/5 border-white/10"
													}`}
													title="Reset to template original code"
												>
													{isReset ? (
														<Check className="h-3 w-3 text-emerald-400" />
													) : (
														<RotateCcw className="h-3 w-3" />
													)}
													<span>{isReset ? "Reset Done" : "Reset"}</span>
												</button>

												<button
													type="button"
													onClick={() => handleCopy(code, "code")}
													className={`text-[11px] flex items-center gap-1.5 transition-colors px-2.5 py-0.5 rounded shrink-0 font-medium border cursor-pointer ${
														copiedKey === "code"
															? "text-emerald-400 bg-emerald-500/15 border-emerald-500/30"
															: "text-zinc-300 hover:text-white bg-surface1/60 hover:bg-white/5 border-white/10"
													}`}
													title="Copy code payload"
												>
													{copiedKey === "code" ? (
														<>
															<Check className="h-3 w-3 text-emerald-400" />
															<span>Copied</span>
														</>
													) : (
														<>
															<Copy className="h-3 w-3" />
															<span>Copy</span>
														</>
													)}
												</button>
											</div>
										</div>

										<textarea
											value={code}
											onChange={(e) => setCode(e.target.value)}
											className="w-full h-[220px] p-3.5 bg-transparent font-mono text-xs md:text-sm text-[#7dd3fc] focus:outline-none resize-none leading-relaxed"
											style={{ fontFamily: "'JetBrains Mono', monospace" }}
											placeholder="// Write logic to inject on origin node..."
											disabled={isRunning}
											spellCheck={false}
										/>

										{/* Editor Status Footer with Real-time AST Validator */}
										<div className="flex items-center justify-between px-3 py-1 bg-secondary/30 border-t border-border/50 text-[10px] font-mono text-zinc-400">
											<div className="flex items-center gap-3">
												<span>{editorStats.lines} lines</span>
												<span>{editorStats.bytes} bytes</span>
												<span className="text-cyan-400 flex items-center gap-1">
													<Code className="h-3 w-3" />~{editorStats.estTokens}{" "}
													tok (input)
												</span>
											</div>
											<div className="flex items-center gap-3">
												{astValidation.valid ? (
													<span className="text-emerald-400 flex items-center gap-1 font-semibold">
														<Check className="h-3 w-3 text-emerald-400" />
														AST: Valid ({astValidation.runtime})
													</span>
												) : (
													<span
														className="text-rose-400 flex items-center gap-1 truncate max-w-[240px] font-semibold"
														title={astValidation.error || "Syntax Error"}
													>
														<AlertTriangle className="h-3 w-3 text-rose-400 shrink-0" />
														AST Error: {astValidation.error}
													</span>
												)}
												<span>•</span>
												<span className="text-emerald-400 flex items-center gap-1">
													<Fuel className="h-3 w-3 text-amber-400" />
													1M u Fuel
												</span>
												<span>•</span>
												<span className="text-white">HMAC SHA-256</span>
											</div>
										</div>
									</div>
								)}

								{/* Execute Action Bar */}
								<div className="flex items-center justify-between pt-1">
									<div className="text-xs text-zinc-400 flex items-center gap-1.5 flex-wrap">
										<span>Target:</span>
										<span
											className={`font-semibold font-mono text-[11px] ${
												isCurrentToolSupported
													? "text-white"
													: "text-red-400 line-through"
											}`}
										>
											{selectedToolName || "none"}
										</span>
										{!isCurrentToolSupported && (
											<Badge
												variant="outline"
												className="text-[9px] py-0 px-1 font-mono border-red-500/40 text-red-400 bg-red-500/10"
											>
												Unavailable on Target
											</Badge>
										)}
										{currentToolObj?.providerNode && (
											<Badge
												variant="outline"
												className="text-[9px] py-0 px-1 font-mono border-cyan-500/40 text-cyan-300"
											>
												{currentToolObj.providerNode}
											</Badge>
										)}
										{currentToolObj?.tier && (
											<Badge
												variant="outline"
												className="text-[9px] py-0 px-1 font-mono border-white/15 text-zinc-300"
											>
												Tier {currentToolObj.tier}
											</Badge>
										)}
									</div>
									<Button
										onClick={handleExecute}
										disabled={
											isRunning ||
											!selectedToolName ||
											tools.length === 0 ||
											!isCurrentToolSupported ||
											(executionMode === "logic" && !astValidation.valid)
										}
										className={`h-9 px-6 font-bold tracking-wide shadow-md transition-all active:scale-[0.98] ${
											tools.length === 0 ||
											!isCurrentToolSupported ||
											(executionMode === "logic" && !astValidation.valid)
												? "opacity-60 cursor-not-allowed bg-zinc-800 hover:bg-zinc-800 text-zinc-400 border border-zinc-700"
												: ""
										}`}
									>
										{isRunning ? (
											<>
												<Loader2 className="mr-2 h-4 w-4 animate-spin" />
												{executionMode === "logic"
													? "Injecting..."
													: "Calling..."}
											</>
										) : tools.length === 0 ? (
											<>
												<ShieldBan className="mr-2 h-4 w-4 text-rose-400" />
												Target Offline
											</>
										) : !isCurrentToolSupported ? (
											<>
												<ShieldBan className="mr-2 h-4 w-4 text-red-400" />
												Blocked on Target
											</>
										) : executionMode === "logic" && !astValidation.valid ? (
											<>
												<AlertTriangle className="mr-2 h-4 w-4 text-rose-400" />
												Syntax Error
											</>
										) : (
											<>
												<Play className="mr-2 h-4 w-4 fill-current" />
												{executionMode === "logic"
													? "Execute Logic"
													: "Execute Tool"}
											</>
										)}
									</Button>
								</div>
							</CardContent>
						</Card>

						{/* Bottom Grid: Timeline and Results */}
						<div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
							{/* Timeline (5 cols) - Fixed height 380px */}
							<Card className="md:col-span-5 h-[380px] p-4 bg-card border-border shadow-card flex flex-col">
								<h3 className="text-xs font-semibold text-white mb-3 flex items-center gap-2 shrink-0">
									<Activity className="h-4 w-4 text-primary" />
									Cryptographic Pipeline
								</h3>

								<div className="space-y-3 relative before:absolute before:inset-0 before:left-[9px] before:w-[1px] before:bg-border/60 before:-z-10 pb-1 flex-1 overflow-hidden">
									{timeline.map((step, idx) => (
										<div
											key={step.phase}
											className="flex items-start space-x-2.5 text-xs"
										>
											<div className="mt-0.5 shrink-0">
												{step.status === "success" && (
													<div className="bg-success/20 p-0.5 rounded-full border border-success/40">
														<CheckCircle2 className="h-3.5 w-3.5 text-success" />
													</div>
												)}
												{step.status === "failed" && (
													<div className="bg-destructive/20 p-0.5 rounded-full border border-destructive/40">
														<XCircle className="h-3.5 w-3.5 text-destructive" />
													</div>
												)}
												{step.status === "running" && (
													<div className="bg-warning/20 p-0.5 rounded-full border border-warning/40">
														<Loader2 className="h-3.5 w-3.5 text-warning animate-spin" />
													</div>
												)}
												{step.status === "pending" && (
													<div className="w-4.5 h-4.5 rounded-full bg-secondary border border-border flex items-center justify-center text-[9px] text-zinc-400 font-semibold">
														{idx + 1}
													</div>
												)}
											</div>

											<div className="flex-1 min-w-0">
												<div className="flex items-center justify-between gap-1">
													<span
														className={`font-medium ${
															step.status === "running"
																? "text-warning"
																: step.status === "success"
																	? "text-white"
																	: step.status === "failed"
																		? "text-destructive"
																		: "text-zinc-400"
														}`}
													>
														{step.label}
													</span>
													{step.durationMs !== undefined &&
														step.status === "success" && (
															<span className="text-[10px] font-mono tabular-nums text-zinc-300 bg-secondary/80 px-1.5 py-0.2 rounded border border-border/40">
																{step.durationMs === 0
																	? "< 1ms"
																	: `${step.durationMs}ms`}
															</span>
														)}
												</div>
												<p className="text-[11px] text-zinc-400 truncate">
													{step.detail}
												</p>
											</div>
										</div>
									))}
								</div>
							</Card>

							<Card className="md:col-span-7 h-[380px] flex flex-col overflow-hidden bg-card border-border shadow-card">
								<Tabs
									value={activeResultsTab}
									onValueChange={(val) =>
										setActiveResultsTab(
											val as "output" | "debug" | "export" | "telemetry",
										)
									}
									className="flex flex-col h-full"
								>
									<CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0 shrink-0">
										<div className="flex items-center gap-2">
											{/* Animated Sliding Pill Tabs (4 Unified Debug Tabs) */}
											<div className="relative flex items-center bg-surface1 border border-white/15 p-0.5 rounded-md">
												<button
													type="button"
													onClick={() => setActiveResultsTab("output")}
													className="relative z-10 text-xs px-2.5 py-1 font-medium transition-colors duration-200 flex items-center gap-1.5 cursor-pointer"
												>
													{activeResultsTab === "output" && (
														<motion.div
															layoutId="resultsTabPill"
															className="absolute inset-0 bg-primary rounded shadow-sm"
															transition={{
																type: "spring",
																stiffness: 450,
																damping: 35,
															}}
														/>
													)}
													<Terminal
														className={`h-3.5 w-3.5 relative z-20 ${
															activeResultsTab === "output"
																? "text-black"
																: "text-primary"
														}`}
													/>
													<span
														className={`relative z-20 font-medium transition-colors duration-200 ${
															activeResultsTab === "output"
																? "text-black font-semibold"
																: "text-zinc-300 hover:text-white"
														}`}
													>
														Output
													</span>
												</button>

												<button
													type="button"
													onClick={() => setActiveResultsTab("debug")}
													className="relative z-10 text-xs px-2.5 py-1 font-medium transition-colors duration-200 flex items-center gap-1.5 cursor-pointer"
												>
													{activeResultsTab === "debug" && (
														<motion.div
															layoutId="resultsTabPill"
															className="absolute inset-0 bg-primary rounded shadow-sm"
															transition={{
																type: "spring",
																stiffness: 450,
																damping: 35,
															}}
														/>
													)}
													<Bug
														className={`h-3.5 w-3.5 relative z-20 ${
															activeResultsTab === "debug"
																? "text-black"
																: "text-amber-400"
														}`}
													/>
													<span
														className={`relative z-20 font-medium transition-colors duration-200 ${
															activeResultsTab === "debug"
																? "text-black font-semibold"
																: "text-zinc-300 hover:text-white"
														}`}
													>
														Debug
													</span>
												</button>

												<button
													type="button"
													onClick={() => setActiveResultsTab("export")}
													className="relative z-10 text-xs px-2.5 py-1 font-medium transition-colors duration-200 flex items-center gap-1.5 cursor-pointer"
												>
													{activeResultsTab === "export" && (
														<motion.div
															layoutId="resultsTabPill"
															className="absolute inset-0 bg-primary rounded shadow-sm"
															transition={{
																type: "spring",
																stiffness: 450,
																damping: 35,
															}}
														/>
													)}
													<FileCode
														className={`h-3.5 w-3.5 relative z-20 ${
															activeResultsTab === "export"
																? "text-black"
																: "text-cyan-400"
														}`}
													/>
													<span
														className={`relative z-20 font-medium transition-colors duration-200 ${
															activeResultsTab === "export"
																? "text-black font-semibold"
																: "text-zinc-300 hover:text-white"
														}`}
													>
														Export Code
													</span>
												</button>

												<button
													type="button"
													onClick={() => setActiveResultsTab("telemetry")}
													className="relative z-10 text-xs px-2.5 py-1 font-medium transition-colors duration-200 flex items-center gap-1.5 cursor-pointer"
												>
													{activeResultsTab === "telemetry" && (
														<motion.div
															layoutId="resultsTabPill"
															className="absolute inset-0 bg-primary rounded shadow-sm"
															transition={{
																type: "spring",
																stiffness: 450,
																damping: 35,
															}}
														/>
													)}
													<Activity
														className={`h-3.5 w-3.5 relative z-20 ${
															activeResultsTab === "telemetry"
																? "text-black"
																: "text-emerald-400"
														}`}
													/>
													<span
														className={`relative z-20 font-medium transition-colors duration-200 ${
															activeResultsTab === "telemetry"
																? "text-black font-semibold"
																: "text-zinc-300 hover:text-white"
														}`}
													>
														Live Telemetry
													</span>
												</button>
											</div>
										</div>

										{meta?.latencyMs !== undefined && (
											<Badge
												variant="outline"
												className="text-[10px] font-mono flex items-center gap-1 border-white/15 bg-secondary/60 text-zinc-300"
											>
												<Activity className="h-3 w-3 text-primary" />
												{meta.latencyMs}ms total
											</Badge>
										)}
									</CardHeader>

									<CardContent className="flex-1 min-h-0 overflow-hidden p-0">
										<ScrollArea className="h-full px-5">
											{/* Error or Shield Block alert */}
											{errorAlert && (
												<div className="mb-3 pt-1">
													<Alert
														variant="destructive"
														className="border-destructive/40 bg-destructive/10"
													>
														<ShieldBan className="h-4 w-4 text-destructive" />
														<AlertTitle className="text-xs font-semibold">
															{errorAlert.title}
														</AlertTitle>
														<AlertDescription className="text-xs leading-relaxed mt-1">
															{errorAlert.desc}
														</AlertDescription>
													</Alert>
												</div>
											)}

											{/* Tab 1: Aggregated Output JSON */}
											<TabsContent
												value="output"
												className="m-0 space-y-3 pb-5"
											>
												{result ? (
													<div className="space-y-2">
														<div className="flex items-center justify-between text-xs">
															<span className="text-zinc-300 text-[11px]">
																Payload returned by remote origin node:
															</span>
															<button
																type="button"
																onClick={() =>
																	handleCopy(
																		JSON.stringify(result, null, 2),
																		"result",
																	)
																}
																className={`text-[11px] flex items-center gap-1.5 transition-colors px-2.5 py-0.5 rounded shrink-0 font-medium border cursor-pointer ${
																	copiedKey === "result"
																		? "text-emerald-400 bg-emerald-500/15 border-emerald-500/30"
																		: "text-zinc-300 hover:text-white bg-surface1/60 hover:bg-white/5 border-white/10"
																}`}
																title="Copy JSON payload"
															>
																{copiedKey === "result" ? (
																	<>
																		<Check className="h-3 w-3 text-emerald-400" />
																		<span>Copied</span>
																	</>
																) : (
																	<>
																		<Copy className="h-3 w-3" />
																		<span>Copy JSON</span>
																	</>
																)}
															</button>
														</div>

														<div className="rounded-lg bg-editor border border-border p-3 font-mono text-[11px] text-[#86efac] overflow-x-auto leading-relaxed shadow-inner">
															<pre>{JSON.stringify(result, null, 2)}</pre>
														</div>
													</div>
												) : !errorAlert && !isRunning ? (
													<div className="flex flex-col items-center justify-center py-14 text-zinc-400 text-center space-y-2">
														<Terminal className="h-6 w-6 text-zinc-500" />
														<p className="text-xs font-medium text-zinc-200">
															Awaiting Execution
														</p>
														<p className="text-[11px] text-zinc-400 max-w-[240px]">
															Select a template, inspect the runtime schema with{" "}
															<strong>Env Schema</strong>, or click{" "}
															<strong>Execute Logic</strong>.
														</p>
													</div>
												) : isRunning ? (
													<div className="flex flex-col items-center justify-center py-14 text-zinc-400 text-center space-y-2.5">
														<Loader2 className="h-6 w-6 animate-spin text-primary" />
														<p className="text-xs text-zinc-300">
															Injecting logic and enforcing Zero-Trust
															policies...
														</p>
													</div>
												) : null}
											</TabsContent>

											{/* Tab 2: Debug Console & Execution Tracing */}
											<TabsContent value="debug" className="m-0 space-y-3 pb-5">
												<div className="space-y-3 pt-1 text-xs">
													{/* Execution Phase Trace */}
													<div className="p-3 rounded-lg bg-surface1 border border-border space-y-2">
														<div className="flex items-center justify-between">
															<span className="font-semibold text-white text-[11px] flex items-center gap-1.5">
																<Bug className="h-3.5 w-3.5 text-amber-400" />
																Pipeline Execution Phase Trace
															</span>
															<span className="font-mono text-[10px] text-zinc-400">
																Target: {targetType.toUpperCase()}
															</span>
														</div>
														<div className="border border-border/80 rounded-md overflow-hidden">
															<table className="w-full text-left font-mono text-[11px]">
																<thead className="bg-secondary/40 text-zinc-400 border-b border-border/80 text-[10px] uppercase">
																	<tr>
																		<th className="px-2.5 py-1.5">Phase</th>
																		<th className="px-2.5 py-1.5">Status</th>
																		<th className="px-2.5 py-1.5">Latency</th>
																		<th className="px-2.5 py-1.5">Detail</th>
																	</tr>
																</thead>
																<tbody className="divide-y divide-border/50 bg-background/40">
																	{timeline.map((step) => (
																		<tr
																			key={step.phase}
																			className="hover:bg-white/5"
																		>
																			<td className="px-2.5 py-1.5 font-semibold text-white">
																				{step.label}
																			</td>
																			<td className="px-2.5 py-1.5">
																				<span
																					className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-semibold ${
																						step.status === "success"
																							? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
																							: step.status === "running"
																								? "bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse"
																								: step.status === "failed"
																									? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
																									: "bg-zinc-800 text-zinc-500"
																					}`}
																				>
																					{step.status.toUpperCase()}
																				</span>
																			</td>
																			<td className="px-2.5 py-1.5 text-zinc-300">
																				{step.durationMs !== undefined
																					? `${step.durationMs}ms`
																					: "—"}
																			</td>
																			<td className="px-2.5 py-1.5 text-zinc-400 truncate max-w-[200px]">
																				{step.detail}
																			</td>
																		</tr>
																	))}
																</tbody>
															</table>
														</div>
													</div>

													{/* Egress Shield Verification Status */}
													<div className="p-3 rounded-lg bg-surface1 border border-border space-y-1.5">
														<div className="flex items-center justify-between">
															<span className="font-semibold text-white text-[11px] flex items-center gap-1.5">
																<ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
																Layer 4 Egress PII Shield Audit
															</span>
															<Badge
																variant={
																	meta?.shieldBlocked
																		? "destructive"
																		: "success"
																}
																className="font-mono text-[10px]"
															>
																{meta?.shieldBlocked ? "INTERCEPTED" : "PASSED"}
															</Badge>
														</div>
														<p className="text-[11px] text-zinc-400 leading-relaxed">
															{meta?.shieldBlocked
																? "Active defense triggered: Attempt to exfiltrate raw unaggregated rows intercepted by Zero-Trust Egress Shield. Data transfer was truncated before exiting origin host."
																: "Zero-Trust egress verification confirmed. Logic module produced only compliant aggregates with zero PII side-channel exposure."}
														</p>
													</div>

													{/* AST & Isolation Parameters */}
													<div className="p-3 rounded-lg bg-surface1 border border-border flex items-center justify-between text-[11px] font-mono">
														<span className="text-zinc-400">
															Sandbox:{" "}
															<strong className="text-primary">
																V8 Isolate / wasi_v1
															</strong>
														</span>
														<span className="text-zinc-400">
															PQC Session:{" "}
															<strong className="text-emerald-400">
																ML-KEM-768
															</strong>
														</span>
														<span className="text-zinc-400">
															Protocol:{" "}
															<strong className="text-cyan-300">
																LIOP v1.0
															</strong>
														</span>
													</div>
												</div>
											</TabsContent>

											{/* Tab 3: Embedded Code Export */}
											<TabsContent
												value="export"
												className="m-0 space-y-3 pb-5"
											>
												<div className="space-y-3 pt-1 text-xs">
													{/* Language Switcher & Copy Action */}
													<div className="flex items-center justify-between">
														<div className="flex items-center gap-1.5 p-0.5 bg-surface1 border border-border rounded-lg">
															<button
																type="button"
																onClick={() => setExportTabLang("typescript")}
																className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
																	exportTabLang === "typescript"
																		? "bg-primary text-black font-semibold shadow-sm"
																		: "text-zinc-400 hover:text-white"
																}`}
															>
																TypeScript (SDK)
															</button>
															<button
																type="button"
																onClick={() => setExportTabLang("python")}
																className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
																	exportTabLang === "python"
																		? "bg-primary text-black font-semibold shadow-sm"
																		: "text-zinc-400 hover:text-white"
																}`}
															>
																Python
															</button>
															<button
																type="button"
																onClick={() => setExportTabLang("curl")}
																className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
																	exportTabLang === "curl"
																		? "bg-primary text-black font-semibold shadow-sm"
																		: "text-zinc-400 hover:text-white"
																}`}
															>
																cURL / CLI
															</button>
															<button
																type="button"
																onClick={() => setExportTabLang("grpc")}
																className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
																	exportTabLang === "grpc"
																		? "bg-primary text-black font-semibold shadow-sm"
																		: "text-zinc-400 hover:text-white"
																}`}
															>
																gRPC JSON
															</button>
														</div>

														<div className="flex items-center gap-2">
															<button
																type="button"
																onClick={async () => {
																	const snippet = getExportCode(exportTabLang);
																	await handleCopy(snippet, "exportTab");
																	setExportTabCopied(true);
																	setTimeout(
																		() => setExportTabCopied(false),
																		2000,
																	);
																}}
																className={`text-xs flex items-center gap-1.5 px-3 py-1 rounded-md font-medium border transition-all cursor-pointer ${
																	exportTabCopied
																		? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
																		: "bg-surface1 text-zinc-200 border-border hover:bg-white/10 hover:text-white"
																}`}
															>
																{exportTabCopied ? (
																	<>
																		<Check className="h-3.5 w-3.5 text-emerald-400" />
																		<span>Copied</span>
																	</>
																) : (
																	<>
																		<Copy className="h-3.5 w-3.5" />
																		<span>Copy Code</span>
																	</>
																)}
															</button>
															<button
																type="button"
																onClick={() => setIsExportModalOpen(true)}
																className="text-xs flex items-center gap-1 px-2 py-1 rounded-md text-zinc-400 hover:text-white border border-border/60 hover:bg-white/5 cursor-pointer"
																title="Open in full modal"
															>
																<FileCode className="h-3.5 w-3.5" />
																<span>Full View</span>
															</button>
														</div>
													</div>

													{/* Code Snippet Box */}
													<div className="rounded-lg bg-editor border border-border p-3.5 font-mono text-xs text-[#7dd3fc] overflow-auto max-h-[250px] leading-relaxed select-all">
														<pre>{getExportCode(exportTabLang)}</pre>
													</div>

													<div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
														<span>
															Target Tool:{" "}
															<strong className="text-white">
																{selectedToolName}
															</strong>
														</span>
														<span>
															Endpoint:{" "}
															{targetType === "grpc"
																? grpcTarget
																: targetType === "http"
																	? httpUrl
																	: stdioCmd}
														</span>
													</div>
												</div>
											</TabsContent>

											{/* Tab 4: Live Telemetry & Cryptographic Proofs */}
											<TabsContent
												value="telemetry"
												className="m-0 space-y-3 pb-5"
											>
												{meta?.telemetry ? (
													<div className="space-y-3 pt-1 text-xs">
														{/* BPE Context Token Telemetry */}
														{meta.telemetry.tokens && (
															<div className="p-3 rounded-lg bg-surface1 border border-border space-y-2">
																<div className="flex items-center justify-between">
																	<div className="flex items-center gap-2">
																		<div className="p-1.5 rounded-md bg-secondary text-primary">
																			<Terminal className="h-4 w-4" />
																		</div>
																		<div>
																			<span className="font-semibold text-white text-[11px]">
																				Context Token Telemetry (BPE)
																			</span>
																			<p className="text-[10px] text-zinc-400">
																				Tokenizer:{" "}
																				{meta.telemetry.tokens.estimatorName ||
																					"o200k_base"}
																			</p>
																		</div>
																	</div>
																	{meta.telemetry.tokens.savingsPercent !==
																		undefined &&
																		meta.telemetry.tokens
																			.traditionalContextTokens > 0 && (
																			<Badge className="bg-emerald-500 text-black font-mono font-bold text-xs px-2 py-0.5 shadow-sm">
																				-{meta.telemetry.tokens.savingsPercent}%
																				Tokens
																			</Badge>
																		)}
																</div>

																{meta.telemetry.tokens
																	.traditionalContextTokens &&
																meta.telemetry.tokens.traditionalContextTokens >
																	0 ? (
																	<div className="grid grid-cols-3 gap-2 pt-1 border-t border-border/60">
																		<div className="p-2 rounded bg-secondary/40 border border-border">
																			<p className="text-[10px] text-zinc-400">
																				In-Situ Module
																			</p>
																			<p className="text-sm font-bold font-mono text-emerald-400">
																				{meta.telemetry.tokens.totalTokens ?? 0}{" "}
																				<span className="text-[10px] font-normal text-zinc-400">
																					tok
																				</span>
																			</p>
																			<p className="text-[9px] text-zinc-400 mt-0.5 font-mono">
																				{meta.telemetry.tokens.inputTokens ?? 0}{" "}
																				in /{" "}
																				{meta.telemetry.tokens.outputTokens ??
																					0}{" "}
																				out
																			</p>
																		</div>

																		<div className="p-2 rounded bg-secondary/40 border border-border">
																			<p className="text-[10px] text-zinc-400">
																				Raw Origin Dataset
																			</p>
																			<p className="text-sm font-bold font-mono text-zinc-300">
																				{meta.telemetry.tokens.traditionalContextTokens.toLocaleString()}{" "}
																				<span className="text-[10px] font-normal text-zinc-400">
																					tok
																				</span>
																			</p>
																			<p className="text-[9px] text-zinc-400 mt-0.5">
																				Unfiltered context
																			</p>
																		</div>

																		<div className="p-2 rounded bg-secondary/40 border border-border">
																			<p className="text-[10px] text-zinc-400">
																				Context Saved
																			</p>
																			<p className="text-sm font-bold font-mono text-primary">
																				{(
																					meta.telemetry.tokens
																						.traditionalContextTokens -
																					(meta.telemetry.tokens.totalTokens ??
																						0)
																				).toLocaleString()}{" "}
																				<span className="text-[10px] font-normal text-zinc-400">
																					tok
																				</span>
																			</p>
																			<p className="text-[9px] text-zinc-400 mt-0.5">
																				Kept in origin enclave
																			</p>
																		</div>
																	</div>
																) : (
																	<div className="grid grid-cols-3 gap-2 pt-1 border-t border-border/60">
																		<div className="p-2 rounded bg-secondary/40 border border-border">
																			<p className="text-[10px] text-zinc-400">
																				Input Tokens
																			</p>
																			<p className="text-sm font-bold font-mono text-cyan-300">
																				{meta.telemetry.tokens.inputTokens ?? 0}
																			</p>
																		</div>
																		<div className="p-2 rounded bg-secondary/40 border border-border">
																			<p className="text-[10px] text-zinc-400">
																				Output Tokens
																			</p>
																			<p className="text-sm font-bold font-mono text-emerald-400">
																				{meta.telemetry.tokens.outputTokens ??
																					0}
																			</p>
																		</div>
																		<div className="p-2 rounded bg-secondary/40 border border-border">
																			<p className="text-[10px] text-zinc-400">
																				Total Tokens
																			</p>
																			<p className="text-sm font-bold font-mono text-white">
																				{meta.telemetry.tokens.totalTokens ?? 0}
																			</p>
																		</div>
																	</div>
																)}
															</div>
														)}

														{/* WASI AST Fuel Quota */}
														{meta.telemetry.fuel && (
															<div className="p-3 rounded-lg bg-surface1 border border-border space-y-2">
																<div className="flex items-center justify-between">
																	<div className="flex items-center gap-2">
																		<Fuel className="h-4 w-4 text-primary" />
																		<div>
																			<span className="font-semibold text-white text-[11px]">
																				WASI Instruction Fuel (AST
																				Deterministic)
																			</span>
																			<p className="text-[10px] text-zinc-400">
																				Execution quota enforced by origin
																				runtime
																			</p>
																		</div>
																	</div>
																	<div className="text-right font-mono">
																		<span className="text-xs font-bold text-white">
																			{(
																				meta.telemetry.fuel.consumed ?? 0
																			).toLocaleString()}
																		</span>
																		<span className="text-[10px] text-zinc-400">
																			{" "}
																			/{" "}
																			{(
																				meta.telemetry.fuel.maxLimit ?? 1000000
																			).toLocaleString()}{" "}
																			u
																		</span>
																	</div>
																</div>

																{/* Fuel Progress Bar */}
																<div className="w-full bg-secondary/80 rounded-full h-2 overflow-hidden border border-border">
																	<div
																		className="bg-primary h-2 rounded-full transition-all duration-300"
																		style={{
																			width: `${Math.min(100, Math.max(2, meta.telemetry.fuel.percentUsed ?? 0))}%`,
																		}}
																	/>
																</div>

																<div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
																	<span>
																		Fuel Used:{" "}
																		<strong className="text-primary font-semibold">
																			{meta.telemetry.fuel.percentUsed ?? 0}%
																		</strong>
																	</span>
																	<span>Quantization: 100-Fuel-Bucket</span>
																</div>
															</div>
														)}

														{/* Wire Bandwidth & Payload Size */}
														{meta.telemetry.bandwidth && (
															<div className="p-3 rounded-lg bg-surface1 border border-border space-y-2">
																<div className="flex items-center justify-between">
																	<div className="flex items-center gap-2">
																		<Globe className="h-4 w-4 text-primary" />
																		<div>
																			<span className="font-semibold text-white text-[11px]">
																				Wire Payload & Egress Traffic
																			</span>
																			<p className="text-[10px] text-zinc-400">
																				Physical socket egress measured at
																				runtime
																			</p>
																		</div>
																	</div>
																	{meta.telemetry.bandwidth
																		.egressReductionPercent !== undefined &&
																		meta.telemetry.bandwidth
																			.rawDatasetProtectedBytes > 0 && (
																			<Badge
																				variant="outline"
																				className="border-emerald-500/40 text-emerald-400 font-mono text-[10px]"
																			>
																				-
																				{
																					meta.telemetry.bandwidth
																						.egressReductionPercent
																				}
																				% Wire Reduction
																			</Badge>
																		)}
																</div>

																<div className="grid grid-cols-2 gap-2 text-xs">
																	<div className="p-2 rounded bg-secondary/40 border border-border font-mono">
																		<span className="text-[10px] text-zinc-400 block font-sans">
																			Wire Payload (Envelope + Output):
																		</span>
																		<strong className="text-white text-xs">
																			{meta.telemetry.bandwidth.payloadBytes !==
																			undefined
																				? `${(meta.telemetry.bandwidth.payloadBytes / 1024).toFixed(2)} KB`
																				: "Measured in socket"}
																		</strong>
																	</div>
																	<div className="p-2 rounded bg-secondary/40 border border-border font-mono">
																		<span className="text-[10px] text-zinc-400 block font-sans">
																			Origin Dataset Retained:
																		</span>
																		<strong className="text-emerald-400 text-xs">
																			{meta.telemetry.bandwidth
																				.rawDatasetProtectedBytes &&
																			meta.telemetry.bandwidth
																				.rawDatasetProtectedBytes > 0
																				? `${(meta.telemetry.bandwidth.rawDatasetProtectedBytes / 1024).toFixed(1)} KB`
																				: "Zero egress leakage"}
																		</strong>
																	</div>
																</div>
															</div>
														)}

														{/* Phase Latency Breakdown */}
														{meta.telemetry.phases && (
															<div className="p-3 rounded-lg bg-surface1 border border-border space-y-1.5">
																<div className="flex items-center justify-between">
																	<span className="font-semibold text-white text-[11px] block">
																		Phase Latency Breakdown
																	</span>
																	<span className="text-[10px] font-mono text-zinc-400">
																		Total:{" "}
																		{meta.telemetry.phases.totalLatencyMs ??
																			meta.latencyMs ??
																			0}{" "}
																		ms
																	</span>
																</div>
																<div className="grid grid-cols-5 gap-1.5 text-center font-mono text-[10px]">
																	<div className="p-1.5 rounded bg-secondary/50 border border-border">
																		<span className="text-zinc-400 block text-[9px] font-sans">
																			Route
																		</span>
																		<span className="text-zinc-200 font-semibold">
																			{meta.telemetry.phases.discoveryMs ?? 0}{" "}
																			ms
																		</span>
																	</div>
																	<div className="p-1.5 rounded bg-secondary/50 border border-border">
																		<span className="text-zinc-400 block text-[9px] font-sans">
																			Kyber
																		</span>
																		<span className="text-primary font-semibold">
																			{meta.telemetry.phases.pqcMs ?? 0} ms
																		</span>
																	</div>
																	<div className="p-1.5 rounded bg-secondary/50 border border-border">
																		<span className="text-zinc-400 block text-[9px] font-sans">
																			Seal
																		</span>
																		<span className="text-zinc-200 font-semibold">
																			{meta.telemetry.phases.sealingMs ?? 0} ms
																		</span>
																	</div>
																	<div className="p-1.5 rounded bg-secondary/50 border border-border">
																		<span className="text-zinc-400 block text-[9px] font-sans">
																			Sandbox
																		</span>
																		<span className="text-emerald-400 font-semibold">
																			{meta.telemetry.phases.wasiSandboxMs ?? 0}{" "}
																			ms
																		</span>
																	</div>
																	<div className="p-1.5 rounded bg-secondary/50 border border-border">
																		<span className="text-zinc-400 block text-[9px] font-sans">
																			ZK-Proof
																		</span>
																		<span className="text-primary font-semibold">
																			{meta.telemetry.phases.zkVerificationMs ??
																				0}{" "}
																			ms
																		</span>
																	</div>
																</div>
															</div>
														)}

														{/* Cryptographic Proofs Row */}
														<div className="p-3 rounded-lg bg-surface1 border border-border space-y-2">
															<div className="flex items-center justify-between">
																<div className="flex items-center gap-2">
																	<Fingerprint className="h-4 w-4 text-emerald-400" />
																	<div>
																		<p className="font-semibold text-white text-[11px]">
																			ZK-Receipt Proof & PQC Suite
																		</p>
																		<p className="text-[10px] text-zinc-400">
																			ML-KEM-768 • AES-256-GCM • HMAC SHA-256
																		</p>
																	</div>
																</div>
																<Badge
																	variant="success"
																	className="font-mono text-[10px]"
																>
																	VERIFIED
																</Badge>
															</div>

															{meta?.zkHash && (
																<div className="flex items-center justify-between bg-editor p-2 rounded border border-border font-mono text-[10px] text-zinc-300">
																	<span className="truncate mr-2 select-all font-mono text-emerald-300">
																		{meta.zkHash}
																	</span>
																	<button
																		type="button"
																		onClick={() =>
																			handleCopy(meta.zkHash || "", "zkHash")
																		}
																		className="text-[10px] flex items-center gap-1 text-zinc-400 hover:text-white shrink-0 px-1.5 py-0.5 rounded bg-surface1 border border-border transition-colors cursor-pointer"
																		title="Copy ZK-Receipt Hash"
																	>
																		{copiedKey === "zkHash" ? (
																			<>
																				<Check className="h-3 w-3 text-emerald-400" />
																				<span className="text-emerald-400">
																					Copied
																				</span>
																			</>
																		) : (
																			<>
																				<Copy className="h-3 w-3" />
																				<span>Copy</span>
																			</>
																		)}
																	</button>
																</div>
															)}
														</div>
													</div>
												) : (
													<div className="flex flex-col items-center justify-center py-14 text-zinc-400 text-center space-y-2">
														<Fuel className="h-6 w-6 text-zinc-500" />
														<p className="text-xs font-medium text-zinc-200">
															No Live Telemetry Recorded
														</p>
														<p className="text-[11px] text-zinc-400 max-w-[240px]">
															Execute a capability to measure live network RTT,
															BPE tokens, wire egress, and WASI instruction
															fuel.
														</p>
													</div>
												)}
											</TabsContent>
										</ScrollArea>
									</CardContent>
								</Tabs>
							</Card>
						</div>
					</section>
				</div>
			</main>

			{/* Code Export Modal */}
			<CodeExportModal
				isOpen={isExportModalOpen}
				onClose={() => setIsExportModalOpen(false)}
				toolName={selectedToolName || "Analyze_Synthetic_Bank_Transactions"}
				logicCode={code}
				targetType={targetType}
				targetEndpoint={
					targetType === "grpc"
						? grpcTarget
						: targetType === "http"
							? httpUrl
							: stdioCmd
				}
			/>

			{/* Runtime Environment & Schema Inspector Modal */}
			<EnvironmentExplorer
				isOpen={isEnvModalOpen}
				onClose={() => setIsEnvModalOpen(false)}
				toolName={selectedToolName || "Analyze_Synthetic_Bank_Transactions"}
			/>

			{/* Footer */}
			<footer className="border-t border-border bg-card/60 py-3 mt-auto transition-colors">
				<div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between text-[11px] text-zinc-400 gap-2">
					<div>
						© 2026 Nekzus Solutions. Logic-Injection-on-Origin Protocol (LIOP).
					</div>
					<div className="flex items-center space-x-4">
						<span className="flex items-center gap-1 font-mono">
							<span className="inline-block w-1.5 h-1.5 rounded-full bg-success"></span>
							<span className="text-zinc-300">
								P2P Mesh: Multi-Tier Zero-Trust
							</span>
						</span>
						<span className="font-mono text-zinc-300">
							8 Servers Verified Across 3 Layers
						</span>
					</div>
				</div>
			</footer>
		</div>
	);
}

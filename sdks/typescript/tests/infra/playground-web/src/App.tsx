import { useState, useEffect, useMemo } from "react"
import { motion } from "framer-motion"
import { 
  Terminal, 
  Play, 
  Waypoints, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Code,
  Activity,
  RefreshCw,
  AlertTriangle,
  ShieldBan,
  Fingerprint,
  Gauge,
  Copy,
  Check,
  Search,
  Moon,
  Layers,
  RotateCcw,
  Handshake,
  LockKeyhole,
  X
} from "lucide-react"

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./components/ui/card"
import { Button } from "./components/ui/button"
import { Badge } from "./components/ui/badge"
import { ScrollArea } from "./components/ui/scroll-area"
import { Alert, AlertTitle, AlertDescription } from "./components/ui/alert"
import { Tabs, TabsContent } from "./components/ui/tabs"

// Official LIOP Protocol Vector Mark (Regular Octagon with core origin node and 8 logic injection waves)
function LiopLogo({ className = "h-8 w-8 text-primary" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <polygon points="100,76.57 76.57,100 43.43,100 20,76.57 20,43.43 43.43,20 76.57,20 100,43.43" />
        <circle cx="60" cy="60" r="10" fill="currentColor" stroke="none" />
        <path d="M 60 60 C 60 45, 100 75, 100 60" />
        <path d="M 60 60 C 60 45, 100 75, 100 60" transform="rotate(45 60 60)" />
        <path d="M 60 60 C 60 45, 100 75, 100 60" transform="rotate(90 60 60)" />
        <path d="M 60 60 C 60 45, 100 75, 100 60" transform="rotate(135 60 60)" />
        <path d="M 60 60 C 60 45, 100 75, 100 60" transform="rotate(180 60 60)" />
        <path d="M 60 60 C 60 45, 100 75, 100 60" transform="rotate(225 60 60)" />
        <path d="M 60 60 C 60 45, 100 75, 100 60" transform="rotate(270 60 60)" />
        <path d="M 60 60 C 60 45, 100 75, 100 60" transform="rotate(315 60 60)" />
      </g>
    </svg>
  )
}

interface Tool {
  name: string
  description?: string
  taxonomy?: {
    domain?: string
    clearanceTier?: string | number
    executionTypes?: string[]
  }
  inputSchema?: unknown
}

interface NetworkInfo {
  status: string
  peerId: string
  peersCount: number
  role: string
  address: string
  version?: string
}

interface TimelineStep {
  phase: string
  label: string
  detail: string
  status: "pending" | "running" | "success" | "failed"
  durationMs?: number
}

interface ExecutionMeta {
  latencyMs?: number
  tool?: string
  verifiedZk?: boolean
  zkHash?: string
  shieldBlocked?: boolean
}

// Logic Templates
const TEMPLATES = [
  {
    id: "hft",
    name: "Market Analysis",
    tool: "Analyze_HFT_Market_Data",
    domain: "Financial HFT",
    clearanceTier: "Tier 1",
    description: "Computes VWAP and average HFT spreads with differential privacy utility preservation.",
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
@END`
  },
  {
    id: "bank",
    name: "Bank Aggregation",
    tool: "Analyze_Synthetic_Bank_Transactions",
    domain: "Core Banking",
    clearanceTier: "Tier 3",
    description: "Aggregates balances and account type distributions under zero-trust data sovereignty.",
    code: `@LIOP{wasi_v1, BankAnalysis}
const records = env.records;
// Sum balances and count account types with data sovereignty
const stats = records.reduce((acc, row) => {
  acc.totalBalance += row.balance;
  acc.accountsByType[row.accountType] = (acc.accountsByType[row.accountType] || 0) + 1;
  return acc;
}, { totalBalance: 0, accountsByType: {} });

return {
  totalAccounts: records.length,
  averageBalance: records.length > 0 ? stats.totalBalance / records.length : 0,
  distribution: stats.accountsByType
};
@END`
  },
  {
    id: "vault",
    name: "Medical Stats",
    tool: "Analyze_Synthetic_Medical_Records",
    domain: "Healthcare",
    clearanceTier: "Tier 5",
    description: "Anonymized diagnostic distributions and mean patient age calculation.",
    code: `@LIOP{wasi_v1, MedicalStats}
const patients = env.records;
// Analyze diagnosis distribution and mean patient age
const stats = patients.reduce((acc, p) => {
  acc.diagnoses[p.diagnosis] = (acc.diagnoses[p.diagnosis] || 0) + 1;
  acc.totalAge += p.age;
  return acc;
}, { diagnoses: {}, totalAge: 0 });

return {
  totalPatients: patients.length,
  averageAge: patients.length > 0 ? stats.totalAge / patients.length : 0,
  diagnosesDistribution: stats.diagnoses
};
@END`
  },
  {
    id: "pii_attack",
    name: "PII Attack",
    tool: "Analyze_Synthetic_Bank_Transactions",
    domain: "Adversarial",
    clearanceTier: "Exfiltration Trap",
    description: "Adversarial attempt to exfiltrate individual raw rows (Intercepted by Egress Shield).",
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
@END`
  }
]

export default function App() {
  // Theme state
  const [theme, setTheme] = useState<"obsidian" | "slate">(() => {
    return (localStorage.getItem("liop_playground_theme") as "obsidian" | "slate") || "obsidian"
  })

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme)
    localStorage.setItem("liop_playground_theme", theme)
  }, [theme])

  // Network & tools state
  const [network, setNetwork] = useState<NetworkInfo | null>(null)
  const [tools, setTools] = useState<Tool[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedToolName, setSelectedToolName] = useState("")
  const [selectedTemplateId, setSelectedTemplateId] = useState("hft")
  const [activeResultsTab, setActiveResultsTab] = useState<"output" | "telemetry">("output")
  const [code, setCode] = useState(TEMPLATES[0].code)
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const [meta, setMeta] = useState<ExecutionMeta | null>(null)
  const [errorAlert, setErrorAlert] = useState<{ title: string; desc: string } | null>(null)
  const [loadingHealth, setLoadingHealth] = useState(false)
  const [loadingTools, setLoadingTools] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [isReset, setIsReset] = useState(false)

  // Bulletproof copy helper with fallback
  const handleCopy = async (text: string, key: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        throw new Error("Clipboard API unavailable")
      }
    } catch (_err) {
      const textArea = document.createElement("textarea")
      textArea.value = text
      textArea.style.position = "fixed"
      textArea.style.left = "-999999px"
      textArea.style.top = "-999999px"
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      try {
        document.execCommand("copy")
      } catch (e) {
        console.error("Fallback copy failed", e)
      }
      document.body.removeChild(textArea)
    }
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 1500)
  }
  
  // SSE steps state
  const [timeline, setTimeline] = useState<TimelineStep[]>([
    { phase: "bootstrap", label: "P2P Mesh Bootstrap", detail: "Node synchronized", status: "pending" },
    { phase: "discovery", label: "Resource Discovery", detail: "DHT peer resolution", status: "pending" },
    { phase: "pqc", label: "Kyber-768 Handshake", detail: "ML-KEM key exchange", status: "pending" },
    { phase: "sealing", label: "AES-256-GCM Sealing", detail: "Envelope cipher & sign", status: "pending" },
    { phase: "execution", label: "WASI Sandbox Run", detail: "Logic injection on origin", status: "pending" },
    { phase: "zk_verify", label: "ZK-Receipt HMAC Seal", detail: "Computational integrity proof", status: "pending" },
  ])

  useEffect(() => {
    fetchHealth()
    fetchTools()
  }, [])

  const fetchHealth = async () => {
    setLoadingHealth(true)
    try {
      const res = await fetch("/api/health")
      if (res.ok) {
        const data = await res.json()
        setNetwork(data)
      }
    } catch (err) {
      console.error("Error fetching network health:", err)
    } finally {
      setLoadingHealth(false)
    }
  }

  const fetchTools = async () => {
    setLoadingTools(true)
    try {
      const res = await fetch("/api/discover")
      if (res.ok) {
        const data = await res.json()
        const fetchedTools = data.tools || []
        setTools(fetchedTools)
        if (fetchedTools.length > 0 && !selectedToolName) {
          setSelectedToolName(fetchedTools[0].name)
        }
      }
    } catch (err) {
      console.error("Error fetching tools:", err)
    } finally {
      setLoadingTools(false)
    }
  }

  const handleSelectTemplate = (templateId: string) => {
    const t = TEMPLATES.find(x => x.id === templateId)
    if (t) {
      setSelectedTemplateId(templateId)
      setCode(t.code)
      setSelectedToolName(t.tool)
    }
  }

  // Interactively select a tool and automatically load matching template
  const handleSelectTool = (toolName: string) => {
    setSelectedToolName(toolName)
    const matchingTemplate = TEMPLATES.find(t => t.tool === toolName)
    if (matchingTemplate) {
      setSelectedTemplateId(matchingTemplate.id)
      setCode(matchingTemplate.code)
    }
  }

  const handleResetTemplate = () => {
    const t = TEMPLATES.find(x => x.id === selectedTemplateId)
    if (t) {
      setCode(t.code)
      setIsReset(true)
      setTimeout(() => setIsReset(false), 1500)
    }
  }

  // Filtered tools
  const filteredTools = useMemo(() => {
    if (!searchQuery.trim()) return tools
    const q = searchQuery.toLowerCase()
    return tools.filter(t => 
      t.name.toLowerCase().includes(q) || 
      (t.description && t.description.toLowerCase().includes(q)) ||
      (t.taxonomy?.domain && t.taxonomy.domain.toLowerCase().includes(q))
    )
  }, [tools, searchQuery])

  // Selected tool object
  const currentToolObj = useMemo(() => {
    return tools.find(t => t.name === selectedToolName)
  }, [tools, selectedToolName])

  // Editor stats
  const editorStats = useMemo(() => {
    const lines = code.split("\n").length
    const bytes = new TextEncoder().encode(code).length
    return { lines, bytes }
  }, [code])

  const handleExecute = async () => {
    if (isRunning) return
    setIsRunning(true)
    setResult(null)
    setMeta(null)
    setErrorAlert(null)
    
    // Reset timeline status
    setTimeline([
      { phase: "bootstrap", label: "P2P Mesh Bootstrap", detail: "Verifying connection...", status: "running" },
      { phase: "discovery", label: "Resource Discovery", detail: "Resolving capability in DHT...", status: "pending" },
      { phase: "pqc", label: "Kyber-768 Handshake", detail: "Establishing post-quantum channel...", status: "pending" },
      { phase: "sealing", label: "AES-256-GCM Sealing", detail: "Encrypting injection package...", status: "pending" },
      { phase: "execution", label: "WASI Sandbox Run", detail: "Executing inside origin sandbox...", status: "pending" },
      { phase: "zk_verify", label: "ZK-Receipt HMAC Seal", detail: "Verifying cryptographic proof...", status: "pending" },
    ])

    try {
      const response = await fetch("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          tool: selectedToolName,
          logic: code
        })
      })

      if (!response.ok) {
        throw new Error(`Gateway error: ${response.statusText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error("Unable to initialize SSE stream reader")
      }

      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (!line.trim()) continue
          
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6)
            try {
              const event = JSON.parse(dataStr)
              
              if (event.type === "step") {
                updateTimelineStep(event.phase, event.detail, event.status, event.durationMs)
              } else if (event.type === "result") {
                setResult(event.payload)
                setMeta(event.meta || null)
                setIsRunning(false)
              } else if (event.type === "error") {
                setErrorAlert({
                  title: event.payload.title || "Execution Error",
                  desc: event.payload.desc || "A sandbox failure occurred on origin node"
                })
                setMeta(event.meta || null)
                setIsRunning(false)
              }
            } catch (e) {
              console.error("Error parsing SSE line:", e, line)
            }
          }
        }
      }
    } catch (err: any) {
      setErrorAlert({
        title: "Connection Error",
        desc: err.message || "Failed to communicate with Playground Gateway"
      })
      setIsRunning(false)
      setTimeline(prev => 
        prev.map(step => 
          step.status === "running" ? { ...step, status: "failed", detail: "Connection interrupted" } : step
        )
      )
    }
  }

  const updateTimelineStep = (
    phase: string, 
    detail: string, 
    status: "pending" | "running" | "success" | "failed",
    durationMs?: number
  ) => {
    setTimeline(prev => {
      let phaseFound = false
      return prev.map(step => {
        if (step.phase === phase) {
          phaseFound = true
          return { ...step, status, detail, durationMs: durationMs ?? step.durationMs }
        }
        if (phaseFound && step.status !== "success" && step.status !== "failed") {
          return { ...step, status: "pending" }
        }
        if (!phaseFound && (step.status === "pending" || step.status === "running")) {
          return { ...step, status: "success" }
        }
        return step
      })
    })
  }

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans antialiased text-foreground selection:bg-primary/20 selection:text-primary">
      {/* Header Craft-Floor */}
      <header className="border-b border-border bg-card/90 backdrop-blur-sm sticky top-0 z-50 transition-colors">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Free-Standing LIOP Official Logo: full size h-8 w-8, no enclosing card */}
            <LiopLogo className="h-8 w-8 text-primary shrink-0 transition-transform duration-200 hover:scale-105" />
            
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-white">
                LIOP Playground
              </h1>
              <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 text-zinc-300 border border-white/15 rounded bg-secondary/70">
                v{network?.version || "2.1.0-alpha.14"}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            {network ? (
              <div className="flex items-center space-x-2 bg-secondary/80 border border-white/10 px-3 py-1 rounded-md text-xs">
                <span className="inline-block h-2 w-2 rounded-full bg-success"></span>
                <span className="text-white font-medium">{network.peersCount + 1} Active Nodes</span>
                <span className="text-zinc-400 font-mono text-[11px]">({network.role})</span>
              </div>
            ) : (
              <Button size="sm" variant="ghost" onClick={fetchHealth} disabled={loadingHealth} className="h-8 text-xs border border-white/15 bg-[#0b0e14] text-zinc-300 hover:text-white">
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loadingHealth ? 'animate-spin' : ''}`} />
                Connect
              </Button>
            )}

            {/* Sliding Pill Animated Theme Switcher (Unified Primary Cyan Style) */}
            <div className="relative flex items-center bg-[#0b0e14] border border-white/15 p-0.5 rounded-md">
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
                <Moon className={`relative z-20 h-3.5 w-3.5 transition-colors duration-200 ${
                  theme === "obsidian" ? "text-black" : "text-zinc-400"
                }`} />
                <span className={`relative z-20 font-medium transition-colors duration-200 ${
                  theme === "obsidian" ? "text-black" : "text-zinc-300 hover:text-white"
                }`}>
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
                <Layers className={`relative z-20 h-3.5 w-3.5 transition-colors duration-200 ${
                  theme === "slate" ? "text-black" : "text-zinc-400"
                }`} />
                <span className={`relative z-20 font-medium transition-colors duration-200 ${
                  theme === "slate" ? "text-black" : "text-zinc-300 hover:text-white"
                }`}>
                  Slate
                </span>
              </button>
            </div>

            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => { fetchHealth(); fetchTools(); }} 
              className="h-8 px-2 border-white/15 bg-[#0b0e14] text-zinc-300 hover:text-white hover:bg-white/5"
              title="Refresh network state"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingTools ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Panel: Capabilities and Node (4 cols) */}
        <section className="lg:col-span-4 flex flex-col space-y-6">
          {/* Card: Discovery */}
          <Card className="flex flex-col h-[460px] overflow-hidden bg-card border-border shadow-card">
            <CardHeader className="pb-3 shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white">
                  <Waypoints className="h-4 w-4 text-primary" />
                  Mesh Capabilities
                </CardTitle>
                <Badge variant="outline" className="text-[10px] font-mono border-white/15 text-zinc-300">
                  {tools.length} providers
                </Badge>
              </div>
              <CardDescription className="text-xs text-zinc-400">
                Capabilities announced in the Kademlia DHT routing table.
              </CardDescription>

              {/* Search / Filter bar - Dark input styling with crisp contrast and clear button */}
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
                  className="w-full h-8 pl-8 pr-7 bg-[#0b0e14] border border-white/15 rounded text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition-all"
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
            </CardHeader>

            <CardContent className="flex-1 min-h-0 overflow-hidden p-0">
              <ScrollArea className="h-full px-5">
                {loadingTools ? (
                  <div className="flex flex-col items-center justify-center py-12 text-zinc-400 space-y-2">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="text-xs text-zinc-300">Querying DHT...</span>
                  </div>
                ) : filteredTools.length === 0 ? (
                  <div className="text-center py-12 text-zinc-400 space-y-2">
                    <AlertTriangle className="h-6 w-6 mx-auto text-warning" />
                    <p className="text-xs font-medium text-zinc-200">No capabilities found</p>
                    <p className="text-[11px] text-zinc-400 max-w-[200px] mx-auto">Try adjusting your search query.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5 pb-5">
                    {filteredTools.map((t) => {
                      const isSelected = selectedToolName === t.name
                      const tier = t.taxonomy?.clearanceTier === "forbidden" || t.taxonomy?.clearanceTier === 5
                        ? "5" 
                        : t.taxonomy?.clearanceTier === "sensitive" || t.taxonomy?.clearanceTier === 3
                          ? "3" 
                          : "1"
                      
                      return (
                        <div 
                          key={t.name}
                          onClick={() => handleSelectTool(t.name)}
                          className={`p-3 rounded-md border transition-all cursor-pointer ${
                            isSelected 
                              ? "bg-primary/10 border-primary/60 text-white shadow-sm ring-1 ring-primary/30" 
                              : "bg-secondary/40 border-border/70 hover:bg-secondary/80 hover:border-border"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-xs text-zinc-100 truncate max-w-[170px]">{t.name}</span>
                            <Badge 
                              variant={tier === "5" ? "destructive" : tier === "3" ? "warning" : "success"}
                              className="text-[10px] py-0 px-1.5 font-normal"
                            >
                              Tier {tier}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-zinc-300 line-clamp-2 leading-relaxed">{t.description || "No description available."}</p>
                          {t.taxonomy?.domain && (
                            <div className="mt-1.5 flex items-center justify-between text-[10px] text-zinc-400">
                              <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary/80"></span>
                                {t.taxonomy.domain}
                              </span>
                              <span className="font-mono text-[9px] opacity-75">gRPC LIO</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Card: Local Mesh Node Info */}
          <Card className="p-4 bg-card border-border shadow-card shrink-0">
            <h3 className="text-xs font-semibold text-white mb-3 flex items-center justify-between">
              <span>Local Mesh Node</span>
              <span className="font-mono text-[10px] text-zinc-400 font-normal">WASI v29+</span>
            </h3>
            {network ? (
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                  <span className="text-zinc-400">Peer ID:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-white font-mono text-[11px] truncate max-w-[140px]" title={network.peerId}>
                      {network.peerId}
                    </span>
                    <button 
                      type="button"
                      onClick={() => handleCopy(network.peerId, "peerId")}
                      className="text-zinc-400 hover:text-white transition-colors p-0.5 rounded"
                      title="Copy PeerID"
                    >
                      {copiedKey === "peerId" ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                  <span className="text-zinc-400">Host Address:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-white font-mono text-[11px]">{network.address}</span>
                    <button 
                      type="button"
                      onClick={() => handleCopy(network.address, "address")}
                      className="text-zinc-400 hover:text-white transition-colors p-0.5 rounded"
                      title="Copy Host Address"
                    >
                      {copiedKey === "address" ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                  <span className="text-zinc-400">Crypto Suite:</span>
                  <span className="text-primary font-mono text-[11px]">ML-KEM-768</span>
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
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white">
                  <Code className="h-4 w-4 text-primary" />
                  Logic Studio
                </CardTitle>
                <CardDescription className="text-xs text-zinc-400">
                  JavaScript/WASI micro-module injected directly on origin node.
                </CardDescription>
              </div>
              
              {/* Animated Sliding Pill Template Switcher (Primary Cyan + High Contrast Text) */}
              <div className="relative flex items-center bg-[#0b0e14] border border-white/15 p-0.5 rounded-lg">
                {TEMPLATES.map(t => {
                  const isSelected = selectedTemplateId === t.id
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleSelectTemplate(t.id)}
                      className="relative z-10 text-[11px] px-3 py-1 font-medium transition-colors duration-200"
                    >
                      {isSelected && (
                        <motion.div
                          layoutId="templateActivePill"
                          className="absolute inset-0 bg-primary rounded-md shadow-sm"
                          transition={{ type: "spring", stiffness: 450, damping: 35 }}
                        />
                      )}
                      <span className={`relative z-20 font-medium transition-colors duration-200 ${
                        isSelected ? "text-black" : "text-zinc-300 hover:text-white"
                      }`}>
                        {t.name}
                      </span>
                    </button>
                  )
                })}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              {/* Code Editor Frame with Action Bar */}
              <div className="relative border border-border rounded-lg bg-[#030305] overflow-hidden">
                {/* Editor Header Bar */}
                <div className="flex items-center justify-between px-3 py-1.5 bg-secondary/40 border-b border-border/60 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-primary font-semibold">@LIOP</span>
                    <span className="text-border-muted">•</span>
                    <span className="text-[11px] text-zinc-400 font-mono">wasi_v1 sandbox</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button 
                      type="button"
                      onClick={handleResetTemplate} 
                      className={`text-[11px] flex items-center gap-1.5 transition-colors px-2.5 py-0.5 rounded shrink-0 font-medium border ${
                        isReset 
                          ? "text-emerald-400 bg-emerald-500/15 border-emerald-500/30" 
                          : "text-zinc-300 hover:text-white bg-[#0b0e14]/60 hover:bg-white/5 border-white/10"
                      }`}
                      title="Reset to template original code"
                    >
                      {isReset ? <Check className="h-3 w-3 text-emerald-400" /> : <RotateCcw className="h-3 w-3" />}
                      <span>{isReset ? "Reset Done" : "Reset"}</span>
                    </button>
                    
                    <button 
                      type="button"
                      onClick={() => handleCopy(code, "code")} 
                      className={`text-[11px] flex items-center gap-1.5 transition-colors px-2.5 py-0.5 rounded shrink-0 font-medium border ${
                        copiedKey === "code" 
                          ? "text-emerald-400 bg-emerald-500/15 border-emerald-500/30" 
                          : "text-zinc-300 hover:text-white bg-[#0b0e14]/60 hover:bg-white/5 border-white/10"
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

                {/* Editor Status Footer */}
                <div className="flex items-center justify-between px-3 py-1 bg-secondary/30 border-t border-border/50 text-[10px] font-mono text-zinc-400">
                  <div className="flex items-center gap-3">
                    <span>{editorStats.lines} lines</span>
                    <span>{editorStats.bytes} bytes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-success">Fuel: 5,000,000 max</span>
                    <span>•</span>
                    <span className="text-white">HMAC Bind: Active</span>
                  </div>
                </div>
              </div>

              {/* Execute Action Bar */}
              <div className="flex items-center justify-between pt-1">
                <div className="text-xs text-zinc-400 flex items-center gap-1.5">
                  <span>Target:</span>
                  <span className="font-semibold text-white font-mono text-[11px]">{selectedToolName || "none"}</span>
                  {currentToolObj?.taxonomy?.clearanceTier && (
                    <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono border-white/15 text-zinc-300">
                      Tier {currentToolObj.taxonomy.clearanceTier}
                    </Badge>
                  )}
                </div>
                <Button 
                  onClick={handleExecute} 
                  disabled={isRunning || !selectedToolName}
                  className="h-9 px-6 font-bold tracking-wide shadow-md transition-all active:scale-[0.98]"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Injecting...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4 fill-current" />
                      Execute Logic
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Bottom Grid: Timeline and Results with Stable Height (Zero Layout Shift) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            
            {/* Timeline (5 cols) - Fixed height 350px */}
            <Card className="md:col-span-5 h-[350px] p-4 bg-card border-border shadow-card flex flex-col">
              <h3 className="text-xs font-semibold text-white mb-3 flex items-center gap-2 shrink-0">
                <Activity className="h-4 w-4 text-primary" />
                Cryptographic Pipeline
              </h3>
              
              <div className="space-y-3 relative before:absolute before:inset-0 before:left-[9px] before:w-[1px] before:bg-border/60 before:-z-10 pb-1 flex-1 overflow-hidden">
                {timeline.map((step, idx) => (
                  <div key={step.phase} className="flex items-start space-x-2.5 text-xs">
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
                        <span className={`font-medium ${
                          step.status === "running" 
                            ? "text-warning" 
                            : step.status === "success" 
                              ? "text-white" 
                              : step.status === "failed" 
                                ? "text-destructive" 
                                : "text-zinc-400"
                        }`}>
                          {step.label}
                        </span>
                        {step.durationMs !== undefined && step.status === "success" && (
                          <span className="text-[10px] font-mono tabular-nums text-zinc-300 bg-secondary/80 px-1.5 py-0.2 rounded border border-border/40">
                            {step.durationMs === 0 ? "< 1ms" : `${step.durationMs}ms`}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 truncate">{step.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Results (7 cols) with Animated Sliding Pill Tabs (Primary Cyan + High Contrast) - Fixed height 350px */}
            <Card className="md:col-span-7 h-[350px] flex flex-col overflow-hidden bg-card border-border shadow-card">
              <Tabs value={activeResultsTab} onValueChange={(val) => setActiveResultsTab(val as "output" | "telemetry")} className="flex flex-col h-full">
                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0 shrink-0">
                  <div className="flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-primary" />
                    
                    {/* Animated Sliding Pill Tabs (Unified Primary Cyan Style + WCAG AAA High Contrast) */}
                    <div className="relative flex items-center bg-[#0b0e14] border border-white/15 p-0.5 rounded-md">
                      <button
                        type="button"
                        onClick={() => setActiveResultsTab("output")}
                        className="relative z-10 text-xs px-3 py-1 font-medium transition-colors duration-200"
                      >
                        {activeResultsTab === "output" && (
                          <motion.div
                            layoutId="resultsTabPill"
                            className="absolute inset-0 bg-primary rounded shadow-sm"
                            transition={{ type: "spring", stiffness: 450, damping: 35 }}
                          />
                        )}
                        <span className={`relative z-20 font-medium transition-colors duration-200 ${
                          activeResultsTab === "output" ? "text-black" : "text-zinc-300 hover:text-white"
                        }`}>
                          Aggregated Output
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveResultsTab("telemetry")}
                        className="relative z-10 text-xs px-3 py-1 font-medium transition-colors duration-200"
                      >
                        {activeResultsTab === "telemetry" && (
                          <motion.div
                            layoutId="resultsTabPill"
                            className="absolute inset-0 bg-primary rounded shadow-sm"
                            transition={{ type: "spring", stiffness: 450, damping: 35 }}
                          />
                        )}
                        <span className={`relative z-20 font-medium transition-colors duration-200 ${
                          activeResultsTab === "telemetry" ? "text-black" : "text-zinc-300 hover:text-white"
                        }`}>
                          Cryptographic Proofs
                        </span>
                      </button>
                    </div>
                  </div>

                  {meta?.latencyMs !== undefined && (
                    <Badge variant="outline" className="text-[10px] font-mono flex items-center gap-1 border-white/15 bg-secondary/60 text-zinc-300">
                      <Gauge className="h-3 w-3 text-primary" />
                      {meta.latencyMs}ms total
                    </Badge>
                  )}
                </CardHeader>

                <CardContent className="flex-1 min-h-0 overflow-hidden p-0">
                  <ScrollArea className="h-full px-5">
                    {/* Error or Shield Block alert */}
                    {errorAlert && (
                      <div className="mb-3 pt-1">
                        <Alert variant="destructive" className="border-destructive/40 bg-destructive/10">
                          <ShieldBan className="h-4 w-4 text-destructive" />
                          <AlertTitle className="text-xs font-semibold">{errorAlert.title}</AlertTitle>
                          <AlertDescription className="text-xs leading-relaxed mt-1">
                            {errorAlert.desc}
                          </AlertDescription>
                        </Alert>
                      </div>
                    )}

                    {/* Tab 1: JSON Output */}
                    <TabsContent value="output" className="m-0 space-y-3 pb-5">
                      {result ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-zinc-300 text-[11px]">Payload returned by remote node:</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(JSON.stringify(result, null, 2), "result")}
                              className={`text-[11px] flex items-center gap-1.5 transition-colors px-2.5 py-0.5 rounded shrink-0 font-medium border ${
                                copiedKey === "result" 
                                  ? "text-emerald-400 bg-emerald-500/15 border-emerald-500/30" 
                                  : "text-zinc-300 hover:text-white bg-[#0b0e14]/60 hover:bg-white/5 border-white/10"
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

                          <div className="rounded-lg bg-[#030305] border border-border p-3 font-mono text-[11px] text-[#86efac] overflow-x-auto leading-relaxed shadow-inner">
                            <pre>{JSON.stringify(result, null, 2)}</pre>
                          </div>
                        </div>
                      ) : !errorAlert && !isRunning ? (
                        <div className="flex flex-col items-center justify-center py-14 text-zinc-400 text-center space-y-2">
                          <Terminal className="h-6 w-6 text-zinc-500" />
                          <p className="text-xs font-medium text-zinc-200">Awaiting Execution</p>
                          <p className="text-[11px] text-zinc-400 max-w-[220px]">Select a template or write logic, then click Execute Logic.</p>
                        </div>
                      ) : isRunning ? (
                        <div className="flex flex-col items-center justify-center py-14 text-zinc-400 text-center space-y-2.5">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                          <p className="text-xs text-zinc-300">Injecting logic and enforcing Zero-Trust policies...</p>
                        </div>
                      ) : null}
                    </TabsContent>

                    {/* Tab 2: Cryptographic Proofs & Telemetry */}
                    <TabsContent value="telemetry" className="m-0 space-y-3 pb-5">
                      {result || meta ? (
                        <div className="space-y-2.5 pt-1 text-xs">
                          <div className="p-2.5 rounded-md bg-secondary/40 border border-border flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Fingerprint className="h-4 w-4 text-success" />
                              <div>
                                <p className="font-semibold text-white text-[11px]">ZK-Receipt HMAC-SHA256</p>
                                <p className="text-[10px] text-zinc-400">Computational integrity proof bound to origin node</p>
                              </div>
                            </div>
                            <Badge variant="success" className="font-mono text-[10px]">
                              VALID
                            </Badge>
                          </div>

                          <div className="p-2.5 rounded-md bg-secondary/40 border border-border flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Handshake className="h-4 w-4 text-primary" />
                              <div>
                                <p className="font-semibold text-white text-[11px]">Post-Quantum Key Exchange</p>
                                <p className="text-[10px] text-zinc-400">ML-KEM-768 (Kyber) quantum-resistant link</p>
                              </div>
                            </div>
                            <Badge variant="outline" className="font-mono text-[10px] border-primary/40 text-primary">
                              SECURE
                            </Badge>
                          </div>

                          <div className="p-2.5 rounded-md bg-secondary/40 border border-border flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <LockKeyhole className="h-4 w-4 text-primary" />
                              <div>
                                <p className="font-semibold text-white text-[11px]">Symmetric Envelope Seal</p>
                                <p className="text-[10px] text-zinc-400">AES-256-GCM authenticated cipher of payload and return</p>
                              </div>
                            </div>
                            <Badge variant="outline" className="font-mono text-[10px] border-white/15 text-zinc-300">
                              SEALED
                            </Badge>
                          </div>

                          <div className="p-2.5 rounded-md bg-secondary/40 border border-border flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <ShieldBan className="h-4 w-4 text-success" />
                              <div>
                                <p className="font-semibold text-white text-[11px]">Egress PII Shield Status</p>
                                <p className="text-[10px] text-zinc-400">Mandatory aggregation policy (K-Anonymity + NER)</p>
                              </div>
                            </div>
                            <Badge variant={meta?.shieldBlocked ? "destructive" : "success"} className="font-mono text-[10px]">
                              {meta?.shieldBlocked ? "INTERCEPTED" : "PASSED"}
                            </Badge>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-14 text-zinc-400 text-xs">
                          Execute a query to inspect cryptographic session certificates.
                        </div>
                      )}
                    </TabsContent>
                  </ScrollArea>
                </CardContent>
              </Tabs>
            </Card>

          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/60 py-3 mt-auto transition-colors">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between text-[11px] text-zinc-400 gap-2">
          <div>
            © 2026 Nekzus Solutions. Logic-Injection-on-Origin Protocol (LIOP).
          </div>
          <div className="flex items-center space-x-4">
            <span className="flex items-center gap-1 font-mono">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-success"></span>
              <span className="text-zinc-300">P2P Mesh: Kademlia DHT</span>
            </span>
            <span className="font-mono text-zinc-300">Zero-Trust Architecture</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

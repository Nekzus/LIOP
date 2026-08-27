import { useState, useEffect } from "react"
import { 
  ShieldCheck, 
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
  Gauge
} from "lucide-react"

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./components/ui/card"
import { Button } from "./components/ui/button"
import { Badge } from "./components/ui/badge"
import { ScrollArea } from "./components/ui/scroll-area"
import { Alert, AlertTitle, AlertDescription } from "./components/ui/alert"

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

// Plantillas de logica
const TEMPLATES = [
  {
    id: "hft",
    name: "Market Analysis",
    tool: "Analyze_HFT_Market_Data",
    description: "Calcula VWAP y spreads promedios HFT con preservacion de utilidad.",
    code: `@LIOP{wasi_v1, HftAnalysis}
const ticks = env.records;
// Calcular VWAP y promedios de bid/ask spreads
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
    description: "Suma balances y cuenta tipos de cuentas de forma descentralizada.",
    code: `@LIOP{wasi_v1, BankAnalysis}
const records = env.records;
// Sumar balances y contar tipos de cuentas de manera soberana
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
    description: "Distribucion por diagnostico y promedio de edad.",
    code: `@LIOP{wasi_v1, MedicalStats}
const patients = env.records;
// Analizar distribuciones de diagnosticos y promedios de edad
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
    name: "PII Attack (Exfiltration)",
    tool: "Analyze_Synthetic_Bank_Transactions",
    description: "Intento adversarial de extraer registros individuales crudos (Sera bloqueado por Egress Shield).",
    code: `@LIOP{wasi_v1, PiiAttack}
const records = env.records;
// Intento de exfiltrar informacion cruda individual
// Esto sera interceptado y bloqueado por el Egress PII Shield
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
  const [network, setNetwork] = useState<NetworkInfo | null>(null)
  const [tools, setTools] = useState<Tool[]>([])
  const [selectedToolName, setSelectedToolName] = useState("")
  const [code, setCode] = useState(TEMPLATES[0].code)
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const [meta, setMeta] = useState<ExecutionMeta | null>(null)
  const [errorAlert, setErrorAlert] = useState<{ title: string; desc: string } | null>(null)
  const [loadingHealth, setLoadingHealth] = useState(false)
  const [loadingTools, setLoadingTools] = useState(false)
  
  // SSE steps state
  const [timeline, setTimeline] = useState<TimelineStep[]>([
    { phase: "bootstrap", label: "P2P Mesh Bootstrap", detail: "Nodo sincronizado", status: "pending" },
    { phase: "discovery", label: "Resource Discovery", detail: "Resolucion de proveedor en malla", status: "pending" },
    { phase: "pqc", label: "Kyber-768 Handshake", detail: "Acuerdo de clave ML-KEM", status: "pending" },
    { phase: "sealing", label: "AES-256-GCM Sealing", detail: "Cifrado y firma de envoltorio", status: "pending" },
    { phase: "execution", label: "WASI Sandbox Run", detail: "Inyeccion en nodo origen", status: "pending" },
    { phase: "zk_verify", label: "ZK-Receipt HMAC Seal", detail: "Verificacion de integridad", status: "pending" },
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
      console.error("Error al obtener estado de red:", err)
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
      console.error("Error al obtener herramientas:", err)
    } finally {
      setLoadingTools(false)
    }
  }

  const handleSelectTemplate = (templateId: string) => {
    const t = TEMPLATES.find(x => x.id === templateId)
    if (t) {
      setCode(t.code)
      setSelectedToolName(t.tool)
    }
  }

  const handleExecute = async () => {
    if (isRunning) return
    setIsRunning(true)
    setResult(null)
    setMeta(null)
    setErrorAlert(null)
    
    // Reset timeline status
    setTimeline([
      { phase: "bootstrap", label: "P2P Mesh Bootstrap", detail: "Verificando conexion...", status: "running" },
      { phase: "discovery", label: "Resource Discovery", detail: "Resolviendo capacidad en DHT...", status: "pending" },
      { phase: "pqc", label: "Kyber-768 Handshake", detail: "Estableciendo sesion post-cuantica...", status: "pending" },
      { phase: "sealing", label: "AES-256-GCM Sealing", detail: "Cifrando paquete de inyeccion...", status: "pending" },
      { phase: "execution", label: "WASI Sandbox Run", detail: "Ejecutando en sandbox de nodo...", status: "pending" },
      { phase: "zk_verify", label: "ZK-Receipt HMAC Seal", detail: "Verificando prueba criptografica...", status: "pending" },
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
        throw new Error(`Fallo en gateway: ${response.statusText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error("No se pudo iniciar canal de lectura SSE")
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
                  title: event.payload.title || "Error de ejecucion",
                  desc: event.payload.desc || "Ocurrio una falla en el sandbox"
                })
                setMeta(event.meta || null)
                setIsRunning(false)
              }
            } catch (e) {
              console.error("Error parseando linea SSE:", e, line)
            }
          }
        }
      }
    } catch (err: any) {
      setErrorAlert({
        title: "Error de Conexion",
        desc: err.message || "No se pudo conectar con el Playground Gateway"
      })
      setIsRunning(false)
      setTimeline(prev => 
        prev.map(step => 
          step.status === "running" ? { ...step, status: "failed", detail: "Conexion interrumpida" } : step
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
    <div className="min-h-screen bg-background flex flex-col font-sans antialiased text-foreground">
      {/* Header Craft-Floor */}
      <header className="border-b border-border bg-[#0a0a0f] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-primary/10 p-1.5 rounded border border-primary/20">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-white">
                LIOP Playground
              </h1>
              <span className="text-[11px] font-medium px-1.5 py-0.2 text-muted-foreground border border-border/60 rounded">
                Alpha
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {network ? (
              <div className="flex items-center space-x-2 bg-secondary/60 border border-border px-2.5 py-1 rounded text-xs">
                <span className="inline-block h-2 w-2 rounded-full bg-success"></span>
                <span className="text-white font-medium">{network.peersCount + 1} Nodos activos</span>
                <span className="text-muted-foreground">({network.role})</span>
              </div>
            ) : (
              <Button size="sm" variant="ghost" onClick={fetchHealth} disabled={loadingHealth} className="h-8 text-xs">
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loadingHealth ? 'animate-spin' : ''}`} />
                Conectar
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => { fetchHealth(); fetchTools(); }} className="h-8 px-2">
              <RefreshCw className={`h-3.5 w-3.5 ${loadingTools ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Panel Izquierdo: Capacidades y Nodo (4 cols) */}
        <section className="lg:col-span-4 flex flex-col space-y-6">
          {/* Card: Discovery */}
          <Card className="flex-1 flex flex-col overflow-hidden bg-card border-border/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white">
                <Waypoints className="h-4 w-4 text-primary" />
                Discovery
              </CardTitle>
              <CardDescription className="text-xs">
                Herramientas verificadas en la red P2P mediante Kademlia DHT.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-[260px] lg:h-[360px] px-5">
                {loadingTools ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground space-y-2">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="text-xs">Consultando DHT...</span>
                  </div>
                ) : tools.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground space-y-2">
                    <AlertTriangle className="h-6 w-6 mx-auto text-warning" />
                    <p className="text-xs font-medium">No se detectaron herramientas</p>
                    <p className="text-[11px] max-w-[200px] mx-auto">Verifica que los nodos esten sincronizados en la red.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5 pb-5">
                    {tools.map((t) => (
                      <div 
                        key={t.name}
                        onClick={() => setSelectedToolName(t.name)}
                        className={`p-3 rounded border transition-colors cursor-pointer ${
                          selectedToolName === t.name 
                            ? "bg-primary/10 border-primary/40 text-white" 
                            : "bg-secondary/20 border-border/50 hover:bg-secondary/40 hover:border-border"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-xs truncate max-w-[180px]">{t.name}</span>
                          <Badge 
                            variant={
                              t.taxonomy?.clearanceTier === "forbidden" || t.taxonomy?.clearanceTier === 5
                                ? "destructive" 
                                : t.taxonomy?.clearanceTier === "sensitive" || t.taxonomy?.clearanceTier === 3
                                  ? "warning" 
                                  : "success"
                            }
                            className="text-[10px] py-0 px-1.5 font-normal"
                          >
                            Tier {t.taxonomy?.clearanceTier === "forbidden" || t.taxonomy?.clearanceTier === 5 ? "5" : t.taxonomy?.clearanceTier === "sensitive" || t.taxonomy?.clearanceTier === 3 ? "3" : "1"}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{t.description || "Sin descripcion."}</p>
                        {t.taxonomy?.domain && (
                          <div className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary/60"></span>
                            {t.taxonomy.domain}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Card: Informacion de Red Local */}
          <Card className="p-4 bg-card border-border/80">
            <h3 className="text-xs font-semibold text-white mb-3">
              Informacion del Nodo
            </h3>
            {network ? (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between border-b border-border/40 pb-1.5">
                  <span className="text-muted-foreground">Peer ID:</span>
                  <span className="text-white truncate max-w-[170px]" title={network.peerId}>
                    {network.peerId}
                  </span>
                </div>
                <div className="flex justify-between border-b border-border/40 pb-1.5">
                  <span className="text-muted-foreground">Host Address:</span>
                  <span className="text-white">{network.address}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sandbox Security:</span>
                  <span className="text-success font-medium flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> WASI-Isolated
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Sincronizando estado...</p>
            )}
          </Card>
        </section>

        {/* Panel Derecho: Editor, Timeline y Resultados (8 cols) */}
        <section className="lg:col-span-8 flex flex-col space-y-6">
          {/* Card: Logic Editor */}
          <Card className="flex flex-col bg-card border-border/80">
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white">
                  <Code className="h-4 w-4 text-primary" />
                  Logic Editor
                </CardTitle>
                <CardDescription className="text-xs">
                  Escribe micro-modulos de logica para inyectar y procesar soberanamente en origen.
                </CardDescription>
              </div>
              
              {/* Botones de plantillas */}
              <div className="flex items-center space-x-1 bg-secondary/40 border border-border/50 p-0.5 rounded">
                {TEMPLATES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleSelectTemplate(t.id)}
                    className={`text-[11px] px-2.5 py-1 rounded transition-colors font-medium ${
                      code === t.code 
                        ? "bg-primary text-black font-semibold" 
                        : "text-muted-foreground hover:text-white"
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              {/* Code Editor */}
              <div className="relative border border-border/80 rounded bg-[#030305]">
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full h-[250px] p-3.5 bg-transparent font-mono text-xs md:text-sm text-[#7dd3fc] focus:outline-none resize-none leading-relaxed"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  placeholder="// Escribe la logica a inyectar..."
                  disabled={isRunning}
                  spellCheck={false}
                />
              </div>

              {/* Boton Ejecutar */}
              <div className="flex items-center justify-between pt-1">
                <div className="text-xs text-muted-foreground">
                  Destino: <span className="font-semibold text-white">{selectedToolName || "ninguno"}</span>
                </div>
                <Button 
                  onClick={handleExecute} 
                  disabled={isRunning || !selectedToolName}
                  className="h-9 px-5 font-bold"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Inyectando...
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

          {/* Fila Inferior: Timeline y Resultados */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Timeline (5 cols) */}
            <Card className="md:col-span-5 p-4 bg-card border-border/80">
              <h3 className="text-xs font-semibold text-white mb-3 flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Execution Timeline
              </h3>
              
              <div className="space-y-3 relative before:absolute before:inset-0 before:left-[9px] before:w-[1px] before:bg-border/40 before:-z-10 pb-1">
                {timeline.map((step, idx) => (
                  <div key={step.phase} className="flex items-start space-x-2.5 text-xs">
                    <div className="mt-0.5">
                      {step.status === "success" && (
                        <div className="bg-success/20 p-0.5 rounded-full border border-success/30">
                          <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                        </div>
                      )}
                      {step.status === "failed" && (
                        <div className="bg-destructive/20 p-0.5 rounded-full border border-destructive/30">
                          <XCircle className="h-3.5 w-3.5 text-destructive" />
                        </div>
                      )}
                      {step.status === "running" && (
                        <div className="bg-warning/20 p-0.5 rounded-full border border-warning/30">
                          <Loader2 className="h-3.5 w-3.5 text-warning animate-spin" />
                        </div>
                      )}
                      {step.status === "pending" && (
                        <div className="w-4.5 h-4.5 rounded-full bg-secondary border border-border/60 flex items-center justify-center text-[9px] text-muted-foreground font-semibold">
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
                                : "text-muted-foreground"
                        }`}>
                          {step.label}
                        </span>
                        {step.durationMs !== undefined && step.status === "success" && (
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {step.durationMs === 0 ? "< 1ms" : `${step.durationMs}ms`}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">{step.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Results (7 cols) */}
            <Card className="md:col-span-7 flex flex-col overflow-hidden bg-card border-border/80">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-semibold flex items-center gap-2 text-white">
                  <Terminal className="h-4 w-4 text-primary" />
                  Execution Result
                </CardTitle>
                {meta?.latencyMs !== undefined && (
                  <Badge variant="outline" className="text-[10px] font-mono flex items-center gap-1 border-border/60">
                    <Gauge className="h-3 w-3 text-primary" />
                    {meta.latencyMs}ms total
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-[250px] px-5">
                  {errorAlert && (
                    <div className="mb-3">
                      <Alert variant="destructive" className="border-destructive/40 bg-destructive/10">
                        <ShieldBan className="h-4 w-4" />
                        <AlertTitle className="text-xs font-semibold">{errorAlert.title}</AlertTitle>
                        <AlertDescription className="text-xs leading-relaxed">{errorAlert.desc}</AlertDescription>
                      </Alert>
                    </div>
                  )}

                  {result ? (
                    <div className="space-y-3 pb-5">
                      <div className="flex items-center justify-between border-b border-border/30 pb-2 text-xs">
                        <span className="text-muted-foreground">Prueba de Integridad:</span>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="success" className="font-mono text-[10px] flex items-center gap-1 py-0.5">
                            <Fingerprint className="h-3 w-3" /> ZK-Receipt OK
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="rounded bg-[#030305] border border-border/60 p-3.5 font-mono text-[11px] text-[#86efac] overflow-x-auto">
                        <pre>{JSON.stringify(result, null, 2)}</pre>
                      </div>
                    </div>
                  ) : !errorAlert && !isRunning ? (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-center space-y-2">
                      <Terminal className="h-6 w-6 text-muted/40" />
                      <p className="text-xs font-medium">Esperando ejecucion</p>
                      <p className="text-[11px] max-w-[220px]">Selecciona una plantilla o escribe logica y pulsa Execute Logic.</p>
                    </div>
                  ) : isRunning ? (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-center space-y-2.5">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <p className="text-xs">Inyectando logica y aplicando politicas de privacidad en origen...</p>
                    </div>
                  ) : null}
                </ScrollArea>
              </CardContent>
            </Card>

          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-[#0a0a0f] py-3 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-[11px] text-muted-foreground">
          © 2026 Nekzus Solutions. Logic-Injection-on-Origin Protocol (LIOP). Todos los derechos reservados.
        </div>
      </footer>
    </div>
  )
}

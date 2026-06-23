import { useState, useEffect } from "react"
import { 
  Shield, 
  Terminal, 
  Play, 
  Cpu, 
  Network, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Code,
  Zap,
  Lock,
  RefreshCw,
  AlertTriangle
} from "lucide-react"

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./components/ui/card"
import { Button } from "./components/ui/button"
import { Badge } from "./components/ui/badge"
import { ScrollArea } from "./components/ui/scroll-area"
import { Alert, AlertTitle, AlertDescription } from "./components/ui/alert"

// Interfaces
interface Tool {
  name: string
  description?: string
  taxonomy?: {
    domain?: string
    clearanceTier?: string
    executionTypes?: string[]
  }
  inputSchema?: any
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
}

// Plantillas de logica
const TEMPLATES = [
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
  averageBalance: stats.totalBalance / records.length,
  distribution: stats.accountsByType
};
@END`
  },
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
    description: "Intento adversarial de extraer nombres y IDs individuales (Sera bloqueado).",
    code: `@LIOP{wasi_v1, PiiAttack}
const records = env.records;
// Intento de exfiltrar informacion cruda (ej: nombres/IDs confidenciales)
// Esto sera interceptado y bloqueado por el Egress PII Shield
return {
  confidentialData: records.map(r => ({
    name: r.ownerName,
    id: r.ownerId,
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
  const [result, setResult] = useState<any>(null)
  const [errorAlert, setErrorAlert] = useState<{ title: string; desc: string } | null>(null)
  const [loadingHealth, setLoadingHealth] = useState(false)
  const [loadingTools, setLoadingTools] = useState(false)
  
  // SSE steps state
  const [timeline, setTimeline] = useState<TimelineStep[]>([
    { phase: "bootstrap", label: "P2P Mesh Bootstrap", detail: "Pendiente de ejecucion", status: "pending" },
    { phase: "discovery", label: "Resource Discovery", detail: "Busqueda en la DHT P2P", status: "pending" },
    { phase: "pqc", label: "Kyber-768 Handshake", detail: "Establecimiento de canal seguro", status: "pending" },
    { phase: "sealing", label: "AES-256-GCM Sealing", detail: "Cifrado de la logica inyectada", status: "pending" },
    { phase: "execution", label: "WASI Sandbox Run", detail: "Procesamiento en nodo origen", status: "pending" },
    { phase: "zk_verify", label: "ZK-Receipt HMAC Seal", detail: "Verificacion de integridad", status: "pending" },
  ])

  // Fetch initial info
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
        setTools(data.tools || [])
        if (data.tools && data.tools.length > 0) {
          // Default to first tool if none selected
          setSelectedToolName(data.tools[0].name)
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
      // Map tool name
      setSelectedToolName(t.tool)
    }
  }

  const handleExecute = async () => {
    if (isRunning) return
    setIsRunning(true)
    setResult(null)
    setErrorAlert(null)
    
    // Reset timeline status
    setTimeline([
      { phase: "bootstrap", label: "P2P Mesh Bootstrap", detail: "Conectando con el bootstrap node...", status: "running" },
      { phase: "discovery", label: "Resource Discovery", detail: "Consultando en el Kademlia DHT...", status: "pending" },
      { phase: "pqc", label: "Kyber-768 Handshake", detail: "Negociando PQC Kyber768 Session Key...", status: "pending" },
      { phase: "sealing", label: "AES-256-GCM Sealing", detail: "Cifrando paquete de logica...", status: "pending" },
      { phase: "execution", label: "WASI Sandbox Run", detail: "Ejecutando WASI micro-module...", status: "pending" },
      { phase: "zk_verify", label: "ZK-Receipt HMAC Seal", detail: "Verificando ZK-Receipt en transito...", status: "pending" },
    ])

    try {
      // Send execution POST
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
        throw new Error(`Fallo en el gateway: ${response.statusText}`)
      }

      // Read SSE stream
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error("No se pudo iniciar el canal de lectura SSE")
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
                updateTimelineStep(event.phase, event.detail, event.status)
              } else if (event.type === "result") {
                setResult(event.payload)
                setIsRunning(false)
              } else if (event.type === "error") {
                setErrorAlert({
                  title: event.payload.title || "Error de ejecucion",
                  desc: event.payload.desc || "Ocurrio una falla en el sandbox"
                })
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
      // Fail current running step
      setTimeline(prev => 
        prev.map(step => 
          step.status === "running" ? { ...step, status: "failed", detail: "Conexion interrumpida" } : step
        )
      )
    }
  }

  const updateTimelineStep = (phase: string, detail: string, status: "pending" | "running" | "success" | "failed") => {
    setTimeline(prev => {
      let phaseFound = false
      return prev.map(step => {
        if (step.phase === phase) {
          phaseFound = true
          return { ...step, status, detail }
        }
        // If we found the phase, subsequent items should remain pending unless they are already set
        if (phaseFound && step.status !== "success" && step.status !== "failed") {
          return { ...step, status: "pending" }
        }
        // Previous items that were running or pending should be success if the current is running/success
        if (!phaseFound && (step.status === "pending" || step.status === "running")) {
          return { ...step, status: "success", detail: "Fase completada" }
        }
        return step
      })
    })
  }

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans antialiased text-foreground">
      {/* Header Premium */}
      <header className="border-b border-border bg-card/40 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-primary/10 p-2 rounded-lg border border-primary/20">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                LIOP Playground <span className="text-xs font-semibold px-2 py-0.5 bg-accent/25 text-primary border border-primary/20 rounded">Alpha</span>
              </h1>
              <p className="text-xs text-muted-foreground">Logic-Injection-on-Origin Interface</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {network ? (
              <div className="flex items-center space-x-2 bg-secondary/30 border border-border px-3 py-1.5 rounded-lg text-xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                </span>
                <span className="text-white font-medium">{network.peersCount + 1} Nodos</span>
                <span className="text-muted-foreground">| {network.role}</span>
              </div>
            ) : (
              <Button size="sm" variant="ghost" onClick={fetchHealth} disabled={loadingHealth}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loadingHealth ? 'animate-spin' : ''}`} />
                Conectar Malla
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => { fetchHealth(); fetchTools(); }}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Grid Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Panel Izquierdo: Herramientas y Malla (4 cols) */}
        <section className="lg:col-span-4 flex flex-col space-y-6">
          {/* Card: Herramientas Descubiertas */}
          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-md flex items-center gap-2">
                <Network className="h-4 w-4 text-primary" />
                Discovery
              </CardTitle>
              <CardDescription>
                Herramientas localizadas en la red P2P mediante Kademlia DHT.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-[250px] lg:h-[350px] px-6">
                {loadingTools ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground space-y-3">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="text-xs">Barriendo la red DHT...</span>
                  </div>
                ) : tools.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground space-y-2">
                    <AlertTriangle className="h-8 w-8 mx-auto text-warning/80" />
                    <p className="text-sm font-medium">No se detectaron herramientas</p>
                    <p className="text-xs max-w-[200px] mx-auto">Asegurate de que los nodos Bank, Vault u Oracle esten levantados.</p>
                  </div>
                ) : (
                  <div className="space-y-3 pb-6">
                    {tools.map((t) => (
                      <div 
                        key={t.name}
                        onClick={() => setSelectedToolName(t.name)}
                        className={`p-3 rounded-lg border transition-all cursor-pointer ${
                          selectedToolName === t.name 
                            ? "bg-primary/5 border-primary/35 text-white" 
                            : "bg-secondary/10 border-border/40 hover:border-white/10"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-sm truncate max-w-[180px]">{t.name}</span>
                          <Badge 
                            variant={
                              t.taxonomy?.clearanceTier === "forbidden" 
                                ? "destructive" 
                                : t.taxonomy?.clearanceTier === "sensitive" 
                                  ? "warning" 
                                  : "success"
                            }
                          >
                            Tier {t.taxonomy?.clearanceTier === "forbidden" ? "5" : t.taxonomy?.clearanceTier === "sensitive" ? "3" : "1"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{t.description || "Sin descripcion."}</p>
                        {t.taxonomy?.domain && (
                          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary/60"></span>
                            Dominio: {t.taxonomy.domain}
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
          <Card className="p-5">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Cpu className="h-4 w-4 text-primary" />
              Info Nodo Sandbox
            </h3>
            {network ? (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between border-b border-border/30 pb-1.5">
                  <span className="text-muted-foreground">Local Peer ID:</span>
                  <span className="font-mono text-white truncate max-w-[160px]" title={network.peerId}>
                    {network.peerId}
                  </span>
                </div>
                <div className="flex justify-between border-b border-border/30 pb-1.5">
                  <span className="text-muted-foreground">gRPC Host Address:</span>
                  <span className="font-mono text-white">{network.address}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Integridad del Engine:</span>
                  <span className="text-success font-medium flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> WASI-Secure
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Buscando informacion del nodo...</p>
            )}
          </Card>
        </section>

        {/* Panel Derecho: Editor, Timeline y Resultados (8 cols) */}
        <section className="lg:col-span-8 flex flex-col space-y-6">
          {/* Card principal: Editor de Logica y ejecutor */}
          <Card className="flex flex-col">
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-md flex items-center gap-2">
                  <Code className="h-4 w-4 text-primary" />
                  Logic Editor
                </CardTitle>
                <CardDescription>
                  Escribe logica JavaScript que se inyectara y ejecutara directamente en el nodo origen.
                </CardDescription>
              </div>
              
              {/* Botones de plantillas */}
              <div className="flex items-center space-x-1.5 bg-secondary/40 border border-border/40 p-1 rounded-lg">
                {TEMPLATES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleSelectTemplate(t.id)}
                    className={`text-[10px] md:text-xs px-2.5 py-1 rounded transition-colors font-medium ${
                      code === t.code 
                        ? "bg-primary text-primary-foreground" 
                        : "text-muted-foreground hover:text-white"
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Textarea Code Editor */}
              <div className="relative border border-border/60 rounded-lg overflow-hidden bg-black/60 shadow-inner">
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full h-[260px] p-4 bg-transparent font-mono text-xs md:text-sm text-[#a8f2ff] focus:outline-none resize-none leading-relaxed"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  placeholder="// Escribe tu codigo de inyeccion..."
                  disabled={isRunning}
                />
                <div className="absolute bottom-2 right-2 text-[10px] text-muted-foreground/60 bg-black/60 px-2 py-0.5 rounded border border-border/20">
                  JavaScript (WASI Sandbox)
                </div>
              </div>

              {/* Boton Ejecutar */}
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  Ejecutando en: <span className="font-semibold text-white">{selectedToolName || "ninguna"}</span>
                </div>
                <Button 
                  onClick={handleExecute} 
                  disabled={isRunning || !selectedToolName}
                  className={`w-40 font-bold transition-all ${isRunning ? 'animate-pulse-glow' : ''}`}
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Inyectando...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4.5 w-4.5 fill-black" />
                      Execute Logic
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Dos columnas inferiores: Timeline (4 cols) y Resultados (8 cols) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Timeline (5 cols) */}
            <Card className="md:col-span-5 p-5">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Execution Timeline
              </h3>
              
              <div className="space-y-4 relative before:absolute before:inset-0 before:left-[11px] before:w-[2px] before:bg-border/30 before:-z-10 pb-2">
                {timeline.map((step, idx) => (
                  <div key={step.phase} className="flex items-start space-x-3 text-xs">
                    <div className="mt-0.5">
                      {step.status === "success" && (
                        <div className="bg-success/20 p-0.5 rounded-full border border-success/30">
                          <CheckCircle2 className="h-4.5 w-4.5 text-success" />
                        </div>
                      )}
                      {step.status === "failed" && (
                        <div className="bg-destructive/20 p-0.5 rounded-full border border-destructive/30">
                          <XCircle className="h-4.5 w-4.5 text-destructive" />
                        </div>
                      )}
                      {step.status === "running" && (
                        <div className="bg-warning/20 p-0.5 rounded-full border border-warning/30 animate-pulse">
                          <Loader2 className="h-4.5 w-4.5 text-warning animate-spin" />
                        </div>
                      )}
                      {step.status === "pending" && (
                        <div className="w-5.5 h-5.5 rounded-full bg-secondary border border-border/60 flex items-center justify-center text-[10px] text-muted-foreground font-semibold">
                          {idx + 1}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold ${
                        step.status === "running" 
                          ? "text-warning" 
                          : step.status === "success" 
                            ? "text-white" 
                            : step.status === "failed" 
                              ? "text-destructive" 
                              : "text-muted-foreground"
                      }`}>
                        {step.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">{step.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Results (7 cols) */}
            <Card className="md:col-span-7 flex flex-col overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-primary" />
                  Execution Result
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-[240px] px-6">
                  {errorAlert && (
                    <div className="mb-4">
                      <Alert variant="destructive">
                        <Lock className="h-4 w-4" />
                        <AlertTitle>{errorAlert.title}</AlertTitle>
                        <AlertDescription>{errorAlert.desc}</AlertDescription>
                      </Alert>
                    </div>
                  )}

                  {result ? (
                    <div className="space-y-4 pb-6">
                      <div className="flex items-center justify-between border-b border-border/30 pb-2">
                        <span className="text-xs text-muted-foreground">Prueba de Integridad:</span>
                        <Badge variant="success" className="font-mono text-[10px] flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> ZK-Receipt OK
                        </Badge>
                      </div>
                      
                      <div className="rounded-lg bg-black/40 border border-border/40 p-4 font-mono text-[11px] text-[#86efac] overflow-x-auto">
                        <pre>{JSON.stringify(result, null, 2)}</pre>
                      </div>
                    </div>
                  ) : !errorAlert && !isRunning ? (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-center space-y-2">
                      <Terminal className="h-8 w-8 text-muted/40" />
                      <p className="text-xs font-semibold">Esperando inyeccion</p>
                      <p className="text-[10px] max-w-[200px]">Selecciona una plantilla o escribe tu codigo y haz clic en Execute.</p>
                    </div>
                  ) : isRunning ? (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-center space-y-3">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-xs">Procesando y aplicando politicas de privacidad en origen...</p>
                    </div>
                  ) : null}
                </ScrollArea>
              </CardContent>
            </Card>

          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-card/20 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-muted-foreground">
          © 2026 Nekzus Solutions. Logic-Injection-on-Origin Protocol (LIOP). Todos los derechos reservados.
        </div>
      </footer>
    </div>
  )
}

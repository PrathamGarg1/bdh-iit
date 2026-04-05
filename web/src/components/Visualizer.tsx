"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Terminal, BrainCircuit, Sparkles, Database, Hash } from "lucide-react";
import { SparseBrain } from "./SparseBrain";
import { GraphBrain } from "./GraphBrain";

interface Activation {
  id: string;
  value: number;
}

interface Prediction {
  model: string;
  top_chars: string[];
  top_probs: number[];
}

interface BDHStepData {
  token: string;
  layer: number;
  x_sparse: Activation[];
  y_sparse: Activation[];
  x_dense?: Activation[];
  semantics?: Record<string, string>;
  topology_links?: Array<{ source: string; target: string; weight: number }>;
  prediction?: Prediction;
  transformer_prediction?: Prediction;
}

function PredictionCard({
  pred,
  accentClass,
  barClass,
}: {
  pred: Prediction;
  accentClass: string;
  barClass: string;
}) {
  return (
    <div className="flex-1 min-w-0">
      <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${accentClass}`}>
        {pred.model}
      </p>
      <div className="flex flex-col gap-2">
        {pred.top_chars.map((ch, i) => (
          <div key={i} className="flex items-center gap-3">
            <span
              className={`font-mono font-black text-base w-10 text-right shrink-0 ${
                i === 0 ? accentClass : "text-slate-400"
              }`}
            >
              &quot;{ch}&quot;
            </span>
            <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <motion.div
                className={`h-2.5 rounded-full ${barClass}`}
                initial={{ width: 0 }}
                animate={{ width: `${pred.top_probs[i] * 100}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
            <span className="text-xs font-mono text-slate-400 w-10 shrink-0">
              {(pred.top_probs[i] * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Visualizer() {
  const [dataStream, setDataStream] = useState<BDHStepData[]>([]);
  const [inputText, setInputText] = useState("");
  const [correctToken, setCorrectToken] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReinforcing, setIsReinforcing] = useState(false);
  const [showNumbers, setShowNumbers] = useState(false);

  useEffect(() => {
    if (!isProcessing || inputText.length === 0) return;

    const url = `https://podshorts--bdh-explainer-backend-fastapi-app.modal.run/stream?prompt=${encodeURIComponent(inputText)}`;
    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      if (event.data === "[DONE]") {
        eventSource.close();
        setIsProcessing(false);
        return;
      }
      try {
        const parsed: BDHStepData = JSON.parse(event.data);
        setDataStream((prev) => [...prev, parsed].slice(-10));
      } catch (err) {
        console.error("Failed to parse SSE JSON", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("EventSource failed:", err);
      eventSource.close();
      setIsProcessing(false);
    };

    return () => { eventSource.close(); };
  }, [isProcessing, inputText]);

  const handleReinforce = async () => {
    if (!inputText || !correctToken) return;
    setIsReinforcing(true);
    try {
      const res = await fetch(
        "https://podshorts--bdh-explainer-backend-fastapi-app.modal.run/reinforce",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: inputText, correct_token: correctToken }),
        }
      );
      const data = await res.json();
      console.log("Reinforced!", data);
      setCorrectToken("");
      setTimeout(() => setIsProcessing(true), 1500);
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setIsReinforcing(false), 1500);
    }
  };

  const currentData = dataStream[dataStream.length - 1];
  const activeActivations = currentData?.x_sparse || [];

  return (
    <div className="w-full max-w-[1400px] mx-auto flex flex-col gap-16">

      {/* SECTION 1: Input Console */}
      <div className="glass p-10 rounded-3xl flex flex-col xl:flex-row gap-12 items-center border border-slate-200 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-100/40 rounded-full blur-[80px] pointer-events-none -translate-y-1/2 translate-x-1/2" />

        <div className="flex-[2] w-full relative z-10">
          <label className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-3">
            <Terminal size={24} className="text-blue-500" /> Pathway Streaming Engine
          </label>
          <p className="text-slate-500 mb-6 text-sm">
            Type any sequence. Characters are routed live to Modal — BDH <em>and</em> GPT-2 both process each token.
          </p>
          <input
            type="text"
            className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-5 text-slate-900 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all text-2xl font-mono shadow-inner"
            placeholder="Initialize token stream..."
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              setIsProcessing(e.target.value.length > 0);
            }}
          />
        </div>

        <div className="flex-[1.5] w-full border-t xl:border-t-0 xl:border-l border-slate-200 pt-10 xl:pt-0 xl:pl-10 relative z-10">
          <label className="text-xl font-bold text-emerald-700 mb-4 flex items-center gap-3">
            <BrainCircuit size={24} /> Continuous Hebbian Update
          </label>
          <p className="text-slate-500 mb-6 text-sm">
            Intercept inference. Force BDH to learn the next correct token via an instant AdamW gradient step.
          </p>
          <div className="flex gap-4">
            <input
              type="text"
              maxLength={1}
              className="w-24 bg-white border border-slate-200 rounded-2xl px-4 py-5 text-emerald-700 text-center focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all text-3xl font-bold shadow-inner"
              placeholder="?"
              value={correctToken}
              onChange={(e) => setCorrectToken(e.target.value)}
            />
            <button
              onClick={handleReinforce}
              disabled={isReinforcing || !inputText || !correctToken}
              className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-2xl px-6 py-5 font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-3 text-lg shadow-sm"
            >
              <Sparkles size={20} />
              {isReinforcing ? "Rewiring Topology..." : "Inject Weights"}
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 2: Side-by-Side Prediction Panel (always visible once streaming) */}
      {currentData && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-3xl border border-slate-200 shadow-md overflow-hidden"
        >
          <div className="bg-slate-50 border-b border-slate-200 px-8 py-4 flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
            </span>
            <span className="font-bold text-slate-700 text-sm uppercase tracking-widest">
              Next-Token Predictions — after &quot;{currentData.token}&quot;
            </span>
          </div>

          <div className="p-8 flex flex-col xl:flex-row gap-8 xl:gap-0 divide-y xl:divide-y-0 xl:divide-x divide-slate-200">
            {/* BDH */}
            {currentData.prediction ? (
              <div className="xl:pr-8 flex-1">
                <PredictionCard
                  pred={currentData.prediction}
                  accentClass="text-emerald-700"
                  barClass="bg-emerald-500"
                />
              </div>
            ) : (
              <div className="xl:pr-8 flex-1 flex items-center justify-center text-slate-300 text-sm font-mono">
                BDH prediction loading…
              </div>
            )}

            {/* GPT-2 */}
            {currentData.transformer_prediction ? (
              <div className="xl:pl-8 flex-1 pt-6 xl:pt-0">
                <PredictionCard
                  pred={currentData.transformer_prediction}
                  accentClass="text-red-600"
                  barClass="bg-red-500"
                />
              </div>
            ) : (
              <div className="xl:pl-8 flex-1 flex items-center justify-center text-slate-300 text-sm font-mono">
                GPT-2 prediction loading…
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* SECTION 3: Visualizers */}
      <div className="flex flex-col gap-16">

        {/* Row 1: Sparse Brain */}
        <section className="w-full">
          <div className="mb-6 pl-3 border-l-4 border-blue-500 flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-2xl font-black text-slate-900">1. Activation Density — BDH vs GPT-2</h2>
              <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-blue-800 font-medium mb-2">💡 In Beginner Terms:</p>
                <p className="text-slate-600 text-sm leading-relaxed">
                  <strong>BDH (green, left):</strong> ReLU kills ~95% of neurons — only ~3 of 64 light up per character. Hyper-efficient.<br /><br />
                  <strong>GPT-2 (red, right):</strong> GELU activation keeps <em>all</em> 64 neurons non-zero for every single character. Dense, noisy, computationally heavier.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowNumbers(!showNumbers)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold transition-all self-start mt-1 ${
                showNumbers
                  ? "bg-blue-100 border-blue-400 text-blue-700"
                  : "bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-400"
              }`}
            >
              <Hash size={15} />
              {showNumbers ? "Hide Values" : "Show Values"}
            </button>
          </div>
          <SparseBrain
            bdhActivations={activeActivations}
            transformerActivations={currentData?.x_dense || []}
            showNumbers={showNumbers}
          />
        </section>

        {/* Row 2: Topology + Telemetry */}
        <section className="w-full grid grid-cols-1 xl:grid-cols-4 gap-12">
          <div className="xl:col-span-3">
            <div className="mb-6 pl-3 border-l-4 border-emerald-500">
              <h2 className="text-2xl font-black text-slate-900">2. Emergent Scale-Free Topology</h2>
              <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <p className="text-emerald-800 font-medium mb-2">💡 In Beginner Terms:</p>
                <p className="text-slate-600 text-sm leading-relaxed mb-3">
                  Unlike GPT-2&apos;s fixed rectangular weight matrices, BDH grows organically — creating <strong>&quot;Hubs&quot;</strong> that route information like major airports.
                </p>
                <p className="text-slate-600 text-sm leading-relaxed">
                  <strong>The Magic:</strong> Click &quot;Inject Weights&quot; above to trigger <em>Hebbian Learning</em>. Neurons that fire together get a thicker edge — instantly rewiring the topology!
                </p>
              </div>
            </div>
            <GraphBrain
              bdhActivations={activeActivations}
              isReinforcing={isReinforcing}
              semantics={currentData?.semantics}
              topologyLinks={currentData?.topology_links || []}
            />
          </div>

          <div className="xl:col-span-1 flex flex-col h-full">
            <div className="mb-6 pl-3 border-l-4 border-purple-500">
              <h2 className="text-2xl font-black text-slate-900">3. Telemetry River</h2>
              <p className="text-slate-500 mt-2">Real-time Pathway ingest.</p>
            </div>
            <div className="glass rounded-2xl p-6 flex flex-col flex-1 min-h-[400px] border border-slate-200">
              <div className="flex items-center gap-2 text-sm font-bold text-purple-700 mb-6 uppercase tracking-widest border-b border-slate-200 pb-4">
                <Database size={18} /> Packet Data
              </div>
              <div className="flex-1 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
                {dataStream.length > 0 ? (
                  dataStream
                    .slice()
                    .reverse()
                    .map((d, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="mb-4 pb-4 border-b border-slate-100 last:border-0 bg-white/60 rounded-xl p-4 shadow-sm"
                      >
                        <div className="text-slate-800 font-extrabold mb-3 text-lg border-b border-slate-100 pb-2">
                          Token: <span className="text-emerald-600">&quot;{d.token}&quot;</span>
                        </div>
                        <div className="font-mono text-xs text-slate-500 space-y-1.5 pl-2 border-l-2 border-purple-200">
                          <div>Layer: <span className="text-slate-800">{d.layer}</span></div>
                          <div>Sparsity: <span className="text-emerald-600 font-bold">{((64 - d.x_sparse.filter((x) => x.value > 0).length) / 64 * 100).toFixed(1)}%</span></div>
                          <div>Active H: <span className="text-slate-800">{d.x_sparse.filter((x) => x.value > 0).length}</span></div>
                          <div>Sem Shifts: <span className="text-slate-800">{Object.keys(d.semantics || {}).length}</span></div>
                        </div>
                      </motion.div>
                    ))
                ) : (
                  <div className="text-slate-300 font-mono text-center mt-10">waiting for payload...</div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

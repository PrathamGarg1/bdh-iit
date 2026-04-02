"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Terminal, BrainCircuit, Sparkles, Database } from "lucide-react";
import { SparseBrain } from "./SparseBrain";
import { GraphBrain } from "./GraphBrain";

interface Activation {
  id: string;
  value: number;
}

interface BDHStepData {
  token: string;
  layer: number;
  x_sparse: Activation[];
  y_sparse: Activation[];
  x_dense?: Activation[];
  semantics?: Record<string, string>;
  topology_links?: Array<{source: string, target: string, weight: number}>;
}

export function Visualizer() {
  const [dataStream, setDataStream] = useState<BDHStepData[]>([]);
  const [inputText, setInputText] = useState("");
  const [correctToken, setCorrectToken] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReinforcing, setIsReinforcing] = useState(false);

  // Connect to the actual Modal SSE endpoint
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

    return () => {
      eventSource.close();
    };
  }, [isProcessing, inputText]);

  const handleReinforce = async () => {
    if (!inputText || !correctToken) return;
    setIsReinforcing(true);
    try {
      const res = await fetch("https://podshorts--bdh-explainer-backend-fastapi-app.modal.run/reinforce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: inputText, correct_token: correctToken })
      });
      const data = await res.json();
      console.log("Reinforced!", data);
      setCorrectToken("");
      // Add a slight delay to allow the user to see the visual edge thickening animation
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
      
      {/* 
        ========================================
        SECTION 1: Master Inference Engine Input 
        ========================================
      */}
      <div className="glass p-10 rounded-3xl flex flex-col xl:flex-row gap-12 items-center border border-white/10 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] relative z-20 overflow-hidden">
        
        {/* Subtle background glow for the console */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/2" />

        <div className="flex-[2] w-full relative z-10">
          <label className="text-xl font-bold text-white mb-4 flex items-center gap-3">
            <Terminal size={24} className="text-blue-400" /> Pathway Streaming Engine
          </label>
          <p className="text-gray-400 mb-6 text-sm">
            Type any sequence. Watch the characters get routed live to the Modal T4 GPU backend.
          </p>
          <input
            type="text"
            className="w-full bg-black/50 border border-white/20 rounded-2xl px-6 py-5 text-white focus:outline-none focus:border-blue-500 transition-colors text-2xl font-mono shadow-inner"
            placeholder="Initialize token stream..."
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              setIsProcessing(e.target.value.length > 0);
            }}
          />
        </div>

        <div className="flex-[1.5] w-full border-t xl:border-t-0 xl:border-l border-white/10 pt-10 xl:pt-0 xl:pl-10 relative z-10">
          <label className="text-xl font-bold text-emerald-400 mb-4 flex items-center gap-3">
            <BrainCircuit size={24} /> Continuous Hebbian Update
          </label>
          <p className="text-gray-400 mb-6 text-sm">
            Intercept inference locally. Force the model to learn the next correct token via an instant AdamW gradient step.
          </p>
          <div className="flex gap-4">
            <input
              type="text"
              maxLength={1}
              className="w-24 bg-black/50 border border-white/20 rounded-2xl px-4 py-5 text-emerald-400 text-center focus:outline-none focus:border-emerald-500 transition-colors text-3xl font-bold shadow-inner"
              placeholder="?"
              value={correctToken}
              onChange={(e) => setCorrectToken(e.target.value)}
            />
            <button
              onClick={handleReinforce}
              disabled={isReinforcing || !inputText || !correctToken}
              className="flex-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/50 rounded-2xl px-6 py-5 font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-3 text-lg"
            >
              <Sparkles size={20} /> 
              {isReinforcing ? "Rewiring Topology..." : "Inject Weights"}
            </button>
          </div>
        </div>
      </div>


      {/* 
        ========================================
        SECTION 2: The Core Visualizers Extracted
        ========================================
      */}
      <div className="flex flex-col gap-16">
        
        {/* Row 1: The Sparse Brain (Full Width) */}
        <section className="w-full">
          <div className="mb-6 pl-2 border-l-4 border-blue-500">
            <h2 className="text-2xl font-black text-white">1. Activation Density Analysis</h2>
            <div className="mt-3 bg-blue-950/20 border border-blue-500/20 rounded-xl p-4">
              <p className="text-blue-100 font-medium mb-2">💡 In Beginner Terms:</p>
              <p className="text-gray-400 text-sm leading-relaxed">
                Imagine a massive stadium where <strong>every single person shouts at the exact same time</strong> to answer a question. That is a Standard Transformer (noisy, computationally heavy, 100% dense). <br/><br/>
                Now imagine a quiet room where <strong>only 5 specific experts speak up</strong> because they know the answer. That is the BDH "Sparse" model. It naturally shuts off 95% of its brain to save massive amounts of compute power, while staying highly accurate.
              </p>
            </div>
          </div>
          <div className="w-full">
            <SparseBrain 
              bdhActivations={activeActivations} 
              transformerActivations={currentData?.x_dense || []}
            />
          </div>
        </section>

        {/* Row 2: Topology Graph & Telemetry Split */}
        <section className="w-full grid grid-cols-1 xl:grid-cols-4 gap-12">
          
          <div className="xl:col-span-3">
            <div className="mb-6 pl-2 border-l-4 border-emerald-500">
              <h2 className="text-2xl font-black text-white">2. Emergent Scale-Free Topology</h2>
              <div className="mt-3 bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-4">
                <p className="text-emerald-100 font-medium mb-2">💡 In Beginner Terms:</p>
                <p className="text-gray-400 text-sm leading-relaxed mb-3">
                  Unlike traditional AI that forces data through rigid rectangle grids, this model grows organically like a real human brain. Notice how it looks like a web? It creates <strong>"Hubs"</strong> (like major airports connecting cities) to route information efficiently.
                </p>
                <p className="text-gray-400 text-sm leading-relaxed">
                  <strong>The Magic:</strong> When you intercept the model and click "Inject Weights" above, you trigger <em>Hebbian Learning</em>. If two neurons blink together, the line connecting them structurally becomes thicker. It learned a new connection instantly, permanently altering its own brain!
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
            <div className="mb-6 pl-2 border-l-4 border-purple-500">
              <h2 className="text-2xl font-black text-white">3. Telemetry River</h2>
              <p className="text-gray-400 mt-2">Real-time Pathway ingest.</p>
            </div>
            
            <div className="glass rounded-2xl p-6 flex flex-col flex-1 min-h-[400px]">
              <div className="flex items-center gap-2 text-sm font-bold text-purple-300 mb-6 uppercase tracking-widest border-b border-white/10 pb-4">
                <Database size={18} /> Packet Data
              </div>
              <div className="flex-1 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
                {dataStream.length > 0 ? (
                  dataStream.slice().reverse().map((d, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      className="mb-4 pb-4 border-b border-purple-900/30 last:border-0 bg-black/40 rounded-xl p-4 shadow-sm"
                    >
                      <div className="text-white font-extrabold mb-3 text-lg border-b border-white/10 pb-2">
                        Token: <span className="text-emerald-400">"{d.token}"</span>
                      </div>
                      <div className="font-mono text-xs text-purple-200/80 space-y-1.5 pl-2 border-l-2 border-purple-500/30">
                        <div>Layer: <span className="text-white/90">{d.layer}</span></div>
                        <div>Sparsity: <span className="text-emerald-400 font-bold">{((64 - d.x_sparse.filter(x => x.value > 0).length) / 64 * 100).toFixed(1)}%</span></div>
                        <div>Active H: <span className="text-white/90">{d.x_sparse.filter(x => x.value > 0).length}</span></div>
                        <div>Sem Shifts: <span className="text-white/90">{Object.keys(d.semantics || {}).length}</span></div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-purple-900/50 font-mono text-center mt-10">waiting for payload...</div>
                )}
              </div>
            </div>
          </div>

        </section>

      </div>
    </div>
  );
}

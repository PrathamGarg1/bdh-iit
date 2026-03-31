"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, Cpu, Database, Network, BrainCircuit, Sparkles } from "lucide-react";

interface Activation {
  id: string;
  value: number;
}

interface BDHStepData {
  token: string;
  layer: number;
  x_sparse: Activation[];
  y_sparse: Activation[];
  semantics?: Record<string, string>;
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
      // re-trigger the stream to see updated activations
      setIsProcessing(true);
    } catch (e) {
      console.error(e);
    } finally {
      setIsReinforcing(false);
    }
  };

  const currentData = dataStream[dataStream.length - 1];

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6">
      
      {/* Interactive Inputs */}
      <div className="glass p-6 rounded-2xl flex flex-col lg:flex-row gap-6 items-center border border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.1)]">
        <div className="flex-1 w-full">
          <label className="text-sm font-semibold text-blue-300 mb-2 flex items-center gap-2">
            <Terminal size={16} /> Inference Stream (Live)
          </label>
          <input
            type="text"
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
            placeholder="Type text for BDH to process..."
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              setIsProcessing(e.target.value.length > 0);
            }}
          />
        </div>

        <div className="flex-1 w-full border-t lg:border-t-0 lg:border-l border-white/10 pt-4 lg:pt-0 lg:pl-6">
          <label className="text-sm font-semibold text-emerald-400 mb-2 flex items-center gap-2">
            <BrainCircuit size={16} /> Inference-Time Learning (Hebbian Update)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              maxLength={1}
              className="w-16 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-center focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="Next"
              value={correctToken}
              onChange={(e) => setCorrectToken(e.target.value)}
            />
            <button
              onClick={handleReinforce}
              disabled={isReinforcing || !inputText || !correctToken}
              className="flex-1 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/50 rounded-xl px-4 py-3 font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Sparkles size={16} /> 
              {isReinforcing ? "Updating Graph..." : "Reinforce Connection"}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">Permanently alters the model weights in real-time without backprop.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Graph Visualizer */}
        <div className="col-span-2 glass rounded-2xl p-6 min-h-[500px] flex flex-col relative overflow-hidden">
          <div className="flex items-center gap-2 text-sm font-semibold text-white/70 mb-6 z-10">
            <Network size={16} className="text-blue-400" /> Monosemantic Sparse Graph
          </div>
          
          <div className="flex-1 flex items-center justify-center z-10">
            {currentData ? (
              <div className="grid grid-cols-8 sm:grid-cols-8 gap-3 w-full max-w-3xl">
                <AnimatePresence>
                  {currentData.x_sparse.map((act) => {
                    const isActive = act.value > 0;
                    const semanticLabel = currentData.semantics?.[act.id];
                    return (
                      <motion.div
                        key={act.id}
                        initial={{ opacity: 0.2, scale: 0.8 }}
                        animate={{
                          opacity: isActive ? 1 : 0.15,
                          scale: isActive ? 1.05 : 1,
                          backgroundColor: isActive ? "rgba(16, 185, 129, 0.4)" : "rgba(255, 255, 255, 0.02)",
                          borderColor: isActive ? "rgba(16, 185, 129, 0.8)" : "rgba(255, 255, 255, 0.05)",
                        }}
                        transition={{ duration: 0.3 }}
                        className="relative aspect-square rounded-xl border flex flex-col items-center justify-center"
                      >
                        {isActive && semanticLabel && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="absolute -top-8 bg-black/80 border border-emerald-500/30 text-emerald-400 text-[10px] px-2 py-1 rounded-md whitespace-nowrap z-50 backdrop-blur-sm"
                          >
                            {semanticLabel}
                          </motion.div>
                        )}
                        <span className="text-[10px] text-white/20">{act.id}</span>
                        {isActive && (
                          <span className="text-xs text-emerald-300 font-mono font-bold">
                            {act.value.toFixed(2)}
                          </span>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            ) : (
              <div className="text-white/30 text-center text-sm font-mono flex flex-col items-center gap-4">
                <Cpu size={32} className="opacity-50" />
                Awaiting tokens...
              </div>
            )}
          </div>
        </div>

        {/* Live Tensor Stream Data */}
        <div className="glass rounded-2xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white/70">
              <Database size={16} className="text-purple-400" /> Pathway Telemetry
            </div>
          </div>
          <div className="flex-1 bg-black/60 rounded-xl p-4 font-mono text-xs text-blue-400 overflow-y-auto max-h-[420px] shadow-inner">
            {dataStream.length > 0 ? (
              dataStream.slice().reverse().map((d, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="mb-4 pb-4 border-b border-blue-900/40 last:border-0"
                >
                  <div className="text-white/80 font-bold mb-2">Token: "{d.token}"</div>
                  <div className="text-purple-300">&#123;</div>
                  <div className="pl-4">"layer": {d.layer},</div>
                  <div className="pl-4">"sparsity": "{((64 - d.x_sparse.filter(x => x.value > 0).length) / 64 * 100).toFixed(1)}%",</div>
                  <div className="pl-4">"active_neurons": {d.x_sparse.filter(x => x.value > 0).length},</div>
                  <div className="pl-4 text-emerald-400">"semantic_shifts": {Object.keys(d.semantics || {}).length}</div>
                  <div className="text-purple-300">&#125;</div>
                </motion.div>
              ))
            ) : (
              <div className="text-blue-900/50">waiting for payload...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


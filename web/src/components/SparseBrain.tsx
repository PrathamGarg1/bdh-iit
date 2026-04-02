import { motion, AnimatePresence } from "framer-motion";
import { Cpu, Zap } from "lucide-react";

interface Activation {
  id: string;
  value: number;
}

export function SparseBrain({
  bdhActivations,
  transformerActivations,
}: {
  bdhActivations: Activation[];
  transformerActivations: Activation[];
}) {
  return (
    <div className="glass rounded-2xl p-6 min-h-[500px] flex flex-col relative overflow-hidden shadow-2xl border-emerald-500/10">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40 pointer-events-none" />
      <div className="flex items-center justify-between mb-8 z-10">
        <div className="flex items-center gap-3 text-lg font-bold text-white/90">
          <Zap size={20} className="text-emerald-400" /> "Sparse Brain" Density Comparator
        </div>
        <div className="text-xs text-emerald-300 font-mono bg-emerald-900/30 px-3 py-1 rounded-full border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]">Layer 1 Matrix Real-time</div>
      </div>

      <div className="flex flex-col lg:flex-row gap-10 w-full z-10 justify-center">
        {/* BDH sparse */}
        <div className="flex-1 flex flex-col items-center">
          <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-green-300 mb-1">Burn Dragon Hatchling</h3>
          <p className="text-sm font-mono text-emerald-400/70 mb-8 text-center flex flex-col">
            <span>Scale-Free Graph Topology</span>
            <span className="text-emerald-300 font-bold tracking-widest mt-1">~5% SPARSE</span>
          </p>
          <div className="grid grid-cols-8 gap-2 w-full max-w-[320px]">
            <AnimatePresence>
              {bdhActivations.map((act) => {
                const isActive = act.value > 0;
                return (
                  <motion.div
                    key={"bdh-" + act.id}
                    initial={{ opacity: 0.1, scale: 0.9 }}
                    animate={{
                      opacity: isActive ? 1 : 0.08,
                      scale: isActive ? 1.15 : 1,
                      backgroundColor: isActive ? "rgba(16, 185, 129, 0.9)" : "rgba(255, 255, 255, 0.03)",
                      boxShadow: isActive ? "0 0 20px rgba(16, 185, 129, 0.6), inset 0 0 10px rgba(255,255,255,0.4)" : "none",
                      borderColor: isActive ? "rgba(16, 185, 129, 1)" : "rgba(255, 255, 255, 0.1)",
                    }}
                    transition={{ duration: 0.2, type: "spring", stiffness: 300, damping: 20 }}
                    className="relative aspect-square rounded-lg border z-10"
                  />
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* Dense line separator */}
        <div className="hidden lg:flex flex-col justify-center items-center">
          <div className="w-px h-full bg-gradient-to-b from-transparent via-white/20 to-transparent relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/30 text-xs font-bold rotate-90 tracking-[0.2em] whitespace-nowrap uppercase">vs</div>
          </div>
        </div>

        {/* Transformer Dense */}
        <div className="flex-1 flex flex-col items-center opacity-90 transition-opacity hover:opacity-100">
          <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-orange-400 mb-1">Standard Transformer</h3>
          <p className="text-sm font-mono text-red-400/70 mb-8 text-center flex flex-col">
            <span>Dense Matrix Multiplication</span>
            <span className="text-red-400 font-bold tracking-widest mt-1">NOISY/UNCOMPRESSED</span>
          </p>
          <div className="grid grid-cols-8 gap-2 w-full max-w-[320px]">
            <AnimatePresence>
              {transformerActivations.map((act, i) => {
                // For dense array visual representation: scale using actual mathematical tensor weights
                const intensity = Math.abs(act.value); 
                const isHighlyActive = intensity > 0.4;
                return (
                  <motion.div
                    key={"tf-" + act.id + i}
                    animate={{
                      opacity: intensity * 0.7 + 0.3,
                      scale: isHighlyActive ? 1.05 : 1,
                      backgroundColor: isHighlyActive ? "rgba(239, 68, 68, 0.8)" : "rgba(239, 68, 68, 0.3)",
                      boxShadow: isHighlyActive ? "0 0 10px rgba(239, 68, 68, 0.4)" : "none",
                      borderColor: "rgba(255, 255, 255, 0.05)",
                    }}
                    transition={{ duration: 0.15 }}
                    className="relative aspect-square rounded-md border"
                  />
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>
      
      {bdhActivations.length === 0 && (
         <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-30 backdrop-blur-md">
           <Cpu size={48} className="opacity-40 text-blue-300 mb-4 animate-pulse" />
           <p className="font-mono text-sm text-blue-300/70 tracking-widest uppercase">Awaiting Pathway Telemetry Stream...</p>
         </div>
      )}
    </div>
  );
}

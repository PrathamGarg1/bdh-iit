import { motion, AnimatePresence } from "framer-motion";
import { Cpu, Zap } from "lucide-react";

interface Activation {
  id: string;
  value: number;
}

export function SparseBrain({
  bdhActivations,
  transformerActivations,
  showNumbers,
}: {
  bdhActivations: Activation[];
  transformerActivations: Activation[];
  showNumbers?: boolean;
}) {
  const bdhActiveCount = bdhActivations.filter((a) => a.value > 0).length;
  const gpt2ActiveCount = transformerActivations.filter((a) => Math.abs(a.value) > 0.1).length;

  return (
    <div className="glass rounded-2xl p-8 min-h-[520px] flex flex-col relative overflow-hidden shadow-md border border-slate-200">

      {/* Header */}
      <div className="flex items-center justify-between mb-8 z-10">
        <div className="flex items-center gap-3 text-lg font-bold text-slate-800">
          <Zap size={20} className="text-emerald-600" /> Activation Density Comparison
        </div>
        <div className="text-xs text-slate-500 font-mono bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
          Layer 1 — Real PyTorch Tensors
        </div>
      </div>

      {/* Stats bar */}
      {bdhActivations.length > 0 && (
        <div className="flex gap-4 mb-8 z-10">
          <div className="flex-1 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
            <div className="text-2xl font-black text-emerald-700">{bdhActiveCount}</div>
            <div className="text-xs text-emerald-600 font-mono mt-0.5">BDH active / 64</div>
            <div className="text-xs text-emerald-500 font-bold">{((bdhActiveCount / 64) * 100).toFixed(1)}% density</div>
          </div>
          <div className="flex items-center text-slate-300 font-bold text-xl">vs</div>
          <div className="flex-1 bg-red-50 border border-red-200 rounded-xl p-3 text-center">
            <div className="text-2xl font-black text-red-600">{gpt2ActiveCount}</div>
            <div className="text-xs text-red-500 font-mono mt-0.5">GPT-2 active / 64</div>
            <div className="text-xs text-red-400 font-bold">{((gpt2ActiveCount / 64) * 100).toFixed(1)}% density</div>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-12 w-full z-10 justify-center flex-1">

        {/* BDH sparse side */}
        <div className="flex-1 flex flex-col items-center">
          <div className="mb-4 text-center">
            <h3 className="text-xl font-black text-emerald-700">BDH (pathwaycom/bdh)</h3>
            <p className="text-xs font-mono text-emerald-600 mt-1">ReLU → Scale-Free Sparse</p>
            <span className="inline-block mt-2 px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200">
              ~5% ACTIVE
            </span>
          </div>
          <div className="grid grid-cols-8 gap-1.5 w-full max-w-[300px]">
            <AnimatePresence>
              {bdhActivations.map((act) => {
                const isActive = act.value > 0;
                return (
                  <motion.div
                    key={"bdh-" + act.id}
                    animate={{
                      backgroundColor: isActive ? "#059669" : "#f1f5f9",
                      boxShadow: isActive ? "0 0 10px rgba(5,150,105,0.5)" : "none",
                      scale: isActive ? 1.1 : 1,
                      border: isActive ? "1.5px solid #047857" : "1.5px solid #e2e8f0",
                    }}
                    transition={{ duration: 0.18, type: "spring", stiffness: 350, damping: 22 }}
                    className="aspect-square rounded-md flex items-center justify-center"
                  >
                    {showNumbers && isActive && (
                      <span className="text-[7px] font-mono font-bold text-white leading-none select-none">
                        {act.value.toFixed(2)}
                      </span>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* Divider */}
        <div className="hidden lg:flex flex-col justify-center items-center px-4">
          <div className="w-px h-48 bg-gradient-to-b from-transparent via-slate-300 to-transparent relative">
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-90 text-slate-400 text-[10px] font-bold tracking-[0.3em] whitespace-nowrap uppercase">vs</span>
          </div>
        </div>

        {/* GPT-2 dense side */}
        <div className="flex-1 flex flex-col items-center">
          <div className="mb-4 text-center">
            <h3 className="text-xl font-black text-red-600">GPT-2 Small (124M)</h3>
            <p className="text-xs font-mono text-red-500 mt-1">GELU → Dense (all active)</p>
            <span className="inline-block mt-2 px-3 py-0.5 rounded-full bg-red-50 text-red-600 text-xs font-bold border border-red-200">
              ~100% ACTIVE
            </span>
          </div>
          <div className="grid grid-cols-8 gap-1.5 w-full max-w-[300px]">
            <AnimatePresence>
              {transformerActivations.map((act, i) => {
                const intensity = Math.abs(act.value);
                const isHigh = intensity > 0.5;
                return (
                  <motion.div
                    key={"gpt2-" + act.id + i}
                    animate={{
                      backgroundColor: isHigh
                        ? `rgba(220,38,38,${0.5 + intensity * 0.5})`
                        : `rgba(220,38,38,${0.15 + intensity * 0.25})`,
                      boxShadow: isHigh ? "0 0 8px rgba(220,38,38,0.35)" : "none",
                      scale: isHigh ? 1.05 : 1,
                      border: `1.5px solid rgba(220,38,38,${0.1 + intensity * 0.3})`,
                    }}
                    transition={{ duration: 0.15 }}
                    className="aspect-square rounded-md flex items-center justify-center"
                  >
                    {showNumbers && (
                      <span className="text-[7px] font-mono font-bold text-white/90 leading-none select-none">
                        {act.value.toFixed(2)}
                      </span>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

      </div>

      {bdhActivations.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 z-30 backdrop-blur-sm rounded-2xl">
          <Cpu size={48} className="opacity-25 text-blue-400 mb-4 animate-pulse" />
          <p className="font-mono text-sm text-slate-400 tracking-widest uppercase">
            Awaiting Pathway Telemetry Stream...
          </p>
        </div>
      )}
    </div>
  );
}

import { Visualizer } from "@/components/Visualizer";
import { Sparkles, Brain, Cpu, Activity } from "lucide-react";

export default function Home() {
  return (
    <main className="relative min-h-screen flex flex-col items-center pb-24 overflow-hidden">
      
      {/* Background Decorators */}
      <div className="absolute top-0 w-full h-[800px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100/60 via-transparent to-transparent -z-10" />

      {/* Hero Section */}
      <div className="w-full max-w-7xl mx-auto pt-24 pb-16 px-6 lg:px-12 text-center flex flex-col items-center">
        
        <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-blue-50 border border-blue-200 mb-10 shadow-sm transition-all hover:bg-blue-100">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500" />
          </span>
          <span className="text-sm font-semibold tracking-wide text-blue-700">
            Powered by Pathway Streaming &amp; Modal Cloud
          </span>
        </div>

        <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-8 text-transparent bg-clip-text bg-gradient-to-br from-slate-900 via-blue-900 to-blue-600 drop-shadow-sm pb-2">
          Burn Dragon <br className="hidden md:block" /> Hatchling <span className="text-blue-500">Explorer</span>
        </h1>
        
        <p className="text-slate-500 text-xl md:text-2xl max-w-3xl font-light leading-relaxed mb-16">
          Experience the first post-transformer frontier architecture manually. Type below to physically visualize{" "}
          <span className="text-slate-800 font-medium">scale-free sparse topologies</span> and trigger{" "}
          <span className="text-slate-800 font-medium">real-time Hebbian weight updates</span> over our live Modal inference endpoints.
        </p>

        {/* Feature Highlights beneath Hero */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
          <div className="glass p-6 rounded-2xl flex flex-col items-center text-center">
            <Cpu className="text-blue-500 mb-4" size={32} />
            <h3 className="text-lg font-bold text-slate-800 mb-2">Constant O(n×d) Memory</h3>
            <p className="text-sm text-slate-500">Scale context infinitely flat without quadratic cache explosion.</p>
          </div>
          <div className="glass p-6 rounded-2xl flex flex-col items-center text-center">
            <Brain className="text-emerald-600 mb-4" size={32} />
            <h3 className="text-lg font-bold text-slate-800 mb-2">~5% Sparse Activations</h3>
            <p className="text-sm text-slate-500">Dramatic visual contrast compared to uncompressed dense models.</p>
          </div>
          <div className="glass p-6 rounded-2xl flex flex-col items-center text-center">
            <Activity className="text-purple-500 mb-4" size={32} />
            <h3 className="text-lg font-bold text-slate-800 mb-2">Live Hebbian Learning</h3>
            <p className="text-sm text-slate-500">Synapses automatically strengthen locally in pure inference-time.</p>
          </div>
        </div>

      </div>

      {/* Visualizer Application Section */}
      <div className="w-full px-6 lg:px-12 mt-12 relative z-10">
        <Visualizer />
      </div>

    </main>
  );
}

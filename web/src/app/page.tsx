import { Visualizer } from "@/components/Visualizer";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-8 lg:p-16">
      <div className="w-full max-w-6xl mx-auto mb-12 text-center md:text-left">
        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full glass mb-6 text-sm font-medium text-blue-300 border-blue-500/20">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          Powered by Pathway & Modal
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-4 bg-gradient-to-br from-white via-white/90 to-white/40 bg-clip-text text-transparent">
          Burn Dragon Hatchling <br /> <span className="text-blue-500">Visualizer</span>
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl text-center md:text-left mx-auto md:mx-0">
          Experience post-transformer architectures in real-time. Watch how BDH's sparse activations dynamically route incoming data streams.
        </p>
      </div>

      <Visualizer />
    </main>
  );
}

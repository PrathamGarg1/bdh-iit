"use client";

import { useMemo, useEffect, useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { Network, Maximize2, Minimize2 } from "lucide-react";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

interface Activation {
  id: string;
  value: number;
}

export function GraphBrain({
  bdhActivations,
  isReinforcing,
  semantics,
  topologyLinks,
}: {
  bdhActivations: Activation[];
  isReinforcing: boolean;
  semantics?: Record<string, string>;
  topologyLinks: Array<{source: string, target: string, weight: number}>;
}) {
  const fgRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, [isFullscreen]);

  const graphData = useMemo(() => {
    // Group 1: nx-0 to nx-63 (Input Pattern Detectors)
    const inputNodes = Array.from({ length: 64 }, (_, i) => ({
      id: `nx-${i}`,
      group: 1,
      label: `Pattern Neuron ${i}`,
    }));

    // Group 2: ny-0 to ny-63 (Prediction Units)
    const predictNodes = Array.from({ length: 64 }, (_, i) => ({
      id: `ny-${i}`,
      group: 2,
      label: `Prediction Unit ${i}`,
    }));

    const nodes = [...inputNodes, ...predictNodes];

    // Normalize weights across the current set of links to maximize visual contrast
    const weights = topologyLinks.map(l => l.weight);
    const maxW = Math.max(...weights, 1e-9);
    const minW = Math.min(...weights, maxW * 0.99); // Ensure a range
    const range = maxW - minW || 1e-9;

    const topLinks = topologyLinks
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 100) 
      .map(link => ({
        ...link,
        // Relative strength from 0 (thinnest) to 1 (thickest)
        relWeight: (link.weight - minW) / range
      }));

    return { nodes, links: topLinks };
  }, [topologyLinks]);

  useEffect(() => {
    if (mounted && fgRef.current) {
      fgRef.current.d3Force('charge').strength(isFullscreen ? -2000 : -1200);
      fgRef.current.d3Force('link').distance(isFullscreen ? 300 : 180);
      fgRef.current.d3Force('center').strength(0.05);
    }
  }, [mounted, graphData, isFullscreen]);

  const activeNeuronIds = useMemo(() => {
    return bdhActivations.filter((a) => a.value > 0).map((a) => a.id);
  }, [bdhActivations]);

  const paintNode = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const isActive = activeNeuronIds.includes(node.id);
      const semanticLabel = semantics?.[node.id];
      const isPattern = node.id.startsWith("nx");

      const size = isPattern ? 6 : 5;
      const glowScale = isActive ? 1.6 : 1;

      ctx.beginPath();
      ctx.arc(node.x, node.y, size * glowScale, 0, 2 * Math.PI, false);

      if (isActive) {
        // Pattern = Emerald, Prediction = Purple
        const activeColor = isPattern ? "#059669" : "#9333ea";
        const shadowColor = isPattern ? "rgba(5, 150, 105, 0.5)" : "rgba(147, 51, 234, 0.5)";
        
        ctx.fillStyle = activeColor;
        ctx.shadowColor = shadowColor;
        ctx.shadowBlur = 15;
      } else {
        ctx.fillStyle = "#f1f5f9";
        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = 0.5;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
      ctx.fill();

      if (isActive && semanticLabel) {
        const fontSize = Math.max(10, 12 / globalScale);
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.fillStyle = isPattern ? "#065f46" : "#7e22ce";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.shadowBlur = 0;
        ctx.fillText(semanticLabel, node.x, node.y + size + 6);
      }
    },
    [activeNeuronIds, semantics]
  );

  return (
    <div
      className={`glass flex flex-col relative overflow-hidden transition-all duration-300 ${
        isFullscreen
          ? "fixed inset-0 z-50 rounded-none w-screen h-screen bg-white/95 backdrop-blur-xl p-8"
          : "rounded-xl p-4 min-h-[500px] h-full border border-slate-200 shadow-md"
      }`}
      ref={containerRef}
    >
      <div className="flex flex-col sm:flex-row items-center justify-between mb-4 z-10 w-full">
        <label className={`font-semibold text-emerald-700 flex items-center gap-2 ${isFullscreen ? "text-2xl" : "text-sm"}`}>
          <Network size={isFullscreen ? 28 : 18} /> Emergent Topology Graph
        </label>

        <div className="flex items-center gap-6">
          <span className="text-xs font-mono text-slate-500 bg-slate-100 px-3 py-1 rounded-md border border-slate-200">
            {isReinforcing ? "Hebbian Reinforcement Active" : "Scale-Free Hub Structures"}
          </span>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 p-2 rounded-lg transition-colors border border-slate-200 flex items-center gap-2"
          >
            {isFullscreen ? <><Minimize2 size={20} /> Exit Fullscreen</> : <><Maximize2 size={16} /> Expand</>}
          </button>
        </div>
      </div>

      <div className="flex-1 w-full relative z-0 flex items-center justify-center">
        {mounted && graphData.nodes.length > 0 && (
          <ForceGraph2D
            ref={fgRef}
            width={dimensions.width - (isFullscreen ? 64 : 32)}
            height={dimensions.height - (isFullscreen ? 120 : 80)}
            graphData={graphData}
            nodeCanvasObject={paintNode}
            linkColor={(link: any) => {
              const srcActive = activeNeuronIds.includes(link.source.id || link.source);
              const tgtActive = activeNeuronIds.includes(link.target.id || link.target);
              
              if (srcActive && tgtActive) {
                const opacity = 0.4 + (link.relWeight ?? 0) * 0.55; // 0.4 to 0.95
                return `rgba(16, 185, 129, ${opacity})`;
              }
              if (srcActive || tgtActive) return "rgba(16, 185, 129, 0.15)";
              return "rgba(148, 163, 184, 0.05)";
            }}
            linkWidth={(link: any) => {
              const srcActive = activeNeuronIds.includes(link.source.id || link.source);
              const tgtActive = activeNeuronIds.includes(link.target.id || link.target);
              
              // We use relWeight [0, 1] to scale from hairline to very thick
              const rel = link.relWeight ?? 0.1;
              const baseWidth = 0.4 + Math.pow(rel, 1.2) * 8; // Max 8.4px width
              
              if (srcActive && tgtActive) return baseWidth + (isReinforcing ? 2 : 0);
              return baseWidth * 0.3;
            }}
            linkDirectionalParticles={(link: any) => {
              const srcActive = activeNeuronIds.includes(link.source.id || link.source);
              const tgtActive = activeNeuronIds.includes(link.target.id || link.target);
              // Only top 50% strength links get particles to reduce noise
              return (srcActive && tgtActive && (link.relWeight ?? 0) > 0.5) ? 2 : 0;
            }}
            linkDirectionalParticleSpeed={0.02}
            linkDirectionalParticleColor={() => "rgba(16, 185, 129, 1)"}
            d3AlphaDecay={0.01}
            d3VelocityDecay={0.5}
            cooldownTicks={300}
            backgroundColor="transparent"
          />
        )}
      </div>

      {isReinforcing && (
        <div className="absolute inset-x-0 bottom-8 pointer-events-none animate-pulse flex items-center justify-center z-20">
          <div className="bg-white text-emerald-700 px-6 py-2 rounded-lg font-bold shadow-lg border border-emerald-300 text-base md:text-lg">
            Applying Synaptic Reinforcement Matrix Updates...
          </div>
        </div>
      )}
    </div>
  );
}

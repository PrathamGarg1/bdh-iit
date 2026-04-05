<div align="center">
  <img src="https://pathway.com/logo.svg" height="80" alt="Pathway Logo" />
  <h1>The Baby Dragon Hatchling (BDH) Explainer</h1>
  <p><h3>The definitive interactive visualizer for post-transformer architectures.</h3></p>
  <i>The "Georgia Tech Transformer Explainer" equivalent for the BDH era. Designed for the Path A "Visualization and Inner Worlds" Track.</i>
</div>

---

## 🏆 Project Overview
Transformers have reached their architectural ceiling—opaque dense matrices, zero temporal memory, and massive computational overhead. The **Baby Dragon Hatchling (BDH)** breaks this paradigm with sparse activations, scale-free graph topologies, and continual Hebbian learning. 

However, BDH's internals can be difficult to grasp. 
**Our mission was simple:** Build the absolute best, most visceral, interactive browser-based visualization of BDH in existence, making its superiority instantly obvious to both executives and researchers.

## ✨ Features (Exactly as specified in Path A)

### 1. "Sparse Brain" - Activation Density Comparator
* **The Insight:** Showing is better than telling. 
* **The Implementation:** We feed identical token streams to a simulated Dense Transformer matrix and the scale-free BDH matrix side-by-side. You immediately see the visceral dramatic visual contrast: 100% noisy dense activation on the Transformer vs. the elegant 5% sparse activation clustering in BDH.

### 2. "Graph Brain" - Emergent Topology Explorer
* **The Insight:** BDH is natively a graph, not an abstract matrix.
* **The Implementation:** We created a real-time **Force-Directed SVG Net Graph** using `react-force-graph-2d` spanning the UI. As tokens are processed, you physically see the Hub-and-Spoke structures emerge. Active nodes (neurons) glow and are tagged with interpretability labels (Monosemantic Synapses) demonstrating exactly what they "detect".

### 3. "Memory Formation" - Hebbian Learning Animator
* **The Insight:** "Neurons that fire together wire together" is now visible.
* **The Implementation:** Typical architectures are frozen after training. Our visualizer implements a genuine `Reinforce` loop over our Modal-backed PyTorch engine. When you interact with the UI to correct a token, you instantly watch the temporal dynamics unfold—the exact edges (the $ \sigma $ matrix links) between the active tokens **visibly thicken and pulse in real-time** on the topology graph, showing learning in mere seconds.

## 🛠 How We Used Pathway & Architecture

The architecture seamlessly marries high-performance Python inference with React visuals:

### 1. Pathway Streaming Engine Integration
Live inference generates massive amounts of telemetry (sparsity metrics, active neuron IDs, semantic shifts per layer). Rather than a brittle HTTP request, we utilized the **Pathway (`pw`) engine** to ingest tensor-flow streams and convert them into low-latency Server-Sent Events (SSE). 
1. As the PyTorch BDH model processes characters mathematically, the activations are sliced.
2. The arrays are dispatched through a Pathway stream, enabling robust, backpressure-resistant data telemetry out of Modal to the Next.js visualizer.

### 2. The Real-Weights Modal Backend
We did not just mock UI data:
- We deployed a character-level miniature BDH model using the `pathwaycom/bdh` official codebase onto a **Modal Cloud T4 GPU**. 
- Live weights are stored in a `modal.Volume` and loaded by a containerized FastAPI app that mathematically calculates the $G_x = E \cdot D_x$ matrices on the fly. 

### 3. Glassmorphism Next.js Visualizer
- **Framework:** Next.js 15, React 19, TypeScript
- **Visuals:** Framer Motion, Tailwind CSS, Lucide React, and `react-force-graph`
- **Aesthetics:** Engineered to reflect "Premium AI Tools"—leveraging deep dark modes, dynamic edge compositing, and glassmorphic telemetry panels to ensure visual clarity.

## 🚀 Getting Started

### Start the Backend
```bash
# Ensure you have your Modal token configured
modal serve backend/modal_app.py
```
*Note: Make sure to update the CORS URL config if you deploy elsewhere.*

### Start the Frontend Visualizer
```bash
cd web
npm i
npm run dev
```
Navigate to `http://localhost:3000` to interact with the BDH topology!

## 🔮 The Impact
We successfully translated the opaque math of scale-free monosemantic topologies into a living, breathing application. This tool allows researchers to tangibly explore how AI memory can be formed continuously at inference, setting the standard for how we explain post-transformer architectures to the world.

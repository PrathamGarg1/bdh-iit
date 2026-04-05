import modal
from pathlib import Path
import json
import asyncio

app = modal.App("bdh-explainer-backend")

image = (
    modal.Image.debian_slim(python_version="3.10")
    .apt_install("git")
    .pip_install(
        "fastapi",
        "uvicorn",
        "pathway",
        "torch",
        "numpy",
        "requests",
        "sse-starlette",
        "transformers",
        "accelerate",
    )
    .run_commands("git clone https://github.com/pathwaycom/bdh.git /root/bdh")
)

# A volume to store trained checkpoints
volume = modal.Volume.from_name("bdh-checkpoints", create_if_missing=True)

@app.function(image=image, volumes={"/vol": volume}, timeout=3600, gpu="T4")
def train_tiny_model():
    """Trains a tiny character-level BDH model and saves the weights to volume."""
    import sys
    sys.path.append("/root/bdh")
    import bdh
    import torch
    import os
    import numpy as np
    import requests

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Training on device: {device}")

    BDH_CONFIG = bdh.BDHConfig(n_layer=2, n_embd=64, n_head=2, mlp_internal_dim_multiplier=16, vocab_size=256)
    model = bdh.BDH(BDH_CONFIG).to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-3)

    input_file_path = "/vol/input.txt"
    if not os.path.exists(input_file_path):
        data_url = "https://raw.githubusercontent.com/karpathy/char-rnn/master/data/tinyshakespeare/input.txt"
        with open(input_file_path, "w") as f:
            f.write(requests.get(data_url).text)

    data = np.memmap(input_file_path, dtype=np.uint8, mode="r")
    BLOCK_SIZE = 64
    BATCH_SIZE = 16
    MAX_ITERS = 200

    model.train()
    for step in range(MAX_ITERS):
        ix = torch.randint(len(data) - BLOCK_SIZE, (BATCH_SIZE,))
        x = torch.stack([torch.from_numpy((data[i : i + BLOCK_SIZE]).astype(np.int64)) for i in ix]).to(device)
        y = torch.stack([torch.from_numpy((data[i + 1 : i + 1 + BLOCK_SIZE]).astype(np.int64)) for i in ix]).to(device)

        logits, loss = model(x, y)
        loss.backward()
        optimizer.step()
        optimizer.zero_grad()

        if step % 50 == 0:
            print(f"Step {step}, Loss {loss.item()}")

    checkpoint_path = "/vol/bdh_tiny.pt"
    torch.save(model.state_dict(), checkpoint_path)
    volume.commit()
    print(f"Model saved to {checkpoint_path}")
    return checkpoint_path


@app.function(image=image, volumes={"/vol": volume})
@modal.asgi_app()
def fastapi_app():
    from fastapi import FastAPI, Query, Body
    from fastapi.middleware.cors import CORSMiddleware
    from sse_starlette.sse import EventSourceResponse
    import pathway as pw
    import sys
    sys.path.append("/root/bdh")
    import bdh
    import torch
    import torch.nn.functional as F
    import json
    import asyncio
    import numpy as np
    from transformers import GPT2LMHeadModel, GPT2Tokenizer

    web_app = FastAPI(title="BDH Explainer API")
    web_app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    device = torch.device("cpu")

    # ── BDH (tiny, char-level, byte vocab) ──────────────────────────────────
    BDH_CONFIG = bdh.BDHConfig(n_layer=2, n_embd=64, n_head=2, mlp_internal_dim_multiplier=16, vocab_size=256)
    model = bdh.BDH(BDH_CONFIG).to(device)
    model.eval()

    checkpoint_path = "/vol/bdh_tiny.pt"
    try:
        volume.reload()
        model.load_state_dict(torch.load(checkpoint_path, map_location=device))
        print("Successfully loaded BDH weights from Volume!")
    except Exception as e:
        print("Could not load BDH weights.", e)

    # ── GPT-2 Small (124M, real dense transformer) ───────────────────────────
    print("Loading GPT-2 small (124M params)…")
    gpt2_tokenizer = GPT2Tokenizer.from_pretrained("gpt2")
    gpt2_model = GPT2LMHeadModel.from_pretrained("gpt2")
    gpt2_model.eval()
    print("GPT-2 loaded.")

    neuron_semantics = {}

    @web_app.get("/stream")
    async def stream_activations(prompt: str = Query(default="Hey")):
        async def event_generator():
            for token_char in prompt:
                await asyncio.sleep(0.3)

                # ── BDH Forward Pass ────────────────────────────────────────
                idx = torch.tensor(bytearray(token_char, "utf-8"), dtype=torch.long, device=device).unsqueeze(0)

                with torch.no_grad():
                    B, T = idx.size()
                    D = BDH_CONFIG.n_embd        # 64
                    nh = BDH_CONFIG.n_head       # 2
                    N = D * BDH_CONFIG.mlp_internal_dim_multiplier // nh  # 512

                    x = model.embed(idx).unsqueeze(1)
                    x = model.ln(x)

                    x_latent = x @ model.encoder
                    x_sparse = F.relu(x_latent)   # [1, 2, 1, 512]  ~95% zeros
                    yKV = model.attn(Q=x_sparse, K=x_sparse, V=x)
                    yKV = model.ln(yKV)

                    y_latent = yKV @ model.encoder_v
                    y_sparse = F.relu(y_latent)

                    # BDH prediction
                    x_out = model.ln(x + model.ln((x_sparse * y_sparse).transpose(1, 2).reshape(B, 1, T, N * nh) @ model.decoder))
                    bdh_logits = x_out.view(1, 1, D) @ model.lm_head   # [1, 1, 256]
                    bdh_probs = F.softmax(bdh_logits[0, -1, :], dim=-1)
                    bdh_top5 = torch.topk(bdh_probs, 5)
                    bdh_prediction = {
                        "model": "BDH (Tiny, 2-layer, byte-level)",
                        "top_chars": [
                            chr(i) if 32 <= i < 127 else f"[{i}]"
                            for i in bdh_top5.indices.tolist()
                        ],
                        "top_probs": [round(float(p), 4) for p in bdh_top5.values.tolist()],
                    }

                    # BDH Hebbian topology
                    active_sparse = x_sparse[0, 0, 0, :64]
                    co_activation = torch.outer(active_sparse, active_sparse)
                    links = []
                    for i in range(64):
                        for j in range(i + 1, 64):
                            weight = float(co_activation[i, j].item())
                            if weight > 0.01:
                                links.append({"source": f"n-{i}", "target": f"n-{j}", "weight": weight})

                    head_0_x_sparse = x_sparse[0, 0, 0, :].numpy().tolist()
                    head_0_y_sparse = y_sparse[0, 0, 0, :].numpy().tolist()

                    sliced_x = head_0_x_sparse[:64]
                    sliced_y = head_0_y_sparse[:64]

                    # Track neuron semantics
                    active_indices = [i for i, val in enumerate(sliced_x) if val > 0]
                    for i in active_indices:
                        if i not in neuron_semantics:
                            neuron_semantics[i] = {}
                        neuron_semantics[i][token_char] = neuron_semantics[i].get(token_char, 0) + 1

                    top_labels = {}
                    for i in active_indices:
                        if i in neuron_semantics and neuron_semantics[i]:
                            best_char = max(neuron_semantics[i].items(), key=lambda item: item[1])[0]
                            top_labels[f"n-{i}"] = f"'{best_char}' detector"

                # ── GPT-2 Forward Pass ───────────────────────────────────────
                with torch.no_grad():
                    # Tokenize the character (GPT-2 uses BPE, may map char to 1+ tokens)
                    gpt2_inputs = gpt2_tokenizer(token_char, return_tensors="pt")
                    gpt2_out = gpt2_model(
                        **gpt2_inputs,
                        output_hidden_states=True,
                    )

                    # Real dense activations: hidden state of layer 1, last token, first 64 dims
                    # GPT-2 hidden size = 768; these are GELU-activated, ALL non-zero (dense)
                    gpt2_hidden_layer1 = gpt2_out.hidden_states[1][0, -1, :64]  # [64]
                    # Normalize to [-1, 1] range for display
                    max_val = gpt2_hidden_layer1.abs().max().clamp(min=1e-6)
                    gpt2_activations_norm = (gpt2_hidden_layer1 / max_val).tolist()

                    # GPT-2 top-5 next token predictions
                    gpt2_logits = gpt2_out.logits[0, -1, :]
                    gpt2_probs = F.softmax(gpt2_logits, dim=-1)
                    gpt2_top5 = torch.topk(gpt2_probs, 5)
                    gpt2_prediction = {
                        "model": "GPT-2 (124M, BPE, GELU-dense)",
                        "top_chars": [
                            gpt2_tokenizer.decode([i]).strip() or f"[{i}]"
                            for i in gpt2_top5.indices.tolist()
                        ],
                        "top_probs": [round(float(p), 4) for p in gpt2_top5.values.tolist()],
                    }

                payload = {
                    "token": token_char,
                    "layer": 0,
                    "x_sparse": [{"id": f"n-{i}", "value": val} for i, val in enumerate(sliced_x)],
                    "y_sparse": [{"id": f"n-{i}", "value": val} for i, val in enumerate(sliced_y)],
                    # Real GPT-2 dense activations (GELU, all non-zero) replace the old fake matrix
                    "x_dense": [{"id": f"nd-{i}", "value": val} for i, val in enumerate(gpt2_activations_norm)],
                    "semantics": top_labels,
                    "topology_links": links,
                    "prediction": bdh_prediction,
                    "transformer_prediction": gpt2_prediction,
                }

                yield json.dumps(payload)
            yield "[DONE]"
        return EventSourceResponse(event_generator())

    @web_app.post("/reinforce")
    async def reinforce(payload: dict = Body(...)):
        """
        Inference-Time Continuous Learning
        Executes a real-time weight update (Hebbian simulation via SGD) without needing a full dataset.
        """
        prompt = payload.get("prompt", "a")
        correct_token = payload.get("correct_token", "b")

        model.train()
        optimizer = torch.optim.AdamW(model.parameters(), lr=0.05)

        input_text = prompt
        target_text = input_text[1:] + correct_token

        ix = torch.tensor(bytearray(input_text, "utf-8"), dtype=torch.long, device=device).unsqueeze(0)
        iy = torch.tensor(bytearray(target_text, "utf-8"), dtype=torch.long, device=device).unsqueeze(0)

        logits, loss = model(ix, iy)
        loss.backward()
        optimizer.step()
        optimizer.zero_grad()
        model.eval()

        torch.save(model.state_dict(), checkpoint_path)
        volume.commit()

        return {"status": "success", "loss": float(loss.item())}

    return web_app

import modal
import json

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

    BDH_CONFIG = bdh.BDHConfig(
        n_layer=2, n_embd=64, n_head=2, mlp_internal_dim_multiplier=16, vocab_size=256
    )
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
        x = torch.stack(
            [torch.from_numpy((data[i : i + BLOCK_SIZE]).astype(np.int64)) for i in ix]
        ).to(device)
        y = torch.stack(
            [torch.from_numpy((data[i + 1 : i + 1 + BLOCK_SIZE]).astype(np.int64)) for i in ix]
        ).to(device)

        logits, loss = model(x, y)
        loss.backward()
        optimizer.step()
        optimizer.zero_grad()

        if step % 50 == 0:
            print(f"Step {step}, Loss {loss.item():.4f}")

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
    import sys
    sys.path.append("/root/bdh")
    import bdh
    import torch
    import torch.nn.functional as F
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

    # ── BDH (tiny, 2-layer, byte-level, vocab=256) ───────────────────────────
    BDH_CONFIG = bdh.BDHConfig(
        n_layer=2, n_embd=64, n_head=2, mlp_internal_dim_multiplier=16, vocab_size=256
    )
    model = bdh.BDH(BDH_CONFIG).to(device)
    model.eval()

    checkpoint_path = "/vol/bdh_tiny.pt"
    try:
        volume.reload()
        model.load_state_dict(torch.load(checkpoint_path, map_location=device))
        print("✅ BDH weights loaded from checkpoint.")
    except Exception as e:
        print(f"⚠️  Could not load BDH weights: {e}. Using random init.")

    # ── GPT-2 Small (124M, OpenAI) ───────────────────────────────────────────
    print("Loading GPT-2 small (124M)…")
    gpt2_tokenizer = GPT2Tokenizer.from_pretrained("gpt2")
    gpt2_model = GPT2LMHeadModel.from_pretrained("gpt2")
    gpt2_model.eval()
    print("✅ GPT-2 loaded.")

    neuron_semantics: dict = {}

    @web_app.get("/stream")
    async def stream_activations(prompt: str = Query(default="Hey")):
        async def event_generator():
            for char_idx, token_char in enumerate(prompt):
                import asyncio
                await asyncio.sleep(0.3)

                # ── Accumulated context up to (and including) this character ──
                # Capped at 64 bytes to perfectly match the training BLOCK_SIZE
                context = prompt[: char_idx + 1][-64:]

                # ════════════════════════════════════════════════════════════
                # BDH INFERENCE — uses full 2-layer model, full context
                # ════════════════════════════════════════════════════════════
                with torch.no_grad():
                    # Encode the whole context as raw bytes (vocab=256)
                    bdh_bytes = torch.tensor(
                        list(context.encode("utf-8")), dtype=torch.long, device=device
                    ).unsqueeze(0)  # [1, T]

                    # ── Correct full-model prediction ──────────────────────
                    # model.forward() runs ALL n_layer=2 layers correctly,
                    # including the assert K is Q constraint.
                    bdh_logits_all, _ = model(bdh_bytes)  # [1, T, 256]
                    bdh_last = bdh_logits_all[0, -1, :]   # logits for next byte [256]
                    bdh_probs = F.softmax(bdh_last, dim=-1)
                    bdh_top5 = torch.topk(bdh_probs, 5)
                    bdh_prediction = {
                        "model": "BDH (pathwaycom/bdh, 2-layer, byte-level)",
                        "top_chars": [
                            chr(i) if 32 <= i < 127 else f"[{i}]"
                            for i in bdh_top5.indices.tolist()
                        ],
                        "top_probs": [
                            round(float(p), 4) for p in bdh_top5.values.tolist()
                        ],
                    }

                    # BDH continuation: generate next 15 bytes greedily (top_k=5)
                    cont_tensor = model.generate(
                        bdh_bytes, max_new_tokens=15, temperature=0.8, top_k=5
                    )  # [1, T + 15]
                    new_bytes = cont_tensor[0, bdh_bytes.size(1):].tolist()
                    bdh_prediction["continuation"] = bytes(new_bytes).decode(
                        "utf-8", errors="replace"
                    )

                    # ── Layer-0 sparse activations (for SparseBrain / GraphBrain) ──
                    # Manually run layer 0 to capture x_sparse BEFORE the loop updates x.
                    # Note: model.attn asserts K is Q (same object), so we pass the
                    # same tensor for both Q and K.
                    B, T = bdh_bytes.size()
                    D = BDH_CONFIG.n_embd        # 64
                    nh = BDH_CONFIG.n_head       # 2
                    N = D * BDH_CONFIG.mlp_internal_dim_multiplier // nh  # 512

                    x_vis = model.embed(bdh_bytes).unsqueeze(1)  # [1, 1, T, 64]
                    x_vis = model.ln(x_vis)

                    x_latent = x_vis @ model.encoder               # [1, 2, T, 512]
                    x_sparse = F.relu(x_latent)                    # sparse! ~95% zeros

                    # Attention: K is Q (same object) — BDH requires this
                    y_kv = model.attn(Q=x_sparse, K=x_sparse, V=x_vis)
                    y_kv = model.ln(y_kv)

                    y_latent = y_kv @ model.encoder_v              # [1, 2, T, 512]
                    y_sparse = F.relu(y_latent)

                    # Visualise the LAST token's activations (most current char)
                    sliced_x = x_sparse[0, 0, -1, :64].tolist()   # head 0, last pos
                    sliced_y = y_sparse[0, 0, -1, :64].tolist()

                    # Hebbian co-activation links for the topology graph
                    active_sparse = x_sparse[0, 0, -1, :64]
                    co_activation = torch.outer(active_sparse, active_sparse)
                    links = []
                    for i in range(64):
                        for j in range(i + 1, 64):
                            w = float(co_activation[i, j].item())
                            if w > 0.01:
                                links.append({
                                    "source": f"n-{i}",
                                    "target": f"n-{j}",
                                    "weight": w,
                                })

                    # Neuron semantics: track what char each neuron fires for
                    active_indices = [i for i, v in enumerate(sliced_x) if v > 0]
                    for i in active_indices:
                        neuron_semantics.setdefault(i, {})
                        neuron_semantics[i][token_char] = (
                            neuron_semantics[i].get(token_char, 0) + 1
                        )

                    top_labels = {}
                    for i in active_indices:
                        if neuron_semantics.get(i):
                            best = max(
                                neuron_semantics[i].items(), key=lambda kv: kv[1]
                            )[0]
                            top_labels[f"n-{i}"] = f"'{best}' detector"

                # ════════════════════════════════════════════════════════════
                # GPT-2 INFERENCE — full accumulated context, 50257-token vocab
                # ════════════════════════════════════════════════════════════
                with torch.no_grad():
                    # Tokenize the whole accumulated context (BPE)
                    gpt2_inputs = gpt2_tokenizer(context, return_tensors="pt")
                    gpt2_out = gpt2_model(
                        **gpt2_inputs,
                        output_hidden_states=True,
                    )

                    # Predict the next BPE token given all context seen so far
                    gpt2_last_logits = gpt2_out.logits[0, -1, :]   # [50257]
                    gpt2_probs = F.softmax(gpt2_last_logits, dim=-1)
                    gpt2_top5 = torch.topk(gpt2_probs, 5)
                    gpt2_prediction = {
                        "model": "GPT-2 Small (124M, OpenAI, BPE)",
                        "top_chars": [
                            # decode each token id; strip whitespace for display
                            (gpt2_tokenizer.decode([tid]).strip() or f"[{tid}]")
                            for tid in gpt2_top5.indices.tolist()
                        ],
                        "top_probs": [
                            round(float(p), 4) for p in gpt2_top5.values.tolist()
                        ],
                    }

                    # Real dense GELU activations from GPT-2 hidden layer 1
                    # GPT-2 hidden_size=768; slice first 64 dims for display
                    gpt2_h1 = gpt2_out.hidden_states[1][0, -1, :64]  # [64]
                    max_v = gpt2_h1.abs().max().clamp(min=1e-6)
                    gpt2_norm = (gpt2_h1 / max_v).tolist()   # normalised to [-1, 1]

                payload = {
                    "token": token_char,
                    "layer": 0,
                    "x_sparse": [
                        {"id": f"n-{i}", "value": v}
                        for i, v in enumerate(sliced_x)
                    ],
                    "y_sparse": [
                        {"id": f"n-{i}", "value": v}
                        for i, v in enumerate(sliced_y)
                    ],
                    # Real GPT-2 GELU dense activations (all non-zero)
                    "x_dense": [
                        {"id": f"nd-{i}", "value": v}
                        for i, v in enumerate(gpt2_norm)
                    ],
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
        Inference-Time Continuous Learning via a single AdamW gradient step.
        Updates only the BDH model (GPT-2 is not fine-tuned here).
        """
        prompt = payload.get("prompt", "a")
        correct_token = payload.get("correct_token", "b")

        model.train()
        optimizer = torch.optim.AdamW(model.parameters(), lr=0.05)

        target_text = prompt[1:] + correct_token
        ix = torch.tensor(
            list(prompt.encode("utf-8")), dtype=torch.long, device=device
        ).unsqueeze(0)
        iy = torch.tensor(
            list(target_text.encode("utf-8")), dtype=torch.long, device=device
        ).unsqueeze(0)

        logits, loss = model(ix, iy)
        loss.backward()
        optimizer.step()
        optimizer.zero_grad()
        model.eval()

        torch.save(model.state_dict(), checkpoint_path)
        volume.commit()

        return {"status": "success", "loss": round(float(loss.item()), 4)}

    return web_app

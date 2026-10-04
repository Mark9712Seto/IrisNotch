"""Finto API server di Hermes, per provare l'isola senza il vero Hermes.

Imita il formato letto dal codice di hermes-agent (03/10/2026):
  GET  /health                         -> {"status":"ok","version":...}
  GET  /v1/capabilities                -> {"endpoints": {...}}
  GET  /api/sessions?source=&limit=    -> {"object":"list","data":[...]}
  POST /api/sessions {"source"}        -> 201 {"object":"hermes.session","session":{...}}
  PATCH /api/sessions/{id} {"title","pinned"}  -> {"session":{...}}
  DELETE /api/sessions/{id}
  GET  /api/sessions/{id}/messages     -> {"data":[...]}
  POST /v1/runs {"input","session_id"} -> 202 {"run_id","status":"started"}
  GET  /v1/runs/{id}                   -> {"status": running|completed|failed|cancelled, "output"}
  GET  /v1/runs/{id}/events            -> SSE: "id: n\\ndata: {json}\\n\\n", commenti ": keepalive"
  POST /v1/runs/{id}/approval {"choice": once|deny}
  POST /v1/runs/{id}/stop

Uso:  python3 tools/mock_hermes.py [porta]      (chiave: "prova")
Le frasi con "budget", "cancella", "invia" chiedono il via libera.
"""
import json, sys, threading, time, uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

KEY = "prova"
SESSIONS = [
    {"id": "tg1", "source": "telegram", "title": "Clima camera", "preview": "Accendi il condizionatore", "last_active": time.time() - 3600},
]
MESSAGES = {"tg1": [{"role": "user", "content": "Accendi il condizionatore"}, {"role": "assistant", "content": "Fatto, 24 °C."}]}
RUNS = {}  # run_id -> {"events": [...], "cond": Condition, "choice": None, "stopped": False}


def run_worker(run_id, session_id, text):
    r = RUNS[run_id]

    def ev(name, **f):
        with r["cond"]:
            r["events"].append({"event": name, "run_id": run_id, "timestamp": time.time(), **f})
            r["cond"].notify_all()

    time.sleep(0.3)
    ev("tool.started", tool="memory", preview="cerco nel contesto")
    time.sleep(0.3)
    if any(w in text.lower() for w in ("budget", "cancella", "invia")):
        ev("approval.request", description="Azione che scrive", command="actual_budget.add_transaction(-74.20)",
           pattern_key="actual_budget", choices=["once", "session", "always", "deny"])
        with r["cond"]:
            r["cond"].wait_for(lambda: r["choice"] or r["stopped"], timeout=120)
        if r["choice"] == "deny":
            ev("tool.completed", tool="memory", duration=0.1, error=True, preview="BLOCKED: negato")
            reply = "Va bene, non lo faccio."
            MESSAGES[session_id].append({"role": "assistant", "content": reply})
            ev("run.completed", output=reply, usage={})
            return
    ev("tool.completed", tool="memory", duration=0.6, error=False)
    reply = "Risposta di prova dal finto Hermes."
    for w in reply.split(" "):
        if r["stopped"]:
            ev("run.cancelled")
            return
        ev("message.delta", delta=w + " ")
        time.sleep(0.05)
    MESSAGES[session_id].append({"role": "assistant", "content": reply})
    ev("run.completed", output=reply, usage={"input_tokens": 10, "output_tokens": 8, "total_tokens": 18})


class H(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, *a):
        pass

    def _json(self, code, obj):
        b = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def _auth(self):
        if self.headers.get("Authorization") != f"Bearer {KEY}":
            self._json(401, {"error": {"message": "Invalid API key"}})
            return False
        return True

    def _body(self):
        n = int(self.headers.get("Content-Length") or 0)
        return json.loads(self.rfile.read(n) or b"{}") if n else {}

    def do_GET(self):
        u = urlparse(self.path)
        p, q = u.path, parse_qs(u.query)
        if p == "/health":
            return self._json(200, {"status": "ok", "platform": "hermes-agent", "version": "mock"})
        if not self._auth():
            return
        if p == "/v1/capabilities":
            eps = ["runs", "run_events", "run_approval", "run_stop", "sessions", "session_create", "session_messages"]
            return self._json(200, {"object": "hermes.api_server.capabilities", "endpoints": {e: ["GET", "/"] for e in eps}})
        if p == "/api/sessions":
            src = (q.get("source") or [None])[0]
            data = [s for s in SESSIONS if not src or s["source"] == src]
            return self._json(200, {"object": "list", "data": sorted(data, key=lambda s: -s["last_active"])})
        if p.startswith("/api/sessions/") and p.endswith("/messages"):
            sid = p.split("/")[3]
            return self._json(200, {"object": "list", "data": MESSAGES.get(sid, [])})
        if p.startswith("/v1/runs/") and p.endswith("/events"):
            rid = p.split("/")[3]
            r = RUNS.get(rid)
            if not r:
                return self._json(404, {"error": {"message": f"Run not found: {rid}"}})
            last = int(self.headers.get("Last-Event-ID") or -1)
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            self.wfile.write(b": open\n\n")
            i = last + 1
            while True:
                with r["cond"]:
                    r["cond"].wait_for(lambda: len(r["events"]) > i, timeout=10)
                    batch = r["events"][i:]
                if not batch:
                    self.wfile.write(b": keepalive\n\n"); self.wfile.flush(); continue
                for e in batch:
                    self.wfile.write(f"id: {i}\ndata: {json.dumps(dict(e, seq=i))}\n\n".encode())
                    i += 1
                    if e["event"].startswith("run.") and e["event"] in ("run.completed", "run.failed", "run.cancelled"):
                        self.wfile.write(b": stream closed\n\n"); self.wfile.flush()
                        self.close_connection = True
                        return
                self.wfile.flush()
        return self._json(404, {"error": {"message": "not found"}})

    def do_DELETE(self):
        p = urlparse(self.path).path
        if not self._auth():
            return
        for s in list(SESSIONS):
            if p == "/api/sessions/" + s["id"]:
                SESSIONS.remove(s); MESSAGES.pop(s["id"], None)
                return self._json(200, {"ok": True, "deleted": s["id"]})
        return self._json(404, {"error": {"message": "not found"}})

    def do_PATCH(self):
        p = urlparse(self.path).path
        if not self._auth():
            return
        body = self._body()
        for s in SESSIONS:
            if p == "/api/sessions/" + s["id"]:
                if "title" in body:
                    s["title"] = str(body["title"])
                if "pinned" in body:
                    s["pinned"] = bool(body["pinned"])
                return self._json(200, {"object": "hermes.session", "session": s})
        if p.startswith("/v1/runs/") and p.count("/") == 3:
            # stato della run, come GET /v1/runs/{id} di Hermes (per chi non tiene aperto il flusso di eventi)
            r = RUNS.get(p.split("/")[3])
            if not r:
                return self._json(404, {"error": {"message": "Run not found"}})
            with r["cond"]:
                last = r["events"][-1] if r["events"] else {}
            ev = last.get("event", "")
            status = {"run.completed": "completed", "run.failed": "failed", "run.cancelled": "cancelled"}.get(ev, "running")
            return self._json(200, {"object": "hermes.run", "run_id": p.split("/")[3], "status": status, "output": last.get("output") if status == "completed" else None})
        return self._json(404, {"error": {"message": "not found"}})

    def do_POST(self):
        p = urlparse(self.path).path
        if not self._auth():
            return
        body = self._body()
        if p == "/api/sessions":
            s = {"id": "s_" + uuid.uuid4().hex[:8], "source": body.get("source", "api_server"), "title": None, "preview": "", "last_active": time.time()}
            SESSIONS.append(s); MESSAGES[s["id"]] = []
            return self._json(201, {"object": "hermes.session", "session": s})
        if p == "/v1/runs":
            text, sid = body.get("input"), body.get("session_id")
            if not text:
                return self._json(400, {"error": {"message": "Missing 'input' field"}})
            rid = "run_" + uuid.uuid4().hex
            RUNS[rid] = {"events": [], "cond": threading.Condition(), "choice": None, "stopped": False}
            MESSAGES.setdefault(sid, []).append({"role": "user", "content": text})
            for s in SESSIONS:
                if s["id"] == sid:
                    s["preview"], s["last_active"] = text, time.time()
                    s["title"] = s["title"] or text[:40]
            threading.Thread(target=run_worker, args=(rid, sid, text), daemon=True).start()
            return self._json(202, {"run_id": rid, "status": "started"})
        if p.startswith("/v1/runs/") and p.endswith("/approval"):
            r = RUNS.get(p.split("/")[3])
            if body.get("choice") not in ("once", "session", "always", "deny"):
                return self._json(400, {"error": {"message": "Invalid approval choice"}})
            with r["cond"]:
                r["choice"] = body["choice"]; r["cond"].notify_all()
            return self._json(200, {"status": "resolved"})
        if p.startswith("/v1/runs/") and p.endswith("/stop"):
            r = RUNS.get(p.split("/")[3])
            with r["cond"]:
                r["stopped"] = True; r["cond"].notify_all()
            return self._json(200, {"status": "stopping"})
        return self._json(404, {"error": {"message": "not found"}})


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8642
    print(f"Finto Hermes su http://127.0.0.1:{port}  (chiave: {KEY})")
    ThreadingHTTPServer(("127.0.0.1", port), H).serve_forever()

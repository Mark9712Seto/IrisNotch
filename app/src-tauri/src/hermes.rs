//! Client dell'API server di Hermes. Formato verificato sul codice di hermes-agent (03/10/2026):
//! - sessioni:  GET/POST /api/sessions, PATCH /api/sessions/{id} (titolo), GET /api/sessions/{id}/messages
//! - run:       POST /v1/runs {input, session_id} -> {run_id}
//! - eventi:    GET /v1/runs/{id}/events (SSE: righe `id:` e `data: {json}`, commenti `:`)
//! - via libera POST /v1/runs/{id}/approval {choice: once|deny}
//! - stop:      POST /v1/runs/{id}/stop
//! La chiave resta qui nel lato Rust: l'interfaccia non la vede mai.

use futures_util::StreamExt;
use serde_json::{json, Value};
use std::time::Duration;

pub struct Hermes {
    base: String,
    key: String,
    http: reqwest::Client,
}

fn err(e: impl std::fmt::Display) -> String {
    let s = e.to_string();
    if s.contains("error sending request") || s.contains("connect") {
        format!("Hermes non raggiungibile ({s})")
    } else {
        s
    }
}

impl Hermes {
    pub fn new(base: &str, key: Option<String>) -> Result<Self, String> {
        let base = base.trim().trim_end_matches('/').to_string();
        if base.is_empty() {
            return Err("Indirizzo di Hermes non impostato (Impostazioni → Hermes)".into());
        }
        let key = key.ok_or("Chiave API di Hermes non impostata (Impostazioni → Hermes)")?;
        let http = reqwest::Client::builder()
            .connect_timeout(Duration::from_secs(5))
            .build()
            .map_err(err)?;
        Ok(Self { base, key, http })
    }

    fn get(&self, path: &str) -> reqwest::RequestBuilder {
        self.http.get(format!("{}{}", self.base, path)).bearer_auth(&self.key)
    }
    fn post(&self, path: &str) -> reqwest::RequestBuilder {
        self.http.post(format!("{}{}", self.base, path)).bearer_auth(&self.key)
    }
    fn delete(&self, path: &str) -> reqwest::RequestBuilder {
        self.http.delete(format!("{}{}", self.base, path)).bearer_auth(&self.key)
    }
    fn patch(&self, path: &str) -> reqwest::RequestBuilder {
        self.http.patch(format!("{}{}", self.base, path)).bearer_auth(&self.key)
    }

    async fn json(rb: reqwest::RequestBuilder) -> Result<Value, String> {
        let r = rb.timeout(Duration::from_secs(30)).send().await.map_err(err)?;
        let status = r.status();
        let body: Value = r.json().await.unwrap_or(Value::Null);
        if status.as_u16() == 401 {
            return Err("Chiave API rifiutata da Hermes (401)".into());
        }
        if !status.is_success() {
            let msg = body["error"]["message"].as_str().or(body["error"].as_str()).unwrap_or("errore");
            return Err(format!("Hermes ha risposto {status}: {msg}"));
        }
        Ok(body)
    }

    /// raggiungibile? (/health non chiede la chiave)
    pub async fn ping(base: &str) -> bool {
        let base = base.trim().trim_end_matches('/');
        if base.is_empty() {
            return false;
        }
        let Ok(c) = reqwest::Client::builder().timeout(Duration::from_secs(4)).build() else { return false };
        matches!(c.get(format!("{base}/health")).send().await, Ok(r) if r.status().is_success())
    }

    /// prova la connessione e dice cosa supporta la versione installata
    pub async fn test(&self) -> Result<Value, String> {
        let health = Self::json(self.http.get(format!("{}/health", self.base))).await?;
        let caps = Self::json(self.get("/v1/capabilities")).await?;
        let ep = &caps["endpoints"];
        let has = |k: &str| !ep[k].is_null();
        Ok(json!({
            "ok": true,
            "version": health["version"],
            "features": {
                "runs": has("runs") && has("run_events"),
                "run_approval": has("run_approval"),
                "sessions": has("sessions") && has("session_create") && has("session_messages"),
            }
        }))
    }

    pub async fn list_sessions(&self, source: Option<String>, limit: u32) -> Result<Value, String> {
        let mut q = vec![("limit", limit.to_string())];
        if let Some(s) = source {
            q.push(("source", s));
        }
        let v = Self::json(self.get("/api/sessions").query(&q)).await?;
        Ok(v["data"].clone())
    }

    /// le sessioni nate dall'isola hanno source "desktop", così il menu le distingue
    pub async fn create_session(&self) -> Result<Value, String> {
        let v = Self::json(self.post("/api/sessions").json(&json!({ "source": "desktop" }))).await?;
        let id = v["id"].as_str().or(v["session"]["id"].as_str()).or(v["data"]["id"].as_str()).unwrap_or_default();
        Ok(json!({ "id": id }))
    }

    /// rinomina la sessione su Hermes (PATCH /api/sessions/{id} con {"title"}): il nome nuovo si vede ovunque
    pub async fn rename_session(&self, id: &str, title: &str) -> Result<Value, String> {
        let v = Self::json(self.patch(&format!("/api/sessions/{id}")).json(&json!({ "title": title }))).await?;
        Ok(v["session"].clone())
    }

    /// fissa o sgancia la sessione in cima all'elenco (campo "pinned" di Hermes: vale anche nel pannello)
    pub async fn pin_session(&self, id: &str, pinned: bool) -> Result<Value, String> {
        let v = Self::json(self.patch(&format!("/api/sessions/{id}")).json(&json!({ "pinned": pinned }))).await?;
        Ok(v["session"].clone())
    }

    /// elimina la sessione su Hermes (non si può annullare)
    pub async fn delete_session(&self, id: &str) -> Result<(), String> {
        Self::json(self.delete(&format!("/api/sessions/{id}"))).await?;
        Ok(())
    }

    pub async fn messages(&self, id: &str) -> Result<Value, String> {
        let v = Self::json(self.get(&format!("/api/sessions/{id}/messages")).query(&[("inline_images", "false")])).await?;
        Ok(v["data"].clone())
    }

    pub async fn start_run(&self, session_id: &str, text: &str) -> Result<String, String> {
        let v = Self::json(self.post("/v1/runs").json(&json!({ "input": text, "session_id": session_id }))).await?;
        v["run_id"].as_str().map(String::from).ok_or_else(|| "Hermes non ha restituito il run_id".into())
    }

    pub async fn approve(&self, run_id: &str, choice: &str) -> Result<(), String> {
        // dall'isola solo "una volta" o "nega": "session" e "always" allargano i permessi in modo duraturo
        let choice = if choice == "once" { "once" } else { "deny" };
        Self::json(self.post(&format!("/v1/runs/{run_id}/approval")).json(&json!({ "choice": choice }))).await?;
        Ok(())
    }

    pub async fn stop(&self, run_id: &str) -> Result<(), String> {
        Self::json(self.post(&format!("/v1/runs/{run_id}/stop"))).await?;
        Ok(())
    }

    /// Segue gli eventi della run e li gira all'interfaccia come "hermes-event".
    /// Se la connessione cade riprende da dove era (Last-Event-ID), fino a 5 volte.
    pub async fn follow(self, run_id: String, emit: impl Fn(Value) + Send) {
        let mut last_seq: Option<i64> = None;
        let mut retries = 0;
        loop {
            let mut rb = self.get(&format!("/v1/runs/{run_id}/events")).header("Accept", "text/event-stream");
            if let Some(s) = last_seq {
                rb = rb.header("Last-Event-ID", s.to_string());
            }
            match rb.send().await {
                Ok(r) if r.status().is_success() => {
                    let mut stream = r.bytes_stream();
                    let mut buf = String::new();
                    while let Some(chunk) = stream.next().await {
                        let Ok(chunk) = chunk else { break };
                        buf.push_str(&String::from_utf8_lossy(&chunk));
                        while let Some(pos) = buf.find("\n\n") {
                            let frame: String = buf.drain(..pos + 2).collect();
                            if let Some((seq, ev)) = parse_frame(&frame) {
                                if let Some(s) = seq {
                                    last_seq = Some(s);
                                }
                                let name = ev["event"].as_str().unwrap_or_default().to_string();
                                emit(ev);
                                if is_terminal(&name) {
                                    return;
                                }
                            }
                        }
                    }
                }
                Ok(r) if r.status().as_u16() == 404 => {
                    // run sconosciuta o già scaduta: niente da seguire
                    emit(json!({"event": "run.failed", "run_id": run_id, "error": "Run non trovata su Hermes"}));
                    return;
                }
                _ => {}
            }
            retries += 1;
            if retries > 5 {
                emit(json!({"event": "run.failed", "run_id": run_id, "error": "Connessione con Hermes persa"}));
                return;
            }
            tokio::time::sleep(Duration::from_millis(800 * retries)).await;
        }
    }
}

fn is_terminal(name: &str) -> bool {
    matches!(name, "run.completed" | "run.failed" | "run.cancelled" | "run.interrupted")
}

/// Una cornice SSE: righe `id:`, `event:`, `data:`; le righe che iniziano con `:` sono commenti (keepalive).
fn parse_frame(frame: &str) -> Option<(Option<i64>, Value)> {
    let mut data = String::new();
    let mut id = None;
    for line in frame.lines() {
        if let Some(d) = line.strip_prefix("data:") {
            if !data.is_empty() {
                data.push('\n');
            }
            data.push_str(d.trim_start());
        } else if let Some(i) = line.strip_prefix("id:") {
            id = i.trim().parse().ok();
        }
    }
    if data.is_empty() {
        return None;
    }
    let v: Value = serde_json::from_str(&data).ok()?;
    let seq = id.or_else(|| v["seq"].as_i64());
    Some((seq, v))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn frame_with_id_and_data() {
        let (seq, v) = parse_frame("id: 3\ndata: {\"event\":\"message.delta\",\"run_id\":\"r\",\"delta\":\"ciao\",\"seq\":3}\n\n").unwrap();
        assert_eq!(seq, Some(3));
        assert_eq!(v["delta"], "ciao");
    }

    #[test]
    fn comments_are_ignored() {
        assert!(parse_frame(": keepalive\n\n").is_none());
        assert!(parse_frame(": open\n\n").is_none());
    }

    /// prova completa contro tools/mock_hermes.py:  MOCK_HERMES=http://127.0.0.1:8642 cargo test -- --ignored
    #[tokio::test]
    #[ignore]
    async fn end_to_end_with_mock() {
        let url = std::env::var("MOCK_HERMES").unwrap_or("http://127.0.0.1:8642".into());
        assert!(Hermes::ping(&url).await, "finto Hermes non raggiungibile");
        let bad = Hermes::new(&url, Some("sbagliata".into())).unwrap();
        assert!(bad.test().await.unwrap_err().contains("401"));
        let h = Hermes::new(&url, Some("prova".into())).unwrap();
        let t = h.test().await.unwrap();
        assert_eq!(t["features"]["run_approval"], true);
        let s = h.create_session().await.unwrap();
        let sid = s["id"].as_str().unwrap().to_string();
        assert!(sid.starts_with("s_"));
        let mine = h.list_sessions(Some("desktop".into()), 10).await.unwrap();
        assert!(mine.as_array().unwrap().iter().any(|x| x["id"] == sid.as_str()));
        let r = h.rename_session(&sid, "Prova rinomina").await.unwrap();
        assert_eq!(r["title"], "Prova rinomina");
        let r = h.pin_session(&sid, true).await.unwrap();
        assert_eq!(r["pinned"], true);
        let extra = h.create_session().await.unwrap();
        let eid = extra["id"].as_str().unwrap().to_string();
        h.delete_session(&eid).await.unwrap();
        let all = h.list_sessions(None, 100).await.unwrap();
        assert!(!all.as_array().unwrap().iter().any(|x| x["id"] == eid.as_str()));

        // run semplice: delta + completato
        let run = h.start_run(&sid, "ciao").await.unwrap();
        let seen = std::sync::Arc::new(std::sync::Mutex::new(Vec::<Value>::new()));
        let s2 = seen.clone();
        Hermes::new(&url, Some("prova".into())).unwrap().follow(run, move |v| s2.lock().unwrap().push(v)).await;
        let names: Vec<String> = seen.lock().unwrap().iter().map(|v| v["event"].as_str().unwrap().to_string()).collect();
        assert!(names.contains(&"tool.started".to_string()));
        assert!(names.contains(&"message.delta".to_string()));
        assert_eq!(names.last().unwrap(), "run.completed");

        // run con via libera: aspetta approval.request, nega, deve chiudersi con la risposta di rifiuto
        let run = h.start_run(&sid, "segna nel budget").await.unwrap();
        let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel::<Value>();
        let f = Hermes::new(&url, Some("prova".into())).unwrap();
        let rid = run.clone();
        let task = tokio::spawn(async move { f.follow(rid, move |v| { let _ = tx.send(v); }).await });
        let mut last = Value::Null;
        while let Some(v) = rx.recv().await {
            if v["event"] == "approval.request" {
                assert!(v["command"].as_str().unwrap().contains("actual_budget"));
                h.approve(&run, "deny").await.unwrap();
            }
            last = v;
        }
        task.await.unwrap();
        assert_eq!(last["event"], "run.completed");
        assert!(last["output"].as_str().unwrap().contains("non lo faccio"));
        let msgs = h.messages(&sid).await.unwrap();
        assert_eq!(msgs.as_array().unwrap().len(), 4);
    }

    #[test]
    fn terminal_events() {
        assert!(is_terminal("run.completed"));
        assert!(is_terminal("run.failed"));
        assert!(!is_terminal("tool.started"));
    }
}

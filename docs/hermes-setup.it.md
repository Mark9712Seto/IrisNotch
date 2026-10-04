# Accendere l'API server di Hermes

*[Read in English](hermes-setup.md)*

Iris parla con Hermes attraverso il suo **API server** (porta predefinita `8642`). Si fa una volta sola, sulla macchina dove gira Hermes.

## 1. Aggiungi una chiave nel `.env` di Hermes

Hermes accende da solo l'API server quando c'è `API_SERVER_KEY`, di almeno 16 caratteri. I valori in `~/.hermes/.env` hanno la precedenza su `config.yaml`, quindi `config.yaml` non va toccato.

Lancia questo sulla macchina di Hermes (con l'utente che fa girare Hermes):

```bash
bash <<'END'
set -e
cd ~/.hermes
[ -e ".env.bak-$(date +%F)" ] || cp .env ".env.bak-$(date +%F)"
sed -i '/^API_SERVER_\(ENABLED\|HOST\|PORT\|KEY\)=/d' .env
[ -z "$(tail -c1 .env)" ] || echo >> .env
KEY=$(python3 -c 'import secrets; print(secrets.token_hex(32))')
printf 'API_SERVER_ENABLED=true\nAPI_SERVER_HOST=0.0.0.0\nAPI_SERVER_PORT=8642\nAPI_SERVER_KEY=%s\n' "$KEY" >> .env
echo "Chiave per Iris (copiala adesso): $KEY"
END
```

Poi riavvia il gateway, per esempio `systemctl restart hermes-gateway`, o come riavvii Hermes di solito.

`API_SERVER_HOST=0.0.0.0` fa ascoltare l'API server sulla rete. Con il firewall lascia arrivare alla porta 8642 **solo i PC dove gira Iris**.

## 2. Controlla

```bash
curl -s http://127.0.0.1:8642/health
curl -s -H "Authorization: Bearer <chiave>" http://127.0.0.1:8642/v1/capabilities
```

In `capabilities` → `endpoints` servono `runs`, `run_events`, `run_approval`, `sessions`, `session_create` e `session_messages`. Se ne manca qualcuno, aggiorna Hermes.

## 3. Collega Iris

Apri le impostazioni dell'isola e metti l'indirizzo (`http://<indirizzo-di-hermes>:8642`) e la chiave. Poi premi **Test**.

## Strumenti disponibili dall'isola

L'API server ha un suo elenco di strumenti (`hermes-api-server`), separato da quello di Telegram e delle altre piattaforme. Se una cosa funziona su Telegram ma non dall'isola, aggiungi il toolset che manca in `platform_toolsets.api_server` dentro `config.yaml`.

## Tornare indietro

```bash
sed -i '/^API_SERVER_/d' ~/.hermes/.env
```

Poi riavvia il gateway.

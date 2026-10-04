# Turning on the Hermes API server

*[Leggi in italiano](hermes-setup.it.md)*

Iris talks to Hermes through its **API server** (default port `8642`). You do this once, on the machine where Hermes runs.

## 1. Add a key to Hermes' `.env`

Hermes turns the API server on by itself when `API_SERVER_KEY` is set, with at least 16 characters. Values in `~/.hermes/.env` take precedence over `config.yaml`, so `config.yaml` doesn't need to change.

Run this on the Hermes machine (as the user that runs Hermes):

```bash
bash <<'END'
set -e
cd ~/.hermes
[ -e ".env.bak-$(date +%F)" ] || cp .env ".env.bak-$(date +%F)"
sed -i '/^API_SERVER_\(ENABLED\|HOST\|PORT\|KEY\)=/d' .env
[ -z "$(tail -c1 .env)" ] || echo >> .env
KEY=$(python3 -c 'import secrets; print(secrets.token_hex(32))')
printf 'API_SERVER_ENABLED=true\nAPI_SERVER_HOST=0.0.0.0\nAPI_SERVER_PORT=8642\nAPI_SERVER_KEY=%s\n' "$KEY" >> .env
echo "Key for Iris (copy it now): $KEY"
END
```

Then restart the gateway, for example `systemctl restart hermes-gateway`, or the way you normally restart Hermes.

`API_SERVER_HOST=0.0.0.0` makes the API server listen on the network. Use your firewall to allow **only the PCs that run Iris** to reach port 8642.

## 2. Check it

```bash
curl -s http://127.0.0.1:8642/health
curl -s -H "Authorization: Bearer <key>" http://127.0.0.1:8642/v1/capabilities
```

In `capabilities` → `endpoints` you need `runs`, `run_events`, `run_approval`, `sessions`, `session_create` and `session_messages`. If some are missing, update Hermes.

## 3. Connect Iris

Open the settings in the island and enter the address (`http://<hermes-host>:8642`) and the key. Then press **Test connection**.

## Tools available from the island

The API server has its own tool list (`hermes-api-server`). It is separate from the one used by Telegram and the other platforms. If something works on Telegram but not from the island, add the missing toolset under `platform_toolsets.api_server` in `config.yaml`.

## Undo

```bash
sed -i '/^API_SERVER_/d' ~/.hermes/.env
```

Then restart the gateway.

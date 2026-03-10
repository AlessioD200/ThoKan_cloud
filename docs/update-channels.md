# Update Channels (Stable + Beta)

Deze setup laat je updates binnenhalen zonder GitHub. Je gebruikt je eigen update server (HTTP/HTTPS) met 2 kanalen: `stable` en `beta`.

## 1) Wat de app nu ondersteunt

- Kanaalkeuze: `stable` of `beta`
- Per kanaal een eigen source URL in Settings
- Source URL kan zijn:
  - Direct archief (`.zip`, `.tar`, `.tar.gz`, `.tgz`)
  - Manifest JSON (`.json`) met veld `package_url`
- Eén klik op **Fetch latest** haalt package binnen op de server
- Eén klik op **Apply update** voert `update.sh` uit
- Na succesvolle update:
  - Automatische Docker rebuild/redeploy
  - Automatische Ubuntu updates

## 2) Voorbeeldbestanden

Voorbeelden staan in [scripts/update_templates](../scripts/update_templates):

- `update.sh`
- `update-manifest.stable.json`
- `update-manifest.beta.json`

## 3) Package structuur

Je update-archief moet minimaal bevatten:

- `update.sh`
- `payload/` map met de bestanden die je wilt uitrollen naar je target pad (standaard `/opt/thokan-cloud`)

Voorbeeld:

```
my-update.tar.gz
├── update.sh
└── payload/
    ├── docker-compose.yml
    ├── backend/
    └── frontend/
```

## 4) Source URLs in Settings

Ga naar **Settings → System Updates** en configureer:

- `stable` source URL
- `beta` source URL
- `Auto Docker rebuild`
- `Auto Ubuntu updates`

Klik daarna op **Save update settings**.

## 5) Uitrolflow

1. Kies kanaal (`stable` of `beta`)
2. Klik **Fetch latest <channel>**
3. Controleer package in dropdown
4. Klik **Apply Update**

## 6) Manifest formaat

Minimaal nodig:

```json
{
  "version": "1.0.0",
  "package_url": "https://updates.your-domain.com/stable/thokan-update-1.0.0.tar.gz"
}
```

Optionele velden (zoals `channel`, `notes`) zijn toegestaan.

## 6b) Publiceren in één commando

Gebruik [scripts/publish_update.py](../scripts/publish_update.py) om tegelijk:

- het package naar `stable/` of `beta/` te kopiëren
- `latest.json` automatisch bij te werken

Voor publicatie + live controle (manifest/package bereikbaar):

- [scripts/publish_and_verify_update.py](../scripts/publish_and_verify_update.py)

## 7) Praktische hostingoptie

Eenvoudigste variant:

- Host manifests en archieven als statische files via Nginx/Caddy/S3-compatible storage
- Zet `stable` en `beta` op aparte paden
  - `https://updates.your-domain.com/stable/latest.json`
  - `https://updates.your-domain.com/beta/latest.json`

Nginx voorbeeldconfig en stappen:

- [docs/update-host-nginx.md](update-host-nginx.md)
- [docker/nginx/update-host.conf.example](../docker/nginx/update-host.conf.example)

## 8) Belangrijk voor Ubuntu updates

Ubuntu update-automatisatie draait op de server waar de backend draait.
Zorg dat deze service voldoende rechten heeft (`sudo`/root context) voor `apt-get update && apt-get -y upgrade`.
Als dat niet kan, zet `Auto Ubuntu updates` uit en voer OS-updates via je bestaande serverbeheer uit.

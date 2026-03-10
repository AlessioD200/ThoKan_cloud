# Nginx Update Host (Stable + Beta)

Gebruik deze setup om je eigen updatefeed te hosten op bijvoorbeeld updates.your-domain.com.

## 1. Bestandenstructuur op server

Maak een statische root aan:

- /var/www/thokan-updates/stable/
- /var/www/thokan-updates/beta/

Voorbeeld:

- /var/www/thokan-updates/stable/latest.json
- /var/www/thokan-updates/stable/thokan-update-1.0.0.tar.gz
- /var/www/thokan-updates/beta/latest.json
- /var/www/thokan-updates/beta/thokan-update-1.1.0-beta.1.tar.gz

## 2. Nginx config

Gebruik het voorbeeldbestand:

- [docker/nginx/update-host.conf.example](../docker/nginx/update-host.conf.example)

Kopieer naar je Nginx sites-map (afhankelijk van distro):

- /etc/nginx/sites-available/updates.your-domain.com

En activeer:

- ln -s /etc/nginx/sites-available/updates.your-domain.com /etc/nginx/sites-enabled/
- nginx -t
- systemctl reload nginx

## 3. TLS certificaat

Gebruik certbot voor updates.your-domain.com en zet paden correct in de Nginx config.

## 4. Stable en Beta source URLs

Gebruik in ThoKan Settings de URL's:

- Stable: https://updates.your-domain.com/stable/latest.json
- Beta: https://updates.your-domain.com/beta/latest.json

## 5. Manifest voorbeeld

Gebruik de templates in:

- [scripts/update_templates/update-manifest.stable.json](../scripts/update_templates/update-manifest.stable.json)
- [scripts/update_templates/update-manifest.beta.json](../scripts/update_templates/update-manifest.beta.json)

De field package_url moet verwijzen naar het echte update-archief.

## 6. Publiceren van nieuwe release

1. Upload nieuw package-bestand naar stable of beta map.
2. Pas latest.json van dat kanaal aan met nieuwe version en package_url.
3. In ThoKan klik je op Fetch latest en daarna Apply update.

### Sneller publiceren met script

Gebruik [scripts/publish_update.py](../scripts/publish_update.py) om package + `latest.json` in één stap te publiceren.

Voorbeeld stable:

```bash
python3 scripts/publish_update.py \
	--channel stable \
	--version 1.0.0 \
	--package /tmp/thokan-update-1.0.0.tar.gz \
	--root /var/www/thokan-updates \
	--base-url https://updates.your-domain.com \
	--notes "Production release"
```

Voorbeeld beta:

```bash
python3 scripts/publish_update.py \
	--channel beta \
	--version 1.1.0-beta.1 \
	--package /tmp/thokan-update-1.1.0-beta.1.tar.gz \
	--root /var/www/thokan-updates \
	--base-url https://updates.your-domain.com \
	--notes "Beta test release"
```

### Publiceren + online verificatie in één stap

Gebruik [scripts/publish_and_verify_update.py](../scripts/publish_and_verify_update.py) om direct na publicatie te controleren dat:

- `latest.json` publiek leesbaar is
- `package_url` in het manifest overeenkomt met de versie
- package URL bereikbaar is

Voorbeeld:

```bash
python3 scripts/publish_and_verify_update.py \
	--channel beta \
	--version 1.1.0-beta.1 \
	--package /tmp/thokan-update-1.1.0-beta.1.tar.gz \
	--root /var/www/thokan-updates \
	--base-url https://updates.your-domain.com \
	--notes "Beta test release"
```

Als je host `HEAD` requests blokkeert, gebruik:

```bash
python3 scripts/publish_and_verify_update.py ... --skip-head
```

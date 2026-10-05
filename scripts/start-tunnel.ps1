# Arranca (o reinicia) el túnel de Cloudflare exclusivo de PubliVende: publivende.gafcore.com -> Kong local :57321.
# Usa el túnel "gafcore-publivende" con credenciales en %USERPROFILE%\.cloudflared\tunnels\publivende\
# (config.yml + credentials.json). Uso: powershell -File scripts/start-tunnel.ps1
$ErrorActionPreference = "Stop"
$dir = Join-Path $env:USERPROFILE ".cloudflared\tunnels\publivende"
foreach ($f in "config.yml", "credentials.json") {
  if (-not (Test-Path (Join-Path $dir $f))) { throw "Falta $f en $dir (crea el túnel con cloudflared tunnel create gafcore-publivende)" }
}

$name = "cloudflared_publivende"
if (docker ps --filter "name=^$name$" --filter "status=running" --format "{{.Names}}") {
  docker restart $name | Out-Null
} else {
  if (docker ps -a --filter "name=^$name$" --format "{{.Names}}") { docker rm -f $name | Out-Null }
  docker run -d --name $name --restart unless-stopped --memory 64m -v "${dir}:/etc/cloudflared:ro" `
    cloudflare/cloudflared:latest tunnel --config /etc/cloudflared/config.yml run | Out-Null
}

Start-Sleep -Seconds 8
docker logs $name --tail 5

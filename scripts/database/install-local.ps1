$ErrorActionPreference = 'Stop'
$taskRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$runtimeRoot = Join-Path $taskRoot '.runtime'
$archive = Join-Path $runtimeRoot 'postgresql-17.11-1-windows-x64-binaries.zip'
$destination = Join-Path $runtimeRoot 'postgresql-17.11'
$expected = '6EABDF00D2893713B75DB4336A23C3FDF505F056E217EC6E2E95D901750CFEA3'
if (Test-Path -LiteralPath (Join-Path $destination 'pgsql/bin/pg_ctl.exe')) {
    Write-Output 'PostgreSQL portable ya está disponible en esta carpeta.'
    exit 0
}
New-Item -ItemType Directory -Force -Path $runtimeRoot | Out-Null
if (-not (Test-Path -LiteralPath $archive)) {
    Invoke-WebRequest -Uri 'https://get.enterprisedb.com/postgresql/postgresql-17.11-1-windows-x64-binaries.zip' -OutFile $archive
}
if ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash -ne $expected) {
    throw 'El archivo descargado no corresponde al paquete probado. No se ejecutará ni expandirá.'
}
Expand-Archive -LiteralPath $archive -DestinationPath $destination -Force
Write-Output 'PostgreSQL portable preparado; no se instaló un servicio de Windows.'

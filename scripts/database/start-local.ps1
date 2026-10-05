$ErrorActionPreference = 'Stop'
$taskRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$runtimeRoot = Join-Path $taskRoot '.runtime'
$binaryRoot = Join-Path $runtimeRoot 'postgresql-17.11/pgsql/bin'
$dataRoot = Join-Path $runtimeRoot 'pgdata'
$control = Join-Path $binaryRoot 'pg_ctl.exe'
if (-not (Test-Path -LiteralPath $control)) {
    throw 'Faltan binarios PostgreSQL 17.11. Consulta docs/runbooks/local-development.md.'
}
New-Item -ItemType Directory -Force -Path $runtimeRoot | Out-Null
if (-not (Test-Path -LiteralPath (Join-Path $dataRoot 'PG_VERSION'))) {
    $passwordFile = Join-Path $runtimeRoot 'pg-password.txt'
    [IO.File]::WriteAllText($passwordFile, 'qatu_lab_local_only')
    & (Join-Path $binaryRoot 'initdb.exe') -D $dataRoot -U qatu_lab --auth=scram-sha-256 "--pwfile=$passwordFile" --encoding=UTF8 --locale=C
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo inicializar base local.' }
    Remove-Item -LiteralPath $passwordFile
}
& $control status -D $dataRoot *> $null
if ($LASTEXITCODE -ne 0) {
    & $control start -D $dataRoot -l (Join-Path $runtimeRoot 'postgres.log') -o '-h 127.0.0.1 -p 55432' -w
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo iniciar PostgreSQL local en 127.0.0.1:55432.' }
}
$env:PGPASSWORD = 'qatu_lab_local_only'
try {
    $exists = & (Join-Path $binaryRoot 'psql.exe') -h 127.0.0.1 -p 55432 -U qatu_lab -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = 'qatupos_lab'"
    if ($exists -ne '1') {
        & (Join-Path $binaryRoot 'createdb.exe') -h 127.0.0.1 -p 55432 -U qatu_lab qatupos_lab
        if ($LASTEXITCODE -ne 0) { throw 'No se pudo crear qatupos_lab.' }
    }
} finally { Remove-Item Env:PGPASSWORD }
Write-Output 'PostgreSQL de laboratorio disponible en loopback:55432, database qatupos_lab.'

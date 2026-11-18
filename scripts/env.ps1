# Session-only environment for this project. Usage: . .\scripts\env.ps1
# Prepends the project's portable Node to PATH for the current shell only.
# Nothing is written to the system or user PATH.
$projectRoot = Split-Path -Parent $PSScriptRoot
$nodeDir = Join-Path $projectRoot '.tools\node'
if (-not (Test-Path (Join-Path $nodeDir 'node.exe'))) {
    throw "Portable Node not found in $nodeDir. See Task 0 of the plan."
}
$env:Path = "$nodeDir;" + $env:Path
# Shells opened before Git was installed don't see it yet; pick up the system install for this session only.
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    $sysGit = Join-Path $env:ProgramFiles 'Git\cmd'
    if (Test-Path (Join-Path $sysGit 'git.exe')) { $env:Path = "$sysGit;" + $env:Path }
}
# Keep npm's cache and global prefix inside the project too, in case npm is ever invoked.
$env:npm_config_cache = Join-Path $projectRoot '.tools\npm-cache'
$env:npm_config_prefix = Join-Path $projectRoot '.tools\npm-prefix'
Write-Host "node $(node --version) | $(git --version)"

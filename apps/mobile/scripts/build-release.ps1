param([Parameter(Mandatory=$true)][string]$SigningProperties)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '../../../scripts/android-env.ps1')
$taskSigningPath = (Resolve-Path -LiteralPath $SigningProperties).Path
$env:TRUCAZO_SIGNING_PROPERTIES = $taskSigningPath
$env:MOBILE_RELEASE = '1'
$env:MOBILE_API_ORIGIN = 'https://www.trucazo.com.ar'
try {
    Push-Location (Join-Path $PSScriptRoot '..')
    try {
        & npm run sync
        if ($LASTEXITCODE -ne 0) { throw 'Falló la preparación de los recursos locales.' }
        & gradle -p android assembleRelease bundleRelease --no-daemon --console=plain
        if ($LASTEXITCODE -ne 0) { throw 'Falló la construcción firmada.' }
    } finally { Pop-Location }
} finally {
    Remove-Item Env:TRUCAZO_SIGNING_PROPERTIES, Env:MOBILE_RELEASE, Env:MOBILE_API_ORIGIN -ErrorAction SilentlyContinue
}

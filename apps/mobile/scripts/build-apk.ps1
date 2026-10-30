$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '../../../scripts/android-env.ps1')
& gradle -p (Join-Path $PSScriptRoot '../android') assembleDebug --no-daemon --console=plain
if ($LASTEXITCODE -ne 0) { throw 'Falló la construcción del APK debug.' }
Write-Output 'APK: apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk'

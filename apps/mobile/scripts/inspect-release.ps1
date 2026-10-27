param(
    [string]$Apk = 'apps/mobile/android/app/build/outputs/apk/release/app-release.apk',
    [string]$Aab = 'apps/mobile/android/app/build/outputs/bundle/release/app-release.aab',
    [Parameter(Mandatory=$true)][string]$Package,
    [Parameter(Mandatory=$true)][string]$CertificateSha256
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '../../../scripts/android-env.ps1')
Add-Type -AssemblyName System.IO.Compression.FileSystem
$taskTools = Join-Path $env:ANDROID_SDK_ROOT 'build-tools/35.0.0'
$taskApk = (Resolve-Path -LiteralPath $Apk).Path
$taskAab = (Resolve-Path -LiteralPath $Aab).Path
$taskBadging = @(& (Join-Path $taskTools 'aapt.exe') dump badging $taskApk)
if ($LASTEXITCODE -ne 0 -or -not ($taskBadging -match "^package: name='$([regex]::Escape($Package))'")) { throw 'Paquete inesperado.' }
if ($taskBadging -match '^application-debuggable') { throw 'El candidato permite debug.' }
$taskCert = @(& java -jar (Join-Path $taskTools 'lib/apksigner.jar') verify --print-certs $taskApk)
if ($LASTEXITCODE -ne 0 -or -not (($taskCert | Out-String).ToLower().Contains($CertificateSha256.Replace(':','').ToLower()))) { throw 'Firma APK incorrecta.' }
& jarsigner -verify $taskAab *> $null
if ($LASTEXITCODE -ne 0) { throw 'El AAB no tiene una firma válida.' }
$taskAabCert = @(& keytool -printcert -jarfile $taskAab)
if (-not (($taskAabCert | Out-String).Replace(':','').ToLower().Contains($CertificateSha256.Replace(':','').ToLower()))) { throw 'La firma del AAB no coincide con el APK.' }
& (Join-Path $taskTools 'zipalign.exe') -c -P 16 4 $taskApk
if ($LASTEXITCODE -ne 0) { throw 'El APK no está alineado a 16 KB.' }
$taskCache = Join-Path $env:GRADLE_USER_HOME 'caches/modules-2/files-2.1'
$taskBundletool = Get-ChildItem (Join-Path $taskCache 'com.android.tools.build/bundletool/1.18.1') -Recurse -Filter '*.jar' | Select-Object -First 1
$taskProtobuf = Get-ChildItem (Join-Path $taskCache 'com.google.protobuf/protobuf-java/3.25.5') -Recurse -Filter '*.jar' | Select-Object -First 1
$taskBundleAlignment = & java -cp ($taskBundletool.FullName + [IO.Path]::PathSeparator + $taskProtobuf.FullName) (Join-Path $PSScriptRoot 'InspectBundle.java') $taskAab
if ($LASTEXITCODE -ne 0 -or $taskBundleAlignment -ne 'PAGE_ALIGNMENT_16K') { throw 'El AAB no solicita alineación 16 KB.' }
$taskManifest = @(& (Join-Path $taskTools 'aapt.exe') dump xmltree $taskApk AndroidManifest.xml) | Out-String
if ($taskManifest -match 'android:usesCleartextTraffic[^\n]*0xffffffff|android:debuggable[^\n]*0xffffffff|debug_network_security') { throw 'Configuración de red/debug de pruebas en release.' }
$taskSecrets = @()
foreach ($taskLine in Get-Content -LiteralPath '.env.local') {
    if ($taskLine -match '^([A-Z0-9_]*(?:SERVICE_ROLE|SECRET|PRIVATE|PASSWORD)[A-Z0-9_]*)=(.+)$') {
        $taskValue = $Matches[2].Trim().Trim('"').Trim("'")
        if ($taskValue.Length -ge 20) { $taskSecrets += $taskValue }
    }
}
$taskLibraries = @(); $taskScanned = 0
foreach ($taskArchivePath in @($taskApk, $taskAab)) {
    $taskZip = [IO.Compression.ZipFile]::OpenRead($taskArchivePath)
    try {
        foreach ($taskEntry in $taskZip.Entries) {
            if ($taskEntry.FullName -notmatch '(^|/)(assets/|lib/|dex/|classes\d*\.dex$)|\.(jks|keystore|properties|pem)$') { continue }
            $taskMemory = New-Object IO.MemoryStream
            $taskStream = $taskEntry.Open()
            try { $taskStream.CopyTo($taskMemory); $taskBytes = $taskMemory.ToArray() } finally { $taskStream.Dispose(); $taskMemory.Dispose() }
            $taskText = [Text.Encoding]::UTF8.GetString($taskBytes); $taskScanned++
            if ($taskText -match '-----BEGIN (RSA |EC )?PRIVATE KEY-----|sb_secret_[A-Za-z0-9_-]{20,}' -or ($taskSecrets | Where-Object { $taskText.Contains($_) })) { throw "Credencial privada en $($taskEntry.FullName)" }
            if ($taskEntry.FullName -match '/public/app.js$') {
                if ($taskText.Contains('http://localhost:3000') -or -not $taskText.Contains('https://www.trucazo.com.ar')) { throw 'API release incorrecta.' }
            }
            if ($taskEntry.FullName -match '/capacitor.config.json$') {
                $taskConfig = $taskText | ConvertFrom-Json
                if ($taskConfig.loggingBehavior -ne 'none' -or $taskConfig.server.url -or $taskConfig.server.allowNavigation -or $taskConfig.android.webContentsDebuggingEnabled) { throw 'WebView remoto o diagnóstico habilitado.' }
            }
            if ($taskEntry.FullName -match '/public/build-info.json$') {
                $taskBuildInfo = $taskText | ConvertFrom-Json
                if (-not $taskBuildInfo.release -or $taskBuildInfo.apiOrigin -ne 'https://www.trucazo.com.ar') { throw 'Recursos sin marca release o API incorrecta.' }
                $taskAppEntry = $taskZip.GetEntry(($taskEntry.FullName -replace 'build-info.json$', 'app.js'))
                $taskAppStream = $taskAppEntry.Open()
                try { $taskBundleHash = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($taskAppStream)).ToLower() } finally { $taskAppStream.Dispose() }
                if ($taskBundleHash -ne $taskBuildInfo.bundleSha256) { throw 'Programa distinto del inventario de construcción.' }
            }
            if ($taskEntry.FullName -match '\.so$') {
                if ($taskBytes[4] -ne 2) { $taskLibraries += @{file=$taskEntry.FullName; elf=32}; continue }
                $taskOffset = [BitConverter]::ToUInt64($taskBytes,32)
                $taskSize = [BitConverter]::ToUInt16($taskBytes,54)
                $taskCount = [BitConverter]::ToUInt16($taskBytes,56)
                $taskAlignments = @()
                for ($taskIndex=0; $taskIndex -lt $taskCount; $taskIndex++) {
                    $taskPosition = [int]($taskOffset + $taskIndex * $taskSize)
                    if ([BitConverter]::ToUInt32($taskBytes,$taskPosition) -eq 1) {
                        $taskAlignment = [BitConverter]::ToUInt64($taskBytes,$taskPosition+48)
                        if ($taskAlignment -lt 16384) { throw "ELF64 sin alineación 16KB: $($taskEntry.FullName)" }
                        $taskAlignments += $taskAlignment
                    }
                }
                $taskLibraries += @{file=$taskEntry.FullName; elf=64; loadAlignments=$taskAlignments}
            }
        }
    } finally { $taskZip.Dispose() }
}
$taskReport = [ordered]@{
    checkedAt=[DateTime]::UtcNow.ToString('o'); package=$Package
    apk=@{path=$Apk; sha256=(Get-FileHash -LiteralPath $taskApk).Hash.ToLower(); bytes=(Get-Item -LiteralPath $taskApk).Length}
    aab=@{path=$Aab; sha256=(Get-FileHash -LiteralPath $taskAab).Hash.ToLower(); bytes=(Get-Item -LiteralPath $taskAab).Length}
    certificateSha256=$CertificateSha256; badging=@($taskBadging | Where-Object { $_ -match '^package:|^sdkVersion:|^targetSdkVersion:|^uses-permission|^native-code:' })
    nativeLibraries=$taskLibraries; alignment16KB=$true; bundleAlignment=$taskBundleAlignment; scannedEntries=$taskScanned; privateCredentialMatches=0; debuggable=$false; apiOrigin='https://www.trucazo.com.ar'
}
$taskReport | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath 'android/generated/android-16-release-inventory.json' -Encoding utf8
$taskReport | ConvertTo-Json -Depth 8

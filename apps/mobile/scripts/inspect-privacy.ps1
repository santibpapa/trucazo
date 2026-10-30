param([string]$Apk = 'apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk')
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '../../../scripts/android-env.ps1')
Add-Type -AssemblyName System.IO.Compression.FileSystem
$taskApkPath = (Resolve-Path -LiteralPath $Apk).Path
$taskTools = Join-Path $env:ANDROID_SDK_ROOT 'build-tools/35.0.0'
$taskBadging = @(& (Join-Path $taskTools 'aapt.exe') dump badging $taskApkPath)
$taskCert = @(& (Join-Path $env:JAVA_HOME 'bin/java.exe') -jar (Join-Path $taskTools 'lib/apksigner.jar') verify --print-certs $taskApkPath)
$taskSecrets = @()
foreach ($taskLine in Get-Content -LiteralPath '.env.local') {
    if ($taskLine -match '^([A-Z0-9_]*(?:SERVICE_ROLE|SECRET|PRIVATE|PASSWORD|SMTP_PASS)[A-Z0-9_]*)=(.+)$') {
        $taskValue = $Matches[2].Trim().Trim('"').Trim("'")
        if ($taskValue.Length -ge 20) { $taskSecrets += $taskValue }
    }
}
$taskZip = [IO.Compression.ZipFile]::OpenRead($taskApkPath)
try {
    $taskLeaks = @(); $taskScanned = 0; $taskLocalApi = $false
    foreach ($taskEntry in $taskZip.Entries) {
        if ($taskEntry.FullName -notmatch '^(assets/|classes\d*\.dex$|res/raw/)') { continue }
        $taskStream = $taskEntry.Open(); $taskMemory = New-Object IO.MemoryStream
        try { $taskStream.CopyTo($taskMemory); $taskText = [Text.Encoding]::UTF8.GetString($taskMemory.ToArray()) }
        finally { $taskMemory.Dispose(); $taskStream.Dispose() }
        $taskScanned++
        if ($taskEntry.FullName -eq 'assets/public/app.js') { $taskLocalApi = $taskText.Contains('http://localhost:3000') }
        if ($taskText -match '-----BEGIN (RSA |EC )?PRIVATE KEY-----|sb_secret_[A-Za-z0-9_-]{20,}' -or ($taskSecrets | Where-Object { $taskText.Contains($_) })) {
            $taskLeaks += $taskEntry.FullName
        }
    }
    if ($taskLeaks.Count) { throw "Se detectó una posible credencial privada en: $($taskLeaks -join ', ')" }
    if (-not $taskLocalApi) { throw 'El APK QA de ANDROID-15 no contiene el servidor localhost:3000 esperado. Compilar con MOBILE_API_ORIGIN explícito.' }
    $taskConfigEntry = $taskZip.GetEntry('assets/capacitor.config.json')
    $taskReader = New-Object IO.StreamReader($taskConfigEntry.Open())
    try { $taskConfig = $taskReader.ReadToEnd() | ConvertFrom-Json } finally { $taskReader.Dispose() }
    if ($taskConfig.loggingBehavior -ne 'none') { throw 'El APK conserva el registro detallado del puente nativo.' }
    $taskLibraries = @($taskZip.Entries | Where-Object { $_.FullName -like 'lib/*' } | ForEach-Object FullName)
    $taskManifest = [xml](Get-Content -LiteralPath 'apps/mobile/android/app/build/intermediates/merged_manifests/debug/processDebugManifest/AndroidManifest.xml' -Raw)
    $taskExported = @($taskManifest.manifest.application.ChildNodes | Where-Object { $_ -is [System.Xml.XmlElement] -and $_.GetAttribute('exported','http://schemas.android.com/apk/res/android') -eq 'true' } | ForEach-Object {
        @{ type=$_.LocalName; name=$_.GetAttribute('name','http://schemas.android.com/apk/res/android'); permission=$_.GetAttribute('permission','http://schemas.android.com/apk/res/android') }
    })
    $taskReport = [ordered]@{
        checkedAt=[DateTime]::UtcNow.ToString('o'); apk=$Apk; sha256=(Get-FileHash -LiteralPath $taskApkPath -Algorithm SHA256).Hash.ToLower()
        package=@($taskBadging | Where-Object { $_ -match '^package:|^sdkVersion:|^targetSdkVersion:' })
        permissions=@($taskBadging | Where-Object { $_ -match '^uses-permission' })
        certificate=@($taskCert | Where-Object { $_ -match 'certificate SHA-256 digest:' })
        exported=$taskExported; nativeLibraries=$taskLibraries; scannedEntries=$taskScanned; privateCredentialMatches=0
        remoteWebViewUrl=$taskConfig.server.url; allowNavigation=$taskConfig.server.allowNavigation
        sdkLoggingBehavior=$taskConfig.loggingBehavior
        qaApiOrigin='http://localhost:3000'
        licenseNoticeIncluded=($null -ne $taskZip.GetEntry('assets/public/third-party-notices.txt'))
        backupDisabled=($taskManifest.manifest.application.GetAttribute('allowBackup','http://schemas.android.com/apk/res/android') -eq 'false')
        debuggable=($taskManifest.manifest.application.GetAttribute('debuggable','http://schemas.android.com/apk/res/android') -eq 'true')
        networkSecurityConfig=$taskManifest.manifest.application.GetAttribute('networkSecurityConfig','http://schemas.android.com/apk/res/android')
        note='APK debug con API localhost para QA. HTTPS final y WebView sin debug se verifican en ANDROID-16.'
    }
    $taskReport | ConvertTo-Json -Depth 7 | Set-Content -LiteralPath 'android/generated/android-15-apk-inventory.json' -Encoding utf8
    $taskReport | ConvertTo-Json -Depth 7
} finally { $taskZip.Dispose() }

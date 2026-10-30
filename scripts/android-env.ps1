# Entorno Capacitor de esta PC; sólo cambia la sesión actual de PowerShell.
$taskMobileProject = Split-Path $PSScriptRoot
$taskMobileTools = Join-Path $taskMobileProject 'android/generated/environment'
$taskMobileBase = Join-Path (Split-Path $taskMobileProject) 'trucazo-entorno/entorno-trucazo.ps1'
$taskMobileJava = Join-Path $taskMobileTools 'jdk-21.0.12.1+1'
$taskMobileGradle = Join-Path $taskMobileTools 'gradle-8.14.3/bin'
$taskMobileNode = Join-Path $taskMobileTools 'node-v24.22.1-win-x64'

foreach ($taskMobileRequired in @($taskMobileBase, (Join-Path $taskMobileJava 'bin/javac.exe'), (Join-Path $taskMobileGradle 'gradle.bat'))) {
    if (-not (Test-Path -LiteralPath $taskMobileRequired)) {
        throw "Falta una herramienta de ANDROID-01: $taskMobileRequired. Consultar el traspaso en README.md."
    }
}

. $taskMobileBase
$env:JAVA_HOME = $taskMobileJava
$env:GRADLE_USER_HOME = Join-Path $taskMobileTools 'gradle-cache'
$env:PATH = (Join-Path $taskMobileJava 'bin') + ';' + $taskMobileGradle + ';' + $env:PATH
if (Test-Path -LiteralPath (Join-Path $taskMobileNode 'node.exe')) { $env:PATH = $taskMobileNode + ';' + $env:PATH }

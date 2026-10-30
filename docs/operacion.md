# Operación — soporte, cuentas, correos, publicación e incidentes

[Volver al README](../README.md) · Documento principal de operación. Organización actualizada el **13/10/2026**. Las comprobaciones y entregas conservan sus fechas; la reorganización documental no modificó producción.

## Estado actual

- **Producción web = `master` otra vez, 30/10:** del 27 al 30/10 Vercel publicó desde la rama Android (`575bedc`, después `8e90f9d`). El [PR #147](https://github.com/santibpapa/trucazo/pull/147) integra esa rama a `master`. Nunca volver a publicar producción desde otra rama: ver [AGENTS.md](../AGENTS.md).
- **Controles discretos publicados,27/10:** web en `8e90f9d`, tres puntos en chats/mesas, opciones utilizables dentro de la ventana del chat y serviciosAndroid conservados. [Registro de publicación](#controles-discretos-2026-10-27).

- **Aviso de seguridad de Node, 21/10:** repo actualizado mediante PR #141, pruebas aprobadas con Node 24.22.1 y publicación final correcta. **El servidor público sigue ejecutando 24.21.0**, comprobado a las 11:57 de Argentina; el parche nativo queda pendiente de Vercel. Ver [evidencia y siguiente paso](#node-seguridad-2026-10-21).
- **Dependabot, tanda cerrada el 19/10:** los cinco PR #121 → #107 → #65 → #135 → #63 incorporados con pruebas nuevas aprobadas. Revisión final de `master` y publicación aprobadas; cero PR abiertos al cierre. Ver [evaluación y registro de incorporación](#dependabot-2026-10-19).
- **Correcciones de reseñas del 14/10:** PR #127 incorporado, con recuperación de reparto/turno y declaración de envido, más lectura privada de capturas. Consultar [la entrega posterior](#correcciones-resenas-2026-10-14) antes de interpretar los pendientes del incidente original.
- **Incidente del 13/10:** correcciones incorporadas mediante PR #120; SQL de ranking aplicado y recepción de presencia comprobados en producción. No se encontraron nuevos errores de ese borrado en las casi tres horas posteriores a la incorporación del PR. Queda la aceptación de partidas reales; ver [actualización posterior](#correccion-cierres-presencia). La [investigación inicial](#incidente-resenas-2026-10-13) se conserva como historial.
- **Consumo de registros de Supabase, 13/10:** revisión terminada. Las solicitudes de la web dominan el volumen en las dos ventanas consultadas; reducir consultas repetidas es el principal camino de optimización. La revisión no modificó producción. Ver [evidencia y traspaso](#log-ingestion-2026-10-13).
- Eliminación de cuenta integrada mediante PR #101. Pendientes registrados: regresión Android y comprobación del soporte; no rehacer la entrega ni repetir migraciones.
- Novedades: sistema de campañas, tandas y bajas documentado. No hay autorización nueva para enviar mensajes.
- Ciclo de retorno: código documentado como implementado; el registro de publicación original debe contrastarse con evidencia posterior antes de aplicar SQL o publicar.
- SEO y páginas públicas: registro hasta el 24/08/2026. No se volvió a consultar Search Console ni a medir resultados durante esta reorganización.

## Próximo paso y cómo retomar

Para completar la aceptación de las partidas, leer primero [la verificación posterior al PR #120](#correccion-cierres-presencia): SQL de ranking y recepción de presencia ya comprobados; falta verificar una victoria que cambie el podio y una partida activa de más de 15 minutos. No repetir la migración ni tratar los errores previos como una falla vigente. La investigación no autoriza compensaciones ni cambios retroactivos de resultados. El punto de continuidad de la app está en el [estado actual de Android](android.md#android-estado-actual).

## Guía de lectura

- [Revisión del aviso de seguridad de Node, 21/10](#node-seguridad-2026-10-21).
- [Revisión de PR de Dependabot y orden de incorporación, 19/10](#dependabot-2026-10-19).
- [Incidente: victorias bloqueadas y falsas ausencias](#incidente-resenas-2026-10-13).
- [Consumo de registros de Supabase](#log-ingestion-2026-10-13).
- [Eliminación de cuenta, reintentos y soporte](#eliminacion-cuenta).
- [Correos de novedades](#correos-novedades); avisos propios de torneos en [su contrato](juego.md#contrato-torneos).
- [Publicación del ciclo de retorno](#ciclo-despliegue).
- [SEO y páginas públicas](#seguimiento-seo).
- Para las recetas SQL y pruebas, leer [Backend](backend.md); para publicar la app, [Android](android.md).

Actualizar aquí incidentes, soporte, pasos de panel, publicación y evidencia operativa. Las rutas de código/SQL parten de la raíz del repositorio. Registrar por separado lo preparado y lo aplicado; conservar fechas y no convertir notas históricas en autorización para actuar sobre cuentas o contactar personas.

<a id="node-seguridad-2026-10-21"></a>

## Revisión del aviso de seguridad de Node — 21/10/2026

**Alcance de la revisión inicial:** inspección de GitHub y Vercel, sin modificar código remoto, configuración, publicaciones ni SQL. Base revisada: `master` en `0d5cf4a7d96bd7eaadf6f999c441c70cf8897416`, distinta del checkout local con trabajo Android pendiente. La actualización posterior autorizada por el dueño se registra más abajo.

El [aviso oficial de Node](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases) confirma fallas graves de DNS, validación del nombre del servidor en TLS y descompresión Brotli. Los parches publicados son **22.23.4, 24.22.1 y 26.12.1**. El identificador correcto de Brotli es **CVE-2026-111497**; la captura omite un `1`. Las ramas sin soporte deben migrar.

### Evidencia comprobada

- **Web pública:** proyecto Vercel `trucazo`, Node **24.x** seleccionado. La publicación `dpl_AzQTzxEvx73ewS1junDKaGZnJxPz` está lista, corresponde al mismo commit de GitHub y sirve los dominios públicos desde `gru1`. Se publicó el 20/10, antes del aviso. La API consultada sólo informa la rama mayor y los registros de compilación devueltos no muestran `process.version`; la búsqueda de `node` en los últimos 30 minutos de registros de ejecución no devolvió resultados. **Parche de producción sin confirmar**: esa búsqueda no demuestra seguridad ni ausencia de ataques.
- **GitHub Actions:** siguen en Node **20** [`ci.yml:35`](https://github.com/santibpapa/trucazo/blob/0d5cf4a7d96bd7eaadf6f999c441c70cf8897416/.github/workflows/ci.yml#L35), [`android.yml:27`](https://github.com/santibpapa/trucazo/blob/0d5cf4a7d96bd7eaadf6f999c441c70cf8897416/.github/workflows/android.yml#L27), [`pwa.yml:37`](https://github.com/santibpapa/trucazo/blob/0d5cf4a7d96bd7eaadf6f999c441c70cf8897416/.github/workflows/pwa.yml#L37) y [`seo.yml:44`](https://github.com/santibpapa/trucazo/blob/0d5cf4a7d96bd7eaadf6f999c441c70cf8897416/.github/workflows/seo.yml#L44). Invitaciones, vidas y preview 2vs2 seleccionan **24**, sin `check-latest`; no se verificó su parche efectivo. La documentación de [`setup-node`](https://github.com/actions/setup-node#usage) confirma que `check-latest` viene desactivado y permite pedir la última versión compatible con la rama indicada.
- **Repositorio:** `package.json` no declara `engines.node`; no hay `.nvmrc`, `.node-version` ni archivos de Docker en el árbol remoto inspeccionado. `@types/node: ^20` describe tipos de TypeScript y no determina la versión que ejecuta la aplicación.
- **Entorno de este chat:** `node -v` devuelve **24.19.0**, pero el ejecutable pertenece al runtime incluido con Codex (`.cache/codex-runtimes/...`), no al despliegue de Trucazo. No se modificó esa instalación.

### Plan surgido de la revisión inicial

Preparar mantenimiento separado sobre el `master` remoto: alinear las cuatro automatizaciones antiguas con Node 24, solicitar el último parche en las siete y comprobar en sus registros **24.22.1 o posterior de la rama 24**. Declarar la rama 24 en `engines.node` para hacer explícita la configuración del repo. Validar las tareas afectadas antes de incorporar cambios.

Vercel [administra automáticamente los parches](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions), pero seleccionar `24.x` no demuestra que el parche de hoy ya se aplique a la función publicada. Obtener la versión efectiva mediante `process.version` y comprobar el parche; cualquier publicación necesaria se coordina dentro del mantenimiento, conservando el trabajo local Android. No tratar esta revisión como una corrección aplicada ni como una investigación de intrusión.

### Actualización autorizada por el dueño — 21/10/2026

El dueño pidió actualizarlo. [PR #141](https://github.com/santibpapa/trucazo/pull/141) incorporado en `master` mediante `38002ae429d2a94ff39ed01dc60ab326b0dd6e08`, tras revisar la diferencia completa y esperar las pruebas del extremo `c7cffaae9a0a306b98a53aa8769e041eec488ca7`.

- Las siete automatizaciones seleccionan `>=24.22.1 <25` con `check-latest: true`. La tarea de base de datos también configura Node explícitamente para sus simulaciones; antes dependía del ejecutable incluido en el runner.
- `package.json` y el registro raíz del lockfile declaran ese mismo requisito. Todas las versiones resueltas de dependencias permanecen iguales. El README remoto actualiza el requisito y el layout de servidor registra `process.version` una vez al cargar el módulo, sin exponerlo en la pantalla ni agregar una ruta pública.
- Aprobadas la [revisión de aplicación y base](https://github.com/santibpapa/trucazo/actions/runs/39618893757), [PWA](https://github.com/santibpapa/trucazo/actions/runs/39618893761), [APK/AAB del prototipo](https://github.com/santibpapa/trucazo/actions/runs/39618893744), [invitaciones](https://github.com/santibpapa/trucazo/actions/runs/39618893756) y [vidas de Historia](https://github.com/santibpapa/trucazo/actions/runs/39618893709). Los registros de instalación confirman Node 24.22.1. Preview temporal 2vs2 omitido por su condición preexistente de rama; SEO no se disparó porque publica un informe y avisos.
- Vercel: [primera prueba](https://vercel.com/trucazo/trucazo/CLvArkwnhgYW96W5bRF8C71qgEvH) y [segunda compilación nueva](https://vercel.com/trucazo/trucazo/96UuV8ZxJcjhjC2LGecyY1oyJzts) aprobadas; ambas pertenecen al extremo probado. La compilación registra **24.22.1**, pero dos solicitudes reales `GET /login` respondieron 200 y registraron **24.21.0** en ejecución (11:44:42 y 11:51:41 de Argentina). La segunda publicación solicitó explícitamente `gru1` y no reutilizó la compilación anterior. Los metadatos del despliegue informan `gru1`; el registro de esas solicitudes informa `iad1`, por lo que tampoco debe usarse la etiqueta del despliegue como prueba aislada de la región de cada solicitud.

**Publicación final autorizada:** el control automático rechazó el primer intento de publicación manual por considerar que faltaba autorización explícita para producción. El dueño respondió «Sí, publicar la actualización» a la pregunta sobre el PR #141 en `www.trucazo.com.ar`. Tras esa confirmación se creó la [publicación de producción](https://vercel.com/trucazo/trucazo/DeUqSV4d22x3rauK6TLTjiXNzHXF), `dpl_DeUqSV4d22x3rauK6TLTjiXNzHXF`, desde el commit incorporado. Quedó `READY`, con los dominios públicos asignados, metadatos de región `gru1` y sin error de asignación. El árbol del merge coincide exactamente con el probado: `53281806164e4437347e22aeac4fd90d628b412f`.

La [revisión final de master](https://github.com/santibpapa/trucazo/actions/runs/39620713974) también terminó aprobada, con los trabajos de aplicación y base completos.

**Comprobación pública, 21/10 a las 11:57 de Argentina:** portada y acceso responden HTTP 200. La solicitud real a `www.trucazo.com.ar/login` registra `[runtime] Node.js v24.21.0` a las 11:57:12; las comprobaciones del propio despliegue también registran 24.21.0 para acceso y registro. La versión no aparece en el HTML. Se publicó la configuración actualizada, pero **no quedó aplicado el parche de ejecución del servidor**.

**Pendiente y traspaso:** el parche nativo lo administra Vercel; sólo permite seleccionar la rama mayor. El requisito de `engines` y el Node de compilación no lo fuerzan. Cuando Vercel actualice su runtime, volver a consultar la versión efectiva de producción y exigir 24.22.1 o posterior de la rama 24; publicar de nuevo sólo si resulta necesario. No repetir el PR #141 ni las pruebas del mismo árbol, migrar de proveedor o cambiar la arquitectura para eludir esa limitación. Esta sesión no creó un monitor programado ni contactó al soporte del proveedor.

El checkout local conserva su base y el trabajo de Android; esta entrega trabaja sobre GitHub remoto y este registro local. Al integrar Android más adelante, conservar el requisito de Node del PR #141. No se ejecutó SQL de producción ni se enviaron correos.

<a id="dependabot-2026-10-19"></a>

## Revisión de dependencias y GitHub Actions — 19/10/2026

**Evaluación inicial, antes de la autorización:** consulta de solo lectura a `santibpapa/trucazo`, con `master` remoto en `a6ddfc78870d51ae347888c40f37a732e0302fe0`. Se revisaron cambios, versiones resueltas, compatibilidad declarada, revisiones y ejecuciones de GitHub Actions y Vercel de los cinco PR automáticos. No se usó el árbol local modificado como sustituto del código remoto ni se ejecutaron pruebas locales. En esa evaluación no se incorporó ningún PR, publicó código, ejecutó SQL ni enviaron comentarios a GitHub.

La API directa de GitHub devolvió `mergeable: true` y `mergeable_state: clean` para los cinco. El resumen inicial del conector había devuelto `false` para #63, #65 y #121; prevalece la consulta directa posterior. Todos tienen Vercel aprobado y ninguna revisión humana registrada. Esto describe el estado consultado, no garantiza el resultado tras incorporar otro PR.

| Orden propuesto | PR y cambio | Evidencia y condición |
| --- | --- | --- |
| 1 | [#121](https://github.com/santibpapa/trucazo/pull/121): `actions/setup-java` 5 → 6 | Una línea en `android.yml`; conserva Temurin Java 17. [Prototipo Android](https://github.com/santibpapa/trucazo/actions/runs/38480859866) pasó realmente por `setup-java@v6`, compiló APK/AAB y subió los archivos. Revisión automática aprobada. Ejecución del 13/10: actualizar sobre `master` y repetir controles antes de incorporarlo. |
| 2 | [#107](https://github.com/santibpapa/trucazo/pull/107): herramientas | Playwright 1.62.1 → 1.64.1, PostCSS 8.5.28 → 8.5.30, sharp 0.35.4 → 0.35.5 y tsx 4.23.13 → 4.23.15. [Aplicación y base](https://github.com/santibpapa/trucazo/actions/runs/39298320364), [invitaciones](https://github.com/santibpapa/trucazo/actions/runs/39298320288) y [vidas de Historia](https://github.com/santibpapa/trucazo/actions/runs/39298320193) aprobadas el 19/10. Candidato de bajo riesgo con cobertura de navegador real. |
| 3 | [#65](https://github.com/santibpapa/trucazo/pull/65): `@supabase/ssr` 0.12.6 → 0.12.7 | Corrección puntual de valores por defecto de cookies; sólo cambia el paquete y su registro de versiones. [Aplicación y base](https://github.com/santibpapa/trucazo/actions/runs/38016457545) aprobadas el 10/10. Actualizar sobre `master` y exigir también las pruebas actuales de acceso/invitaciones; comprobar entrada, recarga y salida de sesión. |
| 4 | [#135](https://github.com/santibpapa/trucazo/pull/135): `@supabase/supabase-js` 2.115.0 → 2.118.0 | Actualiza también Auth, consultas, Realtime, archivos y funciones. Compatible con el requisito `^2.114.0` de SSR. [Aplicación y base](https://github.com/santibpapa/trucazo/actions/runs/39298258636), [invitaciones](https://github.com/santibpapa/trucazo/actions/runs/39298258899) y [vidas de Historia](https://github.com/santibpapa/trucazo/actions/runs/39298258862) aprobadas el 19/10. Incorporar separado y comprobar sesión y reconexión de mesa. |
| Pendiente de prueba específica | [#63](https://github.com/santibpapa/trucazo/pull/63): `supabase/setup-cli` 1 → 3 | Sólo cambia `preview-2vs2.yml`; mantiene CLI 2.117.0. V3 instala desde npm y elimina el parámetro `github-token`, que este flujo no usa. La [ejecución del PR](https://github.com/santibpapa/trucazo/actions/runs/34877676430) omitió el trabajo completo: exige la rama exacta `codex/2vs2`. No hay evidencia de que V3 se haya ejecutado aquí. Antes de incorporarlo, preparar una prueba acotada de instalación y arranque aislado que use V3. Las pruebas nuevas de invitaciones/vidas siguen en V1 y este PR no las actualiza. |

**Criterio para continuar:** incorporar uno por vez, actualizar el siguiente con `master` y esperar nuevamente los controles y la vista previa. El orden responde al alcance y a la facilidad para aislar problemas; no hay una dependencia obligatoria entre #65 y #135. #65, #107 y #135 comparten `package.json` y `package-lock.json`, por lo que sus comprobaciones individuales no prueban la combinación final. #134 es un PR de rendimiento ajeno a esta tanda; no se emitió dictamen sobre él.

**Observación previa a estos PR:** el CI general usa Node 20, mientras Supabase 2.115.0 ya declara Node >=22; 2.118.0 conserva ese requisito. Las pruebas completas de invitaciones y vidas usan Node 24. Conviene alinear el CI general en mantenimiento separado; #135 no introduce esa desalineación. `master` aparece sin protección ni reglas que obliguen a aprobar controles: el botón de merge por sí solo no prueba que el cambio esté validado.

### Incorporación autorizada por el dueño — 19/10/2026

Después de la evaluación inicial, el dueño pidió realizar la tanda. Se actualiza cada rama sobre el `master` vigente, se comprueba que sólo queden los cambios previstos y se espera una nueva ejecución antes de incorporar el PR. El trabajo remoto conserva el árbol local de Android y sus cambios pendientes.

- **#121 incorporado:** `b1c4b3af944724fec2a4f9f23e4cc6043846233d`. [Revisión automática nueva](https://github.com/santibpapa/trucazo/actions/runs/39349093243) y [APK/AAB nuevos](https://github.com/santibpapa/trucazo/actions/runs/39349093290) aprobados; publicación de Vercel aprobada.
- **#107 incorporado:** `e0c70833bfb96434725ae802f558fc790780b840`. [Revisión automática](https://github.com/santibpapa/trucazo/actions/runs/39349601417), [invitaciones](https://github.com/santibpapa/trucazo/actions/runs/39349601521) y [vidas de Historia](https://github.com/santibpapa/trucazo/actions/runs/39349601381) aprobadas sobre #121; publicación de Vercel aprobada.
- **#65 incorporado:** `0d80d61de02fbbc17d08866b8967d8aad275867f`. Rama comprobada en `9dd9b1d948d596aa432b7df29f6e2dd83bf0d3fc` sobre los dos merges anteriores; sólo cinco valores esperados de SSR entre los archivos de paquetes. [Revisión](https://github.com/santibpapa/trucazo/actions/runs/39350488041), [invitaciones](https://github.com/santibpapa/trucazo/actions/runs/39350488001) y [vidas](https://github.com/santibpapa/trucazo/actions/runs/39350488066) aprobadas; publicación de Vercel aprobada. La actualización normal del conector falló dos veces; se comprobó el mismo extremo y que el nuevo commit conserva el anterior como padre, y se actualizó con comprobación del extremo esperado. No se descartaron commits de la rama.
- **#135 incorporado:** `d11c115519f9790ee6b516e42d92e8f51a1f0844`. Rama comprobada en `b25e30a82d6462d619d8ce8191c3104d4bc9b0b7` sobre los tres merges. [Revisión](https://github.com/santibpapa/trucazo/actions/runs/39351099665), [invitaciones](https://github.com/santibpapa/trucazo/actions/runs/39351099859) y [vidas](https://github.com/santibpapa/trucazo/actions/runs/39351099673) aprobadas; publicación de Vercel aprobada. La comparación con `master` conserva el cambio previsto de SDK y sus cinco paquetes internos, con SSR 0.12.7 y las herramientas nuevas intactas.
- **#63 incorporado:** `83aed0e4eaad5166e283aa4a6816302db6d60cf1`. Rama comprobada en `1e838343739a1cfc98c20c55c8fcba351d1e4c5e` sobre los cuatro merges. Se amplió el mismo cambio de V1 a V3 a `table-invites.yml` y `campaign-lives.yml`, además de `preview-2vs2.yml`: tres líneas en tres archivos, conservando CLI 2.117.0 y Node 24. [Revisión](https://github.com/santibpapa/trucazo/actions/runs/39351797024), [invitaciones](https://github.com/santibpapa/trucazo/actions/runs/39351797001) y [vidas](https://github.com/santibpapa/trucazo/actions/runs/39351796958) aprobadas. En ambas pruebas actuales se ejecutó realmente `supabase/setup-cli@v3`, arrancó la copia de Auth/Postgres/Realtime y se completaron los recorridos de navegador. Descripción del PR actualizada con el alcance y la evidencia final; vista previa aprobada.

**Comprobación posterior, 19/10 a las 22:21 de Argentina:** GitHub confirma los cinco PR cerrados e incorporados, cero PR abiertos y `master` en `83aed0e4eaad5166e283aa4a6816302db6d60cf1`. El árbol completo `bd2af626d8b83f090ca0f60e0a94216b7e5d4317` coincide exactamente con el probado antes del último merge. [Revisión final de master](https://github.com/santibpapa/trucazo/actions/runs/39352424122) aprobada, con aplicación y base de datos completas; [publicación final de Vercel](https://vercel.com/trucazo/trucazo/CY5Xt7SBTbhkAGrAnmmeF9pttHD1) aprobada. Se comprobaron en el registro de paquetes remoto las seis versiones de dependencias previstas.

**Último traspaso de esta tanda:** mantenimiento terminado y verificado; cinco merges realizados, ninguna incorporación pendiente de esta tanda. No repetir los merges. La observación anterior sobre Node 20 queda como mantenimiento separado. La copia local permanece en la base `f873a36` con su trabajo de Android conservado; esta entrega actualizó GitHub remoto y este registro, sin cambiar la etapa Android vigente ni sincronizar el checkout local.

<a id="incidente-resenas-2026-10-13"></a>

### Investigación de reseñas: victorias bloqueadas y partidas anuladas — 13/10/2026

**Estado al cerrar la investigación inicial:** investigación terminada mediante consultas de solo lectura a producción (`uqhsyayfvhwlduioghtu`), cruce de reseñas, partidas, historial, analítica, registros de solicitudes y errores de Postgres, funciones y configuración vigentes. Se identificaron dos fallas independientes. No se modificaron partidas, saldos, estadísticas, funciones ni configuración de producción; no se enviaron correos ni se desplegó código. La corrección estaba pendiente en ese momento; prevalece la [verificación posterior al PR #120](#correccion-cierres-presencia).

<details open>
<summary>Ver evidencia, límites y próximo paso</summary>

#### Identificación y partidas relacionadas

Horarios de Argentina. La reseña no guarda `game_id`; los vínculos se establecieron por la cuenta autenticada, la secuencia de páginas y partidas y los errores de las solicitudes del mismo usuario. La referencia `?game=...` solo sirve para volver desde el formulario y no se persiste en `feedback`.

| Reseña | Cuenta y partida | Evidencia y resultado |
| --- | --- | --- |
| 13/10 15:28:16 — «Es la 4 vez que a punto de ganar se trunca el juego…» | **May**; `37c4b385-f79c-42fc-a371-397b001647d6`, contra ChinoOk, bot del lobby | Partida iniciada 15:16:02. Quedó con May **29–16**, objetivo 30. `bot_step` falló 15:23:09 y hubo 171 respuestas HTTP 400 de `timeout_mazo` hasta 15:27:21. `forfeit` sí confirmó a las 15:27:21: derrota por abandono con **−100 monedas**, manteniendo 29–16. Entrada a reseña 15:27:32. |
| 13/10 02:24:03 — «Una vez más a punto de ganar aparece un error…» | **May**; `16e78d38-c9dd-4402-a626-b133a91ebb1b`, contra Vicky_LP, bot del lobby | Inicio 02:13:51. May **29–27**, objetivo 30, Real Envido pendiente. `bot_step` falló 02:21:55 y 02:24:09; `timeout_mazo` devolvió 75 errores. Seguía consultando la partida a las 02:24:44. El barrido de ausencia la anuló 02:25:00, **sin ganador**, con devolución de apuesta según la función vigente; no existe derrota de esa partida en `game_history`. |
| 13/10 02:06:22 — «Tenía 33 y no me dejó enviar mis tantos…» | **May**; `41052fe8-932e-46e5-83e0-616f4eda0a5b`, contra Vicky_LP | `envido_say` falló **cinco veces**, 02:03:10–02:03:32, con el mismo error del ranking. `timeout_mazo` confirmó 02:03:39 y la partida continuó; finalizó 02:04:08 con derrota **19–30**, un vencimiento de tiempo y **−50 monedas**. Entró a reseña 02:04:18. El estado final corresponde a una mano posterior: **no conserva los 33 declarados ni permite certificar el marcador de la mano que falló**. |
| 07/10 18:17:56 — «Delete needs a Where clausule…» al ganar online | **ElRana**; `0225e3dc-e69d-40cb-b26a-bd8a640bbf91`, contra Rulo_Cordoba | Quedó **14–13** a favor de ElRana, objetivo 15, declarando Envido. `bot_step` y `timeout_mazo` devolvieron errores con la cuenta de ElRana. Se anuló 18:15:00, sin ganador. También `4976743a-3369-47b5-a826-628b9f74221e`, contra Invitado3182, quedó en Falta Envido pendiente y se anuló 18:30:00. Los registros del 07/10 muestran **864 ejecuciones fallidas** de la actualización del ranking entre 18:08 y 18:27: no son 864 partidas. |

May tiene **tres reseñas guardadas**, todas del 13/10; su comentario habla de una cuarta experiencia, no de cuatro reseñas propias. La cuarta reseña que describe el mismo error es la de ElRana. Los nombres de los bots se congelan por mesa y pueden diferir del nombre actual del perfil compartido; para identificar rivales se usaron los nombres de `games`, sus UUID y `is_bot`.

#### Falla 1: el movimiento del top 3 deshace la victoria

La función vigente `email_internal.refresh_ranking_top3()` contiene `delete from public.ranking_top3_state;` sin filtro. Procede de `supabase/migrations/20260921133540_ranking_email_alerts.sql`, línea 285. El rol de las solicitudes web, `authenticator`, tiene `session_preload_libraries=supautils, safeupdate`. Esa protección exige un `WHERE` en los borrados, como confirma la [documentación de Supabase](https://supabase.com/docs/guides/database/custom-postgres-config).

Los errores de producción dicen exactamente **`DELETE requires a WHERE clause`**, SQLSTATE `21000`, con contexto `email_internal.refresh_ranking_top3() line 133`, durante `COMMIT`. Los triggers de `profiles` se ejecutan al confirmar la transacción: el fallo revierte también el resultado, puntaje, monedas e historial de la jugada que iba a cerrar la partida. La pantalla mantiene el estado anterior y los reintentos vuelven a fallar.

La función retorna temprano cuando no cambian los tres integrantes/posiciones del podio. Por eso muchas partidas cierran y otras se bloquean. En la consulta del 13/10, May y ElRana tenían **21 victorias**, y el tercer puesto **22**. Una simulación mediante `SELECT`, sin modificar perfiles, confirmó que una victoria de cualquiera los coloca terceros por el desempate de menos partidas jugadas. La derrota no produce ese ingreso y sí confirma. Los bots del lobby cuentan en estadísticas normales; Historia usa la rama de campaña que no suma esas victorias al ranking online. Esto explica la diferencia reportada entre lobby e Historia.

En la ventana consultada 12/10 15:50–13/10 15:45 se encontraron **1.305 errores** de ese borrado, incluyendo reintentos automáticos. No equivalen a usuarios ni partidas distintas. El 07/10 ya estaba ocurriendo; no se atribuye un inicio exacto a una fecha que no se haya consultado.

#### Falla 2: nunca se envía el aviso de presencia 1v1

En `src/app/game/[id]/GameClient.tsx`, el callback de cada ocho segundos llama `supabase.rpc('touch_presence', ...)` pero no espera ni consume el resultado. La biblioteca devuelve una solicitud pendiente que solo se envía al usar `await` o `.then()`. **Preparar la llamada no la ejecuta.**

Verificación local con la biblioteca instalada y un transporte simulado, sin red: la forma actual envió **0 solicitudes**; al esperar la misma llamada envió **1**. Producción confirmó **0 filas en `game_presence`**, permisos correctos de la función y ninguna solicitud `touch_presence` de May en la partida 02:13–02:25. El barrido `sweep-stale-trucazo` está activo cada cinco minutos con `sweep_stale_games(10)`; al faltar presencia usa la hora de creación. Así una partida puede anularse **10–15 minutos después de empezar**, aunque continúen las jugadas. El mismo patrón sin consumir la llamada existe en `src/lib/useCommunity.ts` para `touch_online`; quedó identificado para la corrección, sin modificarlo en esta investigación.

Reclamos anteriores comprobados además de los cuatro principales:

- **Invitado2138**, 10/10 01:15:42: partida `9b19eb63-6b67-4548-98af-998ee7babf8d`, iniciada 01:01:18 y anulada 01:15:00, marcador 21–25 desde su perspectiva. Su cuenta confirmó `envido_say` a las **01:14:51**, nueve segundos antes de la anulación; siguió recibiendo consultas HTTP 200. No hubo errores de borrado del ranking en esa ventana. **La anulación por falsa ausencia está respaldada por actividad real previa al cierre.**
- **Invitado9666**, 27/09 17:25:58 y 17:26:01: son dos envíos separados por tres segundos sobre la misma partida `a076493f-bd15-4596-9971-3db11b5c23ee`, **29–20** a su favor. Inicio 17:10:15; anulación sin ganador 17:25:00, compatible con el barrido sin presencia. No se consultaron registros HTTP de esa fecha, por lo que no se certifica actividad inmediatamente anterior ni otra causa.
- **elcapopaco**, 09/09 19:34:41: partida `65d6cf94-c2f4-4a64-9674-f7a791a96d7d`, derrota con marcador **1–0** a su favor y solo un timeout del rival. El cierre concuerda con su relato de haber abandonado mientras esperaba; no hay evidencia que lo vincule al error del ranking, cuya función procede de una entrega posterior.

#### Plan y traspaso de la investigación inicial (histórico)

1. Crear **una migración nueva posterior a las aplicadas** que redefina solamente `email_internal.refresh_ranking_top3()`, reemplazando el borrado sin filtro por `delete from public.ranking_top3_state where rank between 1 and 3;`. La restricción vigente limita todos los puestos a 1–3, por lo que conserva el reemplazo completo de la foto. No desactivar `safeupdate`, no editar la migración histórica. Pausar los correos por sí solo no evita este borrado.
2. Consumir la llamada de presencia 1v1 y comprobar su recepción; revisar el caso identificado de `touch_online`. No cambiar las reglas de tiempo ni trasladar lógica del juego al cliente.
3. Verificar en una base aislada el cierre de una victoria que entra al podio **con la protección `safeupdate` activa en la conexión de prueba**, incluyendo confirmación al final de la transacción. Las pruebas históricas de ranking ejecutadas como `postgres`, sin esa protección del rol web, no detectaban este problema. Verificar también una partida activa de más de 15 minutos y una ausencia real, y conservar cierre/monedas idempotentes. El dueño aplica la migración manualmente en Supabase; después comprobar las funciones, recepción de presencia y cierres reales publicados.
4. Revisar por separado la reparación de resultados/monedas afectados antes de cambiar cuentas. La investigación no otorga victorias retroactivas ni considera derrotas todas las anulaciones; no se conserva la secuencia íntegra de las manos fallidas.

**Texto para retomar:** «Investigación del 13/10 terminada: docs/operacion.md → `incidente-resenas-2026-10-13`. May envió la foto y otras dos reseñas; ElRana reportó el mismo error. Confirmados el borrado del top 3 rechazado por `safeupdate` y la presencia 1v1 que nunca se envía. Corrección pendiente: empezar por la nueva migración del ranking y la ejecución real de `touch_presence`, con pruebas aisladas; producción y saldos siguen sin cambios».

</details>

<a id="log-ingestion-2026-10-13"></a>

### Consumo de registros de Supabase — 13/10/2026

**Estado:** revisión terminada mediante consultas de solo lectura a producción (`uqhsyayfvhwlduioghtu`), configuración vigente de Postgres, registros de servicios y lectura del código local. Organización `Trucazo`, plan gratuito, proyecto `ACTIVE_HEALTHY`. No se modificaron funciones, configuración, cron, partidas, cuentas ni saldos; no se desplegó código. Sólo se añadió este registro documental. **Optimización pendiente.**

El aviso enviado por el dueño muestra **3,45 GB** usados en el período, **1 GB** incluido y **2,45 GB** de exceso, y señala un período de gracia hasta comienzos de 2027. El [anuncio oficial del 25/09/2026](https://supabase.com/changelog/logs-usage-based-pricing) confirma que los avisos durante ese período son informativos y no aplican cobros ni restricciones por esta métrica; para organizaciones existentes al 25/09, el período llega a comienzos de 2027. Se comprobó que el proyecto fue creado el 21/05/2026, pero no se consultó la fecha de creación de la organización ni su historial de transferencias. La [guía vigente](https://supabase.com/docs/guides/platform/manage-your-usage/logs-ingest) distingue el plan gratuito, que no factura excedentes, de los planes pagos; exceder la cuota gratuita tras la entrada en vigor debe revisarse bajo su política de uso justo. No se recomendó contratar un plan por el aviso actual.

#### Qué se midió y límites de la evidencia

- Ventana principal: **12/10 16:33–13/10 16:33, Argentina** (`2026-10-12T19:33:00Z`–`2026-10-13T19:33:00Z`).
- Comparación: **09/10 21:00–10/10 21:00, Argentina** (`2026-10-10T00:00:00Z`–`2026-10-11T00:00:00Z`). Es una ventana distinta de la barra diaria del panel si éste usa otro huso horario.
- Para comparar fuentes se sumó `length(event_message) + length(toJSONString(log_attributes))`. Es una **estimación del tamaño de los campos consultables**, no el contador oficial de facturación: no incluye necesariamente todos sus campos, transformaciones o costos de serialización. Las proporciones sirven para identificar el origen dominante, no para reconstruir los 3,45 GB del período completo ni prometer un ahorro exacto.
- La llegada tardía de registros puede variar ligeramente los resultados de consultas sobre la misma ventana. No se consultó todo el período mensual ni se realizó una auditoría de seguridad.

| Fuente | Eventos, ventana principal | Tamaño estimado |
| --- | ---: | ---: |
| Solicitudes HTTP de la web (`edge_logs`) | 85.303 | 248,48 MB, 95,25% del total estimado |
| Base de datos (`postgres_logs`) | 14.474 | 8,72 MB |
| Autenticación (`auth_logs`) | 4.084 | 2,95 MB |
| Otros servicios combinados | 1.719 | 0,72 MB |

En la ventana de comparación hubo **91.742 solicitudes HTTP**: **266,88 MB**, **95,80%** del total estimado. El predominio de las solicitudes se repite; no depende solamente de los errores actuales del ranking. En la ventana principal, 74.153 solicitudes declararon un origen de `trucazo.com.ar`, 3.668 de `localhost` y 7.475 no traían origen. El origen y la identificación del cliente son señales, no prueba de identidad ni ausencia de abuso.

Las tres lecturas más frecuentes en la ventana principal fueron:

| Lectura | Solicitudes | Respuestas con error |
| --- | ---: | ---: |
| Cartas privadas (`GET /rest/v1/game_hands`) | 30.561 | 0 |
| Mesas (`GET /rest/v1/tables`) | 10.619 | 4 |
| Estado de partidas (`GET /rest/v1/games`) | 10.252 | 3 |

Estas tres lecturas representan juntas **60,44% del tamaño total estimado** de registros. No son cantidades de jugadores ni partidas. La mayoría de las solicitudes se completa: hubo 83.053 respuestas HTTP 200 y 1.249 respuestas de error (400, 403 o 406), aproximadamente **1,46%** de las solicitudes.

#### Causas observadas

1. **Consultas repetidas de respaldo y recarga de cartas.** `src/app/game/[id]/GameClient.tsx` consulta partida y mano cada 2,5 segundos, además de recargar la mano al recibir cambios por Realtime y después de varias acciones. `src/app/lobby/LobbyClient.tsx` consulta las mesas del creador cada segundo; la lista general también se recarga por cambios en Realtime. Estos mecanismos explican fuentes de repetición presentes en el código; no se midió todavía qué fracción exacta corresponde a cada mecanismo ni cuántas recargas pueden eliminarse sin afectar la recuperación ante cortes.
2. **Errores reales de ranking y reintentos.** La ventana principal contiene **1.490 errores de Postgres** `DELETE requires a WHERE clause`, SQLSTATE `21000`, del problema ya [documentado](#incidente-resenas-2026-10-13). `timeout_mazo` recibió 1.201 solicitudes, de las cuales **1.178** devolvieron error. Su reloj local libera el bloqueo al fallar y puede reintentar cada 500 ms. Los errores agregados no certifican que cada solicitud fallida sea del mismo motivo. Corregir el ranking es prioritario por las partidas bloqueadas, aunque los registros de ese error no dominan el volumen total.
3. **Postgres no tiene registro exhaustivo activado.** Configuración comprobada: `log_statement=ddl`, `log_min_duration_statement=-1`, `log_connections=off`, `log_disconnections=off`, `log_min_messages=warning`, `pgaudit.log=none`, `log_temp_files=-1`. No se encontraron funciones actuales de `public` o `email_internal` con `RAISE NOTICE/LOG/INFO/WARNING`. De los mensajes normales de Postgres, 12.366 corresponden al cron (6,93 MB estimados), con diez tareas activas. No hay evidencia de que apagar registros o tareas programadas sea la solución principal.

#### Próximo paso y traspaso

1. La [verificación posterior al PR #120](#correccion-cierres-presencia) confirmó el SQL de ranking aplicado y la recepción de presencia. Los errores contados en la ventana principal fueron anteriores a la incorporación del PR; no repetir la migración ni presentarlos como errores nuevos. Completar la aceptación de partidas reales indicada allí.
2. Preparar una optimización acotada de consultas: empezar por la recarga de manos y el vigilante de mesas del creador, revisar consultas con la pestaña oculta y conservar la recuperación al volver o perder Realtime. Las cartas deben permanecer privadas y fuera de Realtime; no trasladarlas a `games` ni mover reglas SQL al cliente.
3. Verificar con un transporte simulado que bajen las solicitudes repetidas y que sigan actualizándose cartas, reparto y entrada a partidas ante reconexión. Después de publicar una corrección, comparar el contador oficial del panel durante varios días con tráfico similar. No atribuir una caída del consumo a un cambio aún no aplicado.

**Texto para retomar:** «Revisión de Log Ingestion del 13/10 terminada: docs/operacion.md → `log-ingestion-2026-10-13`. Ranking corregido mediante PR #120 y SQL aplicado; presencia recibida. Completar la aceptación de partidas reales según `correccion-cierres-presencia` y después reducir recargas de cartas y consultas repetidas del lobby, verificando recuperación ante cortes».

<a id="cuentas"></a>

## Cuentas y eliminación de datos

La eliminación de cuenta está integrada en el código mediante PR #101. No volver a construirla ni repetir su migración como parte del plan Android. Sigue pendiente su regresión instalada y comprobar el soporte; este trabajo no elimina cuentas.

<a id="eliminacion-cuenta"></a>

### Eliminación, reintentos y soporte

Instrucciones de la entrega original. Verificar si el SQL ya se aplicó antes de ejecutar pasos de activación; para pruebas usar una cuenta descartable autorizada.

Procedencia anterior: `docs/eliminar-cuenta.md`. El contenido se mantiene en este documento temático.

<details>
<summary>Ver contenido completo: Eliminación, reintentos y soporte</summary>

<a id="eliminacion-cuenta-eliminacion-de-cuentas"></a>

### Eliminación de cuentas

La persona puede pedir el borrado desde **Perfil → Eliminar mi cuenta** o desde
`https://www.trucazo.com.ar/eliminar-cuenta`, sin tener la aplicación instalada.
Se identifica con su contraseña o una entrada reciente con Google y escribe
`ELIMINAR`. El servidor toma la cuenta de la sesión; no acepta elegir otra cuenta.

<a id="eliminacion-cuenta-activacion-en-este-orden"></a>

#### Activación, en este orden

1. Abrí Supabase y seleccioná el proyecto de Trucazo.
2. Entrá a **SQL Editor → New query**.
3. En este PR, abrí `supabase/migrations/20261001184850_account_deletion.sql`.
   Copiá TODO el contenido, pegalo en la consulta y tocá **Run** una sola vez.
   La consulta aplica todos los cambios juntos. Si falla, no avances con el PR:
   guardá el error para corregirlo.
4. Incorporá el PR a `master` y esperá el despliegue del sitio.
5. Abrí `/eliminar-cuenta` desde el navegador del celular y comprobá el acceso
   desde Perfil dentro de la app. Usá una cuenta de prueba propia para comprobar
   el borrado; es permanente.
6. En Play Console, abrí **Contenido de la aplicación → Seguridad de los datos**.
   Completá las preguntas de eliminación y pegá la URL
   `https://www.trucazo.com.ar/eliminar-cuenta` en el campo de eliminación de cuenta.
   La aprobación final depende de Google.

No se aplicó SQL ni se eliminaron cuentas en producción al preparar este PR.
El servidor usa `SUPABASE_SERVICE_ROLE_KEY`, que ya necesita el proyecto.
No hace falta configurar una URL nueva de retorno de Google ni otra clave.
El SQL programa `trucazo-account-deletion-retry` cada diez minutos mediante
`pg_cron` y `pg_net`, extensiones que ya usan los correos de torneos.

<a id="eliminacion-cuenta-datos-y-partidas"></a>

#### Datos y partidas

- Se borran perfil, monedas, compras, progreso, misiones, amistades, mensajes,
  preferencias, reseñas, archivos propios y navegación vinculada a la cuenta.
- Una partida activa termina como abandono con las reglas y pagos existentes.
  Las salas pendientes se cierran y devuelven las apuestas de los demás.
- El retiro de un integrante retira a la pareja del torneo. Las rondas futuras
  conceden el lugar al rival; si ambos lugares quedan vacíos, no se inventa un
  ganador. Un torneo pausado sigue pausado y procesa esos lugares al reanudarse.
- Se conservan resultados compartidos, cuadros y asientos históricos sin el
  UUID, nombre ni avatar del usuario: aparece **Cuenta eliminada**. Las partidas
  del motor 1v1 se borran porque también contienen identidades dentro de JSON.
- El liderazgo de un grupo pasa al miembro más antiguo. Un grupo sin otros
  miembros se borra.

<a id="eliminacion-cuenta-reintentos-y-soporte"></a>

#### Reintentos y soporte

Primero se guarda una solicitud privada y se borran los datos de juego en una
transacción. Después el servidor bloquea el acceso, elimina los archivos con la
API de Storage y elimina definitivamente el usuario de Auth. La solicitud se
borra al completar todo. Nunca se elimina sólo la fila de `storage.objects`.

Si un proveedor falla o la función se interrumpe, la solicitud se conserva con
el identificador y el inventario de archivos pendientes. El cron vuelve a
intentar. Una reserva temporal impide que dos ejecuciones la procesen a la vez.
Los tokens anteriores no pueden recrear el perfil ni subir nuevos archivos.

La página informa el estado inmediato y pide contactar a
`hola@trucazo.com.ar` si pasan 48 horas o no se puede iniciar sesión. Verificá
que ese buzón recibe mensajes antes de publicar. Para solicitudes por correo,
comprobá la identidad; no pidas contraseñas.

Para revisar solicitudes pendientes, copiá esta consulta en SQL Editor:

```sql
select id, user_id, created_at, attempts, last_error, locked_until, next_attempt_at
from public.account_deletion_jobs
order by created_at;
```

No compartas el campo `token`. Si se corrige una caída del proveedor, el próximo
cron retoma la cola. Para adelantar el envío, ejecutá:

```sql
select account_internal.dispatch_deletions();
```

Para tramitar un pedido por correo **después de comprobar la identidad**, buscá
la cuenta exacta en **Authentication → Users**, copiá su User UID y ejecutá:

```sql
-- Reemplazá el texto por el User UID comprobado antes de ejecutar.
select public.prepare_account_deletion('PEGAR-USER-UID'::uuid);
select account_internal.dispatch_deletions();
```

No borres manualmente la cola ni el usuario de Auth antes que los archivos.
Las copias de seguridad y registros de los proveedores siguen sus plazos de
conservación; la página pública y la política de privacidad lo explican.

<a id="eliminacion-cuenta-verificacion"></a>

#### Verificación

`supabase/tests/account_deletion.sql` usa fixtures locales y revierte todo:
1v1, 2v2 con bots, torneos activos/pausados, grupos con varios retiros, premios,
liderazgo, archivos antiguos, privacidad de la cola y tokens previos. El rebuild
completo y las regresiones de torneos, juegos y permisos deben pasar.

`node --import tsx scripts/check-account-deletion.ts` comprueba confirmación,
origen, autenticación reciente, orden Storage → Auth y fallos/reintentos.
Los dos controles están agregados a CI. También correr TypeScript, lint y build.

Referencia de Google:
https://support.google.com/googleplay/android-developer/answer/13327111

</details>


<a id="comunicacion"></a>

## Chat, correos y novedades

El chat escrito pertenece a mesas normales y torneos; Historia conserva únicamente frases rápidas. Los bots no escriben en el chat libre. Las novedades usan el sistema de envíos por tandas y bajas documentado; no se enviaron mensajes durante esta tarea.

<a id="correos-novedades"></a>

### Correos de novedades

Funcionamiento y comprobaciones de la campaña de novedades.

Procedencia anterior: `docs/novedades-email.md`. El contenido se mantiene en este documento temático.

<details>
<summary>Ver contenido completo: Correos de novedades</summary>

<a id="correos-novedades-campana-novedades"></a>

### Campaña Novedades

En `/admin/emails` aparece **Novedades**, activa por defecto. Toma el título y
el cuerpo de cada nueva publicación. Se inicia al confirmar la publicación en
Supabase, tanto desde Comunidad como desde SQL. Editar una novedad no dispara
otro envío ni modifica el texto de las tandas que ya comenzaron.

El público son los usuarios registrados hasta `created_at` de la publicación,
con email confirmado, excluyendo invitados, bots y direcciones de prueba.
Incluye administradores. Verifica las bajas antes de cada tanda; no incorpora
usuarios registrados después de publicar.

Cada INSERT crea un trabajo privado con copia del texto y una credencial aleatoria
por novedad. Un trigger llama por HTTPS al endpoint `/api/email/news`. El endpoint
verifica esa credencial contra la base, toma un bloqueo temporal y utiliza las
mismas bajas, reclamos atómicos y claves de deduplicación del sistema existente.
No acepta destinatarios ni contenido en el pedido y no puede ejecutar campañas
de reactivación. Las credenciales nunca llegan al panel ni al navegador.

Los correos se envían por tandas de hasta 90 (o `EMAIL_MAX_PER_RUN`, limitado por
la RPC a 100). El primer intento sale al publicar; las tandas restantes se
revisan cada minuto. Ante un fallo del proveedor se espera 15 minutos. Sus cuotas
pueden demorar el envío completo: iniciar no significa que todos hayan recibido.
El panel muestra los envíos reales y la finalización, no un éxito anticipado.

Pausar detiene nuevas incorporaciones y tandas pendientes. Reactivar continúa
las pendientes, pero no agrega retroactivamente publicaciones hechas en pausa.
El cron Vercel `0 22 * * *` sigue a las 19:00 Argentina y solo envía recordatorios.

<a id="correos-novedades-instalacion"></a>

#### Instalación

Desplegar el código y aplicar
`supabase/migrations/20260908160027_immediate_news_campaign.sql` en Supabase.
La migración habilita pg_net, crea la campaña activa, el trigger y el reintento
`trucazo-news-email-retry`. Incorpora únicamente la última novedad existente si
tiene email habilitado y no está completada; no vuelve a publicar el anuncio.
No requiere copiar CRON_SECRET ni ninguna clave de Resend.

<a id="correos-novedades-comprobaciones"></a>

#### Comprobaciones

`npm run check:emails` verifica contenido, cortes de registro, bajas, aislamiento
entre novedades y campañas y claves distintas para publicaciones diferentes.
`supabase/tests/immediate_news.sql` verifica trigger, copia inmutable, bloqueo,
pausa y permisos dentro de una transacción que se revierte. No envía correos.
El andamiaje PostgreSQL local reemplaza pg_net por una función sin red; producción
usa la extensión real. La compilación y el CI verifican la integración.

</details>


<a id="ciclo-despliegue"></a>

### Publicación del ciclo de retorno

Estado guardado, sin una nueva comprobación de producción.

Procedencia anterior: `docs/ciclo-de-retorno-despliegue.md`. El contenido se mantiene en este documento temático.

<details>
<summary>Ver contenido completo: Publicación del ciclo de retorno</summary>

<a id="ciclo-despliegue-publicar-el-ciclo-de-retorno"></a>

### Publicar el ciclo de retorno

El código está listo, pero las tablas y funciones nuevas todavía no existen en
la base real hasta que se ejecute la migración. Aplicá primero la base y después
publicá el sitio.

<a id="ciclo-despliegue-1-aplicar-la-migracion-en-supabase"></a>

#### 1. Aplicar la migración en Supabase

1. Abrí el panel de Supabase del proyecto Trucazo.
2. En el menú izquierdo, entrá a **SQL Editor**.
3. Tocá **New query**.
4. Abrí en tu computadora
   `supabase/migrations/20260904150348_ciclo_retorno.sql`.
5. Copiá el archivo completo, desde el primer comentario hasta `commit;`.
6. Pegalo en la consulta nueva de Supabase.
7. Tocá **Run** una sola vez.
8. El resultado correcto termina sin mensajes rojos. La migración es idempotente:
   si se reenvía por accidente, no duplica catálogos ni recompensas.

No pegues `supabase/tests/ciclo_retorno.sql` en producción. Ese archivo crea
jugadores y partidas ficticias dentro de una transacción y es solamente para una
base local de prueba.

<a id="ciclo-despliegue-2-publicar-el-frontend"></a>

#### 2. Publicar el frontend

Después de que la migración termine bien, publicá la rama o fusioná su Pull
Request como hacés normalmente. Vercel construirá la pantalla `/objetivos` y el
cofre flotante del lobby.

<a id="ciclo-despliegue-3-comprobacion-manual-corta"></a>

#### 3. Comprobación manual corta

1. Entrá con una cuenta registrada y abrí el lobby.
2. Confirmá que aparezca el cofre flotante sin empujar las mesas hacia abajo.
3. Abrí el cofre y revisá el nombre, la descripción, el progreso y la recompensa
   de las tres misiones diarias. Usá **Ver desafío y racha** para abrir el detalle.
4. Terminá una partida real. El cierre debe mostrar el bloque **Objetivos** sin
   tapar **Revancha** ni **Volver al lobby**.
5. Si una misión quedó lista, tocá **Reclamar** y comprobá que el saldo aumente.
6. Abrí la misma cuenta en otra pestaña e intentá reclamar de nuevo: el saldo no
   debe volver a aumentar y ambas pantallas deben refrescarse.

<a id="ciclo-despliegue-economia-elegida"></a>

#### Economía elegida

Las tres misiones nunca suman más de 90 monedas por día y el desafío semanal da
150. Es un punto de partida conservador frente a la apuesta rápida de 50 monedas,
el bonus anti-quiebra de 100 y la tienda, cuyos primeros objetos pagos parten de
150–250 monedas. Los montos viven en la base y se pueden ajustar más adelante sin
duplicarlos en componentes.

El catálogo inicial tiene 22 misiones. La selección conserva tres categorías
distintas y no repite una misión exacta en dos días consecutivos.

</details>

<a id="seo"></a>

## SEO y páginas públicas

Se reúnen las implementaciones y las tareas externas registradas hasta el 24/08/2026. Las versiones Markdown públicas que produce el build son archivos generados desde las páginas del sitio; no son notas manuales del proyecto.

<a id="seguimiento-seo"></a>

### Implementación y seguimiento SEO/GEO

Registro de trabajo y backlog; no se volvieron a medir resultados ni se consultó Search Console durante esta tarea.

Procedencia anterior: `docs/seo-pendientes.md`. El contenido se mantiene en este documento temático.

<details>
<summary>Ver contenido completo: Implementación y seguimiento SEO/GEO</summary>

<a id="seguimiento-seo-seo-y-geo-estado-y-seguimiento"></a>

### SEO y GEO — estado y seguimiento

Última actualización: **24/08/2026**.

Este documento reemplaza la auditoría orientativa del 15/07/2026. Se retiró el
puntaje “72/100” porque no provenía de una metodología reproducible ni de datos
completos de rastreo, indexación, rendimiento de campo y Search Console.

<a id="seguimiento-seo-implementado-en-agentseo-geo-growth"></a>

#### Implementado en `agent/seo-geo-growth`

- Canonical propio en cada página pública; el layout raíz ya no impone `/`.
- `noindex` explícito en login, registro, reseña y pantallas privadas.
- `robots.txt` permite rastrear las rutas utilitarias para leer su `noindex`.
- Sitemap ampliado exclusivamente con páginas públicas y canónicas.
- Home con H1 visible, descripción del producto y CTA invitado prioritario.
- Guía de reglas corregida y ampliada según la modalidad real de Trucazo.
- Landing de juego sin afirmaciones incorrectas sobre rivales o registro.
- Clúster público de reglas, orden de cartas, envido, pardas y mano a mano.
- Calculadora de envido interactiva y compartible.
- Landings públicas separadas para invitado, amigos, CPU y Modo Historia.
- Páginas de acerca de, contacto, privacidad y términos.
- Metadata, Open Graph dinámico, breadcrumbs y datos estructurados coherentes.
- Eventos para CTA de invitado, creación de sesión y registro.
- `llms.txt` actualizado como documento opcional, sin atribuirle impacto de ranking.

<a id="seguimiento-seo-implementado-en-claudegoogle-seo-api-connection"></a>

#### Implementado en `claude/google-seo-api-connection`

Preparación para agentes de IA:

- Página 404 propia, en castellano, con enlaces al sitemap, al `llms.txt` y a las
  guías. Antes salía la pantalla de fábrica de Next, en inglés y sin salidas.
- Negociación de contenido: las páginas públicas se sirven en Markdown cuando el
  cliente lo pide con `Accept: text/markdown` (convención de acceptmarkdown.com).
  El Markdown lo genera el build desde el HTML real, no se escribe a mano.
- `llms.txt` con secciones de cuándo usar y cuándo NO usar el sitio.
- Lista de páginas públicas unificada en `src/lib/routes.ts`, consumida por el
  sitemap, el `llms.txt` y la negociación de Markdown.

Medición automática:

- `scripts/seo-report.mjs` + `.github/workflows/seo.yml`: cada 1 y 15 baja los
  datos de Search Console, los compara con las cuatro semanas anteriores, revisa
  el sitio en vivo y publica todo como issue del repositorio.

<a id="seguimiento-seo-acciones-externas-pendientes"></a>

#### Acciones externas pendientes

Estas tareas requieren acceso a producción o datos que no están en el repositorio:

1. ~~Confirmar que `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` esté configurada.~~
   **Resuelto de otra forma:** el dominio está verificado por registro TXT en el
   DNS, que cubre todo el dominio y sus subdominios. Esa variable de entorno ya
   no hace falta; el código la sigue soportando por si algún día se usa.
2. Enviar `https://www.trucazo.com.ar/sitemap.xml` en Search Console.
3. ~~Registrar línea base de 28 días: consultas de marca/no marca, impresiones,
   clics, CTR, posición y páginas indexadas.~~ **Automatizado**: lo hace el
   informe quincenal, que además separa marca de no marca en cada corrida.
4. Inspeccionar home, guía, orden de cartas y calculadora después del despliegue.
5. Revisar Core Web Vitals de campo cuando exista muestra suficiente.
6. Fijar metas porcentuales recién después de contar con esa línea base.
7. Agregar las redes sociales del juego al `sameAs` del schema `Organization`
   (hoy sólo apunta al GitHub personal del autor). Requiere que existan esas
   cuentas. Es la señal más débil hoy para que Google distinga la marca
   "Trucazo" de la palabra común y de la app homónima en Google Play.

<a id="seguimiento-seo-seguimiento-editorial"></a>

#### Seguimiento editorial

- Revisar Search Console a los 28, 60 y 90 días (ahora llega solo: el informe
  quincenal lo publica como issue).
- Priorizar ampliaciones desde consultas reales, no desde listas masivas.
- Actualizar `lastModified` sólo cuando cambie materialmente una página.
- Mantener reglas, funcionalidades, autoría y fechas verificables.
- No añadir ratings, reseñas, usuarios ni estadísticas a schema sin evidencia pública.

<a id="seguimiento-seo-backlog-condicionado-a-demanda"></a>

#### Backlog condicionado a demanda

- Estrategia básica y avanzada.
- Probabilidades con metodología publicada.
- Glosario del truco argentino.
- Historia cultural del juego con fuentes.
- Señas y campeonatos por equipos (el 2 vs 2 ya tiene su propia página pública).
- IndexNow sólo si Bing pasa a ser una fuente de tráfico relevante.
- CSP en una sesión dedicada con pruebas completas de Supabase, Google y Vercel.

</details>



<a id="seguimiento-resenas"></a>

## Seguimiento automático de reseñas

Implementado el 12/10/2026 por pedido del dueño. Revisión del agente **lunes,
miércoles y viernes a las 09:00 de Argentina** mediante una tarea de ChatGPT en
la nube, independiente de esta PC. El agente investiga y documenta; las correcciones
del juego se trabajan por separado. No envía correos ni contacta jugadores.

- Fuente: `public.feedback` de Supabase; nunca depender de los emails Web3Forms.
- Estado privado: `feedback_internal.reviews`, `findings`, `issues` y `runs`.
- Una reseña puede aportar varios hallazgos. Cada problema conserva un issue
  estable en GitHub, también si se cierra y luego reaparece.
- Cola por ID, sin ventana de fechas: las pendientes de ejecuciones anteriores
  se recuperan. La primera revisión cubrió las **23 reseñas existentes**, dejó
  **24 hallazgos en 9 asuntos agrupados** y terminó sin pendientes de lectura.
  Siete asuntos requieren trabajo o más información; tercera parda quedó
  comprobada como resuelta en 360 escenarios; el pedido de participación en chat
  quedó registrado sin implementar respuestas de bots, por decisión de producto.
- Concesión exclusiva de 2 horas, renovable; recuperación de agentes interrumpidos,
  reintento con espera y relectura cuando cambian las puntuaciones/comentario/capturas.
  Se marca revisada sólo después de guardar todos los hallazgos y comprobar GitHub.
- Issues públicos con paráfrasis técnicas y referencias opacas a reseñas: no
  publicar nombres, emails, IDs de usuario, conversaciones, imágenes privadas ni
  URLs firmadas. Distinguir reseñas repetidas de usuarios distintos.
- No confundir `reviewed` con problema resuelto. `needs_info` conserva lo que falta
  y su issue abierto. Capturas inaccesibles bloquean el cierre de la reseña, se
  reintentan y se informan; nunca afirmar que se vieron imágenes sin verlas.
- Se avisan fallos y acumulación (>50 pendientes o antigüedad >7 días). Una
  ejecución omitida por el programador sólo se detecta en el próximo arranque;
  no hay un segundo agente permanente. Accesos de GitHub/Supabase deben seguir
  conectados. La tarea puede terminar parcial por límites de ejecución y retomar
  pendientes en el próximo horario.

Contrato operativo del agente: [`scripts/feedback-review-agent.txt`](../scripts/feedback-review-agent.txt).
La tarea carga este contrato y puede seguir una versión actualizada sin rehacerla.
La guía central de operación es docs/operacion.md; no crear documentos de estado paralelos.

Migración reproducible: `20261012020747_feedback_review_tracking.sql`. En producción
se aplicó el mismo SQL en cinco bloques (`feedback_private_schema`,
`feedback_review_tracking`, `feedback_review_claims`, `feedback_review_findings`,
`feedback_review_completion`) porque el conector falló al recibirlo completo.
No hay que volver a correrla para activar la tarea. La foto está en
`supabase/schema/feedback_review.sql`; la reconstrucción y el CI incluyen la prueba
`supabase/tests/feedback_review.sql`. Todas las funciones son `security invoker`,
con `search_path` vacío, schema privado y RLS sin políticas para jugadores.

Validación realizada: suite de seguimiento dentro de una transacción con ROLLBACK
(lotes, exclusión de ejecuciones, reintentos, varios hallazgos, ediciones, recuperación,
cierre parcial, deduplicación, borrado en cascada y permisos); allowlist de RPCs
aprobada; primera revisión real terminada con `completed`, 23 revisadas y 0 pendientes.

<a id="correccion-cierres-presencia"></a>

## Corrección de cierres y presencia — 13/10/2026

La investigación confirmó dos causas independientes. Una victoria que cambia el
podio disparaba un `DELETE` sin filtro en `refresh_ranking_top3`: la protección
`safeupdate` lo rechazaba al confirmar la transacción y revertía toda la jugada.
Pausar los emails no evita ese error. La nueva migración limita el borrado a los
puestos 1–3, conservando los permisos privados y el comportamiento de los avisos.

Los latidos `touch_presence` y `touch_online` creaban una consulta del SDK sin
esperarla: no enviaban solicitudes. Ahora se ejecutan al entrar y cada 8/30 segundos.
Una partida con presencia reciente queda fuera del barrido; las abandonadas siguen
anulándose con su reembolso. No se cambian las reglas del juego ni el cron.

Pruebas: `scripts/check-presence.ts` ejecuta los efectos originales con el SDK real
y red simulada; falla antes del arreglo y verifica entrada, intervalos, salida y
reintento. El CI instala una versión fija de `pg-safeupdate` en su PostgreSQL
descartable. `supabase/tests/game_completion_presence.sql` reproduce el fallo
anterior y verifica victoria, podio por desempate, monedas, historial, cierre
idempotente, presencia reciente y reembolso único por ausencia real.

**Aplicación y recepción comprobadas el 13/10, revisión hasta las 19:32 de Argentina:**

- [PR #120](https://github.com/santibpapa/trucazo/pull/120) incorporado a `master` a las **16:32:37**, commit `f873a369c3c0ae3271e801599a9aababe04adc52`. Incluye `supabase/migrations/20261013185704_ranking_top3_safeupdate.sql` y la ejecución real de ambos latidos con `await`.
- La definición vigente de `email_internal.refresh_ranking_top3()` en Supabase contiene `delete from public.ranking_top3_state where rank between 1 and 3;`: el arreglo SQL **ya está aplicado**. Esta comprobación fue de solo lectura; no se repitió la migración ni se conoce el instante exacto de su aplicación manual.
- El último error registrado de ese borrado fue a las **16:31:55**, antes de la incorporación del PR. Entre **16:32:37 y 19:32:00** hubo **16.880 solicitudes HTTP** y **cero nuevos errores** `DELETE requires a WHERE clause` de Postgres. La ausencia en esa ventana no garantiza todos los cierres futuros, pero no hay evidencia de que ese error siga ocurriendo tras el arreglo.
- En la misma ventana se recibieron **1.144 llamadas `touch_presence`** (8 con HTTP 200 y 1.136 con HTTP 204) y **89 llamadas `touch_online`** (9 con HTTP 200 y 80 con HTTP 204). Todas esas respuestas son exitosas. La falta de envío ya no describe el estado observado.
- Los **1.490 errores** citados en la revisión de consumo corresponden a la ventana anterior al arreglo. La primera conclusión de que la corrección seguía pendiente quedó desactualizada; no usar el acumulado de 24 horas para atribuir fallos posteriores al despliegue.

**Aceptación pendiente:** comprobar una victoria real que cambie el podio y una partida activa de más de 15 minutos sin anulación inesperada. No se simularon partidas ni se modificaron resultados o monedas en producción durante esta verificación. La optimización del volumen de solicitudes sigue siendo una tarea distinta.

**Último traspaso:** «PR #120 incorporado; SQL de ranking aplicado en Supabase y ambos latidos recibidos. Verificación del 13/10 hasta las 19:32 en docs/operacion.md → `correccion-cierres-presencia`: cero errores nuevos del borrado en casi tres horas. No repetir la migración. Primer paso: completar la aceptación de una victoria que cambie el podio y una partida activa de más de 15 minutos; luego optimizar consultas según `log-ingestion-2026-10-13`».


<a id="capturas-resenas-2026-10-14"></a>

## Capturas de reseñas y lectura privada — 14/10/2026

Las imágenes se subían correctamente, pero Storage sólo concedía INSERT. La
creación de URLs firmadas del correo necesita SELECT: ahora cada sesión puede leer
sólo los archivos de su propia carpeta en feedback-images. El bucket sigue privado;
el correo conserva sus enlaces de siete días. Si falla alguna firma, el aviso indica
que esa captura está guardada y que su enlace no está disponible, en vez de decir
que no hay imágenes. El guardado de la reseña sigue siendo independiente del correo.

El agente programado de ChatGPT mantiene lunes/miércoles/viernes 09:00 de Argentina.
Lee cada imagen con un ticket de 256 bits emitido por SQL administrativo para una
reseña reclamada por la ejecución activa. El ticket dura diez minutos, sirve una
vez y se invalida si cambia la reseña, termina su revisión o vence la ejecución.
El registro guarda sólo SHA-256 del token. La Edge Function feedback-image consume
el ticket y descarga únicamente esa imagen con una clave interna de Supabase.
No entrega esa clave al agente, no recibe rutas arbitrarias y no necesita PC,
credenciales locales ni nuevas variables en Vercel. Respuestas sin caché y sin
referer; no admite SVG/HTML. El contrato contiene la lectura visual por HTTP del
entorno en la nube y su manejo de errores. No usar web.open para esta imagen
binaria si lo rechaza; usar fetch + emitImage o un navegador de la nube.

### Estado de Supabase e instalación en otro entorno

**Aplicado en producción**, con feedback-image ACTIVE. No hace falta volver a
correr SQL en el proyecto de Trucazo. Los cambios se aplicaron en cinco bloques:
feedback_image_owner_read (20261014133748), feedback_image_ticket_table
(20261014135215), feedback_image_ticket_privileges (20261014135223),
feedback_image_ticket_consume (20261014140841) y feedback_image_ticket_issue
(20261014140919). La migración consolidada reproducible es
20261014133748_feedback_private_image_access.sql; la foto es
supabase/schema/feedback_images.sql. Las funciones son INVOKER con search_path
vacío; el schema interno y sus tablas permanecen cerrados a anon/authenticated.
La única RPC puente, consume_feedback_image_ticket, tiene EXECUTE sólo para
service_role. La función de emisión ni siquiera se concede a service_role.

Para reproducirlo en otro proyecto:

1. Aplicar primero el seguimiento de reseñas y luego la migración consolidada en
   Supabase → SQL Editor → New query → pegar el archivo → Run.
2. Desplegar supabase/functions/feedback-image/index.mjs y handler.mjs como
   feedback-image. Usar supabase/config.toml: verify_jwt=false porque la función
   valida su propio ticket privado de un uso, no porque permita lectura pública.
3. Usar SUPABASE_URL y SUPABASE_SECRET_KEYS.default del entorno interno de Edge;
   se conserva compatibilidad con SUPABASE_SERVICE_ROLE_KEY. No copiar claves al
   agente, al navegador, a variables NEXT_PUBLIC ni a GitHub.
4. Cambiar en el contrato únicamente la URL del proyecto de destino.

La reconstrucción y el CI incluyen supabase/tests/feedback_images.sql. La prueba
con ROLLBACK pasó en Supabase: aislamiento de dueño/tercero/anon, rechazo de
reseñas o índices ajenos, token no guardado en claro, replay, vencimiento, edición
y revisión cerrada. scripts/check-feedback-images.mjs prueba la respuesta de
imagen, autorización antes de descargar, credenciales legacy/modernas, métodos,
formatos inseguros y fallos del proveedor de enlaces. Se abrieron los dos adjuntos
reales mediante la Edge Function y se comprobó su lectura visual. La emisión y
lectura de imágenes quedan auditadas por ejecución/reseña; los registros de
tickets tienen la misma eliminación en cascada que el seguimiento.

El asesor de seguridad sólo señala RLS sin políticas para image_tickets, que es
intencional en este schema administrativo cerrado:
https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy.
No se añaden políticas de jugador para silenciar ese aviso.

Las dos reseñas que bloqueaban #118 se completaron con evidencia privada y
actualizaciones en #109, #110, #111 y #114. Una imagen confirma DELETE requires a
WHERE clause; la otra muestra turno rival a 0 segundos. Completar su lectura no
resuelve automáticamente los bugs históricos ni demuestra regresión del parche
#120. Las capturas, rutas, tokens e identidades no se publican.

<a id="correcciones-resenas-2026-10-14"></a>

## Integración de correcciones de reseñas — 14/10/2026

**Implementación integrada en master:** el
[PR #127](https://github.com/santibpapa/trucazo/pull/127) se mergeó el 14/10 a las
12:50 de Argentina, commit `cd958efa51ee15c058a603cf5bb61cfeba56eccf`.
Reúne los cambios de #124, #125 y #126, resuelve sus conflictos y agrega protección
contra solicitudes de reparto o turno vencido que nunca responden. Las ramas
originales no son pasos de merge pendientes.

| Tema | Corrección integrada | Verificación |
| --- | --- | --- |
| Rival inactivo / espera detenida (#110, origen #124) | Reintento de reparto cada 3 s, reloj basado en la antigüedad del turno, rechazo de estados atrasados y límite HTTP de 8 s para reparto y timeout. Los fallos liberan el siguiente intento y salir de la mesa cancela la recuperación. | 13 pruebas de recuperación con SDK real y transporte/reloj controlados; RPCs reales de inactividad en base descartable. |
| Declaración de envido / 33 (#123, origen #125) | Los cantos, respuestas y declaración liberan los controles ante errores, excepciones o espera HTTP de 8 s. La relectura de cartas no mantiene el botón bloqueado; se relee el estado al reconectar o volver a la pestaña. | 13 pruebas de recuperación de envido y suite SQL de falta envido, 33, orden de mano, empate, cartas ya jugadas y rechazo. |
| Capturas y correos (origen #126) | Lectura de la carpeta propia para firmar enlaces, aviso explícito si falla una firma y lectura privada del agente mediante tickets de un uso. | Pruebas de permisos/tickets y del servicio de imágenes; las dos capturas reales se leyeron y sus reseñas se completaron. |
| Victoria que cambia el podio y presencia (#109/#111, origen #120) | Se conserva la corrección del 13/10, ya aplicada. #127 no introduce un nuevo arreglo del ranking ni cambia el barrido. | Se mantienen las pruebas de presencia y de cierre con safeupdate, resultado, monedas, historial e idempotencia. |

**CI completo aprobado** para `c82be9d4919b35fd8a06da40eac187fab9f8c6b4`:
[GitHub Actions](https://github.com/santibpapa/trucazo/actions/runs/38591431710),
Aplicación (tipos, ESLint, pruebas y build), Base de datos (reconstrucción y batería
completa) y control de Vercel del PR. ESLint conserva advertencias preexistentes.
Estas comprobaciones no equivalen a una partida manual posterior al merge.

**Supabase:** #127 no requiere SQL adicional. La migración y Edge Function de
capturas ya están aplicadas, como se detalla en la sección anterior. No modificar
partidas, monedas ni estadísticas para validar reseñas históricas.

**Lectura completa:** la revisión del 14/10 a las 11:22 dejó **26 de 26 reseñas
revisadas, 32 hallazgos en 10 asuntos y 0 pendientes de lectura**. Las dos capturas
ya no bloquean el seguimiento. El [tablero #118](https://github.com/santibpapa/trucazo/issues/118)
mantiene el estado vigente; no se crea otro registro paralelo.

**Seguimiento restante:** las correcciones comprobadas están integradas. No queda
una implementación pendiente de esos defectos. #110 y #123 conservan la atribución
histórica y la comprobación manual, porque los reportes no identifican su partida;
#109 y #111 conservan la validación del flujo real. El PR #127 no documenta una
partida manual entre dos dispositivos ni una nueva prueba contra producción.
Conservar estos límites al informar el estado, sin presentar los arreglos como
pendientes de merge ni tratar todos los incidentes históricos como reproducidos.

Para la comprobación manual: usar dos sesiones 1v1, verificar recuperación de red
durante reparto y turno vencido, declarar 33 tras aceptar falta envido y reconectar,
y comprobar resultado/monedas/historial al finalizar. La guía de inactividad está
en [la guía de inactividad](issue-110-inactivity.md). Las señales de
comprensión (#113), estética (#114), reclamos sin detalle (#115) y sospecha sin
evidencia (#117) siguen esperando información concreta. La tercera parda (#112)
ya está resuelta; los bots mantienen la decisión de no responder chat escrito (#116).

La tarea continúa lunes, miércoles y viernes a las 09:00 de Argentina. El agente
lee el README, este documento y el contrato vigente, conserva los issues existentes y distingue
corrección integrada, validación pendiente y posible regresión posterior.


### 27/10/2026 — Controles de convivencia visibles tras despliegue Android

El despliegue autorizado575bedc incluyó componentes web compartidos de convivencia además de las API Android. El dueño señaló el exceso de texto «Opciones de…» en chats y «Denunciar mesa» en tarjetas, y eligió conservar las funciones con controles discretos. Parche preparado sobre la producción575: `src/components/SafetyActions.tsx` cambia el texto visible por tres puntos con nombre accesible/tooltip y foco visible; `src/components/game/TeamTables.tsx` coloca el control junto al nombre/cupo, sin fila adicional. No cambia RPC, reglas, permisos, API, SQL, configuración ni APK22 firmado.

Rama `codex/web-discreet-controls`, commit `06353db8f5574122ade2476ce896415a1b2b9736`. Diferencia remota verificada: sólo esos dos archivos,8adiciones/3eliminaciones. CompilaciónNext15 y lint específicos aprobados; componentes web reales con datos aislados a320/360/1280 verifican textos no visibles, tres puntos, diálogos de denuncia/bloqueo y ausencia de desborde, sin enviar acciones. Evidencia `android/generated/web-discreet-safety/verification.json` y capturas; build separado `web-discreet-next` no reemplaza el servidorQA3000. **Publicación autorizada posteriormente por el dueño:** «ah perfecto, entonces si, mandale mecha», después de aclarar que el chat conserva su apertura en ventana. Parche06353db listo. **Aún sin publicar:** Vercel consultado nuevamente figura no instalado y el navegador local está deshabilitado; se pidió agregar/conectarVercel. No repetir autorización de publicación cuando se recupere la conexión. Antes de desplegar, releer la revisión productiva y conservar cambios ajenos si ya superó575. Producción conocida sigue575bedc hasta verificar un despliegue posterior.


**Publicación retomada tras conectarVercel:** producción releída en575bedc, sin cambios posteriores. Parche06353db construido con variables deproducción en `dpl_CXsSLVSnubm712fCEF4ZFdtaGmVJ`, READY y dominioWWW asignado; servicios Android200, acceso anónimo401, retornos/asociación200 y emailconfirmationfalse. La primera comprobación abrió/cerró el chat pero no esperó los mensajes; al esperar la lectura real encontró16controles y un defecto previo: el portal del cuadro de denuncia enbody quedaba detrás del diálogoHTMLnativo del chat. No se dio esa interacción por aprobada.

Corrección necesaria adicional en `CommunityDialog.tsx`: portal dentro del diálogoHTMLabierto que contiene el foco, obody cuando no hay uno. Mantiene ese contenedor estable mientras permanece abierto. Regresión aislada320/360/1280 verifica clic real enBloquear, Cerrar, yEscape sin cerrar el chat, sin enviar denuncias/bloqueos. Lint aprobado. Commit final `8e90f9dc1c222eb357751afad05dc7d0e571645a`; diferencia total sobre575: tres archivos,10adiciones/4eliminaciones. Segundo despliegue productivo `dpl_FrpQ26kX7xiVQxwFoSrBX2J4aBLa` construyéndose; todavía pendiente de verificar su activación y recorrido real. La autorización de publicar conserva su vigencia.


<a id="controles-discretos-2026-10-27"></a>

**27/10/2026 — Publicación final verificada:** `8e90f9dc1c222eb357751afad05dc7d0e571645a`, `dpl_FrpQ26kX7xiVQxwFoSrBX2J4aBLa`, READY/producción/SãoPaulo, dominio `www.trucazo.com.ar` releído en esa revisión. Tres puntos conservan nombre accesible y tooltip; no se alteró la apertura del chat ni se quitó denunciar/bloquear. La corrección de portal permite tocar/cerrar las opciones dentro del diálogo nativo yEscape vuelve al chat.

Prueba web realQA2: ingreso normal, lectura de mensajes existentes y16controles discretos comprobados; abrir opciones, pasar aBloquear sin confirmar, cerrar, reabrir/Escape, cerrar chat y panel de escritorio aprobados. JavaScript servido contiene el control nuevo; sin desborde ni errores de página. APIAndroidHistoria/identidad, push y preferencias200; anónimo push401; asociación exacta del paquete/firma y retornoHTTPS200. Confirmación de emailfalse y consulta de piloto/despacho conserva `pilot=true`, `dispatch_enabled=false`. Registros del despliegue sin errores/fatales en la ventana consultada. No se enviaron mensajes, denuncias ni bloqueos, no se crearon partidas/cuentas, no hubo SQL/configuración, APK ni publicaciónPlay nuevos. Evidencia `android/generated/web-discreet-safety/production-verification.json` y comprobación320/360/1280.

Versión compatible575bedc en `dpl_ErPCi4JTe2sbtARPB5CgSiaR2ZB3` conservadaREADY para rollback;06353db intermedia también conservada. `master` y fuentes/artefactos del menúAndroid que se trabajan por separado no se integraron ni sobrescribieron; este parche web vive en `codex/web-discreet-controls` y debe conservarse al integrar futuras fuentes. El APK ya instalado conserva su propia presentación hasta su próxima actualización autorizada; sus servicios remotos se verificaron. La autorización de publicación del dueño se cumplió.

# Publicar el ciclo de retorno

El código está listo, pero las tablas y funciones nuevas todavía no existen en
la base real hasta que se ejecute la migración. Aplicá primero la base y después
publicá el sitio.

## 1. Aplicar la migración en Supabase

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

## 2. Publicar el frontend

Después de que la migración termine bien, publicá la rama o fusioná su Pull
Request como hacés normalmente. Vercel construirá la pantalla `/objetivos` y la
tarjeta nueva del lobby.

## 3. Comprobación manual corta

1. Entrá con una cuenta registrada y abrí el lobby.
2. Confirmá que aparezcan exactamente tres misiones diarias y un desafío semanal.
3. Abrí **Ver objetivos** y revisá progreso, recompensa y racha.
4. Terminá una partida real. El cierre debe mostrar el bloque **Objetivos** sin
   tapar **Revancha** ni **Volver al lobby**.
5. Si una misión quedó lista, tocá **Reclamar** y comprobá que el saldo aumente.
6. Abrí la misma cuenta en otra pestaña e intentá reclamar de nuevo: el saldo no
   debe volver a aumentar y ambas pantallas deben refrescarse.

## Economía elegida

Las tres misiones nunca suman más de 90 monedas por día y el desafío semanal da
150. Es un punto de partida conservador frente a la apuesta rápida de 50 monedas,
el bonus anti-quiebra de 100 y la tienda, cuyos primeros objetos pagos parten de
150–250 monedas. Los montos viven en la base y se pueden ajustar más adelante sin
duplicarlos en componentes.

El catálogo inicial tiene 22 misiones. La selección conserva tres categorías
distintas y no repite una misión exacta en dos días consecutivos.

# Rediseño de partida y salones del club

La partida comparte el ambiente y la mesa con el visor de la tienda. Las cartas,
avatares, marcos, accesorios, reloj, anuncios y botones siguen siendo elementos
reales de la aplicación; las imágenes no contienen interfaz.

## Compras existentes

No requiere SQL. Se conservan los slugs, precios, orden, perfiles y compras del
servidor. `src/lib/salones.ts` define exclusivamente nombres, descripciones y arte
visibles. Las RPC de compra y activación siguen recibiendo el mismo slug.

| Salón anterior | Nuevo diseño | Slug conservado |
|---|---|---|
| Salón Clásico | Club de barrio | clasico |
| Cafetín Porteño | Cafetín porteño | cafetin |
| Quincho de Estancia | Quincho | quincho |
| Neón Nocturno | Peña norteña | neon |
| Rooftop Metropolitano | Bodegón | rooftop |
| Salón Presidencial | Refugio patagónico | presidencial |

Revertir el PR restaura la presentación anterior sin migrar compras.

## Arte y adaptación

- Seis ambientes originales WebP de 1536×1024 (124–197 KB por archivo).
- Aro de madera compartido WebP (209 KB); las máscaras SVG de geometría recortan
  sus contornos en el navegador. El paño y su textura se componen debajo.
- `SalonScene` comparte estos elementos entre partida y tienda. El fondo conserva
  el ancho de la escena en móvil, para no perder los objetos laterales.
- CSS aislado en `salon.module.css`. Filas estables para rival, tres rondas,
  mano, jugador, estado y respuestas. La partida entra en el alto visible sin
  desplazamiento; cartas y asientos se adaptan al espacio restante de la mesa.
- El visor usa un diálogo nativo (foco, Escape y cierre), se carga a demanda y
  no compra, equipa ni crea partidas.

## Comprobaciones

Se revisó la presentación en navegador con estados locales de partida:
turno propio, respuesta al truco, tercera ronda y vista previa de tienda;
tamaños móviles 390×844 y 375×667, y escritorio. El visor abre y cierra con Escape.
Las pruebas visuales usaron datos ficticios, sin jugar ni comprar en producción.
Los fixtures no forman parte del despliegue.

Se comparó el bloque de estado, efectos y acciones de GameClient contra master:
la lógica permanece intacta. La validación final incluye tipos, lint, build y
los controles habituales de RPC y simulación de truco.

## Cómo probar en Vercel

1. Abrir la preview e iniciar sesión normalmente.
2. Ir a Tienda: `Ver mesa` permite inspeccionar cualquiera de los seis salones
   sin gastar monedas. `Usar` conserva su comportamiento para los ya comprados.
3. Entrar en una partida y comprobar cartas, envido/truco, reloj, chat y sonido.
4. Revisar en el teléfono antes de aprobar el merge.

La preview mantiene las conexiones que tenga configuradas ese proyecto Vercel;
las compras y partidas reales siguen utilizando su backend configurado.

## Corrección del Quincho a partir de la referencia aprobada

El Quincho utiliza ahora quincho-reference.webp (212 KB), una edición de la
referencia para quitar interfaz, cartas y retratos conservando la escena y la
mesa. El fondo completo mantiene el mate, la parrilla, el paño texturado y el
borde ancho. No se superpone la mesa genérica a esta escena.

El marcador compacto, los retratos y las acciones se acomodan a esa composición.
Las tres rondas reservan su lugar de izquierda a derecha desde el comienzo.
Los controles permanecen visibles sin desplazar la partida.
Se revisaron el turno propio, la respuesta al truco, la tercera ronda y el visor
de la tienda con datos ficticios. No se hicieron compras ni partidas reales.

Esta corrección se limita al Quincho. Las ilustraciones de cartas, dorsos y
avatares siguen siendo las del juego, no las ilustraciones del boceto. Los demás
salones conservan su presentación anterior dentro del PR.

## Regla de una sola pantalla

El ajuste sin scroll se aplica a todos los salones. El contenedor usa 100dvh
(alto visible con las barras del navegador) y las medidas de cartas y asientos
dependen del espacio de mesa que queda después del marcador y los controles.
No se reducen los botones de respuesta de 44 px ni se ocultan opciones.
La tienda y sus diálogos conservan su desplazamiento normal.

## Cartas fijas, más legibles y con recorrido desde la mano

- Los seis destinos están presentes aunque estén vacíos. Al completar una ronda
  o resolver una parda solo cambia qué carta queda encima, nunca su posición.
- `CardMotion` anima desde la posición real de la carta tocada hasta su destino,
  con un pequeño arco, giro y desaceleración de 460 ms. Empieza antes de esperar
  la RPC; la confirmación se entrega sin repetir la entrada ni mostrar duplicados.
- Las cartas nuevas del rival salen de su fila de mano. Las cartas del historial
  inicial no vuelven a animarse. Se respeta `prefers-reduced-motion` y se limpian
  las animaciones al cambiar de mano o salir de la partida.
- La mano crece aproximadamente un 12% y las jugadas hasta un 27%, según el alto
  disponible. En pantallas bajas el aumento es menor para separar las filas.
  Chat y sonido quedan junto al retrato rival, fuera de la tercera ronda.
- La validación y los errores de `play_card` siguen siendo los existentes;
  no se modifican reglas, RPC ni SQL.

Prueba local interactiva: tres jugadas propias y entradas del rival con respuesta
simulada de 700 ms, seis destinos con coordenadas idénticas antes y después,
pardas sin desplazamiento, y error de RPC que devuelve las tres cartas a la mano
sin dejar una carta flotante. Revisadas las separaciones y controles en 320×568,
375×667 y 390×844. Datos ficticios; sin partidas ni compras en producción.

### Redondeo mínimo y capas sincronizadas

Las cartas y los dorsos usan un radio mínimo de 2 px, también en el Quincho,
para ocultar el pequeño borde oscuro de las ilustraciones en las esquinas.
La copia animada vive dentro de su destino, no por encima de toda la pantalla.
Para la jugada propia se anticipa únicamente la capa visual con los rangos ya
conocidos: una perdedora no tapa temporalmente a la ganadora. La RPC sigue
siendo la única autoridad sobre resultados, turnos y puntos. Al confirmar o
rechazar se limpia la copia y se restaura la capa controlada por React.

Se comprobaron en navegador las capas de ganadora, perdedora y parda durante
el recorrido y después de la confirmación, simulando 1800 ms de demora.
La copia en movimiento conserva el mismo radio que la carta en la mano.

## Mesas al volver de la tienda

El lobby ya no condiciona la lectura de mesas al número que devuelve
`ensure_lobby_tables`: cero indica que no creó mesas, no que no existan.
Se consulta la lista pública actual al entrar y al conectar/reconectar Realtime.
Las respuestas viejas o posteriores a salir no reemplazan la lista; los errores
de lectura conservan lo que ya se mostraba. Cada entrada usa un canal propio
para no reutilizar uno que todavía se está cerrando.

No es una condición exclusiva de la preview: la navegación puede reutilizar
datos viejos también en producción. Se aplica igual a invitados y registrados,
sin cambios en compras, autenticación, RLS ni SQL.

Regresión incluida en CI: `node --import tsx scripts/check-lobby-tables.ts`.
Cubre lista inicial vacía con mesas existentes y reposición cero, reconexión,
respuestas fuera de orden, errores y salida/vuelta rápida.

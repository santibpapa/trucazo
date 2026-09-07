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
  mano, jugador, estado y respuestas. En pantallas muy bajas se permite desplazar
  verticalmente para alcanzar todos los controles.
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
La primera ronda se muestra centrada; las siguientes se ordenan de izquierda a
derecha. En pantallas bajas se permite desplazar para alcanzar todos los botones.
Se revisaron el turno propio, la respuesta al truco, la tercera ronda y el visor
de la tienda con datos ficticios. No se hicieron compras ni partidas reales.

Esta corrección se limita al Quincho. Las ilustraciones de cartas, dorsos y
avatares siguen siendo las del juego, no las ilustraciones del boceto. Los demás
salones conservan su presentación anterior dentro del PR.

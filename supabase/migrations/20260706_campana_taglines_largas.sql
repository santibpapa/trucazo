-- ============================================================
-- TRUCAZO — Campaña: descripciones más largas de los rivales
-- Fecha: 2026-07-06
--
-- Reemplaza las taglines cortas por otras de ~2 frases: quién es el personaje
-- (oficio, origen, carácter) además de cómo juega al truco. El panel del rival
-- (HistoriaClient) las muestra tal cual; el texto largo envuelve bien.
-- Solo data (campaign_rivals.tagline); no toca estructura. Idempotente.
-- ============================================================

begin;

update public.campaign_rivals cr set tagline = v.t
from (values
  ('novato',      'Diecinueve años y la primera vez que se sienta a una mesa en serio. Todavía agarra las cartas con las dos manos y se pone colorado cuando le cantan: tira cualquiera y casi no se anima a cantar.'),
  ('colectivero', 'Cuarenta años arriba del bondi, del Once a Tigre y vuelta sin bajar el ritmo. Juega como maneja: rápido, sin frenar en amarillo, y te canta el truco sin mirar el espejo.'),
  ('vecina',      'La vecina de toda la vida, la que te cuida las llaves y sabe la vida de la cuadra entera. Prolija y de memoria fina: canta el envido justo cuando lo tiene, ni antes ni después.'),
  ('tanguero',    'Bailó en los salones de Boedo cuando el tango todavía se bailaba bien pegado. Elegante y callado, te estudia por encima de las cartas mientras tararea un dos por cuatro.'),
  ('carnicero',   'Atiende la carnicería del barrio desde los quince, y con el cuchillo o con las cartas va siempre de frente. Agresivo con el truco, aunque se le ve venir el envión.'),
  ('tana',        'Hija de tanos de Villa Crespo, cocina unos ravioles que resucitan a un muerto. Sólida y de buen envido, ya te empieza a medir y a apretarte en los momentos justos.'),
  ('pescador',    'Se levanta antes que el sol a tirar la línea al Paraná; para él, apurarse es cosa de gente de ciudad. Paciencia de río: espera la carta justa como espera al sábalo.'),
  ('cumbiero',    'Veinticinco años y la cumbia a todo lo que da desde el celular. Puro ritmo y aguante: te apura con el truco antes de que termines de acomodar las cartas.'),
  ('tahur',       'Se hizo solo en las mesas de los boliches del puerto, donde perder tenía consecuencias. Ya juega con cara de piedra: empieza a farolear y a mentirte el envido sin pestañear.'),
  ('quinielera',  'Atiende la agencia de quiniela de la esquina y se sabe todos los sueños con su número. Dice que las cifras le hablan, y tu envido se lo sopla el 15 antes de que lo cantes.'),
  ('patrona',     'Maneja el almacén, el club y media docena de favores que nadie le devolvió. Juega muy bien y te presiona seguido, como quien está acostumbrada a mandar.'),
  ('fernetero',   'Colorado, de risa fácil y un fernet siempre a mano en la previa. Arranca tranquilo, pero al tercer trago se suelta y canta cualquiera… y encima le sale bien.'),
  ('humorista',   'Anima cumpleaños y casamientos con el mismo repertorio de hace veinte años, y no falla. Te hace reír toda la mano y nunca sabés si te canta en serio o de joda.'),
  ('cuartetero',  'Cantó en los bailes de Carlos Paz cuando el cuarteto llenaba galpones. Toca de oído y canta fuerte: presión cordobesa a todo volumen, sin bajar nunca el pulso.'),
  ('serrana',     'Vive sola en un rancho de las sierras con las cabras y una radio a pilas. Baja al pueblo una vez al mes a jugar, y nunca se vuelve con las manos vacías.'),
  ('maestro',     'Maestro de escuela jubilado: le enseñó a leer a medio pueblo y a jugar al truco al otro medio. Casi perfecto: te miente, te lee la cara y va contando las cartas una por una.'),
  ('bodeguero',   'Dueño de una bodega de las viejas, de esas donde el tiempo se toma su tiempo. Añeja cada jugada como sus vinos: no saca nada antes de que esté a punto.'),
  ('campeon',     'Tiene la vitrina del club llena de copas y una foto con el intendente. Afiladísimo y con el farol siempre cargado, juega para ganar y que se note.'),
  ('arriero',     'Cruzó la cordillera a caballo mil veces, arreando hacienda con nieve hasta las rodillas. A este no le tiembla el pulso ni cuando el juego se pone bravo.'),
  ('montanesa',   'Guía de montaña, se conoce cada sendero y cada cambio de viento del cerro. Aire de altura: parece ver tus cartas desde arriba, y rara vez le falla el cálculo.'),
  ('coneja',      'Le dicen la Coneja por lo rápida y lo escurridiza; nadie la agarra dos veces igual. Impredecible y filosa, te descoloca con jugadas raras que no tendrían que salir… y salen.'),
  ('bombisto',    'Toca el bombo legüero en cada fogón y peña de la zona desde pibe. Marca el ritmo del duelo como la chacarera: sabe cuándo apurar y cuándo dejar picar.'),
  ('siestero',    'Defensor acérrimo de la siesta sagrada; para él, el que no duerme no piensa. Parece dormido toda la mano… hasta que abre un ojo y te canta el vale cuatro.'),
  ('bruja',       'Curandera del pueblo, cura el empacho y el mal de ojo con las manos y unas hierbas. Dicen que te ve las cartas en el humo del sahumerio, y por las dudas nadie la desafía dos veces.'),
  ('coplero',     'Coplea en las vidalas con la caja bajo el brazo y una rima para cada ocasión. Cada canto suyo rima… y casi siempre termina con vos diciendo «quiero» sin querer.'),
  ('mudo',        'Nadie le escuchó nunca la voz, ni sabe de dónde salió ni dónde vive. La leyenda del truco santiagueño: juego perfecto, cara de nada, imposible de leer.')
) as v(slug, t)
where cr.slug = v.slug;

commit;

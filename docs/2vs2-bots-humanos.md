# Cómo se juega el 2vs2 en la vida real, y qué de eso hacen los bots

Estudio de la mesa de a cuatro —los roles, los cantos, las señas y, sobre todo,
**cómo se habla**— y la lista de qué de todo eso quedó adentro de Trucazo, qué
quedó afuera a propósito y por qué.

---

## 1. La mesa: quién es quién

Cuatro jugadores sentados alternados: cada uno tiene a su compañero **enfrente**
y a los dos rivales a los costados. (En Trucazo es igual: los asientos 0 y 2 son
un equipo, 1 y 3 el otro.)

Dos palabras que se usan todo el tiempo:

- **Mano**: el que juega primero en la ronda. Va rotando.
- **Pie**: el **último** de cada equipo en jugar. Es el que más información
  tiene, porque vio jugar a casi todos antes de decidir.

De ahí sale el dicho de mesa: **"el pie manda"**. Como el pie juega último,
tradicionalmente es el que canta el envido y el que decide los cantos grandes;
el compañero "le deja la cancha". En algunas mesas se lleva más lejos todavía:
*el truco lo contesta el más cercano a la mano, y el envido lo contesta el pie*.

> **En Trucazo esto no lo cambiamos.** Ya estaba decidido (D1 en
> `2vs2-auditoria.md`): responde el primero del equipo contando desde la mano, y
> si en ese equipo hay una persona y un bot, **responde siempre la persona**
> mientras pueda. Es una simplificación deliberada: la persona nunca se queda
> mirando cómo el bot contesta por ella.

---

## 2. Los cantos: qué cambia respecto del mano a mano

La diferencia de fondo es una sola, y lo tiñe todo: **lo que hace uno compromete
a los dos**.

| Lo que pasa | Consecuencia real en la mesa |
|---|---|
| Uno canta truco | Quedan cantados los dos. Si el compañero no tenía nada, se embroma igual. |
| Uno se va al mazo | **Cierra la mano para los dos.** Por eso se escucha "¡no te vayas!", "aguantá". |
| El envido | Se declara por orden desde la mano; el que no supera dice "son buenas". |
| El tanto del equipo | Es **el mejor de los dos**, nunca la suma. |

Esa última fila es la que explica la mitad de lo que se habla en una mesa de a
cuatro: si tu compañero tiene 30 y vos tenés 20, tu 20 no sirve para nada, pero
**saber que él tiene algo** te cambia la respuesta. Ahí aparece la comunicación.

---

## 3. Las señas (y por qué Trucazo no las tiene)

En la mesa de verdad, apenas se levantan las cartas, cada uno le transmite al
compañero lo que tiene con la cara. Las universales:

| Carta | Seña |
|---|---|
| Ancho de espada | Levantar las dos cejas |
| Ancho de basto | Guiñar un ojo |
| Siete de espada | Correr la boca a la derecha |
| Siete de oro | Correr la boca a la izquierda |
| Los tres | Morderse el labio de abajo |
| Los dos | Tirar un besito |
| Anchos falsos (1 de copa/oro) | Abrir la boca como un pescado |
| No tengo nada | Cerrar los ojos un segundo |
| Tengo envido | Arrugar la nariz |

**Trucazo no tiene señas y no las va a tener.** Ya estaba decidido y escrito en
`2vs2-entrega.md`: no hay canal privado entre compañeros. Una seña es
información secreta que el rival no puede ver, y eso online es indistinguible de
hacer trampa.

Pero hay una versión de las señas que sí es legal en cualquier mesa, y es la que
Trucazo sí tiene: **decirlo en voz alta**. "Estoy seco", "algo tengo", "cantale".
Lo escucha todo el mundo, incluido el rival, y **puede ser mentira**. Eso es
exactamente el chat rápido que ya está en la partida.

---

## 4. Cómo se habla: el corazón del asunto

### Cómo se llaman entre sí

Al compañero casi nunca se lo llama por el nombre completo. Se usa, más o menos
en este orden de frecuencia: **compañero**, **compa**, **socio**, **che**, el
apodo, y en tono de arenga **maestro**, **fiera**, **crack**, **campeón**.

Al rival se lo trata en segunda persona y en plural ("¿se animan?", "vengan"), o
directamente con la chicana: **mentiroso**, **caradura**, **achicate**.

### Lo que se le dice al compañero

Siempre vago, nunca una carta concreta. Lo típico:

| Momento | Lo que se dice |
|---|---|
| Antes de cantar | "¿Qué hago?", "¿cantamos?" |
| Dándole permiso | "Cantá tranquilo que te sigo", "andá que voy con vos", "no te achiques" |
| Frenándolo | "Ojo", "guardala", "pará, pará" |
| Avisando que no tiene | "Estoy seco", "estoy pelado", "no me queda nada" |
| Avisando que sí tiene | "Algo tengo", "tengo para pelearlo" |
| Repartiendo el trabajo | "Juego yo", "dejá que voy yo", "matala vos" |
| Festejando | "¡Esa!", "bien ahí compañero", "así se juega" |
| Consolando | "La próxima", "uh, por poco" |
| Pidiendo silencio | "Calladito", "menos charla" |

### Lo que se le dice al rival

"¿Te animás?", "¿tanto tenés?", "mentiroso", "achicate", "andá", "quereme y
ves", "pagá y después hablás". Y los **versos**: rimas hechas para cantar el
truco o el envido, que son parte del folklore del juego más que de la
estrategia.

### La regla de oro

**Nadie dice la verdad de sus cartas.** Lo que se dice es vago, exagerado o
directamente falso, y el rival escucha todo. Una mesa donde el que canta truco
avisa que está faroleando no es una mesa de truco.

Esto tiene una consecuencia directa para nosotros: **un bot nunca puede decir
una frase que delate su mano cuando canta.** Si cada vez que dice "esta mano ya
está" resulta que tiene el ancho de espada, a las tres partidas cualquiera lo
lee y el bot queda inservible. Sus cantos son actitud, no información.

La excepción es justamente la que existe en la mesa real: **cuando el compañero
le pregunta, le contesta la verdad** ("estoy seco", "algo tengo"). El rival lo
escucha —y también puede no creerle—, que es como funciona de verdad.

---

## 5. Qué implementamos de todo esto

| De la mesa real | En Trucazo |
|---|---|
| El compañero tiene nombre y cara | ✅ Los bots dejan de llamarse "Bot 1" y toman un nombre de jugador de la lista que ya usan los bots del lobby |
| Se habla en la mesa | ✅ El bot dice una frase suya cuando canta, cuando quiere, cuando no quiere, cuando se va al mazo, cuando acompaña un canto del compañero y cuando se cierra una mano |
| Te contestan cuando les hablás | ✅ Si le hablás a tu compañero bot, te contesta según cómo viene su mano de verdad |
| Le decís al compañero qué hacer, y te hace caso | ✅ Tres pedidos le cambian cómo juega **esa mano**: "¡Cantales, cantales!", "Algo tengo" y "Estoy seco" |
| La chicana al rival | ✅ Un bot rival te contesta de vez en cuando, pero eso **no** le cambia el juego |
| "Calladito" | ✅ Los callás por el resto de la mano |
| Señas | ❌ A propósito: es un canal privado, decisión ya tomada |
| El pie es el que canta y el que responde el envido | ❌ A propósito: responde la persona antes que el bot (D1), para que nadie se quede mirando |
| Versos rimados largos | ❌ No entran en un globito y en pantalla se leen como spam |

### Los tres pedidos que el bot obedece

Solo los del **compañero**, y solo dentro de la mano en la que se dijeron. Lo
que grita un rival **nunca** le cambia el juego al bot — si no, alcanzaría con
llenar el chat para manejarle la partida al de enfrente.

| Le decís | El bot… |
|---|---|
| **"¡Cantales, cantales!"** (o "¡Quiero!") | Se anima bastante más a cantar truco y a aceptar el que le canten |
| **"Algo tengo"** | Baja el listón del envido: lo canta y lo acepta con menos tantos, porque el tanto del equipo es el mejor de los dos |
| **"Estoy seco"** (o "No me queda nada, eh") | Se guarda: casi no canta y se pone más exigente para aceptar |

Es un **empujón, no una orden**: le mueve las ganas, no la mano. Con cartas muy
buenas acepta igual aunque le hayas dicho que estás seco, y con cartas muy malas
no canta vale cuatro por más que le grites. Igual que una persona.

---

## 6. Cómo está hecho (para quien toque el código)

- **Todo vive en el servidor**, como el resto del juego. Las frases son un
  catálogo en la tabla `team_bot_lines`: agregar o sacar una frase es un
  `insert` o un `delete`, no hay que tocar ninguna función.
- **El chat rápido pasa por el servidor** (`team_say`). Antes viajaba de
  navegador a navegador y el servidor ni se enteraba; por eso el bot no podía
  escucharlo. De paso, ahora los cuatro ven lo mismo: antes cada pantalla se
  enteraba por su cuenta.
- **El chat no cuenta como jugada**: no toca el reloj del turno ni el número de
  versión de la mesa. Esto es importante — si lo tocara, un rival podría
  invalidarte la jugada a fuerza de mandar mensajes.
- **Solo se pueden mandar las frases de la lista.** El servidor rechaza
  cualquier otro texto, así que nadie puede escribir lo que quiera en una
  pantalla ajena. La lista está en `src/lib/emotes.ts` y espejada en SQL; el
  revisor automático del repositorio comprueba que no se desincronicen.
- **Las frases con retraso**: cuando un bot habla, su frase queda agendada medio
  segundo o un segundo después. Si contestara en el mismo instante se notaría
  que es una máquina.

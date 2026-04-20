/**
 * src/bot/frases.js
 * Frases colombianas, textos guía y helpers de envío de mensajes.
 */
const { textToSpeech, wavToOgg, NO_AI_MODE } = require("../utils/gemini")

// ══════════════════════════════════════════════════════════════════
//  FRASES COLOMBIANAS PRE-ESCRITAS POR STEP
// ══════════════════════════════════════════════════════════════════
const FRASES = {
  bienvenida: [
    "¡Ey, qué más pues! Bienvenido a Empanadas Sumercé, la mejor empanada colombiana en toda Ciudad Juárez, ¡juepucha! Por favor revisa el menú que te mandé y escribe el número de lo que se le antoje, parcero.",
    "¡Ay, qué chimba que me escribió! Bienvenido mi amor, esto es Empanadas Sumercé, empanadas colombianas auténticas acá en Juárez. Dale un vistazo al menú y escríbeme el numerito de lo que quieras, ¿listo?",
    "¡Hola hola hola, parcero! Bienvenido a Empanadas Sumercé. Aquí le tenemos las mejores empanadas colombianas de este lado de la frontera, ¡berraco! Mire el menú y escríbame el número de su opción para arrancar.",
    "¡Uy parce, qué bueno que llegó! Esto es Empanadas Sumercé, empanadas colombianas auténticas aquí en Juárez. Dele un ojo al menú y escríbame el número de lo que se le antoje, ¿vamos?",
    "¡Bienvenido parcero! Le saluda Empanadas Sumercé, trayendo el sabor de Colombia directo a Ciudad Juárez. Revise el menú y dígame el número de su opción, que aquí estamos pa' servirle.",
    "¡Quiubo parcero, bienvenido! Usted llegó al lugar correcto: Empanadas Sumercé, lo más colombiano que va a encontrar en Juárez. Mire el menú con calma y escríbame el número que quiera.",
    "¡Ay juepucha, qué alegría que nos escribió! Bienvenido a Empanadas Sumercé. Tenemos las empanadas más ricas de la ciudad, eso sí se lo garantizo. Revise el menú y escríbame su opción.",
    "¡Hola mi amor, bienvenido a Sumercé! Empanadas colombianas fresquitas y buenísimas, acá en Ciudad Juárez. Dele una miradita al menú que le mandé y escríbame el número de lo que quiera ordenar.",
    "¡Ey ey ey, bienvenido! Usted está hablando con Empanadas Sumercé, el sabor colombiano que vino a conquistar Juárez. Revise el menú y dígame qué le provoca con el número correspondiente, parcero.",
    "¡Qué bueno que llegó, parcero! En Empanadas Sumercé le tenemos el saborcito colombiano que andaba buscando. Chismosee el menú y escríbame el número de la opción que se le antoje, ¡arrancamos!",
  ],
  pedir_nombre: [
    "¡Ay qué chimba que va a pedir! Pero antes de arrancar con su pedido, necesito saber cómo se llama pues. Escríbame su nombre completo para tenerlo en el sistema, mi amor.",
    "¡Uy juepucha! Es la primera vez que pide con nosotros, qué emoción. Para registrarlo bien en el sistema, ¿me escribe su nombre completo? Solo se lo pido esta vez, parcero.",
    "¡Bienvenido a su primera empanada con Sumercé! Para llevar todo bien en el sistema, escríbame su nombre completo, que esto es rapidito y no lo molesto más con eso.",
    "¡Qué bueno que va a pedir! Antes de empezar, necesito registrarlo en nuestro sistema. ¿Me escribe su nombre completo por favor? Es solo esta primera vez, parcero.",
    "¡Listo, vamos a arrancar! Solo necesito saber su nombre para tenerlo en el sistema. Escríbame su nombre completo y después sí le tomo el pedido a toda máquina.",
    "¡Uy qué emoción, un cliente nuevo! Para atenderle bien y tener sus datos, escríbame su nombre completo por favor. Solo esta vez se lo pido, mi amor.",
    "¡Hola parcero! Veo que es su primera vez con nosotros, ¡qué chimba! Para registrarlo rapidito en el sistema, ¿me escribe su nombre completo? Prometo no tardarnos.",
    "¡Bienvenido a la familia Sumercé! Para empezar necesito su nombre, es solo este primer pedido que se lo pido. Escríbame su nombre completo y seguimos.",
    "¡Ay berraco, primer pedido! Qué emoción. Para tenerle en el sistema escríbame su nombre completo por favor, parcero. Es rapidito y con eso ya arrancamos.",
    "¡Qué bacano que nos eligió! Antes de tomar su pedido, necesito un datico: ¿me escribe su nombre completo? Solo para tenerlo en el sistema, esta es la única vez que lo molesto con eso.",
  ],
  nombre_registrado: [
    "¡Qué chimba, ya lo tengo registrado! Ahora sí, vamos con su pedido. Mire el menú de empanadas y escríbame el número del tipo que se le antoja, parcero.",
    "¡Listo pues, ya quedó en el sistema! Ahora sí arrancamos. Dele un ojo al menú y dígame qué tipo de empanada le provoca hoy.",
    "¡Bacano, ya lo tengo! Ahora sí le tomo el pedido. Revise el menú y escríbame el número de la empanada que se le antoja, que tenemos de carne y de pollo y están una berraquera.",
    "¡Perfecto, quedó registrado! Ahora sí vamos a lo bueno. Mire el menú y dígame con el número cuál empanada le provoca más, parcero.",
    "¡Listo parcero, sistema actualizado! Ahora sí le atiendo con todo el gusto. Escríbame el número del tipo de empanada que se le antoja del menú de abajo.",
    "¡Qué bacano, ya está en el sistema! Ahora sí arrancamos con su pedido. Revise las opciones del menú y dígame el número de la empanada que quiere.",
    "¡Uy qué chimba, registrado y listo! Ahora sí vamos con las empanadas. Mire el menú y escríbame el número del tipo que más le guste, parcero.",
    "¡Perfecto mi amor, ya quedó! Con eso es suficiente, ahora sí le tomo el pedido. Escríbame el número del tipo de empanada que se le antoja.",
    "¡Berraco, ya lo tengo anotado! Ahora sí empezamos. Del menú que le mandé, escríbame el número del tipo de empanada que quiere, parcero.",
    "¡Todo listo en el sistema! Ahora sí vamos a lo rico. Revise el menú y dígame qué tipo de empanada le provoca hoy, escríbame el número.",
  ],
  pedir_empanada: [
    "¡Uy qué rico, va a pedir empanadas! Mire el menú parcero y dígame cuál se le antoja: si la de carne, la de pollo o la mixta. Escríbame el numerito.",
    "¡Ay juepucha, vamos a empezar con lo bueno! Revise el menú y dígame qué tipo de empanada le provoca. Tenemos de carne, de pollo y mixta, ¡todas una chimba!",
    "¡Bacano que va a pedir! Ahora dígame cuál empanada le antoja más. Mire las opciones del menú y escríbame el número correspondiente, parcero.",
    "¡Ey vamos arrancando! ¿Qué tipo de empanada le provoca hoy? Tenemos de carne, de pollo y mixta. Mire el menú y escríbame el número, parcero.",
    "¡A la orden! Dígame qué tipo de empanada quiere: carne, pollo o mixta. Mire el menú y escríbame el número, que todas están de rechupete.",
    "¡Uy qué rico, a pedir empanadas! ¿Cuál le llama más la atención: la de carne, la de pollo o la mixta? Revise el menú y escríbame el número parcero.",
    "¡Arrancamos! Escríbame el número del tipo de empanada que quiere. Tenemos de carne bien sazonada, de pollo jugoso y mixta con lo mejor de las dos, ¡todas una berraquera!",
    "¡Chimba, vamos con el pedido! Del menú escríbame el número del tipo de empanada que se le antoja hoy. Carne, pollo o mixta, todas están espectaculares.",
    "¡Listo pa' servirle! Dígame el número del tipo de empanada que quiere del menú: carne, pollo o la mixta que lleva las dos. Escríbame el numerito.",
    "¡Uy qué bueno, empanadas para hoy! ¿De cuál va a querer: carne, pollo o mixta? Mire el menú y dígame el número, que con eso arrancamos, parcero.",
  ],
  pedir_cantidad: [
    "¡Uy qué rico! Excelente elección mi amor. Ahora dígame cuántas empanadas va a querer, mire las opciones del menú o escríbame el número directamente.",
    "¡Esa es la vaina! Ahora lo importante: ¿cuántas empanaditas le mando? Revise las cantidades en el menú y dígame el número, o si quiere una cantidad diferente escríbala directamente.",
    "¡Juepucha qué buena elección! Listo, ya sé qué tipo quiere. Ahora dígame la cantidad: ¿cuántas empanadas le mando? Mire el menú o escriba el número directamente parcero.",
    "¡Qué chimba, excelente gusto! Ahora dígame cuántas empanadas va a querer. Revise las opciones del menú o escríbame el número que se le antoje directamente.",
    "¡Berraco, muy buena elección! Ahora la pregunta clave: ¿cuántas empanadas le preparo? Mire el menú o escríbame la cantidad directo, parcero.",
    "¡Perfecto, ya sé cuál quiere! Ahora dígame cuántas le mando. Mire las cantidades disponibles en el menú o escríbame el número que quiera directamente.",
    "¡Uy qué rico va a quedar eso! Ya sé el tipo, ahora dígame la cantidad. Revise el menú o escríbame directamente cuántas empanadas quiere, parcero.",
    "¡Bacano, muy buena esa elección! ¿Y cuántas va a querer? Mire las opciones del menú o si quiere una cantidad diferente escríbamela directamente.",
    "¡Eso es parcero! Ya con el tipo seleccionado, dígame cuántas empanadas le preparo. Revise el menú o escríbame el número que guste directamente.",
    "¡Ay qué chimba! Ahora sí la parte divertida: ¿cuántas empanadas va a querer? Mire las cantidades del menú y dígame el número o escríbalo directo si quiere otra cantidad.",
  ],
  pedir_entrega: [
    "¡Listo, ya tengo la cantidad! Ahora dígame cómo se las mando: ¿se las llevo a su casa o viene a recogerlas acá en la tienda? Escríbame el número del menú, parcero.",
    "¡Uy qué chimba, ya vamos avanzando! Dígame una cosa: ¿se las llevo a domicilio o va a pasar por ellas a la tienda? Revise las opciones y escríbame el número.",
    "¡Vamos muy bien parcero! Solo me falta saber cómo le entrego las empanadas. ¿A domicilio o recoge en tienda? Mire el menú y escríbame el numerito.",
    "¡Chimba, ya casi terminamos! Dígame cómo le llevo el pedido: ¿a domicilio o pasa a recoger en la tienda? Escríbame el número del menú parcero.",
    "¡Uy qué bacano! Ya sé cuántas quiere. Ahora dígame el método de entrega: ¿domicilio o recoger en tienda? Mire el menú y escríbame el número.",
    "¡Vamos muy bien! Una preguntita más: ¿cómo le entrego las empanadas? ¿A domicilio hasta su casa o viene a recogerlas por acá? Escríbame el número, parcero.",
    "¡Berraco, ya casi está el pedido! Solo dígame dónde le entrego: ¿domicilio o en tienda? Revise el menú y escríbame el número de su preferencia.",
    "¡Qué chimba, avanzando rápido! Ahora dígame: ¿le llevo las empanadas a su domicilio o pasa a recogerlas a la tienda? Escríbame el numerito.",
    "¡Ay qué rico! Ya tengo el pedido casi listo. Dígame cómo se las entrego: ¿domicilio o recoger en tienda? Mire las opciones y escríbame el número, parcero.",
    "¡Uy juepucha, ya casi listo! Solo me falta la forma de entrega. ¿Se las llevo a casa o viene por ellas? Revise el menú y dígame el número que prefiera.",
  ],
  pedir_direccion: [
    "¡Uy chimba, a domicilio! Con mucho gusto le llevamos las empanadas. Escríbame su dirección completa: calle, número y colonia, o si quiere comparta su ubicación por WhatsApp directamente.",
    "¡Perfecto parcero, domicilio a la orden! Para llevarle las empanaditas, escríbame su dirección: calle, número exterior, colonia. O si prefiere, comparta su ubicación por acá.",
    "¡A domicilio, qué chimba! Mándeme su dirección completa para llevarle las empanadas bien rápido: calle, número y colonia. O comparta la ubicación por WhatsApp si prefiere esa vaina.",
    "¡Uy qué bueno, domicilio! Para llevarle el pedido necesito su dirección completa: calle, número y colonia. O si le queda más fácil comparta su ubicación por WhatsApp.",
    "¡Perfecto, le llevamos el pedido! Escríbame su dirección completa: calle, número exterior e interior si aplica, y colonia. También puede compartir su ubicación por WhatsApp si prefiere.",
    "¡Berraco, domicilio para las empanadas! Dígame su dirección completa: calle, número y colonia por favor. O si lo prefiere comparta la ubicación de WhatsApp directamente.",
    "¡Uy qué chimba, a su casa! Para llevarle el pedido escríbame la dirección: calle, número y colonia. O mándeme su ubicación por acá si le queda más cómodo.",
    "¡A la orden con el domicilio! Necesito su dirección completa para llegar rapidito: calle, número exterior y colonia. O comparta su pin de ubicación por WhatsApp.",
    "¡Qué rico, le llevamos las empanadas hasta la puerta! Escríbame su dirección: calle, número y colonia. También puede compartir su ubicación por WhatsApp si gusta, parcero.",
    "¡Domicilio confirmado! Para llegarle bien, dígame su dirección completa: calle, número y colonia. O si prefiere, mándeme su ubicación de WhatsApp y le llegamos directo.",
  ],
  pedir_pago: [
    "¡Listo parcero, ya casi terminamos! Dígame cómo va a pagar: ¿efectivo cuando lleguen las empanadas o con tarjeta por un link seguro? Escríbame el número del menú.",
    "¡Vamos muy bien! Solo falta el pago. ¿Cómo va a cancelar: en efectivo o con tarjeta? Si es con tarjeta le mando un link de pago facilito. Escríbame el numerito.",
    "¡Casi listo, juepucha qué rápido! Dígame el método de pago: efectivo al recibir o tarjeta de crédito o débito. Mire el menú y escríbame el número.",
    "¡Uy qué chimba, ya casi terminamos! Solo dígame cómo va a pagar: efectivo o tarjeta. Si elige tarjeta le mando un link seguro. Escríbame el número del menú parcero.",
    "¡Bacano, un paso más! El método de pago: ¿efectivo cuando le lleguen las empanadas o tarjeta con link de pago? Mire las opciones y escríbame el número.",
    "¡Vamos muy bien parcero! Para terminar el pedido dígame cómo va a pagar: en efectivo o con tarjeta. Escríbame el número de su opción del menú.",
    "¡Ya casi está listo su pedido! Falta el método de pago. ¿Efectivo al recibir o tarjeta de crédito/débito? Revise el menú y escríbame el numerito, parcero.",
    "¡Uy berraco, qué rápido vamos! Solo queda el pago. ¿Cómo prefiere pagar: efectivo o tarjeta? Le mando el link si elige tarjeta. Escríbame el número.",
    "¡Perfecto, último trámite! Dígame cómo cancela: efectivo a la entrega o tarjeta con link de pago seguro. Mire el menú y dígame el número, parcero.",
    "¡Chimba, ya casi terminamos! Un paso más: el pago. ¿Efectivo o tarjeta? Escríbame el número del método que prefiera del menú de abajo.",
  ],
  pedir_factura: [
    "¡Listo con el pago! Una última pregunta parcero: ¿va a necesitar factura fiscal? Si necesita CFDI le pedimos sus datos del SAT, si no, le brincamos ese paso. Escríbame el número.",
    "¡Ya casi está todo listo! Solo dígame si necesita factura fiscal o no. Revise las opciones del menú y escríbame el número, que esto es el último paso antes de confirmar.",
    "¡Una preguntita más y listo! ¿Necesita factura? Si necesita su CFDI le pido los datos del SAT, si no, seguimos directo a confirmar el pedido. Escríbame la opción parcero.",
    "¡Uy qué chimba, ya casi terminamos! ¿Necesita factura fiscal por su pedido? Si dice que sí le pedimos sus datos del SAT rapidito. Escríbame el número, parcero.",
    "¡Listo con el método de pago! Ahora dígame: ¿necesita CFDI o factura? Si la necesita le pido sus datos del SAT, si no le saltamos ese paso. Mire el menú.",
    "¡Perfectísimo parcero! Ya solo falta saber si necesita factura fiscal. Si la necesita le pedimos los datos, si no confirmamos directo. Escríbame el número de su opción.",
    "¡Berraco, ya casi está! Una preguntita final: ¿requiere factura fiscal por este pedido? Revise las opciones del menú y escríbame el número, parcero.",
    "¡Uy qué rápido! Ya tenemos casi todo. Dígame si necesita factura o no: si la necesita le pido sus datos del SAT, si no vamos directo a confirmar. Escríbame el número.",
    "¡Un paso más y listo! ¿Va a necesitar factura fiscal? Si la necesita le pido RFC y datos del SAT. Si no, confirmamos el pedido ya. Escríbame el número del menú.",
    "¡Casi listos parcero! Dígame si requiere factura electrónica por su pedido: con CFDI o sin factura. Escríbame el número de su opción y seguimos.",
  ],
  pedir_rfc: [
    "¡Listo, le hacemos la factura! Para eso necesito su RFC, que son 12 o 13 caracteres. Escríbamelo por favor, lo ingresa en el chat normal.",
    "¡Con gusto le facturamos parcero! Escríbame su RFC, son 12 caracteres si es persona moral o 13 si es persona física.",
    "¡A la orden con la factura! Para procesarla necesito su RFC. Escríbamelo en el chat y yo lo registro en el sistema.",
    "¡Perfecto, vamos con la factura! Para generarla necesito su RFC completo, sin guiones ni espacios. Escríbamelo aquí en el chat.",
    "¡Chimba, le hacemos el CFDI! Para eso necesito su RFC: 12 caracteres si es empresa o 13 si es persona física. Escríbamelo por favor.",
    "¡Con mucho gusto le facturamos! Escríbame su RFC tal como aparece en la constancia del SAT. Son 12 o 13 caracteres según su tipo de persona.",
    "¡A la orden parcero! Para la factura necesito su RFC primero. Escríbamelo aquí en el chat, sin espacios ni guiones.",
    "¡Listo, vamos con los datos fiscales! Escríbame su RFC por favor, que son 12 o 13 caracteres y es el primero que necesito.",
    "¡Qué chimba, factura incluida! Para generarla escríbame su RFC completo. Son 12 caracteres para persona moral y 13 para persona física.",
    "¡Con gusto le tramitamos la factura! El primer dato que necesito es su RFC. Escríbamelo en el chat tal como aparece en sus documentos del SAT.",
  ],
  pedir_razon_social: [
    "¡Perfecto, ya tengo el RFC! Ahora escríbame su razón social o nombre completo exactamente como aparece en el SAT para que la factura quede bien.",
    "¡Bacano! Escríbame su razón social o nombre completo tal como está registrado ante el SAT.",
    "¡Ya casi listo con la factura! Solo me falta la razón social. Escríbamela tal cual aparece en el SAT y con eso terminamos.",
    "¡Perfecto, RFC registrado! Ahora necesito su razón social o nombre completo. Escríbamelo exactamente como aparece en el SAT, sin abreviaturas.",
    "¡Uy qué chimba, ya tengo el RFC! Ahora dígame su razón social completa: escríbamela igualita a como aparece en su constancia de situación fiscal.",
    "¡Listo con el RFC parcero! Falta la razón social. Escríbamela exactamente como está en el SAT, que si hay un error en la factura nos complica la vida a los dos.",
    "¡Bacano, un dato más! Escríbame su razón social completa tal como aparece registrada ante el SAT. Sin modificaciones ni abreviaturas por favor.",
    "¡Ya casi terminamos con los datos fiscales! Solo necesito su razón social o nombre completo. Escríbamelo exacto como en el SAT.",
    "¡Qué chimba, RFC listo! Ahora la razón social o nombre fiscal completo, igualito a como aparece en la constancia del SAT. Escríbamelo por favor.",
    "¡Perfecto parcero! Ya tengo el RFC, ahora escríbame la razón social exactamente como aparece en sus documentos del SAT, así la factura queda perfecta.",
  ],
  confirmar_datos: [
    "¡Uy juepucha, ya casi está listo su pedido! Revise el resumen que le mandé y si todo está correcto escríbame SÍ para confirmar, o CANCELAR si quiere salir.",
    "¡Eso es parcero, ya tenemos todo! Revise el resumen del pedido. Si está bien escríbame SÍ, si hay algo mal dígame CANCELAR.",
    "¡Qué chimba, ya completamos todos los pasos! Si está correcto escríbame SÍ, si no escríbame CANCELAR y arrancamos de nuevo.",
    "¡Listo parcero, ya casi está! Revise el resumen del pedido arriba y si todo está bien escríbame SÍ. Si hay algo que corregir escríbame CANCELAR.",
    "¡Uy berraco, qué rápido! Ya tenemos toda la info. Revise el resumen y si está correcto confirme con SÍ, o si prefiere salir escríbame CANCELAR.",
    "¡Chimba, ya completamos todo! Revise los detalles del pedido en el resumen. Si todo quedó bien escríbame SÍ, si no CANCELAR y arrancamos de cero.",
    "¡Qué bacano, ya están todos los datos! Revise el resumen de su pedido y si todo está correcto dígame SÍ. Si necesita cancelar escríbame CANCELAR.",
    "¡Uy qué chimba, ya casi las empanadas están en camino! Revise el resumen y si todo cuadra escríbame SÍ para confirmar. Si algo está mal escríbame CANCELAR.",
    "¡Perfecto parcero, ya tenemos todo el pedido! Chismosee el resumen que le mandé y si está bien escríbame SÍ. Si hay algo que no esté bien dígame CANCELAR.",
    "¡Juepucha, ya completamos todos los pasos! Dale una revisada al resumen del pedido. Si todo está bien escríbame SÍ, si algo falla escríbame CANCELAR y lo arreglamos.",
  ],
  pedido_confirmado: [
    "¡Uy qué chimba, pedido confirmado parcero! Ya le mandé el folio y el código de entrega. Empezamos a preparar sus empanadas y pronto le avisamos. ¡Muchas gracias por su pedido!",
    "¡Juepucha que rápido! Pedido confirmado con todo. Ya arrancamos con sus empanadas. Guarde el código de entrega que le mandé, lo va a necesitar cuando llegue el repartidor.",
    "¡Listo pues, pedido confirmado! Las empanadas van quedando buenísimas. Le mandé el folio y el código, guárdelo. En poquito le avisamos cuando estén listas.",
    "¡Uy berraco, pedido listo y confirmado! Ya arrancamos con la preparación. Guarde el folio y el código que le mandé, y en un momentito le tenemos sus empanadas.",
    "¡Qué chimba parcero, pedido confirmado! Ya le mandé su número de folio. Empezamos a preparar sus empanadas con todo el amor colombiano. ¡Gracias por pedir con Sumercé!",
    "¡Confirmado y listo! Pedido número registrado en el sistema. Sus empanadas ya están en preparación. Guarde el código de entrega, lo va a necesitar. ¡Gracias!",
    "¡Uy qué bacano, todo confirmado! Ya tenemos su pedido en cocina. Le mandé el folio y el código de entrega, guárdelos bien parcero. ¡Pronto le avisamos!",
    "¡Pedido confirmado, juepucha qué emoción! Sus empanadas ya están en preparación. Guarde el folio y el código que le mandé. ¡Muchas gracias por elegirnos!",
    "¡Chimba, pedido confirmado con éxito! Ya arrancamos con sus empanaditas. Le mandé el folio de su pedido y el código. Cuide ese código, lo necesitará a la entrega.",
    "¡Uy qué rico, todo confirmado parcero! Ya está en el sistema y empezamos a preparar sus empanadas. Folio y código ya le llegaron. ¡Gracias por su pedido, que no se arrepiente!",
  ],
  no_entendi: [
    "¡Ay juepucha, no le entendí lo que me escribió! Por favor escríbame el número de la opción del menú que le mandé, que así sí le entiendo parcero.",
    "¡Uy, perdón parcero pero no entendí eso! Revise el menú que le mandé y escríbame solo el número de la opción que quiere. Así le entiendo rapidito.",
    "¡Ay berraco, no capté lo que me dijo! No se me enoje, por favor escríbame el número de su opción del menú. Solo el número y con eso arrancamos.",
    "¡Uy parcero, no le entendí bien! Por favor mire el menú y escríbame solo el número de su opción. Con el número sí le entiendo rapidito.",
    "¡Ay juepucha, me perdí! No capté lo que me escribió. Por favor escríbame el número de la opción del menú, que así sí le atiendo bien.",
    "¡Uy, berraco! No entendí su mensaje. Para que pueda ayudarle bien, por favor escríbame el número de la opción del menú de abajo, solo el número.",
    "¡Ay mi amor, no le entendí! No se preocupe, pasa. Por favor escríbame el numerito de su opción del menú y arrancamos de una.",
    "¡Uy juepucha, no capturo! Perdone la demora parcero, pero necesito que me escriba el número de la opción del menú para poder ayudarle bien.",
    "¡Qué pena parcero, no le entendí! Por favor revise el menú que le mandé y escríbame solo el número de la opción que quiere elegir.",
    "¡Ay berraco! No capté su mensaje. Sin problema, por favor escríbame el número correspondiente del menú y seguimos pa' lante.",
  ],
  evento: [
    "¡Uy qué chimba, un evento! Con mucho gusto le cotizamos. Dígame cuántas empanadas aproximadamente necesita para el evento y un asesor le contacta pronto con el precio.",
    "¡Bacano, para evento! Escriba el número aproximado de empanadas que necesita y un asesor de Sumercé le llama o escribe pronto con todos los detalles y el precio.",
    "¡Ay qué emoción, una cotización para evento! Dígame cuántas empanadas necesita aproximadamente y nosotros le damos el precio y coordinamos todo. ¡A la orden!",
    "¡Uy qué chimba, un evento con empanadas colombianas! Eso sí que sabe. Dígame cuántas empanadas aproximadamente necesita y un asesor le contacta pronto con la cotización.",
    "¡Qué bacano, eventos con Sumercé! Tenemos paquetes especiales para eventos. Dígame cuántas empanadas necesita aproximadamente y le coordinamos todo rápido.",
    "¡Ay juepucha, evento! Qué emoción. Para cotizarle bien necesito saber cuántas empanadas aproximadas necesita. Escríbame la cantidad y un asesor le contacta pronto.",
    "¡Un evento con nuestras empanadas, qué chimba! Para darle el mejor precio dígame cuántas empanadas necesita aproximadamente y le enviamos cotización completa.",
    "¡Uy berraco, cotización para evento! Con todo el gusto le ayudamos. ¿Cuántas empanadas necesita más o menos? Con ese dato le contacta un asesor rápidamente.",
    "¡Qué bacano, empanadas para su evento! Tenemos precios especiales para pedidos grandes. Dígame la cantidad aproximada y le mandamos cotización pronto, parcero.",
    "¡Ay qué chimba, evento con Sumercé! Sus invitados van a quedar encantados. Para cotizarle bien, escríbame cuántas empanadas necesita aproximadamente y le contactamos pronto.",
  ],
  datos_cliente_confirmacion: [
    "¡Perfecto, ya tengo sus datos registrados! Ahora sí arrancamos con el pedido, que ya sé quién es el parcero que va a disfrutar las empanadas.",
    "¡Bacano, ya quedó registrado en el sistema! Ahora sí le tomo el pedido, que con gusto le atendemos desde hoy.",
    "¡Listo pues, ya lo tengo en el sistema! Ahora sí empezamos con su pedido. ¡A la orden parcero!",
    "¡Qué chimba, datos registrados y listo! Ahora sí vamos con las empanadas. Mire el menú y dígame qué se le antoja hoy.",
    "¡Perfecto mi amor, ya quedó todo registrado! Ahora sí le tomo el pedido completo. Revise el menú y dígame qué quiere.",
    "¡Uy qué bacano, ya lo tengo en el sistema! Bienvenido a la familia Sumercé. Ahora sí empezamos con su pedido, escríbame su opción del menú.",
    "¡Berraco, datos confirmados! Ya está en el sistema parcero. Ahora sí vamos con lo rico: mire el menú y dígame qué tipo de empanada se le antoja.",
    "¡Listo y registrado! Ahora sí le atiendo con todo el gusto. Revise el menú y escríbame el número de lo que quiere ordenar, parcero.",
    "¡Chimba, ya quedó en el sistema! Con eso es suficiente, ahora sí vamos con su pedido. Mire las opciones del menú y escríbame el número.",
    "¡Uy qué bacano, ya está registrado! Bienvenido. Ahora sí empezamos con lo bueno: dígame el número del tipo de empanada que quiere del menú de abajo.",
  ],
  cantidad_custom: [
    "¡Uy qué chimba, cantidad personalizada! Dígame exactamente cuántas empanadas quiere parcero.",
    "¡Bacano, cantidad a su gusto! Escríbame el número de empanadas que se le antoja.",
    "¡A la orden! Solo escríbame el número exacto de empanadas que necesita, sin letra ni punto.",
    "¡Qué rico, cantidad libre! Escríbame cuántas empanadas quiere exactamente, solo el número por favor.",
    "¡Perfecto, cantidad personalizada! Dígame el número exacto de empanadas que necesita, parcero.",
    "¡Uy qué bacano! Escríbame la cantidad exacta de empanadas que quiere, solo el número sin nada más.",
    "¡A la orden parcero! ¿Cuántas empanadas exactamente? Escríbame solo el número y yo lo anoto.",
    "¡Chimba, cantidad a su medida! Escríbame el número exacto de empanadas que se le antoja hoy.",
    "¡Qué bueno, cantidad personalizada! Solo dígame el número exacto de empanadas y con eso arrancamos.",
    "¡Uy berraco, a su gusto! Escríbame cuántas empanadas quiere exactamente, el número nada más, parcero.",
  ],
  agregar_mas_sabores: [
    "¡Uy juepucha, excelente selección! ¿Quiere agregar otro sabor de empanadas o ya es todo?",
    "¡Qué rico se ve su pedido! ¿Agrega más sabores o vamos al siguiente paso, parcero?",
    "¡Bacano el combo! ¿Quiere meter más empanadas de otro sabor o seguimos adelante?",
    "¡Uy qué chimba ese pedido! ¿Le agrego otro tipo de empanada o con eso está bien, parcero?",
    "¡Qué rico va a quedar eso! ¿Quiere agregar empanadas de otro sabor o avanzamos al siguiente paso?",
    "¡Berraco, buen pedido! ¿Agrega más sabores al combo o continuamos con la entrega, parcero?",
    "¡Uy qué bacano! ¿Quiere añadir otro tipo de empanada o ya está listo para seguir?",
    "¡Chimba el pedido! ¿Le metemos otro sabor más o con estos está y avanzamos?",
    "¡Perfecto lo que lleva! ¿Quiere agregar empanadas de otro tipo o seguimos adelante con el pedido?",
    "¡Uy qué rico! ¿Sumamos otro sabor al pedido o ya con estos está bien y continuamos, parcero?",
  ],
  datos_fiscales_cp: [
    "¡Perfecto con el RFC y la razón social! Ahora necesito el *código postal fiscal* (5 dígitos) de su constancia del SAT.",
    "¡Todo bien! Falta el código postal fiscal. Escríbamelo tal como aparece en su constancia, son 5 dígitos.",
    "¡Casi listo parcero! Escríbame el código postal fiscal (5 dígitos) de su domicilio fiscal ante el SAT.",
    "¡Chimba, ya tenemos RFC y razón social! Solo falta el código postal fiscal de su constancia del SAT. Son 5 dígitos, escríbamelo.",
    "¡Uy qué bacano, casi terminamos! Ahora necesito su código postal fiscal: son 5 dígitos y aparece en su constancia de situación fiscal del SAT.",
    "¡Perfecto parcero! Ya tengo el RFC y la razón social. Ahora el código postal fiscal (5 dígitos) de su domicilio ante el SAT, por favor.",
    "¡Listo, ya casi terminamos con los datos fiscales! Escríbame el código postal fiscal (5 dígitos) que aparece en su constancia del SAT.",
    "¡Uy qué chimba, ya casi! Falta el código postal fiscal nada más. Son 5 dígitos y aparece en su constancia de situación fiscal. Escríbamelo.",
    "¡Bacano, dos datos ya tenemos! Solo falta el código postal fiscal (5 dígitos) de su constancia del SAT y terminamos con la factura.",
    "¡Berraco, ya casi listo con la factura! Escríbame su código postal fiscal: 5 dígitos exactos como aparecen en su constancia del SAT.",
  ],
  datos_fiscales_razon: [
    "¡Listo con el RFC, ahora la razón social! Escríbamela exactamente como aparece en el SAT, parcero.",
    "¡Perfecto! Ahora escríba su razón social tal cual está registrada ante el SAT, sin abreviaturas.",
    "¡Bacano! La razón social debe ser exactamente como aparece en sus papeles del SAT, escríbamela.",
    "¡Chimba, RFC anotado! Ahora necesito la razón social completa tal como aparece en su constancia del SAT.",
    "¡Uy qué bacano! Ya tengo el RFC. Ahora escríbame la razón social exacta, igualita a como está en el SAT.",
    "¡Perfecto parcero! RFC registrado. Ahora dígame su razón social o nombre completo exactamente como aparece en el SAT.",
    "¡Listo el RFC! Ahora la razón social por favor. Escríbamela exacta, sin abreviaturas, tal como aparece en su constancia fiscal.",
    "¡Berraco, ya tenemos el RFC! Falta la razón social. Escríbamela tal cual está en sus documentos del SAT, sin cambiar nada.",
    "¡Qué chimba, RFC listo! Ahora escríbame su razón social completa, igualita a como aparece registrada ante el SAT.",
    "¡Anotado el RFC! Un dato más: escríbame la razón social exactamente como aparece en su constancia de situación fiscal del SAT.",
  ],
  datos_fiscales_regimen: [
    "¡Uy qué chimba, casi terminamos con la factura! Seleccione su régimen fiscal del menú de arriba, parcero.",
    "¡Perfecto con el código postal! Ahora solo falta su régimen fiscal, mire el menú y escríbame el número.",
    "¡Vamos bien! Último paso: su régimen fiscal. Seleccione del menú de abajo el que corresponde a su situación.",
    "¡Ya casi terminamos con los datos fiscales! Dígame su régimen fiscal del menú de abajo, parcero. Es el último dato.",
    "¡Chimba, casi listos con la factura! Solo falta el régimen fiscal. Mire las opciones del menú y escríbame el número.",
    "¡Uy berraco, ya casi! Último datico: su régimen fiscal. Revise el menú y escríbame el número correspondiente.",
    "¡Perfecto, ya tenemos casi todo para la factura! El último dato es el régimen fiscal. Seleccione del menú el que le corresponde.",
    "¡Bacano, ya casi terminamos! Solo falta el régimen fiscal. Mire el menú con las opciones y escríbame el número, parcero.",
    "¡Uy qué chimba, el último paso de la factura! Escríbame el número de su régimen fiscal del menú de abajo.",
    "¡Qué bacano, ya casi listo el CFDI! Solo falta el régimen fiscal. Revise el menú y escríbame el número que corresponde a su situación.",
  ],
  calificar_tiempo: [
    "¡Qué chimba que llegó su pedido! Ahora nos gustaría saber: ¿Qué tal estuvo el tiempo de entrega, parcero? Calífiquenos del 1 al 5.",
    "¡Listo con su pedido! ¿Cómo nos fue en el tiempo de entrega? Déjenos una calificación del 1 al 5 estrellitas.",
    "¡Uy qué emoción, ya tiene sus empanadas! ¿Qué tal fue nuestro tiempo de entrega? Calífiquenos del 1 al 5.",
    "¡Uy qué chimba, ya tiene sus empanaditas! Ahora díganos: ¿cómo estuvo el tiempo de entrega? Déjenos su calificación del 1 al 5.",
    "¡Bacano, pedido entregado! ¿Qué tal el tiempo que tardamos en llegarle? Calífiquenos del 1 al 5, siendo 5 excelente.",
    "¡Uy juepucha, ya están ahí las empanadas! ¿Cómo califica el tiempo de entrega? Del 1 al 5 por favor, su opinión nos importa mucho.",
    "¡Qué rico, ya llegó su pedido! Ayúdenos con una calificación del tiempo de entrega del 1 al 5. ¿Cómo nos fue, parcero?",
    "¡Listo, pedido entregado! ¿Qué tan rápido llegamos? Calífiquenos en tiempo de entrega del 1 al 5 estrellitas.",
    "¡Uy qué bacano, ya tiene sus empanadas! ¿Qué tal el tiempo que tardamos? Del 1 al 5 por favor, parcero.",
    "¡Chimba, ya están sus empanadas! Para mejorar cada día, díganos: ¿cómo estuvo el tiempo de entrega? Calificación del 1 al 5.",
  ],
  comentario_tiempo: [
    "¡Gracias por la calificación! Ahora, ¿tiene algún comentario sobre la entrega? Su opinión nos ayuda a mejorar.",
    "¡Anotado! Si tiene algún comentario sobre cómo fue la entrega, compártalo con nosotros por favor.",
    "¡A la orden! Cuéntenos cómo le pareció la entrega, cualquier sugerencia es bienvenida parcero.",
    "¡Chimba, gracias por calificarnos! ¿Tiene algún comentario adicional sobre la entrega? Cualquier detalle nos ayuda a mejorar.",
    "¡Uy qué bacano, gracias por la calificación! Si quiere dejarnos algún comentario sobre la entrega, acá lo escuchamos con gusto.",
    "¡Gracias parcero! ¿Hay algo específico que quiera comentarnos sobre la entrega? Bueno o malo, todo nos ayuda a mejorar.",
    "¡Anotada la calificación! Cuéntenos si tiene alguna observación sobre la entrega, cualquier sugerencia es bienvenida.",
    "¡Qué chimba, gracias! Si quiere agregar algo más sobre cómo fue la entrega, cuéntenos con confianza parcero.",
    "¡Muchas gracias por su calificación! ¿Tiene algún comentario sobre el proceso de entrega que quiera compartir?",
    "¡Uy berraco, gracias! Si tiene algo que decirnos sobre la entrega, ya sea bueno o para mejorar, cuéntenos parcero.",
  ],
  calificar_producto: [
    "¡Perfecto con sus comentarios! Ahora hablemos de lo importante: las empanadas. ¿Qué tal el sabor, parcero? Calífiquelas del 1 al 5.",
    "¡Listo! Ahora la pregunta del millón: ¿Cómo estuvo la empanada? Déjenos una calificación del 1 al 5.",
    "¡Uy qué importante! ¿Cómo le pareció el sabor y la calidad de nuestras empanadas, parcero? Del 1 al 5 por favor.",
    "¡Chimba, gracias por lo de la entrega! Ahora lo más importante: ¿cómo estuvieron las empanadas? Calífiquelas del 1 al 5.",
    "¡Uy qué bacano! Ahora la pregunta que más nos importa: ¿qué tal el sabor de las empanadas? Del 1 al 5 por favor, parcero.",
    "¡Perfecto! Ahora hablemos de las empanadas: ¿qué tal estuvieron? Déjenos una calificación del 1 al 5 estrellitas.",
    "¡Gracias! Y lo más importante: las empanadas. ¿Cómo estuvo el sabor y la calidad? Califíquelas del 1 al 5, parcero.",
    "¡Uy qué chimba, ya casi terminamos! Ahora la calificación de nuestras empanadas: sabor, textura, todo. Del 1 al 5 por favor.",
    "¡Listo con la entrega! Ahora la estrella del show: ¿cómo estuvieron las empanadas? Califíquelas del 1 al 5, parcero.",
    "¡Berraco, ya casi terminamos la encuesta! ¿Qué tal el sabor de las empanadas? Del 1 al 5 estrellitas, siendo 5 espectacular.",
  ],
  comentario_producto: [
    "¡Gracias por la calificación! ¿Tiene alguna sugerencia de mejora o comentario sobre las empanadas?",
    "¡Anotado! Si quiere dejar un comentario sobre el sabor o alguna sugerencia, cuéntenos con confianza.",
    "¡A la orden! Sus comentarios sobre las empanadas nos ayudan a cada vez hacerlas más chimba, parcero.",
    "¡Uy qué chimba, gracias por calificarnos! ¿Tiene algún comentario sobre el sabor o la calidad de las empanadas?",
    "¡Bacano, gracias por la calificación! Si quiere decirnos algo sobre las empanadas, ya sea un elogio o sugerencia, cuéntenos.",
    "¡Gracias parcero! ¿Hay algo específico que quiera comentar sobre las empanadas? Cualquier opinión nos ayuda a mejorar.",
    "¡Anotada la calificación! Si tiene alguna sugerencia o comentario sobre el sabor, textura o calidad, cuéntenos con confianza.",
    "¡Uy qué bacano, gracias! Si quiere agregar algo sobre las empanadas, ya sea positivo o para mejorar, acá lo escuchamos.",
    "¡Muchas gracias por su calificación! ¿Algo que quiera comentarnos sobre las empanadas para hacerlas aún más ricas?",
    "¡Gracias berraco! Si tiene alguna observación sobre las empanadas, buena o mala, cuéntenos parcero que todo nos sirve.",
  ],
  pago_fallido_opciones: [
    "¡Uy juepucha, hubo un problema con el pago! No se preocupe parcero, le ofrecemos dos opciones: pagar en efectivo o cancelar el pedido.",
    "¡Ay berraco, el pago no se procesó! Pero tranquilo, puede pagar en efectivo cuando llegue o cancelar si lo prefiere.",
    "¡Parcero, pasó algo con el pago! No hay problema, ofrecemos que pague en efectivo o cancelamos todo sin cobrar, ¿cuál prefiere?",
    "¡Uy chimba, problema con el pago! No se preocupe, pasa. Le ofrezco dos opciones: pago en efectivo a la entrega o cancelamos el pedido sin costo.",
    "¡Ay juepucha, el pago no pasó! No hay drama parcero. Puede pagar en efectivo cuando le llegue el pedido o si prefiere cancelamos todo.",
    "¡Uy berraco, problema con el pago! Tranquilo que tiene solución: o cambiamos a efectivo o cancelamos el pedido. ¿Cuál prefiere, parcero?",
    "¡Ay no, el pago falló! Pero no se preocupe, estamos para ayudarle. ¿Quiere pagar en efectivo o prefiere cancelar el pedido?",
    "¡Uy juepucha, pasó algo con el pago! No es problema, le tenemos solución: efectivo a la entrega o cancelamos sin ningún cobro. ¿Qué prefiere?",
    "¡Ay parcero, el pago no se procesó! Sin problema, le damos dos opciones: cambiamos a efectivo o si prefiere cancelamos el pedido ahora.",
    "¡Uy chimba, problema con la tarjeta! Tranquilo, tiene dos opciones: paga en efectivo cuando llegue o cancelamos el pedido. Dígame qué prefiere.",
  ],
}

function frase(key) {
  const pool = FRASES[key]
  if (!pool?.length) return ""
  return pool[Math.floor(Math.random() * pool.length)]
}

// ══════════════════════════════════════════════════════════════════
//  TEXTOS GUÍA
// ══════════════════════════════════════════════════════════════════
const GUIAS = {
  bienvenida: () =>
    `¡Ey, qué más parcero! 🇨🇴🥟\nBienvenido a *Empanadas Sumercé*.\nEscriba el número de lo que se le antoje del menú de abajo 👇`,
  pedir_nombre: () =>
    `¡Uy qué chimba que va a pedir! 😄\nAntes de arrancar, ¿me escribe su *nombre completo* por favor? Solo se lo pido esta vez.`,
  nombre_registrado: (nombre) =>
    `¡Bacano, ya lo tengo *${nombre}*! 👍\nAhora sí vamos con el pedido. Escríbame el *número* del tipo de empanada que se le antoja 👇`,
  pedir_empanada: () =>
    `¡Listo, arrancamos con el pedido! 🥟\nEscriba el *número* del tipo de empanada que quiere. Tenemos de carne, pollo y mixta 👇`,
  pedir_cantidad: (tipo) => {
    const t = { emp_carne: "carne 🥩", emp_pollo: "pollo 🍗", emp_ambas: "mixta 🍽️" }
    return `¡Excelente elección, de ${t[tipo] || tipo}! 👌\nAhora dígame *¿cuántas empanadas?* Seleccione del menú o escriba el número directamente 👇`
  },
  pedir_entrega: (cant) =>
    `¡Uy qué chimba, *${cant} empanada${cant > 1 ? "s" : ""}*! 🔥\nAhora dígame: ¿cómo le llevo su pedido? Escríbame el *número* de la opción 👇`,
  pedir_direccion: () =>
    `¡A domicilio parcero! 🏠\nEscríbame su *dirección completa* (calle, número, colonia) o comparta su 📍 *ubicación* por WhatsApp:`,
  direccion_ok: (dir) =>
    `✅ ¡Listo, dirección registrada!\n_${dir}_\n\nAhora dígame cómo va a pagar 👇`,
  pedir_pago: () =>
    `💳 Ya casi terminamos parcero!\nEscríbame el *número* del método de pago 👇`,
  pedir_factura: () =>
    `🧾 ¿Necesita *factura fiscal*?\nEscríbame el *número* de su respuesta 👇`,
  pedir_rfc: () =>
    `🧾 ¡Con gusto le facturamos!\nEscríbame su *RFC* (12 o 13 caracteres):`,
  pedir_razon: () =>
    `✅ ¡RFC registrado!\nAhora escríbame su *razón social* exactamente como aparece en el SAT:`,
  pedir_cp_fiscal: () =>
    `📮 ¡Casi listo con la factura!\nEscríbame el *código postal fiscal* (5 dígitos) que aparece en su constancia del SAT:`,
  pedir_regimen: () =>
    `🏛️ ¡Perfecto, ya tengo el CP!\nAhora seleccione su *régimen fiscal* del menú de abajo 👇`,
  confirmar: (resumen) =>
    `${resumen}\n¿Todo correcto parcero?\nEscriba *SÍ* para confirmar o *CANCELAR* para salir 👇`,
  no_entendi: (step) => {
    const hints = {
      inicio:       "escribe el *número* de la opción del menú (ej: *1* para pedir empanadas)",
      tipo_empanada:"escribe *1* para carne, *2* para pollo o *3* para mixta",
      cantidad:     "escribe el *número* de la opción o la cantidad directamente (ej: *4*)",
      entrega:      "escribe *1* para domicilio o *2* para recoger en tienda",
      pago:         "escribe *1* para efectivo o *2* para tarjeta",
      factura:      "escribe *1* si necesita factura o *2* si no",
      datos_fiscales_regimen: "escribe el *número* del régimen fiscal del menú de arriba",
    }
    return `¡Uy juepucha, no le entendí! 😅\nPor favor ${hints[step] || "escribe el número de tu opción"}. Mire el menú de abajo 👇`
  },
  cantidad_custom: () =>
    `¡Excelente! Escríbame el *número exacto* de empanadas que quiere (sin punto ni letra, solo números) 👇`,
  agregar_mas_sabores: (total) =>
    `¡Qué chimba, ya tenemos *${total} empanada${total > 1 ? "s" : ""}*! 🔥\n¿Quiere agregar otro sabor o vamos al siguiente paso? Escríba el *número* de su opción 👇`,
  datos_fiscales_cp: () =>
    `📮 ¡Casi listo con la factura!\nEscríbame el *código postal fiscal* (5 dígitos) que aparece en su constancia del SAT:`,
  calificar_tiempo: () =>
    `⏱️ ¿Qué tal estuvo el *tiempo de entrega*? Calífiquenos del 1 al 5 ⭐ (siendo 5 excelente):`,
  calificar_producto: () =>
    `🥟 Ahora lo importante: ¿Qué tal estuvo el *sabor de las empanadas*? Calífiquelas del 1 al 5 ⭐:`,
}

// ══════════════════════════════════════════════════════════════════
//  HELPERS DE ENVÍO
// ══════════════════════════════════════════════════════════════════
async function sendText(sock, jid, text) {
  await sock.sendMessage(jid, { text })
}

async function sendAudio(sock, jid, fraseKey, textGuia, menuFn) {
  if (textGuia) await sendText(sock, jid, textGuia)

  if (NO_AI_MODE) {
    console.log(`🚫 [NO_AI_MODE] Audio omitido — "${fraseKey}"`)
    if (menuFn) await menuFn()
    return
  }

  const textoAudio = frase(fraseKey)
  console.log(`🎙️ [${fraseKey}] → "${textoAudio.slice(0, 60)}..."`)

  ;(async () => {
    try {
      const wavBuf = await textToSpeech(textoAudio)
      if (!wavBuf) return
      const oggBuf = await wavToOgg(wavBuf)
      await sock.sendMessage(jid, { audio: oggBuf, mimetype: "audio/ogg; codecs=opus", ptt: true })
    } catch (err) {
      console.error(`❌ Audio ${fraseKey}:`, err.message)
    }
  })()

  await new Promise(r => setTimeout(r, 300))
  if (menuFn) await menuFn()
}

module.exports = { FRASES, GUIAS, frase, sendText, sendAudio }
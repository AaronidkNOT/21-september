// Personal details for the adventure. Update this file when the story changes.
export const content = {
  couple: { first: 'Aaron', second: 'Eri', specialDate: '21 de septiembre' },
  intro: {
    eyebrow: 'UN MUNDO QUE FLORECE PARA VOS',
    titleTop: 'Feliz día de la',
    titleHighlight: 'primavera',
    titleBottom: 'mi flor amarilla',
    subtitle: 'Un regalito para este 21 en el cual no estoy presente con el amor de mi vida',
    start: 'Comenzar aventura'
  },
  zones: [
    { name: 'Pradera de flores amarillas', hint: 'Donde empezó nuestra historia', sky: 'meadow', background: './landscape.png' },
    { name: 'Bosque de recuerdos', hint: 'Cada momento, un tesoro', sky: 'forest', background: './biome-forest.png' },
    { name: 'Biblioteca del corazón', hint: 'Palabras guardadas para vos', sky: 'library', background: './biome-library.png' },
    { name: 'Valle de las canciones', hint: 'La banda sonora de nosotros', sky: 'music', background: './biome-music.png' },
    { name: 'Cielo de estrellas', hint: 'Nuestro próximo capítulo', sky: 'final', background: './biome-final.png' }
  ],
  gifts: [
    { icon: 'clock', title: 'Nuestra historia', tag: 'COFRE 01', description: 'Volvé a caminar por los momentos que nos trajeron hasta acá mi amor.' },
    { icon: '✦', title: 'Recuerdos', tag: 'COFRE 02', description: 'Recuerditos :D.' },
    { icon: '✉', title: 'Una carta', tag: 'COFRE 03', description: 'Una carta para vos mi amor.' },
    { icon: '♫', title: 'Nuestra música', tag: 'COFRE 04', description: 'Temones' },
    { icon: '♥', title: 'El último regalo', tag: 'COFRE 05', description: 'Una sorpresa para cuando abras abierto todo.' }
  ],
  timeline: [
    { date: 'El primer hola', title: 'Apareciste en mi mundo', text: 'Ese día que te conocí nunca pensé que algún día iba a hablarte realmente.' },
    { date: 'Nuestros primeros pasos', title: 'El tiempo pasó volando', text: 'Arrancamos saliendo y siendo novios tan rápido que ya vamos 2 años juntos, y ojalá por muchos más.' },
    { date: 'Nuestro día', title: 'Elegimos caminar juntos', text: 'Sin saber si realmente iba a funcionar, acá estamos. Aunque estemos en una relación a distancia, te sigo amando con todo mi corazón.' },
    { date: 'Hoy', title: 'Nuestra primavera', text: 'Es la segunda primavera que paso con vos, mi vida. Aunque no podamos estar juntos, te prometo que algún día te llevaré un ramo gigante de las flores que te gustan.' }
  ],
  memories: [
    { icon: '🌼', title: 'La sala de juegos', text: 'La tarde que pasamos en la sala de juegos en la cual nos fundimos un salario.', tone: 'spring', image: './photos/sala-de-juegos.jpeg' },
    { icon: '🌙', title: 'Nuestro cuadro', text: 'Una de las fotos más lindas del mundo. Aún tengo ese cuadro que miro cada tanto, admirando lo hermosa que sos aunque seas un dibujo.', tone: 'blue', image: './photos/nuestro-cuadro.jpeg' },
    { icon: '☕', title: 'Nuestro mundo', text: 'Una de las mejores fotos de Minecraft que tenemos y en la cual me basé para este regalito.', tone: 'gold', image: './photos/nuestro-mundo.jpeg' }
  ],
  letter: [
    { heading: 'Querida Eri,', body: 'Si esta historia fuera un mundo de bloques, elegiría construirla de nuevo desde el primer día, siempre con vos. Me encantás de una y de mil formas diferentes.' },
    { heading: 'Cada salida cuenta', body: 'Me gusta tu risa, los planes que hacíamos como salir a andar en skate y esa forma nuestra de encontrar algo bonito incluso si no estoy a tu lado. Con vos, cualquier camino se siente como el correcto y el que realmente quiero seguir.' },
    { heading: 'Y lo que se viene…', body: 'No sé qué bioma sigue después, pero sí sé que quiero explorarlo con vos. Como las flores amarillas, hacés que todo a nuestro alrededor brille. Te elijo en cada nuevo día por siempre y para siempre.' }
  ],
  // This supplied song starts after the visitor taps Comenzar aventura.
  songs: [
    { title: 'Mice on Venus', artist: 'Un tema que me recuerda a los días que pasábamos juntos', url: './music/mice-on-venus.mp3' },
    { title: 'Creeper vs Zombie', artist: 'Un temon hecha por los mismos ángeles', url: './music/creeper-vs-zombie.mp3' },
    { title: 'Hay que ser minero', artist: 'TEMONNNNN', url: './music/hay-que-ser-minero.mp3' }
  ],
  finale: { title: 'Mi mundo ideal es con vos', message: 'Gracias por cada día, cada risa y cada salida. Feliz día de la primavera, mi flor amarilla. Ojalá que sigamos construyendo nuestro mundo juntos, bloque por bloque.', signature: 'Con todo mi amor, Aaron' },
  secrets: { flower: 'Encontraste una flor secreta 🌸. Pedí un deseo para nuestra proxima vez q nos veamos', moon: 'Te amo muchisimo amor.' }
};

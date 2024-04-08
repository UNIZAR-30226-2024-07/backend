# backend
Backend de las dos aplicaciones. La tecnología empleada es Express, un framework de Node.js

Aquí se encuentra una descripción de las carpetas existentes y su contenido:
- ./database: contiene la configuración necesaria para poder conectarse con la BD.
- ./node_modules: ficheros básicos generados automáticamente para la creación del proyecto, librerías, dependencias...
- ./models: esquemas de las tablas de la BD. Cada tabla en un fichero distinto
- ./routes: se definen los endpoints de la api. Para cada tabla en models un fichero con las funciones de la misma y las rutas para acceder a ellas
- ./controllers: en cada fichero correspondiente se encuentran las funciones disponibles del backend.


---

- Apuesta fija
- Se reparten dos cartas boca arriba, todos los jugadores pueden ver esas cartas
- La banca recibe una carta boca arriba. Todas las cartas que reciba serán boca arriba
- \> 21 -> pierde mano
- Pedir cartas hasta que se quiera. Después confirmar mano de cartas
- Banca espera todos los jugadores confirmen (puede haber jugadores expulsados si no confirman en 30 segundos. Primera vez el jugador no juega (pierde directamente la apuesta) y se avisará. La segunda se expulsará). Banca completa su mano. 
- BlackJack es un AS (11) Y carta valor 10 (Jota, Dama, Rey, 10). Recibe premio mayor (x3) -> Del dinero que se llevaría solo por ganar a la banca, se lleva el triple.
- A la partida se puede acceder si se tiene el suficiente dinero para jugar una ronda. Si llegado cierto punto no dispone del suficiente para hacerlo, se le echa de la partida.

- Premios, sea x la apuesta fija de una mano:
    - Obtener menor puntuación que la banca: 0 coins
    - Obtener misma puntuación que la banca: x coins
    - Obtener mejor puntuación que la banca: 1.5x coins
    - Obtener mejor puntuación que la banca y que el resto de jugadores: 2x coins
    - Obtener BlackJack (superando a la banca): 3x coins

- Valores cartas:
    - AS -> 1 / 11
    - Jota, Dama, Rey -> 10
    - Numero -> valor numero

- DIVIDIR:
    - Si las dos primeras cartas son iguales. Se puede dividir. (solo se podrá dividir al principio)
    - Al dividir aumentar la apuesta x 2.
    - Al dividir recibe una carta en cada mano -> Ahora tienes 2 manos con 2 cartas
    - Se puede DOBLAR con esas dos cartas por mano

- DOBLAR:
    - Al empezar la mano (con las dos primeras cartas), aumentar la apuesta x 2 -> OBLIGATORIAMENTE se pedirá una carta más

- BANCA: 
    - Nivel: 'beginner' -> Pedir cartas hasta >= 15
    - Nivel: 'medium' -> Pedir carta hasta >= 17
    - Nivel: 'expert' -> Pedir cartas hasta >= 17. Con 17 suave se planta si jugador muestra un total de 9, 10, 11. (Algun jugador de la mesa) 

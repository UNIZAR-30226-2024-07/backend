/*******************************************************************************
 * Tabla: TypeBoard
 * Descripcion: representa los tipos de mesas que existen en el juego. Hay de
 * 4 grandes tipos: 'public', 'private', 'tournament' y 'single'. Las mesas
 * que se pueden crear serán de tipo 'public'
 ******************************************************************************/
const {Schema, model} = require('mongoose')

const typeBoardSchema = Schema({
    // Nombre de la mesa
    name: {
        type: String,
        required: true,
        unique: true
    },
    // Numero maximo de jugadores en la partida
    maxPlayers: {
        type: Number,
        required: true
    },
    // Numero minimo de jugadores para empezar la partida
    minPlayers: {
        type: Number,
        required: true
    },
    // Tipo de mesa: 'public', 'private', 'tournament' y 'single'
    boardType: {
        type: String,
        default: 'public'
    },
    // Tipo de banca
    bankType: {
        type: String,
        required: true
    },
    // Apuesta fija en cada jugada (0 para tournament y single)
    bet: {
        type: Number,
        required: true
    },
}, {timestamps: true})

module.exports = model("TypeBoard", typeBoardSchema)

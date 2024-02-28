/*******************************************************************************
 * Tabla: Board
 * Descripcion: representa los tipos de mesas que existen en el juego. Hay de
 * 4 grandes tipos: 'public', 'private', 'tournament' y 'single'
 ******************************************************************************/
const {Schema, model} = require('mongoose')

const boardSchema = Schema({
    
    // -------------- Atributos para todo tipo de mesas --------------
    // Usuarios jugando en la mesa
    players: [{
        player: {
            type: Schema.ObjectId,
            ref: "User"
        }
    }],
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
        required: true
    },
    // Apuesta fija en cada jugada (0 para tournament y single)
    bet: {
        type: Number,
        required: true
    },
    // Chat de la partida
    chat: [{
        msg: {
            type: String,
            required: true
        },
        emitter: {
            type: Schema.ObjectId,
            ref: "User",
            required: true
        }
    }],

    // ----------------- Atributos para mesas privadas ----------------
    // Nombre de la mesa privada
    name: {
        type: String,
        unique: true
    },
    // Contraseña de la mesa privada
    password: {
        type: String
    }
})

module.exports = model("Board", boardSchema)

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
    // Tipo de mesa
    boardType: {
        type: Schema.ObjectId,
        ref: "TypeBoard",
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
    // Estado: 'waiting', 'playing'
    status: {
        type: String,
        default: 'waiting'
    },
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
}, {timestamps: true})

module.exports = model("Board", boardSchema)

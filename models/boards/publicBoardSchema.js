/*******************************************************************************
 * Tabla: PublicBoard
 * Descripcion: representa la clase de las mesas públicas del juego
 ******************************************************************************/

const {Schema, model} = require('mongoose')

const publicBoardSchema = Schema({
    // Usuarios jugando en la mesa
    players: [{
        player: {
            type: Schema.ObjectId,
            ref: "User"
        }
    }],
    // Tipo de mesa pública
    publicBoardType: {
        type: Schema.ObjectId,
        ref: "PublicBoardType",
        required: true
    },
    // Número de jugadores que debe haber al empezar la partida
    numPlayers: {
        type: Number,
        required: true
    },
    // Banca asociada
    bank: {
        type: Schema.ObjectId,
        ref: "Bank",
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
}, {timestamps: true})

module.exports = model("PublicBoard", publicBoardSchema)

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
    },
    // Banca asociada
    bank: {
        type: Schema.ObjectId,
        ref: "Bank"
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

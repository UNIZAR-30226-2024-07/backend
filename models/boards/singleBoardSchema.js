/*******************************************************************************
 * Tabla: SingleBoard
 * Descripcion: representa la clase de las mesas privadas del juego
 ******************************************************************************/

const {Schema, model} = require('mongoose')

const singleBoardSchema = Schema({
    // Banca asociada
    bank: {
        type: Schema.ObjectId,
        ref: "Bank",
        required: true
    },
    // Usuario jugando en la mesa
    players: {
        type: [{
            player: {
                type: Schema.ObjectId,
                ref: "User"
            }
        }],
        default: []
    },
    // Personas que han contestado
    hand: {
        type: {
            // Jugadores que han enviado la jugada en esta mano
            players: [{
                type: Schema.ObjectId,
                ref: "User",
                default: []
            }]
        },
    },
}, {timestamps: true})

module.exports = model("SingleBoard", singleBoardSchema)

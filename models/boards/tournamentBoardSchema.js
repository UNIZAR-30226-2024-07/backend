/*******************************************************************************
 * Tabla: TournamentBoard
 * Descripcion: representa la clase de las mesas de torneo del juego
 ******************************************************************************/

const {Schema, model} = require('mongoose')

const tournamentBoardSchema = Schema({
    // Usuarios jugando en la mesa
    players: [{
        player: {
            type: Schema.ObjectId,
            ref: "User"
        }
    }],
    tournament: {
        type: Schema.ObjectId,
        ref: "Tournament",
        required: true
    },
    // Banca asociada
    bank: {
        type: Schema.ObjectId,
        ref: "Bank"
    },
    // Ronda en la que se juega la mesa
    round: {
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
    // Estado: 'waiting', 'playing'
    status: {
        type: String,
        default: 'waiting'
    },
}, {timestamps: true})

module.exports = model("TournamentBoard", tournamentBoardSchema)

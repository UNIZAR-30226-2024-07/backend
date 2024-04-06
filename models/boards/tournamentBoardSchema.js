/*******************************************************************************
 * Tabla: TournamentBoard
 * Descripcion: representa la clase de las mesas de torneo del juego
 ******************************************************************************/

const {Schema, model} = require('mongoose')

const tournamentBoardSchema = Schema({
    // Usuarios jugando en la mesa
    players: {
        type: [{
            player: {
                type: Schema.ObjectId,
                ref: "User"
            },
            lifes: {
                type: Number,
                default: 4
            },
            // Número de jugadas en las que el jugador no ha enviado jugada
            // A las 2 jugadas será expulsado
            handsAbsent: {
                type: Number,
                default: 0
            },
            // True si es el guest de la partida (solo 1 por partida)
            guest: {
                type: Boolean,
                default: "false"
            },
        }],
        default: []
    },
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
    // Número de mano en la que se encuentra la partida y el número de jugadas
    // recibidas en esa mano
    hand: {
        type: {
            // Número de mano en la que se encuentra la partida
            numHand: {
                type: Number,
                default: 1
            },
            // Jugadores que han enviado la jugada en esta mano
            players: [{
                type: Schema.ObjectId,
                ref: "User",
                default: []
            }]
        },
    },
}, {timestamps: true})

module.exports = model("TournamentBoard", tournamentBoardSchema)

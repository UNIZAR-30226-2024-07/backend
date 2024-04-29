/*******************************************************************************
 * Tabla: PublicBoard
 * Descripcion: representa la clase de las mesas públicas del juego
 ******************************************************************************/

const {Schema, model} = require('mongoose')

const publicBoardSchema = Schema({
    // Usuarios jugando en la mesa
    players: {
        type: [{
            player: {
                type: Schema.ObjectId,
                ref: "User"
            },
            guest: {
                type: Boolean,
                default: "false"
            },
            // Número de jugadas en las que el jugador no ha enviado jugada
            // A las 2 jugadas será expulsado
            handsAbsent: {
                type: Number,
                default: 0
            },
            // Monedas iniciales del jugador
            initialCoins: {
                type: Number,
                default: 0
            },
            // Monedas actuales del jugador
            currentCoins: {
                type: Number,
                default: 0
            },
            paused: {
                type: Boolean,
                default: false
            }
        }],
        default: []
    },
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
    // Apuesta fija en la sala
    bet: {
        type: Number,
        required: true
    },
}, {timestamps: true})

module.exports = model("PublicBoard", publicBoardSchema)

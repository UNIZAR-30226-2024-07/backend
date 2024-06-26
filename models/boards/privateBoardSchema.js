/*******************************************************************************
 * Tabla: PrivateBoard
 * Descripcion: representa la clase de las mesas privadas del juego
 ******************************************************************************/

const {Schema, model} = require('mongoose')

const privateBoardSchema = Schema({
    // -------------- Atributos de acceso a la mesa privada --------------
    // Nombre de la sala
    name: {
        type: String,
        unique: true,
        required: true
    },
    // Contraseña para poder entrar a la sala
    password: {
        type: String,
        unique: true,
        required: true
    },
    // -------------- Atributos de juego de la mesa privada --------------
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
    // Apuesta fija en la sala
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

module.exports = model("PrivateBoard", privateBoardSchema)

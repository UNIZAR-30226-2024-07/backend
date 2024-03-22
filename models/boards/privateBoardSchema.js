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
}, {timestamps: true})

module.exports = model("PrivateBoard", privateBoardSchema)

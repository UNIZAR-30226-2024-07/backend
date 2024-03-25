/*******************************************************************************
 * Tabla: Matcher
 * Descripcion: contiene vectores de boards que están a la espera de 
 ******************************************************************************/

const {Schema, model} = require('mongoose')

const matcherSchema = Schema({
    // Jugadores esperando partida
    players_waiting: {
        type: [{
            player: {
                type: Schema.ObjectId,
                ref: "User",
                required: true
            }
        }]
    },
    // Partidas Públicas en espera
    waiting_public_boards: {
        type: [{
            board: {
                type: Schema.ObjectId,
                ref: "PublicBoard",
                required: true
            },
            // Tipo de partida pública
            typePublicBoard: {
                type: Schema.ObjectId,
                ref: "PublicBoardType",
                required: true
            }
        }],
        default: []
    },
    // Partidas Privadas en espera
    waiting_private_boards: {
        type: [{
            board: {
                type: Schema.ObjectId,
                ref: "PrivateBoard",
                required: true
            },
            name: {
                type: String,
                required: true
            }
        }],
        default: []
    },
    // Partidas Públicas en espera
    waiting_tournament_boards: {
        type: [{
            board: {
                type: Schema.ObjectId,
                ref: "TournamentBoard",
                required: true,
            },
            // Torneo al que pertenece
            tournament: {
                type: Schema.ObjectId,
                ref: "Tournament",
                required: true,
            },
            // Ronda en la que se juega la partida
            round: {
                type: Number,
                required: true
            }
        }],
        default: []
    },

}, {timestamps: true})

module.exports = model("Matcher", matcherSchema)
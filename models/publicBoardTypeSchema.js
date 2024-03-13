/*******************************************************************************
 * Tabla: PublicBoardType
 * Descripcion: representa los distintos tipos de mesas públicas que existen en 
 * el juego.
 ******************************************************************************/
const {Schema, model} = require('mongoose')

const publicBoardTypeSchema = Schema({
    // Nombre del tipo de partida pública
    name: {
        type: String,
        unique: true,
        required: true
    },
    // Numero mínimo de jugadores al empezar la partida
    numPlayers: {
        type: Number,
        required: true
    },
    // Tipo de banca
    bankLevel: {
        type: String,
        required: true
    },
    // Apuesta fija en cada jugada
    bet: {
        type: Number,
        required: true
    },
}, {timestamps: true})

module.exports = model("PublicBoardType", publicBoardTypeSchema)

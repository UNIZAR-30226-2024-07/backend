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
    // Estado: 'waiting', 'playing'
    status: {
        type: String,
        default: 'waiting'
    },
}, {timestamps: true})

module.exports = model("SingleBoard", singleBoardSchema)


const{Schema, model} = require('mongoose')

const statSchema = Schema({
    // Nombre de la estadistica
    name: {
        type: String,
        required: true
    },
    // Usuario al que pertenece la estadistica
    user: {
        type: Schema.ObjectId,
        ref: "User"
    },
    // Valor asociado a la estadistica
    value: {
        type: Number,
        required: true
    },
    // Fecha de creación de la estadística
    created_at: {
        type: Date,
        default: Date.now
    },
})

module.exports = model("Stat", statSchema)

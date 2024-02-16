
const{Schema, model} = require('mongoose')

const avatarSchema = Schema({
    // Nombre de la recompensa
    name: {
        type: String,
        required: true
    },
    // Valor asociado a la estadistica
    value: {
        type: Number,
        required: true
    },
})

module.exports = model("Avatar", avatarSchema)

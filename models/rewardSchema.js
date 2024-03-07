
const{Schema, model} = require('mongoose')

const rewardSchema = Schema({
    // Nombre de la recompensa
    day: {
        type: String,
        required: true,
        unique: true
    },
    // Valor asociado a la recompensa
    value: {
        type: Number,
        required: true
    },
})

module.exports = model("Reward", rewardSchema)


const{Schema, model} = require('mongoose')

const tournamentSchema = Schema({
    // Nombre del torneo
    name: {
        type: String,
        required: true
    },
})

module.exports = model("Reward", rewardSchema)

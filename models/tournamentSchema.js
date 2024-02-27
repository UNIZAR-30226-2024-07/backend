
const{Schema, model} = require('mongoose')

const tournamentSchema = Schema({
    // Nombre del torneo
    name: {
        type: String,
        required: true
    },
    // Recompensa del torneo
    user: {
        type: Schema.ObjectId,
        ref: "Reward"
    }
    //
})

module.exports = model("Tournament", rewardSchema)

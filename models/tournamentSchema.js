
const{Schema, model} = require('mongoose')

const tournamentSchema = Schema({
    // Nombre del torneo
    name: {
        type: String,
        required: true,
        unique: true
    },
    // Precio de entrada del torneo
    price: {
        type: Number,
        required: true,
    },
    // Recompensa del campeón del torneo
    coins_winner: {
        type: Number,
        required: true
    },
    // Recompensa del subcampeón del torneo
    coins_subwinner: {
        type: Number,
        required: true
    }
}, {timestamps: true})

module.exports = model("Tournament", tournamentSchema)

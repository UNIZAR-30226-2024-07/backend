/*******************************************************************************
 * Tabla: Bank
 * Descripcion: representa los tipos de bancas / bots que existen en el juego. 
 * Hay 3 tipos: 'beginner', 'medium', 'expert'
 ******************************************************************************/
const {Schema, model} = require('mongoose')

const bankSchema = Schema({
    // Nivel de la banca: 'beginner', 'medium', 'expert'
    level: {
        type: String,
        required: true,
    },
    // Mazo de cartas. Uno por jugador
    maze: [{
        playerId: {
            type: Schema.ObjectId,
            ref: "User"
        },
        cards: [{
            value: String,
            suit: String
        }]
    }],
    // Jugadas de cada jugador
    playersHands: [{
        playerId: {
            type: Schema.ObjectId,
            ref: "User"
        },
        split: {   // Cada jugador si ha hecho split o no
            type: Boolean,
            default: false
        },
        double: {   // Cada jugador. Manos donde ha hecho double
            type: [Number],
            default: []
        },
        // Vector de vectores de cartas. Un vector por "jugada"
        // Maximo dos "jugadas" por jugador.
        hands: [[{
            value: String,
            suit: String
        }]]
    }],
    bankMaze: [{  // Baraja de la banca
        value: String,
        suit: String
    }],
    bankHand: [{   // Mano de la banca
        value: String,
        suit: String
    }]
}, {timestamps: true})

module.exports = model("Bank", bankSchema)
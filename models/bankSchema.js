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
    // Mazo de cartas de la banca
    // Cada subgrupo en maze es un montón de cartas. Uno por jugador, y el último la banca.
    maze: [[{
        value: String,
        suit: String
    }]],
    // Jugadas de cada jugador
    playedCards: [{
        split: {   // Cada jugador si ha hecho split o no
            type: Boolean,
            default: false
        },
        // Vector de vectores de cartas. Un vector por "jugada"
        // Maximo dos "jugadas" por jugador.
        cards: [[{
            value: String,
            suit: String
        }]]
    }]
}, {timestamps: true})

module.exports = model("Bank", bankSchema)
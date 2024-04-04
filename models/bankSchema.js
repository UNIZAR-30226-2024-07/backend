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
    // Cada subgrupo en maze es un montón de cartas. Uno por jugador.
    maze: [[{
        value: String,
        suit: String
    }]]
}, {timestamps: true})

module.exports = model("Bank", bankSchema)
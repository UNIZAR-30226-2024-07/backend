/*******************************************************************************
 * Tabla: Card
 * Descripcion: contiene el nombre de una imagen junto con su precio de los
 * diseños de cartas que pueden poseer los usuarios en el juego
 ******************************************************************************/
const{Schema, model} = require('mongoose')

const cardSchema = Schema({
    // Nombre de la imagen de las cartas
    image: {
        type: String,
        required: true,
        unique: true
    },
    // Nombre de la foto guardado en el servidor
    imageFileName: {
        type: String,
        required: true
    },
    // Precio de la carta
    price: {
        type: Number,
        required: true
    },
}, {timestamps: true})

module.exports = model("Card", cardSchema)

/*******************************************************************************
 * Tabla: Rug
 * Descripcion: contiene el nombre de una imagen junto con su precio de los
 * diseños de tapetes que pueden poseer los usuarios en el juego
 ******************************************************************************/
const{Schema, model} = require('mongoose')

const rugSchema = Schema({
    // Nombre de la imagen del tapete
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
    // Precio del tapete
    price: {
        type: Number,
        required: true
    },
}, {timestamps: true})

module.exports = model("Rug", rugSchema)

/*******************************************************************************
 * Tabla: Avatar
 * Descripcion: contiene el nombre de una imagen junto con su precio de los
 * avatares (fotos de perfil) de los usuarios en el juego
 ******************************************************************************/
const{Schema, model} = require('mongoose')

const avatarSchema = Schema({
    // Nombre de la imagen del avatar
    image: {
        type: String,
        required: true,
        unique: true
    },
    // Precio del avatar
    price: {
        type: Number,
        required: true
    },
}, {timestamps: true})

module.exports = model("Avatar", avatarSchema)

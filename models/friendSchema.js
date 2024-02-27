/*******************************************************************************
 * Tabla: Friend
 * Descripcion: contiene el nombre de una imagen junto con su precio de los
 * diseños de cartas que pueden poseer los usuarios en el juego
 ******************************************************************************/

const {Schema, model} = require('mongoose')

const friendSchema = Schema({
    // Usuario
    user: {
        type: Schema.ObjectId,
        ref: "User"   
    },
    // Usuario amigo
    friend: {
        type: Schema.ObjectId,
        ref: "User"
    },
    // Booleano que indica si la solicitud de amistad ha sido aceptada
    confirmed: {
        type: Boolean,
        default: false
    }
})

module.exports = model("Friend", friendSchema)
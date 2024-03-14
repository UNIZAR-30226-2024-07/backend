/*******************************************************************************
 * Tabla: Friend
 * Descripcion: contiene una pareja de usuarios que son amigos. El user ha
 * solicitado a friend de ser su amigo. Confirmed es si la solicitud ha sido
 * confirmada. 
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
}, {timestamps: true})

module.exports = model("Friend", friendSchema)
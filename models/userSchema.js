
const{Schema, model} = require('mongoose')

const userSchema = Schema({
    // Nickname de usuario
    nick: {
        type: String,
        required: true
    },
    // Nombre real del usuario
    name: {
        type: String,
        required: true
    },
    // Apellidos del usuario
    surname: {
        type: String,
        required: true
    },
    // Correo electrónico
    email: {
        type: String,
        required: true
    },
    // Contraseña de la cuenta
    password: {
        type: String, 
        required: true
    },
    // Monedas del usuario
    coins: {
        type: Number, 
        required: true
    },
    // Fecha de creación de la cuenta
    created_at: {
        type: Date,
        default: Date.now
    },
    // Rol: "user" OR "admin"
    rol: {
        type: String, 
        default: "user"
    },

})

module.exports = model("User", userSchema)


const{Schema, model} = require('mongoose')

const userSchema = Schema({
    // --------------------- Atributos sobre el usuario ---------------------
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
    // ------------------------ Tokens del jugador ------------------------
    // Rol: "user" OR "admin"
    rol: {
        type: String, 
        default: "user"
    },
    // Monedas del usuario
    coins: {
        type: Number, 
        required: true
    },
    // Lista de avatares que posee el jugador
    avatars: [{
        avatar: {
            type: Schema.ObjectId,
            ref: "Avatar"
        },
        // Solo habra un avatar con current = True, que será la foto usada
        current: Boolean
    }],
    rugs: [{
        rug: {
            type: Schema.ObjectId,
            ref: "Rug"
        },
        // Solo habra un tapete con current = True, que será el tapete usado
        current: Boolean
    }],
    cards: [{
        card: {
            type: Schema.ObjectId,
            ref: "Card"
        },
        // Solo habra un card con current = True, que será el diseño de cartas usado
        current: Boolean
    }],


}, {timestamps: true})

module.exports = model("User", userSchema)

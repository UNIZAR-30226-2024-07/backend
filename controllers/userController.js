// Imports de esquemas necesarios
const User = require("../models/userSchema")

const add = (req, res) => {
    const { nick, name, surname, email, password } = req.body
    console.log(nick, name, surname, email, password)
    try {
        res.send("todo ok")
    } catch (e) {

    }
}

// Funciones que se exportan
module.exports = {
    add
}
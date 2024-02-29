// Imports de esquemas necesarios
const User = require("../models/userSchema")
const bcrypt = require('bcrypt')

const add = async (req, res) => {
    let u = req.body

    // Nos aseguramos de que se hayan enviado todos los parámetros se hayan enviado
    if (!u.nick || !u.name || !u.surname || !u.email || !u.password) {
        return res.status(400).json({
            status: "error",
            message: "Parámetros enviados incorrectamente. Se deben incluir los campos: nick, name, surname, email, password"
        })
    }

    const { nick, name, surname, email, password } = u

    try {
        // Se busca si hay algún usuario
        const oldUser = await User.findOne({ $or: [{ nick }, { email }] })
        if (oldUser) {
            return res.status(400).json({
                status: "error",
                message: "Ya existe un usuario con ese nick o email"
            })
        }

    } catch (e) {
        console.log(e)
        return res.status(400).json({
            status: "error",
            message: "Error interno al crear el usuario"
        })

    }
}

// Funciones que se exportan
module.exports = {
    add
}
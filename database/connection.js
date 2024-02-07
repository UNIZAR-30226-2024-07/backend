const { response } = require('express')
const mongoose = require('mongoose')

const connection = async() => {
    try {
        const uri = ""
        await mongoose.connect(uri)
    } catch (error) {
        throw new Error("No se ha podido conectar con la Base de Datos: ", error)
    }
}

module.exports = {
    connection
}
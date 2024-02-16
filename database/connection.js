const { response } = require('express')
const mongoose = require('mongoose')

mongoose.connection.on('open', () => console.log('BD conectada'))

const connection = async({user, host, passwd}) => {
    try {
        const uri = 'mongodb+srv://${host}:${passwd}}@${host}/'
        await mongoose.connect(uri)
    } catch (error) {
        throw new Error("No se ha podido conectar con la Base de Datos: ", error)
    }
}

module.exports = connection
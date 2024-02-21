const mongoose = require('mongoose')

const { response } = require('express')

mongoose.connection.on('open', () => console.log('BD conectada'))

const connection = async({user, host, passwd}) => {
    try {
        const uri = `mongodb+srv://${user}:${passwd}@${host}/`
        await mongoose.connect(uri)
        console.log('Conexión establecida con MongoDB')
    } catch (error) {
        console.log(error)
    }
}

module.exports = connection
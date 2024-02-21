require('dotenv').config()
// Configuracion previa
const express = require('express')
const connection = require('./database/connection')
const { appConfig, db } = require('./config')
const app = express()

// Puerto de escucha
connection(db)
app.listen(appConfig.port, () => {
    console.log("Servidor de node escuchando en el puerto: ", appConfig.port)
})
require('dotenv').config()
// Configuracion previa
const express = require('express')
const connectDB = require('./database/connection')
const { appConfig, db } = require('./config')
const app = express()

// Conexion con BD (MongoDB)
const connection = require('./database/connection')
connection.connection()

// Puerto de escucha
connectDB(db)
app.listen(appConfig.port, () => {
    console.log("Servidor de node corriendo en el puerto: ", appConfig.port)
})
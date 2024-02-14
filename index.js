// Configuracion previa
const express = require('express')
const app = express()
const port = 8080

// Conexion con BD (MongoDB)
const connection = require('./database/connection')
connection.connection()

// Puerto de escucha
app.listen(port, () => {
    console.log("Servidor de node corriendo en el puerto: ", port)
})
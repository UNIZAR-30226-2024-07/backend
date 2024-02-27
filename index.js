require('dotenv').config()

// Configuracion previa
const express = require('express')
const cors = require('cors')
const connection = require('./database/connection')
const { appConfig, db } = require('./config')
const app = express()

// Conexión con la BD
connection(db)

// middlewares
app.use(cors())
app.use(express.json())

// routes
app.use('/api/avatar', require('./routes/avatarRoute.js'))
app.use('/api/bank', require('./routes/bankRoute'))
app.use('/api/board', require('./routes/boardRoute'))
app.use('/api/card', require('./routes/cardRoute'))
app.use('/api/friend', require('./routes/friendRoute'))
app.use('/api/reward', require('./routes/rewardRoute'))
app.use('/api/rug', require('./routes/rugRoute'))
app.use('/api/stat', require('./routes/statRoute'))
app.use('/api/tournament', require('./routes/tournamentRoute'))
app.use('/api/user', require('./routes/userRoute'))


app.listen(appConfig.port, () => {
    console.log("Servidor de node escuchando en el puerto: ", appConfig.port)
})
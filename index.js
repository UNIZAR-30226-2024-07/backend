require("dotenv").config()

// Configuracion previa
const express = require("express")
const cors = require("cors")
const connection = require("./database/connection")
const MatcherController = require("./controllers/matcherContoller")
const { Sockets } = require("./sockets/socketMain")
const { appConfig, db, dirUploads } = require('./config')
const app = express()

// Se inicializa el Matcher
const initializeMatcher = async() => {
    try {
        const response = await MatcherController.init()
        if (response.status === "success") {
            console.log("Emparejador preparado")
        } else {
            console.error("El emparejador no se pudo inicializar. " + response.message)
            process.exit(1)
        }
    } catch (e) {
        console.error("El emparejador no se pudo inicializar. " + e.message)
        process.exit(1)
    }    
}

// Conexión con la BD
const connect = async () => {
    await connection(db)
    await initializeMatcher()
}
connect()

// middlewares
app.use(cors({
    origin: true,
    credentials: true,
}))
app.use(express.json())

// Serve static images
app.use(`/${dirUploads}`, express.static(dirUploads))

// routes
app.use("/api/avatar", require("./routes/avatarRoute"))
app.use("/api/bank", require("./routes/bankRoute"))
app.use("/api/card", require("./routes/cardRoute"))
app.use("/api/friend", require("./routes/friendRoute"))
app.use("/api/reward", require("./routes/rewardRoute"))
app.use("/api/rug", require("./routes/rugRoute"))
app.use("/api/stat", require("./routes/statRoute"))
app.use("/api/tournament", require("./routes/tournamentRoute"))
app.use("/api/publicBoardType", require("./routes/publicBoardTypeRoute"))
app.use("/api/user", require("./routes/userRoute"))
app.use("/api/matcher", require("./routes/matcher"))
app.use("/api/publicBoard", require("./routes/boards/publicBoardRoute"))
app.use("/api/privateBoard", require("./routes/boards/privateBoardRoute"))
app.use("/api/tournamentBoard", require("./routes/boards/tournamentBoardRoute"))
app.use("/api/singleBoard", require("./routes/boards/singleBoardRoute"))

const server = app.listen(appConfig.port, () => {
    console.log("Servidor de node escuchando en el puerto: ", appConfig.port)
})

const io = require("socket.io")(server, {
    pingTimeout: 60000,
    cors: {
        origin: '*'
    }
})

Sockets(io)
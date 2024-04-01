const Matcher = require("../models/matcherSchema")
const MatcherController = require("../controllers/matcherContoller")
const TournamentBoardController = require("../controllers/boards/tournamentBoardController")
const PublicBoardController = require("../controllers/boards/publicBoardController")

var mutex = true
var mutexPublic = true

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms)
    })
}

async function waitPublic() {
    while (!mutexPublic) { await sleep(20) }
    mutexPublic = false
}

function signalPublic() {
    mutexPublic = true
}

async function turnTimeout(boardId, boardType) {
    // boardType = "tournament", "public", "private"
    
    try {
        var res = { status: "error" }
        var iter = 30 / 5
        var i = 0

        while (res.status === "error" && i < iter) {
            await sleep(5000) // 5 segundos
            res = await TournamentBoardController.allPlayersPlayed({ body: { boardId: boardId }})
            i++
        }

        if (res.status === "error") {
            // El timeout se ha consumido y por tanto algún jugador no ha 
            // enviado su jugada
            var resManage
            if (boardType === "tournament") {
                resManage = await TournamentBoardController.manageHand({ body: { board: res.board }})
            } else if (boardType === "public") {
                resManage = await PublicBoardController.manageHand({ body: { board: res.board }})
            } else if (boardType === "private") {
                resManage = await PrivateBoardController.manageHand({ body: { board: res.board }})
            }
            
            if (resManage.status === "error") return resManage
        }

        return ({
            status: "success",
            message: "Todos los jugadores enviaron su partida"
        })

    } catch (e) {
        return ({
            status: "error",
            message: "Error mientras se esperaba la jugada de todos los jugadores. " + e.message
        })
    }
}

const Sockets = async (io) => {
    io.on("connection", async (socket) => {

    ////////////////////////////////////////////////////////////////////////////
    // Partidas de torneo
    ////////////////////////////////////////////////////////////////////////////

    // Para los usuarios que quieren jugar en un torneo
    socket.on("enter tournament board", async (req) => {
        // Parámetros que debe haber en req.body: tournamentId, userId

        try {
            ////////////////////////////////////////////////////////////////////
            // wait(TournamentMutex)
            // Se añade el usuario a una partida de torneo
            var res = await MatcherController.playTournament(req)
            if (res.status === "error") return console.error(res.message)
            const boardId = res.board._id

            // Se mete al usuario al room de su mesa para ser notificado
            socket.join("tournament:" + boardId)

            // Se verifica si la mesa está lista para comenzar
            const reqIsFull = { body: { boardId: boardId }}
            res = await MatcherController.isTournamentBoardReady(reqIsFull)
            if (res.status === "error") return;
            // signal(TournamentMutex)
            ////////////////////////////////////////////////////////////////////

            // Si está lista, se notifica a los jugadores de la mesa
            io.to("tournament:" + boardId).emit("starting tournament board", boardId)

            // Se elimina a los jugadores de la lista de jugadores esperando mesa
            const reqUsers = { body: { boardId: boardId, typeBoardname: "tournament" } }
            res = await MatcherController.eliminateWaitingUsers(reqUsers)
            if (res.status === "error") return console.error(res.message)


            
        } catch (e) {
            return console.log(e.message)
        }        
    })

    // Este evento lo emite el guest de la mesa y sirve para empezar a enviar
    // eventos que permitan jugar la partida
    socket.on("players tournament ready", async (req) => {
        // Parámetros en body: boardId
        const boardId = req.body.boardId

        try {
            var resEndBoard = { status: "error" }

            while (resEndBoard.status === "error") {
                // Primero se envía un evento para que todos los jugadores hagan
                // una jugada
                io.to("tournament:" + boardId).emit("play hand")
                
                // Se espera a que lleguen las jugadas
                res = await turnTimeout(boardId)

                // TODO: o se mete aquí otra función con la lógica, o se mete en
                // TournamentBoardController.manageHand

                resEndBoard = await TournamentBoardController.isEndOfGame(req)
            }

            // Se mira quién ha sido el ganador de la partida, se le avanza en
            // la ronda y se dan monedas si se tienen que dar
            await TournamentBoardController.finishBoard({ body: { boardId: boardId }})

        } catch (e) {
            return ({
                status: "error",
                message: "Error en el transcurso de la partida. " + e.message
            })
        }
    })

    
    ////////////////////////////////////////////////////////////////////////////
    // Partidas públicas
    ////////////////////////////////////////////////////////////////////////////

    // Para los usuarios que quieren jugar en un torneo
    socket.on("enter public board", async (req) => {
        // Parámetros que debe haber en req.body: typeId, userId

        try {
            ////////////////////////////////////////////////////////////////////
            // wait(PublicMutex)
            var res = await MatcherController.playPublic(req)
            if (res.status === "error") { return console.log(res.message) }
            const boardId = res.board._id

            socket.join("public:" + boardId)

            const reqIsFull = { body: { boardId: boardId }}
            res = await MatcherController.isPublicBoardReady(reqIsFull)
            if (res.status === "error") return console.log("Usuario añadido a partida con id " + boardId);
            // signal(PublicMutex)
            ////////////////////////////////////////////////////////////////////

            io.to("public:" + boardId).emit("starting public board", boardId)
            console.log("Usuario añadido a partida. Se comienza la partida")
            const reqUsers = { body: { boardId: boardId, typeBoardName: "public" } }
            res = await MatcherController.eliminateWaitingUsers(reqUsers)
            
        } catch (e) {
            return console.log(e.message)
        }
    })

    // Este evento lo emite el guest de la mesa y sirve para empezar a enviar
    // eventos que permitan jugar la partida
    socket.on("players public ready", async (req) => {
        // Parámetros en body: boardId
        const boardId = req.body.boardId

        try {
            var resEndBoard = { status: "error" }

            while (resEndBoard.status === "error") {
                // Primero se envía un evento para que todos los jugadores hagan
                // una jugada
                io.to("public:" + boardId).emit("play hand")
                
                // Se espera a que lleguen las jugadas
                res = await turnTimeout(boardId)

                // TODO: o se mete aquí otra función con la lógica, o se mete en
                // TournamentBoardController.manageHand

                resEndBoard = await TournamentBoardController.isEndOfGame(req)
            }

            // Se mira quién ha sido el ganador de la partida, se le avanza en
            // la ronda y se dan monedas si se tienen que dar
            await TournamentBoardController.finishBoard({ body: { boardId: boardId }})

        } catch (e) {
            return ({
                status: "error",
                message: "Error en el transcurso de la partida. " + e.message
            })
        }
    })

    

    ////////////////////////////////////////////////////////////////////////////
    // Partidas privadas
    ////////////////////////////////////////////////////////////////////////////

    // Para los usuarios que quieren jugar en partida pública
    socket.on("create private board", async (req) => {
        // Parámetros que debe haber en req.body: name, password, userId

        try {
            ////////////////////////////////////////////////////////////////////
            // wait(PrivateMutex)
            var res = await MatcherController.createPrivate(req)
            if (res.status === "error") return console.log(res.message)
            const boardId = res.board._id
            // signal(PrivateMutex)
            ////////////////////////////////////////////////////////////////////

            socket.join("private:" + boardId)            
        } catch (e) {
            return console.log(e.message)
        }        
    })

    // Para los usuarios que quieren jugar en partida pública
    socket.on("enter private board", async (req) => {
        // Parámetros que debe haber en req.body: name, password, userId

        try {
            ////////////////////////////////////////////////////////////////////
            // wait(PrivateMutex)
            var res = await MatcherController.playPrivate(req)
            if (res.status === "error") return console.log(res.message)
            const boardId = res.board._id

            socket.join("private:" + boardId)

            const reqIsFull = { body: { boardId: boardId }}
            res = await MatcherController.isPrivateBoardReady(reqIsFull)
            if (res.status === "error") return;
            // signal(PrivateMutex)
            ////////////////////////////////////////////////////////////////////

            io.to("private:" + boardId).emit("starting private board", boardId)

            const reqUsers = { body: { boardId: boardId, typeBoardName: "private" }}
            res = await MatcherController.eliminateWaitingUsers(reqUsers)
            
        } catch (e) {
            return console.log(e.message)
        }        
    })


    ////////////////////////////////////////////////////////////////////////////
    // Gestión de partidas
    ////////////////////////////////////////////////////////////////////////////

    socket.on("movement", async (req) => {
        // Parámetros en req.body: boardId, userId
        const boardId = req.body.boardId
        const userId = req.body.userId

        try {

        } catch (e) {

        }
    })
    })
}

module.exports = {
    Sockets
}
const Matcher = require("../models/matcherSchema")
const MatcherController = require("../controllers/matcherContoller")
const TournamentBoardController = require("../controllers/boards/tournamentBoardController")
const PublicBoardController = require("../controllers/boards/publicBoardController")
const PrivateBoardController = require("../controllers/boards/privateBoardController")

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

// Espera hasta que todos los jugadores hayan enviado sus jugadas un máximo de
// 30 segundos. Devuelve 'success' si y solo si todos los jugadores han enviado
// sus jugadas antes de los 30 segundos y 'error' en caso contrario
async function turnTimeout(boardId) {    
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
            return ({
                status: "error",
                message: "Se agotó el tiempo de espera sin que todos los jugadores mandaran su jugada",
                board: res.board
            })
        } else {
            return ({
                status: "success",
                message: "Todos los jugadores mandaron su jugada antes de que acabara el tiempo de espera",
                board: res.board
            })
        }

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
            var res
            var resEndBoard = { status: "error" }

            while (resEndBoard.status === "error") {
                // Primero se envía un evento para que todos los jugadores hagan
                // una jugada
                io.to("tournament:" + boardId).emit("play hand")
                
                // Se espera a que lleguen las jugadas
                res = await turnTimeout(boardId)

                if (res.status === "error") {
                    // Si se agotó el tiempo y no todos mandaron su jugada, se
                    // apunta
                    res = await TournamentBoardController.seeAbsents({ body: { board: res.board }})
                    if (res.status === "error") return res
                }

                // TODO: o se mete aquí otra función con la lógica, o se mete en
                // TournamentBoardController.manageHand

                resEndBoard = await TournamentBoardController.isEndOfGame(req)
            }

            // Se mira quién ha sido el ganador de la partida, se le avanza en
            // la ronda y se dan monedas si se tienen que dar
            await TournamentBoardController.finishBoard({ body: { boardId: boardId }})

            // io.to("tournament:" + boardId).emit("finish board")

        } catch (e) {
            return ({
                status: "error",
                message: "Error en el transcurso de la partida. " + e.message
            })
        }
    })

    // Este evento lo puede emitir cualquiera de los jugadores de una partida
    socket.on("new tournament message", async (req) => {
        // Parámetros en req.body: boardId, message, userId
        const boardId = req.body.boardId
        const message = req.body.message
        const userId = req.body.userId

        try {
            // Se añade el nuevo mensaje a la partida si no es una cadena vacía
            // y si el usuario se encuentra jugando la partida
            var res = await TournamentBoardController.newMessage(req)
            if (res.status === "error") return console.error(res)

            io.to("tournament:" + boardId).emit("new message", message, userId)
        } catch (e) {
            return console.error(e.message)
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
            var res
            var resEndBoard = { status: "error" }

            while (resEndBoard.status === "error") {
                // Primero se envía un evento para que todos los jugadores hagan
                // una jugada
                io.to("public:" + boardId).emit("play hand")
                
                // Se espera a que lleguen las jugadas
                res = await turnTimeout(boardId)

                if (res.status === "error") {
                    // Si se agotó el tiempo y no todos mandaron su jugada, se
                    // apunta
                    res = await PublicBoardController.seeAbsents({ body: { board: res.board }})
                    if (res.status === "error") return res
                }

                // TODO: o se mete aquí otra función con la lógica, o se mete en
                // TournamentBoardController.manageHand

                resEndBoard = await PublicBoardController.isEndOfGame(req)
            }

            // Se mira quién ha sido el ganador de la partida, se le avanza en
            // la ronda y se dan monedas si se tienen que dar
            await PublicBoardController.finishBoard({ body: { boardId: boardId }})

            // io.to("public:" + boardId).emit("finish board")


        } catch (e) {
            return ({
                status: "error",
                message: "Error en el transcurso de la partida. " + e.message
            })
        }
    })

    // Este evento lo puede emitir cualquiera de los jugadores de una partida
    socket.on("new public message", async (req) => {
        // Parámetros en req.body: boardId, message, userId
        const boardId = req.body.boardId
        const message = req.body.message
        const userId = req.body.userId

        try {
            // Se añade el nuevo mensaje a la partida si no es una cadena vacía
            // y si el usuario se encuentra jugando la partida
            var res = await PublicBoardController.newMessage(req)
            if (res.status === "error") return console.error(res)

            io.to("public:" + boardId).emit("new message", message, userId)
        } catch (e) {
            return console.error(e.message)
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

    // Este evento lo emite el guest de la mesa y sirve para empezar a enviar
    // eventos que permitan jugar la partida
    socket.on("players private ready", async (req) => {
        // Parámetros en body: boardId
        const boardId = req.body.boardId

        try {
            var res
            var resEndBoard = { status: "error" }

            while (resEndBoard.status === "error") {
                // Primero se envía un evento para que todos los jugadores hagan
                // una jugada
                io.to("private:" + boardId).emit("play hand")
                
                // Se espera a que lleguen las jugadas
                res = await turnTimeout(boardId)

                if (res.status === "error") {
                    // Si se agotó el tiempo y no todos mandaron su jugada, se
                    // apunta
                    res = await PrivateBoardController.seeAbsents({ body: { board: res.board }})
                    if (res.status === "error") return res
                }

                // TODO: o se mete aquí otra función con la lógica, o se mete en
                // TournamentBoardController.manageHand

                resEndBoard = await PrivateBoardController.isEndOfGame(req)
            }

            // Se mira quién ha sido el ganador de la partida, se le avanza en
            // la ronda y se dan monedas si se tienen que dar
            await PrivateBoardController.finishBoard({ body: { boardId: boardId }})

            // io.to("private:" + boardId).emit("finish board")

        } catch (e) {
            return ({
                status: "error",
                message: "Error en el transcurso de la partida. " + e.message
            })
        }
    })

    // Este evento lo puede emitir cualquiera de los jugadores de una partida
    socket.on("new private message", async (req) => {
        // Parámetros en req.body: boardId, message, userId
        const boardId = req.body.boardId
        const message = req.body.message
        const userId = req.body.userId

        try {
            // Se añade el nuevo mensaje a la partida si no es una cadena vacía
            // y si el usuario se encuentra jugando la partida
            var res = await PrivateBoardController.newMessage(req)
            if (res.status === "error") return console.error(res)

            io.to('private:' + boardId).emit("new message", { message: message, userId: userId})
        } catch (e) {
            return console.error(e.message)
        }
    })

    })
}

module.exports = {
    Sockets
}
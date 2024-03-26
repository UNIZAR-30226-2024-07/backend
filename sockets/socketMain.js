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

const Sockets = async (io) => {
    io.on("connection", async (socket) => {

    // Para los usuarios que quieren jugar en un torneo
    socket.on("enter tournament board", async (req) => {
        // Parámetros que debe haber en req.body: tournamentId, round, userId

        try {
            ////////////////////////////////////////////////////////////////////
            // wait(TournamentMutex)
            var res = await MatcherController.playTournament(req)
            if (res.status === "error") return console.log(res.message)
            const boardId = res.board._id

            socket.join("tournament:" + boardId)

            const reqIsFull = { body: { boardId: boardId }}
            res = await MatcherController.isTournamentBoardReady(reqIsFull)
            if (res.status === "error") return;
            // signal(TournamentMutex)
            ////////////////////////////////////////////////////////////////////

            io.to("tournament:" + boardId).emit("starting tournament board", boardId)

            const reqUsers = { body: { boardId: boardId, typeBoardname: "tournament" } }
            res = await MatcherController.eliminateWaitingUsers(reqUsers)
            
        } catch (e) {
            return console.log(e.message)
        }        
    })

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

    socket.on("pruebita", async (req) => {
        console.log(socket.rooms)
        socket.join(req.userId)
        console.log(socket.rooms)
    })

    socket.on("prueba", async (req) => {
        console.log("estoy esperando")
        
        await waitPublic()

        console.log("Estoy dentro de la SC")
        io.to(req.userId).emit("SC")

        await sleep(2000)

        signalPublic()

        console.log("He salido de la SC")
    })
    
    })
}

module.exports = {
    Sockets
}
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

            io.to("tournament:" + boardId).emit("starting board", boardId)

            const reqUsers = { body: { boardId: boardId, typeBoardname: "tournament" } }
            res = await MatcherController.eliminateWaitingUsers(reqUsers)
            
        } catch (e) {
            return console.log(res.message)
        }        
    })

    // Para los usuarios que quieren jugar en un torneo
    socket.on("enter public board", async (req) => {
        // Parámetros que debe haber en req.body: typeId, userId

        try {
            ////////////////////////////////////////////////////////////////////
            // wait(PublicMutex)
            var res = await MatcherController.playPublic(req)
            if (res.status === "error") return console.log(res.message)
            const boardId = res.board._id

            socket.join("public:" + boardId)

            const reqIsFull = { body: { boardId: boardId }}
            res = await MatcherController.isPublicBoardReady(reqIsFull)
            if (res.status === "error") return;
            // signal(PublicMutex)
            ////////////////////////////////////////////////////////////////////

            io.to("public:" + boardId).emit("starting board", boardId)

            const reqUsers = { body: { boardId: boardId, typeBoardName: "public" } }
            res = await MatcherController.eliminateWaitingUsers(reqUsers)
            
        } catch (e) {
            return console.log(res.message)
        }
    })
    

    // Para los usuarios que quieren jugar en partida pública
    socket.on("create private board", async (req) => {
        // Parámetros que debe haber en req.body: name, password

        try {
            ////////////////////////////////////////////////////////////////////
            // wait(PrivateMutex)
            var res = await MatcherController.playPrivate(req)
            if (res.status === "error") return console.log(res.message)
            const boardId = res.board._id

            socket.join("public:" + boardId)

            const reqIsFull = { body: { boardId: boardId }}
            res = await MatcherController.isPublicBoardReady(reqIsFull)
            if (res.status === "error") return;
            // signal(PrivateMutex)
            ////////////////////////////////////////////////////////////////////

            io.to("public:" + boardId).emit("starting board", boardId)

            const reqUsers = { body: { boardId: boardId, typeBoardName: "public" } }
            res = await MatcherController.eliminateWaitingUsers(reqUsers)
            
        } catch (e) {
            return console.log(res.message)
        }        
    })


    // Para los usuarios que quieren jugar en partida pública
    socket.on("enter private board", async (req) => {
        // Parámetros que debe haber en req.body: typeId, userId

        try {
            ////////////////////////////////////////////////////////////////////
            // wait(PrivateMutex)
            var res = await MatcherController.playPrivate(req)
            if (res.status === "error") return console.log(res.message)
            const boardId = res.board._id

            socket.join("public:" + boardId)

            const reqIsFull = { body: { boardId: boardId }}
            res = await MatcherController.isPublicBoardReady(reqIsFull)
            if (res.status === "error") return;
            // signal(PrivateMutex)
            ////////////////////////////////////////////////////////////////////

            io.to("public:" + boardId).emit("starting board", boardId)

            const reqUsers = { body: { boardId: boardId, typeBoardName: "public" } }
            res = await MatcherController.eliminateWaitingUsers(reqUsers)
            
        } catch (e) {
            return console.log(res.message)
        }        
    })

    // Para los usuarios que quieren jugar en partida pública
    socket.on("enter public board", async (req) => {
        // Parámetros que debe haber en req: typeId, round, userId
        const typeId = req.typeId
        const userId = req.userId

        try {
            // Se busca una partida en espera que coincida en torneo y ronda
            const matcher = await Matcher.findById(MatcherController.matcherId)
            if (!matcher) {
                return console.error("No se encontró el emparejador")
            }

            // Se busca una partida ya empezada
            const board = matcher.waiting_public_boards.find(board => 
                board.typePublicBoard === typeId)

            // Si no existe una partida en la que pueda jugar el usuario, se
            // crea una nueva con las características dadas
            if (!board) {
                let resAdd
                const reqAdd = { body: { typeId: typeId } }
                await MatcherController.addPublicBoard(reqAdd, resAdd)
                if (resAdd.status !== "success") {
                    return console.error(resAdd.message)
                }

                // Se añade el usuario a la partida
                let resAddPlayer
                const reqAddPlayer = { body: { userId: userId, boardId: resAdd.board._id }}
                await PublicBoardController.addPlayer(reqAddPlayer, resAddPlayer)
                if (resAddPlayer.status !== "success") {
                    return console.error("No se pudo añadir el jugador a la mesa. " + resAddPlayer.message)
                }
                
                // Una vez creada, se añade este socket al grupo del board
                // para que cuando esté lista se inicie
                socket.join("public:" + resAdd.board._id)

            } else { // Si existe una partida en la que puede jugar, se une a ella
                let resAddPlayer
                const reqAddPlayer = { body: { userId: userId, boardId: resAdd.board._id }}
                await PublicBoardController.addPlayer(reqAddPlayer, resAddPlayer)
                if (resAddPlayer.status === "success") {
                    // Una vez creada, se añade este socket al grupo del board
                    // para que cuando esté lista se inicie
                    socket.join("public:" + resAdd.board._id)
                } else {
                    return console.error("No se pudo añadir el jugador a la mesa. " + resAddPlayer.message)
                }
            }
            
            // Ahora se comprueba si la mesa ya está ocupada y se puede empezar la partida
            let resIsFull
            const reqIsFull = { body: { boardId: resAddPlayer.board._id }}
            await PublicBoardController.isFull(reqIsFull, resIsFull)

            if (resIsFull.status === "success") {
                // Se elimina el board de la lista de mesas de torneo pendientes de jugadores
                const boardIndex = matcher.waiting_public_boards.findIndex(board => 
                    board.typePublicBoard === typeId)
                if (boardIndex !== -1) {
                    matcher.waiting_public_boards = matcher.waiting_public_boards.filter((_, index) => index !== boardIndex);
                    socket.in("public:" + resAddPlayer.board._id).emit("starting board", resAddPlayer.board)
                }
            }
            
            const updatedMatcher = await Matcher.findByIdAndUpdate(MatcherController.matcherId, matcher, { new: true })
            if (!updatedMatcher) {
                return console.error("No se encontró el matcher")
            }
            
        } catch (e) {
            console.error("No se pudo atender correctamente la petición de entrada a una mesa de torneo")
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
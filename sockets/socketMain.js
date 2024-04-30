const Matcher = require("../models/matcherSchema")
const MatcherController = require("../controllers/matcherContoller")
const TournamentBoardController = require("../controllers/boards/tournamentBoardController")
const PublicBoardController = require("../controllers/boards/publicBoardController")
const PrivateBoardController = require("../controllers/boards/privateBoardController")
const SingleBoardController = require("../controllers/boards/singleBoardController")
const BankController = require("../controllers/bankController")

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

const segundosRespuesta = 6
const segundos = 30
const periodo = 2

// Espera hasta que todos los jugadores hayan enviado sus jugadas un máximo de
// 30 segundos. Devuelve 'success' si y solo si todos los jugadores han enviado
// sus jugadas antes de los 30 segundos y 'error' en caso contrario
async function turnTimeout(boardId, typeBoardName) {
    try {
        var res
        var iter = segundos / periodo
        var i = 0
        let todosJugaron = false
        cuenta = segundos

        while (!todosJugaron && i < iter) {
            await sleep(periodo * 1000) // 5 segundos
            if (typeBoardName === "tournament") {
                res = await TournamentBoardController.allPlayersPlayed({ body: { boardId: boardId }})
            } else if (typeBoardName === "public") {
                res = await PublicBoardController.allPlayersPlayed({ body: { boardId: boardId }})
            } else if (typeBoardName === "private") {
                res = await PrivateBoardController.allPlayersPlayed({ body: { boardId: boardId }})
            }
            if (res.status === "success") todosJugaron = true
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
        console.error("Error mientras se esperaba la jugada de todos los jugadores. " + e.message)
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
                        
        } catch (e) {
            return console.error(e.message)
        }        
    })

    // Este evento lo emite el guest de la mesa y sirve para empezar a enviar
    // eventos que permitan jugar la partida
    socket.on("players tournament ready", async (req) => {
        // Parámetros en body: boardId
        if (!req.body.boardId) return console.log("Se requiere de body.boardId")
        const boardId = req.body.boardId

        try {
            var res
            var resEndBoard = { status: "error" }

            while (resEndBoard.status === "error") {
                // Generar primeras cartas del board para enviarlas
                res = await TournamentBoardController.boardByIdFunction({ body: { boardId: boardId }})
                if (res.status === "error") return console.error(res)
                const bankId = res.board.bank
                const players = res.board.players

                res = await BankController.initBoard({ body: { boardId: boardId,
                                                               bankId: bankId, 
                                                               players: players, 
                                                               typeBoardName: 'tournament'}})
                if (res.status === "error") return console.error(res)
                const initialCards = res.initBoard

                // Primero se envía un evento para que todos los jugadores hagan
                // una jugada
                io.to("tournament:" + boardId).emit("play hand", initialCards)
                
                // Se espera a que lleguen las jugadas
                res = await turnTimeout(boardId, "tournament")

                if (res.status === "error") {
                    // Si se agotó el tiempo y no todos mandaron su jugada, se
                    // apunta
                    res = await TournamentBoardController.seeAbsents({ body: { board: res.board }})
                    if (res.status === "error") return console.error(res)

                    if (res.playersToDelete.length > 0) {
                        io.to("tournament:" + boardId).emit("players deleted", res.playersToDelete)
                    }
                }

                // Se realizan las acciones correspondientes al fin de mano
                res = TournamentBoardController.manageHand({ body: {boardId: boardId }})
                if (res.status === "error") return console.error(res)
                
                // En las partidas de torneo no es necesario verificar si se han
                // eliminado usuarios por falta de vidas ya que eso se hace en
                // TournamentBoardController.isEndOfGame
                io.to("tournament:" + boardId).emit("hand results", res.results)

                // Se da tiempo a que visualicen los resultados de la mano
                await sleep(segundosRespuesta * 1000)

                resEndBoard = await TournamentBoardController.isEndOfGame(req)
            }

            // Se elimina a los jugadores de la lista de jugadores esperando mesa
            const reqUsers = { body: { boardId: boardId, typeBoardname: "tournament" } }
            res = await MatcherController.eliminateWaitingUsers(reqUsers)
            if (res.status === "error") return console.error(res.message)
            
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
        console.log("El usuario " + req.body.userId + " ha mandado un evento 'enter public board'")

        try {
            ////////////////////////////////////////////////////////////////////
            // wait(PublicMutex)
            var res = await MatcherController.playPublic(req)
            if (res.status === "error") return console.error(res.message)
            const boardId = res.board._id

            socket.join("public:" + boardId)

            const reqIsFull = { body: { boardId: boardId }}
            res = await MatcherController.isPublicBoardReady(reqIsFull)
            if (res.status === "error") return console.error("Usuario añadido a partida con id " + boardId)
            // signal(PublicMutex)
            ////////////////////////////////////////////////////////////////////
            
            // Si está lista, se notifica a los jugadores de la mesa
            io.to("public:" + boardId).emit("starting public board", boardId)

            console.log("Emitir: starting public board")/////////////////////////////////////////////////////////////////////////////////////////////////////////////
            
        } catch (e) {
            return console.error(e.message)
        }
    })

    // Este evento lo emite el guest de la mesa y sirve para empezar a enviar
    // eventos que permitan jugar la partida
    socket.on("players public ready", async (req) => {
        // Parámetros en body: boardId
        if (!req.body.boardId) return console.log("Se requiere de body.boardId")
        const boardId = req.body.boardId

        try {
            var res
            var resEndBoard = { status: "error" }

            while (resEndBoard.status === "error") {
                // Generar primeras cartas del board para enviarlas
                res = await PublicBoardController.boardByIdFunction({ body: { boardId: boardId }})
                if (res.status === "error") return console.error(res)
                const bankId = res.board.bank
                const players = res.board.players
                console.log("que pasa")

                console.log("Antes initBoard")
                // Se inicializa la banca para la ronda que se va a jugar
                res = await BankController.initBoard({ body: { boardId: boardId,
                                                               bankId: bankId, 
                                                               players: players, 
                                                               typeBoardName: 'public'}})
                if (res.status === "error") return console.error(res)
                const initialCards = res.initBoard

                console.log("Despues initBoard")
    
                // Primero se envía un evento para que todos los jugadores hagan
                // una jugada
                console.log(initialCards)
                io.to("public:" + boardId).emit("play hand", initialCards)
                
                // Se espera a que lleguen las jugadas
                console.log("Entro al timeout de 30 segundos")
                res = await turnTimeout(boardId, "public")
                console.log("Salgo del timeout de 30 segundos")

                if (res.status === "error") {
                    // Si se agotó el tiempo y no todos mandaron su jugada, se
                    // apunta
                    res = await PublicBoardController.seeAbsents({ body: { boardId: boardId }})
                    if (res.status === "error") return console.error(res)

                    if (res.playersToDelete.length > 0) {
                        io.to("public:" + boardId).emit("players deleted", res.playersToDelete)
                    }
                }

                // Se realizan las acciones correspondientes al fin de mano
                res = await PublicBoardController.manageHand({ body: { boardId: boardId }})
                if (res.status === "error") return console.error(res)

                // Se verifica si algún usuario fue expulsado, y en caso afirmativo
                // se notifica
                if (res.playersToDelete.length > 0) {
                    io.to("public:" + boardId).emit("players deleted", res.playersToDelete)
                }

                io.to("public:" + boardId).emit("hand results", res.results)

                // Se da tiempo a que visualicen los resultados de la mano
                await sleep(segundosRespuesta * 1000)
                console.log("Miramos si ha terminado la partida")
                resEndBoard = await PublicBoardController.isEndOfGame(req)
                console.log(resEndBoard)
            }

            // Se elimina a los jugadores de la lista de jugadores esperando mesa
            const reqUsers = { body: { boardId: boardId, typeBoardName: "public" } }
            res = await MatcherController.eliminateWaitingUsers(reqUsers)
            if (res.status === "error") return console.error(res.message)
            
            // Se mira quién ha sido el ganador de la partida, se le avanza en
            // la ronda y se dan monedas si se tienen que dar
            res = await PublicBoardController.finishBoard({ body: { boardId: boardId }})
            if (res.status === "error") return console.error(res.message)

            console.log("Partida finalizada")

            io.to("public:" + boardId).emit("finish board")

            // Se eliminan todos los sockets del room de la partida
            io.of("/").in("public:" + boardId).socketsLeave("public:" + boardId);

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

    socket.on("resume public board", async (req) => {
        // Parámetros en req.body: boardId, userId
        if (!req.body.boardId || !req.body.userId) return console.error("La petición debe contener un req.body.boardId y un req.body.userId")

        const boardId = req.body.boardId
        var res

        try {
            console.log("Empezamos resume")
            // Se llama a la función de reanudar partida
            res = await PublicBoardController.resume(req)
            if (res.status === "error") {
                socket.emit("error", (res.message))
                return console.error(res.message)
            } 

            socket.join("public:" + boardId)
            socket.emit("resume accepted")
            console.log("Terminamos resume")

        } catch (e) {
            return console.error("Error al reanudar la partida. " + e.message)
        }
    })


    ////////////////////////////////////////////////////////////////////////////
    // Partidas privadas
    ////////////////////////////////////////////////////////////////////////////

    // Para los usuarios que quieren jugar en partida pública
    socket.on("create private board", async (req) => {
        // Parámetros en req.body: userId, name, password, bankLevel, numPlayers, bet

        try {
            ////////////////////////////////////////////////////////////////////
            // wait(PrivateMutex)
            var res = await MatcherController.createPrivate(req)
            if (res.status === "error") {
                socket.emit("error", res)
                return console.error(res.message)
            }
            const boardId = res.board._id
            // signal(PrivateMutex)
            ////////////////////////////////////////////////////////////////////

            socket.join("private:" + boardId)     

        } catch (e) {
            return console.error(e.message)
        }        
    })

    // Para los usuarios que quieren jugar en partida pública
    socket.on("enter private board", async (req) => {
        // Parámetros que debe haber en req.body: name, password, userId

        try {
            ////////////////////////////////////////////////////////////////////
            // wait(PrivateMutex)
            var res = await MatcherController.playPrivate(req)
            if (res.status === "error") return console.error(res.message)
            const boardId = res.board._id

            socket.join("private:" + boardId)

            const reqIsFull = { body: { boardId: boardId }}
            res = await MatcherController.isPrivateBoardReady(reqIsFull)
            if (res.status === "error") return;
            // signal(PrivateMutex)
            ////////////////////////////////////////////////////////////////////

            // Si está lista, se notifica a los jugadores de la mesa
            io.to("private:" + boardId).emit("starting private board", boardId, initialCards)
            
        } catch (e) {
            return console.error(e.message)
        }        
    })

    // Este evento lo emite el guest de la mesa y sirve para empezar a enviar
    // eventos que permitan jugar la partida
    socket.on("players private ready", async (req) => {
        // Parámetros en body: boardId
        if (!req.body.boardId) return console.log("Se requiere de body.boardId")
        const boardId = req.body.boardId

        try {
            var res
            var resEndBoard = { status: "error" }

            while (resEndBoard.status === "error") {
                // Generar primeras cartas del board para enviarlas
                res = await PrivateBoardController.boardByIdFunction({ body: { boardId: boardId }})
                if (res.status === "error") return console.error(res)
                const bankId = res.board.bank
                const players = res.board.players
                
                res = await BankController.initBoard({ body: { boardId:boardId,
                                                               bankId: bankId, 
                                                               players: players,
                                                               typeBoardName: 'private' }})
                if (res.status === "error") return console.error(res)
                const initialCards = res.initBoard

                // Primero se envía un evento para que todos los jugadores hagan
                // una jugada
                io.to("private:" + boardId).emit("play hand", initialCards)
                
                // Se espera a que lleguen las jugadas
                res = await turnTimeout(boardId, "private")

                if (res.status === "error") {
                    // Si se agotó el tiempo y no todos mandaron su jugada, se
                    // apunta
                    res = await PrivateBoardController.seeAbsents({ body: { board: res.board }})
                    if (res.status === "error") return console.error(res)

                    if (res.playersToDelete.length > 0) {
                        io.to("private:" + boardId).emit("players deleted", res.playersToDelete)
                    }
                }

                // Se realizan las acciones correspondientes al fin de mano
                res = await PrivateBoardController.manageHand({ body: { boardId: boardId }})
                if (res.status === "error") return console.error(res)

                // Se verifica si algún usuario fue expulsado, y en caso afirmativo
                // se notifica
                if (res.playersToDelete.length > 0) {
                    io.to("private:" + boardId).emit("players deleted", res.playersToDelete)
                }

                io.to("private:" + boardId).emit("hand results", res.results)

                // Se da tiempo a que visualicen los resultados de la mano
                await sleep(segundosRespuesta * 1000)

                resEndBoard = await PrivateBoardController.isEndOfGame(req)
            }

            // Se elimina a los jugadores de la lista de jugadores esperando mesa
            const reqUsers = { body: { boardId: boardId, typeBoardName: "private" }}
            res = await MatcherController.eliminateWaitingUsers(reqUsers)
            if (res.status === "error") return console.error(res.message)
            
            // Se mira quién ha sido el ganador de la partida, se le avanza en
            // la ronda y se dan monedas si se tienen que dar
            await PrivateBoardController.finishBoard({ body: { boardId: boardId }})

            io.to("private:" + boardId).emit("finish board") // COMPLETAR: resultados de finishBoard

        } catch (e) {
            return console.error(e.message)
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

            io.to('private:' + boardId).emit("new message", { message: message, 
                                                              name: res.nameEmitter,
                                                              userId: userId })
        } catch (e) {
            return console.error(e.message)
        }
    })

    ////////////////////////////////////////////////////////////////////////////
    // Partidas Single
    ////////////////////////////////////////////////////////////////////////////

    // Para los usuarios que quieren jugar en solitario
    socket.on("enter single board", async (req) => {
        // Parámetros que debe haber en req.body: bankLevel, userId
        
        try {
            ////////////////////////////////////////////////////////////////////
            // wait(PublicMutex)

            let res
            res = await SingleBoardController.add(req)
            if (res.status === "error") return console.error(res.message)
            const boardId = res.board._id

            socket.join("single:" + boardId)
            io.to("single:" + boardId).emit("starting single board", boardId)

            console.log("Emitir: starting single board")/////////////////////////////////////////////////////////////////////////////////////////////////////////////
            
        } catch (e) {
            return console.error(e.message)
        }
    })

    socket.on("players single ready", async (req) => {

        console.log("Llega: players single ready")/////////////////////////////////////////////////////////////////////////////////////////////////////////////

        // Parámetros en body: boardId
        if (!req.body.boardId) return console.log("Se requiere de body.boardId")
        const boardId = req.body.boardId

        try {

            // signal(PublicMutex)
            ////////////////////////////////////////////////////////////////////
            var resEndBoard = { status: "error" }

            console.log("Inicializar bucle")/////////////////////////////////////////////////////////////////////////////////////////////////////////////


            while (resEndBoard.status === "error") {

                console.log("Dentro bucle")/////////////////////////////////////////////////////////////////////////////////////////////////////////////

                // Generar primeras cartas del board para enviarlas
                res = await SingleBoardController.boardByIdFunction({ body: { boardId: boardId }})
                if (res.status === "error") {
                    console.error(res)
                    return console.error(res)
                }

                console.log("Después: boardByIdFunction", res)/////////////////////////////////////////////////////////////////////////////////////////////////////////////

                if (res.status === "error") return console.error(res)

                console.log("Antes: players = ")/////////////////////////////////////////////////////////////////////////////////////////////////////////////
                const players = res.board.players
                const bankId = res.board.bank
                console.log("Después: players = ")/////////////////////////////////////////////////////////////////////////////////////////////////////////////


                console.log("Antes initBoard", players, bankId, boardId)
                // Se inicializa la banca para la ronda que se va a jugar
                res = await BankController.initBoard({ body: { boardId: boardId,
                                                               bankId: bankId, 
                                                               players: players, 
                                                               typeBoardName: 'single'}})
                    if (res.status === "error") {
                    console.error(res)
                    return console.error(res)
                }
                const initialCards = res.initBoard

                console.log("Despues initBoard")
    
                // Primero se envía un evento para que todos los jugadores hagan
                // una jugada
                io.to("single:" + boardId).emit("play hand", initialCards, boardId)
                
                // Se espera a que conteste el jugador
                res = { status: "error" }
                while (res.status === "error") {
                    res = await SingleBoardController.allPlayersPlayed({ body: { boardId: boardId }})
                }

                // Se realizan las acciones correspondientes al fin de mano
                res = await SingleBoardController.manageHand({ body: { boardId: boardId }})
                if (res.status === "error") {
                    console.error(res)
                    return console.error(res)
                }

                io.to("single:" + boardId).emit("hand results", res.results)

                // Se da tiempo a que visualicen los resultados de la mano
                await sleep(segundosRespuesta * 1000)
                console.log("Miramos si ha terminado la partida")
                resEndBoard = await SingleBoardController.isEndOfGame({ body: { boardId: boardId }})
                console.log(resEndBoard)
            }
            
            // Se mira quién ha sido el ganador de la partida, se le avanza en
            // la ronda y se dan monedas si se tienen que dar
            res = await SingleBoardController.finishBoard({ body: { boardId: boardId }})
            if (res.status === "error") return console.error(res.message)

            console.log("Partida finalizada")

            // io.to("single:" + boardId).emit("finish board")

            // Se eliminan todos los sockets del room de la partida
            io.of("/").in("single:" + boardId).socketsLeave("single:" + boardId);
            
        } catch (e) {
            return ({
                status: "error",
                message: "Error en el transcurso de la partida. " + e.message
            })
        }
    })

    })
}

module.exports = {
    Sockets
}
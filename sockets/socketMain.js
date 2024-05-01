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
        console.log("++ tournament: enter tournament board")
        console.log("++++++ tournamentId: ", req.body.tournamentId)
        console.log("++++++ userId: ", req.body.userId)
        console.log("\n")

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
            if (res.status === "error") return console.error(res.message)
            // signal(TournamentMutex)
            ////////////////////////////////////////////////////////////////////

            // Si está lista, se notifica a los jugadores de la mesa
            io.to("tournament:" + boardId).emit("starting tournament board", boardId)
            console.log("-- tournament: starting tournament board")
            console.log("------ boardId: ", boardId)
            console.log("\n")
                        
        } catch (e) {
            return console.error(e.message)
        }        
    })

    // Este evento lo emite el guest de la mesa y sirve para empezar a enviar
    // eventos que permitan jugar la partida
    socket.on("players tournament ready", async (req) => {

        // Parámetros en body: boardId
        console.log("++ tournament: players tournament ready")
        console.log("++++++ boardId: ", req.body.boardId)
        console.log("\n")
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

                console.log("++ tournament: NUEVA MANO__________: " + res.board.hand.numHand + "\n")

                res = await BankController.initBoard({ body: { boardId: boardId,
                                                               bankId: bankId, 
                                                               players: players, 
                                                               typeBoardName: 'tournament'}})
                if (res.status === "error") return console.error(res)
                const initialCards = res.initBoard

                // Primero se envía un evento para que todos los jugadores hagan
                // una jugada
                io.to("tournament:" + boardId).emit("play hand", initialCards)
                console.log("-- tournament: play hand")
                console.log("\n")
                
                // Se espera a que lleguen las jugadas
                res = await turnTimeout(boardId, "tournament")

                if (res.status === "error") {
                    // Si se agotó el tiempo y no todos mandaron su jugada, se
                    // apunta
                    res = await TournamentBoardController.seeAbsents({ body: { board: res.board }})
                    if (res.status === "error") return console.error(res)

                    if (res.playersToDelete.length > 0) {
                        io.to("tournament:" + boardId).emit("players deleted", res.playersToDelete)
                        console.log("-- tournament: players deleted")
                        console.log("------ playersToDelete: ", res.playersToDelete)
                        console.log("\n")
                    }
                }

                // Se realizan las acciones correspondientes al fin de mano
                res = TournamentBoardController.manageHand({ body: {boardId: boardId }})
                if (res.status === "error") return console.error(res)
                
                // En las partidas de torneo no es necesario verificar si se han
                // eliminado usuarios por falta de vidas ya que eso se hace en
                // TournamentBoardController.isEndOfGame
                io.to("tournament:" + boardId).emit("hand results", res.results)
                console.log("-- tournament: hand results")
                console.log("\n")

                console.log("-- tournament: VISUALIZANDO RESULTADOS\n")
                // Se da tiempo a que visualicen los resultados de la mano
                await sleep(segundosRespuesta * 1000)

                resEndBoard = await TournamentBoardController.isEndOfGame(req)
            }

            console.log("++ tournament: IS END OF GAME\n")
            // Se elimina a los jugadores de la lista de jugadores esperando mesa
            const reqUsers = { body: { boardId: boardId, typeBoardname: "tournament" } }
            res = await MatcherController.eliminateWaitingUsers(reqUsers)
            if (res.status === "error") return console.error(res.message)
            
            // Se mira quién ha sido el ganador de la partida, se le avanza en
            // la ronda y se dan monedas si se tienen que dar
            res = await TournamentBoardController.finishBoard({ body: { boardId: boardId }})
            if (res.status === "error") return console.error(res.message)

            io.to("tournament:" + boardId).emit("finish board")///////////////////////////////////////////////////////////
            console.log("-- tournament: finish board\n")

            // Se eliminan todos los sockets del room de la partida
            io.of("/").in("tournament:" + boardId).socketsLeave("tournament:" + boardId);

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
        console.log("++ tournament: new tournament message\n")

        const boardId = req.body.boardId
        const message = req.body.message
        const userId = req.body.userId

        try {
            // Se añade el nuevo mensaje a la partida si no es una cadena vacía
            // y si el usuario se encuentra jugando la partida
            var res = await TournamentBoardController.newMessage(req)
            if (res.status === "error") return console.error(res)

            io.to("tournament:" + boardId).emit("new message", { message: message, 
                                                                 name: res.nameEmitter,
                                                                 userId: userId})
            console.log("-- tournament: new message\n")

        } catch (e) {
            return console.error(e.message)
        }
    })

    
    ////////////////////////////////////////////////////////////////////////////
    // Partidas públicas
    ////////////////////////////////////////////////////////////////////////////

    // Para los usuarios que quieren jugar publica
    socket.on("enter public board", async (req) => {

        // Parámetros que debe haber en req.body: typeId, userId
        console.log("++ public: enter public board")
        console.log("++++++ typeId: ", req.body.typeId)
        console.log("++++++ userId: ", req.body.userId)
        console.log("\n")

        try {
            ////////////////////////////////////////////////////////////////////
            // wait(PublicMutex)
            var res = await MatcherController.playPublic(req)
            if (res.status === "error") return console.error(res.message)
            const boardId = res.board._id

            socket.join("public:" + boardId)

            const reqIsFull = { body: { boardId: boardId }}
            res = await MatcherController.isPublicBoardReady(reqIsFull)
            if (res.status === "error") return console.error(res.message)
            // signal(PublicMutex)
            ////////////////////////////////////////////////////////////////////
            
            // Si está lista, se notifica a los jugadores de la mesa
            io.to("public:" + boardId).emit("starting public board", boardId)
            console.log("-- public: starting public board")
            console.log("------ boardId: ", boardId)
            console.log("\n")
            
        } catch (e) {
            return console.error(e.message)
        }
    })

    // Este evento lo emite el guest de la mesa y sirve para empezar a enviar
    // eventos que permitan jugar la partida
    socket.on("players public ready", async (req) => {
        
        // Parámetros en body: boardId
        console.log("++ public: players public ready")
        console.log("++++++ boardId: ", req.body.boardId)
        console.log("\n")

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

                console.log("++ public: NUEVA MANO__________: " + res.board.hand.numHand + "\n")

                res = await PublicBoardController.restBet({ body: { boardId: boardId }})
                if (res.status === "error") return console.error(res)

                // Se inicializa la banca para la ronda que se va a jugar
                res = await BankController.initBoard({ body: { boardId: boardId,
                                                               bankId: bankId, 
                                                               players: players, 
                                                               typeBoardName: 'public'}})
                if (res.status === "error") return console.error(res)
                const initialCards = res.initBoard
    
                // Primero se envía un evento para que todos los jugadores hagan
                // una jugada
                io.to("public:" + boardId).emit("play hand", initialCards)
                console.log("-- public: play hand")
                console.log("\n")
                
                // Se espera a que lleguen las jugadas
                res = await turnTimeout(boardId, "public")

                if (res.status === "error") {
                    // Si se agotó el tiempo y no todos mandaron su jugada, se
                    // apunta
                    res = await PublicBoardController.seeAbsents({ body: { boardId: boardId }})
                    if (res.status === "error") return console.error(res)

                    if (res.playersToDelete.length > 0) {
                        io.to("public:" + boardId).emit("players deleted", res.playersToDelete)
                        console.log("-- public: players deleted")
                        console.log("------ playersToDelete: ", res.playersToDelete)
                        console.log("\n")
                    }
                }

                // Se realizan las acciones correspondientes al fin de mano
                res = await PublicBoardController.manageHand({ body: { boardId: boardId }})
                if (res.status === "error") return console.error(res)

                // Se verifica si algún usuario fue expulsado, y en caso afirmativo
                // se notifica
                if (res.playersToDelete.length > 0) {
                    io.to("public:" + boardId).emit("players deleted", res.playersToDelete)
                    console.log("-- public: players deleted")
                    console.log("------ playersToDelete: ", res.playersToDelete)
                    console.log("\n")
                }

                io.to("public:" + boardId).emit("hand results", res.results)
                console.log("-- public: hand results")
                console.log("\n")

                console.log("-- public: VISUALIZANDO RESULTADOS\n")
                // Se da tiempo a que visualicen los resultados de la mano
                await sleep(segundosRespuesta * 1000)

                resEndBoard = await PublicBoardController.isEndOfGame(req)
            }

            console.log("++ public: IS END OF GAME\n")
            // Se elimina a los jugadores de la lista de jugadores esperando mesa
            const reqUsers = { body: { boardId: boardId, typeBoardName: "public" } }
            res = await MatcherController.eliminateWaitingUsers(reqUsers)
            if (res.status === "error") return console.error(res.message)
            
            // Se mira quién ha sido el ganador de la partida, se le avanza en
            // la ronda y se dan monedas si se tienen que dar
            res = await PublicBoardController.finishBoard({ body: { boardId: boardId }})
            if (res.status === "error") return console.error(res.message)

            io.to("public:" + boardId).emit("finish board")
            console.log("-- public: finish board\n")

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
        console.log("++ public: new public message\n")

        const boardId = req.body.boardId
        const message = req.body.message
        const userId = req.body.userId

        try {
            // Se añade el nuevo mensaje a la partida si no es una cadena vacía
            // y si el usuario se encuentra jugando la partida
            var res = await PublicBoardController.newMessage(req)
            if (res.status === "error") return console.error(res)

            io.to("public:" + boardId).emit("new message", { message: message, 
                                                             name: res.nameEmitter,
                                                             userId: userId})
            console.log("-- public: new message\n")
        } catch (e) {
            return console.error(e.message)
        }
    })

    socket.on("resume public board", async (req) => {

        // Parámetros en req.body: boardId, userId
        console.log("++ public: resume public board")
        console.log("++++++ boardId: ", req.body.boardId)
        console.log("++++++ userId: ", req.body.userId)

        if (!req.body.boardId || !req.body.userId)  {
            return console.error("La petición debe contener un req.body.boardId y un req.body.userId")
        }

        const boardId = req.body.boardId
        var res

        try {
            // Se llama a la función de reanudar partida
            res = await PublicBoardController.resume(req)
            if (res.status === "error") {
                socket.emit("error", (res.message))
                console.error("-- public: error")
                return console.error("------ error: ", res.message)
            } 

            socket.join("public:" + boardId)
            socket.emit("resume accepted")
            console.log("-- public: resume accepted")

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
        console.log("++ private: create private board")
        console.log("++++++ userId: ", req.body.userId)
        console.log("++++++ name: ", req.body.name)
        console.log("++++++ password: ", req.body.password)
        console.log("++++++ bankLevel: ", req.body.bankLevel)
        console.log("++++++ numPlayers: ", req.body.numPlayers)
        console.log("++++++ bet: ", req.body.bet)
        console.log("\n")

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

    // Para los usuarios que quieren jugar en partida privada
    socket.on("enter private board", async (req) => {

        // Parámetros que debe haber en req.body: name, password, userId
        console.log("++ private: enter private board")
        console.log("++++++ name: ", req.body.name)
        console.log("++++++ password: ", req.body.password)
        console.log("++++++ userId: ", req.body.userId)
        console.log("\n")

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
            console.log("-- private: starting private board")
            console.log("------ boardId: ", boardId)
            console.log("\n")

        } catch (e) {
            return console.error(e.message)
        }        
    })

    // Este evento lo emite el guest de la mesa y sirve para empezar a enviar
    // eventos que permitan jugar la partida
    socket.on("players private ready", async (req) => {
        
        // Parámetros en body: boardId
        console.log("++ private: players private ready")
        console.log("++++++ boardId: ", req.body.boardId)
        console.log("\n")

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

                console.log("++ private: NUEVA MANO__________: " + res.board.hand.numHand + "\n")
                
                res = await PrivateBoardController.restBet({ body: { boardId: boardId }})
                if (res.status === "error") return console.error(res)

                res = await BankController.initBoard({ body: { boardId:boardId,
                                                               bankId: bankId, 
                                                               players: players,
                                                               typeBoardName: 'private' }})
                if (res.status === "error") return console.error(res)
                const initialCards = res.initBoard

                // Primero se envía un evento para que todos los jugadores hagan
                // una jugada
                io.to("private:" + boardId).emit("play hand", initialCards)
                console.log("-- private: play hand")
                console.log("\n")
                
                // Se espera a que lleguen las jugadas
                res = await turnTimeout(boardId, "private")

                if (res.status === "error") {
                    // Si se agotó el tiempo y no todos mandaron su jugada, se
                    // apunta
                    res = await PrivateBoardController.seeAbsents({ body: { board: res.board }})
                    if (res.status === "error") return console.error(res)

                    if (res.playersToDelete.length > 0) {
                        io.to("private:" + boardId).emit("players deleted", res.playersToDelete)
                        console.log("-- private: players deleted")
                        console.log("------ playersToDelete: ", res.playersToDelete)
                        console.log("\n")
                    }
                }

                // Se realizan las acciones correspondientes al fin de mano
                res = await PrivateBoardController.manageHand({ body: { boardId: boardId }})
                if (res.status === "error") return console.error(res)

                // Se verifica si algún usuario fue expulsado, y en caso afirmativo
                // se notifica
                if (res.playersToDelete.length > 0) {
                    io.to("private:" + boardId).emit("players deleted", res.playersToDelete)
                    console.log("-- private: players deleted")
                    console.log("------ playersToDelete: ", res.playersToDelete)
                    console.log("\n")
                }

                io.to("private:" + boardId).emit("hand results", res.results)
                console.log("-- private: hand results")
                console.log("\n")

                console.log("-- private: VISUALIZANDO RESULTADOS\n")
                // Se da tiempo a que visualicen los resultados de la mano
                await sleep(segundosRespuesta * 1000)

                resEndBoard = await PrivateBoardController.isEndOfGame(req)
            }

            console.log("++ private: IS END OF GAME\n")
            // Se elimina a los jugadores de la lista de jugadores esperando mesa
            const reqUsers = { body: { boardId: boardId, typeBoardName: "private" }}
            res = await MatcherController.eliminateWaitingUsers(reqUsers)
            if (res.status === "error") return console.error(res.message)
            
            // Se mira quién ha sido el ganador de la partida, se le avanza en
            // la ronda y se dan monedas si se tienen que dar
            await PrivateBoardController.finishBoard({ body: { boardId: boardId }})
            if (res.status === "error") return console.error(res.message)

            io.to("private:" + boardId).emit("finish board")
            console.log("-- private: finish board\n")

            // Se eliminan todos los sockets del room de la partida
            io.of("/").in("private:" + boardId).socketsLeave("private:" + boardId);

        } catch (e) {
            return console.error(e.message)
        }
    })

    // Este evento lo puede emitir cualquiera de los jugadores de una partida
    socket.on("new private message", async (req) => {

        // Parámetros en req.body: boardId, message, userId
        console.log("++ private: new private message\n")

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
            console.log("-- private: new message\n")
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
        console.log("++ single: enter single board")
        console.log("++++++ bankLevel: ", req.body.bankLevel)
        console.log("++++++ userId: ", req.body.userId)
        console.log("\n")
        
        try {
            let res
            res = await SingleBoardController.add(req)
            if (res.status === "error") return console.error(res.message)
            const boardId = res.board._id

            socket.join("single:" + boardId)
            io.to("single:" + boardId).emit("starting single board", boardId)
            console.log("-- single: starting single board")
            console.log("------ boardId: ", boardId)
            console.log("\n")
            
        } catch (e) {
            return console.error(e.message)
        }
    })

    socket.on("players single ready", async (req) => {

        // Parámetros en body: boardId
        console.log("++ single: players single ready")
        console.log("++++++ boardId: ", req.body.boardId)
        console.log("\n")

        if (!req.body.boardId) return console.log("Se requiere de body.boardId")
        const boardId = req.body.boardId

        try {
            var resEndBoard = { status: "error" }
            while (resEndBoard.status === "error") {

                // Generar primeras cartas del board para enviarlas
                res = await SingleBoardController.boardByIdFunction({ body: { boardId: boardId }})
                if (res.status === "error") return console.error(res)
                const players = res.board.players
                const bankId = res.board.bank

                console.log("++ single: NUEVA MANO\n")

                // Se inicializa la banca para la ronda que se va a jugar
                res = await BankController.initBoard({ body: { boardId: boardId,
                                                               bankId: bankId, 
                                                               players: players, 
                                                               typeBoardName: 'single'}})
                if (res.status === "error") return console.error(res)
                const initialCards = res.initBoard
    
                // Primero se envía un evento para que todos los jugadores hagan
                // una jugada
                io.to("single:" + boardId).emit("play hand", initialCards)
                console.log("-- single: play hand")
                console.log("\n")
                
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
                console.log("-- single: hand results")
                console.log("\n")

                console.log("-- single: VISUALIZANDO RESULTADOS\n")
                // Se da tiempo a que visualicen los resultados de la mano
                await sleep(segundosRespuesta * 1000)

                resEndBoard = await SingleBoardController.isEndOfGame({ body: { boardId: boardId }})
            }
            
            // Se mira quién ha sido el ganador de la partida, se le avanza en
            // la ronda y se dan monedas si se tienen que dar
            res = await SingleBoardController.finishBoard({ body: { boardId: boardId }})
            if (res.status === "error") return console.error(res.message)

            console.log("++ single: IS END OF GAME\n")

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
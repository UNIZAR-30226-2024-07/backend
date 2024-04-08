const Matcher = require("../models/matcherSchema")
const TournamentBoardController = require("./boards/tournamentBoardController")
const TournamentController = require("./tournamentController")
const PublicBoardController = require("./boards/publicBoardController")
const PrivateBoardController = require("./boards/privateBoardController")
const { default: mongoose } = require("mongoose")

// El id del matcher
var matcherId = new mongoose.Types.ObjectId()

////////////////////////////////////////////////////////////////////////////////
// Funciones generales
////////////////////////////////////////////////////////////////////////////////
async function init() {
    try {
        // Se eliminan todas las instancias de matcher
        await Matcher.deleteMany({})

        const matcher = await Matcher.findById(matcherId)
        if (!matcher) {
            const newMatcher = await Matcher.create({})
            if (!newMatcher) {
                return ({
                    status: "error",
                    message: "Error interno al crear el emparejador"
                })
            } else {
                matcherId = newMatcher._id
                return ({
                    status: "success",
                    message: "Matcher creado correctamente",
                    matcher: newMatcher
                })
            }
        } else {
            return ({
                status: "success",
                message: "Matcher creado correctamente",
                matcher: matcher
            })
        }    
    } catch (e) {
        return ({
            status: "success",
            message: "Error interno al crear el emparejador. " + e.message
        })
    }
}

function isAlreadyWaiting(matcher, userId) {
    const alreadyWaiting = matcher.players_waiting.find(player => 
        player.player.equals(userId))
    if (alreadyWaiting) {
        return ({
            status: "error",
            message: "El usuario ya estaba esperando a jugar una partida"
        })
    } else {
        return ({
            status: "success",
            message: "El usuario no está esperando a jugar ninguna partida"
        })
    }
}

async function eliminateWaitingUsers(req) {
    // Dos opciones de parámetros
    // 1: req.body: boardId, typeBoardName
    // 2: req.body: playersToDelete

    try {
        // Se busca una partida en espera que coincida en torneo y ronda
        const matcher = await Matcher.findById(matcherId)
        if (!matcher) {
            return ({
                status: "error",
                message: "Error al encontrar el emparejador"
            })
        }

        if (req.body.typeBoardName && req.body.boardId) {
            const typeBoardName = req.body.typeBoardName // 'tournament', 'public', 'private'

            // Se recupera la partida para saber todos los jugadores
            var res
            if (typeBoardName === "tournament") {
                res = await TournamentBoardController.boardByIdFunction(req)
                if (res.status === "error") return res

            } else if (typeBoardName === "public") {
                res = await PublicBoardController.boardByIdFunction(req)
                if (res.status === "error") return res
            
            } else if (typeBoardName === "private") {
                res = await PrivateBoardController.boardByIdFunction(req)
                if (res.status === "error") return res
            }

            // Se cogen todos aquellos que no esten en la partida pasada
            matcher.players_waiting = matcher.players_waiting.filter(playerWaiting => 
                !res.board.players.some(player => player.player.equals(playerWaiting.player)))
        } else if (req.body.playersToDelete) {
            const playersToDelete = req.body.playersToDelete

            matcher.players_waiting = matcher.players_waiting.filter(playerWaiting =>
                !playersToDelete.includes(playerWaiting.player))
        } else {
            return ({
                status: "error",
                message: "Parámetros incorrectos. Los parámetros deben ser boardId y typeBoardName ó playersToDelete"
            })
        }

        // Guardar los cambios en el emparejador
        await matcher.save()

        return ({
            status: "success",
            message: "Usuarios eliminados de la lista de espera correctamente"
        })
        
    } catch (e) {
        return ({
            status: "error",
            message: "Error al eliminar los usuarios de la lista de espera. " + e.message
        })
    }
}

// Elimina un solo usuario con ID proporcionado de la lista de usuarios en espera
async function eliminateWaitingUser(req) {
    // Parámetros en req.body: userId
    const userId = req.body.userId

    try {
        // Se busca una partida en espera que coincida en torneo y ronda
        const matcher = await Matcher.findById(matcherId)
        if (!matcher) {
            return ({
                status: "error",
                message: "Error al encontrar el emparejador"
            })
        }

        // Se cogen todos aquellos que no esten en la partida pasada
        matcher.players_waiting = matcher.players_waiting.filter(playerWaiting =>
            playerWaiting.player !== userId)

        // Guardar los cambios en el emparejador
        await matcher.save()

        return ({
            status: "success",
            message: "Usuarios eliminados de la lista de espera correctamente"
        })
        
    } catch (e) {
        return ({
            status: "error",
            message: "Error al eliminar los usuarios de la lista de espera"
        })
    }
}

////////////////////////////////////////////////////////////////////////////////
// Mesas de Torneos
////////////////////////////////////////////////////////////////////////////////
async function addTournamentBoard(req) {
    const tId = req.body.tournamentId
    const round = req.body.round
    const matcher = req.body.matcher

    try {
        // Se crea la mesa de torneo
        const reqBoard = { body: { tournamentId: tId, round: round }}
        var res = await TournamentBoardController.add(reqBoard)
        if (res.status === "error") return res

        // Se añade la mesa a la lista de mesas de torneos esperando a jugadores
        matcher.waiting_tournament_boards.push({ board: res.board._id,
                                                 tournament: tId,
                                                 round: round })

        const updatedMatcher = await Matcher.findByIdAndUpdate(matcherId, 
                                                               matcher,
                                                               { new: true });
        if (!updatedMatcher) {
            return ({
                status: "error",
                message: "Error al añadir la mesa de torneo a la lista de mesas esperando jugadores"
            })    
        }

        return ({
            status: "success",
            message: "Mesa de torneo creada y añadida a la lista de espera correctamente",
            matcher: updatedMatcher,
            board: res.board
        })
    
    } catch (e) {
        return ({
            status: "error",
            message: "Error al crear la partida de torneo"
        })

    }
}

async function playTournament(req) {
    const tId = req.body.tournamentId
    const userId = req.body.userId

    try {
        // Se recupera el emparejador
        const matcher = await Matcher.findById(matcherId)
        if (!matcher) {
            return ({
                status: "error",
                message: "Error al encontrar el emparejador"
            })
        }

        // Se verifica que el jugador no esté esperando ya otra partida
        var res = isAlreadyWaiting(matcher, userId)
        if (res.status === "error") return res

        // Se verifica que el jugador haya pagado la tasa de entrada al torneo
        res = await TournamentController.isUserInTournamentFunction({ body: { tournamentId: tId,
                                                                              userId: userId }})
        if (res.status === "error") return res

        const round = res.round
        // Se añade el jugador a la lista de jugadores esperando partida
        matcher.players_waiting.push({ player: userId })

        // Se busca una partida ya empezada
        var board = matcher.waiting_tournament_boards.find(board => 
            board.tournament.equals(tId) && board.round === round)
        
        // Si no existe una partida en la que pueda jugar el usuario, se
        // crea una nueva con las características dadas
        if (!board) {
            const reqAdd = { body: {matcher: matcher,
                                    tournamentId: tId, 
                                    round: round } }
            res = await addTournamentBoard(reqAdd)
            if (res.status === "error") return res
            board = res.board
        } else {
            board = board.board
        }

        // Se añade el usuario a la partida
        const reqAddPlayer = { body: { userId: userId, boardId: board._id }}
        res = await TournamentBoardController.addPlayer(reqAddPlayer)
        if (res.status === "error") return res
        
        board = res.board
        return ({
            status: "success",
            message: "El jugador ha sido añadido a una mesa de torneo",
            board: board
        })
    } catch (e) {
        return ({
            status: "error",
            message: "No se pudo asignar una partida al jugador"
        })
    }
}

async function isTournamentBoardReady(req) {
    const boardId = req.body.boardId

    try {
        // Se recupera el matcher
        var matcher = await Matcher.findById(matcherId)
        if (!matcher) {
            return console.error("No se encontró el emparejador")
        }

        // Se verifica si la mesa está llena
        const req = { body: { boardId: boardId } }
        var res = await TournamentBoardController.isFull(req)
        if (res.status === "error") return res

        // Se elimina el board de la lista de mesas de torneo pendientes de jugadores        
        const boardIndex = matcher.waiting_tournament_boards.findIndex(board => 
            board.board.equals(boardId))
        if (boardIndex === -1) {
            return ({
                status: "error",
                message: "Error al encontrar la mesa para eliminarla de la lista de espera"
            })
        }
        matcher.waiting_tournament_boards = matcher.waiting_tournament_boards.filter((_, index) => index !== boardIndex);
        const updatedMatcher = await Matcher.findByIdAndUpdate(matcherId, 
                                                               matcher, 
                                                               { new: true })
        if (!updatedMatcher) {
            return ({
                status: "error",
                message: "No se encontró el matcher al guardar los cambios"
            })
        }

        return ({
            status: "success",
            message: "La partida está lista y ha sido eliminada de la lista de espera. Ahora elimine los usuarios de la lista de usuarios buscando partida",
        })
    } catch (e) {
        return ({
            status: "error",
            message: "Error al verificar si la mesa de torneo está lista"
        })
    }
}

////////////////////////////////////////////////////////////////////////////////
// Mesas Públicas
////////////////////////////////////////////////////////////////////////////////
async function addPublicBoard(req) {
    const typeId = req.body.typeId
    const matcher = req.body.matcher

    try {
        // Se crea la mesa de torneo
        const reqBoard = { body: { typeId: typeId }}
        var res = await PublicBoardController.add(reqBoard)
        if (res.status === "error") return res

        // Se añade la mesa a la lista de mesas de torneos esperando a jugadores
        matcher.waiting_public_boards.push({ board: res.board._id,
                                             typePublicBoard: typeId })

        const updatedMatcher = await Matcher.findByIdAndUpdate(matcherId, 
                                                               matcher,
                                                               { new: true });
        if (!updatedMatcher) {
            return ({
                status: "error",
                message: "Error al añadir la mesa pública a la lista de mesas esperando jugadores"
            })    
        }

        return ({
            status: "success",
            message: "Mesa pública creada y añadida a la lista de espera correctamente",
            matcher: updatedMatcher,
            board: res.board
        })
    
    } catch (e) {
        return ({
            status: "error",
            message: "Error al crear la partida pública. " + e.message
        })

    }
}

async function playPublic(req) {
    const typeId = req.body.typeId
    const userId = req.body.userId

    try {
        // Se recupera el emparejador
        const matcher = await Matcher.findById(matcherId)
        if (!matcher) {
            return ({
                status: "error",
                message: "Error al encontrar el emparejador"
            })
        }

        var res = isAlreadyWaiting(matcher, userId)
        if (res.status === "error") return res

        // Se añade el jugador a la lista de jugadores esperando partida
        matcher.players_waiting.push({ player: userId })

        // Se busca una partida ya empezada
        var board = matcher.waiting_public_boards.find(board => 
            board.typePublicBoard.equals(typeId))

        // Si no existe una partida en la que pueda jugar el usuario, se
        // crea una nueva con las características dadas
        if (!board) {
            const reqAdd = { body: {matcher: matcher,
                                    typeId: typeId } }
            res = await addPublicBoard(reqAdd)
            if (res.status === "error") return res
            board = res.board
        } else {
            board = board.board
        }

        // Se añade el usuario a la partida
        const reqAddPlayer = { body: { userId: userId, boardId: board._id }}
        res = await PublicBoardController.addPlayer(reqAddPlayer)
        if (res.status === "error") return res

        board = res.board
        return ({
            status: "success",
            message: "El jugador ha sido añadido a una mesa pública",
            board: board
        })
    } catch (e) {
        return ({
            status: "error",
            message: "No se pudo asignar una partida al jugador. " + e.message
        })
    }
}

async function isPublicBoardReady(req) {
    const boardId = req.body.boardId

    try {
        // Se recupera el matcher
        var matcher = await Matcher.findById(matcherId)
        if (!matcher) {
            return console.error("No se encontró el emparejador")
        }

        // Se verifica si la mesa está llena
        const req = { body: { boardId: boardId } }
        var res = await PublicBoardController.isFull(req)
        if (res.status === "error") return res

        // Se elimina el board de la lista de mesas de torneo pendientes de jugadores        
        const boardIndex = matcher.waiting_public_boards.findIndex(board => 
            board.board.equals(boardId))
        if (boardIndex === -1) {
            return ({
                status: "error",
                message: "Error al encontrar la mesa para eliminarla de la lista de espera"
            })
        }
        matcher.waiting_public_boards = matcher.waiting_public_boards.filter((_, index) => index !== boardIndex);
        const updatedMatcher = await Matcher.findByIdAndUpdate(matcherId, 
                                                               matcher, 
                                                               { new: true })
        if (!updatedMatcher) {
            return ({
                status: "error",
                message: "No se encontró el matcher al guardar los cambios"
            })
        }

        return ({
            status: "success",
            message: "La partida está lista y ha sido eliminada de la lista de espera. Ahora elimine los usuarios de la lista de usuarios buscando partida",
        })
    } catch (e) {
        return ({
            status: "error",
            message: "Error al verificar si la mesa pública está lista"
        })
    }
}

////////////////////////////////////////////////////////////////////////////////
// Mesas Privadas
////////////////////////////////////////////////////////////////////////////////
async function createPrivate(req) {
    const userId = req.body.userId

    const name = req.body.name
    const password = req.body.password
    const bankLevel = req.body.bankLevel
    const numPlayers = req.body.numPlayers
    const bet = req.body.bet

    try {
        // Se recupera el emparejador
        const matcher = await Matcher.findById(matcherId)
        if (!matcher) {
            return ({
                status: "error",
                message: "Error al encontrar el emparejador"
            })
        }

        var res = isAlreadyWaiting(matcher, userId)
        if (res.status === "error") return res

        // Se añade el jugador a la lista de jugadores esperando partida
        matcher.players_waiting.push({ player: userId })

        // Se crea la mesa privada
        const reqBoard = { body: { name: name, 
                                   password: password, 
                                   bankLevel: bankLevel,
                                   numPlayers: numPlayers,
                                   bet: bet }}
        var res = await PrivateBoardController.add(reqBoard)
        if (res.status === "error") return res

        // Se añade el usuario a la partida
        const reqAddPlayer = { body: { userId: userId, name: name, password: password }}
        res = await PrivateBoardController.addPlayer(reqAddPlayer)
        if (res.status === "error") return res

        // Se añade la mesa a la lista de mesas de torneos esperando a jugadores
        matcher.waiting_private_boards.push({ board: res.board._id, name: name })

        const updatedMatcher = await Matcher.findByIdAndUpdate(matcherId, 
                                                               matcher,
                                                               { new: true });
        if (!updatedMatcher) {
            return ({
                status: "error",
                message: "Error al añadir la mesa pública a la lista de mesas esperando jugadores"
            })    
        }
        
        return ({
            status: "success",
            message: "Mesa privada creada y añadida a la lista de espera correctamente",
            matcher: updatedMatcher,
            board: res.board
        })

    } catch (e) {
        return ({
            status: "error",
            message: "Error al crear la mesa privada. " + e.message
        })
    }
}

async function playPrivate(req) {
    const name = req.body.name
    const password = req.body.password
    const userId = req.body.userId

    try {
        // Se recupera el emparejador
        const matcher = await Matcher.findById(matcherId)
        if (!matcher) {
            return ({
                status: "error",
                message: "Error al encontrar el emparejador"
            })
        }

        var res = isAlreadyWaiting(matcher, userId)
        if (res.status === "error") return res

        // Se añade el jugador a la lista de jugadores esperando partida
        matcher.players_waiting.push({ player: userId })

        // Se busca una partida ya empezada
        var board = matcher.waiting_private_boards.find(board => 
            board.name === name)
        
        // Si no existe una partida en la que pueda jugar el usuario, se
        // crea una nueva con las características dadas
        if (!board) {
            return ({
                status: "error",
                message: "No hay ninguna partida empezada con el nombre proporcionado"
            })
        } else {
            board = board.board
        }

        // Se añade el usuario a la partida
        const reqAddPlayer = { body: { userId: userId, name: name, password: password }}
        res = await PrivateBoardController.addPlayer(reqAddPlayer)
        if (res.status === "error") return res
        
        return ({
            status: "success",
            message: "El jugador ha sido añadido a una mesa privada",
            board: res.board
        })
    } catch (e) {
        return ({
            status: "error",
            message: "No se pudo asignar una partida al jugador"
        })
    }
}

async function isPrivateBoardReady(req) {
    const boardId = req.body.boardId

    try {
        // Se recupera el matcher
        var matcher = await Matcher.findById(matcherId)
        if (!matcher) {
            return console.error("No se encontró el emparejador")
        }

        // Se verifica si la mesa está llena
        const req = { body: { boardId: boardId } }
        var res = await PrivateBoardController.isFull(req)
        if (res.status === "error") return res

        // Se elimina el board de la lista de mesas de torneo pendientes de jugadores        
        const boardIndex = matcher.waiting_private_boards.findIndex(board => 
            board.board.equals(boardId))
        if (boardIndex === -1) {
            return ({
                status: "error",
                message: "Error al encontrar la mesa para eliminarla de la lista de espera"
            })
        }
        matcher.waiting_private_boards = matcher.waiting_private_boards.filter((_, index) => index !== boardIndex);
        const updatedMatcher = await Matcher.findByIdAndUpdate(matcherId, 
                                                               matcher, 
                                                               { new: true })
        if (!updatedMatcher) {
            return ({
                status: "error",
                message: "No se encontró el matcher al guardar los cambios"
            })
        }

        return ({
            status: "success",
            message: "La partida está lista y ha sido eliminada de la lista de espera. Ahora elimine los usuarios de la lista de usuarios buscando partida",
        })
    } catch (e) {
        return ({
            status: "error",
            message: "Error al verificar si la mesa privada está lista"
        })
    }
}

module.exports = {
    matcherId,
    init,
    eliminateWaitingUsers,
    eliminateWaitingUser,
    playTournament,
    isTournamentBoardReady,
    playPublic,
    isPublicBoardReady,
    createPrivate,
    playPrivate,
    isPrivateBoardReady
}
const Matcher = require("../models/matcherSchema")
const Tournament = require("../models/tournamentSchema")
const TournamentBoard = require("../models/boards/tournamentBoardSchema")
const PublicBoard = require("../models/boards/publicBoardSchema")
const PrivateBoard = require("../models/boards/privateBoardSchema")
const TournamentController = require("./tournamentController")
const PublicBoardType = require("../models/publicBoardTypeSchema")
const BankController = require("./bankController")
const User = require("../models/userSchema")
const bcrypt = require('bcrypt')
const { default: mongoose } = require("mongoose")

// El id del matcher
var matcherId = new mongoose.Types.ObjectId()

async function boardByIdFunction(req) {
    // Parámetros en typeBoardName
    const boardId = req.body.boardId
    const typeBoardName = req.body.typeBoardName

    try {
        var board
        if (typeBoardName === "tournament") {
            board = await TournamentBoard.findById(boardId)
        } else if (typeBoardName === "public") {
            board = await PublicBoard.findById(boardId)
        } else if (typeBoardName === "private") {
            board = await PrivateBoard.findById(boardId)
        } else {
            return ({
                status: "error",
                message: "typeBoardName tiene que valer tournament, public o private"
            })
        }

        if (!board) {
            return ({
                status: "error",
                message: "No existe una mesa con el ID proporcionado"
            })
        }

        return ({
            status: "success",
            message: "Se ha obtenido la mesa correctamente. Se encuentra en el campo board de esta respuesta",
            board: board
        })
    } catch (e) {
        return ({
            status: "error",
            message: "Error al recuperar la mesa dado su ID"
        })
    }

}

// Añade un jugador a la mesa si esta se encuentra esperando jugadores
async function addPlayerTournamentBoard(req) {
    const userId = req.body.userId
    const boardId = req.body.boardId

    try {
        // Se verifica que el usuario exista
        const user = await User.findById(userId)
        if (!user) {
            return ({
                status: "error",
                message: "Usuario no encontrado"
            })
        }

        // Se verifica que la mesa exista
        const board = await TournamentBoard.findById(boardId)
        if (!board) {
            return ({
                status: "error",
                message: "Mesa de torneo no encontrada"
            })
        } else if (board.status !== 'waiting') {
            return ({
                status: "error",
                message: "La mesa no está esperando jugadores"
            })
        }

        // Se añade el jugador a la mesa de torneo y se cierra la mesa a nuevos 
        // usuarios si ya está completa. Si el jugador es el primero, se establece
        // este como guest
        const isGuest = board.players.length === 0
        board.players.push({ player: userId, guest: isGuest })
        if (board.players.length === 2) {
            board.status = 'playing'
        }
        const updatedBoard = await TournamentBoard.findByIdAndUpdate(boardId,
                                                                     board,
                                                                     { new: true })
        if (!updatedBoard) {
            return ({
                status: "error",
                message: "No se pudo añadir el jugador a la mesa de torneo"
            })
        }

        return ({
            status: "success",
            message: "El jugador ha sido añadido a la mesa",
            board: board
        })

    } catch (e) {
        return ({
            status: "error",
            message: "No se pudo añadir el jugador a la mesa de torneo"
        })
    }
}

// Añade un jugador a la mesa si esta se encuentra esperando jugadores
async function addPlayerPublicBoard(req) {
    const userId = req.body.userId
    const boardId = req.body.boardId

    try {
        // Se verifica que el usuario exista
        const user = await User.findById(userId)
        if (!user) {
            return ({
                status: "error",
                message: "Usuario no encontrado"
            })
        }

        // Se verifica que la mesa exista
        const board = await PublicBoard.findById(boardId)
        if (!board) {
            return ({
                status: "error",
                message: "Mesa pública no encontrada"
            })
        } else if (board.status !== 'waiting') {
            return ({
                status: "error",
                message: "La mesa no está esperando jugadores"
            })
        }

        // Se añade el jugador a la mesa pública y se cierra la mesa a nuevos 
        // usuarios si ya está completa. Si el jugador es el primero, se establece
        // este como guest
        const isGuest = board.players.length === 0
        board.players.push({ player: userId, guest: isGuest, 
            initialCoins: user.coins, currentCoins: user.coins })
        
        if (board.players.length === board.numPlayers) {
            board.status = 'playing'
        }
        const updatedBoard = await PublicBoard.findByIdAndUpdate(boardId,
                                                                 board,
                                                                 { new: true })
        if (!updatedBoard) {
            return ({
                status: "error",
                message: "No se pudo añadir el jugador a la mesa pública"
            })
        }

        return ({
            status: "success",
            message: "El jugador ha sido añadido a la mesa",
            board: board
        })

    } catch (e) {
        return ({
            status: "error",
            message: "No se pudo añadir el jugador a la mesa pública. " + e.message
        })
    }
}

// Añade un jugador a la mesa si esta se encuentra esperando jugadores
async function addPlayerPrivateBoard (req) {
    const userId = req.body.userId
    const name = req.body.name
    const password = req.body.password

    try {
        // Se verifica que el usuario exista
        const user = await User.findById(userId)
        if (!user) {
            return ({
                status: "error",
                message: "Usuario no encontrado"
            })
        }

        // Se verifica que la mesa exista
        const board = await PrivateBoard.findOne({name: name})
        if (!board) {
            return ({
                status: "error",
                message: "Mesa privada no encontrada"
            })
        } else if (board.status !== 'waiting') {
            return ({
                status: "error",
                message: "La mesa no está esperando jugadores"
            })
        }

        // Se verifica que la contraseña de la partida sea igual
        const equal = await bcrypt.compare(password, board.password)
        if (!equal) {
            return ({
                status: "error",
                message: "Contraseña no válida"
            })
        }

        // Se añade el jugador a la mesa privada y se cierra la mesa a nuevos 
        // usuarios si ya está completa. Si el jugador es el primero, se establece
        // este como guest
        const isGuest = board.players.length === 0
        board.players.push({ player: userId, guest: isGuest, 
            initialCoins: user.coins, currentCoins: user.coins })
        
        if (board.players.length === board.numPlayers) {
            board.status = 'playing'
        }
        const updatedBoard = await PrivateBoard.findByIdAndUpdate(board._id,
                                                                  board,
                                                                  { new: true })
        if (!updatedBoard) {
            return ({
                status: "error",
                message: "No se pudo añadir el jugador a la mesa privada"
            })
        }

        return ({
            status: "success",
            message: "El jugador ha sido añadido a la mesa",
            board: board
        })

    } catch (e) {
        return ({
            status: "error",
            message: "No se pudo añadir el jugador a la mesa privada"
        })
    }
}


// Devuelve error si la mesa aún no está llena y success si ya lo está
async function isFull(req) {
    const boardId = req.body.boardId
    const typeBoardName = req.body.typeBoardName

    try {
        var board
        if (typeBoardName === "public") {
            board = await PublicBoard.findById(boardId)
        } else if (typeBoardName === "private") {
            board = await PrivateBoard.findById(boardId)
        } else if (typeBoardName === "tournament") {
            board = await TournamentBoard.findById(boardId)
        } else {
            return ({
                status: "error",
                message: "typeBoardName tiene que valer tournament, public o private"
            })
        }

        if (!board) {
            return ({
                status: "error",
                message: "Mesa no encontrada"
            })
        }

        if (board.status === "playing") {
            return ({
                status: "success",
                message: "La partida ya no acepta más jugadores",
                board: board
            })
        } else {
            return ({
                status: "error",
                message: "La mesa aún acepta jugadores"
            })
        }
    } catch (e) {
        return ({
            status: "error",
            message: "No se pudo acceder a la información de la mesa"
        })
    }

}

// Crea una mesa de torneo dado un torneo ya existente y la ronda en la que se
// disputa el enfrentamiento
async function addTournamentBoardFunction(req) {
    const tId = req.body.tournamentId
    const round = req.body.round

    try {
        // Se verifica que la ronda sea válida
        if (round !== 8 && round !== 4 && round !== 2 && round !== 1) {
            return ({
                status: "error",
                message: "Ronda no válida"
            })
        }
    
        // Se verifica que el torneo exista
        const tournament = await Tournament.findById(tId)
        if (!tournament) {
            return ({
                status: "error",
                message: "Torneo no encontrado"
            })
        }

        // Se crea la banca
        const req = { body: { level: tournament.bankLevel } }
        var resAddBank = await BankController.add(req)

        if (resAddBank.status === "error") return resAddBank

        // Se crea la partida de torneo
        const newBoard = await TournamentBoard.create({ tournament: tId,
                                                        bank: resAddBank.bank._id,
                                                        round: round,
                                                        hand: { numHand: 1, players: []} })
        if (!newBoard) {
            return ({
                status: "error",
                message: "Error al crear la mesa de torneo"
            })
        }

        return ({
            status: "success",
            message: "Mesa de torneo creada correctamente",
            board: newBoard
        })

    } catch (e) {
        return ({
            status: "error",
            message: "Error al crear la mesa de torneo. " + e.message
        })
    }
}

// Crea una mesa pública dada un tipo de mesa pública
async function addPublicBoardFunction(req) {
    const typeId = req.body.typeId

    try {
        // Se verifica que el tipo de mesa pública existe
        const publicBoardType = await PublicBoardType.findById(typeId)
        if (!publicBoardType) {
            return ({
                status: "error",
                message: "Tipo de mesa pública no encontrado"
            })
        }

        // Se crea la banca
        let resAddBank
        const req = { body: { level: publicBoardType.bankLevel } }
        resAddBank = await BankController.add(req)

        if (resAddBank.status !== "success") {
            return ({
                status: "error",
                message: "Error al crear la banca. " + resAddBank.message
            })
        }

        // Se crea la partida de torneo
        const newBoard = await PublicBoard.create({ publicBoardType: typeId,
                                                    bank: resAddBank.bank._id,
                                                    numPlayers: publicBoardType.numPlayers,
                                                    hand: { numHand: 1, players: []},
                                                    bet: publicBoardType.bet })
        if (!newBoard) {
            return ({
                status: "error",
                message: "Error al crear la mesa pública"
            })
        }

        return ({
            status: "success",
            message: "Mesa pública creada correctamente",
            board: newBoard
        })

    } catch (e) {
        return ({
            status: "error",
            message: "Error al crear la mesa pública. " + e.message 
        })
    }
}

// Crea una mesa privada
async function addPrivateBoardFunction(req) {
    // Parámetros en req.body: name, password, bankLevel, numPlayers, bet

    const b = req.body

    // Nos aseguramos de que se hayan enviado todos los parámetros
    if (!b.name || !b.password || !b.bankLevel || !b.bet || !b.numPlayers ||
        b.name.trim() === '' || b.password.trim() === '' || 
        b.bankLevel.trim() === '') {
        return ({
            status: "error",
            message: "Parámetros incorrectos. Los parámetros a enviar son: name, password, bankLevel, numPlayers, bet"
        })    
    }

    const name = b.name
    const password = b.password
    const bankLevel = b.bankLevel
    const numPlayers = parseInt(b.numPlayers)
    const bet = parseInt(b.bet)

    // Nos aseguramos de que bet sea un entero >= 0
    if (typeof bet !== 'number' || bet < 0 || !Number.isInteger(bet)) {
        return ({
            status: "error",
            message: "El campo bet debe ser una cadena que represente un entero mayor o igual de 0"
        })
    }

    // Nos aseguramos de que numPlayers sea un entero > 1
    if (typeof numPlayers !== 'number' || numPlayers <= 1 || numPlayers > 4 || !Number.isInteger(numPlayers)) {
        return ({
            status: "error",
            message: "El campo numPlayers debe ser una cadena que represente un entero mayor de 1 y menor de 5"
        })
    }   

    try {
        // Se verifica que no exista un private board con el mismo nombre
        const board = await PrivateBoard.findOne({ name: name })
        if (board) {
            return ({
                status: "error",
                message: "Encontrado otra mesa privada con el mismo nombre"
            })
        }

        // Se crea la banca
        var resAddBank
        const reqAddBank = { body: { level: bankLevel } }
        resAddBank = await BankController.add(reqAddBank)
        if (resAddBank.status !== "success") {
            return ({
                status: "error",
                message: "Error al crear la banca de la partida. " + reqAddBank.message
            })
        }

        // Se crea la partida privada
        const hPasswd = await bcrypt.hash(password, 10)
        const privBoard = await PrivateBoard.create({ name: name,
                                                      password: hPasswd,
                                                      numPlayers: numPlayers,
                                                      bank: resAddBank.bank._id,
                                                      bet: bet,
                                                      hand: { numHand: 1, players: []} })
        if (!privBoard) {
            return ({
                status: "error",
                message: "Error al añadir la mesa privada"
            })
        }

        return ({
            status: "success",
            message: "Mesa privada creada correctamente",
            board: privBoard
        })

    } catch (e) {
        return ({
            status: "error",
            message: "Error al crear la mesa privada. " + e.message
        })

    }
}


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
            // Se recupera la partida para saber todos los jugadores
            var res = await boardByIdFunction(req)

            // Se cogen todos aquellos que no esten en la partida pasada
            matcher.players_waiting = matcher.players_waiting.filter(playerWaiting => 
                !res.board.players.some(player => player.player.equals(playerWaiting.player)))
            
            // Guardar los cambios en el emparejador
            await matcher.save()

        } else if (req.body.playersToDelete) {
            const playersToDelete = req.body.playersToDelete

            const result = await Matcher.updateOne(
                { _id: matcherId }, // Filtro para encontrar el matcher por su ID
                { $pull: { players_waiting: { player: { $in: playersToDelete } } } } // Operador $pull para eliminar los jugadores
            );
          
        } else {
            return ({
                status: "error",
                message: "Parámetros incorrectos. Los parámetros deben ser boardId y typeBoardName ó playersToDelete"
            })
        }

        return ({
            status: "success",
            message: "Usuarios eliminados de la lista de espera correctamente"
        })
        
    } catch (e) {
        console.error("Error al eliminar los usuarios de la lista de espera. " + e.message)
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
        var res = await addTournamentBoardFunction(reqBoard)
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
        await Matcher.findByIdAndUpdate(matcherId, matcher, { new: true })

        // Se busca una partida ya empezada
        var board = matcher.waiting_tournament_boards.find(board => 
            board.tournament == tId && board.round === round)
        
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
        res = await addPlayerTournamentBoard(reqAddPlayer)
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
        const req = { body: { boardId: boardId, typeBoardName: "tournament" } }
        var res = await isFull(req)
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
        var res = await addPublicBoardFunction(reqBoard)
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
        await Matcher.findByIdAndUpdate(matcherId, matcher, { new: true })

        // Se busca una partida ya empezada
        var board = matcher.waiting_public_boards.find(board => 
            board.typePublicBoard.equals(typeId))

        // Si no existe una partida en la que pueda jugar el usuario, se
        // crea una nueva con las características dadas
        if (!board) {
            const reqAdd = { body: {matcher: matcher, typeId: typeId } }
            res = await addPublicBoard(reqAdd)
            if (res.status === "error") return res
            board = res.board
        } else {
            board = board.board
        }

        // Se añade el usuario a la partida
        const reqAddPlayer = { body: { userId: userId, boardId: board._id }}
        res = await addPlayerPublicBoard(reqAddPlayer)
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
        const req = { body: { boardId: boardId, typeBoardName: "public" } }
        var res = await isFull(req)
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
    // Parámetros en req.body: userId, name, password, bankLevel, numPlayers, bet
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
        var res = await addPrivateBoardFunction(reqBoard)
        if (res.status === "error") return res

        // Se añade el usuario a la partida
        const reqAddPlayer = { body: { userId: userId, name: name, password: password }}
        res = await addPlayerPrivateBoard(reqAddPlayer)
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
        await Matcher.findByIdAndUpdate(matcherId, matcher, { new: true })

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
        res = await addPlayerPrivateBoard(reqAddPlayer)
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
        const req = { body: { boardId: boardId, typeBoardName: "private" } }
        var res = await isFull(req)
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
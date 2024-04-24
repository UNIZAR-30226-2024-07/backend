const User = require("../../models/userSchema")
const Tournament = require("../../models/tournamentSchema")
const TournamentBoard = require("../../models/boards/tournamentBoardSchema")
const TournamentController = require("../tournamentController")
const BankController = require("../bankController")
const UserController = require("../userController")
const MatcherController = require("../matcherContoller")

////////////////////////////////////////////////////////////////////////////////
// Funciones internas
////////////////////////////////////////////////////////////////////////////////

// En una partida de torneo siempre es 1 vs 1
const numPlayers = 2

// Devuelve true si y solo si el número de jugadas en esta ronda es igual al
// número de jugadores que hay en la partida
async function allPlayersPlayed(req) {
    // Parámetros en req.body: req.body.boardId
    const boardId = req.body.boardId
    
    try {
        // Se recupera la mesa
        const board = await TournamentBoard.findById(boardId)
        if (!board) {
            return ({
                status: "error",
                message: "No se encontró la mesa de torneo"
            })
        }
        
        if (board.hand.players.length !== board.players.length) {
            return ({
                status: "error",
                message: "El número de jugadores que han realizado una jugada es menor al de jugadores en la partida"
            })
        } else {
            return ({
                status: "success",
                message: "El número de jugadores que han realizado una jugada es igual al de jugadores en la partida",
                board: board
            })
        }
    } catch (e) {
        return ({
            status: "error",
            message: "Error al encontrar el número de manos jugadas. " + e.message
        })
    }
}

// Elimina los jugadores que se pasan por un array de la mesa con el id especificado
async function eliminatePlayers(req) {
    // Parámetros en req.body: boardId, playersToDelete
    const boardId = req.body.boardId
    const playersToDelete = req.body.playersToDelete

    try {
        // Se recupera la mesa
        const board = await TournamentBoard.findById(boardId)
        if (!board) {
            return ({
                status: "error",
                message: "Mesa no encontrada"
            })
        }

        // Se cogen los índices de los jugadores a eliminar
        const playerIndicesToDelete = [];
        playersToDelete.forEach(playerId => {
            const index = board.players.findIndex(player => player.player.equals(playerId));
            if (index !== -1) {
                playerIndicesToDelete.push(index);
            }
        })

        // Eliminar a los jugadores marcados para ser eliminados
        await TournamentBoard.updateOne(
            { _id: boardId },
            { $pull: { 'players': { 'player': { $in: playersToDelete } } } }
        )

        // Eliminamos los jugadores de la banca de la partida
        var res = await BankController.eliminatePlayersHands({ body: 
            { bankId: board.bank, usersIndex: playerIndicesToDelete }})
        if (res.status === "error") return res
        
        // Se eliminan los usuarios de la lista de jugadores en espera para que
        // pueda solicitar jugar otra partida
        res = await MatcherController.eliminateWaitingUsers({ body: {playersToDelete: playersToDelete}})
        if (res.status === "error") return res

        return ({
            status: "success",
            message: "Usuarios eliminados correctamente"
        })
        
    } catch (e) {
        return ({
            status: "error",
            message: "Error al eliminar jugadores. " + e.message
        })
    }
}

// Dado un board, apunta todos aquellos jugadores que no han enviado su jugada
// y elimina a todo aquel que ha dejado de jugar 2 manos
// TODO: se puede poner aquí la lógica de después de cada jugada
async function seeAbsents(req) {
    // Parámetros en req.body: board (un board completo)
    const board = req.body.board

    try {
        // Array para almacenar los IDs de los jugadores que serán eliminados
        const playersToDelete = []

        // Iterar sobre los jugadores en la mesa del torneo
        for (const playerObj of board.players) {
            // Incrementar el contador de manos ausentes si el jugador no ha jugado
            if (!board.hand.players.includes(playerObj.player)) {
                playerObj.handsAbsent++
            }

            // Eliminar al jugador si ha dejado de jugar dos manos consecutivas
            if (playerObj.handsAbsent >= 2) {
                playersToDelete.push(playerObj.player)
            }
        }

        await board.save()

        // Eliminar a los jugadores marcados para ser eliminados
        var resEliminate = await eliminatePlayers({ body: { boardId: board._id,
                                                            playersToDelete: playersToDelete }})
        if (resEliminate.status === "error") return resEliminate
        
        return ({
            status: "success",
            message: "Gestión de manos completada",
            playersToDelete: playersToDelete
        })

    } catch (e) {
        return ({
            status: "error",
            message: "Error al ver los jugadores que no han enviado jugada. " + e.message
        })
    }
}

// Crea una mesa de torneo dado un torneo ya existente y la ronda en la que se
// disputa el enfrentamiento
async function add (req) {
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
        const req = { body: { level: tournament.bankLevel,
                              numPlayers: numPlayers } }
        var res = await BankController.add(req)

        if (res.status === "error") return res

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
            message: "Error al crear la mesa de torneo"
        })
    }
}

// Función para eliminar una mesa de torneo por su ID
async function eliminate(req) {
    // Parámetros en body: id
    try {
        const id = req.body.id
        
        // Encontrar y eliminar mesa por id
        const board = await TournamentBoard.findByIdAndDelete(id)
        
        // Mesa no encontrada, error
        if (!board) {
            return ({
                status: "error",
                message: "Mesa de torneo no encontrada"
            })
        } else {  // Mesa encontrada, exito
            return ({
                status: "success",
                message: "Mesa de torneo eliminada correctamente"
            })
        }

    } catch (error) {
        return ({
            status: "error",
            message: error.message
        })
    }
}

// Añade un jugador a la mesa si esta se encuentra esperando jugadores
async function addPlayer (req) {
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

// Devuelve error si la mesa aún no está llena y success si ya lo está
async function isFull(req) {
    const boardId = req.body.boardId

    try {
        // 
        const board = await TournamentBoard.findById(boardId)
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

// Devuelve 'success' si y solo si se ha alcanzado el final de la partida
async function isEndOfGame(req) {
    // Parámetros en req.body: boardId
    const boardId = req.body.boardId

    try {
        // Se recupera la mesa
        const board = await TournamentBoard.findById(boardId)
        if (!board) {
            return ({
                status: "error",
                message: "No se encontró la mesa"
            })
        }

        // Se verifica si la partida ha terminado. La partida habrá terminado si
        // algún jugador posee 0 vidas o si solo hay un jugador en la partida

        // Verificar si algún jugador tiene 0 vidas
        for (const playerObj of board.players) {
            if (playerObj.lifes === 0) {
                return ({
                    status: "success",
                    message: "La partida ha terminado porque un jugador se quedó sin vidas"
                })
            }
        }

        // Verificar si solo queda un jugador en la partida
        if (board.players.length === 1) {
            return ({
                status: "success",
                message: "La partida ha terminado porque solo queda un jugador en la partida"
            })
        }

        // Si ningún jugador tiene 0 vidas y aún quedan más de un jugador en la
        // partida, la partida no ha terminado
        return ({
            status: "error",
            message: "La partida aún no ha terminado"
        })

    } catch (e) {
        return ({
            status: "error",
            message: "Error al determinar si la partida ha acabado. " + e.message
        })
    }
}

// Realiza las acciones correspondientes a la finzalización de la partida. Si la
// partida no era una final, se avanza al jugador de ronda en el torneo. Si la 
// partida era una final, se da el correspondiente premio a cada uno de los dos
// jugadores. Además se encarga de eliminar la mesa junto con su banca
async function finishBoard(req) {
    // Parámetros necesarios en req.body: boardId
    const boardId = req.body.boardId

    try {
        var res = await boardByIdFunction({ body: { boardId: boardId }})
        if (res.status === "error") return res
        const board = res.board

        var resTournament = await TournamentController.tournamentByIdFunction({ body: { tournamentId: board.tournament }})
        if (resTournament.status === "error") return resTournament
        const tournament = resTournament.tournament

        const winner = board.players.find(playerObj => playerObj.lifes > 0)
        const loser = board.players.find(playerObj => playerObj.lifes <= 0)

        if (!winner || !loser) {
            return ({
                status: "error",
                message: "Error al establecer el ganador y perdedor de la partida"
            })
        }

        if (board.round === 1) {
            // La partida era una final y por tanto se dan las recompensas al
            // ganador
            res = await UserController.insertCoinsFunction({ body: { userId: winner.player, coins: tournament.coins_winner } })
            if (res.status === "error") return res

            res = await UserController.insertCoinsFunction({ body: { userId: loser.player, coins: tournament.coins_subwinner } })
            if (res.status === "error") return res

            // También finaliza el torneo, luego se elimina a los dos del mismo
            res = await TournamentController.tournamentLost({ body: { userId: winner.player, tournamentId: tournament._id }})
            if (res.status === "error") return res

            res = await TournamentController.tournamentLost({ body: { userId: loser.player, tournamentId: tournament._id }})
            if (res.status === "error") return res

        } else {
            // La partida no era una final, luego se avanza de ronda al ganador
            // y se elimina el torneo de la lista de torneos al perdedor
            res = await TournamentController.advanceRound({ body: { userId: winner.player, tournamentId: tournament._id }})
            if (res.status === "error") return res

            res = await TournamentController.tournamentLost({ body: { userId: loser.player, tournamentId: tournament._id }})
            if (res.status === "error") return res
        }

        // Se elimina la banca del sistema
        await BankController.eliminate({ body: { bankId: board.bank }})

        // Se elimina ahora la partida
        await board.remove()

        return ({
            status: "success",
            message: "Mesa finalizada y eliminada correctamente"
        })

    } catch (e) {
        return ({
            status: "error",
            message: "Error al finalizar la partida. " + e.message
        })
    }
}

// Devuelve el 'board' completo dado su ID
async function boardByIdFunction(req) {
    const boardId = req.body.boardId

    try {
        const board = await TournamentBoard.findById(boardId)
        if (!board) {
            return ({
                status: "error",
                message: "No existe una mesa de torneo con el ID proporcionado"
            })
        }

        return ({
            status: "success",
            message: "Se ha obtenido la mesa de torneo correctamente. Se encuentra en el campo board de esta respuesta",
            board: board
        })
    } catch (e) {
        return ({
            status: "error",
            message: "Error al recuperar la mesa dado su ID"
        })
    }
}

// Añade al chat de la partida el mensaje 'message' del usuario con el ID
// proporcionado si este se encontraba jugando la partida
async function newMessage(req) {
    // Parámetros en req.body: boardId, message, userId
    const boardId = req.body.boardId
    const message = req.body.message
    const userId = req.body.userId

    try {
        // Se busca y verifica que la mesa exista
        const board = await TournamentBoard.findById(boardId)
        if (!board) {
            return ({
                status: "error",
                message: "Mesa no encontrada"
            })
        }

        // Verificar si el usuario está jugando en la mesa
        const playerIndex = board.players.findIndex(player => player.player.equals(userId))
        if (playerIndex === -1) {
            return ({
                status: "error",
                message: "El usuario no está jugando en esta partida"
            })
        }

        // Se verifica que el mensaje no sea una cadena vacía
        if (message.trim() === '') {
            return ({
                status: "error",
                message: "El mensaje no puede ser una cadena vacía"
            })
        }

        // Agregar el mensaje al chat de la partida
        board.chat.push({
            msg: message,
            emitter: userId
        })

        // Guardar los cambios en la base de datos
        await board.save()

        return ({
            status: "success",
            message: "Mensaje agregado al chat de la partida correctamente"
        })

    } catch (e) {
        return ({
            status: "error",
            message: "Error al agregar el mensaje al chat. " + e.message
        })
    }
}

// Realiza las acciones necesarias para finalizar el turno y devuelve los
// resultados del mismo
async function manageHand(req) {
    // Parámetros en req.body: boardId
    const boardId = req.body.boardId 

    try {
        // Se recupera la mesa
        const board = await TournamentBoard.findById(boardId)
        if (!board) {
            return ({
                status: "error",
                message: "Mesa de torneo no encontrada"
            })
        }

        // Se piden los resultados de la mano actual a la banca
        var res = await BankController.results({ body: {bankId: board.bank, 
                                                 players: board.players,
                                                 typeBoardName: 'tournament', 
                                                 bet: 0}})
        if (res.status === "error") return res
        const results = res.results

        // Se apuntan en el board las monedas ganadas por cada jugador
        for (const result of results) {
            const userId = result.userId
            const lifes = result.loseLife

            // Se busca al jugadore en la lista de jugadores de la mesa
            const playerIndex = board.players.findIndex(player => 
                player.player.equals(userId))

            // Si el jugador no se encuentra en la lista, se emite un mensaje de
            // error
            if (playerIndex === -1) {
                return ({
                    status: "error",
                    message: "El jugador con ID " + playerId + " no está en la mesa"
                })
            }
        
            // Se actualizan las vidas actuales del jugador en la mesa
            board.players[playerIndex].lifes -= lifes
        }

        // La mano ha terminado, luego se eliminan los jugadores que mandaron la
        // jugada y se incrementa el número de la mano
        board.hand.players = []
        board.numHand += 1

        // Se guarda la mesa con las monedas ganadas de cada jugador
        await board.save()

        // Se devuelven los resultados de la banca en el campo results
        return ({
            status: "success",
            message: "Resultados del turno recuperados y acciones realizadas correctamente",
            results: results
        })

    } catch (e) {
        return ({
            status: "error",
            message: "Error al manejar los datos de la jugada. " + e.message
        })
    }
}


////////////////////////////////////////////////////////////////////////////////
// Funciones públicas
////////////////////////////////////////////////////////////////////////////////

// Devuelve el 'board' completo dado su ID
const boardById = async (req, res) => {
    const boardId = req.params.id

    try {
        const board = await TournamentBoard.findById(boardId)
        if (!board) {
            return res.status(404).json({
                status: "error",
                message: "No existe una mesa de torneo con el ID proporcionado"
            })
        }

        return res.status(200).json({
            status: "success",
            message: "Se ha obtenido la mesa de torneo correctamente. Se encuentra en el campo board de esta respuesta",
            board: board
        })
    } catch (e) {
        return res.status(500).json({
            status: "error",
            message: "Error al recuperar la mesa dado su ID"
        })
    }
}

// Abandona la partida si el usuario estaba dentro de ella
const leaveBoard = async (req, res) => {
    // Parámetros necesarios en req.body: boardId
    const boardId = req.params.id
    const userId = req.user.id

    try {
        // Se verifica que la mesa exista
        const board = await TournamentBoard.findById(boardId)
        if (!board) {
            return res.status(404).json({
                status: "error",
                message: "Mesa no encontrada"
            })
        }

        // Se verifica que el usuario esté en la partida
        const playerIndex = board.players.findIndex(player => player.player.equals(userId))
        if (playerIndex === -1) {
            return res.status(404).json({
                status: "error",
                message: "El usuario no está en la partida"
            })
        }

        // Eliminamos los jugadores de la banca de la partida
        var resAux = await BankController.eliminatePlayersHands({ body: 
            { bankId: board.bank, usersIndex: [playerIndex] }})
        if (resAux.status === "error") return res.status(400).json(resAux)

        // Se elimina el usuario de la lista de jugadores en espera para que
        // pueda solicitar jugar otra partida
        resAux = await MatcherController.eliminateWaitingUser({ body: {userId: userId}})
        if (resAux.status === "error") return res.status(400).json(resAux)

        // Eliminar al usuario de la lista de jugadores en la partida
        board.players.splice(playerIndex, 1);

        // Guardar los cambios en la base de datos
        await board.save();

        return res.status(200).json({
            status: "success",
            message: "El usuario abandonó la partida correctamente"
        })

    } catch (e) {
        return res.status(500).json({
            status: "error",
            message: "Error al abandonar la partida. " + e.message
        })
    }
}

async function plays(req) {
    // Parámetos en req.body: userId, boardId, cardsOnTable, playName
    const userId = req.body.userId
    const boardId = req.body.boardId
    const cardsOnTable = req.body.cardsOnTable
    const playName = req.body.playName

    var resAux

    try {
        // Se verifica que exista la mesa
        const board = await TournamentBoard.findById(boardId)
        if (!board) {
            return ({
                status: "error",
                message: "Mesa no encontrada"
            })
        }

        // Se llama a la función del bank
        if (playName === "drawCard") {
            resAux = await BankController.drawCard({body: {userId: userId, boardId: boardId,
                                                    players: board.players, typeBoardName: 'tournament', 
                                                    bankId: board.bank, cardsOnTable: cardsOnTable}})
        } else if (playName === "stick") {
            resAux = await BankController.stick({body: {userId: userId, boardId: boardId,
                                                players: board.players, typeBoardName: 'tournament', 
                                                bankId: board.bank, cardsOnTable: cardsOnTable}})
        } else {
            return {
                status: "error",
                message: "Nombre de jugada no válido"
            }
        } 
        return (resAux)

    } catch (e) {
        return ({
            status: "error",
            message: "Error al hacer la jugada " + playName + ". " + e.message
        })
    }
}

// Función para pedir una carta
const drawCard = async (req, res) => {
    // Parámetros en req.body: userId, boardId, cardsOnTable
    const userId = req.user.id   // Id del usuario peticion
    const boardId = req.body.boardId
    const cardsOnTable = req.body.cardsOnTable
    var resAux

    try {
        // Se llama a la función del bank
        resAux = await plays({body: {userId: userId, boardId: boardId, cardsOnTable: cardsOnTable, playName: "drawCard"}})
        
        if (resAux.status === "error") return res.status(400).json(resAux)
        else return res.status(200).json(resAux)

    } catch (e) {
        return res.status(404).json({
            status: "error",
            message: "Error al pedir carta. " + e.message
        })
    }
}

// Función para plantarse
const stick = async(req, res) => {
    // Parámetros en req.body: userId, boardId, cardsOnTable
    const userId = req.user.id   // Id del usuario peticion
    const boardId = req.body.boardId
    const cardsOnTable = req.body.cardsOnTable
    var resAux

    try {
        // Se llama a la función del bank
        resAux = await plays({body: {userId: userId, boardId: boardId, cardsOnTable: cardsOnTable, playName: "stick"}})
        
        if (resAux.status === "error") return res.status(400).json(resAux)
        else return res.status(200).json(resAux)

    } catch (e) {
        return res.status(404).json({
            status: "error",
            message: "Error al pedir carta. " + e.message
        })
    }
}


module.exports = {
    allPlayersPlayed,
    seeAbsents,
    isFull,
    isEndOfGame,
    finishBoard,
    add,
    eliminate,
    addPlayer,
    boardByIdFunction,
    boardById,
    manageHand,
    newMessage,
    leaveBoard,
    drawCard,
    stick
}

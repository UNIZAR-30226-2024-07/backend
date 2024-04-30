const User = require("../../models/userSchema")
const SingleBoard = require("../../models/boards/singleBoardSchema")
const UserController = require("../userController")
const BankController = require("../bankController")

const maxRounds = 20

// Devuelve true si y solo si el número de jugadas en esta ronda es igual al
// número de jugadores que hay en la partida
async function allPlayersPlayed(req) {
    // Parámetros en req.body: req.body.boardId
    const boardId = req.body.boardId

    try {
        // Se recupera la mesa
        const board = await SingleBoard.findById(boardId)
        if (!board) {
            return ({
                status: "error",
                message: "No se encontró la mesa de solitaria"
            })
        }
        
        if (board.hand.players.length < board.players.length) {
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
        console.error("Error al encontrar el número de manos jugadas. " + e.message)
        return ({
            status: "error",
            message: "Error al encontrar el número de manos jugadas. " + e.message
        })
    }
}

// Crea una mesa solitaria
async function add (req) {
    const level = req.body.bankLevel
    const userId = req.body.userId

    try {
        // Se crea la banca
        let resAddBank
        const req = { body: { level: level } }
        resAddBank = await BankController.add(req)
        if (resAddBank.status !== "success") {
            return ({
                status: "error",
                message: "Error al crear la banca. " + resAddBank.message
            })
        }

        const players = []
        const player = {
            player: userId
        }
        players.push(player)
        // Se crea la partida solitario
        const newBoard = await SingleBoard.create({ bank: resAddBank.bank._id,
                                                    players: players,
                                                    hand: { players: []} })
        if (!newBoard) {
            return ({
                status: "error",
                message: "Error al crear la mesa solitaria"
            })
        }
        return ({
            status: "success",
            message: "Mesa solitaria creada correctamente",
            board: newBoard
        })

    } catch (e) {
        return ({
            status: "error",
            message: "Error al crear la mesa solitaria. " + e.message 
        })
    }
}

// Función para eliminar una mesa pública por su ID
async function eliminate(req) {
    // Parámetros en body: id
    try {
        const id = req.body.id
        
        // Encontrar y eliminar mesa por id
        const board = await PublicBoard.findByIdAndDelete(id)
        
        // Mesa no encontrada, error
        if (!board) {
            return ({
                status: "error",
                message: "Mesa pública no encontrada"
            })
        } else {  // Mesa encontrada, exito
            return ({
                status: "success",
                message: "Mesa pública eliminada correctamente"
            })
        }

    } catch (error) {
        return ({
            status: "error",
            message: error.message
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
        const board = await PublicBoard.findById(boardId)
        if (!board) {
            return ({
                status: "error",
                message: "Mesa no encontrada"
            })
        }

        // En caso de que tuvieran la mesa pausada, se les elimina la mesa de mesas pausadas
        for (const player of board.players) {
            if (playersToDelete.includes(player.player) && player.paused) {
                const user = await User.findById(player.player)
                user.paused_board.splice(0, 1)
                user.save()
            }
        }

        // Eliminar a los jugadores marcados para ser eliminados
        await PublicBoard.updateOne(
            { _id: boardId },
            { $pull: { 'players': { 'player': { $in: playersToDelete } } } }
        )

        // Se elimina el usuario de la lista de jugadores en espera para que
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
async function seeAbsents(req) {
    // Parámetros en req.body: board (un board completo)
    const boardId = req.body.boardId

    try {
        const board = await PublicBoard.findById(boardId)
        if (!board) {
            return ({
                status: "error",
                message: "Mesa no encontrada"
            })
        }
        
        // Array para almacenar los IDs de los jugadores que serán eliminados
        const playersToDelete = []

        // Iterar sobre los jugadores en la mesa del torneo
        for (const playerObj of board.players) {
            // Incrementar el contador de manos ausentes si el jugador no ha jugado
            console.log("board.hand.players: ", board.hand.players)
            console.log("playerObj.player:", playerObj.player)
            if (!board.hand.players.includes(playerObj.player)) playerObj.handsAbsent++

            // Eliminar al jugador si ha dejado de jugar dos manos consecutivas
            if (playerObj.handsAbsent >= 2) playersToDelete.push(playerObj.player)
        }

        await board.save()
        console.log("playersToDelete: ", playersToDelete)
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

// Añade un jugador a la mesa si esta se encuentra esperando jugadores
async function addPlayer(req) {
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
            message: "No se pudo añadir el jugador a la mesa pública"
        })
    }
}

// Devuelve error si la mesa aún no está llena y success si ya lo está
async function isFull(req) {
    const boardId = req.body.boardId

    try {
        // Se verifica que la mesa existe
        const board = await PublicBoard.findById(boardId)
        if (!board) {
            return ({
                status: "error",
                message: "Mesa no encontrada"
            })
        }

        // Se verifica que se encuentra en el estado 'playing' que significa
        // que ya no caben más jugadores
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
        const board = await SingleBoard.findById(boardId)
        if (!board) {
            return ({
                status: "error",
                message: "No se encontró la mesa"
            })
        }

        // Se verifica si la partida ha terminado.
        // Verificar si no queda ningun jugador en la partida
        if (board.players.length === 0) {
            return ({
                status: "success",
                message: "La partida ha terminado porque el jugador se ha ido"
            })
        }

        // La partida no ha terminado
        return ({
            status: "error",
            message: "La partida aún no ha terminado"
        })

    } catch (e) {
        console.error("Error al determinar si la partida ha acabado. " + e.message)
        return ({
            status: "error",
            message: "Error al determinar si la partida ha acabado. " + e.message
        })
    }
}

// Realiza las acciones correspondientes a la finzalización de la partida. Se
// insertan las monedas correspondientes a aquellos jugadores que han ganado y
// se extrae a los que han perdido. Además se encarga de eliminar la mesa junto
// con su banca
async function finishBoard(req) {
    // Parámetros necesarios en req.body: boardId
    const boardId = req.body.boardId

    try {
        const board = await SingleBoard.findById(boardId)
        if (!board) {
            return ({
                status: "error",
                message: "Mesa no encontrada"
            })
        }

        // Se elimina la banca del sistema
        await BankController.eliminate({ body: { bankId: board.bank }})

        // Se elimina ahora la partida
        await SingleBoard.findByIdAndDelete(boardId)

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

async function boardByIdFunction(req) {
    const boardId = req.body.boardId

    try {
        const board = await SingleBoard.findById(boardId)
        if (!board) {
            return ({
                status: "error",
                message: "No existe una mesa pública con el ID proporcionado"
            })
        }

        console.log("boardByIdFunction: Board obtenido")/////////////////////////////////////////////////////////////////////////////////////////////////////////////

        return ({
            status: "success",
            message: "Se ha obtenido la mesa pública correctamente. Se encuentra en el campo board de esta respuesta",
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
        const board = await PublicBoard.findById(boardId)
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
    var res

    try {
        // Se recupera la mesa
        const board = await SingleBoard.findById(boardId)
        if (!board) {
            return ({
                status: "error",
                message: "Mesa solitaria no encontrada"
            })
        }

        // Se piden los resultados de la mano actual a la banca
        res = await BankController.results({ body: {bankId: board.bank, 
                                                 typeBoardName: 'single', 
                                                 bet: 0 }})
        if (res.status === "error") return res
        const results = res.results

        // La mano ha terminado, luego se eliminan los jugadores que mandaron la jugada
        board.hand.players = []
        await board.save()
        console.log("Todo bien en MANAGEHAND")
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

async function leaveBoardPriv(req) {
    // Parámetros necesarios en body: userId, boardId
    const boardId = req.body.boardId
    const userId = req.body.userId
    try {
        // Se verifica que la mesa exista
        const board = await PublicBoard.findById(boardId)
        if (!board) {
            return ({
                status: "error",
                message: "Mesa no encontrada"
            })
        }

        // Se verifica que el usuario esté en la partida
        const playerIndex = board.players.findIndex(player => player.player.equals(userId))
        if (playerIndex === -1) {
            return ({
                status: "error",
                message: "El usuario no está en la partida"
            })
        }      

        // Se elimina el usuario de la lista de jugadores en espera para que
        // pueda solicitar jugar otra partida
        res = await MatcherController.eliminateWaitingUser({ body: {userId: userId}})
        if (res.status === "error") return res


        // Si el usuario llevaba monedas ganadas, se le proporciona la mitad de
        // las monedas ganadas
        var inCoins
        if (board.players[playerIndex].earnedCoins > 0) {
            inCoins = Math.floor(board.players[playerIndex].earnedCoins / 2)
            res = await UserController.insertCoinsFunction({ body: { userId: userId, coins: inCoins }})
            if (res.status === "error") return res
        } 
        else if (board.players[playerIndex].earnedCoins < 0) {
            inCoins = board.players[playerIndex].earnedCoins
            res = await UserController.insertCoinsFunction({ body: { userId: userId, coins: inCoins }})
            if (res.status === "error") return res
        }

        // Eliminar al usuario de la lista de jugadores en la partida
        board.players.splice(playerIndex, 1);

        // Guardar los cambios en la base de datos
        await board.save();

        return ({
            status: "success",
            message: "El usuario abandonó la partida correctamente"
        })

    } catch (e) {
        return ({
            status: "error",
            message: "Error al abandonar la partida. " + e.message
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
        const board = await SingleBoard.findById(boardId)
        if (!board) {
            return res.status(404).json({
                status: "error",
                message: "No existe una mesa pública con el ID proporcionado"
            })
        }

        return res.status(200).json({
            status: "success",
            message: "Se ha obtenido la mesa pública correctamente. Se encuentra en el campo board de esta respuesta",
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
    let resAux

    try {
        // Se verifica que la mesa exista
        const board = await SingleBoard.findById(boardId)
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

async function resume(req) {
    // Parámetros en req.body: boardId, userId
    const boardId = req.body.boardId
    const userId = req.body.userId
    var res

    try {
        // Se verifica que el usuario exista
        const user = await User.findById(userId)
        if (!user) {
            return ({
                status: "error",
                message: "Usuario no encontrado"
            })
        }

        // Se verifica que tuviese la correspondiente partida pausada
        if (!user.paused_board[0] && user.paused_board[0].board != boardId 
            && user.paused_board[0].boardType !== "public") {
            return ({
                status: "error",
                message: "El usuario no disponía de la partida pausada"
            })
        }

        // Ya no tiene partida pausada, se borra
        user.paused_board.splice(0, 1)
        await user.save()

        // Se verifica que la partida exista
        const board = await PublicBoard.findById(boardId)
        if (!board) {
            return ({
                status: "error",
                message: "Mesa no encontrada"
            })
        }

        // Se verifica que en el board también figurase con la partida pausada
        const index = board.players.findIndex(player => player.player == userId)
        
        if (index != -1 && board.players[index].paused) {
            // El usuario ya no tiene la partida pausada, se borra
            board.players[index].paused = false
            await board.save()

            return ({
                status: "success",
                message: "El usuario puede reanudar la partida"
            })
        } else {
            return ({
                status: "error",
                message: "El usuario no puede reanudar la partida"
            })
        }

    } catch (e) {
        return ({
            status: "error",
            message: "Error al pausar la partida. " + e.message
        })
    }
}

const pause = async (req, res) => {
    // Parámetros en req.params: boardId
    const userId = req.user.id
    const boardId = req.params.id

    try {
        // Se verifica que la mesa exista
        const board = await PublicBoard.findById(boardId)
        if (!board) {
            return res.status(404).json({
                status: "error",
                message: "Mesa no encontrada"
            })
        }

        // Se verifica que el usuario juegue la partida y no la tenga ya pausada
        const index = board.players.findIndex(player => player.player == userId)
        if (index == -1 || board.players[index].paused) {
            return res.status(400).json({
                status: "error",
                message: "El usuario no se encuentra jugando esta partida"
            })
        }

        // Se verifica que el usuario exista
        const user = await User.findById(userId)
        if (!user) {
            return res.status(404).json({
                status: "error",
                message: "Usuario no encontrado"
            })
        }

        // Se verifica que no tenga otra partida en pausa
        if (user.paused_board.length > 0) {
            return res.status(400).json({
                status: "error",
                message: "El usuario ya tiene otra partida pausada"
            })
        }

        // Se marca la partida pausada en la tabla usuario
        user.paused_board.push({board: boardId, boardType: "public"})
        await user.save()

        // Se marca que el jugador a pausado la partida en la tabla publicboard
        board.players[index].paused = true
        await board.save()

        return res.status(200).json({
            status: "error",
            message: "Partida pausada correctamente"
        })

    } catch (e) {
        return res.status(400).json({
            status: "error",
            message: "Error al pausar la partida. " + e.message
        })
    }
}

async function plays(req) {
    // Parámetos en req.body: userId, boardId, cardsOnTable, playName, handIndex (menos split)
    const userId = req.body.userId
    const boardId = req.body.boardId
    const cardsOnTable = req.body.cardsOnTable
    const playName = req.body.playName

    var resAux

    try {
        // Se verifica que exista la mesa
        const board = await SingleBoard.findById(boardId)
        if (!board) {
            return ({
                status: "error",
                message: "Mesa no encontrada"
            })
        }

        // Se llama a la función del bank
        if (playName === "double") {
            resAux = await BankController.double({body: {userId: userId, boardId: boardId,
                                                typeBoardName: 'single', 
                                                bankId: board.bank, cardsOnTable: cardsOnTable,
                                                handIndex: req.body.handIndex}})
        } else if (playName === "drawCard") {
            resAux = await BankController.drawCard({body: {userId: userId, boardId: boardId,
                                                    typeBoardName: 'single', 
                                                    bankId: board.bank, cardsOnTable: cardsOnTable,
                                                    handIndex: req.body.handIndex}})
        } else if (playName === "split") {
            resAux = await BankController.split({body: {userId: userId, boardId: boardId,
                                                typeBoardName: 'single', 
                                                bankId: board.bank, cardsOnTable: cardsOnTable}})
        } else if (playName === "stick") {
            resAux = await BankController.stick({body: {userId: userId, boardId: boardId,
                                                typeBoardName: 'single', 
                                                bankId: board.bank, cardsOnTable: cardsOnTable,
                                                handIndex: req.body.handIndex}})
        } else {
            return ({
                status: "error",
                message: "Nombre de jugada no válido"
            })
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
    // Parámetros en req.body: userId, boardId, cardsOnTable, handIndex
    const userId = req.user.id   // Id del usuario peticion
    const boardId = req.body.boardId
    const cardsOnTable = req.body.cardsOnTable
    var resAux

    try {
        // Se llama a la función del bank
        resAux = await plays({body: {userId: userId, boardId: boardId, 
                                     cardsOnTable: cardsOnTable, playName: "drawCard", 
                                     handIndex: req.body.handIndex}})
        
        if (resAux.status === "error") return res.status(400).json(resAux)
        else return res.status(200).json(resAux)

    } catch (e) {
        return res.status(404).json({
            status: "error",
            message: "Error al pedir carta. " + e.message
        })
    }
}

// Función para doblar
// Pedirá una carta extra
const double = async (req, res) => {
    // Parámetros en req.body: userId, boardId, cardsOnTable, handIndex
    const userId = req.user.id   // Id del usuario peticion
    const boardId = req.body.boardId
    const cardsOnTable = req.body.cardsOnTable
    var resAux

    try {
        // Se llama a la función del bank
        resAux = await plays({body: {userId: userId, boardId: boardId, 
                                     cardsOnTable: cardsOnTable, playName: "double", 
                                     handIndex: req.body.handIndex}})
        
        if (resAux.status === "error") return res.status(400).json(resAux)
        else return res.status(200).json(resAux)

    } catch (e) {
        return res.status(404).json({
            status: "error",
            message: "Error al pedir carta. " + e.message
        })
    }
}

// Función para doblar
// Pedirá una carta extra
const split = async (req, res) => {
    // Parámetros en req.body: userId, boardId, cardsOnTable
    const userId = req.user.id   // Id del usuario peticion
    const boardId = req.body.boardId
    const cardsOnTable = req.body.cardsOnTable
    var resAux

    try {
        // Se llama a la función del bank
        resAux = await plays({body: {userId: userId, boardId: boardId, cardsOnTable: cardsOnTable, playName: "split"}})
        
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
    // Parámetros en req.body: userId, boardId, cardsOnTable, handIndex
    const userId = req.user.id   // Id del usuario peticion
    const boardId = req.body.boardId
    const cardsOnTable = req.body.cardsOnTable
    var resAux

    try {
        // Se llama a la función del bank
        resAux = await plays({body: {userId: userId, boardId: boardId, 
                                     cardsOnTable: cardsOnTable, playName: "stick", 
                                     handIndex: req.body.handIndex}})
        
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
    allPlayersPlayed,/////
    isFull,
    isEndOfGame,  ////
    finishBoard,  ///
    add,  /////
    eliminate,
    seeAbsents,
    addPlayer,
    boardByIdFunction,
    resume,
    pause,
    newMessage,
    manageHand,  ///
    boardById,   ///
    leaveBoard,  ///
    drawCard,  //
    double,  //
    split,  //
    stick  //
}
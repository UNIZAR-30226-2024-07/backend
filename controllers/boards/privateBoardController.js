const PrivateBoard = require("../../models/boards/privateBoardSchema")
const User = require("../../models/userSchema")
const BankController = require("../bankController")
const UserController = require("../userController")
const MatcherController = require("../matcherContoller")
const bcrypt = require('bcrypt')

const maxRounds = 20

////////////////////////////////////////////////////////////////////////////////
// Funciones internas
////////////////////////////////////////////////////////////////////////////////

// Devuelve true si y solo si el número de jugadas en esta ronda es igual al
// número de jugadores que hay en la partida
async function allPlayersPlayed(req) {
    // Parámetros en req.body: req.body.boardId
    const boardId = req.body.boardId
    
    try {
        // Se recupera la mesa
        const board = await PrivateBoard.findById(boardId)
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

// Crea una mesa privada
async function add (req) {
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
        const reqAddBank = { body: { level: bankLevel,
                             numPlayers: numPlayers } }
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

// Función para eliminar una mesa pública por su ID
async function eliminate(req) {
    // Parámetros en body: id
    try {
        const id = req.body.id
        
        // Encontrar y eliminar mesa por id
        const board = await PrivateBoard.findByIdAndDelete(id)
        
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
        // Eliminar a los jugadores marcados para ser eliminados
        await PrivateBoard.updateOne(
            { _id: boardId },
            { $pull: { 'players': { 'player': { $in: playersToDelete } } } }
        )

        // Se elimina el usuario de la lista de jugadores en espera para que
        // pueda solicitar jugar otra partida
        res = await MatcherController.eliminateWaitingUser({ body: {userId: userId}})
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

// Añade un jugador a la mesa si esta se encuentra esperando jugadores
async function addPlayer (req) {
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
        board.players.push({ player: userId, guest: isGuest })
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
async function isFull (req) {
    const boardId = req.body.boardId

    try {
        // Se verifica que la mesa existe
        const board = await PrivateBoard.findById(boardId)
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
        const board = await PrivateBoard.findById(boardId)
        if (!board) {
            return ({
                status: "error",
                message: "No se encontró la mesa"
            })
        }

        // Se verifica si la partida ha terminado. La partida habrá terminado si
        // se han alcanzado las 20 rondas o si solo hay un jugador en la partida

        // Verificar si se han alcanzado las 20 rondas
        if (board.hand.numHand >= maxRounds) {
            return ({
                status: "success",
                message: "La partida ha terminado porque se han alcanzado el número máximo de rondas"
            })
        }

        // Verificar si solo queda un jugador en la partida
        if (board.players.length === 1) {
            return ({
                status: "success",
                message: "La partida ha terminado porque solo queda un jugador en la partida"
            })
        }

        // Si no se han alcanzado las rondas máximas y aún queda más de un 
        // jugador en la partida, la partida no ha terminado
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
            message: "Gestión de manos completada"
        })

    } catch (e) {
        return ({
            status: "error",
            message: "Error al ver los jugadores que no han enviado jugada. " + e.message
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
        var res = await boardByIdFunction({ body: { boardId: boardId }})
        if (res.status === "error") return res
        const board = res.board

        for (playerObj of board.players) {
            if (playerObj.earnedCoins != 0) {
                res = await UserController.insertCoinsFunction({ body: { userId: playerObj.player, 
                                                                         coins: playerObj.earnedCoins }})
                if (res.status === "error") return res
            }
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

// Añade al chat de la partida el mensaje 'message' del usuario con el ID
// proporcionado si este se encontraba jugando la partida
async function newMessage(req) {
    // Parámetros en req.body: boardId, message, userId
    const boardId = req.body.boardId
    const message = req.body.message
    const userId = req.body.userId

    try {
        // Se busca y verifica que la mesa exista
        const board = await PrivateBoard.findById(boardId)
        if (!board) {
            return ({
                status: "error",
                message: "Mesa no encontrada"
            })
        }

        var res = await UserController.userByIdFunction({ body: {userId: userId }})
        const user = res.user

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
            message: "Mensaje agregado al chat de la partida correctamente",
            nameEmitter: user.nick
        })

    } catch (e) {
        return ({
            status: "error",
            message: "Error al agregar el mensaje al chat. " + e.message
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
        const board = await PrivateBoard.findById(boardId)
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

// Abandona la partida si el usuario estaba dentro de ella. Si el usuario 
// llevaba monedas ganadas, se le proporciona la mitad de las monedas ganadas.
const leaveBoard = async (req, res) => {
    // Parámetros necesarios en URL: id
    const boardId = req.params.id
    const userId = req.user._id
    var res

    try {
        // Se verifica que la mesa exista
        const board = await PrivateBoard.findById(boardId)
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

module.exports = {
    allPlayersPlayed,
    add,
    eliminate,
    addPlayer,
    isFull,
    isEndOfGame,
    seeAbsents,
    finishBoard,
    newMessage,
    boardById,
    leaveBoard
}
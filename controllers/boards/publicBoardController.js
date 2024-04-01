const User = require("../../models/userSchema")
const PublicBoard = require("../../models/boards/publicBoardSchema")
const PublicBoardType = require("../../models/publicBoardTypeSchema")
const BankController = require("../bankController")

// Crea una mesa pública dada un tipo de mesa pública
async function add (req) {
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
                                                    numPlayers: publicBoardType.numPlayers })
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
        // Eliminar a los jugadores marcados para ser eliminados
        await TournamentBoard.updateOne(
            { _id: boardId },
            { $pull: { 'players': { 'player': { $in: playersToDelete } } } }
        )

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
async function manageHand(req) {
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
        board.players.push({ player: userId, guest: isGuest })
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

async function boardByIdFunction(req) {
    const boardId = req.body.boardId

    try {
        const board = await PublicBoard.findById(boardId)
        if (!board) {
            return ({
                status: "error",
                message: "No existe una mesa pública con el ID proporcionado"
            })
        }

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

const boardById = async (req, res) => {
    const boardId = req.body.boardId

    try {
        const board = await PublicBoard.findById(boardId)
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

module.exports = {
    isFull,
    add,
    eliminate,
    addPlayer,
    boardByIdFunction,
    boardById
}

const User = require("../../models/userSchema")
const TournamentBoard = require("../../models/boards/tournamentBoardSchema")
const Tournament = require("../../models/tournamentSchema")
const BankController = require("../bankController")

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
        const req = { body: { level: tournament.bankLevel } }
        var res = await BankController.add(req)

        if (res.status === "error") return res

        // Se crea la partida de torneo
        const newBoard = await TournamentBoard.create({ tournament: tId,
                                                        bank: resAddBank.bank._id,
                                                        round: round })
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
const eliminate = async (req, res) => {
    try {
        const id = req.params.id
        
        // Encontrar y eliminar mesa por id
        const board = await TournamentBoard.findByIdAndDelete(id)
        
        // Mesa no encontrada, error
        if (!board) {
            return res.status(404).json({
                status: "error",
                message: "Mesa de torneo no encontrada"
            })
        } else {  // Mesa encontrada, exito
            return res.status(200).json({
                status: "success",
                message: "Mesa de torneo eliminada correctamente"
            })
        }

    } catch (error) {
        return res.status(404).json({
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
        // usuarios si ya está completa
        board.players.push({ player: userId })
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

const boardById = async (req, res) => {
    const boardId = req.body.boardId

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

module.exports = {
    isFull,
    add,
    addPlayer,
    boardByIdFunction,
    boardById
}

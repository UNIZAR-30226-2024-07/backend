const PrivateBoard = require("../../models/boards/privateBoardSchema")
const User = require("../../models/userSchema")
const BankController = require("../bankController")
const bcrypt = require('bcrypt')

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
    if (typeof numPlayers !== 'number' || numPlayers <= 1 || !Number.isInteger(numPlayers)) {
        return ({
            status: "error",
            message: "El campo numPlayers debe ser una cadena que represente un entero mayor de 1"
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
                                                      bet: bet })
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

module.exports = {
    add,
    eliminate,
    addPlayer,
    isFull
}
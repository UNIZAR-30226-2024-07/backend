const PublicBoardType = require("../models/publicBoardTypeSchema")
const BankController = require("./bankController")

////////////////////////////////////////////////////////////////////////////////
// Funciones para todos los usuarios
////////////////////////////////////////////////////////////////////////////////
const getAll = async (req, res) => {
    try {
        // Recuperar todos los tipos de mesas públicas
        const publicBoardTypes = await PublicBoardType.find()

        return res.status(200).json({
            status: "success",
            message: "Lista de tipos de partidas públicas obtenidas correctamente",
            publicBoardTypes: publicBoardTypes
        })

    } catch (e) {
        return res.status(500).json({
            status: "error",
            message: "Error al obtener los tipos de mesas públicas. " + e.message
        })
    }
}

////////////////////////////////////////////////////////////////////////////////
// Funciones para administradores
////////////////////////////////////////////////////////////////////////////////
const add = async (req, res) => {
    // Parámetros en req.body: name, numPlayers, bankLevel, bet
    const b = req.body

    // Nos aseguramos de que se hayan enviado todos los parámetros
    if (!b.name || !b.bankLevel || !b.bet || !b.numPlayers ||
        b.name.trim() === '' || b.bankLevel.trim() === '') {
        return res.status(400).json({
            status: "error",
            message: "Parámetros incorrectos. Los parámetros a enviar son: name, numPlayers, bankLevel, bet"
        })    
    }

    const name = b.name
    const bankLevel = b.bankLevel
    const numPlayers = parseInt(b.numPlayers)
    const bet = parseInt(b.bet)

    // Nos aseguramos de que bet sea un entero >= 0
    if (typeof bet !== 'number' || bet < 0 || !Number.isInteger(bet)) {
        return res.status(400).json({
            status: "error",
            message: "El campo bet debe ser una cadena que represente un entero mayor o igual de 0"
        })
    }

    // Nos aseguramos de que numPlayers sea un entero > 1 y <= 4
    if (typeof numPlayers !== 'number' || numPlayers > 1 || numPlayers <= 4 
        || !Number.isInteger(numPlayers)) {
        return res.status(400).json({
            status: "error",
            message: "El campo numPlayers debe ser una cadena que represente un entero mayor de 1"
        })
    }   

    try {
        // Se verifica que no exista un private board con el mismo nombre
        const board = await PublicBoardType.findOne({ name: name })
        if (board) {
            return res.status(400).json({
                status: "error",
                message: "Encontrado otro tipo de mesa pública con el mismo nombre"
            })
        }

        // Se verifica que el nivel de la banca sea válido
        const reqAddBank = { body: { level: bankLevel } }
        var res = await BankController.correctName(reqAddBank)
        if (res.status === "error") return res;

        // Se crea la partida privada
        const publicBoardType = await PublicBoardType.create({ name: name,
                                                               numPlayers: numPlayers,
                                                               bank: bankLevel,
                                                               bet: bet })
        if (!publicBoardType) {
            return res.status(400).json({
                status: "error",
                message: "Error al crear el tipo de mesa pública"
            })
        }

        return res.status(200).json({
            status: "success",
            message: "Tipo de mesa pública creado correctamente",
            publicBoardType: publicBoardType
        })

    } catch (e) {
        return res.status(500).json({
            status: "error",
            message: "Error al crear la mesa privada"
        })
    }
}

const eliminate = async (req, res) => {
    // Parámetros necesarios: name
    const name = req.body.name

    try {
        // Se verifica que el nombre exista
        const publicBoardType = await PublicBoardType.findOne({name: name})
        if (!publicBoardType) {
            return res.status(404).json({
                status: "error",
                message: "No se encontró el tipo de mesa pública"
            })
        }

        // Se elimina el nombre
        const publicBoardTypeDeleted = await PublicBoardType.findByIdAndDelete(publicBoardType._id)
        if (!publicBoardTypeDeleted) {
            return res.status(404).json({
                status: "error",
                message: "No se encontró el tipo de mesa pública"
            })
        }

        return res.status(200).json({
            status: "success",
            message: "Tipo de mesa pública borrada correctamente"
        })

    } catch (e) {
        return res.status(500).json({
            status: "error",
            message: "Error al eliminar la mesa privada"
        })
    }
}


module.exports = {
    add,
    eliminate,
    getAll
}
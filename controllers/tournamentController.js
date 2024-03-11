// Imports de esquemas necesarios
const Tournament = require("../models/tournamentSchema")
const User = require("../models/userSchema")

// Devuelve un usuario dado un id
const tournamentById = async (req, res) => {
    const tId = req.params.id

    try {
        // Buscar el usuario por su ID
        const tournament = await Tournament.findById(tId)

        // Si no se encontró, error
        if (!tournament) {
            return res.status(404).json({
                status: "error",
                message: "Torneo no encontrado"
            })
        }

        // Si se encontró, se devuelve el usuario
        return res.status(200).json({
            status: "success",
            message: "Torneo encontrado",
            tournament: tournament
        })
    } catch (error) {
        console.error(error)
        return res.status(500).json({
            status: "error",
            message: "Error interno del servidor al intentar buscar el torneo"
        })
    }
}

// Devuelve un usuario dado un id
const tournamentByName = async (req, res) => {
    const t = req.body

    try {
        // Nos aseguramos de que se hayan enviado todos los parámetros
        if (!t.name || t.name.trim() === '') {
            return res.status(400).json({
                status: "error",
                message: "Parámetros enviados incorrectamente. Se debe incluir el campo: name"
            })
        }

        // Buscar el usuario por su name
        const tournament = await Tournament.findOne({ name: t.name })

        // Si no se encontró, error
        if (!tournament) {
            return res.status(404).json({
                status: "error",
                message: "Torneo no encontrado"
            })
        }

        // Si se encontró, se devuelve el usuario
        return res.status(200).json({
            status: "success",
            message: "Torneo encontrado",
            tournament: tournament
        })
    } catch (error) {
        console.error(error)
        return res.status(500).json({
            status: "error",
            message: "Error interno del servidor al intentar buscar el torneo"
        })
    }
}

// Añade al usuario solicitante al torneo con identificador ‘id’ si posee las suficientes monedas para entrar.
const enterTournament = async (req, res) => {
    const userId = req.user.id
    const tId = req.params.id

    try {
        // Se verifica que el torneo existe
        const tournament = await Tournament.findById(tId)
        if (!tournament) {
            return res.status(404).json({
                status: "error",
                message: "Torneo no encontrado"
            })
        }

        // Se verifica que el usuario existe
        const user = await User.findById(userId)
        if (!user) {
            return res.status(404).json({
                status: "error",
                message: "Usuario no encontrado"
            })
        }

        // Se verifica que el usuario posea las monedas suficientes
        if (tournament.price > user.coins) {
            return res.status(400).json({
                status: "error",
                message: "El usuario no posee monedas suficientes para entrar al torneo"
            })
        }

        // Se descuentan las monedas al usuario y se le añade el torneo a su lista de torneos
        // activos
        user.coins -= tournament.price
        user.tournaments.push({ tournament: tId, position: '8' })
        await user.save()
        
        return res.status(200).json({
            status: "success",
            message: "El usuario se ha unido al torneo correctamente",
            user: user,
            tournament: tournament
        })
    } catch (e) {
        return res.status(400).json({
            status: "error",
            message: "Error interno al entrar al torneo"
        })
    }
}

const play = async (req, res) => {
    const tId = req.params.id

    try {
        // Se busca que el torneo exista
        const tournament = await Tournament.findById(tId)
        if (!tournament) {
            return res.status(400).json({
                status: "error",
                message: "Torneo no encontrado"
            })    
        }

        // Se busca
        
        
    } catch (e) {
        return res.status(400).json({
            status: "error",
            message: "Error interno al buscar partida"
        })
    }
}

// ------------------------ Funciones del administrador ------------------------

// Añade un nuevo torneo al sistema si su nombre aún no existe
const add = async (req, res) => {
    const t = req.body

    // Nos aseguramos de que se hayan enviado todos los parámetros
    if (!t.name || t.name.trim() === '' || !t.price) {
        return res.status(400).json({
            status: "error",
            message: "Parámetros enviados incorrectamente. Se deben incluir los campos: name, price"
        })
    }
    const price = parseInt(t.price)
    if (typeof price !== 'number' || price <= 0 || !Number.isInteger(price)) {
        return res.status(500).json({
            status: "error",
            message: "El precio de entrada al torneo no es correcto. Debe ser un entero positivo mayor de 0"
        })
    }

    try {
        // Se busca si hay un torneo que ya exista con el nombre
        const oldTournament = await Tournament.findOne({ name: t.name })
        if (oldTournament) {
            return res.status(400).json({
                status: "error",
                message: "Ya existe un torneo con ese nombre"
            })
        }

        // El campeón y subcampeón del torneo se llevan 3 / 4 y 1 / 4, respectivamente
        // de todo el dinero en juego.
        // Ejemplo: en todo torneo hay 8 jugadores, y pongamos que el precio de entrada
        // al torneo es de 100 monedas. El ganador se llevará 600 monedas mientras que
        // el subcampeón se llevará 200.
        const coins_winner = (8 * price * 3) / 4
        const coins_subwinner = (8 * price) / 4

        // Se crea el torneo
        const newTournament = await Tournament.create({
            name: t.name,
            price: price,
            coins_winner: coins_winner,
            coins_subwinner: coins_subwinner
        })
        return res.status(200).json({
            status: "success",
            message: "Torneo creado correctamente",
            tournament: newTournament
        })
    } catch (e) {
        console.error(e)
        return res.status(400).json({
            status: "error",
            message: "Error interno al crear el torneo"
        })
    }
}

// Modifica un torneo ya existente si el name no estaba ocupado por otro torneo 
// y si el precio de entrada es correcto
const update = async (req, res) => {
    const tId = req.params.id
    const t = req.body

    // Borramos los campos que no queremos actualizar
    delete t.coins_winner;
    delete t.coins_subwinner;

    try {
        // Si se quiere modificar el nombre, asegurarse de que no está en uso
        // por otro torneo
        if (t.name) {
            const tournament = await Tournament.findOne({ name: t.name })
            if (tournament) {
                return res.status(500).json({
                    status: "error",
                    message: "Ya existe un torneo con el nombre pasado como parámetro"
                })
            }
        }

        // Si se quiere modificar el precio, asegurarse de que sea correcto
        if (t.price) {
            const price = parseInt(t.price)
            if (typeof price !== 'number' || price <= 0 || !Number.isInteger(price)) {
                return res.status(500).json({
                    status: "error",
                    message: "El precio de entrada al torneo no es correcto. Debe ser un entero positivo mayor de 0"
                })
            }
            t.coins_winner = (8 * price * 3) / 4
            t.coins_subwinner = (8 * price) / 4
        }

        // Actualizar el torneo por su ID y los campos especificados
        const updatedTournament = await Tournament.findByIdAndUpdate(tId, t, { new: true })

        if (!updatedTournament) {
            return res.status(404).json({
                status: "error",
                message: "Torneo no encontrado"
            })
        }

        return res.status(200).json({
            status: "success",
            message: "Torneo actualizado correctamente",
            tournament: updatedTournament
        })
    } catch (error) {
        console.error(error)
        return res.status(500).json({
            status: "error",
            message: "Error interno del servidor al intentar actualizar el torneo"
        })
    }
}

// Elimina un torneo ya existente del sistema
const eliminate = async (req, res) => {

    const tId = req.params.id

    const deletedTournament = await Tournament.findOneAndRemove({ _id: tId })

    if (!deletedTournament) {
        return res.status(404).json({
            status: "error",
            message: "Torneo no encontrado"
        })
    }

    return res.status(200).json({
        status: "success",
        message: "Torneo eliminado correctamente"
    })
}

// Funciones que se exportan
module.exports = {
    add,
    update,
    eliminate,
    tournamentById,
    tournamentByName,
    enterTournament
}
// Imports de esquemas necesarios
const Stat = require('../models/statSchema')
const User = require('../models/userSchema')

const statNames = ["Torneos ganados", "Monedas ganadas en partida", 
    "Torneos jugados", "Finales de torneos jugadas", "Número de amigos",
    "Avatares adquiridos", "Tapetes adquiridos", "Cartas adquiridas"]

////////////////////////////////////////////////////////////////////////////////
// Funciones internas
////////////////////////////////////////////////////////////////////////////////

// Devuelve 'success' si y solo si statName es un nombre de estadística válido
function correctName(statName) {
    if (statNames.includes(statName)) {
        return ({
            status: "success",
            message: "Nombre de estadística correcto"
        })
    } else {
        return ({
            status: "error",
            message: "Nombre de estadística incorrecto"
        })
    }
}

// Crea e inicializa a cero todas las estadísticas del usuario
async function initUserStats(req) {
    // Parámetros en req.body: userId
    const userId = req.body.userId

    try {
        // Verifica si el usuario existe
        const user = await User.findById(userId)
        if (!user) {
            return ({ 
                status: "error",
                message: "Usuario no encontrado" 
            })
        }

        // Inicializa las estadísticas del usuario con valores cero
        const userStats = await Promise.all(statNames.map(async (name) => {
            const stat = await Stat.create({
                name: name,
                user: userId,
                value: 0
            })
            return stat
        }))

        // Retorna las estadísticas inicializadas
        return ({
            status: "success",
            message: "Estadísticas inicializadas correctamente",
            userStats: userStats
        })
    } catch (e) {
        return ({
            status: "error",
            message: "Error al inicializar las estadísticas del usuario. " + e.message
        })
    }
}

// Incrementa el valor de la estadística ya existente si el name no estaba 
// ocupado por otro torneo y si el precio de entrada es correcto
async function incrementStatByName(req) {
    // Parámetros en req.body: statName, userId, value
    const userId = req.body.userId
    const statName = req.body.statName
    const value = req.body.value

    try {
        var res = correctName(statName)
        if (res.status === "error") return res

        // Actualizar la estadística
        const stat = await Stat.findOne({user: userId, name: statName})
        if (!stat) {
            return ({
                status: "error",
                message: "No se encontró una estadística. Revisa que el ID del usuario sea correcto"
            })
        }

        stat.value += value
        await stat.save()

        return ({
            status: "success",
            message: "Estadística actualizada correctamente",
            stat: stat
        })

    } catch (e) {
        return res.status(500).json({
            status: "error",
            message: "Error interno del servidor al actualizar la estadística. " + e.message
        })
    }
}

// Decrementa el valor de la estadística ya existente si el name no estaba 
// ocupado por otro torneo y si el precio de entrada es correcto
async function decrementStatByName(req) {
    // Parámetros en req.body: statName, userId, value
    const userId = req.body.userId
    const statName = req.body.statName
    const value = req.body.value

    try {
        var res = correctName(statName)
        if (res.status === "error") return res

        // Actualizar la estadística
        const stat = await Stat.findOne({user: userId, name: statName})
        if (!stat) {
            return ({
                status: "error",
                message: "No se encontró una estadística. Revisa que el ID del usuario sea correcto"
            })
        }

        stat.value -= value
        await stat.save()

        return ({
            status: "success",
            message: "Estadística actualizada correctamente",
            stat: stat
        })
        
    } catch (e) {
        return res.status(500).json({
            status: "error",
            message: "Error interno del servidor al actualizar la estadística. " + e.message
        })
    }
}


////////////////////////////////////////////////////////////////////////////////
// Funciones públicas
////////////////////////////////////////////////////////////////////////////////

// Añade una nueva estadística al sistema si existía el usuario al que va 
// asociada la estadística
const add = async (req, res) => {
    const s = req.body
    try {
        // Validar si se proporcionaron todos los datos necesarios
        if (!s.name || s.name.trim() === '' || !s.user || !s.value) {
            return res.status(400).json({
                status: "error",
                message: "Faltan datos requeridos para añadir una estadística. Los campos son: name, user, value"
            })
        }
        s.value = parseFloat(s.value)

        // Se busca si el usuario proporcionado existe
        const user = await User.findById(s.user)
        if (!user) {
            return res.status(404).json({
                status: "error",
                message: "No se encontró el usuario proporcionado"
            })
        }

        // Crear la estadística
        const newStat = await Stat.create({ name: s.name,
                                            user: s.user,
                                            value: s.value })

        return res.status(201).json({
            status: "success",
            message: "Estadística añadida correctamente",
            stat: newStat
        })
    } catch (e) {
        return res.status(500).json({
            status: "error",
            message: "Error interno del servidor al añadir la estadística. " + e.message
        })
    }
}

// Modifica una estadística ya existente si el name no estaba ocupado por otro 
// torneo y si el precio de entrada es correcto
const update = async (req, res) => {
    try {
        const statId = req.params.id
        const s = req.body

        // Validar si se proporcionaron datos de actualización
        if (!s) {
            return res.status(400).json({
                status: "error",
                message: "No se proporcionaron datos para actualizar la estadística"
            })
        }

        if (s.value) {
            s.value = parseFloat(s.value)
        }

        // Actualizar la estadística
        const updatedStat = await Stat.findByIdAndUpdate(statId, s, { new: true })

        if (!updatedStat) {
            return res.status(404).json({
                status: "error",
                message: "No se encontró la estadística a actualizar"
            })
        }

        return res.status(200).json({
            status: "success",
            message: "Estadística actualizada correctamente",
            stat: updatedStat
        })
    } catch (e) {
        return res.status(500).json({
            status: "error",
            message: "Error interno del servidor al actualizar la estadística. " + e.message
        })
    }
}

// Elimina una estadística ya existente del sistema
const eliminate = async (req, res) => {
    try {
        const statId = req.params.id;

        // Eliminar la estadística
        const deletedStat = await Stat.findByIdAndDelete(statId);

        if (!deletedStat) {
            return res.status(404).json({
                status: "error",
                message: "No se encontró la estadística a eliminar"
            });
        }

        return res.status(200).json({
            status: "success",
            message: "Estadística eliminada correctamente"
        })
    } catch (e) {
        return res.status(500).json({
            status: "error",
            message: "Error interno del servidor al eliminar la estadística. " + e.message
        })
    }
}

// Devuelve una estadística dado un ‘name’ de estadística y el usuario a la que 
// pertenece ‘user’
const statByNameAndUser = async (req, res) => {
    const s = req.params
    try {
        // Validar si se proporcionaron todos los datos necesarios
        if (!s.name || s.name.trim() === '' || !s.user) {
            return res.status(400).json({
                status: "error",
                message: "Faltan datos para encontrar la estadística. Los campos son: name, user"
            })
        }

        // Buscar la estadística por nombre y usuario
        const stat = await Stat.findOne({ name: s.name, user: s.user });

        if (!stat) {
            return res.status(404).json({
                status: "error",
                message: "No se encontró la estadística para el nombre y usuario especificados"
            })
        }

        return res.status(200).json({
            status: "success",
            message: "Estadística encontrada correctamente",
            stat: stat
        })
    } catch (e) {
        return res.status(500).json({
            status: "error",
            message: "Error interno del servidor al buscar la estadística. " + e.message
        })
    }
}

// Devuelve todas las estadísticas de un usuario
const getAllUserStats = async (req, res) => {
    const userId = req.user._id

    try {
        // Busca todas las estadísticas del usuario con el ID proporcionado
        const userStats = await Stat.find({ user: userId })

        // Si no se encuentran estadísticas para el usuario, retorna un mensaje indicando que no se encontraron estadísticas
        if (!userStats || userStats.length === 0) {
            return res.status(404).json({ 
                status: "error",
                message: "No se encontraron estadísticas para este usuario"
            })
        }

        // Si se encuentran estadísticas, las devuelve en la respuesta
        return res.status(200).json({
            status: "error",
            message: "Estadísticas encontradas correctamente",
            userStats: userStats
        })
    } catch (e) {
        return res.status(500).json({
            status: "error",
            message: "Error al encontrar todas las estadísticas del usuario"
        })
    }
}

// Funciones que se exportan
module.exports = {
    initUserStats,
    incrementStatByName,
    decrementStatByName,
    add,
    update,
    eliminate,
    statByNameAndUser,
    getAllUserStats
}
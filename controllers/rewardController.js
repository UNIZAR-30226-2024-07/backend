// Imports de esquemas necesarios
const Reward = require("../models/rewardSchema")

const add = async (req, res) => {
    const r = req.body

    // Nos aseguramos de que se hayan enviado todos los parámetros
    if (!r.name || !r.value || 
        r.name !== 'Lunes' || r.name !== 'Martes' || r.name !== 'Miércoles' ||
        r.name !== 'Jueves' || r.name !== 'Viernes' || r.name !== 'Sábado' ||
        r.name !== 'Domingo' ) {
        return res.status(400).json({
            status: "error",
            message: "Parámetros enviados incorrectamente. Se deben incluir los campos: day, value. Day debe ser un día de la semana (en español y con tildes)"
        })
    }

    // Se verifica si el valor 'value' es correcto
    const value = parseInt(r.value)
    if (typeof value !== 'number' || value <= 0 || !Number.isInteger(value)) {
        return res.status(500).json({
            status: "error",
            message: "El valor de la recompensa no es correcto. Debe ser un entero positivo mayor de 0"
        })
    }

    try {
        // Se busca si hay una recompensa que ya exista con el mismo nombre
        const oldReward = await Reward.findOne({ day: r.name })
        if (oldReward) {
            return res.status(400).json({
                status: "error",
                message: "Ya existe una recompensa para ese día de la semana"
            })
        }

        const newReward = await Reward.create({ day: r.name, value: value })

        return res.status(200).json({
            status: "success",
            message: "Recompensa añadida correctamente",
            reward: newReward
        })
    } catch (e) {
        console.error(e)
        return res.status(400).json({
            status: "error",
            message: "Error interno al crear la recompensa"
        })
    }
}

// Modificar
const update = async (req, res) => {
    const r = req.body

    // Nos aseguramos de que se hayan enviado todos los parámetros
    if (!r.name || !r.value || 
        r.name !== 'Lunes' || r.name !== 'Martes' || r.name !== 'Miércoles' ||
        r.name !== 'Jueves' || r.name !== 'Viernes' || r.name !== 'Sábado' ||
        r.name !== 'Domingo' ) {
        return res.status(400).json({
            status: "error",
            message: "Parámetros enviados incorrectamente. Se deben incluir los campos: day, value. Day debe ser un día de la semana (en español y con tildes)"
        })
    }

    // Se verifica si el valor 'value' es correcto
    const value = parseInt(r.value)
    if (typeof value !== 'number' || value <= 0 || !Number.isInteger(value)) {
        return res.status(500).json({
            status: "error",
            message: "El valor de la recompensa no es correcto. Debe ser un entero positivo mayor de 0"
        })
    }

    try {
        // Se busca si hay una recompensa que ya exista con el mismo nombre
        const oldReward = await Reward.findOne({ day: r.name })
        if (oldReward) {
            return res.status(400).json({
                status: "error",
                message: "Ya existe una recompensa para ese día de la semana"
            })
        }

        const newReward = await Reward.create({ day: r.name, value: value })

        return res.status(200).json({
            status: "success",
            message: "Recompensa añadida correctamente",
            reward: newReward
        })
    } catch (e) {
        console.error(e)
        return res.status(400).json({
            status: "error",
            message: "Error interno al crear la recompensa"
        })
    }
}


// Funciones que se exportan
module.exports = {
    add
}
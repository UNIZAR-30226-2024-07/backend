// Imports de esquemas necesarios
const Reward = require("../models/rewardSchema")

// Añade una nueva recompensa al sistema si ‘day’ es un día de la semana escrito en español,
// con la primera en mayúscula y con tildes, y ‘value’ es un número entero mayor de 0
const add = async (req, res) => {
    const r = req.body

    // Nos aseguramos de que se hayan enviado todos los parámetros
    if (!r.day || !r.value || 
        r.day !== 'Lunes' || r.day !== 'Martes' || r.day !== 'Miércoles' ||
        r.day !== 'Jueves' || r.day !== 'Viernes' || r.day !== 'Sábado' ||
        r.day !== 'Domingo' ) {
        return res.status(400).json({
            status: "error",
            message: "Parámetros enviados incorrectamente. Se deben incluir los campos: day, value. Day debe ser un día de la semana (primera letra mayúscula, en español y con tildes)"
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
        const oldReward = await Reward.findOne({ day: r.day })
        if (oldReward) {
            return res.status(400).json({
                status: "error",
                message: "Ya existe una recompensa para ese día de la semana"
            })
        }

        const newReward = await Reward.create({ day: r.day, value: value })

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

// Modifica una recompensa ya existente si el ‘day’ es un día de la semana con la primera
// letra en mayúscula, escrito en español y con tildes, y ‘value’ es un número entero mayor de 0
const update = async (req, res) => {
    try {
        const r = req.body;

        // Validar si se proporcionaron datos de actualización
        if (!r || !r.day || !r.value ) {
            return res.status(400).json({
                status: "error",
                message: "No se proporcionaron datos para actualizar la recompensa"
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


        const reward = await Reward.findOne({ day: r.day })
        if (!reward) {
            return res.status(400).json({
                status: "error",
                message: "Recompensa no encontrada. Day debe ser un día de la semana (primera letra en mayúscula, en español y con tildes)"
            })    
        }

        // Actualizar la recompensa
        const updatedReward = await Reward.findByIdAndUpdate(reward._id, r, { new: true })
        if (!updatedReward) {
            return res.status(404).json({
                status: "error",
                message: "No se encontró la recompensa a actualizar"
            })
        }

        return res.status(200).json({
            status: "success",
            message: "Recompensa actualizada correctamente",
            reward: updatedReward
        })
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            status: "error",
            message: "Error interno del servidor al actualizar la recompensa"
        })
    }
}

// Elimina una recompensa ya existente del sistema dado el día de la semana ‘day’. ‘day’ 
// es un día de la semana con la primera letra en mayúscula, escrito en español y con tildes
const eliminate = async (req, res) => {
    const r = req.body
    try {

        const reward = await Reward.findOne({ day: r.day })
        if (!reward) {
            return res.status(404).json({
                status: "error",
                message: "No se encontró la recompensa a eliminar. Day debe ser un día de la semana (primera letra en mayúscula, en español y con tildes)"
            });
        }

        // Eliminar la estadística
        const deletedReward = await Reward.findByIdAndDelete(reward._id);
        if (!deletedReward) {
            return res.status(404).json({
                status: "error",
                message: "No se encontró la recompensa a eliminar. Day debe ser un día de la semana (primera letra en mayúscula, en español y con tildes)"
            });
        }

        return res.status(200).json({
            status: "success",
            message: "Recompensa eliminada correctamente"
        })
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            status: "error",
            message: "Error interno del servidor al eliminar la recompensa"
        })
    }
}

// Funciones que se exportan
module.exports = {
    add,
    update,
    eliminate
}
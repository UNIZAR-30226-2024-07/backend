// Imports de esquemas necesarios
const Bank = require("../models/bankSchema")

async function add(req) {
    const level = req.body.level
    
    try {
        if (level !== 'beginner' || level !== 'medium' || level !== 'expert') {
            return ({
                status: "error",
                message: "Level no válido. Debe ser 'beginner', 'medium' o 'expert'"
            })
        }
    
        const newBank = await Bank.create({ level: level })
        if (!newBank) {
            return ({
                status: "error",
                message: "Error al crear la banca"
            })
        }

        return ({
            status: "success",
            message: "Banca creada correctamente",
            bank: newBank
        })
    
    } catch (e) {
        return ({
            status: "error",
            message: "Error al crear la banca"
        })
    }
}

// Funciones que se exportan
module.exports = {
    add
}
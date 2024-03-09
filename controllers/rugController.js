// Imports de esquemas necesarios
const Rug = require("../models/rugSchema")

// Función para agregar un nuevo rug
const add = async (req, res) => {
    try {
        const r = req.body
        // Verificar si image y price están presentes y no son vacíos, error
        if (!r.image || !r.price || r.image.trim() === "" || r.price.trim() === "") {
            return res.status(404).json({
                status: "error",
                message: "Parámetros enviados incorrectamente. Se deben incluir los campos: image, price"
            })
        }

        // Si existe rug con misma image, error
        const oldRug = await Rug.findOne({ image: r.image })
        if (oldRug) {
            return res.status(404).json({
                status: "error",
                message: "Ya existe un rug con esa image"
            })
        }

        // Crear rug, exito
        const newRug = await Rug.create({ image: r.image, price: r.price });
        res.status(200).json({
            status: "success",
            message: "Rug creado correctamente",
            rug: newRug
        });
    } catch (error) {
        return res.status(404).json({
            status: "error",
            message: error.message
        })
    }
}

// Función para eliminar un rug por su ID
const eliminate = async (req, res) => {
    try {
        const id = req.params.id

        // Encontrar y eliminar rug por id
        const rug = await Rug.findByIdAndDelete(id)

        // Rug no encontrado, error
        if (!rug) {
            return res.status(404).json({
                status: "error",
                message: "Rug no encontrado"
            })
        } else {  // Rug encontrado, exito
            return res.status(200).json({
                status: "success",
                message: "Rug eliminado correctamente"
            })
        }

    } catch (error) {
        return res.status(404).json({
            status: "error",
            message: error.message
        })
    }
}

// Función para actualizar un rug por su ID
const update = async (req, res) => {
    try {

        const id = req.params.id
        const r = req.body

        // Obtener Rug de la base de datos
        const updateRug = await Rug.findById(id);

        // Rug no encontrado por id, error
        if (!updateRug) {
            return res.status(404).json({
                status: "error",
                message: "Rug no encontrado"
            })
        }

        // Actualizar campos rug
        if(r.image) {
            const existingRug = await Rug.findOne({ image: r.image })
            // Existe rug con misma image, error
            if (existingRug && existingRug._id != id) {
                return res.status(404).json({
                    status: "error",
                    message: "Rug con mismo image ya existente en el sistema"
                });
            } else {  // Actualizar image
                updateRug.image = r.image
            }
        }
        if (r.price) {
            updateRug.price = r.price
        }

        // Actualizar rug, exito
        const updatedRug = await Rug.findByIdAndUpdate(id, { image: updateRug.image, price: updateRug.price }, { new: true });
        res.status(200).json({
            status: "success",
            message: "Rug actualizado correctamente",
            rug: updatedRug
        })
    } catch (error) {
        return res.status(404).json({
            status: "error",
            message: error.message
        })
    }
}

// Función para obtener un rug por su ID
const rugById = async (req, res) => {
    try {
        const id = req.params.id

        // Obtener Rug de la base de datos
        const rug = await Rug.findById(id);

        // Rug no encontrado por id, error
        if (!rug) {
            return res.status(404).json({
                status: "error",
                message: "Rug no encontrado"
            })
        } else {   // Rug encontrado, exito
            res.status(200).json({
                status: "success",
                message: "Rug obtenido correctamente",
                rug: rug
            })
        }
    } catch (error) {
        return res.status(404).json({
            status: "error",
            message: error.message
        })
    }
}

// Funciones que se exportan
module.exports = {
    add,
    eliminate,
    update,
    rugById
}
// Imports de esquemas necesarios
const Avatar = require("../models/avatarSchema")

// Función para actualizar un avatar por su ID
const update = async (req, res) => {
    try {
        
        const id = req.params.id
        const a = req.body

        // Obtener Avatar de la base de datos
        const updateAvatar = await Avatar.findById(id);

        // Avatar no encontrado por id, error
        if (!updateAvatar) {
            return res.status(404).json({
                status: "error",
                message: "Avatar no encontrado"
            })
        }

        // Actualizar campos avatar
        if(a.image) {
            const existingAvatar = await Avatar.findOne({ image: a.image })
            // Existe avatar con misma image, error
            if (existingAvatar && existingAvatar._id != id) {
                return res.status(404).json({
                    status: "error",
                    message: "Avatar con mismo image ya existente en el sistema"
                });
            } else {  // Actualizar image
                updateAvatar.image = a.image
            }
        }
        if (a.price) {
            updateAvatar.price = a.price
        }

        // Actualizar avatar, exito
        const updatedAvatar = await Avatar.findByIdAndUpdate(id, { image: updateAvatar.image, price: updateAvatar.price }, { new: true });
        res.status(200).json({
            status: "success",
            message: "Avatar actualizado correctamente",
            avatar: updatedAvatar
        })
    } catch (error) {
        return res.status(404).json({
            status: "error",
            message: error.message
        })
    }
}

// Función para obtener un avatar por su ID
const avatarById = async (req, res) => {
    try {
        const id = req.params.id

        // Obtener Avatar de la base de datos
        const avatar = await Avatar.findById(id);

        // Avatar no encontrado por id, error
        if (!avatar) {
            return res.status(404).json({
                status: "error",
                message: "Avatar no encontrado"
            })
        } else {   // Avatar encontrado, exito
            res.status(200).json({
                status: "success",
                message: "Avatar obtenido correctamente",
                avatar: avatar
            })
        }
    } catch (error) {
        return res.status(404).json({
            status: "error",
            message: error.message
        })
    }
}

// Función para obtener todos los avatares
const  getAllAvatars = async (req, res) => {
    try {
        // Consulta todos los avatares en la base de datos
        const avatares = await Avatar.find()
        // Avatares no esncontrados, error
        if (!avatares) {
            return res.status(404).json({
                status: "error",
                message: "Avatares no encontrados"
            })
        } else {   // Avatares encontrados, exito
            res.status(200).json({
                status: "success",
                message: "Avatar obtenido correctamente",
                avatar: avatares
            })
        }
    } catch (error) {
        return res.status(404).json({
            status: "error",
            message: error.message
        })
    }
}

////////////////////////////////////////////////////////////////////////////////
// Funciones exclusivas del administrador

// Función para agregar un nuevo avatar
const add = async (req, res) => {
    try {
        const a = req.body
        const adminId = req.user.id

        // Verificar si image y price están presentes y no son vacíos, error
        if (!a.image || !a.price || a.image.trim() === "" || a.price.trim() === "") {
            return res.status(404).json({
                status: "error",
                message: "Parámetros enviados incorrectamente. Se deben incluir los campos: image, price"
            })
        }

        // Si existe avatar con misma image, error
        const oldAvatar = await Avatar.findOne({ image: a.image })
        if (oldAvatar) {
            return res.status(404).json({
                status: "error",
                message: "Ya existe un avatar con esa image"
            })
        }

        // Crear avatar, exito
        const newAvatar = await Avatar.create({ image: a.image, price: a.price });
        res.status(200).json({
            status: "success",
            message: "Avatar creado correctamente",
            avatar: newAvatar
        });
    } catch (error) {
        return res.status(404).json({
            status: "error",
            message: error.message
        })
    }
}

// Función para eliminar un avatar por su ID
const eliminate = async (req, res) => {
    try {
        const id = req.params.id
        
        // Encontrar y eliminar avatar por id
        const avatar = await Avatar.findByIdAndDelete(id)
        
        // Avatar no encontrado, error
        if (!avatar) {
            return res.status(404).json({
                status: "error",
                message: "Avatar no encontrado"
            })
        } else {  // Avatar encontrado, exito
            return res.status(200).json({
                status: "success",
                message: "Avatar eliminado correctamente"
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
    avatarById,
    getAllAvatars
}
// Imports de esquemas necesarios
const { dirUploads } = require("../config")
const Avatar = require("../models/avatarSchema")
const User = require('../models/userSchema')
const fs = require('fs')
const path = require('path')

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
                message: "Avatares obtenidos correctamente",
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

// Obtener el avatar que el usuario que realiza la petición tiene seleccionado
const currentAvatar = async (req, res) => {

    // Id del usuario peticion
    const userId = req.user.id

    try {
        // Buscar el usuario por su ID
        const user = await User.findById(userId);

        // Verificar si el usuario existe
        if (!user) {
            return res.status(404).json({
                status: "error",
                message: "Usuario no encontrado"
            });
        }

        // Encontrar el avatar actual del usuario (donde current es true)
        const avatar = user.avatars.find(avatar => avatar.current === true);

        // Verificar si el usuario tiene un avatar actual
        if (!avatar) {
            return res.status(404).json({
                status: "error",
                message: "El usuario no tiene un avatar actual"
            });
        }

        // Encontrar los detalles del avatar basado en su ID
        const avatarDetails = await Avatar.findById(avatar.avatar);

        // Devolver el avatar encontrado
        res.status(200).json({
            status: "success",
            message: "Avatar obtenido correctamente",
            avatar: avatarDetails
        });
    } catch (error) {
        return res.status(500).json({
            status: "error",
            message: error.message
        });
    }
};

// Obtener el avatar que tiene seleccionado un usuario
const currentAvatarById = async (req, res) => {

    // Id del usuario se quiere saber avatar
    const userId = req.params.id

    try {
        // Buscar el usuario por su ID
        const user = await User.findById(userId);

        // Verificar si el usuario existe
        if (!user) {
            return res.status(404).json({
                status: "error",
                message: "Usuario no encontrado"
            });
        }

        // Encontrar el avatar actual del usuario (donde current es true)
        const avatar = user.avatars.find(avatar => avatar.current === true);

        // Verificar si el usuario tiene un avatar actual
        if (!avatar) {
            return res.status(404).json({
                status: "error",
                message: "El usuario no tiene un avatar actual"
            });
        }

        // Encontrar los detalles del avatar basado en su ID
        const avatarDetails = await Avatar.findById(avatar.avatar);

        // Devolver el avatar encontrado
        res.status(200).json({
            status: "success",
            message: "Avatar obtenido correctamente",
            avatar: avatarDetails
        });
    } catch (error) {
        return res.status(500).json({
            status: "error",
            message: error.message
        });
    }
};

// Funciones exclusivas del administrador

// Función para agregar un nuevo avatar
const add = async (req, res) => {
    try {
        const a = req.body
        const imageFileName = req.file.filename;
        
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
        const newAvatar = await Avatar.create({ image: a.image, price: a.price, imageFileName: imageFileName });
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

// Función para eliminar un avatar por su ID
const eliminate = async (req, res) => {
    try {
        // Id del avatar
        const id = req.params.id

        const existAvatar = await Avatar.findById(id);
        if (!existAvatar) {
            return res.status(404).json({
                status: "error",
                message: "El avatar no existe"
            })
        }

        // Precio del avatar
        const avatarPrice = existAvatar.price

        // Actualizar los usuarios que tenían este avatar
        const users = await User.find({ 'avatars.avatar': id });

        for (const user of users) {
            // Index donde está el avatar en el array
            const index = user.avatars.findIndex(av => av.avatar.equals(id));

            if (index !== -1) {
                // Verificar si el avatar que se elimina es el actual
                const isCurrent = user.avatars[index].current;

                // Eliminar el avatar de la lista de avatares del usuario
                user.avatars.splice(index, 1);

                // Si el avatar eliminado era el actual, buscar y establecer el avatar "Default" como actual
                if (isCurrent) {
                    const defaultAvatar = await Avatar.findOne({ image: 'Default' });
                    if (defaultAvatar) {
                        // Verificar si el usuario ya tiene el avatar "Default" en su lista de avatares
                        const defaultIndex = user.avatars.findIndex(av => av.avatar.equals(defaultAvatar._id));
                        if (defaultIndex !== -1) {
                            user.avatars[defaultIndex].current = true;
                        } else {
                            user.avatars.push({ avatar: defaultAvatar._id, current: true });
                        }
                    }
                }

                // Sumar las monedas del avatar eliminado al usuario
                user.coins += avatarPrice;

                await user.save();
            }
        }

        // Encontrar y eliminar avatar por id
        const avatar = await Avatar.findByIdAndDelete(id)
        
        // Avatar no encontrado, error
        if (!avatar) {
            return res.status(404).json({
                status: "error",
                message: "Avatar no se ha podido eliminar del sistema"
            })
        }
        // Avatar eliminado encontrado, exito
        // Eliminar imagen servidor
        const imagePath = path.join(__dirname, `../${dirUploads}/`, avatar.imageFileName);
        fs.unlink(imagePath, (err) => {
            if (err) {
                return res.status(404).json({
                    status: "error",
                    message: "Error al eliminar foto del servidor (avatar si está eliminado de la base de datos)"
                })
            }
        })
        return res.status(200).json({
            status: "success",
            message: "Avatar eliminado correctamente"
        })
    } catch (error) {
        return res.status(404).json({
            status: "error",
            message: error.message
        })
    }
}

// Funciones que se exportan
module.exports = {
    avatarById,
    getAllAvatars,
    currentAvatar,
    currentAvatarById,
    add,
    update,
    eliminate
}
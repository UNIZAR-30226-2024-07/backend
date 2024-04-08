// Imports de esquemas necesarios
const { dirUploads } = require("../config")
const Rug = require("../models/rugSchema")
const User = require('../models/userSchema')
const fs = require('fs')
const path = require('path')

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

// Función para obtener todos los ruges
const  getAllRugs = async (req, res) => {
    try {
        // Consulta todos los ruges en la base de datos
        const ruges = await Rug.find()
        // Ruges no esncontrados, error
        if (!ruges) {
            return res.status(404).json({
                status: "error",
                message: "Ruges no encontrados"
            })
        } else {   // Ruges encontrados, exito
            res.status(200).json({
                status: "success",
                message: "Ruges obtenidos correctamente",
                rug: ruges
            })
        }
    } catch (error) {
        return res.status(404).json({
            status: "error",
            message: error.message
        })
    }
}

// Obtener el rug que el usuario que realiza la petición tiene seleccionado
const getAllMyRugs = async (req, res) => {
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
            })
        }

        const rugs = user.rugs.map(async rugRef => {
            const rug = await Rug.findById(rugRef.rug);
            return {
                current: rugRef.current,
                image: rug.image,
                imageFileName: rug.imageFileName,
                price: rug.price
            };
        });

        // Esperar a que se resuelvan todas las promesas para obtener los detalles de los tapetes
        const resRugs = await Promise.all(rugs);

        // Devolver el rug encontrado
        return res.status(200).json({
            status: "success",
            message: "Tapetes obtenido correctamente",
            rugs: resRugs
        });
    } catch (e) {
        return res.status(500).json({
            status: "error",
            message: e.message
        });
    }
};


// Obtener el rug que el usuario que realiza la petición tiene seleccionado
const currentRug = async (req, res) => {

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

        // Encontrar el rug actual del usuario (donde current es true)
        const rug = user.rugs.find(rug => rug.current === true);

        // Verificar si el usuario tiene un rug actual
        if (!rug) {
            return res.status(404).json({
                status: "error",
                message: "El usuario no tiene un rug actual"
            });
        }

        // Encontrar los detalles del rug basado en su ID
        const rugDetails = await Rug.findById(rug.rug);

        // Devolver el rug encontrado
        res.status(200).json({
            status: "success",
            message: "Rug obtenido correctamente",
            rug: rugDetails
        });
    } catch (error) {
        return res.status(500).json({
            status: "error",
            message: error.message
        });
    }
};

// Obtener el rug actual de un usuario
const currentRugById = async (req, res) => {

    // Id del usuario se quiere obtener el rug actual
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

        // Encontrar el rug actual del usuario (donde current es true)
        const rug = user.rugs.find(rug => rug.current === true);

        // Verificar si el usuario tiene un rug actual
        if (!rug) {
            return res.status(404).json({
                status: "error",
                message: "El usuario no tiene un rug actual"
            });
        }

        // Encontrar los detalles del rug basado en su ID
        const rugDetails = await Rug.findById(rug.rug);

        // Devolver el rug encontrado
        res.status(200).json({
            status: "success",
            message: "Rug obtenido correctamente",
            rug: rugDetails
        });
    } catch (error) {
        return res.status(500).json({
            status: "error",
            message: error.message
        });
    }
};

// Funciones exclusivas del administrador

// Función para agregar un nuevo rug
const add = async (req, res) => {
    try {
        const r = req.body
        const imageFileName = req.file.filename;
        
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
        const newRug = await Rug.create({ image: r.image, price: r.price, imageFileName: imageFileName });
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

// Función para eliminar un rug por su ID
const eliminate = async (req, res) => {
    try {

        // Id del rug
        const id = req.params.id

        const existRug = await Rug.findById(id);
        if (!existRug) {
            return res.status(404).json({
                status: "error",
                message: "El rug no existe"
            })
        }

        // Precio del rug
        const rugPrice = existRug.price

        // Actualizar los usuarios que tenían este rug
        const users = await User.find({ 'rugs.rug': id });

        for (const user of users) {
            // Index donde está el rug en el array
            const index = user.rugs.findIndex(r => r.rug.equals(id));

            if (index !== -1) {
                // Verificar si el rug que se elimina es el actual
                const isCurrent = user.rugs[index].current;

                // Eliminar el rug de la lista de ruges del usuario
                user.rugs.splice(index, 1);

                // Si el rug eliminado era el actual, buscar y establecer el rug "Default" como actual
                if (isCurrent) {
                    const defaultRug = await Rug.findOne({ image: 'Default' });
                    if (defaultRug) {
                        // Verificar si el usuario ya tiene el rug "Default" en su lista de ruges
                        const defaultIndex = user.rugs.findIndex(c => c.rug.equals(defaultRug._id));
                        if (defaultIndex !== -1) {
                            user.rugs[defaultIndex].current = true;
                        } else {
                            user.rugs.push({ rug: defaultRug._id, current: true });
                        }
                    }
                }

                // Sumar las monedas del rug eliminado al usuario
                user.coins += rugPrice;

                await user.save();
            }
        }
        
        // Encontrar y eliminar rug por id
        const rug = await Rug.findByIdAndDelete(id)
        
        // Rug no encontrado, error
        if (!rug) {
            return res.status(404).json({
                status: "error",
                message: "Rug no encontrado"
            })
        }
        // Rug eliminado encontrado, exito
        // Eliminar imagen servidor
        const imagePath = path.join(__dirname, `../${dirUploads}/`, rug.imageFileName);
        fs.unlink(imagePath, (err) => {
            if (err) {
                return res.status(404).json({
                    status: "error",
                    message: "Error al eliminar foto del servidor (rug si está eliminado de la base de datos)"
                })
            }
        })
        return res.status(200).json({
            status: "success",
            message: "Rug eliminado correctamente"
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
    add,
    eliminate,
    update,
    rugById,
    currentRugById,
    getAllRugs,
    getAllMyRugs,
    currentRug
}
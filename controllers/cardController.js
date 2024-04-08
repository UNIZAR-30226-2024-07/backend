// Imports de esquemas necesarios
const { dirUploads } = require("../config")
const Card = require("../models/cardSchema")
const User = require('../models/userSchema')
const fs = require('fs')
const path = require('path')

// Función para obtener un card por su ID
const cardById = async (req, res) => {
    try {
        const id = req.params.id

        // Obtener Card de la base de datos
        const card = await Card.findById(id);

        // Card no encontrado por id, error
        if (!card) {
            return res.status(404).json({
                status: "error",
                message: "Card no encontrado"
            })
        } else {   // Card encontrado, exito
            return res.status(200).json({
                status: "success",
                message: "Card obtenido correctamente",
                card: card
            })
        }
    } catch (error) {
        return res.status(404).json({
            status: "error",
            message: error.message
        })
    }
}

// Función para obtener todos los cardes
const  getAllCards = async (req, res) => {
    try {
        // Consulta todos los cardes en la base de datos
        const cardes = await Card.find()
        // Cardes no esncontrados, error
        if (!cardes) {
            return res.status(404).json({
                status: "error",
                message: "Cardes no encontrados"
            })
        } else {   // Cardes encontrados, exito
            return res.status(200).json({
                status: "success",
                message: "Cardes obtenidos correctamente",
                card: cardes
            })
        }
    } catch (error) {
        return res.status(404).json({
            status: "error",
            message: error.message
        })
    }
}

// Obtener el card que el usuario que realiza la petición tiene seleccionado
const currentCard = async (req, res) => {

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

        // Encontrar el card actual del usuario (donde current es true)
        const card = user.cards.find(card => card.current === true);

        // Verificar si el usuario tiene un card actual
        if (!card) {
            return res.status(404).json({
                status: "error",
                message: "El usuario no tiene un card actual"
            });
        }

        // Encontrar los detalles del card basado en su ID
        const cardDetails = await Card.findById(card.card);

        // Devolver el card encontrado
        return res.status(200).json({
            status: "success",
            message: "Card obtenido correctamente",
            card: cardDetails
        });
    } catch (error) {
        return res.status(500).json({
            status: "error",
            message: error.message
        });
    }
};

// Obtener el card actual de un usuario
const currentCardById = async (req, res) => {

    // Id del usuario se quiere ver current card
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

        // Encontrar el card actual del usuario (donde current es true)
        const card = user.cards.find(card => card.current === true);

        // Verificar si el usuario tiene un card actual
        if (!card) {
            return res.status(404).json({
                status: "error",
                message: "El usuario no tiene un card actual"
            });
        }

        // Encontrar los detalles del card basado en su ID
        const cardDetails = await Card.findById(card.card);

        // Devolver el card encontrado
        return res.status(200).json({
            status: "success",
            message: "Card obtenido correctamente",
            card: cardDetails
        });
    } catch (error) {
        return res.status(500).json({
            status: "error",
            message: error.message
        });
    }
};

// Funciones exclusivas del administrador

// Función para agregar un nuevo card
const add = async (req, res) => {
    try {
        const c = req.body
        const imageFileName = req.file.filename;
        
        // Verificar si image y price están presentes y no son vacíos, error
        if (!c.image || !c.price || c.image.trim() === "" || c.price.trim() === "") {
            return res.status(404).json({
                status: "error",
                message: "Parámetros enviados incorrectamente. Se deben incluir los campos: image, price"
            })
        }

        // Si existe card con misma image, error
        const oldCard = await Card.findOne({ image: c.image })
        if (oldCard) {
            return res.status(404).json({
                status: "error",
                message: "Ya existe un card con esa image"
            })
        }

        // Crear card, exito
        const newCard = await Card.create({ image: c.image, price: c.price, imageFileName: imageFileName });
        return res.status(200).json({
            status: "success",
            message: "Card creado correctamente",
            card: newCard
        });
    } catch (error) {
        return res.status(404).json({
            status: "error",
            message: error.message
        })
    }
}

// Función para actualizar un card por su ID
const update = async (req, res) => {
    try {
        
        const id = req.params.id
        const c = req.body

        // Obtener Card de la base de datos
        const updateCard = await Card.findById(id);

        // Card no encontrado por id, error
        if (!updateCard) {
            return res.status(404).json({
                status: "error",
                message: "Card no encontrado"
            })
        }

        // Actualizar campos card
        if(c.image) {
            const existingCard = await Card.findOne({ image: c.image })
            // Existe card con misma image, error
            if (existingCard && existingCard._id != id) {
                return res.status(404).json({
                    status: "error",
                    message: "Card con mismo image ya existente en el sistema"
                });
            } else {  // Actualizar image
                updateCard.image = c.image
            }
        }
        if (c.price) {
            updateCard.price = c.price
        }

        // Actualizar card, exito
        const updatedCard = await Card.findByIdAndUpdate(id, { image: updateCard.image, price: updateCard.price }, { new: true });
        return res.status(200).json({
            status: "success",
            message: "Card actualizado correctamente",
            card: updatedCard
        })
    } catch (error) {
        return res.status(404).json({
            status: "error",
            message: error.message
        })
    }
}

// Función para eliminar un card por su ID
const eliminate = async (req, res) => {
    try {
        // Id del card
        const id = req.params.id

        const existCard = await Card.findById(id);
        if (!existCard) {
            return res.status(404).json({
                status: "error",
                message: "El card no existe"
            })
        }

        // Precio del card
        const cardPrice = existCard.price

        // Actualizar los usuarios que tenían este card
        const users = await User.find({ 'cards.card': id });

        for (const user of users) {
            // Index donde está el card en el array
            const index = user.cards.findIndex(av => av.card.equals(id));

            if (index !== -1) {
                // Verificar si el card que se elimina es el actual
                const isCurrent = user.cards[index].current;

                // Eliminar el card de la lista de cardes del usuario
                user.cards.splice(index, 1);

                // Si el card eliminado era el actual, buscar y establecer el card "Default" como actual
                if (isCurrent) {
                    const defaultCard = await Card.findOne({ image: 'Default' });
                    if (defaultCard) {
                        // Verificar si el usuario ya tiene el card "Default" en su lista de cardes
                        const defaultIndex = user.cards.findIndex(c => c.card.equals(defaultCard._id));
                        if (defaultIndex !== -1) {
                            user.cards[defaultIndex].current = true;
                        } else {
                            user.cards.push({ card: defaultCard._id, current: true });
                        }
                    }
                }

                // Sumar las monedas del card eliminado al usuario
                user.coins += cardPrice;

                await user.save();
            }
        }
        
        // Encontrar y eliminar card por id
        const card = await Card.findByIdAndDelete(id)
        
        // Card no encontrado, error
        if (!card) {
            return res.status(404).json({
                status: "error",
                message: "Card no encontrado"
            })
        }
        // Card eliminado encontrado, exito
        // Eliminar imagen servidor
        const imagePath = path.join(__dirname, `../${dirUploads}/`, card.imageFileName);
        fs.unlink(imagePath, (err) => {
            if (err) {
                return res.status(404).json({
                    status: "error",
                    message: "Error al eliminar foto del servidor (card si está eliminado de la base de datos)"
                })
            }
        })
        return res.status(200).json({
            status: "success",
            message: "Card eliminado correctamente"
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
    cardById,
    currentCardById,
    getAllCards,
    currentCard
}
// Imports de esquemas necesarios
const { dirUploads } = require("../config")
const Card = require("../models/cardSchema")
const fs = require('fs')
const path = require('path')

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
        res.status(200).json({
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
            res.status(200).json({
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
            res.status(200).json({
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
        res.status(200).json({
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

// Función para eliminar un card por su ID
const eliminate = async (req, res) => {
    try {
        const id = req.params.id
        
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
    getAllCards
}
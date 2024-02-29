// Imports de esquemas necesarios
const Avatar = require("../models/avatarSchema")

// Función para agregar un nuevo avatar
const add = async (req, res) => {
    try {
        const { image, price } = req.body;
        const newAvatar = await Avatar.create({ image, price });
        res.status(200).json(newAvatar);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// Función para eliminar un avatar por su ID
const eliminate = async (req, res) => {
    try {
        const { id } = req.params;
        await Avatar.findByIdAndDelete(id);
        res.status(200).json({ message: 'Avatar eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// Función para actualizar un avatar por su ID
const update = async (req, res) => {
    try {
        const { id } = req.params;
        const { image, price } = req.body;
        const updatedAvatar = await Avatar.findByIdAndUpdate(id, { image, price }, { new: true });
        res.status(200).json(updatedAvatar);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// Función para obtener un avatar por su ID
const avatarById = async (req, res) => {
    try {
        const { id } = req.params;
        const avatar = await Avatar.findById(id);
        if (!avatar) {
            return res.status(404).json({ message: 'Avatar no encontrado' });
        }
        res.status(200).json(avatar);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// Funciones que se exportan
module.exports = {

}
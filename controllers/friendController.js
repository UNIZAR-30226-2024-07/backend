// Imports de esquemas necesarios
const Friend = require("../models/friendSchema")
const User = require('../models/userSchema')
const StatController = require("./statController")

////////////////////////////////////////////////////////////////////////////////
// Funciones de administrador
////////////////////////////////////////////////////////////////////////////////

async function eliminateAllUserFriends(req) {
    const userId = req.body.userId

    try {
        // Se verifica que el usuario existe
        const user = await User.findById(userId)
        if (!user) {
            return ({
                status: "error",
                message: "Usuario no encontrado en FriendController"
            })
        }

        // Se eliminan todas las relaciones de amistad en las que el usuario esté
        // involucrado
        const deleteResult = await Friend.deleteMany({
            $or: [
                { user1: userId },
                { user2: userId }
            ]
        })
        
        // Se verifica si se han eliminado relaciones de amistad
        if (deleteResult.deletedCount === 0) {
            return ({
                status: "success",
                message: "El usuario no tiene amigos para eliminar"
            })
        }
        
        // Se devuelve un mensaje de éxito
        return ({
            status: "success",
            message: "Todas las relaciones de amistad del usuario han sido eliminadas correctamente"
        })        
    } catch (e) {
        return ({
            status: "error",
            message: "Error al eliminar todos los amigos del usuario. " + e.message
        })
    }
}

////////////////////////////////////////////////////////////////////////////////
// Funciones públicas
////////////////////////////////////////////////////////////////////////////////

// Enviar solicitud de amistad a una persona
const add = async (req, res) => {
    try {
        const idUser = req.user.id    // Sabemos que existe
        const idFriend = req.params.id

        // No se puede tener a uno mismo como amigo
        if (idUser === idFriend) {
            return res.status(404).json({
                status: "error",
                message: "No se puede tener a uno mismo como amigo"
            })
        }

        // Verificar idFriend existe en user
        const findUser = await User.findById(idFriend)
        if (!findUser) {
            return res.status(404).json({
                status: "error",
                message: "No existe un usuario con ese id. No se le puede enviar solicitud a un usuario inexistente"
            })
        }

        // Verificar idUser e idFriend no están ya relacionados
        const existingFriendship = await Friend.exists({
            $or: [
              { user: idUser, friend: idFriend },
              { user: idFriend, friend: idUser }
            ]
        })
        if (existingFriendship) {
            return res.status(404).json({
                status: "error",
                message: "Los dos usuarios ya son amigos o  la invitacion ya fue enviada"
            })
        }

        // Solicitar a friend amistad
        const newFriend = await Friend.create({ user: idUser, friend: idFriend, confirmed: false })
        // Error al solicitar amistad
        if(!newFriend) {
            return res.status(404).json({
                status: "error",
                message: "Error al solicitad amistad"
            })
        }

        // Exito, solicitud enviada
        return res.status(200).json({
            status: "success",
            message: "Solicitud de amistad enviada exitosamente",
            friend: newFriend
        })
    } catch (error) {
        return res.status(404).json({
            status: "error",
            message: error.message
        })
    }
}

// Listar todos los amigos de un usuario
const getAllFriends = async (req, res) => {
    try {
        const idUser = req.user.id    // Sabemos que existe

        // Obtener todos sus amigos
        // Obtener amigos donde el usuario es el propietario
        const friends = await Friend.find({ user: idUser, confirmed: true }).lean()
        const friendIds = friends.map(friend => friend.friend)
        const userAsOwner = await User.find({ _id: { $in: friendIds } })

        // Obtener amigos donde el usuario es el amigo
        const users = await Friend.find({ friend: idUser, confirmed: true }).lean()
        const usersIds = users.map(user => user.user)
        const userAsFriend = await User.find({ _id: { $in: usersIds } })

        // Concatenar ambos conjuntos de amigos
        const userFriends = userAsOwner.concat(userAsFriend)

        // Ordenar los amigos según el nick del usuario
        userFriends.sort((a, b) => {
            const nickA = a.nick.toLowerCase();
            const nickB = b.nick.toLowerCase();
            return nickA.localeCompare(nickB);
        })
        return res.status(200).json({
            status: "success",
            message: "Devuelto amigos del usuario",
            friend: userFriends
        })
    } catch (error) {
        return res.status(404).json({
            status: "error",
            message: error.message
        })
    }
}

// Listar todas las solicitudes de amistad pendientes enviadas
const getAllPendingFriends = async (req, res) => {
    try {
        const idUser = req.user.id    // Sabemos que existe

        // Obtener todas las solicitudes enviadas
        const friends = await Friend.find({ user: idUser, confirmed: false }).lean()
        const friendIds = friends.map(friend => friend.friend)
        const userFriends = await User.find({ _id: { $in: friendIds } })

        // Ordenar los amigos según el nick del usuario
        userFriends.sort((a, b) => {
            const nickA = a.nick.toLowerCase();
            const nickB = b.nick.toLowerCase();
            return nickA.localeCompare(nickB);
        })
        return res.status(200).json({
            status: "success",
            message: "Devueltos solicitudes de amigos pendientes enviadas",
            friend: userFriends
        })
    } catch (error) {
        return res.status(404).json({
            status: "error",
            message: error.message
        })
    }
}

// Listar todos las solicitudes de amistad recibidas
const getAllReceivedFriends = async (req, res) => {
    try {
        const idUser = req.user.id    // Sabemos que existe

        // Obtener todos sus amigos
        const users = await Friend.find({ friend: idUser, confirmed: false }).lean()
        const usersIds = users.map(user => user.user)
        const userFriends = await User.find({ _id: { $in: usersIds } })

        // Ordenar los amigos según el nick del usuario
        userFriends.sort((a, b) => {
            const nickA = a.nick.toLowerCase();
            const nickB = b.nick.toLowerCase();
            return nickA.localeCompare(nickB);
        })
        return res.status(200).json({
            status: "success",
            message: "Devueltos solicitudes de amigos pendientes recibidas",
            friend: userFriends
        })
    } catch (error) {
        return res.status(404).json({
            status: "error",
            message: error.message
        })
    }
}

// Aceptar invitación
const accept = async (req, res) => {
    try {
        const idUser = req.user.id    // Sabemos que existe
        const idFriend = req.params.id

        // Verificar idFriend existe en user
        const findUser = await User.findById(idFriend)
        if (!findUser) {
            return res.status(404).json({
                status: "error",
                message: "No existe un usuario con ese id. No se le puede enviar solicitud a un usuario inexistente"
            })
        }

        // Verificar idUser e idFriend no están ya relacionados
        const existingFriendship = await Friend.exists({
            $or: [
              { user: idUser, friend: idFriend },
              { user: idFriend, friend: idUser }
            ],
            confirmed: true
        })
        if (existingFriendship) {
            return res.status(404).json({
                status: "error",
                message: "Los dos usuarios ya son amigos"
            })
        }

        // Aceptar invitación
        const friendShip = await Friend.updateOne(
            { user: idFriend, friend: idUser, confirmed: false },
            { confirmed: true },
            { new: true }
        )
        // Verificar si la actualización no tuvo éxito
        if (friendShip.modifiedCount === 0) {
            return res.status(404).json({
                status: "error",
                message: "No se ha podido aceptar la invitacion"
            })
        }

        // Se incrementa en 1 el número de amigos en las estadísticas para los
        // dos jugadores
        var resStat = await StatController.incrementStatByName({body: { userId: idUser, 
            statName: "Número de amigos", value: 1 }})
        if (resStat.status === "error") return res.status(400).json(resStat)

        resStat = await StatController.incrementStatByName({body: { userId: idFriend, 
            statName: "Número de amigos", value: 1 }})
        if (resStat.status === "error") return res.status(400).json(resStat)

        return res.status(200).json({
            status: "success",
            message: "Solicitud de amistad aceptada con exito",
        })

    } catch (error) {
        return res.status(404).json({
            status: "error",
            message: error.message
        })
    }
}

// Rechazar invitación
const reject = async (req, res) => {
    try {
        const idUser = req.user.id    // Sabemos que existe
        const idFriend = req.params.id

        // Verificar idFriend existe en user
        const findUser = await User.findById(idFriend)
        if (!findUser) {
            return res.status(404).json({
                status: "error",
                message: "No existe un usuario con ese id. No se le puede enviar solicitud a un usuario inexistente"
            })
        }

        // Verificar idUser e idFriend no están ya relacionados
        const existingFriendship = await Friend.exists({
            $or: [
              { user: idUser, friend: idFriend },
              { user: idFriend, friend: idUser }
            ],
            confirmed: true
        })
        if (existingFriendship) {
            return res.status(404).json({
                status: "error",
                message: "Los dos usuarios ya son amigos"
            })
        }

        // Rechazar invitación
        const deletedFriendRequest = await Friend.findOneAndDelete({
            user: idFriend,
            friend: idUser,
            confirmed: false
        })
        // Verificar si la actualización no tuvo éxito
        if (!deletedFriendRequest) {
            return res.status(404).json({
                status: "error",
                message: "No se ha podido rechazar la invitacion"
            })
        }

        return res.status(200).json({
            status: "success",
            message: "Solicitud de amistad rechazada con exito"
        })
    } catch (error) {
        return res.status(404).json({
            status: "error",
            message: error.message
        })
    }
}

// Elimina la relación de amistad entre el usuario y otro usuario de ID dado
const eliminateFriend = async (req, res) => {
    // Parámetros en URL: id (del amigo a eliminar)
    const userId = req.user.id
    const friendId = req.params.id

    try {
        // Verificar idFriend existe en user
        const findUser = await User.findById(friendId)
        if (!findUser) {
            return res.status(404).json({
                status: "error",
                message: "Usuario amigo no encontrado"
            })
        }

        // Verificar userId e friendId no están ya relacionados
        const existingFriendship = await Friend.exists({
            $or: [
              { user: userId, friend: friendId },
              { user: friendId, friend: userId }
            ],
            confirmed: true
        })
        if (!existingFriendship) {
            return res.status(404).json({
                status: "error",
                message: "Los dos usuarios no son amigos"
            })
        }

        const eliminatedFriendship = await Friend.findByIdAndDelete(existingFriendship._id)
        if (!eliminatedFriendship) {
            return res.status(404).json({
                status: "error",
                message: "Error al eliminar al amigo"
            })
        }

        // Se decrementa en 1 el número de amigos en las estadísticas para los
        // dos jugadores
        var resStat = await StatController.decrementStatByName({body: { userId: userId, 
            statName: "Número de amigos", value: 1 }})
        if (resStat.status === "error") return res.status(400).json(resStat)

        resStat = await StatController.decrementStatByName({body: { userId: friendId, 
            statName: "Número de amigos", value: 1 }})
        if (resStat.status === "error") return res.status(400).json(resStat)

        return res.status(200).json({
            status: "error",
            message: "Amigo eliminado correctamente",
            friendship: eliminatedFriendship
        })

    } catch (e) {
        return res.status(400).json({
            status: "error",
            message: "Error al eliminar al amigo. " + e.message
        })
    }
}

// Funciones que se exportan
module.exports = {
    eliminateAllUserFriends,
    
    add,
    getAllFriends,
    getAllPendingFriends,
    getAllReceivedFriends,
    accept,
    reject,
    eliminateFriend
}
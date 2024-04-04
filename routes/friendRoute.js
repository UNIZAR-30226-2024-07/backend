const { Router } = require('express')
const router = Router()
const FriendController = require('../controllers/friendController')
// const UserController = require('../controllers/userController')
const { authRequired } = require('../jwt/jwt')


// Enviar solicitud de amistad a una persona
router.post("/add/:id", authRequired, FriendController.add)

// Listar todos los amigos de un usuario
router.get("/getAllFriends", authRequired, FriendController.getAllFriends)

// Listar todas las solicitudes de amistad pendientes enviadas
router.get("/getAllPendingFriends", authRequired, FriendController.getAllPendingFriends)

// Listar todos las solicitudes de amistad recibidas
router.get("/getAllReceivedFriends", authRequired, FriendController.getAllReceivedFriends)

// Aceptar invitación
router.put("/accept/:id", authRequired, FriendController.accept)

// Rechazar invitación
router.delete("/reject/:id", authRequired, FriendController.reject)

// Eliminar amigo
router.delete("/eliminateFriend/:id", authRequired, FriendController.eliminateFriend)

module.exports = router
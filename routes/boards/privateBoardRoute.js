const { Router } = require('express')
const router = Router()
const UserController = require('../../controllers/userController')
const PrivateBoardController = require("../../controllers/boards/privateBoardController")
const { authRequired } = require('../../jwt/jwt')

// Devuelve el 'board' completo dado su ID
router.get('/boardById/:id', authRequired, PrivateBoardController.boardById)

// Abandona la partida si el usuario estaba dentro de ella
router.put('/leaveBoard/:id', authRequired, PrivateBoardController.leaveBoard)

module.exports = router
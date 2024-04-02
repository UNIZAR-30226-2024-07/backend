const { Router } = require('express')
const router = Router()
const UserController = require('../../controllers/userController')
const PublicBoardController = require("../../controllers/boards/publicBoardController")
const { authRequired } = require('../../jwt/jwt')

// Devuelve el 'board' completo dado su ID
router.get('/boardById/:id', authRequired, PublicBoardController.boardById)

// Abandona la partida si el usuario estaba dentro de ella
router.put('/leaveBoard/:id', authRequired, PublicBoardController.leaveBoard)

module.exports = router
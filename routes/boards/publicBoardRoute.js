const { Router } = require('express')
const router = Router()
const UserController = require('../../controllers/userController')
const PublicBoardController = require("../../controllers/boards/publicBoardController")
const { authRequired } = require('../../jwt/jwt')

// Devuelve el 'board' completo dado su ID
router.get('/boardById/:id', authRequired, PublicBoardController.boardById)

// Abandona la partida si el usuario estaba dentro de ella
router.put('/leaveBoard/:id', authRequired, PublicBoardController.leaveBoard)

// Jugadas posibles
router.put('/pause/:id', authRequired, PublicBoardController.pause)
router.put('/drawCard', authRequired, PublicBoardController.drawCard)
router.put('/double', authRequired,PublicBoardController.double)
router.put('/split', authRequired, PublicBoardController.split)
router.put('/stick', authRequired, PublicBoardController.stick)

module.exports = router
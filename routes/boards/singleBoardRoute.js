const { Router } = require('express')
const router = Router()
const UserController = require('../../controllers/userController')
const SingleBoardController = require("../../controllers/boards/singleBoardController")
const { authRequired } = require('../../jwt/jwt')

// Devuelve el 'board' completo dado su ID
router.get('/boardById/:id', authRequired, SingleBoardController.boardById)

// Abandona la partida si el usuario estaba dentro de ella
router.put('/leaveBoard/:id', authRequired, SingleBoardController.leaveBoard)

// Jugadas posibles
router.put('/drawCard', authRequired, SingleBoardController.drawCard)
router.put('/double', authRequired,SingleBoardController.double)
router.put('/split', authRequired, SingleBoardController.split)
router.put('/stick', authRequired, SingleBoardController.stick)

module.exports = router
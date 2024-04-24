const { Router } = require('express')
const router = Router()
const UserController = require('../../controllers/userController')
const TournamentBoardController = require("../../controllers/boards/tournamentBoardController")
const { authRequired } = require('../../jwt/jwt')

// Devuelve el 'board' completo dado su ID
router.get('/boardById/:id', authRequired, TournamentBoardController.boardById)

// Abandona la partida si el usuario estaba dentro de ella
router.put('/leaveBoard/:id', authRequired, TournamentBoardController.leaveBoard)

// Jugadas posibles
router.put('/drawCard', authRequired, TournamentBoardController.drawCard)
router.put('/stick', authRequired, TournamentBoardController.stick)

module.exports = router
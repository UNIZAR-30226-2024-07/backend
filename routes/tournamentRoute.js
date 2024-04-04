const { Router } = require('express')
const router = Router()
const TournamentController = require('../controllers/tournamentController')
const { authRequired } = require('../jwt/jwt')
const { isAdmin } = require('../controllers/userController')

router.get('/tournamentById/:id', authRequired, TournamentController.tournamentById)
router.get('/tournamentByName/:id', authRequired, TournamentController.tournamentByName)
router.put('/enterTournament/:id', authRequired, TournamentController.enterTournament)
router.get('/isUserInTournament/:id', authRequired, TournamentController.isUserInTournament)
router.get('/getAll', authRequired, TournamentController.getAll)
router.get('/roundInTournament/:id', authRequired, TournamentController.roundInTournament)

// Funciones para administrador
router.post('/add', authRequired, isAdmin, TournamentController.add)
router.put('/update/:id', authRequired, isAdmin, TournamentController.update)
router.delete('/eliminate/:id', authRequired, isAdmin, TournamentController.eliminate)

module.exports = router
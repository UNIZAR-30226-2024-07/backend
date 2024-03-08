const { Router } = require('express')
const router = Router()
const TournamentController = require('../controllers/tournamentController')
const { authRequired } = require('../jwt/jwt')

router.post('/add', authRequired, TournamentController.add)
router.put('/update/:id', authRequired, TournamentController.update)
router.delete('/eliminate/:id', authRequired, TournamentController.eliminate)
router.get('/tournamentById/:id', authRequired, TournamentController.tournamentById)
router.get('/tournamentByName/:id', authRequired, TournamentController.tournamentByName)

module.exports = router
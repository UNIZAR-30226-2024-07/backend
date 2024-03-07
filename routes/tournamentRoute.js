const { Router } = require('express')
const router = Router()
const TournamentController = require('../controllers/tournamentController')

router.post('/add', TournamentController.add)
router.put('/update/:id', TournamentController.update)
router.delete('/eliminate/:id', TournamentController.eliminate)
router.get('/tournamentById/:id', TournamentController.tournamentById)
router.get('/tournamentByName/:id', TournamentController.tournamentByName)

module.exports = router
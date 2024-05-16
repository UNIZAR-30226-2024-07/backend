const { Router } = require('express')
const router = Router()
const StatController = require('../controllers/statController')
const { authRequired } = require('../jwt/jwt')

// Añade una nueva estadística al sistema si existía el usuario al que va
// asociada la estadística
router.post('/add', authRequired, StatController.add)

// Modifica una estadística ya existente si el name no estaba ocupado por otro 
// torneo y si el precio de entrada es correcto
router.put('/update/:id', authRequired, StatController.update)

// Elimina una estadística ya existente del sistema
// router.delete('/eliminate/:id', authRequired, StatController.eliminate)

// Devuelve una estadística dado un ‘name’ de estadística y el usuario a la que
// pertenece ‘user’
router.get('/statByNameAndUser/:user/:name', authRequired, StatController.statByNameAndUser)

router.get('/getAllStatsByUser/:id', authRequired, StatController.getAllStatsByUser)

// Devuelve todas las estadísticas de un usuario
router.get('/getAllUserStats', authRequired, StatController.getAllUserStats)

module.exports = router
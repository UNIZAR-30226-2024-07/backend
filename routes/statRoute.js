const { Router } = require('express')
const router = Router()
const StatController = require('../controllers/statController')
const { authRequired } = require('../jwt/jwt')

router.post('/add', authRequired, StatController.add)
router.put('/update/:id', authRequired, StatController.update)
router.delete('/eliminate/:id', authRequired, StatController.eliminate)
router.get('/statByNameAndUser', authRequired, StatController.statByNameAndUser)

module.exports = router
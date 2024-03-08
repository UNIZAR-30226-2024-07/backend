const { Router } = require('express')
const router = Router()
const RewardController = require('../controllers/rewardController')
const { authRequired } = require('../jwt/jwt')

router.post("/add", authRequired, RewardController.add)
router.put('/update', authRequired, RewardController.update)
router.delete('/eliminate', authRequired, RewardController.eliminate)

module.exports = router
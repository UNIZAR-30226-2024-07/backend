const { Router } = require('express')
const router = Router()
const BankController = require('../controllers/bankController')
const { authRequired } = require('../jwt/jwt')


router.delete("/eliminateAll", BankController.eliminateAll)

router.put("/drawCard/", authRequired, BankController.drawCard)


module.exports = router
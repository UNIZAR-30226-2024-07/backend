const { Router } = require('express')
const router = Router()
const BankController = require('../controllers/bankController')
const { authRequired } = require('../jwt/jwt')


router.delete("/eliminateAll", BankController.eliminateAll)

module.exports = router
const { Router } = require('express')
const router = Router()
const BankController = require('../controllers/bankController')
const { authRequired } = require('../jwt/jwt')


router.delete("/eliminateAll", BankController.eliminateAll)

router.put("/drawCard", authRequired, BankController.drawCard)
router.put("/double", authRequired, BankController.double)
router.put("/split", authRequired, BankController.split)
router.put("/stick", authRequired, BankController.stick)


module.exports = router
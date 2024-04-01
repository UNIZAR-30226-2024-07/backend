const { Router } = require('express')
const router = Router()
const BankController = require('../controllers/bankController')

router.delete("/eliminateAll", BankController.eliminateAll)
// router.post("/add", AvatarController.addUser)

module.exports = router
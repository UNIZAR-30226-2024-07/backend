const { Router } = require('express')
const router = Router()
const CardController = require('../controllers/cardController')

router.post("/add", CardController.add)
router.delete("/eliminate/:id", CardController.eliminate)
router.put("/update/:id", CardController.update)
router.get("/cardById/:id", CardController.cardById)

module.exports = router
const { Router } = require('express')
const router = Router()
const RugController = require('../controllers/rugController')

router.post("/add", RugController.add)
router.delete("/eliminate/:id", RugController.eliminate)
router.put("/update/:id", RugController.update)
router.get("/rugById/:id", RugController.rugById)

module.exports = router
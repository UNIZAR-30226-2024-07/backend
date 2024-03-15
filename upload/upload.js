const multer = require('multer')
const { v4: uuidv4 } = require('uuid')
const path = require('path')
const { dirUploads } = require('../config')

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, dirUploads)
    },
    filename: function(req, file, cb) {
        cb(null, uuidv4() + '-' + Date.now() + path.extname(file.originalname))
    }
})

const fileFilter = (req, file, cb) => {
    const allowedFileTypes = ['image/jpeg', 'image/jpg', 'image/png']
    if (allowedFileTypes.includes(file.mimetype)) {
        cb(null, true)
    } else {
        cb(null, false)
    }
}

const uploadFile = multer({storage, fileFilter})

module.exports = {
    uploadFile
}
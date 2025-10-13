// const multer = require('multer');
// const path = require('path');
// const fs = require('fs');

// const uploadDir = 'uploads/';
// if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// const storage = multer.diskStorage({
//     destination: (req, file, cb) => cb(null, uploadDir),
//     filename: (req, file, cb) => {
//         const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
//         cb(null, uniqueName);
//     }
// });

// const upload = multer({ storage });

// module.exports = {
//     uploadMiddleware: upload.array('images', 5)
// };
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Absolute path for uploads folder (outside src)
const uploadDir = path.join(__dirname, '../uploads');


// Create folder if it doesn't exist
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueName = `product-${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({ storage });

module.exports = {
    uploadMiddleware: upload.array('images', 5) // max 5 files
};

const { body } = require('express-validator')

const SaveCatogaryValidation = [
    body('name').trim().notEmpty().withMessage('Name is required').escape(),
    body('description').trim().escape(),
    body('createdBy').isInt({ min: 1 }).withMessage('CreatedBy must be an integer'),
    body('updatedBy').optional().isInt({ min: 1 }),
    body('isShown').isBoolean().withMessage('isShown must be boolean')
];

const SaveUserValidation = [

    body('fullname')
        .trim()
        .notEmpty().withMessage('Full Name is required')
        .isLength({ min: 3 }).withMessage('Full Name must be at least 3 characters long')
        .escape(),

    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email format')
        .normalizeEmail(),

    body('phone')
        .trim()
        .notEmpty().withMessage('Phone number is required')
        .isMobilePhone().withMessage('Invalid phone number'),

    body('password_hash')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
]

module.exports = {
    SaveCatogaryValidation,
    SaveUserValidation
}
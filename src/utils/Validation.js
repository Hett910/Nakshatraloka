const { body } = require('express-validator')

const SaveCatogaryValidation = [
    body('name').trim().notEmpty().withMessage('Name is required').escape(),
    body('description').trim().escape(),
    body('createdBy').isInt({ min: 1 }).withMessage('CreatedBy must be an integer'),
    body('updatedBy').optional().isInt({ min: 1 }),
    body('isShown').isBoolean().withMessage('isShown must be boolean')
];

module.exports = {
        SaveCatogaryValidation
}
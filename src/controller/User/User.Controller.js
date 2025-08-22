const { validationResult } = require("express-validator");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken')
const pool = require('../../utils/PostgraceSql.Connection');

const saveUser = async (req, res) => {
    try {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const {
            id = 0,
            fullname,
            email,
            phone,
            role = "customer",
            is_active = true,
        } = req.body;


        // Hash password only on insert or when updating with a new one
        let password_hash = req.body.password_hash;

        if (id === 0) {
            // New user -> hash required
            password_hash = await bcrypt.hash(password_hash, 10);
        } else if (password_hash && password_hash.trim() !== "") {
            // Update with new password
            password_hash = await bcrypt.hash(password_hash, 10);
        } else {
            // Update without password -> keep old one
            const oldPw = await pool.query(`SELECT password_hash FROM public."UserMaster" WHERE "ID" = $1`, [id]);
            password_hash = oldPw.rows[0].password_hash;
        }

        // console.log({ id, email, fullname, phone, role, is_active, password_hash })
        const result = await pool.query(
            `SELECT public.fn_save_user(
                $1::int, 
                $2::varchar, 
                $3::varchar, 
                $4::varchar, 
                $5::varchar, 
                $6::varchar, 
                $7::boolean
            ) AS message`,
            [id, fullname, email, phone, password_hash, role, is_active]
        );

        // console.log({ result })

        res.status(200).json({
            success: true,
            message: result.rows[0].message,
        });



    } catch (error) {
        console.error('Error saveing user:', error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error',
            error: error.message
        });
    }
}

const loginUser = async (req, res) => {
    try {

        const { email, password } = req.body;

        const result = await pool.query(
            `SELECT "ID", "fullname", "email", "role" ,"password_hash" FROM "UserMaster" WHERE email = $1 AND is_active = true`,
            [email]
        );

        const existingUser = result.rows[0];

        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: `User with email ${email} does not exist`,
            });
        }
        // Compare passwords
        const isMatch = await bcrypt.compare(password, existingUser.password_hash);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid password',
            });
        }

        const token = jwt.sign(
            { id: existingUser.ID, email: existingUser.email, role: existingUser.role },
            process.env.JWT_SECRET || "SECRET",
            { expiresIn: '2h' }
        );




        res.status(200).json({
            success: true,
            token,
            user: { fullname: existingUser.fullname, email }
        });


    } catch (error) {
        console.error('Error login user:', error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error',
            error: error.message
        });
    }
}

const UpdatePassword = async (req, res) => {
    try {
        const { OldPassword, NewPassword } = req.body;

        const email = req.user.email; // from auth middleware

        if (!OldPassword || !NewPassword) {
            return res.status(400).json({
                success: false,
                message: 'Email, old password, and new password are required'
            });
        }

        // console.log({email})

        if (NewPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 6 characters long'
            });
        }

        // Fetch user by email
        const result = await pool.query(
            `SELECT "ID", "password_hash" FROM "UserMaster" WHERE email = $1`,
            [email]
        );

        const user = result.rows[0];

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Compare old password
        const isMatch = await bcrypt.compare(OldPassword, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Old password is incorrect'
            });
        }

        const isSame = await bcrypt.compare(NewPassword, user.password_hash);
        if (isSame) {
            return res.status(400).json({ success: false, message: 'New password cannot be the same as old password' });
        }

        // Hash new password
        const newHashedPassword = await bcrypt.hash(NewPassword, 10);

        // console.log({newHashedPassword})

        // Update password in DB
        await pool.query(
            `UPDATE "UserMaster" SET password_hash = $1, updated_at = NOW() WHERE "ID" = $2`,
            [newHashedPassword, user.ID]
        );

        res.status(200).json({
            success: true,
            message: 'Password updated successfully'
        });

    } catch (error) {
        console.error('Error Updating user password:', error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error',
            error: error.message
        });
    }
};


const logout = async (req, res) => {
    try {
    } catch (error) {
        console.error('Error in logout user password:', error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error',
            error: error.message
        });
    }
}


module.exports = {
    User: {
        saveUser,
        loginUser,
        UpdatePassword
    }
}
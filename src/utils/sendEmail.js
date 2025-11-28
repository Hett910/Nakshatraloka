const nodemailer = require("nodemailer");
const path = require("path");

const sendEmail = async (to, subject, html) => {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS
        }
    });

    await transporter.sendMail({
        from: `"Nakshatraloka" <${process.env.MAIL_USER}>`,
        to,
        subject,
        html,
        attachments: [{
            filename: "logo.png",
            path: path.join(__dirname, "../public/logo.png"), // your logo path
            cid: "nakshatra-logo" // used inside <img src="cid:nakshatra-logo">
        }]
    });

    return true;
};

module.exports = sendEmail;

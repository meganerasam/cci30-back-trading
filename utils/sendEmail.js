const sendGridMail = require('@sendgrid/mail');

const sendEmail = (options) => {
    sendGridMail.setApiKey(process.env.SENDGRID_API_KEY);

    const mailOptions = {
        from: {
            from: "Crypto Bulot",
            email: 'support@crypto-bulot.com'
        },
        to: options.to,
        bcc: ["megane@crypto-bulot.com", "treesi@crypto-bulot.com"],
        // Send multiple emails
        // to: ['email1@gmail.com', 'email@gmail.com'],
        subject: options.subject,
        html: options.text
    }

    sendGridMail
        .send(mailOptions)
        .then((response) => console.log("Email form SendGrid sent ..."))
        .catch((error) => console.log("SendGrid " + error.message));
}

module.exports = sendEmail;
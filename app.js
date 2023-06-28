const express = require('express');
const nodemailer = require('nodemailer');
const session = require('express-session');
const dotenv = require('dotenv').config();
const bodyParser = require('body-parser');
const emailValidator = require('email-validator');
const mysql = require('mysql');
const mongoose = require('mongoose');

// const dbConfig = {
//     host: 'sql.freedb.tech', // Replace with your MySQL host
//     user: 'freedb_kumaresan', // Replace with your MySQL username
//     password: 'A&TB6ZtGdFHNfuS', // Replace with your MySQL password
//     database: 'freedb_user-db' // Replace with your MySQL database name
// };

// const connection = mysql.createConnection(dbConfig);
mongoose.connect(process.env.MONGODB, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log('Connected to MongoDB');
    })
    .catch((error) => {
        console.error('Error connecting to MongoDB:', error);
    });

const userSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
});

// Create a user model
const User = mongoose.model('User', userSchema);


const app = express();
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true
}));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'));
const otpData = {};

PORT = process.env.PORT || 3001

app.get('/email-verify', (req, res) => {
    res.sendFile(__dirname + '/public/email.html');
});

app.post('/email-verify', (req, res) => {
    const { email } = req.body;

    // Validate email format
    if (!email || !emailValidator.validate(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }

    // Generate OTP
    const otp = generateOTP();

    req.session.email = email;
    req.session.otp = otp;
    // Send email with OTP
    sendEmail(email, otp)
        .then(() => {
            // Redirect to OTP Verification page
            res.redirect('/otp-verify');
        })
        .catch((error) => {
            console.error('Failed to send email:', error);
            res.status(500).json({ error: 'Failed to send email' });
        });
});

app.get('/otp-verify', (req, res) => {
    res.sendFile(__dirname + '/public/otp-verify.html');
});

app.post('/otp-verify', (req, res) => {
    const { otp1, otp2, otp3, otp4 } = req.body;
    const enteredOTP = otp1 + otp2 + otp3 + otp4;

    console.log(enteredOTP);
    console.log(req.session.otp);

    // Verify the entered OTP with the stored OTP
    if (enteredOTP !== req.session.otp) {
        return res.status(400).json({ error: 'Invalid OTP' });
    }

    // Redirect to sign-up page
    res.redirect('/signup');
});

app.get('/signup', (req, res) => {
    res.sendFile(__dirname + '/public/signup.html');
});

// Sign-up Route
app.post('/signup', (req, res) => {
    const { fullName, username, password, confirmPassword } = req.body;

    // Check if the password and confirm password are equal
    if (password !== confirmPassword) {
        console.log('Password and confirm password do not match');
        res.redirect('/signup'); // Redirect back to the signup page or show an error message
        return;
    }

    // Check if the username already exists in the database
    User.findOne({ username })
        .then((existingUser) => {
            if (existingUser) {
                console.log('Username already exists');
                res.redirect('/signup'); // Redirect back to the signup page or show an error message
            } else {
                // Create a new user
                const newUser = new User({ fullName, username, password });

                // Save the user to the database
                newUser.save()
                    .then((user) => {
                        console.log('User created:', user);
                        res.redirect('/home'); // Redirect to the home page
                    })
                    .catch((error) => {
                        console.error('Error creating user:', error);
                        res.redirect('/signup');
                    });
            }
        })
        .catch((error) => {
            console.error('Error checking existing user:', error);
            res.redirect('/signup');
        });
});

app.get('/login', (req, res) => {
    // Assuming you have a login.html file in your project directory
    res.sendFile(__dirname + '/public/login.html');
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Find the user in the database by the username
    User.findOne({ username })
        .then((user) => {
            if (!user) {
                console.log('User not found');
                res.redirect('/login'); // Redirect back to the login page or show an error message
                return;
            }

            // Check if the password is correct
            if (user.password !== password) {
                console.log('Incorrect password');
                res.redirect('/login'); // Redirect back to the login page or show an error message
                return;
            }

            // User authenticated, redirect to the home page
            console.log('User logged in:', user);
            res.redirect('/home');
        })
        .catch((error) => {
            console.error('Error during login:', error);
            res.redirect('/login');
        });
});



// Home Route
app.get('/home', (req, res) => {
    // You can perform any necessary authentication or authorization checks here before rendering the home page

    // Assuming you have a home.html file in your project directory
    res.sendFile(__dirname + '/public/home.html');
});






app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`)
})

function generateOTP() {
    // Generate a random 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    return otp;
}
async function sendEmail(to, otp) {
    // Create a Nodemailer transporter
    const transporter = nodemailer.createTransport({
        // Replace with your email service configuration
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_ADDRESS,
            pass: process.env.GMAIL_PASSWORD,
        },
    });

    // Send email with OTP
    await transporter.sendMail({
        from: process.env.GMAIL_ADDRESS,
        to,
        subject: 'Email Verification OTP',
        text: `Your OTP for email verification is: ${otp}`,
    });
}
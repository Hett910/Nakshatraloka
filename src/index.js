const dotenv = require('dotenv');
dotenv.config();

const app = require('./app.js');

const PORT = process.env.PORT || 8001;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
})

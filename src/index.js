const dotenv = require('dotenv');
dotenv.config();
const app = require('./app.js');
require('./utils/PostgraceSql.Connection.js')
const PORT = process.env.PORT;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
})

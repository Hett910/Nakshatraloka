const dotenv = require('dotenv');
dotenv.config();
const app = require('./app.js');
require('./utils/PostgraceSql.Connection.js')
const PORT = process.env.PORT || 8001;

app.listen(8001, () => {
    console.log(`Server running on http://localhost:${8001}`)
})

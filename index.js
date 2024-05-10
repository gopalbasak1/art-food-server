const express = require('express');
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;

const app = express();


const corsOptions = {
    origin: [
      'http://localhost:5173', 
    'http://localhost:5174'],
    credentials: true,
    optionSuccessStatus: 200,
}


//middleware
app.use(cors(corsOptions));
app.use(express.json());


app.get('/', (req, res) =>{
    res.send('Hello from Art Food Server...')
})

app.listen(port, ()=>console.log(`Server running on port ${port}`))
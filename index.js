const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;

// use middle ware
app.use(cors());
app.use(express.json());

// server running connection
app.get('/',(req,res)=>{
    res.send("Language school server is running");
})

app.listen(port,()=>{
    console.log(`Language school running on ${port}`);
})
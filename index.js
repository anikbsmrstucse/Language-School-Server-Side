const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;
const stripe = require("stripe")(process.env.Server_payment_key);

// use middle ware
app.use(cors());
app.use(express.json());


// mongodb username and password
const username = process.env.DB_USER;
const password = process.env.DB_PASS;
const userToken = process.env.ACCESS_TOKEN;

const verifyJWT = (req,res,next)=>{
  const authorization = req.headers.authorization;
  if(!authorization){
      return res.status(401).send({error:true , message:'unauthorization access'});
  }
  const token = authorization.split(' ')[1];
  jwt.verify(token,userToken,(err,decoded)=>{
    if(err){
      return res.status(401).send({error:true , message:'unauthorization access'});
    }
    req.decoded = decoded;
    next();
  })
}

// mongodb connection

const uri = `mongodb+srv://${username}:${password}@cluster0.6euurqe.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const userCollection = client.db('langSCHOOL').collection('users');
    const instructorsCollection = client.db('langSCHOOL').collection('instructors');
    const classesCollection = client.db('langSCHOOL').collection('courses');
    const cartsCollection = client.db('langSCHOOL').collection('carts');
    

    //jwt token
    app.post('/jwt',(req,res)=>{
      const user = req.body;
      const token = jwt.sign(user,userToken,{
        expiresIn: '1h',
      });
      res.send({token});
    })

    // users api

    app.get('/users',verifyJWT,async(req,res)=>{
      const email = req.decoded.email;
      const query = {email:email};
      const user = await userCollection.findOne(query);
      if(user?.role !== 'admin'){
        return res.status(403).send({error: true, message:'unauthorize access'});
      }
      const result = await userCollection.find().toArray();
      res.send(result);
    })

    app.get('/users/student/:email',verifyJWT,async(req,res)=>{
      const email = req.params.email;
      const decodedEmail = req.decoded.email;
      if(email !== decodedEmail){
        return res.status(403).send({error:true , message:'forbidden access'})
      }
      const query = {email : email};
      const user = await userCollection.findOne(query);
      const result = {student: user?.role === 'student'};
      res.send(result);
     })

    app.get('/users/admin/:email',verifyJWT,async(req,res)=>{
      const email = req.params.email;
      const decodedEmail = req.decoded.email;
      if(email !== decodedEmail){
        return res.status(403).send({error:true,message:'forbidden access'})
      }
      const query = {email:email};
      const user = await userCollection.findOne(query);
      const result = {admin: user?.role === 'admin'};
      res.send(result);
    })

    app.get('/users/teacher/:email',verifyJWT,async(req,res)=>{
      const email = req.params.email;
      const decodedEmail = req.decoded.email;
      if(email !== decodedEmail){
        return res.status(403).send({error:true,message:'forbidden access'})
      }
      const query = {email:email};
      const user = await userCollection.findOne(query);
      const result = {teacher: user?.role === true};
      res.send(result);
    })

   

    app.post('/users',async(req,res)=>{
      const user = req.body;
      const query = {email: user?.email};
      const existingUser = await userCollection.findOne(query);
      if(existingUser){
        return res.send({message:'user is exist'})
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    })

    app.patch('/users/admin/:id',async(req,res)=>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)}
      const updateDoc = {
        $set:{
          role: 'admin',
        }
      }
      const result = await userCollection.updateOne(filter,updateDoc);
      res.send(result);
    })

    app.patch('/users/teacher/:id',async(req,res)=>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const updateDoc = {
        $set:{
          role: true,
        }
      }
      const result = await userCollection.updateOne(filter,updateDoc);
      res.send(result);
    })

    app.delete('/user/:id',async(req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await userCollection.deleteOne(query);
      res.send(result);
    })

    // instructors api
    app.get('/instructors',async(req,res)=>{
      const result = await instructorsCollection.find().toArray();
      res.send(result);
    })
    
    // all classes
    app.get('/classes',async(req,res)=>{
        const result = await classesCollection.find().toArray();
        res.send(result);
    })

    app.get('/classes/:email',verifyJWT,async(req,res)=>{
      const email = req.params.email;
      const query = {email : email}
      const user = await userCollection.findOne(query);
      if(user.role !== true){
        res.status(401).send({error:true , message:'unauthorize access'});
      }
      const result = await classesCollection.find(query).toArray();
      res.send(result);
    })

    app.post('/classes',verifyJWT,async(req,res)=>{
      const decodedEmail = req.decoded.email;
      const query = {email:decodedEmail};
      const user = await userCollection.findOne(query);
      if(user?.role !== true){
        return res.status(401).send({error:true,message:'unauthorize access'});
      }
      const newClass = req.body;
      const result = await classesCollection.insertOne(newClass);
      res.send(result);
    })

    app.patch('/classes/:id',async(req,res)=>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const updateDoc = {
        $set:{
          status: 'approved',
        }
      }
      const result = await classesCollection.updateOne(filter,updateDoc);
      res.send(result);
    })
    app.patch('/classes/deny/:id',async(req,res)=>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const updateDoc = {
        $set:{
          status: 'denied',
        }
      }
      const result = await classesCollection.updateOne(filter,updateDoc);
      res.send(result);
    })

    app.put('/classes/feedback/:id',async(req,res)=>{
      const feedback = req.body;
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const options = { upsert: true};
      const updateDoc = {
        $set:{
          feedback: feedback,
        }
      }
      const result = await classesCollection.updateOne(filter,updateDoc,options);
      res.send(result);
    })

    // select class

    app.get('/carts',verifyJWT,async(req,res)=>{
      const email = req.query.email;
      const decodedEmail = req.decoded.email;
      if(email !== decodedEmail){
        return res.status(403).send({error:true,message:'forbidden access'})
      }
      const query = {email : email}
      const result = await cartsCollection.find(query).toArray()
      res.send(result);
    })

    app.post('/carts',async(req,res)=>{
      const selectCourse = req.body;
      const result = await cartsCollection.insertOne(selectCourse);
      res.send(result);
    })

    app.delete('/carts/:id',async(req,res)=>{
      const id = req.params.id;
      const query = ({_id: new ObjectId(id)})
      const result = await cartsCollection.deleteOne(query);
      res.send(result);
    })

    // payment
    app.post('/create-payment-intent',async(req,res)=>{
      const {price} = req.body;
      const amount = price*100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['cards']
      })
      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })




    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);


// server running connection
app.get('/',(req,res)=>{
    res.send("Language school server is running");
})

app.listen(port,()=>{
    console.log(`Language school running on ${port}`);
})
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
app.use(cookieParser());


//verify jwt middleware
const verifyToken = (req, res, next)=>{
  const token = req.cookies?.token;
  console.log(30,req.cookies);
  if(!token) return res.status(401).send({message: 'unauthorized access'})

  if(token){
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded)=>{
      if(err){
        console.log(err);
        return res.status(401).send({message: 'unauthorized access'})
      }
      console.log(decoded);
      req.user = decoded
      next()
    })
  }

}



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qhiqbma.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;


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

    const productsCollection = client.db('artFood').collection('products');
    const purchaseCollection = client.db('artFood').collection('purchase');
    const reviewCollection = client.db('artFood').collection('review');
    const registersCollection = client.db('artFood').collection('register');


    //jwt generate
    app.post('/jwt', async(req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1hr'
      })
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV==='production',
        sameSite: process.env.NODE_ENV==='production'?'none':'strict',
      }).send({success: true})
    })

    //Clear token on logout
    app.get('/logout', (req, res)=>{
      res.clearCookie('token',{
        httpOnly: true,
        secure: process.env.NODE_ENV==='production',
        sameSite: process.env.NODE_ENV==='production'?'none':'strict',
        maxAge:0,
      }).send({success: true});
    })

    //Get all products data from db
    app.get('/products', async(req, res)=>{
        const result = await productsCollection.find().toArray();
        res.send(result);
    })


    //Get a single product data from db using product id
    app.get('/product/:id', async(req, res)=>{
        const id = req.params.id;
        const query = {_id: new ObjectId(id)};
        const result = await productsCollection.findOne(query);
        res.send(result);
    })

    //get all products posted by a specific user
    app.get('/products/:email', verifyToken, async(req, res) =>{

      const tokenEmail = req.user.email;
      const email = req.params.email;

        if(tokenEmail !== email){
        return res.status(403).send({message: 'forbidden access'})
        }

      const query = {"buyer.email": email}
      const result = await productsCollection.find(query).toArray();
      res.send(result);

    })

    //Save a product in db
    app.post('/product', async(req, res)=>{
      const productData = req.body;
      const result = await productsCollection.insertOne(productData);
      res.send(result);
    })


    //Update a product in db
    app.put('/product/:id', verifyToken, async(req, res) => {
      const id = req.params.id;
      const productData = req.body;
      const query = {_id: new ObjectId(id)}
      const options = {upsert: true};
      const updateDoc = {
        $set:{
          ...productData,
        }
      }
      const result = await productsCollection.updateOne(query, updateDoc, options);
      res.send(result);
    });

     //delete a job data from db
     app.delete('/product/:id',  async(req, res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await productsCollection.deleteOne(query);
      res.send(result);
    })


    // Save a purchase data in db
    app.post('/purchase', verifyToken, async (req, res) => {
      const purchaseData = req.body;
      try {
        // Insert purchase data into purchaseCollection
        const purchaseResult = await purchaseCollection.insertOne(purchaseData);
        // Get the purchaseQuantity from the purchase data
        const purchaseQuantity = purchaseData.purchaseQuantity;
        // Get the productId from the purchase data
        const productId = purchaseData.productId;
        // Find the product in productsCollection by productId
        const productQuery = { _id: new ObjectId(productId) };
        const product = await productsCollection.findOne(productQuery);
        // Check if product exists
        if (product) {
          // Subtract the purchaseQuantity from the current foodQuantity
          const newQuantity = product.quantity - purchaseQuantity;
          // Update the product's foodQuantity in productsCollection
          const updateProductResult = await productsCollection.updateOne(productQuery, { $set: { quantity: newQuantity } });
          // Increment the purchase count
          await productsCollection.updateOne(productQuery, { $inc: { count: 1 } });
          // Return the result of the purchase insertion
          res.json({ purchase: purchaseResult, productUpdate: updateProductResult });
        } else {
          res.status(404).json({ error: 'Product not found' });
        }
      } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: 'Failed to complete purchase. Please try again later.' });
      }
    });
    
    // Redirect to login page if user is not logged in
    // app.get('/food-purchase', authenticateUser, (req, res) => {
    //   // Render the food purchase page
    //   res.render('food-purchase');
    // });

    //get all bids for a user by email from db
    app.get('/my-purchase/:email', verifyToken, async(req, res) =>{
      const email = req.params.email;
      const query = {email};
      const result = await purchaseCollection.find(query).toArray();
      res.send(result)
    });

    app.delete('/purchaseDelete/:id', async(req, res) =>{
      const id = req.params.id;
      try {
        // Find the purchase data by id
        const purchaseQuery = {_id: new ObjectId(id)};
        const purchase = await purchaseCollection.findOne(purchaseQuery);
        if (!purchase) {
          return res.status(404).json({error: 'Purchase not found'});
        }
    
        // Update the product's quantity in productsCollection
        const productId = purchase.productId;
        const productQuery = {_id: new ObjectId(productId)};
        const product = await productsCollection.findOne(productQuery);
        if (!product) {
          return res.status(404).json({error: 'Product not found'});
        }
    
        const newQuantity = product.quantity + purchase.purchaseQuantity;
        const updateProductResult = await productsCollection.updateOne(productQuery, {$set: {quantity: newQuantity}});
    
        // Delete the purchase from purchaseCollection
        const result = await purchaseCollection.deleteOne(purchaseQuery);
    
        res.json({purchaseDelete: result, productUpdate: updateProductResult});
      } catch (error) {
        console.error("Error:", error);
        res.status(500).json({error: 'Failed to delete purchase. Please try again later.'});
      }
    })


    app.get('/top-foods', async (req, res) => {
      try {
          // Find the top-selling food items based on purchase count
          const topFoods = await productsCollection.find().sort({ count: -1 }).limit(6).toArray();
          res.json(topFoods);
      } catch (error) {
          console.error("Error:", error);
          res.status(500).json({ error: 'Failed to retrieve top-selling food items. Please try again later.' });
      }
  });


    // Search products by food name
app.get('/search', async (req, res) => {
  try {
      const { foodName } = req.query;
      const query = { foodName: { $regex: new RegExp(foodName, 'i') } };
      const searchResults = await productsCollection.find(query).toArray();
      res.json(searchResults);
  } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: 'Failed to perform search. Please try again later.' });
  }
});

    // Save a review in db
app.post('/reviews', async (req, res) => {
  try {
      const reviewData = req.body;
      const result = await reviewCollection.insertOne(reviewData);
      res.send(result);
  } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: 'Failed to save review. Please try again later.' });
  }
});

// Get all reviews from db
app.get('/reviews', async (req, res) => {
  try {
      const result = await reviewCollection.find().toArray();
      res.send(result);
  } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: 'Failed to retrieve reviews. Please try again later.' });
  }
});

    // Save a registers in db
app.post('/registers', async (req, res) => {
  try {
      const reviewData = req.body;
      const result = await registersCollection.insertOne(reviewData);
      res.send(result);
  } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: 'Failed to save review. Please try again later.' });
  }
});

// Get all registers from db
app.get('/registers', async (req, res) => {
  try {
      const result = await registersCollection.find().toArray();
      res.send(result);
  } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: 'Failed to retrieve reviews. Please try again later.' });
  }
});


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error

  }
}
run().catch(console.dir);



app.get('/', (req, res) =>{
    res.send('Hello from Art Food Server...')
})

app.listen(port, ()=>console.log(`Server running on port ${port}`))
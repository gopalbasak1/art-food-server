const express = require('express');
const cors = require('cors');
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
    const purchaseCollection = client.db('artFood').collection('purchase')




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
    app.get('/products/:email', async(req, res) =>{
      const email = req.params.email;
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
    app.put('/product/:id', async(req, res) => {
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
    })


     //Save a bid data in db
    // Save a purchase data in db
app.post('/purchase', async(req, res) =>{
  const purchaseData = req.body;
  try {
    // Insert purchase data into purchaseCollection
    const purchaseResult = await purchaseCollection.insertOne(purchaseData);
    // Get the purchaseQuantity from the purchase data
    const purchaseQuantity = purchaseData.purchaseQuantity;
    // Get the productId from the purchase data
    const productId = purchaseData.productId;
    // Find the product in productsCollection by productId
    const productQuery = {_id: new ObjectId(productId)};
    const product = await productsCollection.findOne(productQuery);
    // Check if product exists
    if (product) {
      // Subtract the purchaseQuantity from the current foodQuantity
      const newQuantity = product.quantity - purchaseQuantity;
      // Update the product's foodQuantity in productsCollection
      const updateProductResult = await productsCollection.updateOne(productQuery, {$set: {quantity: newQuantity}});
      // Return the result of the purchase insertion
      res.json({purchase: purchaseResult, productUpdate: updateProductResult});
    } else {
      res.status(404).json({error: 'Product not found'});
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({error: 'Failed to complete purchase. Please try again later.'});
  }
});


    //get all bids for a user by email from db
    app.get('/my-purchase/:email', async(req, res) =>{
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
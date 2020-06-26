if (process.env.NODE_ENV !== 'production') {
  require('dotenv').load()
}
const PORT = process.env.PORT || 3000

const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const stripePublicKey = process.env.STRIPE_PUBLIC_KEY

const express = require('express')
const app = express()

//reading JSON
const fs = require('fs')
//MongoDB for inventory management
var mongoClient = require('mongodb').MongoClient
//fill out url
var url = "mongodb+srv://{username}:{password}@another-day-cluster-lhylq.mongodb.net/another-day-cluster?retryWrites=true&w=majority"
url = url.replace("{username}", process.env.MONGO_USERNAME)
url = url.replace("{password}", process.env.MONGO_PASSWORD)
//Stripe charging API
const stripe = require('stripe')(stripeSecretKey)
const { GoogleSpreadsheet } = require('google-spreadsheet');
// set up google spreadsheet credentials
const doc = new GoogleSpreadsheet('1doVU69EV3zOfJdCvR5eRMUdWW_xfBCvUjr72wdMrfR0');
var accountInfo = {
  "client_email": process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  "private_key": process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
}
// use service account creds
doc.useServiceAccountAuth(accountInfo);

app.set('view engine', 'ejs')
app.use(express.json())
app.use(express.static('public'))

async function send_order(dateTime,order_info,customer_info){
  await doc.loadInfo()
  const sheet = doc.sheetsByIndex[0];
  sheet.addRow({
    date: dateTime,
    name:customer_info.fname + " " + customer_info.lname,
    email:customer_info.email,
    product:order_info.product,
    color:order_info.color,
    size:order_info.size,
    address:customer_info.address,
    city:customer_info.city,
    state:customer_info.state,
    zip:customer_info.zip
  })
}

//send item info over to product page
app.get('/get_info', function(req,res) {
  //load in how much is left of each item from the Mongo DB
  mongoClient.connect(url, function(err,db){
    if (err) throw err
    var dbo = db.db("another-day-cluster")
    dbo.collection("quantities").find({}).toArray(function(err, result) {
      if (err) throw err;
      //load item data
      fs.readFile('items.json', function(error, data) {
        if (error) {
          res.status(500).end()
        } else {
          //send item and quantity data to product page
          res.send({
            items:JSON.parse(data),
            quantity:result
          })
        }
      })
      db.close();
    });
  })

  

})


app.get('/confirm', function(req, res) {
  fs.readFile('items.json', function(error, data) {
    if (error) {
      res.status(500).end()
    } else {
      res.render('confirm.ejs', {
        stripePublicKey: stripePublicKey,
        items: JSON.parse(data)
      })
    }
  })
})

app.post('/purchase', function(req, res) {
  fs.readFile('items.json', function(error, data) {
    if (error) {
      console.log("error reading JSON")
      res.status(500).end()
    } else {
      console.log("able to read JSON")
      
      const itemsJson = JSON.parse(data)
      const itemsArray = itemsJson.clothing
      let total = 0
      itemId = req.body.items
      console.log(itemId)
      const itemJson = itemsArray.find(function(i) {
        return i.id == itemId
      })
      //calculate shipping
      let shipping = 0
      let zip_code = req.body.zip

      if(zip_code>10000 && zip_code<40000){
        shipping = itemJson.shipping[0]
      }else if(zip_code > 40000 && zip_code<80000){
          shipping =itemJson.shipping[1]
      }else if(zip_code > 80000 && zip_code<100000){
          shipping =itemJson.shipping[2]
      }
      
      total = itemJson.price + shipping
      console.log(total)
      console.log(req.body.stripeTokenId)
      
      stripe.charges.create({
        amount: total,
        source: req.body.stripeTokenId,
        currency: 'usd'
      }).then(function() {
        console.log('Charge Successful')
        res.json({ message: 'Successfully purchased items' })
      }).catch(function(error) {
        console.log('Charge Fail')
        console.log(error)
        res.status(500).end()
      })
      
    }
  })

})


app.post('/send_order', function(req, res) {
  const dateTime = new Date()
  const itemInfo = req.body.item_information
  const customerInfo = req.body.customer_information
  //turn serialized JSON into usable data
  for (var i = 0; i < customerInfo.length; i++){
    customerInfo[customerInfo[i]['name']] = customerInfo[i]['value'];
  }
  console.log(customerInfo)
  console.log(itemInfo)
  send_order(dateTime,itemInfo,customerInfo)
})


app.listen(PORT)
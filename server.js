var stripeSecretKey;
var stripePublicKey;

if (process.env.NODE_ENV !== "production") {
  require("dotenv").load();
  //set development keys
  stripeSecretKey = process.env.DEV_STRIPE_SECRET_KEY;
  stripePublicKey = process.env.DEV_STRIPE_PUBLIC_KEY;
} else {
  //set production keys
  stripeSecretKey = process.env.PROD_STRIPE_SECRET_KEY;
  stripePublicKey = process.env.PROD_STRIPE_PUBLIC_KEY;
}

const PORT = process.env.PORT || 3000;

const express = require("express");
const app = express();

var compression = require("compression");
//reading JSON
const fs = require("fs");
//MongoDB for inventory management
var mongoClient = require("mongodb").MongoClient;
//fill out url
var url =
  "mongodb+srv://{username}:{password}@another-day-cluster-lhylq.mongodb.net/quantities?retryWrites=true&w=majority";
url = url.replace("{username}", process.env.MONGO_USERNAME);
url = url.replace("{password}", process.env.MONGO_PASSWORD);

//Stripe charging API
const stripe = require("stripe")(stripeSecretKey);
const { GoogleSpreadsheet } = require("google-spreadsheet");
// set up google spreadsheet credentials
const doc = new GoogleSpreadsheet(
  "1doVU69EV3zOfJdCvR5eRMUdWW_xfBCvUjr72wdMrfR0"
);
var accountInfo = {
  client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
};
// use service account creds
doc.useServiceAccountAuth(accountInfo);

app.set("view engine", "ejs");
app.use(compression()); //use compression
app.use(express.json());
app.use(express.static("public"));

async function send_email(email, date) {
  //append customer email to email sheet to be contacted
  await doc.loadInfo();
  const sheet = doc.sheetsByIndex[1];
  sheet.addRow({
    date: date,
    email: email,
  });
}

function update_quantities(itemId) {
  //connect to Mongo database
  mongoClient.connect(url, { useUnifiedTopology: true }).then((client) => {
    var dbo = client.db("another-day-cluster");
    var query = { id: itemId };
    //find right query
    dbo
      .collection("quantities")
      .find(query)
      .toArray(function (err, result) {
        if (err) throw err;
        var new_quantity = { $set: { quantity: result[0].quantity - 1 } };
        //update item quantity
        dbo
          .collection("quantities")
          .updateOne(query, new_quantity, function (err, res) {
            if (err) throw err;
            client.close();
          });
      });
  });
}

async function send_order(dateTime, order_info, customer_info) {
  //append customer info to google spreadsheet
  await doc.loadInfo();
  const sheet = doc.sheetsByIndex[0];
  var sub_email
  if(customer_info.sub_email){
    sub_email = 1
  } else{
    sub_email = 0
  }
  sheet.addRow({
    date: dateTime,
    name: customer_info.fname + " " + customer_info.lname,
    email: customer_info.email,
    product: order_info.product,
    color: order_info.color,
    size: order_info.size,
    address: customer_info.address,
    city: customer_info.city,
    state: customer_info.state,
    zip: customer_info.zip,
    sub_email:sub_email
  });
}
function calculate_shipping(zip_code, itemJson){
  var shipping;
  if (zip_code > 10000 && zip_code < 40000) {
    //if zip is Charlottesville or Albemarle
    if(zip_code > 22900 && zip_code < 22940){
      shipping = 0
    } else{
      shipping = itemJson.shipping[0];
    }
  } else if (zip_code > 40000 && zip_code < 80000) {
    shipping = itemJson.shipping[1];
  } else if (zip_code > 80000 && zip_code < 100000) {
    shipping = itemJson.shipping[2];
  }

  return shipping;
}



//send item info over to product page
app.get("/get_info", function (req, res) {
  //load in how much is left of each item from the Mongo DB
  mongoClient.connect(url, { useUnifiedTopology: true }).then((client) => {
    var dbo = client.db("another-day-cluster");
    dbo
      .collection("quantities")
      .find({})
      .toArray(function (err, result) {
        if (err) throw err;
        //load item data
        fs.readFile("items.json", function (error, data) {
          if (error) {
            res.status(500).end();
          } else {
            //send item and quantity data to product page
            res.send({
              items: JSON.parse(data),
              quantity: result,
            });
          }
        });
        client.close();
      });
  });
});

app.post("/send_email", function (req, res) {
  const dateTime = new Date();
  send_email(req.body.email, dateTime);
});

app.get("/confirm", function (req, res) {
  fs.readFile("items.json", function (error, data) {
    if (error) {
      res.status(500).end();
    } else {
      res.render("confirm.ejs", {
        stripePublicKey: stripePublicKey,
        items: JSON.parse(data),
      });
    }
  });
});

app.post("/purchase", function (req, res) {
  fs.readFile("items.json", function (error, data) {
    if (error) {
      res.status(500).end();
    } else {
      const itemsJson = JSON.parse(data);
      const itemsArray = itemsJson.clothing;
      let total = 0;
      itemId = req.body.items;
      const itemJson = itemsArray.find(function (i) {
        return i.id == itemId;
      });
      //calculate shipping
      let shipping = 0;
      let zip_code = req.body.zip;
      shipping = calculate_shipping(zip_code,itemJson)
      total = itemJson.price +shipping
      stripe.charges
        .create({
          amount: total,
          source: req.body.stripeTokenId,
          currency: "usd",
          receipt_email:req.body.email,
          description:itemJson.name
        })
        .then(function () {
          res.json({ message: "Successfully purchased items" });
        })
        .catch(function (error) {
          console.log("Charge Fail");
          console.log(error);
          res.status(500).end();
        });
    }
  });
});

app.post("/send_order", function (req, res) {
  const dateTime = new Date();
  const itemInfo = req.body.item_information;
  const customerInfo = req.body.customer_information;
  //turn serialized JSON into usable data
  for (var i = 0; i < customerInfo.length; i++) {
    customerInfo[customerInfo[i]["name"]] = customerInfo[i]["value"];
  }
  send_order(dateTime, itemInfo, customerInfo);
  update_quantities(itemInfo.id + "_" + itemInfo.color);
});

app.listen(PORT);

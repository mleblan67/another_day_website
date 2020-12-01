//info for the item
var item = {};
var itemQuantity = {};

async function load_data(itemId, itemColor) {
  await fetch("/get_info")
    .then((response) => response.json())
    .then(function (data) {
      //set up webpage
      //load parts of data
      const itemInfo = data.items;
      itemQuantity = data.quantity;
      //find right part of items data
      const itemJson = itemInfo.clothing.find(function (i) {
        return i.id == itemId;
      });
      //fill out item info
      item.product = itemJson.name;
      item.product_img = itemJson.img;
      item.color = itemColor;
      item.id = itemJson.id;
      item.price = itemJson.price;
      item.shipping = itemJson.shipping;
      //make sure size is still registered when going back to product page
      if (localStorage["itemInfo"]) {
        item.size = localStorage["itemInfo"].split(",")[2];
      }
      //set up webpage info based on item ID
      //Text info
      document.getElementById("title").innerHTML = itemJson.name;
      document.getElementById("price").innerHTML =
        "$" + itemJson.price / 100 + ".00 USD";
      document.getElementById("description").innerHTML = itemJson.description;
      for (let i = 0; i < itemJson.colors.length; i++) {
        var color_selector = document.getElementById("color_select");
        var option = document.createElement("option");
        option.text = itemJson.colors[i].replace("_", " ");
        option.value = itemJson.colors[i];
        color_selector.add(option);
      }
      document.getElementById("color_select").value = itemColor;
      //pictures
      document.getElementById("product_image").src =
        "cloth_pics/" + itemJson.img + "/" + itemColor + "_front.jpg";
      document.getElementsByClassName("tab_image")[0].src =
        "cloth_pics/" + itemJson.img + "/" + itemColor + "_front.jpg";
      document.getElementsByClassName("tab_image")[1].src =
        "cloth_pics/" + itemJson.img + "/" + itemColor + "_back.jpg";
      //sizes
      if (!itemJson.sizes) {
        document.getElementById("size_selector").innerHTML =
          "<h2>One size only</h2>";
        item.size = "One size";
      }
      //find right part of quantity data
      const quantityJson = itemQuantity.find(function (i) {
        return i.id == itemId + "_" + itemColor;
      });
      item.quantity = quantityJson.quantity;
      const product_inventory = document.getElementById("product_inventory");
      product_inventory.innerHTML = "Quantity: " + item.quantity;
      //If item is sold out
      select_color(document.getElementById("color_select"));
    });
}

function select_size(element) {
  item.size = element.value;
}

//change color of product
function select_color(element) {
  if (element.value != undefined) {
    //update color
    item.color = element.value;
    //update quantity
    const quantityJson = itemQuantity.find(function (i) {
      return i.id == item.id + "_" + item.color;
    });
    item.quantity = quantityJson.quantity;
    //update order button
    if (item.quantity <= 0) {
      let order_button = document.getElementById("order_button");
      //make order button not clickeable
      order_button.disabled = "disabled";
      //show out of stock div
      document.getElementById("out").style.display = "block";
    } else {
      let order_button = document.getElementById("order_button");
      //make order button clickeable
      order_button.disabled = false;
      //hide out of stock div
      document.getElementById("out").style.display = "none";
    }
  }
  document.getElementById("product_image").src =
    "cloth_pics/" + item.product_img + "/" + item.color + "_front.jpg";
  document.getElementsByClassName("tab_image")[0].src =
    "cloth_pics/" + item.product_img + "/" + item.color + "_front.jpg";
  document.getElementsByClassName("tab_image")[1].src =
    "cloth_pics/" + item.product_img + "/" + item.color + "_back.jpg";
  document.getElementById("product_inventory").innerHTML =
    "Remaining: " + item.quantity;
}

//view tab gallery image
function change_product_image(img) {
  var main_image = document.getElementById("product_image");
  main_image.src = img.src;
}

window.onload = function () {
  //load all data from items.json into webpage
  load_data(localStorage["itemId"], localStorage["itemColor"]);

  //If item is out of stock
  document.getElementById("out_button").onclick = async function () {
    //get email
    let email_input = document.getElementById("out_email");
    if (email_input.value) {
      email_input.style.border = "3px solid #3c8ccc";
      //send email to googlesheet
      await fetch("/send_email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: email_input.value,
        }),
      });
      //clear text input
      email_input.value = "";
    } else {
      email_input.style.border = "3px solid red";
    }
  };

  //assign an onclick function to every size button
  var btns = document.getElementsByName("size_btn");
  for (var i = 0, len = btns.length; i < len; i++) {
    btns[i].onclick = function () {
      select_size(this);
    };
  }
  //assign an onclick function to order button to store item info in Local storage
  document.getElementById("order_button").onclick = function () {
    if (item.size == null) {
      document.getElementById("size_validator").innerText =
        "*Please choose a size";
    } else {
      document.getElementById("size_validator").innerText = "";
      var product = [
        item.id,
        item.color,
        item.size,
        item.price,
        item.product,
        item.shipping,
      ];
      localStorage.setItem("itemInfo", product);
      //go to order form
      window.location.href = "/confirm";
    }
  };
};

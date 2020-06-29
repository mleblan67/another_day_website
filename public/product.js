//info for the item
var item = {};
var itemQuantity = {};

async function load_data(itemId, itemColor) {
  await fetch("/get_info")
    .then((response) => response.json())
    .then(function (data) {
      console.log(data);
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
      console.log(itemJson.colors.length);
      for (let i = 0; i < itemJson.colors.length; i++) {
        console.log("adding option");
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
      console.log(itemId + "_" + itemColor);
      //find right part of quantity data
      const quantityJson = itemQuantity.find(function (i) {
        return i.id == itemId + "_" + itemColor;
      });
      console.log("quant"+quantityJson.quantity)
      const product_quantity = document.getElementById("product_quantity");
      product_quantity.innerHTML = "Quantity: " + quantityJson.quantity;
      //If item is sold out
      select_color(document.getElementById('color_selector_menu'))
    });
}

function select_size(element) {
  item.size = element.value;
  console.log(item.size);
}

//change color of product
function select_color(element) {
  var quantityJson;
  if (element.value != undefined) {
    //update color
    item.color = element.value;
    console.log(item.color);
    //update quantity
    quantityJson = itemQuantity.find(function (i) {
      return i.id == item.id + "_" + item.color;
    });
    //update order button
    if(quantityJson.quantity <= 0){
      let order_button = document.getElementById('order_button')
      //make order button not clickeable
      order_button.disabled = "disabled";
    } else {
      let order_button = document.getElementById('order_button')
      //make order button not clickeable
      order_button.disabled = false;
    }
  }
  document.getElementById("product_image").src =
    "cloth_pics/" + item.product_img + "/" + item.color + "_front.jpg";
  document.getElementsByClassName("tab_image")[0].src =
    "cloth_pics/" + item.product_img + "/" + item.color + "_front.jpg";
  document.getElementsByClassName("tab_image")[1].src =
    "cloth_pics/" + item.product_img + "/" + item.color + "_back.jpg";
  document.getElementById("product_quantity").innerHTML =
    "Quantity: " + quantityJson.quantity;
}

//view tab gallery image
function change_product_image(img) {
  var main_image = document.getElementById("product_image");
  main_image.src = img.src;
}

window.onload = function () {
  //load all data from items.json into webpage
  load_data(localStorage["itemId"], localStorage["itemColor"]);
  // localStorage.removeItem('itemInfo'); // Clear the localStorage
  // localStorage.removeItem('itemColor')

  //assign an onclick function to every size button
  var btns = document.getElementsByName("size_btn");
  for (var i = 0, len = btns.length; i < len; i++) {
    btns[i].onclick = function () {
      select_size(this);
    };
  }
  //assign an onchange function to color selector
  document.getElementById("color_select").onchange = function () {
    select_color(this);
  };
  //assign an onclick function to order button to store cookies for order form
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

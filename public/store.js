//get product info
var itemInfo = localStorage['itemInfo'];//[id,color,size,price,product]
itemInfo = itemInfo.split(',')
var customerInfo = []
var shipping
var zipcode

//turn into JSON
itemInfo = {
    id:itemInfo[0],
    color:itemInfo[1],
    size:itemInfo[2],
    price:itemInfo[3],
    product:itemInfo[4],
    shipping:[itemInfo[5],itemInfo[6],itemInfo[7]]

}

if (document.readyState == 'loading') {
    document.addEventListener('DOMContentLoaded', ready)
} else {
    ready()
}

function calculate_shipping(){
    zip_code = document.getElementById('zip').value
    shipping = "Enter ZIP code"
    //make sure it's a valid zip
    if(zip_code > 10000){
        if(zip_code>10000 && zip_code<40000){
            shipping = itemInfo.shipping[0]/100
        }else if(zip_code > 40000 && zip_code<80000){
            shipping =itemInfo.shipping[1]/100
        }else if(zip_code > 80000 && zip_code<100000){
            shipping =itemInfo.shipping[2]/100
        }
        //update shipping price and total price
        document.getElementById('order_shipping').innerHTML= '$'+shipping
        document.getElementById('order_total').innerHTML = '$'+(itemInfo.price/100+shipping)
    }else{
        document.getElementById('order_shipping').innerHTML= "Enter ZIP code"
        document.getElementById('order_total').innerHTML = ""
    }
}


function ready() {
    //display order summary
    let order_product = document.getElementById('order_summary')
    let order_price = document.getElementById('order_summary_price')

    order_product.innerHTML = '<strong>'+ itemInfo.product + '<br>'+ 'Color: '+ itemInfo.color.replace("_"," ") + '<br>' + 'Size: ' + itemInfo.size.toUpperCase() + '</strong>';
    order_price.innerHTML = '$'+itemInfo.price/100

    //calculate shipping based on zip
    for(let i =0;i<document.getElementsByClassName('info-input').length; i++){
        document.getElementsByClassName('info-input')[i].addEventListener('focusout',calculate_shipping)
    }


    document.getElementById('confirm_button').addEventListener('click', function(){
        //Check to make sure all info is filled in
        inputs=document.getElementsByClassName("info-input")
        var filled_counter = 0;
        for(var i = 0; i<inputs.length; i++){
            if(inputs[i].value==""){
                inputs[i].style.border = "3px solid red"
                filled_counter++
            } else{
                inputs[i].style.border = "3px solid #3c8ccc"
            }
        }
        if(filled_counter>0){
            console.log("not complete")
        } else{
            //put together all customer contact info into JSON format
            info_inputs = document.getElementsByClassName('info-input')
            for(let i = 0; i<info_inputs.length; i++){
                customerInfo[info_inputs[i].name] = info_inputs[i].value
            }
            customerInfo = $('#information-container').serializeArray()
            console.log(customerInfo)
            console.log(itemInfo)
            //go to stripe checkout
            let total = parseInt(itemInfo.price)+(shipping*100)
            stripeHandler.open({amount:total});
        }
    })
}

console.log("Key = "+ stripePublicKey)

var stripeHandler = StripeCheckout.configure({
    key: stripePublicKey,
    locale: 'en',
    token: function(token) {
        item = itemInfo.id

        fetch('/purchase', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                stripeTokenId: token.id,
                items: item,
                zip:zip_code
            })
        }).then(function(res) {
            console.log(res.json())
        }).then(function(data) {


            //send order info to server for Google spreadsheet
            /*
            fetch('/send_order',{
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    item_information:itemInfo,
                    customer_information:customerInfo
                })
            }).then(function(res) {
                console.log(res.json())
            }).then(function(data) {
                console.log(data)
            })
            */

            
            //clear local storage
            localStorage.removeItem('itemInfo'); // Clear the localStorage
            localStorage.removeItem('itemColor')
            localStorage.removeItem('itemId')
            console.log(data.message)
            //go to success screen
            window.location.href = 'success.html'
        }).catch(function(error) {
            console.error(error)
        })
    }
})


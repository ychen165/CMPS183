// This is the js for the default/index.html view.
var app = function() {

    var self = {};

    Vue.config.silent = false; // show all warnings

    // Extends an array
    self.extend = function(a, b) {
        for (var i = 0; i < b.length; i++) {
            a.push(b[i]);
        }
    };

    // Enumerates an array.
    var enumerate = function(v) { var k=0; return v.map(function(e) {e._idx = k++;});};
    
    function get_user_images_url(start_idx, end_idx) {
        console.log("in get_user_images url function");
        var pp = {
            start_idx: start_idx,
            end_idx: end_idx
        };
        return user_images_url + "?" + $.param(pp);
    }
    
    self.get_user_images = function () {
         console.log("Trying to get the user_images");
        $.getJSON(get_user_images_url(0, 20), function (data){
            self.vue.user_images = data.user_images;
            enumerate(self.vue.user_images);
        })
    };    

    function get_users(start_idx, end_idx) {
        console.log("in get_user_list function");
        var pp = {
            start_idx: start_idx,
            end_idx: end_idx
        };
        return users_url + "?" + $.param(pp);
    }
    
    self.get_users = function () {
         console.log("Trying to get the users");
        $.getJSON(get_users(0, 20), function (data){
            self.vue.auth_user = data.auth_user;
            enumerate(self.vue.auth_user);
        })
    }; 


     self.get_images_from_current_user = function(user_email) {
        
        console.log("Getting images from current user " + user_email);
        $.post(current_images_url, {
            other_user:user_email,
        },
        function (data) {
            self.vue.self_page=true;
            self.vue.user_images = data.user_images;
            enumerate(self.vue.user_images);
        });
    };

    self.get_images_from_other_user = function(user_email) {
        
        console.log("Getting images from other user" + user_email);
        $.post(other_images_url, {
            other_user:user_email,
        },
        function (data) {
            self.vue.self_page=false;
            self.vue.user_images = data.user_images;
            enumerate(self.vue.user_images);
        });
    };
    
    self.open_uploader = function () {
        $("div#uploader_div").show();
        self.vue.is_uploading = true;
    };

    self.close_uploader = function () {
        $("div#uploader_div").hide();
        self.vue.is_uploading = false;
        $("input#file_input").val(""); // This clears the file choice once uploaded.

    };

    self.upload_file = function (event) {
        // Reads the file.
        var input = $("input#file_input")[0];
        var file = input.files[0];
        if (file) {
            // First, gets an upload URL.
            console.log("Trying to get the upload url");
            $.getJSON('https://upload-dot-luca-teaching.appspot.com/start/uploader/get_upload_url',
                function (data) {
                    // We now have upload (and download) URLs.
                    var put_url = data['signed_url'];
                    var get_url = data['access_url'];
                    console.log("Received upload url: " + put_url);
                    // Uploads the file, using the low-level interface.
                    var req = new XMLHttpRequest();
                    req.addEventListener("load", self.upload_complete(get_url));
                    // TODO: if you like, add a listener for "error" to detect failure.
                    req.open("PUT", put_url, true);
                    req.send(file);
                });
        }
    };

    self.set_price = function(image_idx) {
        var um = self.vue.user_images[image_idx];
        console.log("set_price called");
        $.post(set_price_url,
            {
                image_id: um.id,
                price: um.price,
            },
            function (data) {
                    if(data == "ok"){
                        um.price = um.price;
                        console.log(um.price);
                    }
               });
    }

    self.add_cart = function (image_idx) {
        var um = self.vue.user_images[image_idx];
        console.log("add_cart called");
        $.post(add_cart_url,
            {
                image_id: um.id,
                is_incart: true,
            },
            function (data) {
                    if(data == "ok"){
                        um.is_incart = true;
                        console.log(um.is_incart);
                    }
               });
    }

    self.out_cart = function (image_idx) {
        var um = self.vue.user_images[image_idx];
        console.log("out_cart called");
        $.post(out_cart_url,
            {
                image_id: um.id,
                is_incart: false,
            },
            function (data) {
                    if(data == "ok"){
                        um.is_incart = false;
                        console.log(um.is_incart);
                    }
               });
    }

    self.update_cart = function(){
        var cart_total=0;
        for (var i = 0; i < self.vue.user_images.length; i++) {
            if (self.vue.user_images[i].is_incart) {
                cart_total += self.vue.user_images[i].price;
            }
        }
         self.vue.cart_total = cart_total;
    };

    self.upload_complete = function(get_url) {
        // Hides the uploader div.
        self.close_uploader();
        console.log('The file was uploaded; it is now available at ' + get_url);
        // TODO: The file is uploaded.  Now you have to insert the get_url into the database, etc.
         setTimeout(function() {
         $.post(add_image_url,
            {
                image_url: get_url,
                price: self.vue.image_price
            },
            function (data) {  
                self.get_user_images();
                self.vue.user_images.push(data.user_images);
                enumerate(self.vue.user_images);
            })
         console.log(self.vue.user_images);
             //your code to be executed after 1 second
            }, 1000);
            
    };

    self.customer_info = {}

    self.is_checkingout = function(){
        self.stripe_instance = StripeCheckout.configure({
                key: 'pk_test_CeE2VVxAs3MWCUDMQpWe8KcX',    //put your own publishable key here
                image: 'https://stripe.com/img/documentation/checkout/marketplace.png',
                locale: 'auto',
                token: function(token, args) {
                    console.log('got a token. sending data to localhost.');
                    self.stripe_token = token;
                    self.customer_info = args;
                    self.send_data_to_server();
                }
            });

        self.vue.is_checkout = true;
        self.update_cart();
    }

    self.isnt_checkingout = function(){
        self.vue.is_checkout = false;
    }

    self.buy = function () {
        console.log("buy");
        self.stripe_instance.open({
            name: "Your nice cart",
            description: "Buy cart content",
            billingAddress: true,
            shippingAddress: true,
            amount: Math.round(self.vue.cart_total * 100),
        });
    };

    self.send_data_to_server = function () {
        console.log("Payment for:", self.customer_info);
        // Calls the server.
        $.post(purchase_url,
            {
                customer_info: JSON.stringify(self.customer_info),
                transaction_token: JSON.stringify(self.stripe_token),
                amount: self.vue.cart_total,
                user_images: JSON.stringify(self.vue.user_images),
            },
            function (data) {
                if (data.result === "ok") {
                    // The order was successful.
                    $.web2py.flash("Thank you for your purchase");
                } else {
                    $.web2py.flash("The card was declined.");
                }
            }
        );
    };


    self.vue = new Vue({
        el: "#vue-div",
        delimiters: ['${', '}'],
        unsafeDelimiters: ['!{', '}'],
        data: {
            is_uploading: false,
            self_page: true, // Leave it to true, so initially you are looking at your own images.
            user_images: [],
            auth_user: [],
            logged_in: false,
            has_more: false,
            image_price: null,
            price: [],
             Shoppingcart: [],
            is_checkout: false,
            is_incart: true,
            image_ID: null,
            cart_total: 0
            },
        methods: {
            open_uploader: self.open_uploader,
            close_uploader: self.close_uploader,
            upload_file: self.upload_file,      
            get_user_images: self.get_user_images,
            get_users: self.get_users,
            get_images_from_current_user: self.get_images_from_current_user,
            get_images_from_other_user: self.get_images_from_other_user,
            set_price: self.set_price,
            add_cart: self.add_cart,
            is_checkingout: self.is_checkingout,
            isnt_checkingout: self.isnt_checkingout,
            update_cart: self.update_cart,
            buy: self.buy,
            out_cart: self.out_cart
        }

    });

    self.get_user_images();
    self.get_users();
    $("#vue-div").show();

    return self;
};

var APP = null;

// This will make everything accessible from the js console;
// for instance, self.x above would be accessible as APP.x
jQuery(function(){APP = app();});
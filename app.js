require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose")
const bodyParser = require("body-parser");
const _ = require("lodash");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const MongoStore = require("connect-mongo")(session);
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static(__dirname + "/public"));
app.use(session({
    secret: "This is my little secret",
    resave: false,
    saveUninitialized: false,
    store: new MongoStore({mongooseConnection: mongoose.connection, ttl: 90*24*60*60})
}))

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/todolistDB", {useNewUrlParser:true, useUnifiedTopology:true, useFindAndModify: false});
mongoose.set("useCreateIndex", true);

const options = {month: "long", day: "numeric"}
const day = new Date().toLocaleDateString("en-US", options)
const images = 23;

const itemsSchema = new mongoose.Schema({
    name: String
});

const listsSchema =  new mongoose.Schema({
    name: String,
    items: [itemsSchema],
    bgimg: Number
});

const usersSchema =  new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    lists: [listsSchema],
    googleId: String
});

usersSchema.plugin(passportLocalMongoose, {usernameField: "email"});
usersSchema.plugin(findOrCreate);

const Item = mongoose.model("Item", itemsSchema);
const List = mongoose.model("List", listsSchema);
const User = mongoose.model("User", usersSchema);

passport.use(User.createStrategy());
passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
});

////////
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/todolist",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id, name: profile.name.givenName}, function (err, user) {
      return cb(err, user);
    });
  }
));

/* --------------- Inicial List ------------------------- */
const item1 = new Item({
    name: "Welcome to your To Do list!"
});
const item2 = new Item({
    name: "Hit the top plus button to add a list"
});
const item3 = new Item({
    name: "And the trash can button to remove a list"
});
const item4 = new Item({
    name: "<-- Here to remove an item"
});
const item5 = new Item({
    name: "Enjoy 😀"
});

const defaultItems = [item1, item2, item3, item4, item5];

const inicialList = new List({
    _id: mongoose.Types.ObjectId("000000000000000000000000"),
    name: day,
    items: defaultItems,
    bgimg: 1
});
/* --------------- Inicial List ------------------------- */

app.get("/", function(req, res){
    if(req.isAuthenticated()){
        res.redirect("/user/login/" + req.user._id);
    }else{
        res.render("home")
    }
})

app.get("/login", function(req, res){
    res.render("login")
})

app.get("/register", function(req, res){
    res.render("register")
})

//Login user
app.post("/login", function(req, res){
    const email = req.body.email;
    const password = req.body.password;

    const user = new User({
        email: email,
        password: password
    })

    req.login(user, function(err){
        if(!err){
            passport.authenticate("local")(req, res, function(){
                res.redirect("/user/login/" + req.user._id);
            })
        }else{
            console.log(err);
            res.redirect("/");
        }
    })

})

//Register User
app.post("/register", function(req, res){
    const name = _.capitalize(req.body.name);
    const email = req.body.email;
    const password = req.body.password;

    User.register({name: name, email: email, lists: inicialList}, password, function(err, user){
        if(!err){
            passport.authenticate("local")(req, res, function(){
                res.redirect("/user/register/" + user._id);
            })
        }else{
            console.log(err)
            res.redirect("/register");
        }
    })

})

//Register with Google //////
app.get("/auth/google", passport.authenticate("google", {scope: ["profile"]}));

app.get("/auth/google/todolist", passport.authenticate("google" , {failureRedirect: "/login"}),
function(req, res){

    User.findById(req.user._id, function(err, foundUserList){
        if(foundUserList.lists.length > 0){
            res.redirect("/user/login/" + req.user._id);
        }else{
            User.findByIdAndUpdate(req.user._id, {$push: {lists: inicialList}}, 
            function(err, foundUser){
                if(!err){
                  res.redirect("/user/login/" + req.user._id);
                }else{
                    console.log(err)
                }
            });
        }
    })    
});

//Load default items for registered user
app.get("/user/register/:userId", function(req, res){
    const userId = req.params.userId;
    if(req.isAuthenticated() && (JSON.stringify(req.user._id) === `"${userId}"`)){
        User.findById(userId, function(err, foundUser){
            if(!err){

                res.render("list", {
                    name: foundUser.name,
                    userId : foundUser._id,
                    listTitle : day, 
                    items: foundUser.lists[0].items, 
                    lists: foundUser.lists, 
                    listId : foundUser.lists[0]._id,
                    bgimg : 1
                });

            }else{
                console.log(err);
            }
        })
    }else{
        res.redirect("/")
    }
})

//Load items for logim user
app.get("/user/login/:userId", function(req, res){    
    const userId = req.params.userId;
    if(req.isAuthenticated() && (JSON.stringify(req.user._id) === `"${userId}"`)){
        User.findById(userId, function(err, foundUser){
            if(!err){
                if(foundUser.lists[0].items === undefined){
                    foundUser.lists[0].items = [];

                    res.render("list", {
                        name: foundUser.name,
                        userId : foundUser._id,
                        listTitle : day, 
                        items: foundUser.lists[0].items,
                        lists: foundUser.lists, 
                        listId : foundUser.lists[0]._id,
                        bgimg : 1
                    }) 
                }else{
                    res.render("list", {
                        name: foundUser.name,
                        userId : foundUser._id,
                        listTitle : day, 
                        items: foundUser.lists[0].items,
                        lists: foundUser.lists, 
                        listId : foundUser.lists[0]._id,
                        bgimg : 1
                    })
                }

            }else{
                console.log(err)
            }
        })
    }else{
        res.redirect("/")
    }
})

//Add new Item
app.post("/addItem", function(req, res){
    if(req.isAuthenticated()){
        const item = req.body.newItem;
        const listId = req.body.listIdAddBtn;
        const userId = req.body.userIdAddBtn;
    
        User.findOneAndUpdate({_id: userId, "lists._id": listId}, {$push: {"lists.$.items": {name: item}}}, function(err, foundUser){
            
            if(!err){
                res.redirect(`/user/${userId}/lists/${listId}`)
            }else{
                console.log(err)
            }
        })
    }else{
        res.redirect("/")
    }     
})

//Delete item
app.post("/deleteItem", function(req, res){
    if(req.isAuthenticated()){
        const idItem = req.body.checkbox;
        const listId = req.body.listIdDeleteItem;
        const userId = req.body.userIdDeleteItem;
    
        User.findOneAndUpdate({_id: userId, "lists._id": listId}, {$pull: {"lists.$.items": {_id: idItem}}}, function(err, foundUser){
            if(!err){
                res.redirect(`/user/${userId}/lists/${listId}`)
            }else{
                console.log(err);
            }
        })
    }else{
        res.redirect("/")
    }
})

//Create new custom List
app.post("/addList", function(req, res){
    if(req.isAuthenticated()){
        const newList = req.body.addNewList;
        const userId = req.body.userIdAddList;
        const bgimgaux = Math.ceil(Math.random()*images);
    
        User.findByIdAndUpdate(userId, {$push: {lists: {name: newList, bgimg: bgimgaux}}}, function(err, foundUser){
            if(!err){
                console.log("Succesfully added new list!")
            }else{
                console.log(err)
            }
        })
    
        User.findById(userId, function(err, foundUser){
            if(!err){
                const listId = foundUser.lists[foundUser.lists.length -1]._id;
                res.redirect(`/user/${userId}/lists/${listId}`)
            }else{
                console.log(err)
            }
        })
    }else{
        res.redirect("/")
    }
})

//Access custom list
app.get("/user/:userId/lists/:listId", function(req, res){
    if(req.isAuthenticated()){
        const userId = req.params.userId;
        const listId = req.params.listId;
    
        User.findById(userId, function(err, foundUser){
            if(!err){
                User.findById(userId, {lists: {$elemMatch: {_id: listId}}}, function(err, foundUserList){
                    if(!err){        
                        res.render("list", {
                            name: foundUser.name,
                            userId : foundUserList._id,
                            listTitle : foundUserList.lists[0].name, 
                            items: foundUserList.lists[0].items,
                            lists: foundUser.lists, 
                            listId : foundUserList.lists[0]._id,
                            bgimg : foundUserList.lists[0].bgimg
                        });
                        
                    }else{
                        console.log(err);
                    }
                })
    
            }else{
                console.log(err);
            }
        })
    }else{
        res.redirect("/")
    }

})

//Delete List
app.post("/deleteList", function(req, res){
    if(req.isAuthenticated()){
        const userId = req.body.userIdDeleteList;
        const listId = req.body.deleteListBtn;
    
        if(listId === "000000000000000000000000"){
            console.log("You can not delete main list!");
            res.redirect("/user/login/" + userId);
    
        }else{
            User.findByIdAndUpdate(userId, {$pull: {lists: {_id: listId}}}, function(err, foundUser){
                if(!err){
                    console.log("Succesfully deleted list!");
                    res.redirect("/user/login/" + foundUser._id);
                }else{
                    console.log(err)
                }
            })
        }

    }else{
        res.redirect("/");
    }
    
})


//Logout user
app.post("/logout", function(req, res){
    req.logout();
    req.session.destroy(function(err){
        if(err){
            console.log(err);
        }
    })
    res.redirect("/")
})


app.listen("3000", () => console.log("Server open on port 3000"))
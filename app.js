const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose")
const bodyParser = require("body-parser");
const _ = require("lodash");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static(__dirname + "/public"));
app.use(session({
    secret: "This is my little secret",
    resave: false,
    saveUninitialized: false
}))

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/todolistDB", {useNewUrlParser:true, useUnifiedTopology:true, useFindAndModify: false});
mongoose.set("useCreateIndex", true);

const options = {month: "long", day: "numeric"}
const day = new Date().toLocaleDateString("en-US", options)
const images = 25;

const itemsSchema = new mongoose.Schema({
    name: String
});

const listsSchema =  new mongoose.Schema({
    name: String,
    items: [itemsSchema],
    bgimg: Number
});

const usersSchema =  new mongoose.Schema({
    email: String,
    password: String,
    lists: [listsSchema]
});

usersSchema.plugin(passportLocalMongoose, {usernameField: "email"});

const User = mongoose.model("User", usersSchema);
const Item = mongoose.model("Item", itemsSchema);
const List = mongoose.model("List", listsSchema);

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

/* --------------- Inicial Items ------------------------- */
const item1 = new Item({
    name: "Welcome to your To Do list!"
})
const item2 = new Item({
    name: "Hit the top plus button to add a list"
})
const item3 = new Item({
    name: "And the trash can button to remove a list"
})
const item4 = new Item({
    name: "<-- Here to remove an item"
})
const item5 = new Item({
    name: "Enjoy 😀"
})

const defaultItems = [item1, item2, item3, item4, item5];
/* --------------- Inicial Items ------------------------- */

app.get("/", function(req, res){
    if(req.isAuthenticated()){
        res.redirect("/login")
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



//    const email = req.body.email;
//    const password = req.body.password;

//     User.findOne({email: email}, function(err, foundUser){
//         if(!err){
//             if(foundUser.password === password){
//                 res.redirect("/user/login/" + foundUser._id);
//             }
//         }else{
//             console.log(err)
//         }
//     })
})

//Register User
app.post("/register", function(req, res){
    const email = req.body.email;
    const password = req.body.password;

    const newList = new List({
        name: day,
        items: defaultItems
    })

    // const newUser = new User({
    //     email: email,
    //     password: password,
    //     lists: newList
    // });

    User.register({email: email, lists: newList}, password, function(err, user){
        if(!err){
            passport.authenticate("local")(req, res, function(){
                res.redirect("/user/register/" + user._id);
            })
        }else{
            console.log(err)
            res.redirect("/register");
        }
    })

    // newUser.save(function(err){
    //     if(!err){
    //         res.redirect("/user/register/" + newUser._id);
    //     }else{
    //         console.log(err)
    //     }
    // })
})


//Load default items for registered user
app.get("/user/register/:userId", function(req, res){
    const userId = req.params.userId;

    User.findById(userId, function(err, foundUser){
        if(!err){

            res.render("list", {
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
})

//Load items for logim user
app.get("/user/login/:userId", function(req, res){
    const userId = req.params.userId;

    User.findById(userId, function(err, foundUser){
        if(!err){
            if(foundUser.lists[0].items === undefined){
                foundUser.lists[0].items = [];

                res.render("list", {
                    userId : foundUser._id,
                    listTitle : day, 
                    items: foundUser.lists[0].items,
                    lists: foundUser.lists, 
                    listId : foundUser.lists[0]._id,
                    bgimg : 1
                }) 
            }else{
                res.render("list", {
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
})

//Add new Item
app.post("/addItem", function(req, res){
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
})

//Delete item
app.post("/deleteItem", function(req, res){
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
})

//Create new custom List
app.post("/addList", function(req, res){
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

})

//Access custom list
app.get("/user/:userId/lists/:listId", function(req, res){
    const userId = req.params.userId;
    const listId = req.params.listId;

    User.findById(userId, function(err, foundUser){
        if(!err){
            User.findById(userId, {lists: {$elemMatch: {_id: listId}}}, function(err, foundUserList){
                if(!err){        
                    res.render("list", {
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

})

//Delete List
app.post("/deleteList", function(req, res){
    const userId = req.body.userIdDeleteList;
    const listId = req.body.deleteListBtn;
    
    User.findByIdAndUpdate(userId, {$pull: {lists: {_id: listId}}}, function(err, foundUser){
        if(!err){
            console.log("Succesfully deleted list!");
            res.redirect("/user/login/" + foundUser._id);
        }else{
            console.log(err)
        }
    })

})

app.post("/logout", function(req, res){
    req.logout();
    res.redirect("/")
})



app.listen("3000", () => console.log("Server open on port 3000"))
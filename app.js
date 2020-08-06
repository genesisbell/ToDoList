const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose")
const bodyParser = require("body-parser");
const _ = require("lodash");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static("public"));

mongoose.connect("mongodb://localhost:27017/todolistDB", {useNewUrlParser:true, useUnifiedTopology:true});

const options = {month: "long", day: "numeric"}
const day = new Date().toLocaleDateString("en-US", options)

const itemsSchema = {
    name: String
}

const listsSchema = {
    name: String,
    items: [itemsSchema]
}

const Item = mongoose.model("item", itemsSchema);
const List = mongoose.model("list", listsSchema);


//Load items
app.get("/", function(req, res){

    List.find({}, function(err, foundLists){
        if(!err){
            Item.find({}, function(err, items){
                if(!err){
                    res.render("list", {listTitle : day, items: items, lists: foundLists}) 
                }else{
                    console.log(err)
                }
            })
        }else{
            console.log(err)
        }
    })


    
})

//Add new Item
app.post("/", function(req, res){
    const item = req.body.newItem;

    if(item !== ""){
        const newItemDoc = new Item({
            name: item
        })
        newItemDoc.save();
        
    }

    res.redirect("/")
    
})

//Delete item
app.post("/delete", function(req, res){
    const idItem = req.body.checkbox
    Item.findByIdAndDelete(idItem, function(err, foundItem){
        if(!err){
            console.log("Sucessfully deleted items" + foundItem)
        }else{
            console.log(err)
        }
    })
    res.redirect("/")
})

//Load list


//Create new custom List
app.post("/addList", function(req, res){
    const newList = req.body.addNewList;

    const newListDoc =  new List({
        name: newList
    })
    newListDoc.save()
    res.redirect("/lists/" + newListDoc._id)
})

//Delete List
app.post("/deleteList", function(req, res){
    const itemToDeleteId = req.body.input;
    console.log(itemToDeleteId);
    res.redirect("/")

})

//Access custom list
app.get("/lists/:listId", function(req, res){

    const listId = req.params.listId
    List.find({}, function(err, foundLists){
        if(!err){
            List.findById(listId, function(err, foundNameList){
                res.render("list", {listTitle : foundNameList.name, items: foundNameList.items, lists: foundLists})
            })
        }
    })
    



    // const listId = req.params.listId;
    // console.log(mongoose.Types.ObjectId.isValid(listId))

    // List.findById({listId}, function(err, foundList){
    //     if(!err){
    //         res.render("list", {listTitle : foundList.name, items: foundList.items})
    //     }else{
    //         console.log(err)
    //     }
    // })

})

app.listen("3000", () => console.log("Server opened on port 3000"))
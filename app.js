const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose")
const bodyParser = require("body-parser");
const _ = require("lodash");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static("public"));

mongoose.connect("mongodb://localhost:27017/todolistDB", {useNewUrlParser:true, useUnifiedTopology:true, useFindAndModify: false});

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
                    res.render("list", {listTitle : day, items: items, lists: foundLists, listId : "0"}) 
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
    const listId = req.body.listIdAddBtn;

    const newItemDoc = new Item({
        name: item
    })

    if(listId === "0"){
        newItemDoc.save();
        res.redirect("/")
    }else{
        List.findOne({_id : listId}, function(err, foundList){
            foundList.items.push(newItemDoc);
            foundList.save();
            res.redirect("/lists/" + listId);
        })
    }

    
   
    
})

//Delete item
app.post("/delete", function(req, res){
    const idItem = req.body.checkbox
    const listId = req.body.listIdDeleteItem;


    if(listId === "0"){
        Item.findByIdAndDelete(idItem, function(err, foundItem){
            if(err){
             console.log(err)
            }else{
                console.log(foundItem)
            }
        })
        res.redirect("/")
    }else{
        List.findByIdAndUpdate(listId, {$pull: {items : {_id: idItem}}}, function(err, foundList){
            if(!err){
                res.redirect("/lists/" + listId);
            }else{
                console.log(err);
            }
        })
    }


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
    const listToDeleteId = req.body.deleteListBtn;

    if(listToDeleteId === "0"){
        console.log("You can not delete main day list, choose another list to delete");
    }else{
        List.findByIdAndDelete(listToDeleteId, function(err, deletedList){
            if(err){
                console.log(err)
            }else{
                console.log("List deleted: " + deletedList)
            }
        })
    }
    res.redirect("/")

})

//Access custom list
app.get("/lists/:listId", function(req, res){

    const listId = req.params.listId
    List.find({}, function(err, foundLists){
        if(!err){
            List.findById(listId, function(err, foundNameList){
                res.render("list", {listTitle : foundNameList.name, items: foundNameList.items, lists: foundLists, listId : foundNameList._id})
            })
        }
    })

})

app.listen("3000", () => console.log("Server opened on port 3000"))
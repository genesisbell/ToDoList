const express = require("express");
const mongoose = require("mongoose")
const bodyParser = require("body-parser");
const _ = require("lodash");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static("public"));


app.get("/", function(req, res){
    res.render("header")
})




app.listen("3000", () => console.log("Server opened on port 3000"))
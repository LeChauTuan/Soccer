const express = require('express');
const bodyParser = require('body-parser');
const products = require("./db");
const cors = require("cors");
const mongoose = require('mongoose');
const crypto = require('crypto');
const path = require('path');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');
const corsOptions = {
    origin: 'http://localhost:3000',
    optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
  }

const app = new express();
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(methodOverride('_method'));
app.use(express.static('/public'));
app.set("views","views");
app.set("view engine","ejs");

//Mongo URI
const mongoURI = 'mongodb://127.0.0.1:27017/test';

//connection
const conn = mongoose.createConnection(mongoURI,{useNewUrlParser: true,useUnifiedTopology: true});
// init gfs
let gfs;
conn.on('error', console.error.bind(console, 'connection error:'));
conn.once('open',()=>{
  //init stream
  console.log('connected to db')
  gfs = Grid(conn.db,mongoose.mongo);
  gfs.collection('image');
})

//create storage engine
const storage = new GridFsStorage({
  url: mongoURI,
  file: (req,file) =>{
    return new Promise((resolve,reject)=>{
      crypto.randomBytes(16,(err,buf)=>{
        if(err)return reject(err);
        const filename = buf.toString('hex') + path.extname(file.originalname);
        const fileInfo = {
          filename,
          bucketName: 'uploads'
        };
        resolve(fileInfo)
      });
    });
  }
});

const upload = multer({storage});
//routes
app.get('/', (req, res) => {
    res.render("index");
});
app.get('/products', (req, res) => {
    res.send(JSON.stringify(products));
});
app.post('/upload',upload.single("file"),(req,res)=>{
  res.json({file: req.file});
})

//get all file
app.get('/img',(req,res)=>{
  gfs.files.find().toArray((err,files)=>{
    if(!files || files.length ===0){
      return res.status(404).json({
        err: 'not file in directory'
      });
    }
    res.json(files);
  })
});
// get one file
app.get('/img/:id',(req,res)=>{
  gfs.files.findOne({filename: req.params.id},function (err,file) {
    if(!file || file.length ===0){
      res.status(404).json({
        err: 'file is not exist'
      });
      return;
    }
    if(file.contentType === 'image/jpeg' || 'img/png'){
      const readStream = gfs.createReadStream(file.filename);
      readStream.pipe(res);
    }else {
      res.status(404).json({err:'not an image'})
    }
  });
});

const port = 8080;
app.listen(port, () => {
    console.log(`Server started on port ${port}`);
});

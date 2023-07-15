const express = require('express');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const mongoose = require('mongoose');
const aws = require('aws-sdk');
require('dotenv').config()

const app = express();

app.use(fileUpload());
app.use(cors());

const mongoURL = process.env.MONGO_URI;

mongoose.connect(mongoURL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('MongoDB Connection established successfully.');
  }).catch((err) => {
    console.error('Error establishing MongoDB connection:', err);
  });

const db = mongoose.connection;

const petSchema = new mongoose.Schema({
  name: String,
  age: String,
  traits: String,
  toy: String,
  image: {
    url: String
  }
});

const Pet = mongoose.model('Pet', petSchema);

app.post('/add-pet', (req, res) => {
  const petData = {
    name: req.body.petName,
    age: req.body.petAge,
    traits: req.body.petTraits,
    toy: req.body.petToy,
    image: {
      url: ''
    }
  };

  const accessKeyIdJson = require('./assets/accessKeyId.json');
  const secretAccessKeyJson = require('./assets/secretAccessKey.json');

  aws.config.update({
    accessKeyId: accessKeyIdJson.accessKeyId,
    secretAccessKey: secretAccessKeyJson.secretAccessKey,
    region: 'us-east-1'
  });

  const s3 = new aws.S3();

  const file = req.files.petImage;
  const fileName = file.name;

  async function uploadFile() {
    const params = {
      Bucket: 'pawsterimgbucket',
      Key: fileName,
      Body: file.data
    };

    try {
      await s3.putObject(params).promise();
      petData.image.url = `https://pawsterimgbucket.s3.amazonaws.com/${fileName}`;
      console.log('File uploaded successfully');
    } catch (error) {
      console.error(error);
    }
  }

  // Call the uploadFile function before saving pet data
  uploadFile()
    .then(() => {
      const pet = new Pet(petData);
      return pet.save();
    })
    .then(() => {
      res.status(200).send('Pet data stored successfully');
    })
    .catch((err) => {
      console.error('Error storing pet data:', err);
      res.status(500).send('Error storing pet data');
    });

});


app.get('/search', async (req, res) => {
  const searchTerm = req.query.term;
  const regex = new RegExp(searchTerm, 'i');
  const pets = await Pet.find({ name: regex });
  if (!pets) {
    res.status(404).send('No pets found');
    return;
  }
  res.json(pets);
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});

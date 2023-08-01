const express = require('express');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const mongoose = require('mongoose');
const aws = require('aws-sdk');
require('dotenv').config()

const app = express();
const port = 3000;

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
  owner: String,
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
    owner: req.body.petOwner,
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
      petData.image.url = `https://d35c9z5id0no27.cloudfront.net/${fileName}`;
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

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// app.get('/getPetById', async (req, res) => {
//   const petId = req.query.id;

//   try {
//     const pet = await Pet.findById(petId);
//     if (!pet) {
//       res.status(404).json({ error: 'Pet not found' });
//     } else {
//       res.json(pet);
//     }
//   } catch (error) {
//     console.error('Error fetching pet by ID:', error);
//     res.status(500).json({ error: 'Error fetching pet by ID' });
//   }
// });
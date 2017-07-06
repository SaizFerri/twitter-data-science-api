'use strict'

const configTwitter = require('./config/config.js')
const express = require('express')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const MongoClient = require('mongodb').MongoClient
    , assert = require('assert')
const Twitter = require('twitter')
const cors = require('cors')
//const Tweet = require('./model/tweet')
//const tunnel = require('tunnel-ssh')

const app = express()
const port = process.env.PORT || 3000

const url = 'mongodb://localhost:27017/TwitterLocal';

let languageTwitter = []

let client = new Twitter({
  consumer_key: configTwitter.consumer_key,
  consumer_secret: configTwitter.consumer_secret,
  access_token_key: configTwitter.access_token_key,
  access_token_secret: configTwitter.access_token_secret
})

let findTweets = function (db, callback) {

  let collection = db.collection('twitter.tweetsBerlinGeo')
    collection.mapReduce(
  	function () { emit(this.lang, 1) },
  	function (key, values) { return Array.sum( values )},
  	{
  		out: {inline: 1}
  	},

    function (err, collection, stats) {
      console.log(err);
      callback(collection)
    }
  )
}

/* const config = {
    username: 'local',
    host: configMongo.host,
    privateKey: require('fs').readFileSync(configMongo.privateKey),
    port: 22,
    dstPort: 27017,
    localPort: 27010,
    password: configMongo.password,
}

const server = tunnel(config, (error, server) => {
    if(error){
        console.log("SSH connection error: " + error);
    }
    mongoose.connect('mongodb://localhost:27017/twitter');

    let db = mongoose.connection;
    db.on('error', console.error.bind(console, 'DB connection error:'));
    db.once('open', () => {
        // we're connected!
        console.log("DB connection successful");
        app.listen(port, () => {
          console.log('API rest working...');
        })
    });
}); */
/*let formatLanguages = function (docs) {

    let formatedLanguages = []

    for (let i = 0; i < docs.length; i++) {
      let found = false

      for (let j = 0; j < formatedLanguages.length; j++) {
        if(formatedLanguages[j].code === docs[i].lang) {
          found = true
          formatedLanguages[j].count++

          break
        }
      }

      if(!found) {
        formatedLanguages.push({ code: docs[i].lang, count: 1 })
      }
    }

    return formatedLanguages
}*/

let getLanguages = function (docs) {

  let languagesSorted = []

  for(let i = 0; i < docs.length; i++) {
    const language = languageTwitter.find(language => {
      return docs[i]._id === language.code
    })
    if (language) {
      languagesSorted.push({ code: docs[i]._id, count: docs[i].value, name: language.name })
    } else {
      languagesSorted.push({ code: docs[i]._id, count: docs[i].value, name: "Not found (" + docs[i]._id + ")" })
    }
  }
  return languagesSorted
}

let formatedOutput = function (languages) {
  let formatedOutput = {
    formatedNameOutput: [],
    formatedCountOutput: []
  }

  let sorted = languages.sort((a, b) => {
    if (a.count > b.count) {
      return -1
    }
    if (b.count > a.count) {
      return 1
    }
    return 0
  })

  for (var i = 0; i < 10; i++) {
    formatedOutput.formatedNameOutput.push(sorted[i].name)
    formatedOutput.formatedCountOutput.push(sorted[i].count)
  }

  return formatedOutput
}

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(cors())

app.get('/api/tweets/languages', (req, res) => {
  MongoClient.connect(url, (err, db) => {
    assert.equal(null, err)
    console.log('Connected to the database...')

    client.get('https://api.twitter.com/1.1/help/languages.json', (error, languages) => {
      if (error) throw error
      languageTwitter = languages
    })

    findTweets(db, (docs) => {
      // let languages = formatLanguages(docs)
      let formated = getLanguages(docs)
      let sorted = formatedOutput(formated)

      res.send({ languages: sorted })
      db.close()
    })
  })
})

app.listen(port, () => {
  console.log('API rest working...');
})

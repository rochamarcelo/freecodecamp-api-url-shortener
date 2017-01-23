var express = require('express')
var mongo = require("mongodb").MongoClient
var handleUrl = require('url');
var app = express()
var mongoUrl = "mongodb://localhost:27017/shortener_temp2";
app.enable('trust proxy')
app.use('/static', express.static(__dirname + '/public'))

function startCounter(collection, callback) {
    var seq = {
        _id: "urls",
        seq: 1,
    };
    collection.insert(seq, (err, data) => {
        if(err) {
            return callback(err, null);
        }
        return callback(null, seq.seq);
    });
} 
function getNextId(db, callback) {
    var counters = db.collection("counters")
    var handleResult = (err, data) => {
        if (err) {
            return callback(err, null);
        }
        if(data.value) {
           return callback(null, data.value.seq);
        }
        startCounter(counters, callback);
    }
 
    counters.findAndModify(
        { 
            _id: {$eq:"urls"}
        },
        [],
        { 
            $inc: { seq: 1 } 
        },
        {new: true},
        handleResult
   );
}
function addNewUrl(db, url, callback) {
    var newUrl = {
        url: url
    }

    getNextId(db, (err, id) => {
        if(err) {
            return callback(err, id);
        }
        if (!id) {
            return callback("Cant define id", null);
        }
        
        newUrl._id = id;
        db.collection("urls").insert(newUrl, (err, data) => {
            if(err){ 
                return callback(err, data);
            }
            callback(null, newUrl)
        });
    });
}
function checkUrl(url) {
    var parsedUrl = handleUrl.parse(url);
    var protocols = ["http:", "https:", "ftp:"];
    return parsedUrl.hostname && protocols.indexOf(parsedUrl.protocol) >= 0;
}
function shortUrl(req, id) {
    return handleUrl.format({
        protocol: req.protocol,
        hostname: req.hostname,
        pathname: "/" + id
    });
}
app.get('/', function (req, res) {
    res.sendfile(__dirname + '/public/index.html');
})
app.get('/:url_id', function (req, res) {
    var urlId = +req.params.url_id;

    mongo.connect(mongoUrl, (err, db) => {
        if(err) throw err;
        var query = {
            _id: {
                $eq: urlId
            }
        }

        db.collection("urls").find(query).toArray((err, data) => {
            db.close();
            if(err || data.length < 1){
                var dataResp = {"error":"This url is not on the database."};
                return res.send(dataResp);
            }
            res.redirect(data[0].url);
        });
    });
})
app.get('/new/:orig_url(*)', function (req, res) {
    if (!checkUrl(req.params.orig_url)) {
        var error = {
            "error":"Wrong url format, make sure you have a valid protocol and real site."
        }
        return res.send(JSON.stringify(error));
    }
    var dataResp = {
        original_url: req.params.orig_url,
        short_url: null
    }
    mongo.connect(mongoUrl, (err, db) => {
        if(err) {
            return res.send("Error 500:");
        }

        addNewUrl(db, req.params.orig_url, (err, data) => {
            if(err) {
                console.log("Error add new url", data, dataResp);
            } else {
                dataResp.short_url = shortUrl(req, data._id);
            }
            res.send(JSON.stringify(dataResp));
        });
    });
})

app.listen(process.env.PORT || 8080, function () {
  console.log('Example app listening on port ' + process.env.PORT || 8080 + '!')
})
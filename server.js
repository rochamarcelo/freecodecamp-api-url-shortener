var express = require('express')
var app = express()
app.enable('trust proxy')
app.use('/static', express.static(__dirname + '/public'))

app.get('/', function (req, res) {
    res.sendfile(__dirname + '/public/index.html');
})

app.get('/new', function (req, res) {
    var data = {
        original_url: null,
        short_url: null
    }

    res.send(JSON.stringify(data));
})

app.listen(process.env.PORT || 8080, function () {
  console.log('Example app listening on port ' + process.env.PORT || 8080 + '!')
})
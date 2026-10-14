var express = require('express');
var errorHandler = require('./lib/errors').errorHandler;
var app = express();

app.disable('x-powered-by');
app.use(function (req, res, next) {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Headers', 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept');
    res.set('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }
    next();
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
require('./routes')(app, express.Router());

app.use(function (req, res) {
    res.status(404).json({ message: 'Endpoint not found', data: {} });
});
app.use(errorHandler);

module.exports = app;

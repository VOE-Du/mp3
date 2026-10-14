require('dotenv').config({ quiet: true });
var mongoose = require('mongoose');
var app = require('./app');
var User = require('./models/user');
var Task = require('./models/task');

async function start() {
    if (!process.env.MONGODB_URI) {
        throw new Error('MONGODB_URI is required');
    }
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
    await Promise.all([User.init(), Task.init()]);
    console.log('MongoDB connected successfully');

    var port = process.env.PORT || 3000;
    var server = app.listen(port, function () {
        console.log('Server running on port ' + port);
    });
    server.on('error', async function (err) {
        console.error('Server could not start (' + err.code + ')');
        await mongoose.disconnect();
        process.exitCode = 1;
    });
    return server;
}

if (require.main === module) {
    start().catch(async function () {
        console.error('Unable to connect to the database. Check MONGODB_URI and Atlas network access.');
        await mongoose.disconnect();
        process.exitCode = 1;
    });
}

module.exports = start;

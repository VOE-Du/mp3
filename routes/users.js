var resourceRouter = require('./resource-router');
var resources = require('../services/resources');

module.exports = resourceRouter({
    Model: require('../models/user'),
    label: 'User',
    defaultLimit: 0,
    save: resources.saveUser,
    remove: resources.deleteUser
});

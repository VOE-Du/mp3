var resourceRouter = require('./resource-router');
var resources = require('../services/resources');

module.exports = resourceRouter({
    Model: require('../models/task'),
    label: 'Task',
    defaultLimit: 100,
    save: resources.saveTask,
    remove: resources.deleteTask
});

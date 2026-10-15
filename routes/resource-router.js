var express = require('express');
var ApiError = require('../lib/errors').ApiError;
var isId = require('../lib/validation').isId;
var query = require('../lib/query');

function resourceRouter(options) {
    var router = express.Router();
    router.get('/', async function (req, res) {
        var data = await query.listResources(options.Model, req.query, options.defaultLimit);
        return res.status(200).json({ message: 'OK', data: data });
    });
    router.post('/', async function (req, res) {
        var data = await options.save(undefined, req.body);
        return res.status(201).json({ message: options.label + ' created successfully', data: data });
    });
    router.get('/:id', async function (req, res) {
        if (!isId(req.params.id)) {
            throw new ApiError(404, options.label + ' not found');
        }
        // Collection parameters are deliberately ignored on individual resources.
        var selection = query.parseSelect(req.query);
        var data = await options.Model.findById(req.params.id).select(selection);
        if (!data) {
            throw new ApiError(404, options.label + ' not found');
        }
        return res.status(200).json({ message: 'OK', data: data });
    });
    router.put('/:id', async function (req, res) {
        var data = await options.save(req.params.id, req.body);
        return res.status(200).json({ message: options.label + ' updated successfully', data: data });
    });
    router.delete('/:id', async function (req, res) {
        await options.remove(req.params.id);
        return res.status(204).end();
    });
    return router;
}

module.exports = resourceRouter;

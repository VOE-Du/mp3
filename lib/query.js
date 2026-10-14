var ApiError = require('./errors').ApiError;

function parseJSON(query, key, fallback) {
    if (query[key] === undefined) {
        return fallback;
    }
    try {
        if (typeof query[key] !== 'string') {
            throw new Error('Invalid query value');
        }
        return JSON.parse(query[key]);
    } catch (err) {
        throw new ApiError(400, key + ' must contain valid JSON');
    }
}

function requireObject(value, key) {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        throw new ApiError(400, key + ' must be a JSON object');
    }
    return value;
}

function validField(field) {
    return field !== '' && !field.startsWith('$') && field.split('.').every(function (part) {
        return part !== '' && !['__proto__', 'prototype', 'constructor'].includes(part);
    });
}

function parseSelect(query) {
    var selection = requireObject(parseJSON(query, 'select', {}), 'select');
    var modes = new Set();
    for (var field of Object.keys(selection)) {
        if (!validField(field) || (selection[field] !== 0 && selection[field] !== 1)) {
            throw new ApiError(400, 'select fields must have values of 0 or 1');
        }
        if (field !== '_id') {
            modes.add(selection[field]);
        }
    }
    if (modes.size > 1) {
        throw new ApiError(400, 'select cannot mix included and excluded fields, except for _id');
    }
    return selection;
}

function parseCollection(query, defaultLimit) {
    var where = requireObject(parseJSON(query, 'where', {}), 'where');
    var sort = requireObject(parseJSON(query, 'sort', {}), 'sort');
    for (var field of Object.keys(sort)) {
        if (!validField(field) || (sort[field] !== 1 && sort[field] !== -1)) {
            throw new ApiError(400, 'sort fields must have values of 1 or -1');
        }
    }
    var select = parseSelect(query);
    var skip = parseJSON(query, 'skip', 0);
    var limit = parseJSON(query, 'limit', defaultLimit);
    var count = parseJSON(query, 'count', false);
    if (!Number.isSafeInteger(skip) || skip < 0 || !Number.isSafeInteger(limit) || limit < 0) {
        throw new ApiError(400, 'skip and limit must be non-negative integers');
    }
    if (typeof count !== 'boolean') {
        throw new ApiError(400, 'count must be true or false');
    }
    return { where, sort, select, skip, limit, count };
}

async function listResources(Model, query, defaultLimit) {
    var options = parseCollection(query, defaultLimit);
    try {
        if (options.count) {
            return await Model.countDocuments(options.where);
        }
        return await Model.find(options.where)
            .select(options.select)
            .sort(options.sort)
            .skip(options.skip)
            .limit(options.limit);
    } catch (err) {
        if (
            err.name === 'CastError' ||
            (err.name === 'MongoServerError' && ['BadValue', 'FailedToParse', 'TypeMismatch'].includes(err.codeName))
        ) {
            throw new ApiError(400, 'Invalid query condition');
        }
        throw err;
    }
}

module.exports = { parseSelect, parseCollection, listResources };

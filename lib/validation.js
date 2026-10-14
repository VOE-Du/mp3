var ApiError = require('./errors').ApiError;

function isId(value) {
    return typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value);
}

function requireBody(body) {
    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
        throw new ApiError(400, 'The request body must be an object');
    }
}

function requiredString(value, field) {
    if (typeof value !== 'string' || value.trim() === '') {
        throw new ApiError(400, field + ' must be a non-empty string');
    }
    return value.trim();
}

function optionalString(value, field, fallback) {
    if (value === undefined) {
        return fallback;
    }
    if (typeof value !== 'string') {
        throw new ApiError(400, field + ' must be a string');
    }
    return value;
}

function userInput(body) {
    requireBody(body);
    var name = requiredString(body.name, 'name');
    var email = requiredString(body.email, 'email');
    if (!/^[^\s@]+@[^\s@]+$/.test(email)) {
        throw new ApiError(400, 'email must be a valid email address');
    }
    var pendingTasks = body.pendingTasks === undefined ? [] : body.pendingTasks;
    if (!Array.isArray(pendingTasks) || pendingTasks.some(function (id) {
        return !isId(id);
    })) {
        throw new ApiError(400, 'pendingTasks must be an array of valid task IDs');
    }
    return {
        name: name,
        email: email,
        pendingTasks: Array.from(new Set(pendingTasks.map(function (id) {
            return id.toLowerCase();
        })))
    };
}

function taskInput(body) {
    requireBody(body);
    var name = requiredString(body.name, 'name');
    if (
        (typeof body.deadline !== 'string' && typeof body.deadline !== 'number') ||
        (typeof body.deadline === 'string' && body.deadline.trim() === '')
    ) {
        throw new ApiError(400, 'deadline must be a valid date');
    }
    var deadline = new Date(body.deadline);
    if (!Number.isFinite(deadline.getTime())) {
        throw new ApiError(400, 'deadline must be a valid date');
    }
    var description = optionalString(body.description, 'description', '');
    var completed = body.completed === undefined ? false : body.completed;
    if (typeof completed !== 'boolean') {
        throw new ApiError(400, 'completed must be a boolean');
    }
    var assignedUser = optionalString(body.assignedUser, 'assignedUser', '');
    var assignedUserName = optionalString(body.assignedUserName, 'assignedUserName', undefined);
    if (assignedUser !== '' && !isId(assignedUser)) {
        throw new ApiError(400, 'assignedUser must be a valid user ID or an empty string');
    }
    if (assignedUser === '') {
        if (assignedUserName !== undefined && assignedUserName !== 'unassigned') {
            throw new ApiError(400, 'An unassigned task must have assignedUserName set to unassigned');
        }
        assignedUserName = 'unassigned';
    }
    return {
        name: name,
        description: description,
        deadline: deadline,
        completed: completed,
        assignedUser: assignedUser.toLowerCase(),
        assignedUserName: assignedUserName
    };
}

module.exports = { isId, userInput, taskInput };

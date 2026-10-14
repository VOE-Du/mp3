var mongoose = require('mongoose');
var User = require('../models/user');
var Task = require('../models/task');
var ApiError = require('../lib/errors').ApiError;
var validation = require('../lib/validation');

async function existingResource(Model, id, session, label) {
    if (!validation.isId(id)) {
        throw new ApiError(404, label + ' not found');
    }
    var document = await Model.findById(id).session(session);
    if (!document) {
        throw new ApiError(404, label + ' not found');
    }
    return document;
}

async function saveUser(id, body) {
    return mongoose.connection.transaction(async function (session) {
        // Check the URL resource before validating the request body.
        var user = id === undefined ? null : await existingResource(User, id, session, 'User');
        var input = validation.userInput(body);
        var emailFilter = { email: input.email };
        if (user) {
            emailFilter._id = { $ne: user._id };
        }
        if (await User.exists(emailFilter).session(session)) {
            throw new ApiError(400, 'Email is already in use');
        }
        var tasks = await Task.find({ _id: { $in: input.pendingTasks } }).session(session);
        if (tasks.some(function (task) { return task.completed; })) {
            throw new ApiError(400, 'pendingTasks cannot contain completed tasks');
        }
        if (tasks.length !== input.pendingTasks.length) {
            throw new ApiError(404, 'A task in pendingTasks was not found');
        }
        var oldIds = user ? user.pendingTasks.slice() : [];
        if (!user) {
            user = new User(input);
        } else {
            user.set(input);
            user.increment();
        }
        await user.save({ session: session });
        var userId = user._id.toString();
        var requestedIds = new Set(input.pendingTasks);
        var removedIds = oldIds.filter(function (taskId) { return !requestedIds.has(taskId); });
        if (removedIds.length) {
            await Task.updateMany(
                { _id: { $in: removedIds }, assignedUser: userId },
                { $set: { assignedUser: '', assignedUserName: 'unassigned' } },
                { session: session }
            );
        }
        if (input.pendingTasks.length) {
            // Moving a task removes it from every previous owner's list.
            await User.updateMany(
                { _id: { $ne: user._id }, pendingTasks: { $in: input.pendingTasks } },
                { $pull: { pendingTasks: { $in: input.pendingTasks } } },
                { session: session }
            );
            await Task.updateMany(
                { _id: { $in: input.pendingTasks } },
                { $set: { assignedUser: userId, assignedUserName: input.name } },
                { session: session }
            );
        }
        // Completed tasks retain their owner and must also follow name changes.
        await Task.updateMany(
            { assignedUser: userId },
            { $set: { assignedUserName: input.name } },
            { session: session }
        );
        return user.toObject();
    });
}

async function saveTask(id, body) {
    return mongoose.connection.transaction(async function (session) {
        var task = id === undefined ? null : await existingResource(Task, id, session, 'Task');
        var input = validation.taskInput(body);
        var owner = null;
        if (input.assignedUser !== '') {
            owner = await User.findById(input.assignedUser).session(session);
            if (!owner) {
                throw new ApiError(404, 'Assigned user not found');
            }
            if (input.assignedUserName !== undefined && input.assignedUserName !== owner.name) {
                throw new ApiError(400, 'assignedUserName must match the assigned user');
            }
            input.assignedUserName = owner.name;
        }
        if (!task) {
            task = new Task(input);
        } else {
            // All editable fields are supplied, including defaults for omitted fields.
            task.set(input);
            task.increment();
        }
        await task.save({ session: session });
        var taskId = task._id.toString();
        await User.updateMany(
            { pendingTasks: taskId },
            { $pull: { pendingTasks: taskId } },
            { session: session }
        );
        if (owner) {
            // Also write to owners of completed tasks to serialize against deletion.
            var update = { $inc: { __v: 1 } };
            if (!input.completed) {
                update.$addToSet = { pendingTasks: taskId };
            }
            await User.updateOne({ _id: owner._id }, update, { session: session });
        }
        return task.toObject();
    });
}

async function deleteUser(id) {
    return mongoose.connection.transaction(async function (session) {
        var user = await existingResource(User, id, session, 'User');
        await Task.updateMany(
            { assignedUser: user._id.toString() },
            { $set: { assignedUser: '', assignedUserName: 'unassigned' } },
            { session: session }
        );
        await User.deleteOne({ _id: user._id }, { session: session });
    });
}

async function deleteTask(id) {
    return mongoose.connection.transaction(async function (session) {
        var task = await existingResource(Task, id, session, 'Task');
        await User.updateMany(
            { pendingTasks: task._id.toString() },
            { $pull: { pendingTasks: task._id.toString() } },
            { session: session }
        );
        await Task.deleteOne({ _id: task._id }, { session: session });
    });
}

module.exports = { saveUser, saveTask, deleteUser, deleteTask };

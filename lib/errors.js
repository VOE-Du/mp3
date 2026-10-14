class ApiError extends Error {
    constructor(status, message) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

function errorHandler(err, req, res, next) {
    if (res.headersSent) {
        return next(err);
    }
    var status = 500;
    var message = 'An unexpected server error occurred';
    if (err instanceof ApiError) {
        status = err.status;
        message = err.message;
    } else if (err.code === 11000) {
        status = 400;
        message = 'Email is already in use';
    } else if (err.name === 'ValidationError' || err.name === 'CastError') {
        status = 400;
        message = 'Invalid field value';
    } else if (err.type === 'entity.parse.failed') {
        status = 400;
        message = 'The request body must contain valid JSON';
    } else if (err.type === 'entity.too.large') {
        status = 413;
        message = 'The request body is too large';
    }
    return res.status(status).json({ message: message, data: {} });
}

module.exports = { ApiError, errorHandler };

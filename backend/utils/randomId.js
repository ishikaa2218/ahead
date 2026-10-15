const { randomUUID } = require("crypto");

function generateLoginId() {
    return randomUUID();
}

module.exports = { generateLoginId };
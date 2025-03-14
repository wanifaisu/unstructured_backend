const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema({
 
    lastName: {
        type: String,
        required: true,
    },
    dateOfBirth: {
        type: Date,
        required: true,
    },
    ssn: {
        type: String,
        required: true,
        unique: true,
    },
});

UserSchema.pre('save', async function (next) {
    if (this.isModified('ssn')) {
        const salt = await bcrypt.genSalt(10);
        this.ssn = await bcrypt.hash(this.ssn, salt);
    }
    next();
});
UserSchema.methods.compareLastFourSSN = async function (lastFourSSN) {

    const storedSSN = this.ssn; 
    const lastFourStoredSSN = storedSSN.slice(-4); 
    return lastFourStoredSSN === lastFourSSN;
};

module.exports = mongoose.model('User', UserSchema);
import mongoose from 'mongoose';

const groupSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    groupImg: {
        type: String,
        trim: true,
    },
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    }],
    admins: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
}, {
    timestamps: true,
});

groupSchema.pre('validate', function (next) {
    if (!this.members || this.members.length < 2) {
        return next(new Error('A group must have at least two members.'));
    }
    next();
});

const Group = mongoose.model('Group', groupSchema);

export default Group;
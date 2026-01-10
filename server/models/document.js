import mongoose from 'mongoose';

// Comment schema for document annotations
const commentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    text: {
        type: String,
        required: true
    },
    // Position in the document (for inline comments)
    position: {
        from: Number,
        to: Number
    },
    resolved: {
        type: Boolean,
        default: false
    },
    replies: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        text: String,
        createdAt: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

const documentSchema = new mongoose.Schema({
    title: {
        type: String,
        default: 'Untitled Document',
        trim: true
    },

    // Yjs document state (binary) - stores the collaborative content
    content: {
        type: Buffer,
        default: null
    },

    // Owner of the document
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // Folder for organization (null = root folder)
    folder: {
        type: String,
        default: null,
        trim: true
    },

    // Comments on the document
    comments: [commentSchema],

    // Collaborators with permissions
    collaborators: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        permission: {
            type: String,
            enum: ['view', 'edit'],
            default: 'view'
        },
        addedAt: {
            type: Date,
            default: Date.now
        }
    }],

    // Share settings
    shareLink: {
        type: String,
        unique: true,
        sparse: true // Allows multiple null values
    },
    isPublic: {
        type: Boolean,
        default: false
    },

    // Metadata
    lastEditedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    lastEditedAt: {
        type: Date,
        default: Date.now
    }

}, {
    timestamps: true
});

// Indexes for fast lookup
documentSchema.index({ owner: 1 });
documentSchema.index({ 'collaborators.user': 1 });
// shareLink already has unique index from field definition

const Document = mongoose.model('Document', documentSchema);

export default Document;

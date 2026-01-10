import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { documentstore } from '../Store/DocumentStore';
import { IoAdd, IoTrash, IoDocument, IoShareSocial } from 'react-icons/io5';
import { IoArrowBackSharp } from 'react-icons/io5';
import Loader from '../componenets/Loader';
import '../styles/documents.css';

const Documents = () => {
    const navigate = useNavigate();
    const {
        documents,
        sharedDocuments,
        getMyDocuments,
        getSharedDocuments,
        createDocument,
        deleteDocument,
        isLoading,
        isCreating
    } = documentstore();

    const [activeTab, setActiveTab] = useState('my');

    useEffect(() => {
        getMyDocuments();
        getSharedDocuments();
    }, []);

    const handleCreate = async () => {
        const doc = await createDocument('Untitled Document');
        if (doc) {
            navigate(`/document/${doc._id}`);
        }
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to delete this document?')) {
            await deleteDocument(id);
        }
    };

    const formatDate = (date) => {
        const d = new Date(date);
        const now = new Date();
        const diffMs = now - d;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return 'Today';
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else {
            return d.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        }
    };

    const currentDocs = activeTab === 'my' ? documents : sharedDocuments;

    return (
        <div className="documents-page">
            {/* Header */}
            <div className="documents-header">
                <div className="header-left">
                    <button onClick={() => navigate('/')} className="back-btn">
                        <IoArrowBackSharp size={24} />
                    </button>
                    <h1>📄 Documents</h1>
                </div>
                <button onClick={handleCreate} className="create-btn" disabled={isCreating}>
                    {isCreating ? <Loader /> : <><IoAdd size={20} /> New Document</>}
                </button>
            </div>

            {/* Tabs */}
            <div className="documents-tabs">
                <button
                    className={`tab-btn ${activeTab === 'my' ? 'active' : ''}`}
                    onClick={() => setActiveTab('my')}
                >
                    My Documents ({documents.length})
                </button>
                <button
                    className={`tab-btn ${activeTab === 'shared' ? 'active' : ''}`}
                    onClick={() => setActiveTab('shared')}
                >
                    Shared with Me ({sharedDocuments.length})
                </button>
            </div>

            {/* Documents Grid */}
            <div className="documents-content">
                {isLoading ? (
                    <div className="loading-container">
                        <Loader />
                    </div>
                ) : currentDocs.length === 0 ? (
                    <div className="empty-state">
                        <IoDocument size={64} />
                        <h3>{activeTab === 'my' ? 'No documents yet' : 'No shared documents'}</h3>
                        <p>
                            {activeTab === 'my'
                                ? 'Create your first document to get started!'
                                : 'Documents shared with you will appear here.'}
                        </p>
                        {activeTab === 'my' && (
                            <button onClick={handleCreate} className="create-btn-large">
                                <IoAdd size={24} /> Create Document
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="documents-grid">
                        {currentDocs.map((doc) => (
                            <div
                                key={doc._id}
                                className="document-card"
                                onClick={() => navigate(`/document/${doc._id}`)}
                            >
                                <div className="doc-preview">
                                    <IoDocument size={40} />
                                </div>
                                <div className="doc-info">
                                    <h3 className="doc-title">{doc.title || 'Untitled Document'}</h3>
                                    <p className="doc-meta">
                                        {activeTab === 'shared' && doc.owner && (
                                            <span className="doc-owner">By {doc.owner.name} · </span>
                                        )}
                                        Edited {formatDate(doc.updatedAt)}
                                    </p>
                                </div>
                                {activeTab === 'my' && (
                                    <div className="doc-actions">
                                        <button
                                            className="action-btn delete"
                                            onClick={(e) => handleDelete(e, doc._id)}
                                            title="Delete"
                                        >
                                            <IoTrash size={18} />
                                        </button>
                                    </div>
                                )}
                                {activeTab === 'shared' && (
                                    <div className="shared-badge">
                                        <IoShareSocial size={14} />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Documents;

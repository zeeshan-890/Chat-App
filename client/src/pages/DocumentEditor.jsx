import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import * as Y from 'yjs';
import { userauthstore } from '../Store/UserAuthStore';
import { documentstore } from '../Store/DocumentStore';
import Loader from '../componenets/Loader';
import { IoArrowBackSharp } from 'react-icons/io5';
import { FaUsers, FaBold, FaItalic, FaListUl, FaListOl, FaCode, FaQuoteLeft } from 'react-icons/fa';
import { LuHeading1, LuHeading2, LuHeading3 } from 'react-icons/lu';
import '../styles/editor.css';

const DocumentEditor = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { socket, user } = userauthstore();
    const { getDocument, currentDocument, isLoading, updateDocumentTitle, clearCurrentDocument } = documentstore();

    const [title, setTitle] = useState('');
    const [activeUsers, setActiveUsers] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [permission, setPermission] = useState('owner');

    const titleTimeoutRef = useRef(null);
    const ydocRef = useRef(null);
    const yTextRef = useRef(null);

    // Generate random color for user cursor
    const getRandomColor = () => {
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
        return colors[Math.floor(Math.random() * colors.length)];
    };

    const [myColor] = useState(getRandomColor);

    // Initialize TipTap editor
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                history: true, // Enable history for undo/redo
            }),
            Placeholder.configure({
                placeholder: 'Start typing here...',
            }),
        ],
        editorProps: {
            attributes: {
                class: 'prose prose-lg focus:outline-none max-w-none',
            },
        },
        onUpdate: ({ editor }) => {
            // Send updates to other users
            if (socket && id) {
                const content = editor.getHTML();
                socket.emit('document-update', {
                    docId: id,
                    update: Array.from(new TextEncoder().encode(content)),
                    userId: user?._id
                });

                // Show saving indicator
                setIsSaving(true);
                setTimeout(() => setIsSaving(false), 1000);
            }
        },
    });

    // Load document on mount
    useEffect(() => {
        if (id) {
            getDocument(id).then((result) => {
                if (result) {
                    setTitle(result.document.title || 'Untitled Document');
                    setPermission(result.permission);
                }
            });
        }

        return () => {
            clearCurrentDocument();
        };
    }, [id]);

    // Set up socket listeners
    useEffect(() => {
        if (!socket || !id) return;

        // Join document room
        socket.emit('join-document', { docId: id, user });

        // Listen for document state from server
        socket.on('document-state', ({ state, docId }) => {
            if (docId === id && state && editor) {
                const content = new TextDecoder().decode(new Uint8Array(state));
                if (content) {
                    editor.commands.setContent(content);
                }
            }
        });

        // Listen for updates from other users
        socket.on('document-update', ({ docId, update, from }) => {
            if (docId === id && from !== user?._id && editor) {
                const content = new TextDecoder().decode(new Uint8Array(update));
                // Get current selection
                const { from: selFrom, to: selTo } = editor.state.selection;
                // Set content without losing selection
                editor.commands.setContent(content);
                // Try to restore selection
                try {
                    editor.commands.setTextSelection({ from: selFrom, to: selTo });
                } catch (e) {
                    // Selection might be out of bounds after update
                }
            }
        });

        // Listen for user presence
        socket.on('document-active-users', ({ users }) => {
            setActiveUsers(users.filter(u => u.userId !== user?._id));
        });

        socket.on('user-joined-document', (userData) => {
            setActiveUsers(prev => {
                const filtered = prev.filter(u => u.userId !== userData.userId);
                return [...filtered, userData];
            });
        });

        socket.on('user-left-document', ({ userId: odId }) => {
            setActiveUsers(prev => prev.filter(u => u.userId !== odId));
        });

        // Cleanup
        return () => {
            socket.emit('leave-document', { docId: id });
            socket.off('document-state');
            socket.off('document-update');
            socket.off('document-active-users');
            socket.off('user-joined-document');
            socket.off('user-left-document');
        };
    }, [socket, id, user, editor]);

    // Handle title change with debounce
    const handleTitleChange = (e) => {
        const newTitle = e.target.value;
        setTitle(newTitle);

        // Clear existing timeout
        if (titleTimeoutRef.current) {
            clearTimeout(titleTimeoutRef.current);
        }

        // Debounce save
        titleTimeoutRef.current = setTimeout(() => {
            updateDocumentTitle(id, newTitle);
        }, 500);
    };

    // Toolbar button component
    const ToolbarButton = ({ onClick, isActive, children, title }) => (
        <button
            onClick={onClick}
            className={`toolbar-btn ${isActive ? 'active' : ''}`}
            title={title}
            type="button"
        >
            {children}
        </button>
    );

    if (isLoading) {
        return (
            <div className="editor-loading">
                <Loader />
                <p>Loading document...</p>
            </div>
        );
    }

    const canEdit = permission === 'owner' || permission === 'edit';

    return (
        <div className="document-editor-page">
            {/* Header */}
            <div className="editor-header">
                <div className="header-left">
                    <button onClick={() => navigate('/documents')} className="back-btn" title="Back to documents">
                        <IoArrowBackSharp size={24} />
                    </button>
                    <input
                        type="text"
                        value={title}
                        onChange={handleTitleChange}
                        className="document-title-input"
                        placeholder="Untitled Document"
                        disabled={!canEdit}
                    />
                    {isSaving && <span className="saving-indicator">Saving...</span>}
                </div>

                <div className="header-right">
                    {/* Active Users */}
                    <div className="active-users">
                        <FaUsers size={16} />
                        <span>{activeUsers.length + 1} editing</span>
                        <div className="user-avatars">
                            {/* Current user */}
                            <div
                                className="user-avatar"
                                style={{ backgroundColor: myColor }}
                                title={`${user?.name} (you)`}
                            >
                                {user?.name?.[0] || 'U'}
                            </div>
                            {/* Other users */}
                            {activeUsers.slice(0, 3).map((u, i) => (
                                <div
                                    key={u.userId || i}
                                    className="user-avatar"
                                    style={{ backgroundColor: u.color }}
                                    title={u.name}
                                >
                                    {u.name?.[0] || '?'}
                                </div>
                            ))}
                            {activeUsers.length > 3 && (
                                <div className="user-avatar more">+{activeUsers.length - 3}</div>
                            )}
                        </div>
                    </div>

                    {permission !== 'owner' && (
                        <span className="permission-badge">{permission === 'edit' ? '✏️ Can edit' : '👁️ View only'}</span>
                    )}
                </div>
            </div>

            {/* Toolbar */}
            {canEdit && editor && (
                <div className="editor-toolbar">
                    <div className="toolbar-group">
                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleBold().run()}
                            isActive={editor.isActive('bold')}
                            title="Bold (Ctrl+B)"
                        >
                            <FaBold size={14} />
                        </ToolbarButton>
                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleItalic().run()}
                            isActive={editor.isActive('italic')}
                            title="Italic (Ctrl+I)"
                        >
                            <FaItalic size={14} />
                        </ToolbarButton>
                    </div>

                    <div className="toolbar-divider" />

                    <div className="toolbar-group">
                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                            isActive={editor.isActive('heading', { level: 1 })}
                            title="Heading 1"
                        >
                            <LuHeading1 size={18} />
                        </ToolbarButton>
                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                            isActive={editor.isActive('heading', { level: 2 })}
                            title="Heading 2"
                        >
                            <LuHeading2 size={18} />
                        </ToolbarButton>
                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                            isActive={editor.isActive('heading', { level: 3 })}
                            title="Heading 3"
                        >
                            <LuHeading3 size={18} />
                        </ToolbarButton>
                    </div>

                    <div className="toolbar-divider" />

                    <div className="toolbar-group">
                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleBulletList().run()}
                            isActive={editor.isActive('bulletList')}
                            title="Bullet List"
                        >
                            <FaListUl size={14} />
                        </ToolbarButton>
                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleOrderedList().run()}
                            isActive={editor.isActive('orderedList')}
                            title="Numbered List"
                        >
                            <FaListOl size={14} />
                        </ToolbarButton>
                    </div>

                    <div className="toolbar-divider" />

                    <div className="toolbar-group">
                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                            isActive={editor.isActive('codeBlock')}
                            title="Code Block"
                        >
                            <FaCode size={14} />
                        </ToolbarButton>
                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleBlockquote().run()}
                            isActive={editor.isActive('blockquote')}
                            title="Quote"
                        >
                            <FaQuoteLeft size={14} />
                        </ToolbarButton>
                    </div>
                </div>
            )}

            {/* Editor Content */}
            <div className="editor-container">
                <EditorContent
                    editor={editor}
                    className={`editor-content ${!canEdit ? 'readonly' : ''}`}
                />
            </div>
        </div>
    );
};

export default DocumentEditor;

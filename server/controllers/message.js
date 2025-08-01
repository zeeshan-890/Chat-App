import Message from '../models/message.js';
import User from '../models/user.js';
import { getreceiversocketid, io } from '../services/socket.js';

// Send a message
async function sendMessage(req, res) {
  console.log(req.body);

  try {
    let text;
    let image;
    const receiver = req.body.receiver;

    if (req.body.text) {
      text = req.body.text;
    }
    if (req.body.image) {
      image = req.body.image;
    }

    const newMessage = await Message.create({
      sender: req.user._id,
      receiver,
      text,
      image,
    });

    const receiversocketid = getreceiversocketid(receiver);
    if (receiversocketid) {
      io.to(receiversocketid).emit('newMessage', newMessage);
    }

    res.status(201).json({ success: true, message: 'Message sent.', data: newMessage });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
}

// Get all messages between two users
async function getMessages(req, res) {
  try {
    const userId = req.params.id; // userId is the other user's id
    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: userId },
        { sender: userId, receiver: req.user._id }
      ]
    }).sort({ timestamp: 1 });

    res.json({ success: true, messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
}

// Mark all messages as read
async function markread(req, res) {
  try {
    const userId = req.params.id; // userId is the other user's id
    // Update all messages where the current user is the receiver and the sender is userId, and read is false
    const result = await Message.updateMany(
      {
        sender: userId,
        receiver: req.user._id,
        read: false
      },
      { $set: { read: true } }
    );

    res.json({ success: true, message: 'All messages marked as read.', data: result });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
}

async function getunread(req, res) {
  try {
    const userId = req.params.id; // userId is the other user's id
    // Only count messages where the current user is the receiver and the sender is userId, and read is false
    const unreadmessages = await Message.find({
      sender: userId,
      receiver: req.user._id,
      read: false
    });

    res.json({ success: true, unreadmessages: unreadmessages.length });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
}

export {
  sendMessage,
  getMessages,
  markread,
  getunread
};